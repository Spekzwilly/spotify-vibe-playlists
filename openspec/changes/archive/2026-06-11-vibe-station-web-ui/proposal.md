## Why

The Spotify Vibe Playlists MCP server creates playlists through Claude Desktop, but the experience is invisible — users cannot browse their playlists, see playback, get feedback on what Claude decided, or re-vibe a playlist without going through Claude Desktop. A visual dashboard makes the tool genuinely usable as a daily music companion.

## What Changes

- New `server/` directory: Express backend exposing REST API endpoints wrapping existing `src/token.ts` and `src/spotify.ts` modules
- New `client/` directory: React + Vite frontend with the Amber Signal retro HUD design
- Two new Spotify functions added: `getPlaylists` and `replacePlaylistTracks`
- Spotify OAuth PKCE flow adapted for Express (was CLI-only in `scripts/auth.ts`)
- New `npm run dev` script starting both server and client concurrently

## Capabilities

### New Capabilities

- `spotify-auth`: Browser-based Spotify OAuth PKCE flow managed by Express; token status exposed via `/api/auth/status`; auth gate on the React client renders not-logged-in screen when disconnected
- `playlist-browser`: Sidebar listing all user Spotify playlists fetched live from `GET /v1/me/playlists`; selection drives the now-playing panel
- `vibe-create`: NL input modal (triggered by "⊕ vibe new playlist" CTA) → Express calls Anthropic API with `create_vibe_playlist` tool → Spotify playlist created → per-playlist vibe log populated with Claude's processing steps
- `vibe-revibe`: Re-vibe flow replacing all tracks in an existing playlist in-place; confirmation modal warns before overwrite; vibe log updated with new Claude response
- `now-playing`: Selected playlist displayed via Spotify iframe embed; re-vibe CTA positioned directly below the embed

### Modified Capabilities

(none)

## Impact

- Affected code: `src/spotify.ts` (two new exported functions), `package.json` (new scripts and dependencies)
- New directories: `server/`, `client/`
- External dependencies: `express`, `@anthropic-ai/sdk`, `cors`, `vite`, `react`, `react-dom`, `concurrently`
- Local TLS certs (`certs/`) already present — reused by Express OAuth callback server
- Token file `~/.spotify-vibe-token.json` shared between MCP server and web server
- `ANTHROPIC_API_KEY` added to `.env` (alongside existing `SPOTIFY_CLIENT_ID`)
