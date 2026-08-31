import { createClient } from '@supabase/supabase-js';

// Supabase DB REST API Client & Realtime Client for Lecture Schedule Persistence
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface DbScheduleRow {
  id?: string;
  course_id: string;
  week: number;
  date: string;
  topic: string;
  pdf_file_name: string;
  google_drive_url: string;
  target_language?: string;
  updated_at?: string;
  has_saved_transcript?: boolean;
  has_saved_ai_summary?: boolean;
  transcript_text?: string;
  ai_summary_text?: string;
  attendance_student_ids?: string;
  saved_at?: string;
}

