import { useState, KeyboardEvent } from 'react'
import { SpotifyPlaylist, VibeLogEntry } from '../types'

interface Props {
  onClose: () => void
  onCreated: (playlist: SpotifyPlaylist, log: VibeLogEntry) => void
}

export default function VibeModal({ onClose, onCreated }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const prompt = input.trim()
    if (!prompt || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/vibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json() as { playlist?: SpotifyPlaylist; log?: VibeLogEntry; error?: string }
      if (!res.ok || !data.playlist || !data.log) {
        setError(data.error ?? 'Unexpected error')
        return
      }
      onCreated(data.playlist, data.log)
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#060400e8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
    }}>
      <div style={{
        background: '#0a0700',
        border: '1px solid #ffd700',
        width: '540px',
        padding: '28px',
        outline: '1px solid #ffd70022',
        outlineOffset: '4px',
      }}>
        <div style={{ color: '#ff9900', marginBottom: '6px', fontSize: '13px' }}>
          === VIBE NEW PLAYLIST ===
        </div>
        <div style={{ fontSize: '12px', color: '#ffd70044', marginBottom: '18px' }}>
          describe the vibe — claude will search spotify and build the playlist.
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
          <span style={{ color: '#ff9900', fontSize: '16px', flexShrink: 0 }}>{'>'}</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. late night coding, lofi chill, 45 mins..."
            autoFocus
            disabled={loading}
            style={{
              flex: 1,
              background: '#060400',
              border: '1px solid #ffd70030',
              color: '#ffd700',
              padding: '9px 12px',
              fontSize: '14px',
              outline: 'none',
              opacity: loading ? 0.6 : 1,
            }}
          />
        </div>

        {error && (
          <div style={{ color: '#ff9900', fontSize: '12px', marginBottom: '12px', padding: '6px 8px', border: '1px solid #ff990040' }}>
            ⚠ {error}
          </div>
        )}

        {loading && (
          <div style={{ color: '#ffd70066', fontSize: '12px', marginBottom: '12px' }}>
            → claude is vibing...
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 18px',
              background: 'transparent',
              border: '1px solid #ffd70028',
              color: '#ffd70044',
              fontSize: '13px',
            }}
          >
            [CANCEL]
          </button>
          <button
            onClick={submit}
            disabled={loading || !input.trim()}
            style={{
              padding: '8px 18px',
              background: loading || !input.trim() ? '#ffd70066' : '#ffd700',
              border: 'none',
              color: '#060400',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {loading ? '...' : '[VIBE]'}
          </button>
        </div>
      </div>
    </div>
  )
}
