// Supabase DB REST API Client for Lecture Schedule Persistence
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mdcgzvfeazrmvkpanpho.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HX_nDGxsiEvlV-E3ztJpRw_Va5P13tO';

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
  saved_at?: string;
}
