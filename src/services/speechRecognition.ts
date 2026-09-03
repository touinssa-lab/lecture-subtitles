// Robust Speech Recognition Engine using Web Speech API

export interface SpeechCallbacks {
  onInterimText: (text: string) => void;
  onFinalSentence: (text: string) => void;
  onStatusChange: (isListening: boolean, error?: string) => void;
}

// Extend Window interface for WebkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class SpeechEngine {
  private recognition: any = null;
  private isListeningDesired: boolean = false;
  private callbacks: SpeechCallbacks;
  private autoRestartTimer: any = null;
  private silenceFlushTimer: any = null;
  private lastInterimText: string = '';
  private lastEmittedText: string = '';
  private isSupported: boolean = false;
  private lang: string = 'ko-KR';

  constructor(callbacks: SpeechCallbacks, initialLang: string = 'ko-KR') {
    this.callbacks = callbacks;
    this.lang = initialLang;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
    if (!this.isSupported) {
      setTimeout(() => {
        this.callbacks.onStatusChange(false, '브라우저가 음성 인식을 지원하지 않습니다. (크롬 브라우저 사용 권장)');
      }, 0);
    }
  }

  public setLanguage(langCode: string) {
    const fullLangCode = this.normalizeLangCode(langCode);
    if (this.lang === fullLangCode) return;
    this.lang = fullLangCode;
    if (this.isListeningDesired) {
      this.stop();
      setTimeout(() => {
        this.start();
      }, 150);
    }
  }

  private normalizeLangCode(code: string): string {
    if (!code) return 'ko-KR';
    if (code.includes('-')) return code;
    const map: Record<string, string> = {
      ko: 'ko-KR',
      en: 'en-US',
      vi: 'vi-VN',
      uz: 'uz-UZ',
      mn: 'mn-MN',
      ne: 'ne-NP',
      ja: 'ja-JP',
      zh: 'zh-CN',
    };
    return map[code] || code;
  }

  private createNewRecognitionInstance() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.lang;

    rec.onstart = () => {
      this.callbacks.onStatusChange(true);
    };

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const cleanFinal = finalTranscript.trim();
      const cleanInterim = interimTranscript.trim();

      // 1. Handle Chrome explicit final results
      if (cleanFinal) {
        this.clearSilenceTimer();
        this.lastInterimText = '';
        this.callbacks.onInterimText('');
        this.emitSentence(cleanFinal);
        return;
      }

      // 2. Handle Live Interim speech feedback
      if (cleanInterim) {
        this.lastInterimText = cleanInterim;
        this.callbacks.onInterimText(cleanInterim);
        this.scheduleSilenceFlush();
      }
    };

    rec.onerror = (event: any) => {
      console.warn('Speech Recognition Error:', event.error);
      if (event.error === 'not-allowed') {
        this.isListeningDesired = false;
        this.callbacks.onStatusChange(false, '마이크 접근 권한이 거부되었습니다. 주소창 마이크 아이콘을 클릭해 허용해 주세요.');
      } else if (event.error === 'aborted') {
        // Normal user abort
      }
    };

    rec.onend = () => {
      this.callbacks.onStatusChange(false);
      // Flush any remaining interim text on end
      if (this.lastInterimText) {
        this.emitSentence(this.lastInterimText);
        this.lastInterimText = '';
        this.callbacks.onInterimText('');
      }

      // Seamless Auto-restart watchdog if user still wants listening
      if (this.isListeningDesired) {
        this.scheduleAutoRestart();
      }
    };

    this.recognition = rec;
    return rec;
  }

  private scheduleSilenceFlush() {
    this.clearSilenceTimer();
    this.silenceFlushTimer = setTimeout(() => {
      if (this.lastInterimText) {
        const textToEmit = this.lastInterimText;
        this.lastInterimText = '';
        this.callbacks.onInterimText('');
        this.emitSentence(textToEmit);
      }
    }, 1500); // 1.5s natural pause flush
  }

  private clearSilenceTimer() {
    if (this.silenceFlushTimer) {
      clearTimeout(this.silenceFlushTimer);
      this.silenceFlushTimer = null;
    }
  }

  private emitSentence(text: string) {
    const clean = text.trim();
    if (!clean) return;

    // Deduplicate if identical to immediately preceding emitted sentence
    if (clean === this.lastEmittedText) return;

    this.lastEmittedText = clean;
    this.callbacks.onFinalSentence(clean);
  }

  private scheduleAutoRestart() {
    if (this.autoRestartTimer) clearTimeout(this.autoRestartTimer);
    this.autoRestartTimer = setTimeout(() => {
      if (this.isListeningDesired) {
        try {
          if (!this.recognition) {
            this.createNewRecognitionInstance();
          }
          this.recognition.start();
        } catch (err) {
          // Re-create instance on start error
          try {
            const freshRec = this.createNewRecognitionInstance();
            freshRec?.start();
          } catch (e) {}
        }
      }
    }, 250);
  }

  public start() {
    if (!this.isSupported) {
      this.callbacks.onStatusChange(false, '크롬(Chrome) 브라우저를 사용해 주세요.');
      return;
    }

    this.isListeningDesired = true;
    this.lastInterimText = '';
    this.lastEmittedText = '';

    const rec = this.createNewRecognitionInstance();
    if (rec) {
      try {
        rec.start();
      } catch (e) {
        console.warn('Start Speech Exception:', e);
      }
    }
  }

  public stop() {
    this.isListeningDesired = false;
    this.clearSilenceTimer();
    if (this.autoRestartTimer) clearTimeout(this.autoRestartTimer);
    this.lastInterimText = '';
    this.lastEmittedText = '';

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        try {
          this.recognition.stop();
        } catch (err) {}
      }
      this.recognition = null;
    }
    this.callbacks.onStatusChange(false);
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }
}
