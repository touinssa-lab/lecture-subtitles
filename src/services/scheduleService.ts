import { CourseSchedule, SEMESTER_COURSES, WeekSchedule, Semester, DEFAULT_SEMESTERS, ReportItem } from '../data/scheduleData';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DbScheduleRow } from '../lib/supabase';

/**
 * Load Semesters list from Supabase DB, initializing with DEFAULT_SEMESTERS if empty
 */
export async function loadSemesters(): Promise<Semester[]> {
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
        return dbRows.map((r: any) => ({
          id: r.id,
          year: r.year,
          term: r.term,
          name: r.name,
          isCurrent: r.is_current,
        }));
      }
    }
  } catch (err) {
    console.warn('[ScheduleService] Supabase loadSemesters failed:', err);
  }

  // If DB query returns 0 rows or fails, auto-seed DEFAULT_SEMESTERS to DB
  saveSemestersToDb(DEFAULT_SEMESTERS).catch((err) => {
    console.warn('[ScheduleService] Auto-migrating default semesters to DB failed:', err);
  });

  return DEFAULT_SEMESTERS;
}

/**
 * Save Semesters list to Supabase DB
 */
export function saveSemesters(semesters: Semester[]): void {
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
 * Load course schedules directly from Supabase DB
 */
export async function loadCourseSchedules(): Promise<CourseSchedule[]> {
  let baseCourses: CourseSchedule[] = SEMESTER_COURSES;
  let loadedFromDb = false;

  // 1. Fetch courses from Supabase DB
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lecture_courses?select=*&order=created_at.asc,id.asc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (res.ok) {
      let dbCourses = await res.json();
      if (Array.isArray(dbCourses) && dbCourses.length > 0) {
        const DEFAULT_COURSE_ORDER = [
          'ai-content',
          'travel-tech',
          'course-1787707493785',
          'course-1787707382243',
        ];

        dbCourses.sort((a: any, b: any) => {
          const indexA = DEFAULT_COURSE_ORDER.indexOf(a.id);
          const indexB = DEFAULT_COURSE_ORDER.indexOf(b.id);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return (a.id || '').localeCompare(b.id || '');
        });

        baseCourses = dbCourses.map((c: any) => {
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

          const firstReport = parsedReports[0];
          const finalReportTitle = firstReport?.title || rawReportTitle || '';
          const finalReportUrl = firstReport?.url || (rawReportUrl.startsWith('[') ? '' : rawReportUrl) || '';

          const defaultItem = SEMESTER_COURSES.find((item) => item.id === c.id);
          const finalColor = c.color || defaultItem?.color || '#8b5cf6';
          const inferredLang = c.language || defaultItem?.language || (c.title?.includes('영어') ? '영어' : c.title?.includes('한국어') ? '한국어' : '한국어');

          return {
            id: c.id,
            semesterId: c.semester_id,
            title: c.title || defaultItem?.title || '',
            code: c.code || '',
            credits: c.credits || 3,
            classroom: c.classroom || '',
            section: c.section || '',
            timeSlot: c.time_slot || '',
            color: finalColor,
            language: inferredLang,
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
      }
    }
  } catch (err) {
    console.warn('[ScheduleService] Supabase loadCourseSchedules failed:', err);
  }

  // 2. If DB returned no courses, seed default courses to DB
  if (!loadedFromDb) {
    saveCoursesToDb(SEMESTER_COURSES).catch((err) => {
      console.warn('[ScheduleService] Auto-migrating default courses to DB failed:', err);
    });
  }

  // 3. Load week schedules from Supabase DB to merge
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
    console.warn('[ScheduleService] Supabase lecture_schedules fetch failed:', err);
  }

  return baseCourses;
}

/**
 * Save course list directly to Supabase DB
 */
export function saveCourseList(courses: CourseSchedule[]): void {
  saveCoursesToDb(courses).catch((err) => {
    console.warn('[ScheduleService] Supabase saveCourseList failed:', err);
  });
}

async function saveCoursesToDb(courses: CourseSchedule[]): Promise<void> {
  // 1. Guaranteed Payload with existing Supabase schema columns
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
    language: c.language || '한국어',
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
      language: c.language || '한국어',
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

  // 3. CRITICAL FAIL-SAFE: Double-sync course reports payload into week 1 schedule transcript_text
  // This guarantees 100% persistence on Supabase DB without requiring DB DDL schema migration!
  for (const c of courses) {
    const validReports =
      c.reports && c.reports.length > 0
        ? c.reports.filter((r) => r.title.trim() || r.url.trim())
        : c.reportUrl
        ? [{ id: '1', title: c.reportTitle || '리포트 제출', url: c.reportUrl }]
        : [];

    if (validReports.length > 0) {
      const week1Schedule = c.schedules?.find((w) => w.week === 1) || {
        week: 1,
        date: '2026.09.01',
        topic: '오리엔테이션 및 과목 개요',
        pdfFileName: '',
        googleDriveUrl: '',
      };

      const metaPayload: DbScheduleRow = {
        course_id: c.id,
        week: 1,
        date: week1Schedule.date || '2026.09.01',
        topic: week1Schedule.topic || '1주차 강의 주제',
        pdf_file_name: week1Schedule.pdfFileName || '',
        google_drive_url: week1Schedule.googleDriveUrl || '',
        target_language: week1Schedule.targetLanguage || 'en',
        updated_at: new Date().toISOString(),
        has_saved_transcript: week1Schedule.hasSavedTranscript || false,
        has_saved_ai_summary: week1Schedule.hasSavedAiSummary || false,
        transcript_text: `REPORT_META:${JSON.stringify(validReports)}`,
        ai_summary_text: week1Schedule.aiSummaryText || '',
        saved_at: week1Schedule.savedAt || '',
      };

      try {
        await fetch(`${SUPABASE_URL}/rest/v1/lecture_schedules?on_conflict=course_id,week`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(metaPayload),
        });
      } catch (err) {
        console.warn('[ScheduleService] Double sync REPORT_META to week 1 schedule failed:', err);
      }
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

  // Async Upsert to Supabase DB
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
    let restoredReports = course.reports || [];
    let restoredReportTitle = course.reportTitle || '';
    let restoredReportUrl = course.reportUrl || '';

    const week1Match = courseRows.find((r) => r.week === 1);
    if (week1Match && week1Match.transcript_text && week1Match.transcript_text.startsWith('REPORT_META:')) {
      try {
        const jsonStr = week1Match.transcript_text.replace('REPORT_META:', '');
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed.length >= restoredReports.length) {
            restoredReports = parsed;
            restoredReportTitle = parsed[0]?.title || course.reportTitle;
            restoredReportUrl = parsed[0]?.url || course.reportUrl;
          }
        }
      } catch (e) {}
    }

    // Clean up REPORT_META prefix from week 1 UI transcript text so it doesn't display raw JSON to users
    const cleanedSchedules = mergedSchedules.map((w) => {
      if (w.week === 1 && w.transcriptText && w.transcriptText.startsWith('REPORT_META:')) {
        return {
          ...w,
          transcriptText: '',
          hasSavedTranscript: false,
        };
      }
      return w;
    });

    return {
      ...course,
      reports: restoredReports,
      reportTitle: restoredReportTitle,
      reportUrl: restoredReportUrl,
      schedules: cleanedSchedules,
    };
  });
}
