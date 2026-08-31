import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { PdfViewer } from './components/PdfViewer';
import { SubtitleDisplay, SubtitleItem } from './components/SubtitleDisplay';
export type { SubtitleItem };
import { QADisplay, QAItem } from './components/QADisplay';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { ScheduleDashboardModal } from './components/ScheduleDashboardModal';
import { UnifiedQrModal } from './components/UnifiedQrModal';
import { AiSummaryModal } from './components/AiSummaryModal';
import { LectureEndModal } from './components/LectureEndModal';
import { CounselingDashboardView } from './components/CounselingDashboardView';
import { CounselingSessionView } from './components/CounselingSessionView';
import { CourseSchedule, WeekSchedule, SEMESTER_COURSES, ReportItem, Semester, DEFAULT_SEMESTERS } from './data/scheduleData';
import { SpeechEngine } from './services/speechRecognition';
import { translateText, TranslationSettings, TARGET_LANGUAGES } from './services/translationService';
import { loadCourseSchedules, saveCourseList, saveWeekSchedule, loadSemesters } from './services/scheduleService';
import { generateLectureSummary } from './services/aiSummaryService';
import { CounselingRecord, CounselingUtterance } from './data/counselingData';
import { DualSpeechEngine } from './services/dualSpeechRecognition';
import { generateCounselingAiSummary, saveCounselingRecord } from './services/counselingService';
import { StudentAuthModal } from './components/StudentAuthModal';
import { supabase } from './lib/supabase';
import { Clock, BookOpen, Pin, Sparkles, Radio } from 'lucide-react';

// Last updated: 2026-08-31 - Student Live Classroom & Attendance System

export const App: React.FC = () => {
  // URL parameter detector (e.g. ?popout=true for projector popout, ?mode=student or ?room= for student view)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room') || '';
  const isPopoutMode = urlParams.get('popout') === 'true' || urlParams.get('mode') === 'popout';
  const isStudentMode = (urlParams.get('mode') === 'student' || urlParams.has('room')) && !isPopoutMode;

  // Track whether professor has entered classroom & whether lecture has ended
  const [isClassroomActive, setIsClassroomActive] = useState<boolean>(() => !isStudentMode || isPopoutMode);
  const [isLectureEnded, setIsLectureEnded] = useState<boolean>(false);

  // Student 8-digit Student ID Authentication State
  const [studentId, setStudentId] = useState<string>(
    () => sessionStorage.getItem('lecture_student_id') || ''
  );
  const [isStudentAuthOpen, setIsStudentAuthOpen] = useState<boolean>(
    () => isStudentMode && !sessionStorage.getItem('lecture_student_id') && isClassroomActive && !isPopoutMode
  );
  const [attendedStudentIds, setAttendedStudentIds] = useState<string[]>([]);

  // Auth Protection (Professors require password, Students & Popouts bypass master login)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem('lecture_app_authenticated') === 'true' || isStudentMode || isPopoutMode
  );

  // Theme & Settings
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return isStudentMode || isPopoutMode ? 'dark' : 'light';
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
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PDF Sync State for popouts
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(4);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  // View Routing State: 'dashboard' (Lounge Landing) | 'lecture' (Active Lecture Room) | 'counseling' (Counseling Center)
  const [currentView, setCurrentView] = useState<'dashboard' | 'lecture' | 'counseling'>('dashboard');
  const [activeCounselingRecord, setActiveCounselingRecord] = useState<CounselingRecord | null>(null);

  // ================= Semester Schedule & Google Drive State =================
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [isQrCodeOpen, setIsQrCodeOpen] = useState<boolean>(false);
  const [isReportQrModalOpen, setIsReportQrModalOpen] = useState<boolean>(false);
  const [selectedReportId, setSelectedReportId] = useState<string | undefined>(undefined);
  const [isAiSummaryOpen, setIsAiSummaryOpen] = useState<boolean>(false);
  const [isLectureEndModalOpen, setIsLectureEndModalOpen] = useState<boolean>(false);
  const [courses, setCourses] = useState<CourseSchedule[]>(SEMESTER_COURSES);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [activeCourseTitle, setActiveCourseTitle] = useState<string>('관광 AI 콘텐츠 제작 실무');
  const [activeWeekNum, setActiveWeekNum] = useState<number>(1);
  const [activeTopic, setActiveTopic] = useState<string>('오리엔테이션');
  const [activeGoogleDriveUrl, setActiveGoogleDriveUrl] = useState<string>('');

  // Sync schedules from Supabase DB / localStorage
  useEffect(() => {
    loadCourseSchedules().then((data) => {
      setCourses(data);
      const matchedCourse =
        data.find((c) => c.id === activeCourseId) ||
        data.find((c) => c.title === activeCourseTitle) ||
        data[0];
      if (matchedCourse) {
        const weekSched = matchedCourse.schedules.find((s) => s.week === activeWeekNum) || matchedCourse.schedules[0];
        if (weekSched && weekSched.topic) {
          setActiveTopic(weekSched.topic);
        }
      }
    });
  }, [currentView, isScheduleOpen, activeCourseId, activeWeekNum]);

  const currentCourse =
    courses.find((c) => c.id === activeCourseId) ||
    courses.find((c) => c.title === activeCourseTitle) ||
    courses[0];

  // QR Modal target payload state
  const [qrModalData, setQrModalData] = useState<{
    courseTitle: string;
    courseId?: string;
    weekNumber: number;
    topic: string;
    googleDriveUrl?: string;
    pdfFileName?: string;
    reports?: ReportItem[];
    reportTitle?: string;
    reportUrl?: string;
  }>({
    courseTitle: '관광 AI 콘텐츠 제작 실무',
    courseId: 'course-1',
    weekNumber: 1,
    topic: '오리엔테이션',
    googleDriveUrl: '',
    pdfFileName: '1주차_관광AI개론.pdf',
    reports: [],
    reportTitle: '',
    reportUrl: '',
  });

  // ================= 1:1 Counseling Room State =================
  const [isCounselingRoomOpen, setIsCounselingRoomOpen] = useState<boolean>(false);
  const [isCounselingSessionActive, setIsCounselingSessionActive] = useState<boolean>(false);
  const [counselingStudentId, setCounselingStudentId] = useState<string>('');
  const [counselingStudentLang, setCounselingStudentLang] = useState<string>('en');
  const [counselingTopic, setCounselingTopic] = useState<string>('1:1 진로 및 학업 상담');
  const [counselingUtterances, setCounselingUtterances] = useState<CounselingUtterance[]>([]);
  const [counselingProfInterim, setCounselingProfInterim] = useState<string>('');
  const [counselingStudentInterim, setCounselingStudentInterim] = useState<string>('');
  const [isCounselingListening, setIsCounselingListening] = useState<boolean>(false);
  const [semesters, setSemesters] = useState<Semester[]>(DEFAULT_SEMESTERS);
  const [activeSemesterId, setActiveSemesterId] = useState<string>('sem-2026-2');

  const dualSpeechEngineRef = useRef<DualSpeechEngine | null>(null);

  useEffect(() => {
    loadSemesters().then((sems) => setSemesters(sems));
  }, []);

  // ================= Q&A Mode State =================
  const [isQAMode, setIsQAMode] = useState<boolean>(false);
  const [qaPhase, setQaPhase] = useState<'question' | 'answer'>('question');
  const [qaStudentLang, setQaStudentLang] = useState<string>('en');
  const [qaQuestionItem, setQaQuestionItem] = useState<QAItem | null>(null);
  const [qaAnswerItem, setQaAnswerItem] = useState<QAItem | null>(null);

  // Refs for persistent engines, cross-window sync & active state
  const speechEngineRef = useRef<SpeechEngine | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const supabaseChannelRef = useRef<any>(null);
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
  const [qrModalIndex, setQrModalIndex] = useState<number>(0);
  const showSubtitlesRef = useRef<boolean>(true);
  const isQrCodeOpenRef = useRef<boolean>(false);
  const qrModalDataRef = useRef(qrModalData);
  const qrModalIndexRef = useRef<number>(0);

  // Keep Refs updated
  useEffect(() => {
    qrModalIndexRef.current = qrModalIndex;
  }, [qrModalIndex]);
  useEffect(() => {
    isQrCodeOpenRef.current = isQrCodeOpen;
  }, [isQrCodeOpen]);
  useEffect(() => {
    qrModalDataRef.current = qrModalData;
  }, [qrModalData]);
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
  }, [currentPage]);

  useEffect(() => {
    pdfDataUrlRef.current = pdfDataUrl;
  }, [pdfDataUrl]);

  useEffect(() => {
    pdfFileNameRef.current = pdfFileName;
  }, [pdfFileName]);

  useEffect(() => {
    activeGoogleDriveUrlRef.current = activeGoogleDriveUrl;
  }, [activeGoogleDriveUrl]);

  useEffect(() => {
    activeWeekNumRef.current = activeWeekNum;
  }, [activeWeekNum]);

  useEffect(() => {
    qaQuestionItemRef.current = qaQuestionItem;
  }, [qaQuestionItem]);

  useEffect(() => {
    qaAnswerItemRef.current = qaAnswerItem;
  }, [qaAnswerItem]);

  // Automatically change theme based on view: light for dashboard (lounge), dark for lecture
  useEffect(() => {
    if (isStudentMode || isPopoutMode) {
      setTheme('dark');
    } else {
      if (currentView === 'dashboard') {
        setTheme('light');
      } else if (currentView === 'lecture') {
        setTheme('dark');
      }
    }
  }, [currentView, isStudentMode, isPopoutMode]);

  // Apply theme to document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync subtitles visibility change
  useEffect(() => {
    if (broadcastChannelRef.current && !isStudentMode && !isPopoutMode) {
      broadcastChannelRef.current.postMessage({
        type: 'SUBTITLES_VISIBILITY_SYNC',
        payload: { showSubtitles },
      });
    }
  }, [showSubtitles, isStudentMode, isPopoutMode]);

  // Real-time Student Attendance Processor & Supabase DB Auto-Persist
  const handleReceiveStudentAttendance = useCallback(
    (id: string, weekNum?: number, courseTitle?: string) => {
      if (!id) return;

      setAttendedStudentIds((prev) => {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      });

      const targetWeekNum = weekNum || activeWeekNum;
      const targetCourseTitle = courseTitle || activeCourseTitle;

      setCourses((prevCourses) => {
        const targetCourse =
          prevCourses.find((c) => c.id === activeCourseId) ||
          prevCourses.find((c) => c.title === targetCourseTitle) ||
          prevCourses[0];

        if (!targetCourse) return prevCourses;

        let updatedWeekSchedule: WeekSchedule | null = null;

        const nextCourses = prevCourses.map((c) => {
          if (c.id !== targetCourse.id) return c;
          return {
            ...c,
            schedules: c.schedules.map((w) => {
              if (w.week !== targetWeekNum) return w;
              const existing = w.attendanceStudentIds || [];
              const newAttendance = Array.from(new Set([...existing, id]));
              updatedWeekSchedule = {
                ...w,
                attendanceStudentIds: newAttendance,
              };
              return updatedWeekSchedule;
            }),
          };
        });

        // Auto-save to LocalStorage & Supabase DB immediately
        saveCourseList(nextCourses);
        if (updatedWeekSchedule && targetCourse) {
          saveWeekSchedule(targetCourse.id, updatedWeekSchedule, nextCourses).catch((err) => {
            console.error('[App] Failed to auto-persist student attendance:', err);
          });
        }

        return nextCourses;
      });
    },
    [activeCourseId, activeCourseTitle, activeWeekNum]
  );

  // Setup BroadcastChannel for popout student window synchronization
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('lecture_subtitles_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'REQUEST_FULL_SYNC' && !isStudentMode && !isPopoutMode) {
          // Master window responds with complete state to newly opened student/popout popup window
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
              isQrCodeOpen: isQrCodeOpenRef.current,
              qrModalData: qrModalDataRef.current,
              qrModalIndex: qrModalIndexRef.current,
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
          if (payload.qrModalIndex !== undefined) setQrModalIndex(payload.qrModalIndex);
          if (payload.showSubtitles !== undefined) setShowSubtitles(payload.showSubtitles);
        } else if (type === 'QR_CODE_SYNC') {
          if (payload.isOpen !== undefined) {
            setIsQrCodeOpen(payload.isOpen);
            if (!payload.isOpen) setIsReportQrModalOpen(false);
          }
          if (payload.data) {
            setQrModalData(payload.data);
          }
          if (payload.currentIndex !== undefined) {
            setQrModalIndex(payload.currentIndex);
          }
        } else if (type === 'SUBTITLES_UPDATE') {
          setSubtitles(payload.subtitles);
          setInterimText(payload.interimText || '');
          if (payload.targetLanguage) setTargetLanguage(payload.targetLanguage);
          setIsClassroomActive(true);
        } else if (type === 'PAGE_CHANGE') {
          setCurrentPage(payload.currentPage);
          if (payload.pdfDataUrl !== undefined) setPdfDataUrl(payload.pdfDataUrl);
          if (payload.pdfFileName) setPdfFileName(payload.pdfFileName);
          if (payload.activeGoogleDriveUrl !== undefined) setActiveGoogleDriveUrl(payload.activeGoogleDriveUrl);
          setIsClassroomActive(true);
        } else if (type === 'PDF_FILE_CHANGE') {
          if (payload.pdfDataUrl !== undefined) setPdfDataUrl(payload.pdfDataUrl);
          if (payload.pdfFileName) setPdfFileName(payload.pdfFileName);
          const driveUrl = payload.activeGoogleDriveUrl || payload.googleDriveUrl;
          if (driveUrl !== undefined) setActiveGoogleDriveUrl(driveUrl);
          if (payload.weekNum || payload.activeWeekNum) setActiveWeekNum(payload.weekNum || payload.activeWeekNum);
          setCurrentPage(payload.currentPage || 1);
          setIsClassroomActive(true);
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
        } else if (type === 'STUDENT_ATTENDED') {
          if (payload.studentId) {
            handleReceiveStudentAttendance(payload.studentId, payload.weekNum, payload.courseTitle);
          }
        } else if (type === 'CLASSROOM_STATUS') {
          if (payload.isEnded !== undefined) setIsLectureEnded(payload.isEnded);
          if (payload.isActive !== undefined) {
            setIsClassroomActive(payload.isActive);
            if (payload.isActive && isStudentMode) {
              const savedId = sessionStorage.getItem('lecture_student_id') || studentId;
              if (!savedId) {
                setIsStudentAuthOpen(true);
              } else if (!payload.isEnded) {
                // Auto-report attendance for active week if student is already authenticated
                const targetWeek = payload.weekNum || activeWeekNum;
                const targetCourse = payload.courseTitle || activeCourseTitle;
                sendRealtimeEvent('STUDENT_ATTENDED', {
                  studentId: savedId,
                  weekNum: targetWeek,
                  courseTitle: targetCourse,
                  room: roomParam,
                });
              }
            }
          }
          if (payload.courseTitle) setActiveCourseTitle(payload.courseTitle);
          if (payload.weekNum) setActiveWeekNum(payload.weekNum);
          if (payload.topic) setActiveTopic(payload.topic);
          if (payload.pdfFileName) setPdfFileName(payload.pdfFileName);
          if (payload.activeGoogleDriveUrl !== undefined) setActiveGoogleDriveUrl(payload.activeGoogleDriveUrl);
          if (payload.currentPage) setCurrentPage(payload.currentPage);
        } else if (type === 'REQUEST_CLASSROOM_STATUS' || type === 'REQUEST_FULL_SYNC') {
          if (!isStudentMode && !isPopoutMode && currentView === 'lecture') {
            sendRealtimeEvent('CLASSROOM_STATUS', {
              isActive: true,
              isEnded: false,
              courseTitle: activeCourseTitle,
              weekNum: activeWeekNum,
              topic: activeTopic,
              pdfFileName,
              activeGoogleDriveUrl,
              currentPage,
            });
          }
        }
      };

      // If this is a student window or popout window that just opened, request initial full state from master window
      if (isStudentMode || isPopoutMode) {
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
  }, [isStudentMode, isPopoutMode, currentView, activeCourseTitle, activeWeekNum, activeTopic, pdfFileName, activeGoogleDriveUrl, currentPage, handleReceiveStudentAttendance]);

  // Setup Supabase Realtime WebSocket Broadcast channel for cross-network student PCs
  useEffect(() => {
    const channelName = roomParam ? `room_${roomParam}` : 'global_lecture_room';
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'SUBTITLES_UPDATE' }, ({ payload }: { payload: any }) => {
        if (payload.subtitles) setSubtitles(payload.subtitles);
        if (payload.interimText !== undefined) setInterimText(payload.interimText);
        if (payload.targetLanguage) setTargetLanguage(payload.targetLanguage);
        setIsClassroomActive(true);
      })
      .on('broadcast', { event: 'PAGE_CHANGE' }, ({ payload }: { payload: any }) => {
        if (payload.currentPage) setCurrentPage(payload.currentPage);
        if (payload.pdfDataUrl !== undefined) setPdfDataUrl(payload.pdfDataUrl);
        if (payload.pdfFileName) setPdfFileName(payload.pdfFileName);
        if (payload.activeGoogleDriveUrl !== undefined) setActiveGoogleDriveUrl(payload.activeGoogleDriveUrl);
        setIsClassroomActive(true);
      })
      .on('broadcast', { event: 'PDF_FILE_CHANGE' }, ({ payload }: { payload: any }) => {
        if (payload.pdfDataUrl !== undefined) setPdfDataUrl(payload.pdfDataUrl);
        if (payload.pdfFileName) setPdfFileName(payload.pdfFileName);
        if (payload.activeGoogleDriveUrl !== undefined) setActiveGoogleDriveUrl(payload.activeGoogleDriveUrl);
        if (payload.courseTitle) setActiveCourseTitle(payload.courseTitle);
        if (payload.weekNum) setActiveWeekNum(payload.weekNum);
        if (payload.topic) setActiveTopic(payload.topic);
        if (payload.currentPage) setCurrentPage(payload.currentPage);
        setIsClassroomActive(true);
      })
      .on('broadcast', { event: 'CLASSROOM_STATUS' }, ({ payload }: { payload: any }) => {
        if (payload.isEnded !== undefined) setIsLectureEnded(payload.isEnded);
        if (payload.isActive !== undefined) {
          setIsClassroomActive(payload.isActive);
          if (payload.isActive && isStudentMode) {
            const savedId = sessionStorage.getItem('lecture_student_id') || studentId;
            if (!savedId) {
              setIsStudentAuthOpen(true);
            } else if (!payload.isEnded) {
              // Auto-report attendance for active week if student is already authenticated
              const targetWeek = payload.weekNum || activeWeekNum;
              const targetCourse = payload.courseTitle || activeCourseTitle;
              sendRealtimeEvent('STUDENT_ATTENDED', {
                studentId: savedId,
                weekNum: targetWeek,
                courseTitle: targetCourse,
                room: roomParam,
              });
            }
          }
        }
        if (payload.courseTitle) setActiveCourseTitle(payload.courseTitle);
        if (payload.weekNum) setActiveWeekNum(payload.weekNum);
        if (payload.topic) setActiveTopic(payload.topic);
        if (payload.pdfFileName) setPdfFileName(payload.pdfFileName);
        if (payload.activeGoogleDriveUrl !== undefined) setActiveGoogleDriveUrl(payload.activeGoogleDriveUrl);
        if (payload.currentPage) setCurrentPage(payload.currentPage);
      })
      .on('broadcast', { event: 'REQUEST_CLASSROOM_STATUS' }, () => {
        if (!isStudentMode && !isPopoutMode && currentView === 'lecture') {
          sendRealtimeEvent('CLASSROOM_STATUS', {
            isActive: true,
            courseTitle: activeCourseTitle,
            weekNum: activeWeekNum,
            topic: activeTopic,
            pdfFileName,
            activeGoogleDriveUrl,
            currentPage,
          });
        }
      })
      .on('broadcast', { event: 'STUDENT_ATTENDED' }, ({ payload }: { payload: any }) => {
        if (payload.studentId) {
          handleReceiveStudentAttendance(payload.studentId, payload.weekNum, payload.courseTitle);
        }
      })
      .on('broadcast', { event: 'QA_SYNC' }, ({ payload }: { payload: any }) => {
        if (payload.isQAMode !== undefined) setIsQAMode(payload.isQAMode);
        if (payload.qaPhase) setQaPhase(payload.qaPhase);
        if (payload.qaStudentLang) setQaStudentLang(payload.qaStudentLang);
        if (payload.qaQuestionItem !== undefined) setQaQuestionItem(payload.qaQuestionItem);
        if (payload.qaAnswerItem !== undefined) setQaAnswerItem(payload.qaAnswerItem);
      })
      .on('broadcast', { event: 'QR_CODE_SYNC' }, ({ payload }: { payload: any }) => {
        if (payload.isOpen !== undefined) setIsQrCodeOpen(payload.isOpen);
        if (payload.data) setQrModalData(payload.data);
        if (payload.currentIndex !== undefined) setQrModalIndex(payload.currentIndex);
      })
      .on('broadcast', { event: 'SUBTITLES_VISIBILITY_SYNC' }, ({ payload }: { payload: any }) => {
        if (payload.showSubtitles !== undefined) setShowSubtitles(payload.showSubtitles);
      })
      .subscribe();

    supabaseChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomParam, isStudentMode, isPopoutMode, currentView, activeCourseTitle, activeWeekNum, activeTopic, pdfFileName, activeGoogleDriveUrl, currentPage]);

  // Request active classroom status when student or popout window joins
  useEffect(() => {
    if (isStudentMode || isPopoutMode) {
      const timer = setTimeout(() => {
        sendRealtimeEvent('REQUEST_CLASSROOM_STATUS', {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isStudentMode, isPopoutMode, currentView]);

  // General Realtime Event Dispatcher (Local Tab + Supabase WebSockets)
  const sendRealtimeEvent = (type: string, payload: any) => {
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type, payload });
      } catch (err) {}
    }
    if (supabaseChannelRef.current) {
      try {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: type,
          payload,
        });
      } catch (err) {}
    }
  };

  const handleStudentAuthSubmit = (id: string) => {
    setStudentId(id);
    sessionStorage.setItem('lecture_student_id', id);
    setIsStudentAuthOpen(false);

    handleReceiveStudentAttendance(id, activeWeekNum, activeCourseTitle);

    sendRealtimeEvent('STUDENT_ATTENDED', {
      studentId: id,
      weekNum: activeWeekNum,
      courseTitle: activeCourseTitle,
      room: roomParam,
    });
  };

  // Broadcast helper
  const syncToBroadcast = (extraPayload: any = {}) => {
    const payload = {
      subtitles: extraPayload.subtitles !== undefined ? extraPayload.subtitles : subtitles,
      interimText: extraPayload.interimText !== undefined ? extraPayload.interimText : interimText,
      targetLanguage: extraPayload.targetLanguage !== undefined ? extraPayload.targetLanguage : targetLanguage,
    };

    sendRealtimeEvent('SUBTITLES_UPDATE', payload);

    if (extraPayload.qaSync) {
      sendRealtimeEvent('QA_SYNC', {
        isQAMode: extraPayload.isQAMode !== undefined ? extraPayload.isQAMode : isQAMode,
        qaPhase: extraPayload.qaPhase !== undefined ? extraPayload.qaPhase : qaPhase,
        qaStudentLang: extraPayload.qaStudentLang !== undefined ? extraPayload.qaStudentLang : qaStudentLang,
        qaQuestionItem: extraPayload.qaQuestionItem !== undefined ? extraPayload.qaQuestionItem : qaQuestionItem,
        qaAnswerItem: extraPayload.qaAnswerItem !== undefined ? extraPayload.qaAnswerItem : qaAnswerItem,
      });
    }
  };

  // Initialize SpeechEngine on mount
  useEffect(() => {
    if (isStudentMode || isPopoutMode || !isAuthenticated) return; // Student/Popout window doesn't capture mic

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

  // ================= Counseling Session Controls =================
  const handleStartCounselingSession = (record: CounselingRecord) => {
    setActiveCounselingRecord(record);
    setCounselingStudentId(record.studentId);
    setCounselingStudentLang(record.studentLang);
    setCounselingTopic(record.topic);
    setCounselingUtterances(record.utterances || []);
    setCounselingProfInterim('');
    setCounselingStudentInterim('');
    setIsCounselingSessionActive(true);

    const engine = new DualSpeechEngine(
      {
        onProfessorInterim: (text) => setCounselingProfInterim(text),
        onProfessorFinal: async (originalText) => {
          setCounselingProfInterim('');
          try {
            const translatedText = await translateText(originalText, settings, record.studentLang, 'ko');
            const u: CounselingUtterance = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
              speaker: 'professor',
              originalText,
              translatedText,
              sourceLang: 'ko',
              targetLang: record.studentLang,
              timestamp: new Date().toLocaleTimeString(),
            };
            setCounselingUtterances((prev) => [...prev, u]);
          } catch (e) {
            console.error('Professor counseling translation error:', e);
          }
        },
        onStudentInterim: (text) => setCounselingStudentInterim(text),
        onStudentFinal: async (originalText) => {
          setCounselingStudentInterim('');
          try {
            const translatedText = await translateText(originalText, settings, 'ko', record.studentLang);
            const u: CounselingUtterance = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
              speaker: 'student',
              originalText,
              translatedText,
              sourceLang: record.studentLang,
              targetLang: 'ko',
              timestamp: new Date().toLocaleTimeString(),
            };
            setCounselingUtterances((prev) => [...prev, u]);
          } catch (e) {
            console.error('Student counseling translation error:', e);
          }
        },
        onStatusChange: (listening) => setIsCounselingListening(listening),
      },
      record.studentLang
    );

    dualSpeechEngineRef.current = engine;
    engine.start();
  };

  const handleToggleCounselingListening = () => {
    if (!dualSpeechEngineRef.current) return;
    if (dualSpeechEngineRef.current.isCurrentlyListening()) {
      dualSpeechEngineRef.current.stop();
    } else {
      dualSpeechEngineRef.current.start();
    }
  };

  const handleEndCounselingSession = async () => {
    if (dualSpeechEngineRef.current) {
      dualSpeechEngineRef.current.stop();
      dualSpeechEngineRef.current = null;
    }

    const summary = await generateCounselingAiSummary(
      counselingUtterances,
      counselingStudentId,
      counselingStudentLang,
      counselingTopic
    );

    const recordToSave: CounselingRecord = {
      id: activeCounselingRecord?.id || ('counsel-' + Date.now()),
      semesterId: activeCounselingRecord?.semesterId || activeSemesterId,
      studentId: counselingStudentId,
      studentLang: counselingStudentLang,
      topic: counselingTopic,
      scheduledAt: activeCounselingRecord?.scheduledAt || new Date().toLocaleString(),
      createdAt: activeCounselingRecord?.createdAt || new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }),
      status: 'completed',
      utterances: counselingUtterances,
      summary,
    };

    await saveCounselingRecord(recordToSave);

    setIsCounselingSessionActive(false);
    setCurrentView('counseling');
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
    if (lang === 'ko') {
      setShowSubtitles(false);
    } else {
      setShowSubtitles(true);
    }
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
    const finalPdfName = week.pdfFileName || (week.googleDriveUrl ? `${week.week}주차_강의안.pdf` : '');
    setActiveCourseId(course.id);
    setActiveCourseTitle(course.title);
    setActiveWeekNum(week.week);
    setActiveTopic(week.topic);
    setActiveGoogleDriveUrl(week.googleDriveUrl || '');
    setPdfFileName(finalPdfName);
    setPdfDataUrl(null); // Clear manual upload on entering a new week
    setCurrentPage(1);
    setCurrentView('lecture');
    setIsScheduleOpen(false);
    setIsClassroomActive(true);

    // Broadcast live classroom active status to student screens
    sendRealtimeEvent('CLASSROOM_STATUS', {
      isActive: true,
      courseTitle: course.title,
      weekNum: week.week,
      topic: week.topic,
      pdfFileName: finalPdfName,
      activeGoogleDriveUrl: week.googleDriveUrl || '',
      currentPage: 1,
    });

    // Auto set translation target language pre-configured for this week
    const targetLang = week.targetLanguage || 'en';
    setTargetLanguage(targetLang);

    // If targetLang is 'ko', close subtitles and expand PDF viewer, otherwise show subtitles
    if (targetLang === 'ko') {
      setShowSubtitles(false);
    } else {
      setShowSubtitles(true);
    }

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'PDF_FILE_CHANGE',
          payload: {
            pdfFileName: finalPdfName,
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
      setIsClassroomActive(false);
      sendRealtimeEvent('CLASSROOM_STATUS', { isActive: false });
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
      const isMatch =
        (c.id && activeCourseId && c.id === activeCourseId) ||
        (currentCourse && c.id === currentCourse.id) ||
        c.title === activeCourseTitle;
      if (!isMatch) return c;
      return {
        ...c,
        schedules: c.schedules.map((w) => {
          if (w.week !== activeWeekNum) return w;
          const existingIds = w.attendanceStudentIds || [];
          const combinedAttendance = Array.from(new Set([...existingIds, ...attendedStudentIds]));
          targetWeek = {
            ...w,
            hasSavedTranscript: saveTranscript || w.hasSavedTranscript,
            hasSavedAiSummary: saveAiSummary || w.hasSavedAiSummary,
            transcriptText: saveTranscript ? transcriptText : w.transcriptText,
            aiSummaryText: saveAiSummary ? aiSummaryText : w.aiSummaryText,
            attendanceStudentIds: combinedAttendance,
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

    // Clear live subtitles for clean next session
    setSubtitles([]);

    setIsLectureEndModalOpen(false);
    setCurrentView('dashboard');
    setIsScheduleOpen(false);
    setIsClassroomActive(false);
    sendRealtimeEvent('CLASSROOM_STATUS', { isActive: false });
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
    fileName?: string,
    initialSlideIndex: number = 0,
    reports?: ReportItem[],
    reportTitle?: string,
    reportUrl?: string
  ) => {
    const targetCourseTitle = courseTitle || activeCourseTitle;
    const matchedCourse = courses.find((c) => c.title === targetCourseTitle);

    const data = {
      courseTitle: targetCourseTitle,
      courseId: matchedCourse?.id || activeCourseId || 'course-1',
      weekNumber: weekNumber || activeWeekNum,
      topic: topic || activeTopic,
      googleDriveUrl: googleDriveUrl || activeGoogleDriveUrl,
      pdfFileName: fileName || pdfFileName || '강의교재.pdf',
      reports: reports !== undefined ? reports : (matchedCourse?.reports || currentCourse?.reports || []),
      reportTitle: reportTitle !== undefined ? reportTitle : (matchedCourse?.reportTitle || currentCourse?.reportTitle || ''),
      reportUrl: reportUrl !== undefined ? reportUrl : (matchedCourse?.reportUrl || currentCourse?.reportUrl || ''),
    };
    setQrModalData(data);
    setQrModalIndex(initialSlideIndex);
    setIsQrCodeOpen(true);

    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'QR_CODE_SYNC',
          payload: { isOpen: true, data, currentIndex: initialSlideIndex },
        });
      } catch (err) {}
    }
  };

  const handleQrIndexChange = (newIndex: number) => {
    setQrModalIndex(newIndex);
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'QR_CODE_SYNC',
          payload: { isOpen: true, currentIndex: newIndex },
        });
      } catch (err) {}
    }
  };

  const handleCloseQrModal = () => {
    setIsQrCodeOpen(false);
    setIsReportQrModalOpen(false);
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'QR_CODE_SYNC',
          payload: { isOpen: false },
        });
      } catch (err) {}
    }
  };

  const handleOpenPopoutWindow = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsQrCodeOpen(false);
    setIsReportQrModalOpen(false);
    window.open(`${window.location.origin}${window.location.pathname}?popout=true`, 'ProjectorPopout', 'width=1280,height=800');
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

  // If projector popout mode (opened by professor for dual-monitor classroom projector)
  if (isPopoutMode) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          background: 'var(--bg-primary, #0f172a)',
          padding: '12px 16px',
          gap: '12px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Projector Popout Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
            borderRadius: '14px',
            padding: '10px 18px',
            color: '#ffffff',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 800, color: '#8b5cf6', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
              {activeCourseTitle} <span style={{ color: '#8b5cf6' }}>({activeWeekNum}주차)</span>
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
            <span style={{ color: '#cbd5e1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Pin size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
              {activeTopic}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                padding: '4px 12px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📺 강의실 프로젝터 화면
            </span>
          </div>
        </div>

        {/* Live Presentation View (PDF + Subtitles / Q&A) */}
        <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
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
                  isStudentMode={true}
                />
              )}
            </div>
          )}
        </div>

        {/* QR Overlay Modal inside Popout Window when synced */}
        {isQrCodeOpen && qrModalData && (
          <UnifiedQrModal
            isOpen={isQrCodeOpen}
            onClose={handleCloseQrModal}
            courseTitle={qrModalData.courseTitle}
            weekNumber={qrModalData.weekNumber}
            topic={qrModalData.topic}
            googleDriveUrl={qrModalData.googleDriveUrl}
            pdfFileName={qrModalData.pdfFileName}
            currentIndex={qrModalIndex}
            onIndexChange={handleQrIndexChange}
            reports={qrModalData.reports}
            reportTitle={qrModalData.reportTitle}
            reportUrl={qrModalData.reportUrl}
          />
        )}
      </div>
    );
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
          background: 'var(--bg-primary, #0f172a)',
          padding: '12px 16px',
          gap: '12px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <StudentAuthModal
          isOpen={isStudentAuthOpen}
          courseTitle={activeCourseTitle}
          weekNum={activeWeekNum}
          topic={activeTopic}
          onSubmit={handleStudentAuthSubmit}
        />

        {/* Student Status Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
            borderRadius: '14px',
            padding: '10px 18px',
            color: '#ffffff',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 800, color: '#8b5cf6', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
              {activeCourseTitle} <span style={{ color: '#8b5cf6' }}>({activeWeekNum}주차)</span>
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
            <span style={{ color: '#cbd5e1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Pin size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
              {activeTopic}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {studentId ? (
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10b981',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '12px',
                  letterSpacing: '0.03em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                👤 출석 등록 학번: {studentId}
              </span>
            ) : isLectureEnded ? (
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  padding: '5px 14px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🛑 출석 체크 마감
              </span>
            ) : !isClassroomActive ? null : (
              <button
                onClick={() => setIsStudentAuthOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                }}
              >
                🔑 학번 입력하고 출석하기
              </button>
            )}
          </div>
        </div>

        {!isClassroomActive ? (
          /* Student Waiting Room View (Simple, Modern & Clean Card Layout) */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'calc(100% - 56px)',
              background: '#0f172a',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                maxWidth: '500px',
                width: '100%',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '36px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '18px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Simple Status Icon with Breathing Pulse Animation */}
              <div
                className={!isLectureEnded ? 'waiting-clock-icon' : ''}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: isLectureEnded ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                  border: isLectureEnded ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={28} color={isLectureEnded ? '#ef4444' : '#38bdf8'} />
              </div>

              {/* Title & Course Info */}
              <div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isLectureEnded ? '#ef4444' : '#38bdf8',
                    letterSpacing: '0.04em',
                  }}
                >
                  {isLectureEnded ? '강의 종료' : '수업 대기 중'}
                </span>

                <h2
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#ffffff',
                    marginTop: '8px',
                    marginBottom: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {activeCourseTitle} ({activeWeekNum}주차)
                </h2>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '1px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  margin: '2px 0',
                }}
              />

              {/* Subtitle Information Text */}
              <p
                style={{
                  fontSize: '14px',
                  color: '#cbd5e1',
                  margin: 0,
                  lineHeight: 1.6,
                  fontWeight: 400,
                }}
              >
                {isLectureEnded ? (
                  <>
                    해당 주차의 강의가 종료되어 출석 체크가 마감되었습니다.
                    <br />
                    수업에 참여해 주셔서 감사합니다.
                  </>
                ) : (
                  <>
                    강의가 시작되면, 학번 입력 후
                    <br />
                    강의 자막 화면으로 <strong>자동 전환</strong>됩니다.
                  </>
                )}
              </p>

              {/* Live Connection Status Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: isLectureEnded ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: isLectureEnded ? '#ef4444' : '#10b981',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isLectureEnded ? '#ef4444' : '#10b981',
                  }}
                />
                {isLectureEnded ? '출석 마감됨' : '실시간 연결 대기 중'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', gap: '16px', height: 'calc(100% - 56px)' }}>
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
                    isStudentMode={true}
                  />
                )}
              </div>
            )}
          </div>
        )}
        {/* QR Code Share Modal for Student Popout (Hidden during waiting room or student ID auth) */}
        <UnifiedQrModal
          isOpen={isQrCodeOpen && isClassroomActive && !isStudentAuthOpen}
          onClose={handleCloseQrModal}
          courseTitle={qrModalData.courseTitle}
          courseId={qrModalData.courseId}
          weekNumber={qrModalData.weekNumber}
          topic={qrModalData.topic}
          googleDriveUrl={qrModalData.googleDriveUrl}
          pdfFileName={qrModalData.pdfFileName}
          currentIndex={qrModalIndex}
          onIndexChange={handleQrIndexChange}
        />
      </div>
    );
  }

  // Primary Screen: Active 1:1 Counseling Live Session View
  if (isCounselingSessionActive) {
    return (
      <CounselingSessionView
        studentId={counselingStudentId}
        studentLang={counselingStudentLang}
        topic={counselingTopic}
        utterances={counselingUtterances}
        professorInterim={counselingProfInterim}
        studentInterim={counselingStudentInterim}
        isListening={isCounselingListening}
        onToggleListening={handleToggleCounselingListening}
        onEndSession={handleEndCounselingSession}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
    );
  }

  // Primary Screen: 1:1 Counseling Center Main Page View
  if (currentView === 'counseling') {
    return (
      <CounselingDashboardView
        semesters={semesters}
        activeSemesterId={activeSemesterId}
        onSemesterChange={setActiveSemesterId}
        onStartSession={handleStartCounselingSession}
        onExitToLounge={() => setCurrentView('dashboard')}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
    );
  }

  // Primary Screen 1: Dashboard Lounge View after password authentication
  if (currentView === 'dashboard') {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <ScheduleDashboardModal
          isOpen={true}
          isLoungeView={true}
          courses={courses}
          onCoursesChange={setCourses}
          semesters={semesters}
          onSemestersChange={setSemesters}
          activeSemesterId={activeSemesterId}
          onSemesterChange={setActiveSemesterId}
          onSelectLecture={handleSelectLecture}
          onOpenQrCode={(cTitle, wNum, top, dUrl, fName, reps, rTitle, rUrl) => {
            handleOpenQrModal(cTitle, wNum, top, dUrl, fName, 0, reps, rTitle, rUrl);
          }}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onOpenCounselingRoom={() => setCurrentView('counseling')}
        />

        {/* QR Code Share Modal */}
        <UnifiedQrModal
          isOpen={isQrCodeOpen}
          onClose={handleCloseQrModal}
          courseTitle={qrModalData.courseTitle}
          weekNumber={qrModalData.weekNumber}
          topic={qrModalData.topic}
          googleDriveUrl={qrModalData.googleDriveUrl}
          pdfFileName={qrModalData.pdfFileName}
          reports={qrModalData.reports}
          reportTitle={qrModalData.reportTitle}
          reportUrl={qrModalData.reportUrl}
          currentIndex={qrModalIndex}
          onIndexChange={handleQrIndexChange}
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
        onOpenReportQrCode={(report) => {
          if (report) setSelectedReportId(report.id);
          setIsReportQrModalOpen(true);
        }}
        reports={currentCourse?.reports}
        reportTitle={currentCourse?.reportTitle}
        reportUrl={currentCourse?.reportUrl}
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
        courses={courses}
        onCoursesChange={setCourses}
        onSelectLecture={handleSelectLecture}
        onOpenQrCode={(cTitle, wNum, top, dUrl, fName, reps, rTitle, rUrl) => {
          handleOpenQrModal(cTitle, wNum, top, dUrl, fName, 0, reps, rTitle, rUrl);
        }}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* Unified QR Code Share Modal (Student Viewer + PDF + Reports Carousel) */}
      <UnifiedQrModal
        isOpen={isQrCodeOpen || isReportQrModalOpen}
        onClose={handleCloseQrModal}
        courseTitle={qrModalData.courseTitle || currentCourse?.title || activeCourseTitle}
        courseId={qrModalData.courseId || currentCourse?.id || activeCourseId}
        weekNumber={qrModalData.weekNumber || activeWeekNum}
        topic={qrModalData.topic || activeTopic}
        googleDriveUrl={qrModalData.googleDriveUrl || activeGoogleDriveUrl}
        pdfFileName={qrModalData.pdfFileName}
        reports={qrModalData.reports?.length ? qrModalData.reports : currentCourse?.reports}
        reportTitle={qrModalData.reportTitle || currentCourse?.reportTitle}
        reportUrl={qrModalData.reportUrl || currentCourse?.reportUrl}
        currentIndex={qrModalIndex}
        onIndexChange={handleQrIndexChange}
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

