## ADDED Requirements

### Requirement: Auth status endpoint

The server SHALL expose `GET /api/auth/status` returning `{ connected: boolean }`. `connected` is `true` when a valid token file exists at `~/.spotify-vibe-token.json` and the access token is not expired (or can be silently refreshed).

#### Scenario: Token file absent

- **WHEN** no token file exists at `~/.spotify-vibe-token.json`
- **THEN** `GET /api/auth/status` returns `{ "connected": false }` with HTTP 200

#### Scenario: Token file present and valid

- **WHEN** a valid non-expired token exists
- **THEN** `GET /api/auth/status` returns `{ "connected": true }` with HTTP 200

### Requirement: Browser OAuth login flow

The server SHALL expose `GET /api/auth/login` that redirects the browser to the Spotify authorization URL using PKCE (no client_secret). The redirect URI SHALL be `https://127.0.0.1.nip.io:8888/callback`. The server SHALL listen on port 8888 with the local TLS certificates at `certs/local.pem` and `certs/local-key.pem`.

#### Scenario: Initiating login

- **WHEN** the browser navigates to `GET /api/auth/login`
- **THEN** the server responds with a 302 redirect to `https://accounts.spotify.com/authorize` with `response_type=code`, `code_challenge_method=S256`, and the required scopes

### Requirement: OAuth callback handler

The server SHALL expose `GET /api/auth/callback` that exchanges the authorization code for tokens using pure PKCE (client_id in body, no Authorization header), saves the result to `~/.spotify-vibe-token.json`, and redirects the browser to `/`.

#### Scenario: Successful callback

- **WHEN** Spotify redirects to `/api/auth/callback` with a valid `code` parameter
- **THEN** the server exchanges the code, saves the token, and responds with a 302 redirect to `/`

#### Scenario: Callback with error

- **WHEN** Spotify redirects with an `error` parameter instead of `code`
- **THEN** the server responds with HTTP 400 and an error message; no token is saved

### Requirement: Client auth gate

The React client SHALL call `GET /api/auth/status` on initial load. When `connected` is `false`, the client SHALL display the not-logged-in screen. When `connected` is `true`, the client SHALL display the dashboard. The not-logged-in screen SHALL show `○ NOT CONNECTED` status and a "CONNECT SPOTIFY" button. Clicking the button SHALL navigate to `GET /api/auth/login`.

#### Scenario: First launch without token

- **WHEN** the user opens the app with no token file present
- **THEN** the not-logged-in screen is shown with `○ NOT CONNECTED` and a "CONNECT SPOTIFY" CTA

#### Scenario: After successful OAuth

- **WHEN** the OAuth callback redirects back to `/` and status returns `connected: true`
- **THEN** the dashboard is shown with `● CONNECTED` in the header
