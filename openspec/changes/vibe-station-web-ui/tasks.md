<!--
Each task description MUST state:
- the behavior or contract being delivered (what is observably true when the
  task is complete), and
- the verification target that proves completion (test, CLI invocation,
  analyzer check, manual assertion, or content review).

File paths are supporting context for locating the work, never the task
itself. "Edit file X" is not a valid task — it is missing both behavior and
verification.
-->

## 1. Project Setup

- [x] 1.1 Install server dependencies (express, cors, @anthropic-ai/sdk, concurrently, tsx) and client dependencies (react, react-dom, vite, @vitejs/plugin-react) so that `npm install` succeeds with no missing-module errors at runtime. Verify: `npm install` exits 0 and `node -e "require('express')"` succeeds.
- [x] 1.2 Add `npm run dev` script using concurrently runs server and client in one terminal: Express on port 8888 with TLS and Vite on port 5173. Add `npm run build` for the client. Verify: `npm run dev` starts both processes; both ports respond.
- [x] 1.3 Configure Vite to proxy `/api` requests to `https://localhost:8888` so the React client uses relative URLs in development. Verify: a browser request to `http://localhost:5173/api/auth/status` reaches the Express server.
- [x] 1.4 Extend `src/spotify.ts` with `getPlaylists(token)` (calls `GET /v1/me/playlists`) and `replacePlaylistTracks(token, playlistId, uris[])` (clears then refills via `/items`, never `/tracks`). These data shapes and API endpoints — `GET /api/auth/status`, `GET /api/auth/login`, `GET /api/auth/callback`, `GET /api/playlists`, `POST /api/vibe`, `POST /api/playlists/:id/revibe` — are the implementation contract for the server layer. Verify: `getPlaylists` returns a playlist array; `replacePlaylistTracks` issues DELETE then POST to `/v1/playlists/{id}/items`.

## 2. Express wraps existing src/ modules — no duplication

- [x] 2.1 Bootstrap `server/index.ts` as an Express app importing from `src/token.ts` and `src/spotify.ts`. Server listens on port 8888 using the local TLS certs (`certs/local.pem` / `certs/local-key.pem`). ANTHROPIC_API_KEY lives in .env, served only server-side and never forwarded to the client. Verify: `npx tsx server/index.ts` starts without errors; `curl -k https://localhost:8888/api/auth/status` returns JSON; no key appears in any HTTP response body.

## 3. Spotify Auth — Auth status endpoint

- [x] 3.1 Implement auth status endpoint `GET /api/auth/status` returning `{ connected: boolean }`. `connected` is `true` only when `~/.spotify-vibe-token.json` exists and is not expired. This is the auth gate behavior the client polls on load. Verify: with no token file returns `{ "connected": false }`; with a valid token returns `{ "connected": true }`.

## 4. Spotify Auth — Browser OAuth login flow

- [x] 4.1 Implement browser OAuth login flow at `GET /api/auth/login`: redirects to Spotify authorization URL using PKCE (code_challenge_method=S256, no client_secret). OAuth callback reuses existing PKCE flow from scripts/auth.ts: redirect URI `https://127.0.0.1.nip.io:8888/callback`, same local TLS certs. Verify: navigating to `/api/auth/login` redirects to `accounts.spotify.com/authorize` with correct PKCE query parameters.

## 5. Spotify Auth — OAuth callback handler

- [x] 5.1 Implement OAuth callback handler at `GET /api/auth/callback`: exchanges the authorization code using pure PKCE (client_id in body, no Authorization header), saves token to `~/.spotify-vibe-token.json`, redirects to `/`. On error param returns HTTP 400 with no token written. Verify: completing the flow saves the token and redirects to the SPA; error param returns 400.

## 6. Playlist Browser — Fetch playlists from Spotify

- [x] 6.1 Implement fetch playlists from Spotify: `GET /api/playlists` returns `{ playlists: SpotifyPlaylist[] }` via `getPlaylists` from `src/spotify.ts`. Returns HTTP 401 when no valid token exists. Verify: valid token returns the user's playlist array; no token returns 401.

## 7. Client Auth Gate — Client auth gate

- [x] 7.1 Implement client auth gate in the React `App` component: calls `GET /api/auth/status` on mount, renders the not-logged-in screen when `connected: false` and the dashboard when `connected: true`. Auth gate behavior: not-logged-in screen shows `○ NOT CONNECTED` and a "CONNECT SPOTIFY" button; button navigates to `GET /api/auth/login`. Verify: app without token shows the not-logged-in screen; after OAuth, dashboard appears with `● CONNECTED`.

## 8. Client Foundation — Amber Signal visual design

- [x] 8.1 Implement Amber Signal visual design system as global CSS: background `#060400`, primary `#ffd700`, orange `#ff9900`, `Share Tech Mono` monospace for all text, hard `1px solid` borders, no border-radius, CRT scanline overlay via CSS `::after`. Verify: all rendered UI uses the correct colors and font; no rounded corners visible anywhere.
- [x] 8.2 Implement the application header showing `=== VIBE STATION v1.0 ===` and connection status. Connection status in header shows `● CONNECTED` (amber) when authenticated and `○ NOT CONNECTED` (dimmed) when not. Verify: header status updates correctly on both connected and disconnected states.

## 9. Playlist Browser — Sidebar playlist list and playlist selection

- [x] 9.1 Implement sidebar playlist list in the `Sidebar` component: fetches from `GET /api/playlists`, renders a scrollable list showing name and track count per item with `[01]` index prefix. Playlist selection highlights the chosen item with the primary amber left border and updates the now-playing panel. Verify: sidebar shows all user playlists; clicking any item selects it and the now-playing panel updates.
- [x] 9.2 Implement the "Vibe new playlist" CTA — "⊕ vibe new playlist" button pinned at the bottom of the sidebar, always visible regardless of list scroll. Clicking opens the vibe-create modal. Verify: button remains visible when the list overflows; clicking opens the modal.

## 10. Now Playing — Now-playing panel layout and Spotify iframe embed

- [x] 10.1 Implement now-playing panel layout in the `NowPlaying` component with this exact vertical order: panel header ("=== NOW PLAYING ==="), Spotify iframe embed (`https://open.spotify.com/embed/playlist/{id}`), re-vibe CTA strip sharing the embed's bottom border, vibe log section. Embed updates whenever the selected playlist changes. Verify: layout order is correct; embed URL changes when a different playlist is selected.

## 11. Now Playing — Re-vibe CTA placement

- [x] 11.1 Implement re-vibe CTA placement: "⟳ re-vibe this playlist" strip directly below and visually attached to the Spotify embed (sharing its bottom border). Clicking opens the re-vibe confirmation modal without making any API call. Verify: CTA is positioned below the embed with a shared border; clicking opens the confirmation modal only.

## 12. Vibe Create — Vibe create endpoint

- [x] 12.1 Implement vibe create endpoint `POST /api/vibe` accepting `{ prompt: string }`. Calls Anthropic API with `create_vibe_playlist` tool definition, executes tool call server-side (Spotify search + create + add tracks via `/items`), returns `{ playlist: SpotifyPlaylist, log: VibeLogEntry }`. ANTHROPIC_API_KEY lives in .env, served only server-side. Returns 400 on missing prompt, 502 on Anthropic error. Verify: valid prompt creates a Spotify playlist and returns structured log with processing steps; empty prompt returns 400.

## 13. Vibe Create — Vibe create modal, new playlist auto-selected, and per-playlist vibe log

- [x] 13.1 Implement vibe create modal (`VibeModal`): NL text input and "[VIBE]" / "[CANCEL]" buttons. On submit, calls `POST /api/vibe`, closes modal on success, new playlist auto-selected in the sidebar. Enter key submits. Verify: submitting a prompt creates a playlist, closes the modal, and the new playlist is auto-selected and visible in the sidebar.
- [x] 13.2 Implement per-playlist vibe log in the now-playing panel: vibe log is session-only React state (not persisted) keyed by playlist ID. Each successful `POST /api/vibe` appends a `VibeLogEntry` to that playlist's log. Switching playlists shows the selected playlist's own log. Vibe log behavior: empty playlists show "no vibe history for this playlist". Verify: new playlist shows vibe log entries; switching to an unvibed playlist shows the empty message; page refresh clears all logs.

## 14. Vibe Revibe — Revibe endpoint

- [x] 14.1 Implement revibe endpoint `POST /api/playlists/:id/revibe` accepting `{ prompt: string }`. Re-vibe uses replace-in-place via DELETE then POST /items: clears all existing tracks via `DELETE /v1/playlists/{id}/items` then adds new tracks via `POST /v1/playlists/{id}/items` (never `/tracks`). Returns `{ playlist, log }`. Returns 404 when playlist not found. Verify: revibe clears and replaces all tracks; the DELETE+POST sequence only touches `/items` endpoints; 404 returned for unknown playlist.

## 15. Vibe Revibe — Re-vibe confirmation modal and vibe log updated after revibe

- [x] 15.1 Implement re-vibe confirmation modal (`RevibeModal`): shows target playlist name, track count, "THIS ACTION CANNOT BE UNDONE" warning, NL input for new vibe, "[EXECUTE]" and "[CANCEL]" buttons. "[CANCEL]" makes no API call. "[EXECUTE]" calls `POST /api/playlists/:id/revibe` and vibe log updated after revibe: appends the returned `VibeLogEntry` to the session log for that playlist. Verify: modal shows correct playlist info; Cancel makes no call; Execute updates the playlist and appends to vibe log.

## 16. Acceptance Criteria Verification

- [x] 16.1 Manually verify all acceptance criteria from the design: (1) `npm run dev` starts cleanly, (2) not-logged-in screen shows `○ NOT CONNECTED`, (3) OAuth completes and redirects with `● CONNECTED`, (4) playlists load in sidebar, (5) selecting a playlist shows the embed, (6) "⊕ vibe new playlist" creates a playlist and shows vibe log, (7) "re-vibe" replaces tracks and updates log, (8) page refresh clears the vibe log (session-only confirmed). Verify: all 8 criteria pass manually.

## 17. Cleanup

- [x] 17.1 Delete the `prototype/` directory now that the real `client/` is built. Verify: `ls prototype/` returns "no such file or directory"; `npm run dev` still starts correctly.
