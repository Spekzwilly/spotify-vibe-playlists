export interface SpotifyPlaylist {
  id: string
  name: string
  tracks: { total: number }
  external_urls: { spotify: string }
}

export interface VibeLogEntry {
  timestamp: string
  input: string
  steps: string[]
}
