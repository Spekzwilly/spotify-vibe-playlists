import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getValidToken } from "./token.js";
import { buildSearchQuery, VIBE_DESCRIPTIONS } from "./vibes.js";
import {
  searchTracks,
  createPlaylist,
  addTracksToPlaylist,
} from "./spotify.js";

// Load .env if present
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length && !process.env[key.trim()]) process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

const server = new McpServer({
  name: "spotify-vibe-playlists",
  version: "1.0.0",
});

server.tool(
  "create_vibe_playlist",
  `Creates a Spotify playlist from a natural language vibe description.

VIBE DICTIONARY — map user-described vibes to these canonical tags:
${VIBE_DESCRIPTIONS}

Multiple vibes can be combined. If a vibe is not in the dictionary, pick the closest match.

DURATION FORMULA: track_count = ceil(duration_mins / 3.5)

BPM NOTE: BPM is used as a search hint (appended to the query) — it influences results
but is NOT an exact audio filter. Results will match the vibe/genre closely.

Playlists are created as PRIVATE and named: "{activity} · {vibes} · {duration}min"
Example: "Focus · lo-fi white-noise · 30min"`,
  {
    activity: z.string().describe("What the user is doing, e.g. 'building decks', 'studying'"),
    duration_mins: z.number().positive().describe("Desired playlist duration in minutes"),
    vibes: z
      .array(z.string())
      .min(1)
      .describe("List of vibe tags from the dictionary, e.g. ['lo-fi', 'white-noise']"),
    bpm_min: z.number().optional().describe("Minimum BPM (used as search hint)"),
    bpm_max: z.number().optional().describe("Maximum BPM (used as search hint)"),
  },
  async ({ activity, duration_mins, vibes, bpm_min }) => {
    function errorResponse(step: string, err: unknown) {
      const spotifyError = (err as any)?.response?.data;
      const detail = spotifyError
        ? JSON.stringify(spotifyError)
        : err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error at ${step}: ${detail}` }],
        isError: true,
      };
    }

    const token = await getValidToken();
    const trackCount = Math.ceil(duration_mins / 3.5);
    const query = buildSearchQuery(vibes, activity, bpm_min);

    let tracks;
    try { tracks = await searchTracks(token, query, Math.min(trackCount, 10)); }
    catch (err) { return errorResponse("search", err); }

    if (tracks.length === 0) {
      return {
        content: [{ type: "text", text: "No tracks found. Try different vibe tags or a simpler activity description." }],
      };
    }

    const selected = tracks.slice(0, trackCount);
    const playlistName = `${activity} · ${vibes.join(" ")} · ${duration_mins}min`;
    const description = `Created by spotify-vibe-playlists. Vibes: ${vibes.join(", ")}. ~${duration_mins} min.`;

    let playlist;
    try { playlist = await createPlaylist(token, playlistName, description); }
    catch (err) { return errorResponse("create-playlist", err); }

    try { await addTracksToPlaylist(token, playlist.id, selected.map((t) => t.uri)); }
    catch (err) { return errorResponse(`add-tracks [${playlist.id}]`, err); }

    const trackList = selected
      .map((t, i) => `${i + 1}. ${t.name} — ${t.artists.map((a) => a.name).join(", ")}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Playlist created: **${playlistName}**\n${playlist.external_urls.spotify}\n\n${selected.length} tracks (~${Math.round(selected.length * 3.5)} min):\n${trackList}`,
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
