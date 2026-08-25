-- ============================================================
-- Supabase SQL Schema for Lecture Schedule Automation System
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- 1. Create lecture_schedules table
CREATE TABLE IF NOT EXISTS public.lecture_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id TEXT NOT NULL,
    week INT NOT NULL,
    date TEXT,
    topic TEXT NOT NULL,
    pdf_file_name TEXT DEFAULT '',
    google_drive_url TEXT DEFAULT '',
    target_language TEXT DEFAULT 'en',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_course_week UNIQUE (course_id, week)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.lecture_schedules ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for Public PC & Instructor Access
CREATE POLICY "Allow public read access to lecture schedules" 
ON public.lecture_schedules 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert/update access to lecture schedules" 
ON public.lecture_schedules 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Create Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_lecture_schedules_course_week 
ON public.lecture_schedules (course_id, week);
