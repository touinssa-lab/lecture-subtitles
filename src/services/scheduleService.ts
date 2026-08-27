import { CourseSchedule, SEMESTER_COURSES, WeekSchedule, Semester, DEFAULT_SEMESTERS, ReportItem } from '../data/scheduleData';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DbScheduleRow } from '../lib/supabase';

const LOCAL_COURSES_KEY = 'lecture_semester_courses_v3';
const LOCAL_SEMESTERS_KEY = 'lecture_semesters_v3';

/**
 * Load Semesters list from Supabase DB, falling back to localStorage or DEFAULT_SEMESTERS
 */
export async function loadSemesters(): Promise<Semester[]> {
  let loadedFromDb = false;
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
      loadedFromDb = true;
    }
  } catch (err) {
    console.warn('[ScheduleService] Supabase loadSemesters failed, fallback to local storage.', err);
  }

  // 2. Fallback to localStorage
  let localSemesters: Semester[] = DEFAULT_SEMESTERS;
  try {
    const saved = localStorage.getItem(LOCAL_SEMESTERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localSemesters = parsed;
      }
    }
  } catch (e) {}

  // If DB was queried successfully but returned 0 rows, sync local storage data to DB
  if (loadedFromDb && localSemesters.length > 0) {
    saveSemestersToDb(localSemesters).catch((err) => {
      console.warn('[ScheduleService] Auto-migrating semesters to DB failed:', err);
    });
  }

  return localSemesters;
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

  await fetch(`${SUPABASE_URL}/rest/v1/lecture_semesters?on_conflict=id`, {
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
  let dbIsEmpty = false;

  // Pre-load local courses map for fallback merging if DB has missing fields
  let localMap: Record<string, CourseSchedule> = {};
  try {
    const saved = localStorage.getItem(LOCAL_COURSES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((c: CourseSchedule) => {
          if (c.id) localMap[c.id] = c;
        });
      }
    }
  } catch (e) {}

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
        baseCourses = dbCourses.map((c: any) => {
          const localItem = localMap[c.id];
          const rawReportUrl = c.report_url || '';
          const rawReportTitle = c.report_title || '';
          let parsedReports: ReportItem[] = [];

          if (Array.isArray(c.reports) && c.reports.length > 0) {
            parsedReports = c.reports;
          } else if (rawReportUrl) {
            const trimmed = rawReportUrl.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
              try {
                const json = JSON.parse(trimmed);
                if (Array.isArray(json) && json.length > 0) {
                  parsedReports = json;
                }
              } catch (e) {}
            }
            if (parsedReports.length === 0) {
              parsedReports = [{ id: '1', title: rawReportTitle || '리포트 제출', url: rawReportUrl }];
            }
          }

          // Fallback to local storage reports if DB row is missing report info
          if (parsedReports.length === 0 && localItem) {
            if (localItem.reports && localItem.reports.length > 0) {
              parsedReports = localItem.reports;
            } else if (localItem.reportUrl) {
              parsedReports = [{ id: '1', title: localItem.reportTitle || '리포트 제출', url: localItem.reportUrl }];
            }
          }

          const firstReport = parsedReports[0];
          const finalReportTitle = firstReport?.title || rawReportTitle || localItem?.reportTitle || '';
          const finalReportUrl = firstReport?.url || (rawReportUrl.startsWith('[') ? '' : rawReportUrl) || localItem?.reportUrl || '';

          const defaultItem = SEMESTER_COURSES.find((item) => item.id === c.id);
          const finalColor = c.color || localItem?.color || defaultItem?.color || '#8b5cf6';

          return {
            id: c.id,
            semesterId: c.semester_id,
            title: c.title || localItem?.title || defaultItem?.title || '',
            code: c.code || localItem?.code || '',
            credits: c.credits || localItem?.credits || 3,
            classroom: c.classroom || localItem?.classroom || '',
            section: c.section || localItem?.section || '',
            timeSlot: c.time_slot || localItem?.timeSlot || '',
            color: finalColor,
            reportTitle: finalReportTitle,
            reportUrl: finalReportUrl,
            reports: parsedReports,
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
          };
        });
        loadedFromDb = true;

        try {
          localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(baseCourses));
        } catch (e) {}

        // Auto-sync merged courses to DB to persist any merged local data
        saveCoursesToDb(baseCourses).catch((err) => {
          console.warn('[ScheduleService] Auto-syncing merged courses to DB failed:', err);
        });
      } else {
        dbIsEmpty = true;
        loadedFromDb = true;
      }
    }
  } catch (err) {
    console.warn('[ScheduleService] Supabase loadCourseSchedules failed, falling back to local storage.', err);
  }

  // 2. If DB load failed or was empty, load from localStorage fallback
  if (!loadedFromDb || dbIsEmpty) {
    try {
      const saved = localStorage.getItem(LOCAL_COURSES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseCourses = parsed;
        }
      }
    } catch (e) {}

    // If DB is empty, sync local storage courses to DB
    if (dbIsEmpty && baseCourses.length > 0) {
      saveCoursesToDb(baseCourses).catch((err) => {
        console.warn('[ScheduleService] Auto-migrating courses to DB failed:', err);
      });
    }
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
  // 1. Guaranteed Payload with existing Supabase schema columns (id, semester_id, title, code, credits, classroom, section, time_slot, color, is_deleted, deleted_at)
  const payloadBase = courses.map((c) => ({
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
    deleted_at: c.deletedAt ? c.deletedAt : null,
  }));

  try {
    const resBase = await fetch(`${SUPABASE_URL}/rest/v1/lecture_courses?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payloadBase),
    });

    if (!resBase.ok) {
      const errorText = await resBase.text();
      console.warn('[ScheduleService] saveCoursesToDb base warning:', resBase.status, errorText);
    }
  } catch (err) {
    console.warn('[ScheduleService] saveCoursesToDb base fetch error:', err);
  }

  // 2. Attempt extended payload including report_title & report_url if columns exist in DB
  const payloadWithReports = courses.map((c) => {
    const validReports =
      c.reports && c.reports.length > 0
        ? c.reports.filter((r) => r.title.trim() || r.url.trim())
        : c.reportUrl
        ? [{ id: '1', title: c.reportTitle || '리포트 제출', url: c.reportUrl }]
        : [];

    const firstReport = validReports[0];
    const encodedReportUrl =
      validReports.length > 0
        ? JSON.stringify(validReports)
        : firstReport?.url || c.reportUrl || '';

    return {
      id: c.id,
      semester_id: c.semesterId,
      title: c.title,
      code: c.code || '',
      credits: c.credits || 3,
      classroom: c.classroom || '',
      section: c.section || '',
      time_slot: c.timeSlot || '',
      color: c.color || '#8b5cf6',
      report_title: firstReport?.title || c.reportTitle || '',
      report_url: encodedReportUrl,
      is_deleted: c.isDeleted || false,
      deleted_at: c.deletedAt ? c.deletedAt : null,
    };
  });

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/lecture_courses?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payloadWithReports),
    });
  } catch (err) {
    // Ignore schema error if report_title column is not added yet
  }

  // 3. Fallback: Save reports info into week 1 schedule's transcript_text as JSON backup so reports survive any schema state
  for (const c of courses) {
    const validReports =
      c.reports && c.reports.length > 0
        ? c.reports.filter((r) => r.title.trim() || r.url.trim())
        : c.reportUrl
        ? [{ id: '1', title: c.reportTitle || '리포트 제출', url: c.reportUrl }]
        : [];

    if (validReports.length > 0) {
      const firstWeek = (c.schedules && c.schedules[0]) || {
        week: 1,
        date: '2026.09.01',
        topic: '1주차',
        pdfFileName: '',
        googleDriveUrl: '',
      };
      
      // Store report metadata in week 1 transcript backup
      const updatedFirstWeek: WeekSchedule = {
        ...firstWeek,
        transcriptText: `REPORT_META:${JSON.stringify(validReports)}`,
      };
      
      saveWeekSchedule(c.id, updatedFirstWeek, courses).catch(() => {});
    }
  }
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

    const res = await fetch(`${SUPABASE_URL}/rest/v1/lecture_schedules?on_conflict=course_id,week`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[ScheduleService] Supabase saveWeekSchedule failed:', res.status, errText);
    }
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
        date: match.date !== undefined && match.date !== null ? match.date : week.date,
        topic: match.topic !== undefined && match.topic !== null ? match.topic : week.topic,
        pdfFileName: match.pdf_file_name !== undefined && match.pdf_file_name !== null ? match.pdf_file_name : week.pdfFileName,
        googleDriveUrl: match.google_drive_url !== undefined && match.google_drive_url !== null ? match.google_drive_url : week.googleDriveUrl,
        targetLanguage: match.target_language || week.targetLanguage || 'en',
        hasSavedTranscript: match.has_saved_transcript ?? week.hasSavedTranscript,
        hasSavedAiSummary: match.has_saved_ai_summary ?? week.hasSavedAiSummary,
        transcriptText: match.transcript_text ?? week.transcriptText,
        aiSummaryText: match.ai_summary_text ?? week.aiSummaryText,
        savedAt: match.saved_at ?? week.savedAt,
      };
    });

    // Check if week 1 contains REPORT_META backup for course reports
    let restoredReports = course.reports;
    let restoredReportTitle = course.reportTitle;
    let restoredReportUrl = course.reportUrl;

    const week1Match = courseRows.find((r) => r.week === 1);
    if (week1Match && week1Match.transcript_text && week1Match.transcript_text.startsWith('REPORT_META:')) {
      try {
        const jsonStr = week1Match.transcript_text.replace('REPORT_META:', '');
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          restoredReports = parsed;
          restoredReportTitle = parsed[0]?.title || course.reportTitle;
          restoredReportUrl = parsed[0]?.url || course.reportUrl;
        }
      } catch (e) {}
    }

    return {
      ...course,
      reports: restoredReports,
      reportTitle: restoredReportTitle,
      reportUrl: restoredReportUrl,
      schedules: mergedSchedules,
    };
  });
}
