'use client'

import { useEffect, useState, useCallback } from 'react'

export function useServiceWorker() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    async function registerSW() {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      // A new SW is already waiting (e.g. user revisits after deploy)
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        setShowUpdate(true)
      }

      // A new SW was just found and is installing
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          // New SW finished installing and is waiting to activate
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
            setShowUpdate(true)
          }
        })
      })

      // When a new SW takes over, reload to get fresh assets
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })
    }

    registerSW().catch((err) => {
      console.error('[SW] Registration failed:', err)
    })
  }, [])

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return
    // Tell the waiting SW to activate itself
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    // controllerchange listener will reload the page
  }, [waitingWorker])

  const dismissUpdate = useCallback(() => {
    setShowUpdate(false)
  }, [])

  return { showUpdate, applyUpdate, dismissUpdate }
}
