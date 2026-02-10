import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, LiveDJ, Request as SongRequest } from '../lib/api'

// Genre color mapping
const GENRE_COLORS: Record<string, string> = {
  'House': 'bg-purple-600',
  'Deep House': 'bg-purple-500',
  'Techno': 'bg-blue-600',
  'Electronic': 'bg-blue-500',
  'Hip-Hop': 'bg-orange-600',
  'R&B': 'bg-orange-500',
  'Drum & Bass': 'bg-red-600',
  'Jungle': 'bg-red-500',
  'Disco': 'bg-pink-500',
  'Funk': 'bg-pink-600',
  'Pop': 'bg-green-500',
  'Rock': 'bg-yellow-600',
  'Jazz': 'bg-amber-600',
  'Latin': 'bg-emerald-600',
  'Reggaeton': 'bg-lime-600',
}

function getGenreColor(genre: string): string {
  return GENRE_COLORS[genre] || 'bg-gray-600'
}

// LocalStorage key (shared with JoinPage)
const MY_REQUESTS_KEY = 'my_requests'

function getMyRequestIds(): string[] {
  try {
    const stored = localStorage.getItem(MY_REQUESTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Star rating display
function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(fullStars)}
      {hasHalf && '½'}
      <span className="text-gray-600">{'★'.repeat(5 - fullStars - (hasHalf ? 1 : 0))}</span>
      <span className="text-gray-400 text-xs ml-1">{rating.toFixed(1)}</span>
    </span>
  )
}

// DJ Card component
function DJCard({ liveDJ, onClick }: { liveDJ: LiveDJ; onClick: () => void }) {
  const { dj, venue, listener_count, base_price } = liveDJ
  const currency = venue.settings?.pricing?.currency === 'EUR' ? '€' : venue.settings?.pricing?.currency || '€'

  return (
    <button
      onClick={onClick}
      className="w-full bg-gray-800/80 hover:bg-gray-800 border border-gray-700/50 rounded-xl p-4 text-left transition group"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 text-lg font-bold">
          {dj.profile_image ? (
            <img src={dj.profile_image} alt={dj.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            dj.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + Live indicator */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{dj.name}</h3>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
          </div>

          {/* Genres */}
          {dj.genres && dj.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {dj.genres.map((genre) => (
                <span
                  key={genre}
                  className={`${getGenreColor(genre)} text-white text-xs px-2 py-0.5 rounded-full`}
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Venue */}
          <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{venue.name}</span>
          </div>

          {/* Bottom row: rating, listeners, price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dj.rating > 0 && <StarRating rating={dj.rating} />}
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {listener_count}
              </span>
            </div>
            <span className="text-purple-400 font-semibold text-sm font-mono">
              {currency}{(base_price / 100).toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

// Tab types
type Tab = 'djs' | 'requests' | 'djmode'

export default function HomePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('djs')
  const [liveDJs, setLiveDJs] = useState<LiveDJ[]>([])
  const [loading, setLoading] = useState(true)
  const [myRequests, setMyRequests] = useState<SongRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  // Fetch live DJs
  useEffect(() => {
    async function fetchLiveDJs() {
      try {
        setLoading(true)
        const data = await api.getLiveDJs()
        setLiveDJs(data)
      } catch (err) {
        console.error('Failed to fetch live DJs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchLiveDJs()
  }, [])

  // Fetch my requests when switching to requests tab
  useEffect(() => {
    if (activeTab !== 'requests') return

    async function fetchMyRequests() {
      setRequestsLoading(true)
      const ids = getMyRequestIds()
      const results: SongRequest[] = []
      for (const id of ids) {
        try {
          const req = await api.getRequest(id)
          results.push(req)
        } catch {
          // Request may no longer exist
        }
      }
      setMyRequests(results)
      setRequestsLoading(false)
    }
    fetchMyRequests()
  }, [activeTab])

  // Handle DJ Mode tab
  useEffect(() => {
    if (activeTab === 'djmode') {
      navigate('/dj')
    }
  }, [activeTab, navigate])

  function handleDJClick(liveDJ: LiveDJ) {
    navigate(`/join/${liveDJ.venue.slug}`)
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white flex flex-col">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Drop<span className="text-purple-400">Beat</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Request songs from live DJs. Your song, your moment.
        </p>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        {activeTab === 'djs' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Live Now */}
                {liveDJs.length > 0 && (
                  <section className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                      <h2 className="text-lg font-semibold">Live Now ({liveDJs.length})</h2>
                    </div>
                    <div className="space-y-3">
                      {liveDJs.map((liveDJ) => (
                        <DJCard
                          key={liveDJ.session_id}
                          liveDJ={liveDJ}
                          onClick={() => handleDJClick(liveDJ)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Empty state */}
                {liveDJs.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <p className="text-gray-400 font-medium">No DJs live right now</p>
                    <p className="text-gray-600 text-sm mt-1">Check back later for live sessions</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'requests' && (
          <section>
            <h2 className="text-lg font-semibold mb-4">My Requests</h2>
            {requestsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400">No requests yet</p>
                <p className="text-gray-600 text-sm mt-1">Find a live DJ and request a song!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{req.song_title}</p>
                        {req.song_artist && (
                          <p className="text-gray-400 text-sm truncate">{req.song_artist}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0 ${
                        req.status === 'played'
                          ? 'bg-green-900 text-green-300'
                          : req.status === 'accepted'
                            ? 'bg-blue-900 text-blue-300'
                            : req.status === 'rejected'
                              ? 'bg-red-900 text-red-300'
                              : req.status === 'expired'
                                ? 'bg-gray-700 text-gray-400'
                                : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {req.status === 'pending' && 'Waiting'}
                        {req.status === 'accepted' && 'Coming up'}
                        {req.status === 'played' && 'Played'}
                        {req.status === 'rejected' && 'Skipped'}
                        {req.status === 'expired' && 'Expired'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        req.tier === 'asap'
                          ? 'bg-red-900 text-red-300'
                          : req.tier === 'priority'
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-gray-700 text-gray-400'
                      }`}>
                        {req.tier}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0d0f14]/95 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-md mx-auto flex">
          <button
            onClick={() => setActiveTab('djs')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition ${
              activeTab === 'djs' ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-xs font-medium">DJs</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition ${
              activeTab === 'requests' ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-medium">Requests</span>
          </button>

          <button
            onClick={() => setActiveTab('djmode')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition ${
              activeTab === 'djmode' ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span className="text-xs font-medium">DJ Mode</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
