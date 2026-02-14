'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Disc3, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { api, SpotifyTrack } from '../lib/api'

interface SongSearchProps {
  onSelect: (track: SpotifyTrack | null, manualTitle?: string, manualArtist?: string) => void
  disabled?: boolean
}

export default function SongSearch({ onSelect, disabled }: SongSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [isManualMode, setIsManualMode] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualArtist, setManualArtist] = useState('')
  const [error, setError] = useState<string | null>(null)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length >= 2 && !selectedTrack) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTracks(query)
      }, 500)
    } else {
      setResults([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, selectedTrack, searchTracks])

  // Update parent when manual input changes
  useEffect(() => {
    if (isManualMode && manualTitle.trim()) {
      onSelect(null, manualTitle, manualArtist || undefined)
    }
  }, [isManualMode, manualTitle, manualArtist, onSelect])

  const handleSelectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track)
    setQuery('')
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
  }

  const handleSwitchToSearch = () => {
    setIsManualMode(false)
    setManualTitle('')
    setManualArtist('')
    onSelect(null)
  }

  // Manual input mode
  if (isManualMode) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Manual Entry</span>
          <button
            type="button"
            onClick={handleSwitchToSearch}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Search Spotify instead
          </button>
        </div>

        <Input
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
          placeholder="Song title *"
          disabled={disabled}
          className="h-12 rounded-xl bg-card border-border focus-visible:ring-primary"
        />

        <Input
          value={manualArtist}
          onChange={(e) => setManualArtist(e.target.value)}
          placeholder="Artist (optional)"
          disabled={disabled}
          className="h-12 rounded-xl bg-card border-border focus-visible:ring-primary"
        />
      </div>
    )
  }

  // Selected track display
  if (selectedTrack) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">Selected Song</span>
        <div className="flex items-center gap-3 rounded-xl bg-card p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Check className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium text-primary truncate">
              {selectedTrack.name}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {selectedTrack.artists.join(', ')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={disabled}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // Search mode
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Search for a song</span>
        <button
          type="button"
          onClick={handleSwitchToManual}
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Enter manually
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs or artists..."
          disabled={disabled}
          className="h-12 rounded-xl bg-card pl-10 border-border placeholder:text-muted-foreground focus-visible:ring-primary"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-accent">{error} — Try entering manually</p>
      )}

      {/* Search results list */}
      {results.length > 0 && (
        <div className="flex flex-col gap-1">
          {results.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => handleSelectTrack(track)}
              className="flex items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary overflow-hidden">
                {track.image_url ? (
                  <img
                    src={track.image_url}
                    alt={track.album}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <Disc3 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-foreground truncate">
                  {track.name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {track.artists.join(', ')} · {track.album}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {query.trim() && !loading && results.length === 0 && !error && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Disc3 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No songs found</p>
          <button
            type="button"
            onClick={handleSwitchToManual}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Enter song manually
          </button>
        </div>
      )}
    </div>
  )
}
