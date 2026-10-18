import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zxtkeunzeazpstrnfccy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4dGtldW56ZWF6cHN0cm5mY2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODM0OTgsImV4cCI6MjEwNzY1OTQ5OH0.ady3K25fCsAR7Iu93vu3_WA9Vx031WPZ0n9KBz-d6GM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
