# now-playing Specification

## Purpose

TBD - created by archiving change 'vibe-station-web-ui'. Update Purpose after archive.

## Requirements

### Requirement: Spotify iframe embed

The now-playing panel SHALL display the selected playlist using a Spotify iframe embed (`https://open.spotify.com/embed/playlist/{id}`). The embed SHALL update whenever the selected playlist changes.

#### Scenario: Embed renders for selected playlist

- **WHEN** the user selects a playlist in the sidebar
- **THEN** the now-playing panel shows the Spotify iframe embed for that playlist's ID

#### Scenario: No playlist selected

- **WHEN** no playlist is selected (e.g., on first load before any selection)
- **THEN** the embed area shows a placeholder indicating no playlist is selected


<!-- @trace
source: vibe-station-web-ui
updated: 2026-06-11
code:
  - .DS_Store
-->

---
### Requirement: Now-playing panel layout

The now-playing panel SHALL be structured top-to-bottom as: panel header ("=== NOW PLAYING ==="), Spotify iframe embed, re-vibe CTA strip, vibe log section header ("=== VIBE LOG ==="), scrollable vibe log entries. The re-vibe CTA SHALL share the embed's bottom border.

#### Scenario: Panel layout order

- **WHEN** a playlist is selected
- **THEN** the panel renders embed first, re-vibe CTA directly below, vibe log below that — in that vertical order


<!-- @trace
source: vibe-station-web-ui
updated: 2026-06-11
code:
  - .DS_Store
-->

---
### Requirement: Connection status in header

The application header SHALL display the Spotify connection status using `● CONNECTED` (amber) when authenticated and `○ NOT CONNECTED` (dimmed) when not. The header SHALL also show Claude status as `● READY` when the `ANTHROPIC_API_KEY` is configured.

#### Scenario: Connected state header

- **WHEN** the user is authenticated with Spotify
- **THEN** the header shows `[ SPOTIFY ● CONNECTED ]` and `[ CLAUDE ● READY ]`

#### Scenario: Disconnected state header

- **WHEN** no valid Spotify token exists
- **THEN** the header shows `[ SPOTIFY ○ NOT CONNECTED ]`


<!-- @trace
source: vibe-station-web-ui
updated: 2026-06-11
code:
  - .DS_Store
-->

---
### Requirement: Amber Signal visual design

The client SHALL implement the Amber Signal design system throughout: background `#060400`, primary amber `#ffd700`, warm orange `#ff9900`, hard `1px solid` borders with no border-radius, `Share Tech Mono` monospace font for all text, panel headers in `=== TITLE ===` format, data values wrapped as `[ value ]`, and a CRT scanline overlay via CSS `::after`.

#### Scenario: Design system applied globally

- **WHEN** the dashboard renders
- **THEN** all text uses `Share Tech Mono`, all borders are hard 1px, no rounded corners are visible, and the background is near-black `#060400`

<!-- @trace
source: vibe-station-web-ui
updated: 2026-06-11
code:
  - .DS_Store
-->