export interface VibeParams {
  search_query: string;
}

export const vibeMap: Record<string, VibeParams> = {
  "lo-fi": { search_query: "lo-fi chill study beats" },
  "white-noise": { search_query: "ambient white noise focus" },
  focus: { search_query: "focus study instrumental concentration" },
  chill: { search_query: "chill indie acoustic relax" },
  energetic: { search_query: "energetic upbeat electronic dance" },
  happy: { search_query: "happy feel good pop uplifting" },
  sad: { search_query: "sad melancholic emotional indie" },
  workout: { search_query: "workout gym motivation hip-hop" },
  sleep: { search_query: "sleep deep ambient calm meditation" },
  jazz: { search_query: "jazz soul blues smooth" },
};

export function buildSearchQuery(vibeNames: string[], activity: string, bpmMin?: number): string {
  const matched = vibeNames
    .map((v) => vibeMap[v.toLowerCase()])
    .filter(Boolean);

  const vibeTerms = matched.length > 0
    ? [...new Set(matched.flatMap((v) => v.search_query.split(" ")))].join(" ")
    : vibeMap["chill"].search_query;

  const parts = [vibeTerms, activity];
  if (bpmMin !== undefined) parts.push(`${bpmMin}bpm`);

  return parts.join(" ");
}

export const VIBE_DESCRIPTIONS = Object.entries(vibeMap)
  .map(([name, p]) => `  "${name}": search="${p.search_query}"`)
  .join("\n");
