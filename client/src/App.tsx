import { useState, useEffect, useCallback } from 'react'
import { SpotifyPlaylist, VibeLogEntry } from './types'
import Sidebar from './components/Sidebar'
import NowPlaying from './components/NowPlaying'
import VibeModal from './components/VibeModal'
import RevibeModal from './components/RevibeModal'

type VibeLogs = Record<string, VibeLogEntry[]>

export default function App() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [selected, setSelected] = useState<SpotifyPlaylist | null>(null)
  const [vibeLogs, setVibeLogs] = useState<VibeLogs>({})
  const [vibeModalOpen, setVibeModalOpen] = useState(false)
  const [revibeModalOpen, setRevibeModalOpen] = useState(false)

  const checkStatus = useCallback(async () => {
    const res = await fetch('/api/auth/status')
    const data = await res.json() as { connected: boolean }
    setConnected(data.connected)
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const loadPlaylists = useCallback(async () => {
    const res = await fetch('/api/playlists')
    if (!res.ok) return
    const data = await res.json() as { playlists: SpotifyPlaylist[] }
    setPlaylists(data.playlists)
    if (!selected && data.playlists.length > 0) {
      setSelected(data.playlists[0])
    }
  }, [selected])

  useEffect(() => {
    if (connected) loadPlaylists()
  }, [connected, loadPlaylists])

  const appendLog = (playlistId: string, entry: VibeLogEntry) => {
    setVibeLogs(prev => ({
      ...prev,
      [playlistId]: [...(prev[playlistId] ?? []), entry],
    }))
  }

  const handleVibeCreated = (playlist: SpotifyPlaylist, log: VibeLogEntry) => {
    setPlaylists(prev => [...prev, playlist])
    appendLog(playlist.id, log)
    setSelected(playlist)
  }

  const handleRevibed = (playlist: SpotifyPlaylist, log: VibeLogEntry) => {
    setPlaylists(prev => prev.map(p => p.id === playlist.id ? playlist : p))
    appendLog(playlist.id, log)
    setSelected(playlist)
  }

  if (connected === null) {
    return (
      <div className="scanlines" style={{ height: '100vh', background: '#060400', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#ffd70044', letterSpacing: '4px', fontSize: '12px' }}>INITIALIZING...</span>
      </div>
    )
  }

  return (
    <div className="scanlines" style={{
      display: 'grid',
      gridTemplateRows: '40px 1fr',
      height: '100vh',
      background: '#060400',
      color: '#ffd700',
      fontFamily: "'Share Tech Mono', monospace",
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        borderBottom: '1px solid #ffd70030',
        background: '#0a0700',
        fontSize: '13px',
        flexShrink: 0,
      }}>
        <span style={{ color: '#ff9900' }}>
          === VIBE STATION v1.0 ===
        </span>
        <div style={{ display: 'flex', gap: '18px', color: '#ffd70066' }}>
          <span>
            [ SPOTIFY{' '}
            <span style={{ color: connected ? '#ffd700' : '#ffd70033' }}>
              {connected ? '●' : '○'}
            </span>
            {' '}{connected ? 'CONNECTED' : 'NOT CONNECTED'} ]
          </span>
          <span>[ CLAUDE <span style={{ color: '#ffd700' }}>●</span> READY ]</span>
        </div>
      </div>

      {/* Not connected */}
      {!connected && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#060400',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '420px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '6px', color: '#ffd70033', marginBottom: '20px' }}>
              ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈
            </div>
            <div style={{ fontSize: '22px', color: '#ff9900', marginBottom: '6px', letterSpacing: '2px' }}>
              VIBE STATION
            </div>
            <div style={{ fontSize: '12px', color: '#ffd70033', marginBottom: '32px', letterSpacing: '4px' }}>
              v1.0 · LOCAL NODE
            </div>
            <div style={{
              border: '1px solid #ffd70028',
              padding: '24px',
              marginBottom: '28px',
              background: '#0a0700',
            }}>
              <div style={{ fontSize: '11px', color: '#ffd70044', marginBottom: '12px' }}>STATUS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#ffd70055' }}>SPOTIFY</span>
                  <span style={{ color: '#ffd70033' }}>○ NOT CONNECTED</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#ffd70055' }}>CLAUDE</span>
                  <span style={{ color: '#ffd700' }}>● READY</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#ffd70044', marginBottom: '20px', lineHeight: 1.8 }}>
              connect your spotify account<br />to start vibing.
            </div>
            <a
              href="/api/auth/login"
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                background: '#ffd700',
                color: '#060400',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '2px',
                fontFamily: "'Share Tech Mono', monospace",
                textDecoration: 'none',
              }}
            >
              ⊕ CONNECT SPOTIFY
            </a>
            <div style={{ fontSize: '10px', color: '#ffd70022', marginTop: '20px' }}>
              ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈ ◈
            </div>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {connected && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', overflow: 'hidden' }}>
          <Sidebar
            playlists={playlists}
            selected={selected}
            onSelect={setSelected}
            onVibeNew={() => setVibeModalOpen(true)}
          />
          <NowPlaying
            playlist={selected}
            vibeLog={selected ? (vibeLogs[selected.id] ?? []) : []}
            onRevibe={() => setRevibeModalOpen(true)}
          />
        </div>
      )}

      {vibeModalOpen && (
        <VibeModal
          onClose={() => setVibeModalOpen(false)}
          onCreated={handleVibeCreated}
        />
      )}

      {revibeModalOpen && selected && (
        <RevibeModal
          playlist={selected}
          onClose={() => setRevibeModalOpen(false)}
          onRevibed={handleRevibed}
        />
      )}
    </div>
  )
}
