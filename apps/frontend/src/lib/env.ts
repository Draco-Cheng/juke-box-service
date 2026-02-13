function runtime(key: string): string | undefined {
  if (typeof window !== 'undefined') {
    return window.__RUNTIME_CONFIG__?.[key as keyof NonNullable<Window['__RUNTIME_CONFIG__']>]
  }
  return undefined
}

export const env = {
  get API_URL() { return runtime('NEXT_PUBLIC_API_URL') || process.env.NEXT_PUBLIC_API_URL || '/api' },
  get SUPABASE_URL() { return runtime('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || '' },
  get SUPABASE_ANON_KEY() { return runtime('NEXT_PUBLIC_SUPABASE_ANON_KEY') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
  get STRIPE_PUBLISHABLE_KEY() { return runtime('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '' },
}
