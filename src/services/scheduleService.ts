import { CourseSchedule, SEMESTER_COURSES, WeekSchedule, Semester, DEFAULT_SEMESTERS } from '../data/scheduleData';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DbScheduleRow } from '../lib/supabase';

const LOCAL_COURSES_KEY = 'lecture_semester_courses_v3';
const LOCAL_SEMESTERS_KEY = 'lecture_semesters_v3';

/**
 * Load Semesters list
 */
export function loadSemesters(): Semester[] {
  try {
    const saved = localStorage.getItem(LOCAL_SEMESTERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_SEMESTERS;
}

/**
 * Save Semesters list
 */
export function saveSemesters(semesters: Semester[]): void {
  try {
    localStorage.setItem(LOCAL_SEMESTERS_KEY, JSON.stringify(semesters));
  } catch (e) {}
}

/**
 * Load course schedules from Supabase DB, falling back to localStorage or default SEMESTER_COURSES
 */
export async function loadCourseSchedules(): Promise<CourseSchedule[]> {
  let baseCourses: CourseSchedule[] = SEMESTER_COURSES;

  // 1. Read from localStorage first for dynamic user-added courses
  try {
    const saved = localStorage.getItem(LOCAL_COURSES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseCourses = parsed;
      }
    }
  } catch (e) {}

  // 2. Try loading updated week schedules from Supabase DB
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lecture_schedules?select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (res.ok) {
      const dbRows: DbScheduleRow[] = await res.json();
      if (Array.isArray(dbRows) && dbRows.length > 0) {
        return mergeDbSchedules(baseCourses, dbRows);
      }
    }
  } catch (err) {
    console.warn('[ScheduleService] Supabase DB fetch failed, using local storage fallback.', err);
  }

  return baseCourses;
}

/**
 * Save entire course list (when adding/modifying/deleting a course)
 */
export function saveCourseList(courses: CourseSchedule[]): void {
  try {
    localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(courses));
  } catch (e) {}
}

/**
 * Save / Upsert a week schedule to Supabase DB and local storage
 */
export async function saveWeekSchedule(
  courseId: string,
  updatedWeek: WeekSchedule,
  allCourses: CourseSchedule[]
): Promise<CourseSchedule[]> {
  const nextCourses = allCourses.map((c) => {
    if (c.id !== courseId) return c;
    return {
      ...c,
      schedules: c.schedules.map((w) => (w.week === updatedWeek.week ? updatedWeek : w)),
    };
  });

  // 1. Save to Local Storage immediately
  saveCourseList(nextCourses);

  // 2. Async Upsert to Supabase DB
  try {
    const payload: DbScheduleRow = {
      course_id: courseId,
      week: updatedWeek.week,
      date: updatedWeek.date,
      topic: updatedWeek.topic,
      pdf_file_name: updatedWeek.pdfFileName || '',
      google_drive_url: updatedWeek.googleDriveUrl || '',
      target_language: updatedWeek.targetLanguage || 'en',
      updated_at: new Date().toISOString(),
      has_saved_transcript: updatedWeek.hasSavedTranscript || false,
      has_saved_ai_summary: updatedWeek.hasSavedAiSummary || false,
      transcript_text: updatedWeek.transcriptText || '',
      ai_summary_text: updatedWeek.aiSummaryText || '',
      saved_at: updatedWeek.savedAt || '',
    };

    await fetch(`${SUPABASE_URL}/rest/v1/lecture_schedules`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[ScheduleService] Supabase DB upsert warning:', err);
  }

  return nextCourses;
}

/**
 * Merge DB rows into course schedule structure
 */
function mergeDbSchedules(baseCourses: CourseSchedule[], dbRows: DbScheduleRow[]): CourseSchedule[] {
  if (!Array.isArray(baseCourses)) return SEMESTER_COURSES;
  return baseCourses.map((course) => {
    const courseRows = (dbRows || []).filter((r) => r.course_id === course.id);
    const schedules = Array.isArray(course.schedules) ? course.schedules : [];
    if (courseRows.length === 0) return { ...course, schedules };

    const mergedSchedules = schedules.map((week) => {
      const match = courseRows.find((r) => r.week === week.week);
      if (!match) return week;
      return {
        ...week,
        date: match.date || week.date,
        topic: match.topic || week.topic,
        pdfFileName: match.pdf_file_name || week.pdfFileName,
        googleDriveUrl: match.google_drive_url || week.googleDriveUrl,
        targetLanguage: match.target_language || week.targetLanguage || 'en',
        hasSavedTranscript: match.has_saved_transcript ?? week.hasSavedTranscript,
        hasSavedAiSummary: match.has_saved_ai_summary ?? week.hasSavedAiSummary,
        transcriptText: match.transcript_text || week.transcriptText,
        aiSummaryText: match.ai_summary_text || week.aiSummaryText,
        savedAt: match.saved_at || week.savedAt,
      };
    });

    return { ...course, schedules: mergedSchedules };
  });
}
