import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
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
  const loadDJProfile = async (user: User): Promise<DJ | null> => {
    try {
      const dj = await api.getDJByEmail(user.email!)
      return dj
    } catch {
      // DJ profile doesn't exist yet
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const dj = await loadDJProfile(session.user)
        setState({
          user: session.user,
          session,
          dj,
          loading: false,
        })
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const dj = await loadDJProfile(session.user)
        setState({
          user: session.user,
          session,
          dj,
          loading: false,
        })
      } else if (event === 'SIGNED_OUT' || !session) {
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error }
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

    await supabase.auth.signOut()
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
