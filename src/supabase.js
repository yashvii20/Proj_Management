import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hxyjqqduofkyjyjpatwa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4eWpxcWR1b2ZreWp5anBhdHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MjY0NTcsImV4cCI6MjA5ODIwMjQ1N30.PleEXi__DtQdPChAs0LMzUsFLSDnuYBirb3ZylQqiRo'

export const supabase = createClient(supabaseUrl, supabaseKey)