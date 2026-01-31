import { useState, useEffect, useRef, useCallback } from 'react'
import { api, SpotifyTrack } from '../lib/api'

interface SongSearchProps {
  onSelect: (track: SpotifyTrack | null, manualTitle?: string, manualArtist?: string) => void
  disabled?: boolean
}

export default function SongSearch({ onSelect, disabled }: SongSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [isManualMode, setIsManualMode] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualArtist, setManualArtist] = useState('')
  const [error, setError] = useState<string | null>(null)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced search
  const searchTracks = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const tracks = await api.spotify.search(searchQuery, 8)
      setResults(tracks)
    } catch (err) {
      console.error('Spotify search failed:', err)
      setError('Search unavailable')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle query changes with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim() && !selectedTrack) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTracks(query)
      }, 300)
    } else {
      setResults([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, selectedTrack, searchTracks])

  // Click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track)
    setQuery(track.name)
    setShowResults(false)
    setResults([])
    onSelect(track)
  }

  const handleClearSelection = () => {
    setSelectedTrack(null)
    setQuery('')
    setResults([])
    onSelect(null)
  }

  const handleSwitchToManual = () => {
    setIsManualMode(true)
    setSelectedTrack(null)
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  const handleSwitchToSearch = () => {
    setIsManualMode(false)
    setManualTitle('')
    setManualArtist('')
    onSelect(null)
  }

  // Update parent when manual input changes
  useEffect(() => {
    if (isManualMode && manualTitle.trim()) {
      onSelect(null, manualTitle, manualArtist || undefined)
    }
  }, [isManualMode, manualTitle, manualArtist, onSelect])

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Manual input mode
  if (isManualMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-400">Manual Entry</label>
          <button
            type="button"
            onClick={handleSwitchToSearch}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            Search Spotify instead
          </button>
        </div>

        <input
          type="text"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
          placeholder="Song title *"
          disabled={disabled}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none disabled:opacity-50"
          required
        />

        <input
          type="text"
          value={manualArtist}
          onChange={(e) => setManualArtist(e.target.value)}
          placeholder="Artist (optional)"
          disabled={disabled}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none disabled:opacity-50"
        />
      </div>
    )
  }

  // Selected track display
  if (selectedTrack) {
    return (
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Selected Song</label>
        <div className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg">
          {selectedTrack.image_url && (
            <img
              src={selectedTrack.image_url}
              alt={selectedTrack.album}
              className="w-12 h-12 rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedTrack.name}</p>
            <p className="text-sm text-gray-400 truncate">
              {selectedTrack.artists.join(', ')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Search mode
  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-400">Search for a song</label>
        <button
          type="button"
          onClick={handleSwitchToManual}
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          Enter manually
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search by song or artist..."
          disabled={disabled}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none disabled:opacity-50 pr-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-yellow-500">{error} - Try entering manually</p>
      )}

      {/* Search results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {results.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => handleSelectTrack(track)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition text-left"
            >
              {track.image_url ? (
                <img
                  src={track.image_url}
                  alt={track.album}
                  className="w-10 h-10 rounded flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-600 rounded flex-shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{track.name}</p>
                <p className="text-sm text-gray-400 truncate">
                  {track.artists.join(', ')} · {track.album}
                </p>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatDuration(track.duration_ms)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showResults && query.trim() && !loading && results.length === 0 && !error && (
        <div className="absolute z-10 w-full mt-1 p-4 bg-gray-800 border border-gray-700 rounded-lg text-center">
          <p className="text-gray-400">No results found</p>
          <button
            type="button"
            onClick={handleSwitchToManual}
            className="mt-2 text-sm text-purple-400 hover:text-purple-300"
          >
            Enter song manually
          </button>
        </div>
      )}
    </div>
  )
}
