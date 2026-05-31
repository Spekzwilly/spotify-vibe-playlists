import { readFileSync, existsSync } from "fs";
import { join } from "path";
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length && !process.env[key.trim()])
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

import axios from "axios";
import { getValidToken } from "../src/token.js";

const token = await getValidToken();
const h = { Authorization: `Bearer ${token}` };

// 1. Check token scopes
try {
  const me = await axios.get("https://api.spotify.com/v1/me", { headers: h });
  console.log("✓ GET /v1/me:", me.data.display_name, `(${me.data.email})`);
} catch (e: any) {
  console.error("✗ GET /v1/me:", e?.response?.data ?? e.message);
}

// 2. Try search
let trackUri: string | undefined;
try {
  const s = await axios.get("https://api.spotify.com/v1/search", {
    headers: h,
    params: { q: "lo-fi", type: "track", limit: 1 },
  });
  trackUri = s.data.tracks.items[0]?.uri;
  console.log("✓ GET /v1/search:", s.data.tracks.items[0]?.name);
} catch (e: any) {
  console.error("✗ GET /v1/search:", e?.response?.data ?? e.message);
}

// 3. Try create playlist
let playlistId: string | undefined;
try {
  const p = await axios.post(
    "https://api.spotify.com/v1/me/playlists",
    { name: "test-delete-me", description: "test", public: false },
    { headers: { ...h, "Content-Type": "application/json" } }
  );
  playlistId = p.data.id;
  console.log("✓ POST /v1/me/playlists:", p.data.id, p.data.external_urls.spotify);
} catch (e: any) {
  console.error("✗ POST /v1/me/playlists:", e?.response?.data ?? e.message);
}

// 4. Try add tracks to playlist
if (playlistId && trackUri) {
  try {
    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/items`,
      { uris: [trackUri] },
      { headers: { ...h, "Content-Type": "application/json" } }
    );
    console.log("✓ POST /v1/playlists/{id}/tracks: OK");
    console.log("\nClean up: delete 'test-delete-me' playlist from your Spotify.");
  } catch (e: any) {
    console.error("✗ POST /v1/playlists/{id}/tracks:", e?.response?.data ?? e.message);
    if (e?.response?.headers) {
      console.error("  Response headers:", JSON.stringify(e.response.headers, null, 2));
    }
  }
}
