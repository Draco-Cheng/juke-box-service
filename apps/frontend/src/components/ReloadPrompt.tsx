'use client'

import { RefreshCw, X } from 'lucide-react'
import { useServiceWorker } from '@/hooks/useServiceWorker'

export function ReloadPrompt() {
  const { showUpdate, applyUpdate, dismissUpdate } = useServiceWorker()

  if (!showUpdate) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-primary px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-3">
        <RefreshCw className="h-4 w-4 flex-shrink-0 text-primary-foreground" />
        <p className="flex-1 text-sm font-medium text-primary-foreground">
          New version available
        </p>
        <button
          onClick={applyUpdate}
          className="rounded-lg bg-primary-foreground px-4 py-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
        >
          Update
        </button>
        <button
          onClick={dismissUpdate}
          className="rounded-lg p-1.5 text-primary-foreground transition-colors hover:bg-primary-foreground/10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
