# spotify-vibe-playlists — Claude Instructions

## Project overview

Local MCP server that creates Spotify playlists from vibe descriptions. Runs via `npx tsx src/index.ts`, registered in Claude Desktop's `claude_desktop_config.json`.

## Key files

| File | Purpose |
|------|---------|
| `src/index.ts` | MCP server — defines the `create_vibe_playlist` tool |
| `src/spotify.ts` | Spotify API client (search, createPlaylist, addTracksToPlaylist) |
| `src/token.ts` | Token read/refresh logic — reads `~/.spotify-vibe-token.json` |
| `src/vibes.ts` | Vibe → search query mapping + `buildSearchQuery()` |
| `scripts/auth.ts` | One-shot OAuth PKCE flow — saves token to disk |
| `scripts/test-auth.ts` | 4-step API diagnostic (me, search, create, add-items) |
| `server/index.ts` | Vibe Station web API (Express) — auth, playlists, `/api/vibe`, `/api/playlists/:id/revibe` |
| `client/` | Vibe Station web UI (React + Vite); calls the API via relative `/api` paths |
| `render.yaml` | Render blueprint for deploying the web app |

## Critical API note

Spotify deprecated `POST /v1/playlists/{id}/tracks` — it returns 403 for Development Mode apps.
Use `POST /v1/playlists/{id}/items` instead (already in the code). Same request body `{ uris }`.
Same applies to GET/PUT/DELETE — always use `/items`, never `/tracks`.

## Auth flow

Uses **pure PKCE** (no client_secret in token exchange or refresh). The `show_dialog=true` parameter forces the consent screen each time, ensuring scopes are properly granted. Granted scopes: `playlist-modify-public playlist-modify-private playlist-read-private user-read-private user-read-email`.

Token refresh in `src/token.ts` also uses pure PKCE (client_id in body, no Authorization header).

## Spotify Developer App requirements

- App must be in **Development Mode** with the user's Spotify email added to User Management
- Redirect URI: `https://127.0.0.1.nip.io:8888/callback`
- Local certs required at `certs/local.pem` and `certs/local-key.pem` (use mkcert)

## .env loading

`src/index.ts` loads `.env` at startup but **does not overwrite** env vars already set by the parent process (Claude Desktop injects `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` via the `env` block in `claude_desktop_config.json`).

## Error handling

Each API call has its own labeled try/catch in `src/index.ts`. Errors surface as `Error at {step}: {detail}` where step is `search`, `create-playlist`, or `add-tracks [{playlist_id}]`.

## Deployment (Render)

The Vibe Station web app is deployed live at **https://vibe-station-rcjx.onrender.com** via `render.yaml`.

`server/index.ts` branches on `NODE_ENV === "production"` (`IS_PROD`):
- **prod** — serves the built `client/dist` from the same origin, listens on `$PORT` over plain HTTP (Render terminates TLS at its edge), redirects the OAuth callback to `/`, skips CORS.
- **dev** — HTTPS on 8888 with mkcert certs, callback redirects to `:5173`, CORS allows `:5173`.

`npm run build` builds the client (forces `--include=dev` since Render sets `NODE_ENV=production`); `npm run serve` runs the server. `tsx` lives in `dependencies` so it survives Render's prod prune.

Render env vars: `SPOTIFY_CLIENT_ID`, `ANTHROPIC_API_KEY`, `SPOTIFY_REDIRECT_URI` (= `https://<service>.onrender.com/callback`, also registered in the Spotify dashboard).

**Free-tier caveat:** filesystem is ephemeral, so the token at `~/.spotify-vibe-token.json` is wiped on every spin-down/deploy → periodic re-auth is expected. A durable token needs a paid instance + Persistent Disk.

## Debugging

Run `npx tsx scripts/test-auth.ts` to test all 4 API calls from the CLI before touching Claude Desktop.
