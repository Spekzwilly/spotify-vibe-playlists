## Context

The project is a local TypeScript MCP server (`src/`) that creates Spotify playlists via Claude Desktop. It has three working modules: `token.ts` (PKCE OAuth token management), `spotify.ts` (Spotify API client), and `vibes.ts` (vibe → search query mapping). A one-shot OAuth script (`scripts/auth.ts`) handles the initial login. Everything runs locally; there is no server process or browser UI today.

The validated prototype (Amber Signal design, `prototype/`) was built during design exploration. It is throwaway code — the real implementation should be written from scratch using the prototype as a visual and behavioral reference.

## Goals / Non-Goals

**Goals:**

- Add a local web dashboard that works as a daily music companion
- Reuse all three existing `src/` modules without modification (except extending `spotify.ts` with two new functions)
- Replace the CLI-only OAuth script with a browser-based OAuth flow managed by Express
- Keep the MCP server fully operational alongside the web UI
- Ship as a single `npm run dev` command

**Non-Goals:**

- Deployment or public hosting
- Multi-user support or any access control
- Persisting the vibe log across browser sessions
- Playlist cover art or rich media metadata
- Automated tests

## Decisions

### Express wraps existing src/ modules — no duplication

The `server/` Express app imports directly from `src/token.ts` and `src/spotify.ts`. These modules already handle token lifecycle and Spotify API calls correctly. The server adds only the HTTP layer: routing, request parsing, error formatting, and the Anthropic API call.

Alternative considered: rewrite the token/Spotify logic in Python (FastAPI). Rejected because the working TypeScript modules are battle-tested and the OAuth PKCE refresh logic is subtle — duplicating it introduces risk with no benefit for a local tool.

### ANTHROPIC_API_KEY lives in .env, served only server-side

The Anthropic API key is read from `.env` at server startup and used only in the Express route handlers. It is never included in any HTTP response or served as a static asset. The React client calls `/api/vibe` — it never touches the Anthropic API directly.

### OAuth callback reuses existing PKCE flow from scripts/auth.ts

The Express OAuth handler (`GET /api/auth/callback`) follows the same pure PKCE pattern as `scripts/auth.ts`: exchanges the authorization code for tokens without a `client_secret`, saves to `~/.spotify-vibe-token.json`. The same local TLS certs (`certs/local.pem`, `certs/local-key.pem`) and redirect URI (`https://127.0.0.1.nip.io:8888/callback`) are reused.

Alternative considered: start a fresh HTTPS server on port 8888 just for the callback, identical to the current script. Rejected in favour of having Express listen on 8888 with TLS directly, keeping a single process.

### Re-vibe uses replace-in-place via DELETE then POST /items

Spotify does not have a single "replace all tracks" call. The sequence is: `DELETE /v1/playlists/{id}/items` (clear all) then `POST /v1/playlists/{id}/items` (add new). Both use `/items` — never `/tracks`, which is deprecated and returns 403 in Development Mode apps.

### Vibe log is session-only React state (not persisted)

The vibe log (`Record<playlistId, VibeLogEntry[]>`) lives in React state and is lost on page refresh. This is intentional for a local v1 — the Spotify playlist itself is the durable artefact. The log is informational feedback for the current session.

### Concurrently runs server and client in one terminal

`npm run dev` uses `concurrently` to start the Express server (port 8888, TLS) and the Vite dev server (port 5173) in parallel. Vite proxies `/api` requests to Express, so the React app always calls relative URLs.

## Implementation Contract

### API endpoints

All endpoints return JSON. Errors return `{ error: string }` with an appropriate HTTP status.

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/auth/status` | — | `{ connected: boolean }` |
| GET | `/api/auth/login` | — | 302 redirect to Spotify OAuth |
| GET | `/api/auth/callback` | `?code=&state=` query params | 302 redirect to `/` on success |
| GET | `/api/playlists` | — | `{ playlists: SpotifyPlaylist[] }` |
| POST | `/api/vibe` | `{ prompt: string }` | `{ playlist: SpotifyPlaylist, log: VibeLogEntry }` |
| POST | `/api/playlists/:id/revibe` | `{ prompt: string }` | `{ playlist: SpotifyPlaylist, log: VibeLogEntry }` |

### Data shapes

```ts
interface SpotifyPlaylist {
  id: string
  name: string
  tracks: { total: number }
  external_urls: { spotify: string }
}

interface VibeLogEntry {
  timestamp: string        // ISO 8601
  input: string            // raw user prompt
  steps: string[]          // human-readable Claude processing steps
}
```

### Auth gate behavior

On load, the React client calls `GET /api/auth/status`. If `connected: false`, the not-logged-in screen is shown. "CONNECT SPOTIFY" navigates to `GET /api/auth/login`. After successful callback, the client polls or redirects to `/` and re-checks status.

### Vibe log behavior

Each successful `POST /api/vibe` or `POST /api/playlists/:id/revibe` appends a `VibeLogEntry` to the client-side log for that playlist ID. Selecting a different playlist in the sidebar shows that playlist's log (empty if never vibed in this session).

### Acceptance criteria

1. `npm run dev` starts without errors; browser opens to `http://localhost:5173`
2. Not-logged-in screen visible on first run (no token file) with `○ NOT CONNECTED`
3. "CONNECT SPOTIFY" completes OAuth and redirects back; header shows `● CONNECTED`
4. Sidebar lists all user playlists fetched from Spotify
5. Selecting a playlist shows the Spotify iframe embed
6. "⊕ vibe new playlist" → enter prompt → new playlist appears in sidebar, vibe log populated
7. "re-vibe" → confirm → tracks replaced in-place, vibe log updated for that playlist
8. Refreshing the page clears the vibe log (session-only confirmed)

## Risks / Trade-offs

- [Risk] Local TLS cert expiry breaks OAuth callback → Mitigation: `mkcert` certs are long-lived; `README` documents renewal
- [Risk] Spotify Development Mode rate limits (1 req/sec) may slow `getPlaylists` for users with many playlists → Mitigation: paginate lazily, show playlists as they load
- [Risk] `~/spotify-vibe-token.json` shared between MCP server and Express; concurrent refresh could cause a race → Mitigation: both use the same `saveToken` function with atomic writes; race window is small for a single-user local tool, acceptable for v1
