# spotify-auth Specification

## Purpose

TBD - created by archiving change 'vibe-station-web-ui'. Update Purpose after archive.

## Requirements

### Requirement: Auth status endpoint

The server SHALL expose `GET /api/auth/status` returning `{ connected: boolean }`. `connected` is `true` when a valid token file exists at `~/.spotify-vibe-token.json` and the access token is not expired (or can be silently refreshed).

#### Scenario: Token file absent

- **WHEN** no token file exists at `~/.spotify-vibe-token.json`
- **THEN** `GET /api/auth/status` returns `{ "connected": false }` with HTTP 200

#### Scenario: Token file present and valid

- **WHEN** a valid non-expired token exists
- **THEN** `GET /api/auth/status` returns `{ "connected": true }` with HTTP 200

#### Scenario: Token expired but refreshable

- **WHEN** the access token is expired but a valid `refresh_token` is present on disk
- **THEN** the server silently refreshes the token and `GET /api/auth/status` returns `{ "connected": true }` with HTTP 200 (the user is not forced to re-authenticate)


<!-- @trace
source: vibe-station-web-ui
updated: 2026-06-11
code:
  - .DS_Store
-->

---
### Requirement: Browser OAuth login flow

The server SHALL expose `GET /api/auth/login` that redirects the browser to the Spotify authorization URL using PKCE (no client_secret). The redirect URI SHALL be `https://127.0.0.1.nip.io:8888/callback`. The server SHALL listen on port 8888 with the local TLS certificates at `certs/local.pem` and `certs/local-key.pem`.

#### Scenario: Initiating login

- **WHEN** the browser navigates to `GET /api/auth/login`
- **THEN** the server responds with a 302 redirect to `https://accounts.spotify.com/authorize` with `response_type=code`, `code_challenge_method=S256`, and the required scopes


<!-- @trace
source: vibe-station-web-ui
updated: 2026-06-11
code:
  - .DS_Store
-->

---
### Requirement: OAuth callback handler

The server SHALL expose `GET /callback` that exchanges the authorization code for tokens using pure PKCE (client_id in body, no Authorization header), saves the result to `~/.spotify-vibe-token.json`, and redirects the browser to `/`. The route path MUST match the registered redirect URI (`https://127.0.0.1.nip.io:8888/callback`) exactly — Spotify redirects the browser directly to the Express server on port 8888, so the handler is mounted at `/callback`, not under `/api`.

#### Scenario: Successful callback

- **WHEN** Spotify redirects to `/callback` with a valid `code` parameter
- **THEN** the server exchanges the code, saves the token, and responds with a 302 redirect to `/`

#### Scenario: Callback with error

- **WHEN** Spotify redirects with an `error` parameter instead of `code`
- **THEN** the server responds with HTTP 400 and an error message; no token is saved


<!-- @trace
source: vibe-station-web-ui
updated: 2026-06-11
code:
  - .DS_Store
-->

---
### Requirement: Client auth gate

The React client SHALL call `GET /api/auth/status` on initial load. When `connected` is `false`, the client SHALL display the not-logged-in screen. When `connected` is `true`, the client SHALL display the dashboard. The not-logged-in screen SHALL show `○ NOT CONNECTED` status and a "CONNECT SPOTIFY" button. Clicking the button SHALL navigate to `GET /api/auth/login`.

#### Scenario: First launch without token

- **WHEN** the user opens the app with no token file present
- **THEN** the not-logged-in screen is shown with `○ NOT CONNECTED` and a "CONNECT SPOTIFY" CTA

#### Scenario: After successful OAuth

- **WHEN** the OAuth callback redirects back to `/` and status returns `connected: true`
- **THEN** the dashboard is shown with `● CONNECTED` in the header


<!-- @trace
source: vibe-station-web-ui
updated: 2026-06-11
code:
  - .DS_Store
-->

---
### Requirement: Logout

The server SHALL expose `POST /api/auth/logout` that deletes the local token file at `~/.spotify-vibe-token.json` and returns `{ ok: true }`. The React client SHALL render a `⏻ LOG OUT` control in the header only while connected; clicking it SHALL call the endpoint and return the app to the not-connected state, clearing the loaded playlists and selection.

#### Scenario: Logging out

- **WHEN** a connected user clicks `⏻ LOG OUT`
- **THEN** the server deletes the token file, `GET /api/auth/status` subsequently returns `{ "connected": false }`, and the client displays the not-logged-in screen

#### Scenario: Logout control hidden when disconnected

- **WHEN** the app is in the not-connected state
- **THEN** no logout control is shown (only the "CONNECT SPOTIFY" CTA)

<!-- @trace
source: vibe-station-web-ui
updated: 2026-06-11
code:
  - .DS_Store
-->