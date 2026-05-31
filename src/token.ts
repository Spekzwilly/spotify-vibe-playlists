import fs from "fs";
import os from "os";
import path from "path";
import axios from "axios";

const TOKEN_PATH = path.join(os.homedir(), ".spotify-vibe-token.json");

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix ms
}

export function readToken(): TokenData {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(`No token found at ${TOKEN_PATH}. Run 'npm run auth' first.`);
  }
  return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8")) as TokenData;
}

export function saveToken(data: TokenData): void {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export async function getValidToken(): Promise<string> {
  const token = readToken();

  if (Date.now() < token.expires_at - 30_000) {
    return token.access_token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
    client_id: clientId,
    // pure PKCE refresh: client_id in body, no client_secret
  });

  const response = await axios.post<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>("https://accounts.spotify.com/api/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const updated: TokenData = {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token ?? token.refresh_token,
    expires_at: Date.now() + response.data.expires_in * 1000,
  };

  saveToken(updated);
  return updated.access_token;
}
