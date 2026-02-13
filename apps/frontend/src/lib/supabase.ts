import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

let _client: SupabaseClient | null | undefined

export const supabase = {
  get client(): SupabaseClient | null {
    if (_client !== undefined) return _client

    const supabaseUrl = env.SUPABASE_URL
    const supabaseAnonKey = env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        '[Supabase] Credentials not configured. Realtime features will be disabled.'
      )
      _client = null
      return null
    }

    _client = createClient(supabaseUrl, supabaseAnonKey)
    return _client
  },
  get isRealtimeEnabled() {
    return !!this.client
  }
}
