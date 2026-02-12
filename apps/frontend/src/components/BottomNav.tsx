import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ListMusic, Headphones, LayoutDashboard, Radio, History } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavTab {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** Paths that mark this tab as active */
  paths: string[]
  onClick: () => void
}

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isDJRoute = location.pathname.startsWith('/dj')

  // Listener nav — shown on /, /join/:slug
  if (!isDJRoute) {
    const currentTab = searchParams.get('tab') || 'djs'

    const tabs: NavTab[] = [
      {
        id: 'djs',
        label: 'DJs',
        icon: Search,
        paths: ['/'],
        onClick: () => navigate('/?tab=djs'),
      },
      {
        id: 'requests',
        label: 'Requests',
        icon: ListMusic,
        paths: ['/'],
        onClick: () => navigate('/?tab=requests'),
      },
    ]

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center">
          {tabs.map((tab) => {
            const isActive =
              tab.paths.includes(location.pathname) && currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={tab.onClick}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
                type="button"
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => navigate('/dj')}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground transition-colors hover:text-foreground"
            type="button"
          >
            <Headphones className="h-5 w-5" />
            <span className="text-[10px] font-medium">DJ Mode</span>
          </button>
        </div>
      </nav>
    )
  }

  // DJ nav — shown on /dj/dashboard, /dj/go-live, /dj/history
  const djTabs: NavTab[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      paths: ['/dj/dashboard'],
      onClick: () => navigate('/dj/dashboard'),
    },
    {
      id: 'go-live',
      label: 'Go Live',
      icon: Radio,
      paths: ['/dj/go-live'],
      onClick: () => navigate('/dj/go-live'),
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      paths: ['/dj/history'],
      onClick: () => navigate('/dj/history'),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center">
        {djTabs.map((tab) => {
          const isActive = tab.paths.includes(location.pathname)
          return (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
              type="button"
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
        <button
          onClick={() => navigate('/')}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground transition-colors hover:text-foreground"
          type="button"
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-medium">Listener</span>
        </button>
      </div>
    </nav>
  )
}
