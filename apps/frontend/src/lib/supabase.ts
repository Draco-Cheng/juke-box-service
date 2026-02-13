import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

let _client: SupabaseClient | null = null

export const supabase = {
  get client(): SupabaseClient | null {
    // Return cached instance if already created
    if (_client) return _client

    const supabaseUrl = env.SUPABASE_URL
    const supabaseAnonKey = env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      // Don't cache null on client-side — runtime config may load after initial render
      if (typeof window === 'undefined') {
        console.warn('[Supabase] Credentials not configured. Realtime features will be disabled.')
      }
      return null
    }

    _client = createClient(supabaseUrl, supabaseAnonKey)
    return _client
  },
  get isRealtimeEnabled() {
    return !!this.client
  }
}
