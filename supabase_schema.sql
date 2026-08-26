-- ============================================================
-- Supabase SQL Schema for Lecture Schedule Automation System
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- 1. Create lecture_semesters table
CREATE TABLE IF NOT EXISTS public.lecture_semesters (
    id TEXT PRIMARY KEY,
    year INT NOT NULL,
    term TEXT NOT NULL,
    name TEXT NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for lecture_semesters
ALTER TABLE public.lecture_semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to lecture semesters" 
ON public.lecture_semesters FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update access to lecture semesters" 
ON public.lecture_semesters FOR ALL USING (true) WITH CHECK (true);

-- 2. Create lecture_courses table
CREATE TABLE IF NOT EXISTS public.lecture_courses (
    id TEXT PRIMARY KEY,
    semester_id TEXT NOT NULL,
    title TEXT NOT NULL,
    code TEXT DEFAULT '',
    credits INT DEFAULT 3,
    classroom TEXT DEFAULT '',
    section TEXT DEFAULT '',
    time_slot TEXT DEFAULT '',
    color TEXT DEFAULT '#8b5cf6',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for lecture_courses
ALTER TABLE public.lecture_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to lecture courses" 
ON public.lecture_courses FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update access to lecture courses" 
ON public.lecture_courses FOR ALL USING (true) WITH CHECK (true);

-- 3. Create lecture_schedules table
CREATE TABLE IF NOT EXISTS public.lecture_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id TEXT NOT NULL,
    week INT NOT NULL,
    date TEXT,
    topic TEXT NOT NULL,
    pdf_file_name TEXT DEFAULT '',
    google_drive_url TEXT DEFAULT '',
    target_language TEXT DEFAULT 'en',
    has_saved_transcript BOOLEAN DEFAULT FALSE,
    has_saved_ai_summary BOOLEAN DEFAULT FALSE,
    transcript_text TEXT DEFAULT '',
    ai_summary_text TEXT DEFAULT '',
    saved_at TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_course_week UNIQUE (course_id, week)
);

-- Enable RLS for lecture_schedules
ALTER TABLE public.lecture_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to lecture schedules" 
ON public.lecture_schedules FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update access to lecture schedules" 
ON public.lecture_schedules FOR ALL USING (true) WITH CHECK (true);

-- Create Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_lecture_schedules_course_week 
ON public.lecture_schedules (course_id, week);
