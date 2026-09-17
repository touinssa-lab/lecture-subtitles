import { SpeechEngine } from './speechRecognition';

export type CounselingSpeaker = 'professor' | 'student';

export interface DualSpeechCallbacks {
  onProfessorInterim: (text: string) => void;
  onProfessorFinal: (text: string) => void;
  onStudentInterim: (text: string) => void;
  onStudentFinal: (text: string) => void;
  onStatusChange: (isListening: boolean, error?: string) => void;
  onSpeakerChange?: (activeSpeaker: CounselingSpeaker) => void;
}

export class DualSpeechEngine {
  private engine: SpeechEngine | null = null;
  private callbacks: DualSpeechCallbacks;
  private isListening: boolean = false;
  private studentLang: string = 'en';
  private activeSpeaker: CounselingSpeaker = 'professor';

  constructor(
    callbacks: DualSpeechCallbacks,
    studentLangCode: string = 'en',
    initialSpeaker: CounselingSpeaker = 'professor'
  ) {
    this.callbacks = callbacks;
    this.studentLang = studentLangCode;
    this.activeSpeaker = initialSpeaker;
    this.initEngine();
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

  private getCurrentLangCode(): string {
    return this.activeSpeaker === 'professor'
      ? 'ko-KR'
      : this.getNormalizedLangCode(this.studentLang);
  }

  private initEngine() {
    this.engine = new SpeechEngine(
      {
        onInterimText: (text) => {
          if (this.activeSpeaker === 'professor') {
            this.callbacks.onProfessorInterim(text);
          } else {
            this.callbacks.onStudentInterim(text);
          }
        },
        onFinalSentence: (text) => {
          const clean = text.trim();
          if (!clean) return;
          if (this.activeSpeaker === 'professor') {
            this.callbacks.onProfessorFinal(clean);
          } else {
            this.callbacks.onStudentFinal(clean);
          }
        },
        onStatusChange: (listening, err) => {
          this.isListening = listening;
          this.callbacks.onStatusChange(listening, err);
        },
      },
      this.getCurrentLangCode()
    );
  }

  public setActiveSpeaker(speaker: CounselingSpeaker) {
    if (this.activeSpeaker === speaker) return;
    this.activeSpeaker = speaker;
    if (this.callbacks.onSpeakerChange) {
      this.callbacks.onSpeakerChange(speaker);
    }
    const newLang = this.getCurrentLangCode();
    if (this.engine) {
      this.engine.setLanguage(newLang);
    }
  }

  public toggleSpeaker(): CounselingSpeaker {
    const nextSpeaker: CounselingSpeaker =
      this.activeSpeaker === 'professor' ? 'student' : 'professor';
    this.setActiveSpeaker(nextSpeaker);
    return nextSpeaker;
  }

  public getActiveSpeaker(): CounselingSpeaker {
    return this.activeSpeaker;
  }

  public setStudentLanguage(studentLangCode: string) {
    this.studentLang = studentLangCode;
    if (this.activeSpeaker === 'student') {
      const targetLangCode = this.getNormalizedLangCode(studentLangCode);
      this.engine?.setLanguage(targetLangCode);
    }
  }

  public start() {
    this.isListening = true;
    try {
      this.engine?.start();
    } catch (e) {
      console.warn('Speech engine start error:', e);
    }
    this.callbacks.onStatusChange(true);
  }

  public stop() {
    this.isListening = false;
    try {
      this.engine?.stop();
    } catch (e) {}
    this.callbacks.onStatusChange(false);
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }
}
