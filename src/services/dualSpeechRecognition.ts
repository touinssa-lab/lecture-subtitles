import { SpeechEngine } from './speechRecognition';

export interface DualSpeechCallbacks {
  onProfessorInterim: (text: string) => void;
  onProfessorFinal: (text: string) => void;
  onStudentInterim: (text: string) => void;
  onStudentFinal: (text: string) => void;
  onStatusChange: (isListening: boolean, error?: string) => void;
}

export class DualSpeechEngine {
  private professorEngine: SpeechEngine | null = null;
  private studentEngine: SpeechEngine | null = null;
  private callbacks: DualSpeechCallbacks;
  private isListening: boolean = false;
  private studentLang: string = 'en';

  constructor(callbacks: DualSpeechCallbacks, studentLangCode: string = 'en') {
    this.callbacks = callbacks;
    this.studentLang = studentLangCode;
    this.initEngines();
  }

  private initEngines() {
    // 1. Professor Engine (Korean)
    this.professorEngine = new SpeechEngine(
      {
        onInterimText: (text) => {
          if (this.containsKorean(text) || text.length > 0) {
            this.callbacks.onProfessorInterim(text);
          }
        },
        onFinalSentence: (text) => {
          const clean = text.trim();
          if (!clean) return;
          // If speech contains Hangul or is recognized by ko-KR engine
          this.callbacks.onProfessorFinal(clean);
        },
        onStatusChange: (listening, err) => {
          if (err && !listening) {
            this.callbacks.onStatusChange(false, err);
          }
        },
      },
      'ko-KR'
    );

    // 2. Student Engine (Selected Target Language, e.g., en-US, vi-VN, uz-UZ, mn-MN)
    const targetLangCode = this.getNormalizedLangCode(this.studentLang);
    this.studentEngine = new SpeechEngine(
      {
        onInterimText: (text) => {
          // Filter out Korean text from student engine if Chrome misclassifies Korean into student engine
          if (!this.isPureKorean(text)) {
            this.callbacks.onStudentInterim(text);
          }
        },
        onFinalSentence: (text) => {
          const clean = text.trim();
          if (!clean) return;
          // Filter out Korean text from student engine
          if (!this.isPureKorean(clean)) {
            this.callbacks.onStudentFinal(clean);
          }
        },
        onStatusChange: (listening, err) => {
          if (err && !listening) {
            this.callbacks.onStatusChange(false, err);
          }
        },
      },
      targetLangCode
    );
  }

  private getNormalizedLangCode(code: string): string {
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
    return map[code] || (code.includes('-') ? code : `${code}-${code.toUpperCase()}`);
  }

  private containsKorean(text: string): boolean {
    return /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(text);
  }

  private isPureKorean(text: string): boolean {
    const hangulMatches = text.match(/[\uac00-\ud7af]/g);
    if (!hangulMatches) return false;
    return hangulMatches.length / text.replace(/\s+/g, '').length > 0.6;
  }

  public setStudentLanguage(studentLangCode: string) {
    this.studentLang = studentLangCode;
    const targetLangCode = this.getNormalizedLangCode(studentLangCode);
    if (this.studentEngine) {
      this.studentEngine.setLanguage(targetLangCode);
    }
  }

  public start() {
    this.isListening = true;
    try {
      this.professorEngine?.start();
    } catch (e) {
      console.warn('Professor engine start error:', e);
    }

    // Delay student engine start by 100ms to avoid browser audio device conflict
    setTimeout(() => {
      if (this.isListening) {
        try {
          this.studentEngine?.start();
        } catch (e) {
          console.warn('Student engine start error:', e);
        }
      }
    }, 100);

    this.callbacks.onStatusChange(true);
  }

  public stop() {
    this.isListening = false;
    try {
      this.professorEngine?.stop();
    } catch (e) {}
    try {
      this.studentEngine?.stop();
    } catch (e) {}
    this.callbacks.onStatusChange(false);
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }
}
