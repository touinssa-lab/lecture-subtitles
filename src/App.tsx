import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PdfViewer } from './components/PdfViewer';
import { SubtitleDisplay, SubtitleItem } from './components/SubtitleDisplay';
export type { SubtitleItem };
import { QADisplay, QAItem } from './components/QADisplay';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { ScheduleDashboardModal } from './components/ScheduleDashboardModal';
import { QrCodeModal } from './components/QrCodeModal';
import { AiSummaryModal } from './components/AiSummaryModal';
import { LectureEndModal } from './components/LectureEndModal';
import { CourseSchedule, WeekSchedule, SEMESTER_COURSES } from './data/scheduleData';
import { SpeechEngine } from './services/speechRecognition';
import { translateText, TranslationSettings, TARGET_LANGUAGES } from './services/translationService';
import { loadCourseSchedules, saveCourseList, saveWeekSchedule } from './services/scheduleService';
import { generateLectureSummary } from './services/aiSummaryService';


// Last updated: 2026-08-25 - Clean module graph rebuild
export const App: React.FC = () => {
  // Student popout window detector
  const isStudentMode = new URLSearchParams(window.location.search).get('mode') === 'student';

  // Auth Protection
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem('lecture_app_authenticated') === 'true' || isStudentMode
  );

  // Theme & Settings
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const isStudent = new URLSearchParams(window.location.search).get('mode') === 'student';
    return isStudent ? 'dark' : 'light';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<TranslationSettings>({
    engine: 'free',
  });

  // Layout, Display & Target Language Controls
  const [layoutMode, setLayoutMode] = useState<'side-by-side' | 'bottom-overlay'>('side-by-side');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xl' | 'xxl'>('large');
  const [targetLanguage, setTargetLanguage] = useState<string>('en'); // Default: English ('en')
  const [showKorean, setShowKorean] = useState<boolean>(true);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);

  // Speech & Translation State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>(() => {
    try {
      const saved = localStorage.getItem('lecture_subtitles_backup');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PDF Sync State with LocalStorage Backup for popouts
  const [currentPage, setCurrentPage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lecture_active_page');
      return saved ? parseInt(saved, 10) : 1;
    } catch (e) {
      return 1;
    }
  });
  const [totalPages, setTotalPages] = useState<number>(4);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lecture_active_pdf_data');
    } catch (e) {
      return null;
    }
  });
  const [pdfFileName, setPdfFileName] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lecture_active_pdf_name');
    } catch (e) {
      return null;
    }
  });

  // View Routing State: 'dashboard' (Lounge Landing) | 'lecture' (Active Lecture Room)
  const [currentView, setCurrentView] = useState<'dashboard' | 'lecture'>('dashboard');

  // ================= Semester Schedule & Google Drive State =================
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [isQrCodeOpen, setIsQrCodeOpen] = useState<boolean>(false);
  const [isAiSummaryOpen, setIsAiSummaryOpen] = useState<boolean>(false);
  const [isLectureEndModalOpen, setIsLectureEndModalOpen] = useState<boolean>(false);
  const [courses, setCourses] = useState<CourseSchedule[]>(SEMESTER_COURSES);
  const [activeCourseTitle, setActiveCourseTitle] = useState<string>(() => {
    return localStorage.getItem('lecture_active_course_title') || '관광 AI 콘텐츠 제작 실무';
  });
  const [activeWeekNum, setActiveWeekNum] = useState<number>(() => {
    const saved = localStorage.getItem('lecture_active_week_num');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [activeTopic, setActiveTopic] = useState<string>(() => {
    return localStorage.getItem('lecture_active_topic') || '오리엔테이션 및 관광 AI 콘텐츠 산업 개요';
  });
  const [activeGoogleDriveUrl, setActiveGoogleDriveUrl] = useState<string>(() => {
    return localStorage.getItem('lecture_active_drive_url') || '';
  });

  // Sync schedules from Supabase DB / localStorage
  useEffect(() => {
    loadCourseSchedules().then((data) => {
      setCourses(data);
    });
  }, [currentView, isScheduleOpen]);

  const currentCourse = courses.find((c) => c.title === activeCourseTitle) || courses[0];

  // QR Modal target payload state
  const [qrModalData, setQrModalData] = useState<{
    courseTitle: string;
    weekNumber: number;
    topic: string;
    googleDriveUrl?: string;
    pdfFileName?: string;
  }>({
    courseTitle: '관광 AI 콘텐츠 제작 실무',
    weekNumber: 1,
    topic: '오리엔테이션 및 관광 AI 콘텐츠 산업 개요',
    googleDriveUrl: '',
    pdfFileName: '1주차_관광AI개론.pdf',
  });

  // ================= Q&A Mode State =================
  const [isQAMode, setIsQAMode] = useState<boolean>(false);
  const [qaPhase, setQaPhase] = useState<'question' | 'answer'>('question');
  const [qaStudentLang, setQaStudentLang] = useState<string>('en');
  const [qaQuestionItem, setQaQuestionItem] = useState<QAItem | null>(null);
  const [qaAnswerItem, setQaAnswerItem] = useState<QAItem | null>(null);

  // Refs for persistent engines, cross-window sync & active state
  const speechEngineRef = useRef<SpeechEngine | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastProcessedTextRef = useRef<string>('');
  const targetLanguageRef = useRef<string>('en');
  const isQAModeRef = useRef<boolean>(false);
  const qaPhaseRef = useRef<'question' | 'answer'>('question');
  const qaStudentLangRef = useRef<string>('en');
  const subtitlesRef = useRef<SubtitleItem[]>([]);
  const currentPageRef = useRef<number>(1);
  const pdfDataUrlRef = useRef<string | null>(null);
  const pdfFileNameRef = useRef<string | null>(null);
  const activeGoogleDriveUrlRef = useRef<string>('');
  const activeWeekNumRef = useRef<number>(1);
  const qaQuestionItemRef = useRef<QAItem | null>(null);
  const qaAnswerItemRef = useRef<QAItem | null>(null);
  const showSubtitlesRef = useRef<boolean>(true);

  // Keep Refs updated
  useEffect(() => {
    showSubtitlesRef.current = showSubtitles;
  }, [showSubtitles]);
  useEffect(() => {
    targetLanguageRef.current = targetLanguage;
  }, [targetLanguage]);

  useEffect(() => {
    isQAModeRef.current = isQAMode;
  }, [isQAMode]);

  useEffect(() => {
    qaPhaseRef.current = qaPhase;
  }, [qaPhase]);

  useEffect(() => {
    qaStudentLangRef.current = qaStudentLang;
  }, [qaStudentLang]);

  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  useEffect(() => {
    currentPageRef.current = currentPage;
    try {
      localStorage.setItem('lecture_active_page', currentPage.toString());
    } catch (e) {}
  }, [currentPage]);

  useEffect(() => {
    pdfDataUrlRef.current = pdfDataUrl;
    if (pdfDataUrl) {
      try {
        localStorage.setItem('lecture_active_pdf_data', pdfDataUrl);
      } catch (e) {}
    }
  }, [pdfDataUrl]);

  useEffect(() => {
    pdfFileNameRef.current = pdfFileName;
    if (pdfFileName) {
      try {
        localStorage.setItem('lecture_active_pdf_name', pdfFileName);
      } catch (e) {}
    }
  }, [pdfFileName]);

  useEffect(() => {
    activeGoogleDriveUrlRef.current = activeGoogleDriveUrl;
    if (activeGoogleDriveUrl) {
      try {
        localStorage.setItem('lecture_active_drive_url', activeGoogleDriveUrl);
      } catch (e) {}
    }
  }, [activeGoogleDriveUrl]);

  useEffect(() => {
    activeWeekNumRef.current = activeWeekNum;
    try {
      localStorage.setItem('lecture_active_week_num', activeWeekNum.toString());
    } catch (e) {}
  }, [activeWeekNum]);

  useEffect(() => {
    qaQuestionItemRef.current = qaQuestionItem;
  }, [qaQuestionItem]);

  useEffect(() => {
    qaAnswerItemRef.current = qaAnswerItem;
  }, [qaAnswerItem]);

  // Auto-backup subtitles to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('lecture_subtitles_backup', JSON.stringify(subtitles));
    } catch (e) {}
  }, [subtitles]);

  // Automatically change theme based on view: light for dashboard (lounge), dark for lecture
  useEffect(() => {
    if (isStudentMode) {
      setTheme('dark');
    } else {
      if (currentView === 'dashboard') {
        setTheme('light');
      } else if (currentView === 'lecture') {
        setTheme('dark');
      }
    }
  }, [currentView, isStudentMode]);

  // Apply theme to document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync subtitles visibility change
  useEffect(() => {
    if (broadcastChannelRef.current && !isStudentMode) {
      broadcastChannelRef.current.postMessage({
        type: 'SUBTITLES_VISIBILITY_SYNC',
        payload: { showSubtitles },
      });
    }
  }, [showSubtitles]);

  // Setup BroadcastChannel for popout student window synchronization
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('lecture_subtitles_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'REQUEST_FULL_SYNC' && !isStudentMode) {
          // Master window responds with complete state to newly opened student popup window
          channel.postMessage({
            type: 'FULL_STATE_SYNC',
            payload: {
              subtitles: subtitlesRef.current,
              targetLanguage: targetLanguageRef.current,
              currentPage: currentPageRef.current,
              pdfDataUrl: pdfDataUrlRef.current,
              pdfFileName: pdfFileNameRef.current,
              activeGoogleDriveUrl: activeGoogleDriveUrlRef.current,
              activeWeekNum: activeWeekNumRef.current,
              isQAMode: isQAModeRef.current,
              qaPhase: qaPhaseRef.current,
              qaStudentLang: qaStudentLangRef.current,
              qaQuestionItem: qaQuestionItemRef.current,
              qaAnswerItem: qaAnswerItemRef.current,
              isQrCodeOpen,
              qrModalData,
              showSubtitles: showSubtitlesRef.current,
            },
          });
        } else if (type === 'FULL_STATE_SYNC') {
          if (payload.subtitles) setSubtitles(payload.subtitles);
          if (payload.targetLanguage) setTargetLanguage(payload.targetLanguage);
          if (payload.currentPage) setCurrentPage(payload.currentPage);
          if (payload.pdfDataUrl !== undefined) setPdfDataUrl(payload.pdfDataUrl);
          if (payload.pdfFileName) setPdfFileName(payload.pdfFileName);
          if (payload.activeGoogleDriveUrl !== undefined) setActiveGoogleDriveUrl(payload.activeGoogleDriveUrl);
          if (payload.activeWeekNum) setActiveWeekNum(payload.activeWeekNum);
          if (payload.isQAMode !== undefined) setIsQAMode(payload.isQAMode);
          if (payload.qaPhase) setQaPhase(payload.qaPhase);
          if (payload.qaStudentLang) setQaStudentLang(payload.qaStudentLang);
          if (payload.qaQuestionItem !== undefined) setQaQuestionItem(payload.qaQuestionItem);
          if (payload.qaAnswerItem !== undefined) setQaAnswerItem(payload.qaAnswerItem);
          if (payload.isQrCodeOpen !== undefined) setIsQrCodeOpen(payload.isQrCodeOpen);
          if (payload.qrModalData) setQrModalData(payload.qrModalData);
          if (payload.showSubtitles !== undefined) setShowSubtitles(payload.showSubtitles);
        } else if (type === 'QR_CODE_SYNC') {
          setIsQrCodeOpen(payload.isOpen);
          if (payload.data) {
            setQrModalData(payload.data);
          }
        } else if (type === 'SUBTITLES_UPDATE') {
          setSubtitles(payload.subtitles);
          setInterimText(payload.interimText || '');
          if (payload.targetLanguage) setTargetLanguage(payload.targetLanguage);
        } else if (type === 'PAGE_CHANGE') {
          setCurrentPage(payload.currentPage);
          if (payload.pdfDataUrl !== undefined) setPdfDataUrl(payload.pdfDataUrl);
          if (payload.pdfFileName) setPdfFileName(payload.pdfFileName);
          if (payload.activeGoogleDriveUrl !== undefined) setActiveGoogleDriveUrl(payload.activeGoogleDriveUrl);
        } else if (type === 'PDF_FILE_CHANGE') {
          if (payload.pdfDataUrl !== undefined) setPdfDataUrl(payload.pdfDataUrl);
          if (payload.pdfFileName) setPdfFileName(payload.pdfFileName);
          const driveUrl = payload.activeGoogleDriveUrl || payload.googleDriveUrl;
          if (driveUrl !== undefined) setActiveGoogleDriveUrl(driveUrl);
          if (payload.weekNum || payload.activeWeekNum) setActiveWeekNum(payload.weekNum || payload.activeWeekNum);
          setCurrentPage(payload.currentPage || 1);
        } else if (type === 'MIC_STATUS') {
          setIsListening(payload.isListening);
        } else if (type === 'QA_SYNC') {
          setIsQAMode(payload.isQAMode);
          setQaPhase(payload.qaPhase);
          setQaStudentLang(payload.qaStudentLang);
          setQaQuestionItem(payload.qaQuestionItem);
          setQaAnswerItem(payload.qaAnswerItem);
        } else if (type === 'SUBTITLES_VISIBILITY_SYNC') {
          setShowSubtitles(payload.showSubtitles);
        }
      };

      // If this is a student window that just opened, request initial full state from master window
      if (isStudentMode) {
        channel.postMessage({ type: 'REQUEST_FULL_SYNC' });
      }

      return () => {
        const chan = broadcastChannelRef.current;
        broadcastChannelRef.current = null;
        if (chan) {
          try {
            chan.close();
          } catch (e) {}
        }
      };
    }
  }, [isStudentMode]);

  // Broadcast helper
  const syncToBroadcast = (extraPayload: any = {}) => {
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'SUBTITLES_UPDATE',
          payload: {
            subtitles: extraPayload.subtitles !== undefined ? extraPayload.subtitles : subtitles,
            interimText: extraPayload.interimText !== undefined ? extraPayload.interimText : interimText,
            targetLanguage: extraPayload.targetLanguage !== undefined ? extraPayload.targetLanguage : targetLanguage,
          },
        });

        if (extraPayload.qaSync) {
          broadcastChannelRef.current.postMessage({
            type: 'QA_SYNC',
            payload: {
              isQAMode: extraPayload.isQAMode !== undefined ? extraPayload.isQAMode : isQAMode,
              qaPhase: extraPayload.qaPhase !== undefined ? extraPayload.qaPhase : qaPhase,
              qaStudentLang: extraPayload.qaStudentLang !== undefined ? extraPayload.qaStudentLang : qaStudentLang,
              qaQuestionItem: extraPayload.qaQuestionItem !== undefined ? extraPayload.qaQuestionItem : qaQuestionItem,
              qaAnswerItem: extraPayload.qaAnswerItem !== undefined ? extraPayload.qaAnswerItem : qaAnswerItem,
            },
          });
        }
      } catch (err) {
        // Channel error
      }
    }
  };

  // Initialize SpeechEngine on mount
  useEffect(() => {
    if (isStudentMode || !isAuthenticated) return; // Student window doesn't capture mic

    const engine = new SpeechEngine({
      onInterimText: (text) => {
        setInterimText(text);
        syncToBroadcast({ interimText: text });
      },
      onFinalSentence: async (finalText) => {
        const clean = finalText.trim().replace(/\s+/g, ' ');
        if (!clean) return;

        if (lastProcessedTextRef.current === clean) return;
        lastProcessedTextRef.current = clean;

        // ===== 1. Q&A Mode Active =====
        if (isQAModeRef.current) {
          const currentPhase = qaPhaseRef.current;
          const sLang = qaStudentLangRef.current;

          if (currentPhase === 'question') {
            // Student Question: foreign speech -> translate to Korean
            try {
              const koTranslation = await translateText(clean, settings, 'ko', sLang);
              const newItem: QAItem = {
                originalText: clean,
                translatedText: koTranslation,
                sourceLang: sLang,
                targetLang: 'ko',
                timestamp: new Date().toLocaleTimeString(),
              };
              setQaQuestionItem(newItem);
              syncToBroadcast({ qaSync: true, qaQuestionItem: newItem, isQAMode: true, qaPhase: 'question' });
            } catch (err) {
              console.error('Question Translation Error:', err);
            }
          } else {
            // Lecturer Answer: Korean speech -> translate to Student Language
            try {
              const translated = await translateText(clean, settings, sLang, 'ko');
              const newItem: QAItem = {
                originalText: clean,
                translatedText: translated,
                sourceLang: 'ko',
                targetLang: sLang,
                timestamp: new Date().toLocaleTimeString(),
              };
              setQaAnswerItem(newItem);
              syncToBroadcast({ qaSync: true, qaAnswerItem: newItem, isQAMode: true, qaPhase: 'answer' });
            } catch (err) {
              console.error('Answer Translation Error:', err);
            }
          }
          return;
        }

        // ===== 2. Standard Lecture Mode Active =====
        try {
          const currentLang = targetLanguageRef.current;
          const translatedText = await translateText(clean, settings, currentLang, 'ko');
          const newItem: SubtitleItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            type: 'lecture',
            koreanText: clean,
            englishText: translatedText,
            timestamp: new Date().toLocaleTimeString(),
          };

          setSubtitles((prev) => {
            if (prev.length > 0) {
              const lastItem = prev[prev.length - 1];
              if (lastItem.koreanText === clean || lastItem.englishText === translatedText) {
                return prev;
              }
            }
            const next = [...prev, newItem];
            if (next.length > 100) next.shift();
            syncToBroadcast({ subtitles: next });
            return next;
          });
        } catch (err) {
          console.error('Lecture Translation error:', err);
        }
      },
      onStatusChange: (listening, error) => {
        setIsListening(listening);
        if (error) setErrorMessage(error);
        else setErrorMessage(null);
        syncToBroadcast({ isListening: listening });
      },
    }, 'ko-KR');

    speechEngineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, [settings, isStudentMode, isAuthenticated]);

  // STT Language adjustment when Q&A mode or phase changes
  const updateSTTLanguage = (langCode: string) => {
    if (speechEngineRef.current) {
      speechEngineRef.current.setLanguage(langCode);
    }
  };

  // Q&A Mode Handlers
  const handleToggleQAMode = () => {
    if (isQAMode) {
      handleEndQA();
    } else {
      handleStartQA();
    }
  };

  const handleStartQA = () => {
    setIsQAMode(true);
    setQaPhase('question');
    setQaStudentLang(targetLanguage); // Default student language to currently active target language
    setQaQuestionItem(null);
    setQaAnswerItem(null);
    updateSTTLanguage(targetLanguage); // Switch mic STT to student language
    syncToBroadcast({
      qaSync: true,
      isQAMode: true,
      qaPhase: 'question',
      qaStudentLang: targetLanguage,
      qaQuestionItem: null,
      qaAnswerItem: null,
    });
  };

  const handleStartAnswerPhase = () => {
    setQaPhase('answer');
    updateSTTLanguage('ko-KR'); // Switch mic STT to Lecturer Korean
    syncToBroadcast({
      qaSync: true,
      isQAMode: true,
      qaPhase: 'answer',
    });
  };

  const handleResetQuestion = () => {
    setQaPhase('question');
    setQaQuestionItem(null);
    setQaAnswerItem(null);
    updateSTTLanguage(qaStudentLang);
    syncToBroadcast({
      qaSync: true,
      isQAMode: true,
      qaPhase: 'question',
      qaQuestionItem: null,
      qaAnswerItem: null,
    });
  };

  const handleEndQA = () => {
    // If we have a question item, package into a Q&A card in the main subtitle feed
    if (qaQuestionItem) {
      const studentLangObj = TARGET_LANGUAGES.find((l) => l.code === qaStudentLang);
      const qaFeedCard: SubtitleItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        type: 'qa',
        koreanText: qaQuestionItem.translatedText,
        englishText: qaAnswerItem ? qaAnswerItem.translatedText : '(답변 완료)',
        timestamp: new Date().toLocaleTimeString(),
        qaQuestionOriginal: qaQuestionItem.originalText,
        qaQuestionKorean: qaQuestionItem.translatedText,
        qaAnswerKorean: qaAnswerItem ? qaAnswerItem.originalText : undefined,
        qaAnswerTranslated: qaAnswerItem ? qaAnswerItem.translatedText : undefined,
        qaLangName: studentLangObj ? `${studentLangObj.flag} ${studentLangObj.name}` : qaStudentLang,
      };

      setSubtitles((prev) => {
        const next = [...prev, qaFeedCard];
        syncToBroadcast({ subtitles: next });
        return next;
      });
    }

    setIsQAMode(false);
    setQaPhase('question');
    setQaQuestionItem(null);
    setQaAnswerItem(null);
    updateSTTLanguage('ko-KR'); // Return mic STT to Korean
    syncToBroadcast({
      qaSync: true,
      isQAMode: false,
      qaPhase: 'question',
      qaQuestionItem: null,
      qaAnswerItem: null,
    });
  };

  const handleStudentLangChange = (lang: string) => {
    setQaStudentLang(lang);
    if (qaPhase === 'question') {
      updateSTTLanguage(lang);
    }
    syncToBroadcast({
      qaSync: true,
      qaStudentLang: lang,
    });
  };

  const handleTargetLanguageChange = (lang: string) => {
    setTargetLanguage(lang);
    syncToBroadcast({ targetLanguage: lang });
  };

  const handleToggleMic = () => {
    if (!speechEngineRef.current) return;
    if (isListening) {
      speechEngineRef.current.stop();
    } else {
      speechEngineRef.current.start();
    }
  };

  const handlePageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'PAGE_CHANGE',
          payload: { currentPage: page, totalPages: total, pdfDataUrl, pdfFileName },
        });
      } catch (err) {}
    }
  };

  const handlePdfLoaded = (dataUrl: string, fileName: string) => {
    setPdfDataUrl(dataUrl);
    setPdfFileName(fileName);
    setCurrentPage(1);
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'PDF_FILE_CHANGE',
          payload: { pdfDataUrl: dataUrl, pdfFileName: fileName, currentPage: 1 },
        });
      } catch (err) {}
    }
  };

  const handleSelectLecture = (course: CourseSchedule, week: WeekSchedule) => {
    setActiveCourseTitle(course.title);
    setActiveWeekNum(week.week);
    setActiveTopic(week.topic);
    setActiveGoogleDriveUrl(week.googleDriveUrl || '');
    setPdfFileName(week.pdfFileName || `${week.week}주차_강의안.pdf`);
    setPdfDataUrl(null); // Clear manual upload on entering a new week
    setCurrentPage(1);
    setCurrentView('lecture');
    setIsScheduleOpen(false);

    // Auto set translation target language pre-configured for this week
    const targetLang = week.targetLanguage || 'en';
    setTargetLanguage(targetLang);

    try {
      localStorage.setItem('lecture_active_course_title', course.title);
      localStorage.setItem('lecture_active_week_num', week.week.toString());
      localStorage.setItem('lecture_active_topic', week.topic);
      localStorage.setItem('lecture_active_drive_url', week.googleDriveUrl || '');
      localStorage.setItem('lecture_active_pdf_name', week.pdfFileName || `${week.week}주차_강의안.pdf`);
      localStorage.setItem('lecture_active_target_lang', targetLang);
      localStorage.removeItem('lecture_active_pdf_data'); // Clear stored manual PDF data url
    } catch (e) {}

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'PDF_FILE_CHANGE',
          payload: {
            pdfFileName: week.pdfFileName || `${week.week}주차_강의안.pdf`,
            googleDriveUrl: week.googleDriveUrl || '',
            pdfDataUrl: null, // Instruct student popout screens to also clear manual upload
            currentPage: 1,
            courseTitle: course.title,
            weekNum: week.week,
            topic: week.topic,
          },
        });
      } catch (err) {}
    }
  };

  const handleExitToLounge = () => {
    if (isListening && speechEngineRef.current) {
      speechEngineRef.current.stop();
    }
    if (subtitles.length > 0) {
      setIsLectureEndModalOpen(true);
    } else {
      setCurrentView('dashboard');
      setIsScheduleOpen(false);
    }
  };

  const handleConfirmEndLecture = async (saveTranscript: boolean, saveAiSummary: boolean) => {
    let transcriptText = '';
    let aiSummaryText = '';

    if (saveTranscript) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const langObj = TARGET_LANGUAGES.find((l) => l.code === targetLanguage);

      transcriptText += `==================================================\n`;
      transcriptText += `📖 실시간 강의 자막 & Q&A 자막 기록\n`;
      if (activeCourseTitle) {
        transcriptText += `과목명: ${activeCourseTitle} (${activeWeekNum}주차)\n`;
        transcriptText += `강의 주제: ${activeTopic}\n`;
      }
      transcriptText += `일시: ${new Date().toLocaleString()}\n`;
      transcriptText += `기본 번역 언어: ${langObj ? langObj.name : targetLanguage}\n`;
      transcriptText += `==================================================\n\n`;

      subtitles.forEach((sub) => {
        if (sub.type === 'qa') {
          transcriptText += `[${sub.timestamp}] 💬 [Q&A 세션 (${sub.qaLangName || '외국인 학생'})]\n`;
          transcriptText += `  - 🙋‍♂️ 질문 (원문): ${sub.qaQuestionOriginal || '-'}\n`;
          transcriptText += `  - 🙋‍♂️ 질문 (한국어 번역): ${sub.qaQuestionKorean || sub.koreanText}\n`;
          if (sub.qaAnswerKorean) {
            transcriptText += `  - 🎙️ 강사 답변 (한국어): ${sub.qaAnswerKorean}\n`;
            transcriptText += `  - 🎙️ 강사 답변 (번역): ${sub.qaAnswerTranslated || sub.englishText}\n`;
          }
          transcriptText += `\n`;
        } else {
          transcriptText += `[${sub.timestamp}] 📢 [강의 자막]\n`;
          transcriptText += `  - 한국어 원문: ${sub.koreanText}\n`;
          transcriptText += `  - 번역 자막: ${sub.englishText}\n\n`;
        }
      });
    }

    if (saveAiSummary) {
      try {
        const res = await generateLectureSummary(
          subtitles,
          activeCourseTitle,
          activeWeekNum,
          activeTopic
        );
        aiSummaryText = res.fullSummaryText;
      } catch (e) {
        console.error(e);
      }
    }

    // Save to matching Course & Week schedule
    let targetWeek: WeekSchedule | null = null;
    const updatedCourses = courses.map((c) => {
      if (c.title !== activeCourseTitle) return c;
      return {
        ...c,
        schedules: c.schedules.map((w) => {
          if (w.week !== activeWeekNum) return w;
          targetWeek = {
            ...w,
            hasSavedTranscript: saveTranscript || w.hasSavedTranscript,
            hasSavedAiSummary: saveAiSummary || w.hasSavedAiSummary,
            transcriptText: saveTranscript ? transcriptText : w.transcriptText,
            aiSummaryText: saveAiSummary ? aiSummaryText : w.aiSummaryText,
            savedAt: new Date().toLocaleString(),
          };
          return targetWeek;
        }),
      };
    });

    setCourses(updatedCourses);
    saveCourseList(updatedCourses);

    // Persist to Supabase DB async
    if (targetWeek && currentCourse) {
      saveWeekSchedule(currentCourse.id, targetWeek, updatedCourses).catch((err) => {
        console.error('[App] Failed to save end lecture schedule to Supabase:', err);
      });
    }

    // Clear live subtitles and backup for clean next session
    setSubtitles([]);
    try {
      localStorage.removeItem('lecture_subtitles_backup');
    } catch (e) {}

    setIsLectureEndModalOpen(false);
    setCurrentView('dashboard');
    setIsScheduleOpen(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('lecture_app_authenticated');
    setIsAuthenticated(false);
  };

  const handleOpenQrModal = (
    courseTitle?: string,
    weekNumber?: number,
    topic?: string,
    googleDriveUrl?: string,
    fileName?: string
  ) => {
    const data = {
      courseTitle: courseTitle || activeCourseTitle,
      weekNumber: weekNumber || activeWeekNum,
      topic: topic || activeTopic,
      googleDriveUrl: googleDriveUrl || activeGoogleDriveUrl,
      pdfFileName: fileName || pdfFileName || '강의교재.pdf',
    };
    setQrModalData(data);
    setIsQrCodeOpen(true);

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'QR_CODE_SYNC',
          payload: { isOpen: true, data },
        });
      } catch (err) {}
    }
  };

  const handleCloseQrModal = () => {
    setIsQrCodeOpen(false);
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'QR_CODE_SYNC',
          payload: { isOpen: false },
        });
      } catch (err) {}
    }
  };

  const handleOpenPopoutWindow = () => {
    window.open(`${window.location.origin}${window.location.pathname}?mode=student`, 'StudentView', 'width=1280,height=800');
  };

  // Export Transcript TXT File
  const handleExportTranscript = () => {
    if (subtitles.length === 0) {
      alert('저장할 강의 자막 내역이 없습니다.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const langObj = TARGET_LANGUAGES.find((l) => l.code === targetLanguage);

    let content = `==================================================\n`;
    content += `📖 실시간 강의 자막 & Q&A 자막 기록\n`;
    if (activeCourseTitle) {
      content += `과목명: ${activeCourseTitle} (${activeWeekNum}주차)\n`;
      content += `강의 주제: ${activeTopic}\n`;
    }
    content += `일시: ${new Date().toLocaleString()}\n`;
    content += `기본 번역 언어: ${langObj ? langObj.name : targetLanguage}\n`;
    content += `==================================================\n\n`;

    subtitles.forEach((sub, idx) => {
      if (sub.type === 'qa') {
        content += `[${sub.timestamp}] 💬 [Q&A 세션 (${sub.qaLangName || '외국인 학생'})]\n`;
        content += `  - 🙋‍♂️ 질문 (원문): ${sub.qaQuestionOriginal || '-'}\n`;
        content += `  - 🙋‍♂️ 질문 (한국어 번역): ${sub.qaQuestionKorean || sub.koreanText}\n`;
        if (sub.qaAnswerKorean) {
          content += `  - 🎙️ 강사 답변 (한국어): ${sub.qaAnswerKorean}\n`;
          content += `  - 🎙️ 강사 답변 (번역): ${sub.qaAnswerTranslated || sub.englishText}\n`;
        }
        content += `\n`;
      } else {
        content += `[${sub.timestamp}] 📢 [강의 자막]\n`;
        content += `  - 한국어 원문: ${sub.koreanText}\n`;
        content += `  - 번역 자막: ${sub.englishText}\n\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeCourse = activeCourseTitle ? activeCourseTitle.replace(/[^a-zA-Z0-9가-힣]/g, '') : '';
    link.download = safeCourse 
      ? `${todayStr}_${activeWeekNum}주차_${safeCourse}_강의자막록.txt` 
      : `${todayStr}_강의자막록.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render Password Auth Modal if not authenticated
  if (!isAuthenticated) {
    return <AuthModal onAuthenticate={() => setIsAuthenticated(true)} />;
  }

  // If student mode window, render clean full-screen presentation + subtitle or Q&A view
  if (isStudentMode) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          background: 'var(--bg-primary)',
          padding: '16px',
          gap: '16px',
        }}
      >
        <div style={{ flex: 1, display: 'flex', gap: '16px', height: '100%' }}>
          <div style={{ flex: showSubtitles ? '0 0 65%' : '1', height: '100%' }}>
            <PdfViewer
              onPageChange={handlePageChange}
              onPdfLoaded={handlePdfLoaded}
              externalPdfDataUrl={pdfDataUrl}
              externalPdfFileName={pdfFileName}
              externalCurrentPage={currentPage}
              externalGoogleDriveUrl={activeGoogleDriveUrl}
              courseSchedules={currentCourse?.schedules}
              activeWeekNum={activeWeekNum}
              onSelectWeekSchedule={(week) => handleSelectLecture(currentCourse, week)}
              isReadOnly={true}
            />
          </div>
          {showSubtitles && (
            <div style={{ flex: '1', height: '100%' }}>
              {isQAMode ? (
                <QADisplay
                  qaPhase={qaPhase}
                  questionItem={qaQuestionItem}
                  answerItem={qaAnswerItem}
                  interimText={interimText}
                  isListening={isListening}
                  fontSize={fontSize}
                  studentLang={qaStudentLang}
                  onStudentLangChange={handleStudentLangChange}
                  onStartAnswerPhase={handleStartAnswerPhase}
                  onResetQuestion={handleResetQuestion}
                  onEndQA={handleEndQA}
                />
              ) : (
                <SubtitleDisplay
                  subtitles={subtitles}
                  interimText={interimText}
                  isListening={isListening}
                  fontSize={fontSize}
                  targetLanguage={targetLanguage}
                  showKorean={showKorean}
                  onToggleKorean={() => setShowKorean(!showKorean)}
                  onClearSubtitles={() => setSubtitles([])}
                  isQAMode={isQAMode}
                  onToggleQAMode={handleToggleQAMode}
                />
              )}
            </div>
          )}
        </div>
        {/* QR Code Share Modal for Student Popout */}
        <QrCodeModal
          isOpen={isQrCodeOpen}
          onClose={handleCloseQrModal}
          courseTitle={qrModalData.courseTitle}
          weekNumber={qrModalData.weekNumber}
          topic={qrModalData.topic}
          googleDriveUrl={qrModalData.googleDriveUrl}
          pdfFileName={qrModalData.pdfFileName}
        />
      </div>
    );
  }

  // Primary Screen 1: Dashboard Lounge View after password authentication
  if (currentView === 'dashboard') {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <ScheduleDashboardModal
          isOpen={true}
          isLoungeView={true}
          onSelectLecture={handleSelectLecture}
          onOpenQrCode={(cTitle, wNum, top, dUrl, fName) => {
            handleOpenQrModal(cTitle, wNum, top, dUrl, fName);
          }}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />

        {/* QR Code Share Modal */}
        <QrCodeModal
          isOpen={isQrCodeOpen}
          onClose={handleCloseQrModal}
          courseTitle={qrModalData.courseTitle}
          weekNumber={qrModalData.weekNumber}
          topic={qrModalData.topic}
          googleDriveUrl={qrModalData.googleDriveUrl}
          pdfFileName={qrModalData.pdfFileName}
        />
      </div>
    );
  }

  // Primary Screen 2: Active Real-time Subtitle & PDF Lecture Workspace
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Top Header Controls */}
      <Header
        isListening={isListening}
        onToggleMic={handleToggleMic}
        layoutMode={layoutMode}
        onChangeLayout={setLayoutMode}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        targetLanguage={targetLanguage}
        onChangeTargetLanguage={handleTargetLanguageChange}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPopoutWindow={handleOpenPopoutWindow}
        isQAMode={isQAMode}
        onToggleQAMode={handleToggleQAMode}
        onExportTranscript={handleExportTranscript}
        onOpenAiSummary={() => setIsAiSummaryOpen(true)}
        onOpenScheduleDashboard={() => setIsScheduleOpen(true)}
        onOpenQrCode={() => handleOpenQrModal()}
        onExitToLounge={handleExitToLounge}
        currentCourseTitle={activeCourseTitle}
        currentWeekNum={activeWeekNum}
        showSubtitles={showSubtitles}
        onToggleSubtitles={() => setShowSubtitles(!showSubtitles)}
      />

      {/* Warning / Error Message Banner */}
      {errorMessage && (
        <div
          style={{
            background: '#ef4444',
            color: '#ffffff',
            padding: '8px 24px',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Main Workspace Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: layoutMode === 'side-by-side' ? 'row' : 'column',
          padding: '16px',
          gap: '16px',
          overflow: 'hidden',
        }}
      >
        {/* PDF Slide Viewer Container */}
        <div
          style={{
            flex: showSubtitles
              ? (layoutMode === 'side-by-side' ? '0 0 62%' : '0 0 65%')
              : '1',
            height: '100%',
            minHeight: 0,
          }}
        >
          <PdfViewer
            onPageChange={handlePageChange}
            onPdfLoaded={handlePdfLoaded}
            externalPdfDataUrl={pdfDataUrl}
            externalPdfFileName={pdfFileName}
            externalCurrentPage={currentPage}
            externalGoogleDriveUrl={activeGoogleDriveUrl}
            courseSchedules={currentCourse?.schedules}
            activeWeekNum={activeWeekNum}
            onSelectWeekSchedule={(week) => handleSelectLecture(currentCourse, week)}
          />
        </div>

        {/* Real-time Subtitle / Q&A Display Container */}
        {showSubtitles && (
          <div
            style={{
              flex: 1,
              height: '100%',
              minHeight: 0,
            }}
          >
            {isQAMode ? (
              <QADisplay
                qaPhase={qaPhase}
                questionItem={qaQuestionItem}
                answerItem={qaAnswerItem}
                interimText={interimText}
                isListening={isListening}
                fontSize={fontSize}
                studentLang={qaStudentLang}
                onStudentLangChange={handleStudentLangChange}
                onStartAnswerPhase={handleStartAnswerPhase}
                onResetQuestion={handleResetQuestion}
                onEndQA={handleEndQA}
              />
            ) : (
              <SubtitleDisplay
                subtitles={subtitles}
                interimText={interimText}
                isListening={isListening}
                fontSize={fontSize}
                targetLanguage={targetLanguage}
                showKorean={showKorean}
                onToggleKorean={() => setShowKorean(!showKorean)}
                onClearSubtitles={() => setSubtitles([])}
                isQAMode={isQAMode}
                onToggleQAMode={handleToggleQAMode}
              />
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
      />

      {/* Semester Schedule Dashboard Modal (when triggered inside lecture room) */}
      <ScheduleDashboardModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onSelectLecture={handleSelectLecture}
        onOpenQrCode={(cTitle, wNum, top, dUrl, fName) => {
          handleOpenQrModal(cTitle, wNum, top, dUrl, fName);
        }}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* QR Code Share Modal */}
      <QrCodeModal
        isOpen={isQrCodeOpen}
        onClose={handleCloseQrModal}
        courseTitle={qrModalData.courseTitle}
        weekNumber={qrModalData.weekNumber}
        topic={qrModalData.topic}
        googleDriveUrl={qrModalData.googleDriveUrl}
        pdfFileName={qrModalData.pdfFileName}
      />

      {/* AI Summary Modal */}
      <AiSummaryModal
        isOpen={isAiSummaryOpen}
        onClose={() => setIsAiSummaryOpen(false)}
        subtitles={subtitles}
        courseTitle={activeCourseTitle}
        weekNum={activeWeekNum}
        topic={activeTopic}
      />

      {/* Lecture End & DB Archiving Modal */}
      <LectureEndModal
        isOpen={isLectureEndModalOpen}
        onClose={() => {
          setIsLectureEndModalOpen(false);
          setCurrentView('dashboard');
          setIsScheduleOpen(false);
        }}
        onConfirmEnd={handleConfirmEndLecture}
        subtitlesCount={subtitles.length}
        courseTitle={activeCourseTitle}
        weekNum={activeWeekNum}
        topic={activeTopic}
      />
    </div>
  );
};

