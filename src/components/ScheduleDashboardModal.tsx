import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  BookOpen,
  PlayCircle,
  Link,
  QrCode,
  Edit3,
  CheckCircle2,
  Clock,
  Search,
  PlusCircle,
  Trash2,
  Settings,
  Archive,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  FileText,
  Sun,
  Moon,
  School,
  LogOut,
  Coffee,
  Mic,
} from 'lucide-react';
import { SEMESTER_COURSES, CourseSchedule, WeekSchedule, Semester, ReportItem } from '../data/scheduleData';
import { parseGoogleDriveUrl } from '../utils/googleDrive';
import { WeekEditModal } from './WeekEditModal';
import { SemesterCreateModal } from './SemesterCreateModal';
import { CourseEditModal } from './CourseEditModal';
import { CourseDeleteModal } from './CourseDeleteModal';
import { UnifiedQrModal } from './UnifiedQrModal';
import {
  loadCourseSchedules,
  saveWeekSchedule,
  loadSemesters,
  saveSemesters,
  saveCourseList,
  deleteCourse,
} from '../services/scheduleService';
import { TARGET_LANGUAGES } from '../services/translationService';

interface ScheduleDashboardModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSelectLecture: (course: CourseSchedule, week: WeekSchedule) => void;
  onOpenQrCode: (
    courseTitle: string,
    weekNumber: number,
    topic: string,
    googleDriveUrl?: string,
    pdfFileName?: string,
    reports?: ReportItem[],
    reportTitle?: string,
    reportUrl?: string
  ) => void;
  isLoungeView?: boolean;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  courses?: CourseSchedule[];
  onCoursesChange?: (courses: CourseSchedule[]) => void;
}

export const ScheduleDashboardModal: React.FC<ScheduleDashboardModalProps> = ({
  isOpen,
  onClose,
  onSelectLecture,
  onOpenQrCode,
  isLoungeView = false,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  courses: externalCourses,
  onCoursesChange,
}) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<string>('sem-2026-2');
  const [internalCourses, setInternalCourses] = useState<CourseSchedule[]>(SEMESTER_COURSES);
  const courses = externalCourses && externalCourses.length > 0 ? externalCourses : internalCourses;

  const setCourses = (newCourses: CourseSchedule[] | ((prev: CourseSchedule[]) => CourseSchedule[])) => {
    const updated = typeof newCourses === 'function' ? newCourses(courses) : newCourses;
    setInternalCourses(updated);
    if (onCoursesChange) {
      onCoursesChange(updated);
    }
  };

  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [editingSchedule, setEditingSchedule] = useState<WeekSchedule | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showTrashView, setShowTrashView] = useState<boolean>(false);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  // Modals
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState<boolean>(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [isReportQrModalOpen, setIsReportQrModalOpen] = useState<boolean>(false);
  const [selectedReportId, setSelectedReportId] = useState<string | undefined>(undefined);
  const [courseToEdit, setCourseToEdit] = useState<CourseSchedule | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<CourseSchedule | null>(null);

  // Load semesters & courses from DB / local storage on mount
  useEffect(() => {
    if (isOpen) {
      loadSemesters().then((loadedSems) => {
        setSemesters(loadedSems);
        if (loadedSems.length > 0) {
          setActiveSemesterId((prev) => prev || loadedSems[0].id);
        }
      });

      loadCourseSchedules().then((data) => {
        setCourses(data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Active (non-deleted) courses for current semester
  const safeCourses = Array.isArray(courses) && courses.length > 0 ? courses : SEMESTER_COURSES;
  const activeSemesterCourses = safeCourses.filter(
    (c) => (c.semesterId || 'sem-2026-2') === activeSemesterId && !c.isDeleted
  );

  // Deleted courses (Trash)
  const trashedCourses = safeCourses.filter((c) => c.isDeleted);

  const currentCourse =
    activeSemesterCourses.find((c) => c.id === activeCourseId) || activeSemesterCourses[0] || null;

  // Handler for creating a new semester
  const handleCreateSemester = (newSem: Semester) => {
    const nextSemesters = [newSem, ...semesters];
    setSemesters(nextSemesters);
    saveSemesters(nextSemesters);
    setActiveSemesterId(newSem.id);

    // Automatically create a default course template for the new semester
    const defaultCourse: CourseSchedule = {
      id: `course-${Date.now()}`,
      semesterId: newSem.id,
      title: `${newSem.name} 신규 과목`,
      code: '인317-1',
      credits: 3,
      classroom: '인317-1',
      section: '분반 101',
      timeSlot: '월 5~7교시',
      color: '#3b82f6',
      schedules: Array.from({ length: 15 }, (_, i) => ({
        week: i + 1,
        date: `2027.03.${(i + 1).toString().padStart(2, '0')}`,
        topic: `${i + 1}주차 강의 주제 미등록`,
        pdfFileName: '',
        googleDriveUrl: '',
        targetLanguage: 'en',
      })),
    };

    const nextCourses = [...courses, defaultCourse];
    setCourses(nextCourses);
    saveCourseList(nextCourses);
    setActiveCourseId(defaultCourse.id);
  };

  // Handler for creating/updating a course
  const handleSaveCourse = (savedCourse: CourseSchedule) => {
    const exists = courses.some((c) => c.id === savedCourse.id);
    let nextCourses: CourseSchedule[];
    if (exists) {
      nextCourses = courses.map((c) => {
        if (c.id === savedCourse.id) {
          return {
            ...c, // Preserve all existing course properties including 1-15 week schedules
            title: savedCourse.title,
            language: savedCourse.language,
            section: savedCourse.section,
            classroom: savedCourse.classroom,
            credits: savedCourse.credits,
            timeSlot: savedCourse.timeSlot,
            color: savedCourse.color,
            reports: savedCourse.reports,
            reportTitle: savedCourse.reportTitle,
            reportUrl: savedCourse.reportUrl,
            // Guarantee 100% preservation of all 15 week schedules (Google Drive URLs, topics, pdfFileNames)
            schedules: c.schedules && c.schedules.length > 0 ? c.schedules : savedCourse.schedules,
          };
        }
        return c;
      });
    } else {
      nextCourses = [...courses, savedCourse];
    }
    setCourses(nextCourses);
    saveCourseList(nextCourses);
    setActiveCourseId(savedCourse.id);
  };

  // Step 1: Move Course to Trash (Soft Delete)
  const handleMoveToTrash = (courseId: string) => {
    const nextCourses = courses.map((c) => {
      if (c.id === courseId) {
        return { ...c, isDeleted: true, deletedAt: new Date().toISOString() };
      }
      return c;
    });

    setCourses(nextCourses);
    saveCourseList(nextCourses);

    const remaining = nextCourses.filter(
      (c) => (c.semesterId || 'sem-2026-2') === activeSemesterId && !c.isDeleted
    );
    if (remaining.length > 0) {
      setActiveCourseId(remaining[0].id);
    }
  };

  // Step 2: Restore Course from Trash
  const handleRestoreCourse = (courseId: string) => {
    const nextCourses = courses.map((c) => {
      if (c.id === courseId) {
        return { ...c, isDeleted: false, deletedAt: undefined };
      }
      return c;
    });

    setCourses(nextCourses);
    saveCourseList(nextCourses);
    setActiveCourseId(courseId);
    setShowTrashView(false);
  };

  // Step 2 Permanent Delete (Hard Delete)
  const handlePermanentDelete = (course: CourseSchedule) => {
    if (
      !window.confirm(
        `🚨 경고: "${course.title}" 과목을 완전히 삭제하시겠습니까?\n등록된 15주차 강의 스케줄 및 구글 드라이브 교재 설정이 영구적으로 파기되어 복구할 수 없습니다.`
      )
    ) {
      return;
    }

    const nextCourses = courses.filter((c) => c.id !== course.id);
    setCourses(nextCourses);
    saveCourseList(nextCourses);
    deleteCourse(course.id);
  };

  const handleSaveWeek = async (updatedWeek: WeekSchedule) => {
    if (!currentCourse) return;
    const nextCourses = await saveWeekSchedule(currentCourse.id, updatedWeek, courses);
    setCourses(nextCourses);
  };

  const filteredSchedules = (currentCourse?.schedules || []).filter(
    (w) =>
      (w.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.date || '').includes(searchQuery) ||
      `주차 ${w.week || ''}`.includes(searchQuery)
  );

  return (
    <div
      style={
        isLoungeView
          ? {
              width: '100vw',
              height: '100vh',
              background: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }
          : {
              position: 'fixed',
              inset: 0,
              zIndex: 9990,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              padding: '24px',
            }
      }
      onClick={isLoungeView ? undefined : onClose}
    >
      <div
        style={
          isLoungeView
            ? {
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }
            : {
                width: '100%',
                maxWidth: '1140px',
                maxHeight: '92vh',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out',
              }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isLoungeView ? '16px 32px' : '20px 28px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px var(--accent-glow)',
              }}
            >
              <Mic size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
                  강의교재관리/번역자막시스템
                </h2>
                {/* Semester Selector Dropdown */}
                <select
                  value={activeSemesterId}
                  onChange={(e) => {
                    setActiveSemesterId(e.target.value);
                    setShowTrashView(false);
                  }}
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--accent-color)',
                    fontSize: '13px',
                    fontWeight: 800,
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      📅 {sem.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsSemesterModalOpen(true)}
                  title="신규 연도/학기 개설"
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    boxSizing: 'border-box',
                  }}
                >
                  <PlusCircle size={13} /> 새 학기 개설
                </button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                각 주차별로 강의 교재가 등록되어 있는지 확인하고 [강의실 입장] 버튼을 눌러 강의를 시작하세요.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Trash View Toggle Button */}
            <button
              onClick={() => setShowTrashView(!showTrashView)}
              title="삭제 대기 과목 휴지통 확인 및 복구"
              style={{
                background: showTrashView ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-hover)',
                border: showTrashView ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                color: showTrashView ? '#ef4444' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Archive size={15} /> 휴지통 ({trashedCourses.length})
            </button>

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title="다크 / 라이트 모드 전환"
                style={{
                  height: '38px',
                  width: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            )}

            {isLoungeView ? (
              onLogout && (
                <button
                  onClick={onLogout}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <LogOut size={14} /> 로그아웃
                </button>
              )
            ) : (
              onClose && (
                <button
                  onClick={onClose}
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <X size={18} /> 닫기
                </button>
              )
            )}
          </div>
        </div>

        {/* Course Switcher Tabs & Search Filter */}
        {!showTrashView ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 28px',
              background: 'var(--bg-card)',
              borderBottom: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {activeSemesterCourses.map((course) => {
                const isActive = currentCourse && course.id === currentCourse.id;
                const displayLang =
                  course.language ||
                  (course.title?.includes('영어')
                    ? '영어'
                    : course.title?.includes('한국어')
                    ? '한국어'
                    : '한국어');

                return (
                  <button
                    key={course.id}
                    onClick={() => {
                      setActiveCourseId(course.id);
                    }}
                    style={{
                      padding: isActive ? '12px 22px' : '9px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? course.color : 'var(--bg-hover)',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: isActive ? 800 : 500,
                      fontSize: isActive ? '15px' : '13px',
                      cursor: 'pointer',
                      border: isActive ? `2px solid ${course.color}` : '1px solid var(--border-color)',
                      boxShadow: isActive ? `0 6px 16px ${course.color}45` : 'none',
                      transform: isActive ? 'scale(1.04)' : 'scale(1)',
                      zIndex: isActive ? 2 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <BookOpen size={isActive ? 18 : 15} color={isActive ? '#ffffff' : 'var(--text-muted)'} />
                    {course.title}
                    <span
                      className={isActive ? 'active-language-badge' : ''}
                      style={{
                        fontSize: isActive ? '12px' : '11px',
                        fontWeight: isActive ? 800 : 600,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: isActive ? '#ffffff' : 'var(--bg-secondary)',
                        color: isActive ? '#0f172a' : 'var(--text-muted)',
                        letterSpacing: '-0.01em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {isActive && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: course.color || '#8b5cf6',
                            display: 'inline-block',
                          }}
                        />
                      )}
                      {displayLang}
                    </span>
                  </button>
                );
              })}

              {/* Add Course Button */}
              <button
                onClick={() => {
                  setCourseToEdit(null);
                  setIsCourseModalOpen(true);
                }}
                style={{
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  border: '1px dashed var(--accent-color)',
                  color: 'var(--accent-color)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <PlusCircle size={15} /> 과목 추가
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="주차 또는 강의 주제 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        ) : (
          /* Trash Header Banner */
          <div
            style={{
              padding: '16px 28px',
              background: 'rgba(239, 68, 68, 0.08)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Archive size={20} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ef4444' }}>
                🗑️ 휴지통 (삭제 대기 목록) &bull; 총 {trashedCourses.length}개 과목
              </h3>
            </div>
            <button
              onClick={() => setShowTrashView(false)}
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⬅️ 일반 과목 목록으로 돌아가기
            </button>
          </div>
        )}

        {/* Current Active Course Meta Info Banner (Normal View) */}
        {!showTrashView && currentCourse && (
          <div
            style={{
              padding: '14px 28px',
              background: `linear-gradient(135deg, ${currentCourse.color} 0%, ${currentCourse.color}ee 100%)`,
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: `0 4px 14px ${currentCourse.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '14px',
              color: '#ffffff',
              fontWeight: 600,
              flexWrap: 'wrap',
              gap: '12px',
              transition: 'background 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
                📍 <strong>강의실:</strong> {currentCourse.classroom} ({currentCourse.section})
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
                🌐 <strong>강의언어:</strong> {currentCourse.language || (currentCourse.title?.includes('영어') ? '영어' : '한국어')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
                🎓 <strong>학점:</strong> {currentCourse.credits}학점
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
                ⏰ <strong>수업시간:</strong> {currentCourse.timeSlot}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {(() => {
                const activeReports =
                  currentCourse.reports && currentCourse.reports.length > 0
                    ? currentCourse.reports.filter((r) => r.url && r.url.trim())
                    : currentCourse.reportUrl
                    ? [{ id: '1', title: currentCourse.reportTitle || '리포트 제출', url: currentCourse.reportUrl }]
                    : [];

                return activeReports.map((r, idx) => {
                  const displayTitle = r.title || `과제 ${idx + 1}`;
                  const formattedText = displayTitle.endsWith('QR') ? displayTitle : `${displayTitle} QR`;
                  return (
                    <button
                      key={r.id || idx}
                      onClick={() => {
                        setSelectedReportId(r.id);
                        setIsReportQrModalOpen(true);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.28)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <QrCode size={14} color="#ffffff" /> {formattedText}
                    </button>
                  );
                });
              })()}
              <button
                onClick={() => {
                  setCourseToEdit(currentCourse);
                  setIsCourseModalOpen(true);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Edit3 size={13} color="#ffffff" /> 과목 정보 수정
              </button>
              <button
                onClick={() => {
                  if (activeSemesterCourses.length <= 1) {
                    alert('⚠️ 최소 1개 이상의 과목이 존재해야 합니다.');
                    return;
                  }
                  setCourseToDelete(currentCourse);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Trash2 size={13} color="#ffffff" /> 과목 삭제
              </button>
            </div>
          </div>
        )}

        {/* View Mode: Trash View vs Normal Schedules View */}
        {showTrashView ? (
          /* TRASH VIEW: List of deleted courses */
          <div
            style={{
              flex: 1,
              padding: '24px 28px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'var(--bg-primary)',
            }}
          >
            {trashedCourses.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                }}
              >
                🗑️ 휴지통에 보관된 삭제 대기 과목이 없습니다.
              </div>
            ) : (
              trashedCourses.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px dashed rgba(239, 68, 68, 0.4)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: `${c.color}20`,
                          color: c.color,
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {c.section}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{c.title}</h4>
                      <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                        ⚠️ 삭제 대기 중 ({c.deletedAt ? new Date(c.deletedAt).toLocaleDateString() : '휴지통 보관'})
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      📍 {c.classroom} &bull; {c.credits}학점 &bull; {c.timeSlot} &bull; 15주차 강의 데이터 보관됨
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleRestoreCourse(c.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#10b981',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <RefreshCw size={14} /> 과목 복구
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(c)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trash2 size={14} /> 영구 삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : !currentCourse ? (
          /* Empty State when no course exists in the selected semester */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              background: 'var(--bg-primary)',
              color: 'var(--text-muted)',
              gap: '12px',
            }}
          >
            <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              개설된 과목이 없습니다.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              상단의 [과목 추가] 버튼을 눌러 새 과목을 개설하고 강의를 준비해 보세요.
            </div>
          </div>
        ) : (
          /* NORMAL VIEW: Schedules Cards Grid Container */
          <div
            style={{
              flex: 1,
              padding: '24px 28px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '16px',
              background: 'var(--bg-primary)',
            }}
          >
            {filteredSchedules.map((schedule) => {
              const parsedDrive = parseGoogleDriveUrl(schedule.googleDriveUrl || '');
              const isHovered = hoveredWeek === schedule.week;
              const hasDriveLink = Boolean(schedule.googleDriveUrl && schedule.googleDriveUrl.trim() !== '');
              const isUnregistered = !hasDriveLink;
              const themeColor = currentCourse?.color || 'var(--accent-color)';

              return (
                <div
                  key={schedule.week}
                  onMouseEnter={() => setHoveredWeek(schedule.week)}
                  onMouseLeave={() => setHoveredWeek(null)}
                  style={{
                    background: isHovered
                      ? `linear-gradient(180deg, var(--bg-card) 0%, ${
                          theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(226, 232, 240, 0.9)'
                        } 100%)`
                      : 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: isHovered
                      ? `2px solid ${themeColor}`
                      : isUnregistered
                      ? '1px dashed var(--border-color)'
                      : '1px solid var(--border-color)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: isHovered
                      ? `0 16px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${themeColor}44`
                      : '0 4px 12px rgba(0,0,0,0.15)',
                    transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                    position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* Top Badge & Date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: currentCourse?.color || 'var(--accent-color)',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {schedule.week}주차
                      </span>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                        title="실시간 자막 번역 언어"
                      >
                        {(() => {
                          const langObj = TARGET_LANGUAGES.find((l) => l.code === schedule.targetLanguage);
                          return langObj ? `${langObj.flag} ${langObj.name}` : '🇺🇸 영어';
                        })()}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {schedule.date}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingSchedule(schedule)}
                      style={{
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Edit3 size={13} /> 수정
                    </button>
                  </div>

                  {/* Lecture Topic */}
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      margin: 0,
                      color: isUnregistered ? 'var(--text-muted)' : 'var(--text-primary)',
                      lineHeight: 1.4,
                      minHeight: '40px',
                    }}
                  >
                    {schedule.topic}
                  </h4>

                  {/* Registered PDF Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: hasDriveLink
                        ? `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}ee 100%)`
                        : 'var(--bg-secondary)',
                      border: hasDriveLink ? `1.5px solid ${themeColor}` : '1px dashed #cbd5e1',
                      fontSize: '12px',
                      fontWeight: hasDriveLink ? 700 : 500,
                      boxShadow: hasDriveLink ? `0 4px 12px ${themeColor}40` : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Link size={14} color={hasDriveLink ? '#ffffff' : 'var(--text-muted)'} />
                    <span
                      style={{
                        color: hasDriveLink ? '#ffffff' : 'var(--text-muted)',
                        fontWeight: hasDriveLink ? 700 : 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '220px',
                        letterSpacing: hasDriveLink ? '-0.01em' : 'normal',
                      }}
                    >
                      {schedule.pdfFileName || (hasDriveLink ? `${schedule.week}주차 강의교재` : '교재 링크 미등록')}
                    </span>
                  </div>

                  {/* Saved Transcript & AI Summary Buttons */}
                  {(schedule.hasSavedTranscript || schedule.hasSavedAiSummary) && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
                      {schedule.hasSavedTranscript && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const content = schedule.transcriptText || '강의 자막 기록이 없습니다.';
                            const dateStr = schedule.date ? schedule.date.replace(/\./g, '-') : '날짜미지정';
                            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${dateStr}_${schedule.week}주차_강의자막록.txt`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: '#475569',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                          }}
                        >
                          <FileText size={12} color="#cbd5e1" /> 📜 강의록 다운로드
                        </button>
                      )}
                      {schedule.hasSavedAiSummary && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const content = schedule.aiSummaryText || 'AI 요약 데이터가 없습니다.';
                            const dateStr = schedule.date ? schedule.date.replace(/\./g, '-') : '날짜미지정';
                            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${dateStr}_${schedule.week}주차_AI강의요약본.txt`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: '#475569',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                          }}
                        >
                          <Sparkles size={12} color="#cbd5e1" /> 🤖 AI 요약본 다운로드
                        </button>
                      )}
                    </div>
                  )}

                  {/* Action Buttons: Room Entry & QR Code Modal */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
                    <button
                      onClick={() => {
                        if (currentCourse) {
                          onSelectLecture(currentCourse, schedule);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '9px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--accent-gradient)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px var(--accent-glow)',
                      }}
                    >
                      <PlayCircle size={16} /> 강의실 입장
                    </button>
                    <button
                      onClick={() => {
                        if (currentCourse) {
                          onOpenQrCode(
                            currentCourse.title,
                            schedule.week,
                            schedule.topic,
                            schedule.googleDriveUrl,
                            schedule.pdfFileName,
                            currentCourse.reports,
                            currentCourse.reportTitle,
                            currentCourse.reportUrl
                          );
                        }
                      }}
                      title="학생 교재 및 리포트 QR 코드 공유"
                      style={{
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <QrCode size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Week Schedule Edit Modal */}
      {editingSchedule && (
        <WeekEditModal
          isOpen={Boolean(editingSchedule)}
          schedule={editingSchedule}
          courseTitle={currentCourse?.title || ''}
          onClose={() => setEditingSchedule(null)}
          onSave={handleSaveWeek}
        />
      )}

      {/* Semester Creation Modal */}
      <SemesterCreateModal
        isOpen={isSemesterModalOpen}
        onClose={() => setIsSemesterModalOpen(false)}
        onCreateSemester={handleCreateSemester}
      />

      {/* Course Edit/Create Modal */}
      <CourseEditModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        semesterId={activeSemesterId}
        courseToEdit={courseToEdit}
        onSaveCourse={handleSaveCourse}
      />

      {/* Step 1 Safe Course Delete Modal */}
      <CourseDeleteModal
        isOpen={Boolean(courseToDelete)}
        course={courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onMoveToTrash={handleMoveToTrash}
      />

      {/* Google Form Report Submission QR Code Modal (Lounge View: Report QR only) */}
      <UnifiedQrModal
        isOpen={isReportQrModalOpen}
        onClose={() => setIsReportQrModalOpen(false)}
        courseTitle={currentCourse?.title || ''}
        reports={currentCourse?.reports}
        reportTitle={currentCourse?.reportTitle}
        reportUrl={currentCourse?.reportUrl}
        hidePdfSlide={true}
        initialIndex={
          selectedReportId && currentCourse?.reports
            ? Math.max(0, currentCourse.reports.findIndex((r) => r.id === selectedReportId))
            : 0
        }
      />
    </div>
  );
};
