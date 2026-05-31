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
