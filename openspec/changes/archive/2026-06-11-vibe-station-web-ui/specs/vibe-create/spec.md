## ADDED Requirements

### Requirement: Vibe create endpoint

The server SHALL expose `POST /api/vibe` accepting `{ prompt: string }`. The server SHALL call the Anthropic API with the `create_vibe_playlist` tool definition (reused from the MCP server), execute the resulting tool call server-side (Spotify search + playlist create + add tracks), and return `{ playlist: SpotifyPlaylist, log: VibeLogEntry }`. The `ANTHROPIC_API_KEY` SHALL be read from `.env` and SHALL NOT be exposed to the client.

#### Scenario: Successful vibe creation

- **WHEN** the client POSTs `{ "prompt": "late night coding, lofi chill, 45 mins" }` to `/api/vibe`
- **THEN** the server returns HTTP 200 with the created Spotify playlist and a structured log of Claude's processing steps

#### Scenario: Missing prompt

- **WHEN** the client POSTs to `/api/vibe` with an empty or missing `prompt`
- **THEN** the server returns HTTP 400 with `{ "error": "prompt is required" }`

#### Scenario: Anthropic API error

- **WHEN** the Anthropic API call fails
- **THEN** the server returns HTTP 502 with `{ "error": "Claude unavailable: <detail>" }`

### Requirement: Vibe create modal

The client SHALL display a modal when the user clicks "⊕ vibe new playlist". The modal SHALL contain a natural language text input and a "[VIBE]" submit button. Submitting SHALL call `POST /api/vibe` and close the modal on success. The modal SHALL be dismissable via "[CANCEL]".

#### Scenario: Submitting a vibe prompt

- **WHEN** the user types a vibe description and clicks "[VIBE]"
- **THEN** the modal calls `POST /api/vibe`, closes on success, and the new playlist appears selected in the sidebar

#### Scenario: Pressing Enter to submit

- **WHEN** the user presses Enter while the input is focused
- **THEN** the form submits identically to clicking "[VIBE]"

### Requirement: Per-playlist vibe log

The client SHALL maintain a vibe log per playlist ID in session state. Each successful `POST /api/vibe` response SHALL append a `VibeLogEntry` to the log for the newly created playlist's ID. The vibe log for the selected playlist SHALL be displayed in the now-playing panel below the embed. The log SHALL be empty for playlists that were not created or re-vibed in the current session.

#### Scenario: Vibe log populated after creation

- **WHEN** a new playlist is successfully created via `POST /api/vibe`
- **THEN** the vibe log for that playlist shows the processing steps returned in the response

#### Scenario: Switching playlists resets visible log

- **WHEN** the user selects a playlist that has no vibe log entry for this session
- **THEN** the vibe log panel shows "no vibe history for this playlist"

### Requirement: New playlist auto-selected

After a successful `POST /api/vibe`, the client SHALL add the returned playlist to the sidebar list and automatically select it, updating the now-playing panel.

#### Scenario: Auto-selection after create

- **WHEN** `POST /api/vibe` returns successfully
- **THEN** the new playlist is appended to the sidebar and becomes the selected playlist
