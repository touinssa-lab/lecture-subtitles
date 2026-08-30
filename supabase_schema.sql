-- ============================================================
-- Supabase Schema for Lecture Subtitles & Course Management Platform
-- ============================================================

-- 1. Semesters Table
CREATE TABLE IF NOT EXISTS public.lecture_semesters (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  term TEXT NOT NULL,
  name TEXT NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS public.lecture_courses (
  id TEXT PRIMARY KEY,
  semester_id TEXT NOT NULL REFERENCES public.lecture_semesters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT DEFAULT '',
  credits INTEGER DEFAULT 3,
  classroom TEXT DEFAULT '',
  section TEXT DEFAULT '',
  time_slot TEXT DEFAULT '',
  color TEXT DEFAULT '#8b5cf6',
  report_title TEXT DEFAULT '',
  report_url TEXT DEFAULT '',
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Week Schedules Table (Composite Key: course_id + week)
CREATE TABLE IF NOT EXISTS public.lecture_schedules (
  course_id TEXT NOT NULL REFERENCES public.lecture_courses(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  date TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  pdf_file_name TEXT DEFAULT '',
  google_drive_url TEXT DEFAULT '',
  target_language TEXT DEFAULT 'en',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  has_saved_transcript BOOLEAN DEFAULT false,
  has_saved_ai_summary BOOLEAN DEFAULT false,
  transcript_text TEXT DEFAULT '',
  ai_summary_text TEXT DEFAULT '',
  saved_at TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (course_id, week)
);

-- Enable RLS & Allow public anonymous read/write access (Anon API Key)
ALTER TABLE public.lecture_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on lecture_semesters" ON public.lecture_semesters FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on lecture_semesters" ON public.lecture_semesters FOR ALL USING (true);

CREATE POLICY "Allow public select on lecture_courses" ON public.lecture_courses FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update/delete on lecture_courses" ON public.lecture_courses FOR ALL USING (true);

CREATE POLICY "Allow public select on lecture_schedules" ON public.lecture_schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update/delete on lecture_schedules" ON public.lecture_schedules FOR ALL USING (true);

-- 4. Counseling Records Table (외국인 학생 1:1 상담 관리 테이블)
CREATE TABLE IF NOT EXISTS public.lecture_counselings (
  id TEXT PRIMARY KEY,
  semester_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_lang TEXT DEFAULT 'en',
  topic TEXT DEFAULT '1:1 진로 및 학업 상담',
  scheduled_at TEXT DEFAULT '',
  created_at_fmt TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  utterances_json TEXT DEFAULT '[]',
  summary_json TEXT DEFAULT 'null',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lecture_counselings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on lecture_counselings" ON public.lecture_counselings FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update/delete on lecture_counselings" ON public.lecture_counselings FOR ALL USING (true);

