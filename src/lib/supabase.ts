// Supabase DB REST API Client for Lecture Schedule Persistence
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://touinssa-lab.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdWluc3NhLWxhYiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDA0NTY3ODl9.demo_key_placeholder';

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
}
