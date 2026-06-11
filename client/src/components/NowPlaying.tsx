import { SpotifyPlaylist, VibeLogEntry } from '../types'

interface Props {
  playlist: SpotifyPlaylist | null
  vibeLog: VibeLogEntry[]
  onRevibe: () => void
}

function logLineColor(line: string): string {
  if (line.startsWith('RESULT') || line.startsWith('VIBE REQUEST') || line.startsWith('RE-VIBE REQUEST')) return '#ff9900'
  if (line.startsWith('"')) return '#ffd700'
  if (line.startsWith('→')) return '#ffd700cc'
  if (line.includes('✓')) return '#ffd700'
  if (line.startsWith('  ')) return '#ffd70099'
  if (line === '' || line === ' ') return 'transparent'
  return '#ffd70055'
}

export default function NowPlaying({ playlist, vibeLog, onRevibe }: Props) {
  const embedUrl = playlist
    ? `https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator&theme=0`
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#060400' }}>

      {/* Panel header */}
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid #ffd70028',
        color: '#ff9900',
        fontSize: '13px',
        flexShrink: 0,
      }}>
        === NOW PLAYING ===
      </div>

      {/* Spotify embed */}
      <div style={{
        border: '1px solid #ffd70028',
        margin: '14px 18px 0',
        flexShrink: 0,
      }}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            width="100%"
            height="160"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ display: 'block', border: 'none' }}
          />
        ) : (
          <div style={{
            height: '160px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '8px',
            background: '#060400',
          }}>
            <span style={{ fontSize: '34px', color: '#ffd70044' }}>▶</span>
            <span style={{ fontSize: '11px', letterSpacing: '4px', color: '#ffd70022' }}>NO PLAYLIST SELECTED</span>
          </div>
        )}
      </div>

      {/* Re-vibe CTA — shares embed's bottom border */}
      <div
        onClick={playlist ? onRevibe : undefined}
        style={{
          margin: '0 18px',
          padding: '8px 12px',
          border: '1px solid #ffd70028',
          borderTop: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: playlist ? 'pointer' : 'not-allowed',
          color: playlist ? '#ffd70066' : '#ffd70022',
          fontSize: '12px',
          background: '#0a0700',
          flexShrink: 0,
        }}
      >
        <span style={{ color: playlist ? '#ff9900' : '#ff990044' }}>⟳</span>
        <span>[ R ] re-vibe this playlist</span>
      </div>

      {/* Vibe log section */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        marginTop: '14px',
      }}>
        <div style={{
          padding: '0 18px 8px',
          borderBottom: '1px solid #ffd70028',
          color: '#ff9900',
          fontSize: '13px',
          flexShrink: 0,
        }}>
          === VIBE LOG ===
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 40px' }}>
          {vibeLog.length === 0 ? (
            <div style={{ color: '#ffd70022', fontSize: '13px', fontStyle: 'italic' }}>
              no vibe history for this playlist.
            </div>
          ) : (
            vibeLog.map((entry, ei) => (
              <div key={ei} style={{ marginBottom: '20px' }}>
                <div style={{ color: '#ff9900', fontSize: '12px', marginBottom: '8px' }}>
                  [{String(ei + 1).padStart(2, '0')}] {entry.timestamp.slice(0, 19).replace('T', ' ')}
                </div>
                {entry.steps.map((line, li) => (
                  <div key={li} style={{
                    fontSize: '12px',
                    lineHeight: 1.7,
                    fontFamily: "'Share Tech Mono', monospace",
                    color: logLineColor(line),
                  }}>
                    {line || ' '}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
