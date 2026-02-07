import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

const supabaseUrl = env.SUPABASE_URL
const supabaseAnonKey = env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Credentials not configured. Realtime features will be disabled.'
  )
}

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const isRealtimeEnabled = !!supabase
