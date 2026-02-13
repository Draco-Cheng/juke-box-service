'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../contexts/AuthContext'

type LoginMode = 'password' | 'magic-link'

export default function DJLoginPage() {
  const router = useRouter()
  const { signIn, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<LoginMode>('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)

    const { error: signInError } = await signIn(email.trim(), password)

    if (signInError) {
      // Handle auth errors with user-friendly messages
      // For login failures, always show generic message to avoid revealing user existence
      const msg = signInError.message.toLowerCase()
      if (msg.includes('not configured') || msg.includes('unavailable')) {
        setError('Authentication service unavailable')
      } else {
        // For any credential-related error, show generic message
        setError('Invalid email or password')
      }
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/dj/dashboard')
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: magicLinkError } = await signInWithMagicLink(email.trim())

    if (magicLinkError) {
      const msg = magicLinkError.message.toLowerCase()
      if (msg.includes('not configured') || msg.includes('unavailable')) {
        setError('Authentication service unavailable')
      } else {
        setError('Unable to send magic link. Please try again.')
      }
      setLoading(false)
      return
    }

    setMagicLinkSent(true)
    setLoading(false)
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-purple-900/50 border border-purple-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-2">Check your email!</h2>
            <p className="text-gray-300">
              We've sent a login link to <span className="font-medium">{email}</span>.
              Click the link to sign in.
            </p>
          </div>
          <button
            onClick={() => {
              setMagicLinkSent(false)
              setEmail('')
            }}
            className="text-purple-400 hover:text-purple-300"
          >
            Try a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-8">DJ Login</h1>

        {/* Login Mode Toggle */}
        <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'password'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode('magic-link')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'magic-link'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Magic Link
          </button>
        </div>

        <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-400 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dj@example.com"
              required
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {mode === 'password' && (
            <div>
              <label htmlFor="password" className="block text-sm text-gray-400 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || (mode === 'password' && !password)}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
          >
            {loading
              ? mode === 'password' ? 'Logging in...' : 'Sending...'
              : mode === 'password' ? 'Login' : 'Send Magic Link'
            }
          </button>
        </form>

        {mode === 'magic-link' && (
          <p className="text-gray-500 text-xs text-center mt-4">
            We'll send you an email with a link to sign in instantly.
          </p>
        )}

        <p className="text-gray-500 text-sm text-center mt-6">
          Don't have an account?{' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300">
            Register
          </Link>
        </p>

        <Link
          href="/"
          className="block text-gray-500 hover:text-gray-300 text-sm text-center mt-4 transition"
        >
          &larr; Back to DropBeat
        </Link>
      </div>
    </div>
  )
}
