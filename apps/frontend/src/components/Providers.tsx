'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from './Toast'
import { AuthProvider } from '../contexts/AuthContext'
import { ReloadPrompt } from './ReloadPrompt'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <ReloadPrompt />
          {children}
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
