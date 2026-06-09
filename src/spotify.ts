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

interface PlaylistPage {
  items: SpotifyPlaylist[];
  next: string | null;
}

export async function getPlaylists(token: string): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = [];
  let url: string | null = `${BASE}/me/playlists?limit=50`;
  while (url) {
    const page: PlaylistPage = (await axios.get<PlaylistPage>(url, { headers: headers(token) })).data;
    playlists.push(...page.items);
    url = page.next;
  }
  return playlists;
}

export async function replacePlaylistTracks(
  token: string,
  playlistId: string,
  uris: string[]
): Promise<void> {
  // Fetch existing track URIs to delete
  interface TrackItemsPage {
    items: { track: { uri: string } }[];
    next: string | null;
  }
  const existingUris: string[] = [];
  let nextUrl: string | null = `${BASE}/playlists/${playlistId}/items?limit=100&fields=next,items(track(uri))`;
  while (nextUrl) {
    const page: TrackItemsPage = (await axios.get<TrackItemsPage>(nextUrl, { headers: headers(token) })).data;
    existingUris.push(...page.items.map((item) => item.track.uri));
    nextUrl = page.next;
  }

  // DELETE existing tracks via /items (not /tracks — avoid deprecated endpoint)
  for (let i = 0; i < existingUris.length; i += 100) {
    const batch = existingUris.slice(i, i + 100);
    await axios.delete(`${BASE}/playlists/${playlistId}/items`, {
      headers: { ...headers(token), "Content-Type": "application/json" },
      data: { tracks: batch.map((uri) => ({ uri })) },
    });
  }

  // POST new tracks via /items
  if (uris.length > 0) {
    await axios.post(
      `${BASE}/playlists/${playlistId}/items`,
      { uris },
      { headers: { ...headers(token), "Content-Type": "application/json" } }
    );
  }
}
