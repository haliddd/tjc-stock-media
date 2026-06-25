import type { SearchResult, StockMediaAsset } from "@/lib/types";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\w\s/-]+/g, " ").trim();
}

function tokens(query: string) {
  return Array.from(new Set(normalize(query).split(/\s+/).filter(Boolean)));
}

function displayChannel(channel: string) {
  if (channel === "website") return "approved for web";
  if (channel === "social") return "approved for social";
  if (channel === "print") return "approved for print";
  if (channel === "projection") return "approved for projection";
  return channel.replace(/-/g, " ");
}

export function matchedBecauseChips(asset: StockMediaAsset, query: string, discovery: SearchResult["discovery"], rightsSafeActive: boolean) {
  const matches: string[] = [];
  const queryTokens = tokens(query);
  const fields = [
    ...(asset.tags || []),
    ...(asset.tjcTerms || []),
    ...(asset.usageTerms || []),
    ...(asset.approvedChannels || []).map(displayChannel),
    asset.region || "",
    asset.rightsStatus || "",
    asset.collection || ""
  ].filter(Boolean);

  for (const field of fields) {
    const normalized = normalize(field);
    if (!normalized) continue;
    if (queryTokens.some((token) => normalized.includes(token))) matches.push(field);
  }

  if (discovery.matchedIntent) {
    discovery.matchedIntent.query.split(/\s+/).filter(Boolean).forEach((term) => {
      const normalized = normalize(term);
      if (fields.some((field) => normalize(field).includes(normalized))) matches.push(term);
    });
  }

  const priority = [
    rightsSafeActive && asset.reuseDecision?.state === "portal-ready" ? "rights-safe" : "",
    asset.approvedChannels?.[0] ? displayChannel(asset.approvedChannels[0]) : "",
    asset.region || ""
  ].filter(Boolean);

  return Array.from(new Set([...matches, ...priority]))
    .sort((a, b) => {
      const rank = (value: string) => {
        if (value === "rights-safe") return 0;
        if (/approved for /.test(value)) return 1;
        if (asset.region && value === asset.region) return 2;
        if ((asset.usageTerms || []).includes(value)) return 3;
        if ((asset.tags || []).includes(value) || (asset.tjcTerms || []).includes(value)) return 4;
        return 5;
      };
      return rank(a) - rank(b) || a.localeCompare(b);
    })
    .slice(0, 5);
}
