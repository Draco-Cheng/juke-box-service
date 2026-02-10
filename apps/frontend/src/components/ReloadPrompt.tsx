import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_INTERVAL = 60 * 1000 // Check for updates every 60 seconds

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        registration.update()
      }, UPDATE_CHECK_INTERVAL)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-[#1a1d27] border border-purple-500/30 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
      <p className="flex-1 text-sm">New version available!</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
      >
        Update
      </button>
    </div>
  )
}
