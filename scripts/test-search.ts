import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length)
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

import { getValidToken } from "../src/token.js";
import { searchTracks } from "../src/spotify.js";

const token = await getValidToken();
console.log("Token OK, testing search...");

// Test 1: simple query, fixed limit
try {
  const tracks = await searchTracks(token, "lo-fi chill study beats", 9);
  console.log("Test 1 PASSED:", tracks.length, "tracks, first:", tracks[0]?.name);
} catch (err: any) {
  console.error("Test 1 FAILED:", err?.response?.data ?? err.message);
}

// Test 2: same query the tool would build
try {
  const tracks = await searchTracks(token, "lo-fi chill study beats building decks 70bpm", 14);
  console.log("Test 2 PASSED:", tracks.length, "tracks");
} catch (err: any) {
  console.error("Test 2 FAILED:", err?.response?.data ?? err.message);
}

// Test 3: simple query, limit=14
try {
  const tracks = await searchTracks(token, "lo-fi chill study beats", 14);
  console.log("Test 3 PASSED (simple query, limit=14):", tracks.length, "tracks");
} catch (err: any) {
  console.error("Test 3 FAILED (simple query, limit=14):", err?.response?.data ?? err.message);
}

// Test 4: full query WITHOUT 70bpm, limit=14
try {
  const tracks = await searchTracks(token, "lo-fi chill study beats building decks", 14);
  console.log("Test 4 PASSED (no bpm, limit=14):", tracks.length, "tracks");
} catch (err: any) {
  console.error("Test 4 FAILED (no bpm, limit=14):", err?.response?.data ?? err.message);
}

// Test 5: just "70bpm" in query, limit=9
try {
  const tracks = await searchTracks(token, "lo-fi chill study beats 70bpm", 9);
  console.log("Test 5 PASSED (with 70bpm, limit=9):", tracks.length, "tracks");
} catch (err: any) {
  console.error("Test 5 FAILED (with 70bpm, limit=9):", err?.response?.data ?? err.message);
}
