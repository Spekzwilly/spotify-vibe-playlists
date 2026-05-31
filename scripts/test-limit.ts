import { readFileSync, existsSync } from "fs";
import { join } from "path";
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
for (const n of [9, 10, 11, 12, 13, 14]) {
  try {
    const t = await searchTracks(token, "lo-fi chill", n);
    console.log(`limit=${n} PASS (${t.length} tracks)`);
  } catch (e: any) {
    console.log(`limit=${n} FAIL: ${e?.response?.data?.error?.message ?? e.message}`);
  }
}
