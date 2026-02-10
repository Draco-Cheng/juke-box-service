function getEnv(key: string): string {
  // Runtime env (production container via env-config.js)
  const runtimeEnv = (window as unknown as Record<string, unknown>).__ENV__ as Record<string, string> | undefined
  if (runtimeEnv?.[key]) return runtimeEnv[key]
  // Build-time fallback (local dev with Vite)
  return import.meta.env[key] ?? ''
}

export const env = {
  get API_URL() { return getEnv('VITE_API_URL') || '/api' },
  get SUPABASE_URL() { return getEnv('VITE_SUPABASE_URL') },
  get SUPABASE_ANON_KEY() { return getEnv('VITE_SUPABASE_ANON_KEY') },
  get STRIPE_PUBLISHABLE_KEY() { return getEnv('VITE_STRIPE_PUBLISHABLE_KEY') },
}
