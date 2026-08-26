import { CourseSchedule, SEMESTER_COURSES, WeekSchedule, Semester, DEFAULT_SEMESTERS } from '../data/scheduleData';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DbScheduleRow } from '../lib/supabase';

const LOCAL_COURSES_KEY = 'lecture_semester_courses_v3';
const LOCAL_SEMESTERS_KEY = 'lecture_semesters_v3';

/**
 * Load Semesters list from Supabase DB, falling back to localStorage or DEFAULT_SEMESTERS
 */
export async function loadSemesters(): Promise<Semester[]> {
  // 1. Try loading from Supabase DB
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lecture_semesters?select=*&order=created_at.asc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (res.ok) {
      const dbRows = await res.json();
      if (Array.isArray(dbRows) && dbRows.length > 0) {
        const mapped: Semester[] = dbRows.map((r: any) => ({
          id: r.id,
          year: r.year,
          term: r.term,
          name: r.name,
          isCurrent: r.is_current,
        }));
        try {
          localStorage.setItem(LOCAL_SEMESTERS_KEY, JSON.stringify(mapped));
        } catch (e) {}
        return mapped;
      }
    }
  } catch (err) {
    console.warn('[ScheduleService] Supabase loadSemesters failed, fallback to local storage.', err);
  }

  // 2. Fallback to localStorage
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
 * Save Semesters list to local storage and Supabase DB
 */
export function saveSemesters(semesters: Semester[]): void {
  try {
    localStorage.setItem(LOCAL_SEMESTERS_KEY, JSON.stringify(semesters));
  } catch (e) {}

  saveSemestersToDb(semesters).catch((err) => {
    console.warn('[ScheduleService] Supabase saveSemesters failed:', err);
  });
}

async function saveSemestersToDb(semesters: Semester[]): Promise<void> {
  const payload = semesters.map((s) => ({
    id: s.id,
    year: s.year,
    term: s.term,
    name: s.name,
    is_current: s.isCurrent || false,
  }));

  await fetch(`${SUPABASE_URL}/rest/v1/lecture_semesters`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Load course schedules from Supabase DB, falling back to localStorage or default SEMESTER_COURSES
 */
export async function loadCourseSchedules(): Promise<CourseSchedule[]> {
  let baseCourses: CourseSchedule[] = SEMESTER_COURSES;
  let loadedFromDb = false;

  // 1. Try loading courses from Supabase DB
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lecture_courses?select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (res.ok) {
      const dbCourses = await res.json();
      if (Array.isArray(dbCourses) && dbCourses.length > 0) {
        baseCourses = dbCourses.map((c: any) => ({
          id: c.id,
          semesterId: c.semester_id,
          title: c.title,
          code: c.code || '',
          credits: c.credits || 3,
          classroom: c.classroom || '',
          section: c.section || '',
          timeSlot: c.time_slot || '',
          color: c.color || '#8b5cf6',
          isDeleted: c.is_deleted || false,
          deletedAt: c.deleted_at || undefined,
          schedules: Array.from({ length: 15 }, (_, i) => ({
            week: i + 1,
            date: `2026.09.${(i + 1).toString().padStart(2, '0')}`,
            topic: `${i + 1}주차 강의 주제 미등록`,
            pdfFileName: '',
            googleDriveUrl: '',
            targetLanguage: 'en',
          })),
        }));
        loadedFromDb = true;

        try {
          localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(baseCourses));
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('[ScheduleService] Supabase loadCourseSchedules failed, falling back to local storage.', err);
  }

  // 2. If DB load failed, load from localStorage fallback
  if (!loadedFromDb) {
    try {
      const saved = localStorage.getItem(LOCAL_COURSES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseCourses = parsed;
        }
      }
    } catch (e) {}
  }

  // 3. Try loading week schedules from Supabase DB to merge
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
 * Save entire course list to local storage and Supabase DB
 */
export function saveCourseList(courses: CourseSchedule[]): void {
  try {
    localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(courses));
  } catch (e) {}

  saveCoursesToDb(courses).catch((err) => {
    console.warn('[ScheduleService] Supabase saveCourseList failed:', err);
  });
}

async function saveCoursesToDb(courses: CourseSchedule[]): Promise<void> {
  const payload = courses.map((c) => ({
    id: c.id,
    semester_id: c.semesterId,
    title: c.title,
    code: c.code || '',
    credits: c.credits || 3,
    classroom: c.classroom || '',
    section: c.section || '',
    time_slot: c.timeSlot || '',
    color: c.color || '#8b5cf6',
    is_deleted: c.isDeleted || false,
    deleted_at: c.deletedAt || '',
  }));

  await fetch(`${SUPABASE_URL}/rest/v1/lecture_courses`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a course permanently from Supabase DB and clean up its week schedules
 */
export async function deleteCourse(courseId: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/lecture_courses?id=eq.${courseId}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    await fetch(`${SUPABASE_URL}/rest/v1/lecture_schedules?course_id=eq.${courseId}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
  } catch (err) {
    console.warn('[ScheduleService] Supabase deleteCourse failed:', err);
  }
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
