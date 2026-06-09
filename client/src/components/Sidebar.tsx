import { SpotifyPlaylist } from '../types'

interface Props {
  playlists: SpotifyPlaylist[]
  selected: SpotifyPlaylist | null
  onSelect: (p: SpotifyPlaylist) => void
  onVibeNew: () => void
}

export default function Sidebar({ playlists, selected, onSelect, onVibeNew }: Props) {
  return (
    <div style={{
      borderRight: '1px solid #ffd70028',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#060400',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #ffd70028',
        color: '#ff9900',
        fontSize: '13px',
        flexShrink: 0,
      }}>
        === PLAYLISTS [ {playlists.length} ] ===
      </div>

      {/* Scrollable playlist list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {playlists.length === 0 && (
          <div style={{ padding: '16px 14px', color: '#ffd70033', fontSize: '12px' }}>
            no playlists found.
          </div>
        )}
        {playlists.map((p, idx) => {
          const isSelected = selected?.id === p.id
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p)}
              style={{
                padding: '10px 14px',
                borderLeft: `2px solid ${isSelected ? '#ffd700' : 'transparent'}`,
                background: isSelected ? '#ffd70010' : 'transparent',
                cursor: 'pointer',
                borderBottom: '1px solid #ffd70010',
              }}
            >
              <div style={{
                color: isSelected ? '#ffd700' : '#ffd70066',
                fontSize: '13px',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                [{String(idx + 1).padStart(2, '0')}] {p.name}
              </div>
              <div style={{
                color: '#ffd70033',
                fontSize: '11px',
                paddingLeft: '22px',
                marginTop: '2px',
              }}>
                {p.tracks.total} tracks
              </div>
            </div>
          )
        })}
      </div>

      {/* Pinned vibe new playlist CTA */}
      <div
        onClick={onVibeNew}
        style={{
          padding: '13px 16px',
          borderTop: '1px solid #ffd70030',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          background: '#0a0700',
          color: '#ff9900',
          fontSize: '14px',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '20px', lineHeight: 1, color: '#ffd700' }}>⊕</span>
        <span>vibe new playlist</span>
      </div>
    </div>
  )
}
