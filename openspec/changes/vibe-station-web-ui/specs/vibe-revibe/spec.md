## ADDED Requirements

### Requirement: Revibe endpoint

The server SHALL expose `POST /api/playlists/:id/revibe` accepting `{ prompt: string }`. The server SHALL call the Anthropic API to get new track selections for the given prompt, clear all existing tracks from the playlist via `DELETE /v1/playlists/{id}/items`, add the new tracks via `POST /v1/playlists/{id}/items`, and return `{ playlist: SpotifyPlaylist, log: VibeLogEntry }`. The endpoint SHALL NEVER use the deprecated `/tracks` sub-resource.

#### Scenario: Successful revibe

- **WHEN** the client POSTs `{ "prompt": "energetic morning run" }` to `/api/playlists/abc123/revibe`
- **THEN** the server clears the playlist's tracks, adds new tracks, and returns HTTP 200 with the updated playlist and vibe log

#### Scenario: Playlist not found

- **WHEN** the playlist ID does not exist or belongs to another user
- **THEN** the server returns HTTP 404 with `{ "error": "Playlist not found" }`

### Requirement: Re-vibe CTA placement

The client SHALL display a "⟳ re-vibe this playlist" CTA directly below the Spotify iframe embed in the now-playing panel. The CTA SHALL be visually attached to the embed (sharing its bottom border). Clicking it SHALL open the re-vibe confirmation modal.

#### Scenario: Re-vibe CTA visible

- **WHEN** a playlist is selected and shown in the now-playing panel
- **THEN** the re-vibe CTA appears immediately below the iframe embed

### Requirement: Re-vibe confirmation modal

The client SHALL display a confirmation modal before executing a re-vibe. The modal SHALL show the target playlist name, the current track count, a warning that the action cannot be undone, and a natural language input for the new vibe. The modal SHALL have a "[CANCEL]" button and an "[EXECUTE]" button. Clicking "[EXECUTE]" SHALL call `POST /api/playlists/:id/revibe` and close the modal on success.

#### Scenario: Confirmation before overwrite

- **WHEN** the user clicks the re-vibe CTA
- **THEN** a modal appears showing the playlist name, track count, and "THIS ACTION CANNOT BE UNDONE" warning before any API call is made

#### Scenario: Cancelling re-vibe

- **WHEN** the user clicks "[CANCEL]" in the re-vibe modal
- **THEN** the modal closes and no API call is made; the playlist is unchanged

### Requirement: Vibe log updated after revibe

After a successful `POST /api/playlists/:id/revibe`, the client SHALL append the returned `VibeLogEntry` to the session vibe log for that playlist ID.

#### Scenario: Log grows after re-vibe

- **WHEN** a playlist is re-vibed successfully
- **THEN** the vibe log for that playlist shows the new entry appended below any previous entries
