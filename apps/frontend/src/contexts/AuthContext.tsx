import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { env } from '../lib/env'
import { api, DJ } from '../lib/api'

interface AuthState {
  user: User | null
  session: Session | null
  dj: DJ | null
  loading: boolean
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, djName: string) => Promise<{ error: AuthError | Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshDJ: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    dj: null,
    loading: true,
  })

  // Load DJ profile for authenticated user
  // Uses fetch directly to avoid getSession() deadlock inside onAuthStateChange
  const loadDJProfile = async (user: User, accessToken?: string): Promise<DJ | null> => {
    try {
      if (accessToken) {
        const API_BASE = env.API_URL
        const res = await fetch(`${API_BASE}/djs/by-email/${user.email}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        })
        if (!res.ok) return null
        return await res.json()
      }
      const dj = await api.getDJByEmail(user.email!)
      return dj
    } catch {
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    let activeRequestId = 0

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const requestId = ++activeRequestId

      if (session?.user) {
        // Set user/session immediately, load DJ profile in background
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          loading: !prev.dj,
        }))

        // Pass access_token directly to avoid getSession() deadlock
        const dj = await loadDJProfile(session.user, session.access_token)

        // Only update if this is still the latest request
        if (requestId === activeRequestId) {
          setState({
            user: session.user,
            session,
            dj,
            loading: false,
          })
        }
      } else {
        setState({
          user: null,
          session: null,
          dj: null,
          loading: false,
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, djName: string): Promise<{ error: AuthError | Error | null }> => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') }
    }

    // 1. Create Supabase auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return { error }
    }

    if (!data.user) {
      return { error: new Error('Failed to create user') }
    }

    // 2. Create DJ profile in our database
    try {
      const dj = await api.createDJ({ name: djName, email })
      setState(prev => ({ ...prev, dj }))
      return { error: null }
    } catch (err) {
      // Rollback: delete the auth user if DJ creation fails
      // Note: In production, you'd want to handle this more gracefully
      return { error: err instanceof Error ? err : new Error('Failed to create DJ profile') }
    }
  }

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | Error | null }> => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error }
    }

    // Load DJ profile immediately so state is ready before navigate
    if (data.session?.user) {
      const dj = await loadDJProfile(data.session.user, data.session.access_token)
      setState({
        user: data.session.user,
        session: data.session,
        dj,
        loading: false,
      })
    }

    return { error: null }
  }

  const signInWithMagicLink = async (email: string): Promise<{ error: AuthError | null }> => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dj/dashboard`,
      },
    })

    return { error }
  }

  const signOut = async () => {
    if (!supabase) return

    // Use scope: 'local' to avoid server-side revoke failures blocking logout
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Even if signOut fails, clear local state
    }
    localStorage.removeItem('dj')
    setState({
      user: null,
      session: null,
      dj: null,
      loading: false,
    })
  }

  const refreshDJ = async () => {
    if (state.user) {
      const dj = await loadDJProfile(state.user)
      setState(prev => ({ ...prev, dj }))
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signInWithMagicLink, signOut, refreshDJ }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
