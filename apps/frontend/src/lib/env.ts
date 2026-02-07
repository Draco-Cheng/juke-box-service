function getEnv(key: string): string | undefined {
  // Runtime env (production container via env-config.js)
  const runtimeEnv = (window as Record<string, unknown>).__ENV__ as Record<string, string> | undefined
  if (runtimeEnv?.[key]) return runtimeEnv[key]
  // Build-time fallback (local dev with Vite)
  return import.meta.env[key]
}

export const env = {
  API_URL: getEnv('VITE_API_URL') || 'http://localhost:8000/api',
  SUPABASE_URL: getEnv('VITE_SUPABASE_URL') || '',
  SUPABASE_ANON_KEY: getEnv('VITE_SUPABASE_ANON_KEY') || '',
}
