import axios from "axios";

const BASE = "https://api.spotify.com/v1";

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export interface Track {
  uri: string;
  name: string;
  artists: { name: string }[];
  duration_ms: number;
}

export async function searchTracks(
  token: string,
  query: string,
  limit: number
): Promise<Track[]> {
  const res = await axios.get<{ tracks: { items: Track[] } }>(`${BASE}/search`, {
    headers: headers(token),
    params: { q: query, type: "track", limit: Math.min(limit, 10) },
  });
  return res.data.tracks.items;
}

export async function createPlaylist(
  token: string,
  name: string,
  description: string
): Promise<{ id: string; external_urls: { spotify: string } }> {
  const res = await axios.post<{ id: string; external_urls: { spotify: string } }>(
    `${BASE}/me/playlists`,
    { name, description, public: false },
    { headers: { ...headers(token), "Content-Type": "application/json" } }
  );
  return res.data;
}

export async function addTracksToPlaylist(
  token: string,
  playlistId: string,
  uris: string[]
): Promise<void> {
  await axios.post(
    `${BASE}/playlists/${playlistId}/items`,
    { uris },
    { headers: { ...headers(token), "Content-Type": "application/json" } }
  );
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: { total: number };
  external_urls: { spotify: string };
}

// Spotify returns the track count under `items.total` (the /items rename, not
// the deprecated `tracks`). Normalize each raw playlist to our SpotifyPlaylist
// contract so all endpoints emit the same shape the client expects.
interface RawPlaylist {
  id: string;
  name: string;
  items?: { total: number };
  tracks?: { total: number };
  external_urls: { spotify: string };
}

interface PlaylistPage {
  items: RawPlaylist[];
  next: string | null;
}

export async function getPlaylists(token: string): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = [];
  let url: string | null = `${BASE}/me/playlists?limit=50`;
  while (url) {
    const page: PlaylistPage = (await axios.get<PlaylistPage>(url, { headers: headers(token) })).data;
    for (const p of page.items) {
      playlists.push({
        id: p.id,
        name: p.name,
        tracks: { total: p.items?.total ?? p.tracks?.total ?? 0 },
        external_urls: p.external_urls,
      });
    }
    url = page.next;
  }
  return playlists;
}

export async function replacePlaylistTracks(
  token: string,
  playlistId: string,
  uris: string[]
): Promise<void> {
  // PUT /items replaces the entire playlist contents in a single call (max 100
  // URIs). This avoids reading existing items first — whose shape under the
  // /items endpoint nests the track under `item`, not `track` — and sidesteps
  // the deprecated DELETE/{tracks} dance entirely. An empty `uris` clears it.
  await axios.put(
    `${BASE}/playlists/${playlistId}/items`,
    { uris: uris.slice(0, 100) },
    { headers: { ...headers(token), "Content-Type": "application/json" } }
  );

  // PUT caps at 100; append any remainder via POST /items.
  for (let i = 100; i < uris.length; i += 100) {
    await axios.post(
      `${BASE}/playlists/${playlistId}/items`,
      { uris: uris.slice(i, i + 100) },
      { headers: { ...headers(token), "Content-Type": "application/json" } }
    );
  }
}
