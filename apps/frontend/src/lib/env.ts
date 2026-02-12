export const env = {
  get API_URL() { return process.env.NEXT_PUBLIC_API_URL || '/api' },
  get SUPABASE_URL() { return process.env.NEXT_PUBLIC_SUPABASE_URL || '' },
  get SUPABASE_ANON_KEY() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
  get STRIPE_PUBLISHABLE_KEY() { return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '' },
}
