import https from "https";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import axios from "axios";
import Anthropic from "@anthropic-ai/sdk";
import { readToken, saveToken, TokenData } from "../src/token.js";
import {
  getPlaylists,
  createPlaylist,
  searchTracks,
  addTracksToPlaylist,
  replacePlaylistTracks,
  SpotifyPlaylist,
} from "../src/spotify.js";
import { buildSearchQuery, VIBE_DESCRIPTIONS } from "../src/vibes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load .env manually (same pattern as src/index.ts)
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? "https://127.0.0.1.nip.io:8888/callback";
const TOKEN_PATH = path.join(os.homedir(), ".spotify-vibe-token.json");
const SCOPES = "playlist-modify-public playlist-modify-private playlist-read-private user-read-private user-read-email";

// PKCE state stored in memory (single-user local server)
let pkceVerifier = "";
let oauthState = "";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getValidToken(): Promise<string> {
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8")) as TokenData;
  if (Date.now() < token.expires_at - 30_000) return token.access_token;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
    client_id: CLIENT_ID,
  });
  const resp = await axios.post<{ access_token: string; expires_in: number; refresh_token?: string }>(
    "https://accounts.spotify.com/api/token",
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  const updated: TokenData = {
    access_token: resp.data.access_token,
    refresh_token: resp.data.refresh_token ?? token.refresh_token,
    expires_at: Date.now() + resp.data.expires_in * 1000,
  };
  saveToken(updated);
  return updated.access_token;
}

function buildVibeLog(input: string, playlist: SpotifyPlaylist, steps: string[]): object {
  return {
    timestamp: new Date().toISOString(),
    input,
    steps,
  };
}

const IS_PROD = process.env.NODE_ENV === "production";
// Where the OAuth callback sends the browser back to. Locally the Vite dev
// server owns the UI on :5173; in prod Express serves the built client itself,
// so we redirect to the same origin ("/").
const APP_ORIGIN = IS_PROD ? "/" : "http://localhost:5173/";

const app = express();
// Only needed in dev, where the UI (5173) and API (8888) are different origins.
// In prod Express serves both from one origin, so CORS is a no-op.
if (!IS_PROD) app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ── Auth: status ──────────────────────────────────────────────────────────────
app.get("/api/auth/status", async (_req, res) => {
  if (!fs.existsSync(TOKEN_PATH)) {
    res.json({ connected: false });
    return;
  }
  // Report connected whenever the token is valid OR silently refreshable, so an
  // expired access token doesn't bounce the user back into the OAuth flow while
  // a working refresh_token is on disk. Only a genuinely dead token → false.
  try {
    await getValidToken();
    res.json({ connected: true });
  } catch {
    res.json({ connected: false });
  }
});

// ── Auth: login (PKCE redirect) ───────────────────────────────────────────────
app.get("/api/auth/login", (_req, res) => {
  pkceVerifier = base64url(crypto.randomBytes(32));
  oauthState = base64url(crypto.randomBytes(16));
  const challenge = base64url(crypto.createHash("sha256").update(pkceVerifier).digest());

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", oauthState);
  url.searchParams.set("show_dialog", "true");

  res.redirect(url.toString());
});

// ── Auth: callback ────────────────────────────────────────────────────────────
// Path must match SPOTIFY_REDIRECT_URI (…/callback) — Spotify redirects the
// browser straight to Express on :8888, so this is mounted at /callback, not
// under /api. A mismatch surfaces as the browser's "Cannot GET /callback".
app.get("/callback", async (req, res) => {
  const { code, error, state } = req.query as Record<string, string>;

  if (error || !code) {
    res.status(400).json({ error: error ?? "No authorization code returned" });
    return;
  }
  if (state !== oauthState) {
    res.status(400).json({ error: "OAuth state mismatch" });
    return;
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: pkceVerifier,
  });

  try {
    const resp = await axios.post<{ access_token: string; refresh_token: string; expires_in: number }>(
      "https://accounts.spotify.com/api/token",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    saveToken({
      access_token: resp.data.access_token,
      refresh_token: resp.data.refresh_token,
      expires_at: Date.now() + resp.data.expires_in * 1000,
    });
    res.redirect(APP_ORIGIN);
  } catch (err: unknown) {
    const detail = (err as any)?.response?.data ?? (err instanceof Error ? err.message : String(err));
    res.status(400).json({ error: "Token exchange failed", detail });
  }
});

// ── Auth: logout ──────────────────────────────────────────────────────────────
// Deletes the local token so the app drops back to the not-connected state.
app.post("/api/auth/logout", (_req, res) => {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  res.json({ ok: true });
});

// ── Playlists ─────────────────────────────────────────────────────────────────
app.get("/api/playlists", async (_req, res) => {
  if (!fs.existsSync(TOKEN_PATH)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const token = await getValidToken();
    const playlists = await getPlaylists(token);
    res.json({ playlists });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Vibe create ───────────────────────────────────────────────────────────────
app.post("/api/vibe", async (req, res) => {
  const { prompt } = req.body as { prompt?: string };
  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  if (!fs.existsSync(TOKEN_PATH)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const token = await getValidToken();
    const client = new Anthropic({ apiKey: anthropicKey });
    const steps: string[] = [];

    steps.push(`VIBE REQUEST ───────────────────────────`);
    steps.push(`"${prompt}"`);
    steps.push(``);
    steps.push(`CLAUDE PROCESSING`);
    steps.push(`→ parsing parameters...`);

    const toolDef: Anthropic.Tool = {
      name: "create_vibe_playlist",
      description: `Creates a Spotify playlist from a natural language vibe description.\n\nVIBE DICTIONARY — map user-described vibes to these canonical tags:\n${VIBE_DESCRIPTIONS}\n\nMultiple vibes can be combined. If a vibe is not in the dictionary, pick the closest match.\n\nDURATION FORMULA: track_count = ceil(duration_mins / 3.5)\n\nPlaylists are created as PRIVATE and named: "{activity} · {vibes} · {duration}min"`,
      input_schema: {
        type: "object" as const,
        properties: {
          activity: { type: "string", description: "What the user is doing" },
          duration_mins: { type: "number", description: "Desired playlist duration in minutes" },
          vibes: { type: "array", items: { type: "string" }, description: "List of vibe tags" },
          bpm_min: { type: "number", description: "Minimum BPM (optional)" },
          bpm_max: { type: "number", description: "Maximum BPM (optional)" },
        },
        required: ["activity", "duration_mins", "vibes"],
      },
    };

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [toolDef],
      messages: [{ role: "user", content: prompt }],
    });

    if (message.stop_reason !== "tool_use") {
      res.status(502).json({ error: "Claude unavailable: no tool call returned" });
      return;
    }

    const toolUse = message.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock;
    const input = toolUse.input as {
      activity: string;
      duration_mins: number;
      vibes: string[];
      bpm_min?: number;
    };

    steps.push(`  activity:  [ ${input.activity} ]`);
    steps.push(`  vibes:     [ ${input.vibes.join(", ")} ]`);
    steps.push(`  duration:  [ ${input.duration_mins}min → ${Math.ceil(input.duration_mins / 3.5)} tracks ]`);
    steps.push(``);
    steps.push(`→ searching spotify...`);

    const trackCount = Math.ceil(input.duration_mins / 3.5);
    const query = buildSearchQuery(input.vibes, input.activity, input.bpm_min);
    const tracks = await searchTracks(token, query, Math.min(trackCount, 10));
    const selected = tracks.slice(0, trackCount);

    steps.push(`  candidates found: ${tracks.length}`);
    steps.push(`  curating final tracklist...`);
    steps.push(``);

    const playlistName = `${input.activity} · ${input.vibes.join(" ")} · ${input.duration_mins}min`;
    const description = `Created by Vibe Station. Vibes: ${input.vibes.join(", ")}. ~${input.duration_mins} min.`;
    const created = await createPlaylist(token, playlistName, description);

    if (selected.length > 0) {
      await addTracksToPlaylist(token, created.id, selected.map((t) => t.uri));
    }

    steps.push(`RESULT ─────────────────────────────────`);
    steps.push(`  name:    [ ${playlistName} ]`);
    steps.push(`  tracks:  [ ${selected.length} ]`);
    steps.push(`  status:  [ ✓ CREATED ]`);

    const playlist: SpotifyPlaylist = {
      id: created.id,
      name: playlistName,
      tracks: { total: selected.length },
      external_urls: created.external_urls,
    };

    const log = buildVibeLog(prompt, playlist, steps);
    res.json({ playlist, log });
  } catch (err: unknown) {
    const detail = (err as any)?.response?.data ?? (err instanceof Error ? err.message : String(err));
    res.status(502).json({ error: `Claude unavailable: ${JSON.stringify(detail)}` });
  }
});

// ── Vibe revibe ───────────────────────────────────────────────────────────────
app.post("/api/playlists/:id/revibe", async (req, res) => {
  const { id } = req.params;
  const { prompt } = req.body as { prompt?: string };

  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  if (!fs.existsSync(TOKEN_PATH)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const token = await getValidToken();

    // Verify playlist exists
    const allPlaylists = await getPlaylists(token);
    const existing = allPlaylists.find((p) => p.id === id);
    if (!existing) {
      res.status(404).json({ error: "Playlist not found" });
      return;
    }

    const client = new Anthropic({ apiKey: anthropicKey });
    const steps: string[] = [];

    steps.push(`RE-VIBE REQUEST ────────────────────────`);
    steps.push(`target: [ ${existing.name} ]`);
    steps.push(`"${prompt}"`);
    steps.push(``);
    steps.push(`CLAUDE PROCESSING`);
    steps.push(`→ parsing parameters...`);

    const toolDef: Anthropic.Tool = {
      name: "create_vibe_playlist",
      description: `Creates a Spotify playlist from a natural language vibe description.\n\nVIBE DICTIONARY:\n${VIBE_DESCRIPTIONS}\n\nDURATION FORMULA: track_count = ceil(duration_mins / 3.5)`,
      input_schema: {
        type: "object" as const,
        properties: {
          activity: { type: "string" },
          duration_mins: { type: "number" },
          vibes: { type: "array", items: { type: "string" } },
          bpm_min: { type: "number" },
          bpm_max: { type: "number" },
        },
        required: ["activity", "duration_mins", "vibes"],
      },
    };

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [toolDef],
      messages: [{ role: "user", content: prompt }],
    });

    if (message.stop_reason !== "tool_use") {
      res.status(502).json({ error: "Claude unavailable: no tool call returned" });
      return;
    }

    const toolUse = message.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock;
    const input = toolUse.input as {
      activity: string;
      duration_mins: number;
      vibes: string[];
      bpm_min?: number;
    };

    steps.push(`  activity:  [ ${input.activity} ]`);
    steps.push(`  vibes:     [ ${input.vibes.join(", ")} ]`);
    steps.push(`  duration:  [ ${input.duration_mins}min → ${Math.ceil(input.duration_mins / 3.5)} tracks ]`);
    steps.push(``);
    steps.push(`→ searching spotify...`);

    const trackCount = Math.ceil(input.duration_mins / 3.5);
    const query = buildSearchQuery(input.vibes, input.activity, input.bpm_min);
    const tracks = await searchTracks(token, query, Math.min(trackCount, 10));
    const selected = tracks.slice(0, trackCount);

    steps.push(`  candidates found: ${tracks.length}`);
    steps.push(`  replacing tracks in-place (DELETE then POST /items)...`);
    steps.push(``);

    await replacePlaylistTracks(token, id, selected.map((t) => t.uri));

    steps.push(`RESULT ─────────────────────────────────`);
    steps.push(`  target:  [ ${existing.name} ]`);
    steps.push(`  tracks:  [ ${selected.length} ]`);
    steps.push(`  status:  [ ✓ RE-VIBED ]`);

    const playlist: SpotifyPlaylist = {
      id: existing.id,
      name: existing.name,
      tracks: { total: selected.length },
      external_urls: existing.external_urls,
    };

    const log = buildVibeLog(prompt, playlist, steps);
    res.json({ playlist, log });
  } catch (err: unknown) {
    const detail = (err as any)?.response?.data ?? (err instanceof Error ? err.message : String(err));
    res.status(502).json({ error: `Re-vibe failed: ${JSON.stringify(detail)}` });
  }
});

// ── Serve the built client (production) ───────────────────────────────────────
// In prod Express is the only server, so it hands out the compiled React app and
// falls back to index.html for client-side routes. API and /callback are declared
// above, so they win over this catch-all.
const clientDist = path.join(ROOT, "client", "dist");
if (IS_PROD && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/callback).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ── Start server ──────────────────────────────────────────────────────────────
// Render terminates TLS at its edge and gives us plain HTTP on $PORT. Locally we
// keep HTTPS so the Spotify redirect URI (https://…nip.io:8888/callback) matches.
const PORT = Number(process.env.PORT) || 8888;

if (IS_PROD) {
  app.listen(PORT, () => {
    console.log(`Vibe Station server → http://0.0.0.0:${PORT}`);
  });
} else {
  const certDir = path.join(ROOT, "certs");
  const certPath = path.join(certDir, "local.pem");
  const keyPath = path.join(certDir, "local-key.pem");

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error("Error: certs/local.pem and certs/local-key.pem not found.");
    console.error("Run: mkcert -cert-file certs/local.pem -key-file certs/local-key.pem 127.0.0.1.nip.io localhost");
    process.exit(1);
  }

  https
    .createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app)
    .listen(PORT, () => {
      console.log(`Vibe Station server → https://localhost:${PORT}`);
    });
}
