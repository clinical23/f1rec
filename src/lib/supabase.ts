import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mezipswmplrcdbinwjwy.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lemlwc3dtcGxyY2RiaW53and5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDUxNjYsImV4cCI6MjA5MTA4MTE2Nn0.GvIMSsBobPydoKiDqTMBFCEU5GdOL8RSSPKWZ1Z6vfg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
