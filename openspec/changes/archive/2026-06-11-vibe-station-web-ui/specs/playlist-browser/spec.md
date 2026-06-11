## ADDED Requirements

### Requirement: Fetch playlists from Spotify

The server SHALL expose `GET /api/playlists` that returns the current user's playlists by calling `GET /v1/me/playlists` with a valid access token. The response SHALL be `{ playlists: SpotifyPlaylist[] }` where each item contains at minimum `id`, `name`, `tracks.total`, and `external_urls.spotify`. Spotify returns the track count under the `items` field (the `/items` shape); the server SHALL normalize this to `tracks.total` so the client receives a consistent shape across the list, create, and re-vibe endpoints.

#### Scenario: Successful fetch

- **WHEN** the client calls `GET /api/playlists` with a valid token
- **THEN** the server returns HTTP 200 with the user's playlists array

#### Scenario: Unauthenticated request

- **WHEN** the client calls `GET /api/playlists` without a valid token
- **THEN** the server returns HTTP 401 with `{ "error": "Not authenticated" }`

### Requirement: Sidebar playlist list

The client SHALL display all playlists returned by `GET /api/playlists` in a scrollable sidebar. Each item SHALL show the playlist name and track count. The sidebar SHALL load playlists on initial dashboard render.

#### Scenario: Playlists displayed in sidebar

- **WHEN** the dashboard loads with a connected Spotify account
- **THEN** the sidebar shows all user playlists, each with name and track count

#### Scenario: Empty playlist library

- **WHEN** the user has no Spotify playlists
- **THEN** the sidebar shows an empty state message

### Requirement: Playlist selection

The client SHALL allow the user to select a playlist by clicking it in the sidebar. The selected playlist SHALL be highlighted with the primary amber border. Selecting a playlist SHALL update the now-playing panel.

#### Scenario: Clicking a playlist

- **WHEN** the user clicks a playlist in the sidebar
- **THEN** that playlist becomes selected (highlighted) and the now-playing panel updates to show it

### Requirement: "Vibe new playlist" CTA

The sidebar SHALL display a "⊕ vibe new playlist" button pinned at the bottom, always visible regardless of scroll position. Clicking it SHALL open the vibe-create modal.

#### Scenario: CTA always visible

- **WHEN** the sidebar has more playlists than fit in the viewport
- **THEN** the "⊕ vibe new playlist" button remains visible at the bottom while the playlist list scrolls above it
