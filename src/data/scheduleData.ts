export interface WeekSchedule {
  week: number;
  date: string;
  topic: string;
  pdfFileName?: string;
  googleDriveUrl?: string;
  targetLanguage?: string; // 'en', 'zh', 'ja', 'vi'
  isCompleted?: boolean;
  hasSavedTranscript?: boolean;
  hasSavedAiSummary?: boolean;
  transcriptText?: string;
  aiSummaryText?: string;
  savedAt?: string;
}

export interface Semester {
  id: string;
  year: number;
  term: string; // e.g. '1학기', '2학기', '여름학기', '겨울학기'
  name: string; // e.g. '2026년 2학기'
  isCurrent?: boolean;
}

export interface ReportItem {
  id: string;
  title: string;
  url: string;
}

export interface CourseSchedule {
  id: string;
  semesterId: string; // Link to Semester
  title: string;
  code: string;
  credits: number;
  classroom: string;
  section: string;
  timeSlot: string;
  color: string;
  reportTitle?: string; // Legacy fallback e.g. '중간고사 리포트 제출'
  reportUrl?: string;   // Legacy fallback Google Forms URL
  reports?: ReportItem[]; // Up to 3 report submission links per course
  schedules: WeekSchedule[];
  isDeleted?: boolean;
  deletedAt?: string;
}

export const DEFAULT_SEMESTERS: Semester[] = [
  { id: 'sem-2026-2', year: 2026, term: '2학기', name: '2026년 2학기', isCurrent: true },
  { id: 'sem-2026-1', year: 2026, term: '1학기', name: '2026년 1학기' },
];

export const SEMESTER_COURSES: CourseSchedule[] = [
  {
    id: 'ai-content',
    semesterId: 'sem-2026-2',
    title: '관광 AI 콘텐츠 제작 실무',
    code: '인317-1',
    credits: 3,
    classroom: '인317-1',
    section: '분반 103',
    timeSlot: '월 5~7교시 (13:30~16:20) / 수 1교시 / 목 6~7교시',
    color: '#8b5cf6', // Vibrant Purple
    schedules: Array.from({ length: 15 }, (_, i) => ({
      week: i + 1,
      date: `2026.09.${(i + 1).toString().padStart(2, '0')}`,
      topic: `${i + 1}주차 강의 주제 미등록`,
      pdfFileName: '',
      googleDriveUrl: '',
    })),
  },
  {
    id: 'travel-tech',
    semesterId: 'sem-2026-2',
    title: '트래블테크의 이해',
    code: '인317-1',
    credits: 3,
    classroom: '인317-1',
    section: '분반 101',
    timeSlot: '화 1~3교시 (09:30~12:20) / 화 6~8교시 (14:30~17:20)',
    color: '#10b981', // Vibrant Emerald Green
    schedules: Array.from({ length: 15 }, (_, i) => ({
      week: i + 1,
      date: `2026.09.${(i + 1).toString().padStart(2, '0')}`,
      topic: `${i + 1}주차 강의 주제 미등록`,
      pdfFileName: '',
      googleDriveUrl: '',
    })),
  },
];
