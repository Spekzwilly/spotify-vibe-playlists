import crypto from "crypto";
import https from "https";
import { URL } from "url";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import axios from "axios";
import open from "open";
import { saveToken } from "../src/token.js";

// Load .env if present
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key?.trim() && rest.length) {
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? "https://127.0.0.1.nip.io:8888/callback";

if (!clientId || !clientSecret) {
  console.error("Error: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set.");
  console.error("Copy .env.example to .env and fill in your credentials.");
  process.exit(1);
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

const codeVerifier = base64url(crypto.randomBytes(32));
const codeChallenge = base64url(
  crypto.createHash("sha256").update(codeVerifier).digest()
);

const scopes = ["playlist-modify-public", "playlist-modify-private", "playlist-read-private", "user-read-private", "user-read-email"].join(" ");

const authUrl = new URL("https://accounts.spotify.com/authorize");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("redirect_uri", redirectUri);
authUrl.searchParams.set("scope", scopes);
authUrl.searchParams.set("code_challenge_method", "S256");
authUrl.searchParams.set("code_challenge", codeChallenge);
authUrl.searchParams.set("show_dialog", "true"); // always show consent dialog to ensure scopes are granted

console.log("Opening Spotify authorization in your browser...");
await open(authUrl.toString());

const certDir = join(process.cwd(), "certs");
const certExists = existsSync(join(certDir, "local.pem")) && existsSync(join(certDir, "local-key.pem"));
if (!certExists) {
  console.error("Error: certs/local.pem and certs/local-key.pem not found.");
  console.error("Run: mkcert -cert-file certs/local.pem -key-file certs/local-key.pem 127.0.0.1.nip.io");
  process.exit(1);
}

const code = await new Promise<string>((resolve, reject) => {
  const server = https.createServer(
    {
      cert: readFileSync(join(certDir, "local.pem")),
      key: readFileSync(join(certDir, "local-key.pem")),
    },
    (req, res) => {
      const url = new URL(req.url!, `https://127.0.0.1.nip.io:8888`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html" });

      if (error || !code) {
        res.end("<h2>Authorization failed. You can close this tab.</h2>");
        server.close();
        reject(new Error(error ?? "No code returned"));
        return;
      }

      res.end("<h2>Authorization successful! You can close this tab.</h2>");
      server.close();
      resolve(code);
    }
  );

  server.listen(8888, "127.0.0.1", () =>
    console.log("Waiting for Spotify callback on https://127.0.0.1.nip.io:8888...")
  );
  server.on("error", reject);
});

const params = new URLSearchParams({
  grant_type: "authorization_code",
  code,
  redirect_uri: redirectUri,
  client_id: clientId,
  code_verifier: codeVerifier,
  // pure PKCE: no client_secret in token exchange
});

const response = await axios.post<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}>("https://accounts.spotify.com/api/token", params, {
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});

saveToken({
  access_token: response.data.access_token,
  refresh_token: response.data.refresh_token,
  expires_at: Date.now() + response.data.expires_in * 1000,
});

console.log("✓ Token saved to ~/.spotify-vibe-token.json");
console.log("  Granted scopes:", response.data.scope);
console.log("You can now restart Claude Desktop and start using the MCP server.");
