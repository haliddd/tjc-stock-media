import { assetHaystack, matchesCatalogFilter } from "@/lib/catalog-language";
import { assetIsApproved, assetIsPortalReady } from "@/lib/asset-governance";
import { taxonomyAliasGroups } from "@/lib/taxonomy";
import type { SearchResult, StockMediaAsset } from "@/lib/types";

type TermGroup = {
  raw: string;
  terms: string[];
};

export type QueryIntentId =
  | "website-hero"
  | "slide-background"
  | "newsletter"
  | "social"
  | "no-people"
  | "youth-review"
  | "worship"
  | "music"
  | "internal-only";

export type QueryIntentPreset = {
  id: QueryIntentId;
  label: string;
  query: string;
  description: string;
  terms: string[];
  expansions: string[];
  suggestedFilters: string[];
  safetyNote: string;
};

export const queryIntentPresets: QueryIntentPreset[] = [
  {
    id: "website-hero",
    label: "Website hero",
    query: "website hero",
    description: "Wide, low-risk images for web headers.",
    terms: ["website hero", "hero", "banner", "header", "homepage"],
    expansions: ["website", "landscape", "wide", "background", "no people", "portal ready"],
    suggestedFilters: ["portal ready", "website channel", "landscape", "no people"],
    safetyNote: "Hero intent prefers portal-ready and no-people signals, but item evidence still controls download."
  },
  {
    id: "slide-background",
    label: "Slide background",
    query: "slide background",
    description: "Quiet images and graphics for sermons, talks, and decks.",
    terms: ["slide background", "slide", "slides", "sermon slides", "presentation", "deck"],
    expansions: ["teaching", "study", "bible", "worship", "stage", "graphic", "landscape"],
    suggestedFilters: ["portal ready", "projection channel", "landscape", "graphic", "no people"],
    safetyNote: "Slide intent does not imply projection rights; approved channels remain source evidence."
  },
  {
    id: "newsletter",
    label: "Newsletter",
    query: "newsletter",
    description: "Approved images for email and bulletin updates.",
    terms: ["newsletter", "email", "bulletin"],
    expansions: ["event", "fellowship", "welcome", "bible", "flower", "church life"],
    suggestedFilters: ["portal ready", "public safe", "photo", "no people"],
    safetyNote: "Newsletter suggestions are discovery hints, not public-use approval."
  },
  {
    id: "social",
    label: "Social",
    query: "social",
    description: "Social-post candidates with public-safe channel checks.",
    terms: ["social", "instagram", "facebook", "post"],
    expansions: ["square", "event", "fellowship", "approved public", "public safe"],
    suggestedFilters: ["portal ready", "social channel", "square", "public safe"],
    safetyNote: "Social intent must still pass public-safe policy and channel evidence."
  },
  {
    id: "no-people",
    label: "No people",
    query: "no people",
    description: "Lower-risk details, objects, textures, and room photos.",
    terms: ["no people", "empty", "texture", "detail", "object"],
    expansions: ["flower", "plant", "water", "stage", "background"],
    suggestedFilters: ["no people", "portal ready", "photo", "landscape"],
    safetyNote: "No-people intent relies on exported people metadata; reviewers still own visibility truth."
  },
  {
    id: "youth-review",
    label: "Youth review",
    query: "youth review",
    description: "Children/youth candidates for reviewer triage.",
    terms: ["youth review", "youth", "children", "kids", "minor", "minors", "students"],
    expansions: ["people", "possible minors", "children/youth", "consent review", "needs review"],
    suggestedFilters: ["children/youth", "consent review", "needs review", "youth sensitive"],
    safetyNote: "Youth intent routes to review; it never clears consent, public use, or downloads."
  },
  {
    id: "worship",
    label: "Worship",
    query: "worship",
    description: "Worship, Sabbath service, sanctuary, and ministry moments.",
    terms: ["worship", "sabbath", "service", "sanctuary", "prayer"],
    expansions: ["bible", "sermon", "stage", "church", "ministry"],
    suggestedFilters: ["portal ready", "worship", "projection channel", "sacrament sensitive"],
    safetyNote: "Worship context may be sensitive; ranking does not override pastoral or sacrament review."
  },
  {
    id: "music",
    label: "Music",
    query: "music",
    description: "Hymn, choir, music, and livestream-rights review candidates.",
    terms: ["music", "hymn", "choir", "praise", "livestream", "audio"],
    expansions: ["music rights", "hymn permission", "worship", "teaching rights", "review"],
    suggestedFilters: ["music rights", "hymn permission", "rights basis review", "livestream channel"],
    safetyNote: "Music intent is rights-sensitive; it never grants hymn, livestream, or teaching clearance."
  },
  {
    id: "internal-only",
    label: "Internal-only",
    query: "internal ministry",
    description: "Internal ministry and member-visible candidates.",
    terms: ["internal-only", "internal only", "internal", "member", "team"],
    expansions: ["approved internal", "internal ministry", "member visibility", "limited share"],
    suggestedFilters: ["approved internal", "internal ministry", "internal visibility", "limited share channel"],
    safetyNote: "Internal-only discovery does not permit external sharing."
  }
];

const deterministicSearchGroups: Array<{ terms: string[]; expansions: string[]; filters?: string[] }> = [
  ...queryIntentPresets.map((preset) => ({
    terms: preset.terms,
    expansions: preset.expansions,
    filters: preset.suggestedFilters
  })),
  { terms: ["hero", "banner", "header"], expansions: ["website", "landscape", "wide", "background"], filters: ["landscape", "portal ready"] },
  { terms: ["sermon", "slide", "slides", "presentation", "deck"], expansions: ["teaching", "study", "bible", "worship", "stage"], filters: ["graphic", "landscape"] },
  { terms: ["youth", "children", "kids", "minor", "minors", "students"], expansions: ["people", "possible minors", "children/youth"], filters: ["children/youth", "needs review"] },
  { terms: ["web", "website", "homepage"], expansions: ["hero", "banner", "approved public"] },
  { terms: ["social", "instagram", "facebook"], expansions: ["square", "event", "fellowship", "approved public"] },
  { terms: ["newsletter", "email", "bulletin"], expansions: ["event", "fellowship", "bible", "flower"] },
  { terms: ["safe", "approved", "public"], expansions: ["portal ready", "approved public", "ready to use"] },
  { terms: ["background", "texture", "detail"], expansions: ["no people", "flower", "plant", "water", "stage"] },
  { terms: ["communion", "baptism", "footwashing", "sacrament"], expansions: ["sensitive", "worship", "review"], filters: ["needs review"] },
  { terms: ["people", "person", "faces"], expansions: ["adults visible", "people unknown", "possible minors"] }
];

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function tokenize(query: string) {
  return unique(query.replace(/[^\w\s/-]+/g, " ").split(/\s+/));
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase().replace(/[^\w\s/-]+/g, " ").replace(/\s+/g, " ");
}

export function discoveryIntentById(id?: string | null) {
  return queryIntentPresets.find((preset) => preset.id === id);
}

export function isKnownDiscoveryIntent(id?: string | null): id is QueryIntentId {
  return Boolean(discoveryIntentById(id));
}

export function matchDiscoveryIntent(query: string, intentId?: string) {
  const requested = discoveryIntentById(intentId);
  if (requested) return requested;
  const normalized = normalizeQuery(query);
  if (!normalized) return undefined;
  return queryIntentPresets.find((preset) => preset.terms.some((term) => normalizeQuery(term) === normalized));
}

export function resolveDiscoveryQuery(query: string, intentId?: string) {
  const matchedIntent = matchDiscoveryIntent(query, intentId);
  if (query.trim()) return { query, matchedIntent };
  if (matchedIntent) return { query: matchedIntent.query, matchedIntent };
  return { query, matchedIntent };
}

function synonymGroups() {
  return [
    ...deterministicSearchGroups,
    ...taxonomyAliasGroups.map((group) => ({
      terms: unique([group.canonical, ...group.aliases]),
      expansions: unique([group.canonical, ...group.aliases, ...(group.searchBoosts || [])]),
      filters: group.filters
    }))
  ];
}

export function buildDiscoveryQuery(query: string) {
  const tokens = tokenize(query);
  const normalized = normalizeQuery(query);
  const groupsForQuery = synonymGroups();
  const phraseMatches = groupsForQuery
    .flatMap((group) => group.terms)
    .filter((term) => term.includes(" ") || term.includes("/") || term.includes("-"))
    .filter((term) => normalized.includes(term));
  const queryTerms = unique([...tokens, ...phraseMatches]);
  const groups: TermGroup[] = tokens.map((token) => {
    const matched = groupsForQuery.filter((group) => group.terms.includes(token));
    return {
      raw: token,
      terms: unique([token, ...matched.flatMap((group) => group.expansions)])
    };
  });
  for (const phrase of phraseMatches) {
    if (groups.some((group) => group.raw === phrase)) continue;
    const matched = groupsForQuery.filter((group) => group.terms.includes(phrase));
    groups.push({
      raw: phrase,
      terms: unique([phrase, ...matched.flatMap((group) => group.expansions)])
    });
  }
  return {
    groups,
    expandedTerms: unique(groups.flatMap((group) => group.terms).filter((term) => !queryTerms.includes(term))).slice(0, 10)
  };
}

export function matchesDiscoveryQuery(asset: StockMediaAsset, query: string) {
  if (!query.trim()) return true;
  const haystack = assetHaystack(asset);
  const discovery = buildDiscoveryQuery(query);
  return discovery.groups.every((group) => group.terms.some((term) => haystack.includes(term)));
}

export function discoveryScore(asset: StockMediaAsset, query: string) {
  if (!query.trim()) return 0;
  const haystack = assetHaystack(asset);
  const title = asset.title.toLowerCase();
  const discovery = buildDiscoveryQuery(query);
  let score = 0;
  for (const group of discovery.groups) {
    if (title.includes(group.raw)) score += 40;
    else if (haystack.includes(group.raw)) score += 20;
    const synonymMatches = group.terms.filter((term) => term !== group.raw && haystack.includes(term)).length;
    score += Math.min(synonymMatches * 6, 18);
  }
  if (assetIsPortalReady(asset)) score += 22;
  else if (assetIsApproved(asset)) score += 10;
  if (asset.tags?.length) score += Math.min(asset.tags.length, 6);
  if (asset.tjcTerms?.length) score += Math.min(asset.tjcTerms.length, 6);
  if (asset.imageUrls?.card || asset.preview || asset.thumbnail) score += 4;
  return score;
}

function countMatching(assets: StockMediaAsset[], filter: string) {
  return assets.filter((asset) => matchesCatalogFilter(asset, filter)).length;
}

function filterCount(assets: StockMediaAsset[], filter: string, activeFilters: string[]) {
  if (activeFilters.includes(filter)) return 0;
  return countMatching(assets, filter);
}

function uniqueSuggestedFilters(filters: SearchResult["discovery"]["suggestedFilters"]) {
  const seen = new Set<string>();
  return filters.filter((item) => {
    if (seen.has(item.filter)) return false;
    seen.add(item.filter);
    return true;
  });
}

function suggestedFilters(assets: StockMediaAsset[], activeFilters: string[] = [], query = ""): SearchResult["discovery"]["suggestedFilters"] {
  const discovery = buildDiscoveryQuery(query);
  const matchedIntent = matchDiscoveryIntent(query);
  const queryFilters = unique(
    [
      ...(matchedIntent?.suggestedFilters || []),
      ...discovery.groups.flatMap((group) =>
        synonymGroups()
          .filter((synonymGroup) => group.terms.some((term) => synonymGroup.terms.includes(term) || synonymGroup.expansions.includes(term)))
          .flatMap((synonymGroup) => synonymGroup.filters || [])
      )
    ]
  );
  const candidates: SearchResult["discovery"]["suggestedFilters"] = [
    { label: "Portal ready", filter: "portal ready", count: filterCount(assets, "portal ready", activeFilters), kind: "policy" },
    { label: "Public safe", filter: "public safe", count: filterCount(assets, "public safe", activeFilters), kind: "policy" },
    { label: "Website channel", filter: "website channel", count: filterCount(assets, "website channel", activeFilters), kind: "policy" },
    { label: "Consent review", filter: "consent review", count: filterCount(assets, "consent review", activeFilters), kind: "people" },
    { label: "No people", filter: "no people", count: filterCount(assets, "no people", activeFilters), kind: "people" },
    { label: "Photos", filter: "photo", count: filterCount(assets, "photo", activeFilters), kind: "media" },
    { label: "Graphics", filter: "graphic", count: filterCount(assets, "graphic", activeFilters), kind: "media" },
    { label: "Landscape", filter: "landscape", count: filterCount(assets, "landscape", activeFilters), kind: "shape" },
    { label: "Worship", filter: "worship", count: filterCount(assets, "worship", activeFilters), kind: "ministry" },
    { label: "Teaching", filter: "teaching", count: filterCount(assets, "teaching", activeFilters), kind: "ministry" },
    { label: "Fellowship", filter: "fellowship", count: filterCount(assets, "fellowship", activeFilters), kind: "ministry" },
    { label: "Needs review", filter: "needs review", count: filterCount(assets, "needs review", activeFilters), kind: "workflow" },
    { label: "Rendition gaps", filter: "rendition gap", count: filterCount(assets, "rendition gap", activeFilters), kind: "workflow" },
    { label: "Lifecycle review", filter: "lifecycle review", count: filterCount(assets, "lifecycle review", activeFilters), kind: "workflow" },
    { label: "Music rights", filter: "music rights", count: filterCount(assets, "music rights", activeFilters), kind: "workflow" },
    { label: "Internal ministry", filter: "internal ministry", count: filterCount(assets, "internal ministry", activeFilters), kind: "policy" },
    { label: "Projection channel", filter: "projection channel", count: filterCount(assets, "projection channel", activeFilters), kind: "policy" },
    { label: "Social channel", filter: "social channel", count: filterCount(assets, "social channel", activeFilters), kind: "policy" },
    ...queryFilters.map((filter) => ({ label: filter.replace(/\b\w/g, (letter) => letter.toUpperCase()), filter, count: filterCount(assets, filter, activeFilters), kind: "ministry" as const }))
  ];
  return uniqueSuggestedFilters(candidates)
    .filter((item) => item.count > 0 && item.count < assets.length)
    .sort((a, b) => Number(queryFilters.includes(b.filter)) - Number(queryFilters.includes(a.filter)) || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
}

function noResultHelp({
  query,
  filters,
  availableAssets
}: {
  query: string;
  filters: string[];
  availableAssets: StockMediaAsset[];
}): SearchResult["discovery"]["noResultHelp"] | undefined {
  if (!query.trim() && !filters.length) return undefined;
  const discovery = buildDiscoveryQuery(query);
  const querySuggestions = unique([
    ...discovery.expandedTerms,
    "sermon slides",
    "website hero",
    "newsletter",
    "worship",
    "fellowship",
    "children/youth"
  ]).slice(0, 6);
  return {
    title: "No exact match yet",
    guidance: "Try ministry synonyms, remove narrow filters, or switch to a saved view that uses controlled review fields.",
    querySuggestions,
    filters: suggestedFilters(availableAssets, filters, query),
    savedViews: [
      { id: "approved-church-wide", label: "Ready to use" },
      { id: "public-safe", label: "Public safe" },
      { id: "website-hero", label: "Website hero" },
      { id: "sermon-slides", label: "Sermon slides" },
      { id: "children-youth-review", label: "Children/youth review" }
    ]
  };
}

export function buildCatalogDiscovery({
  query,
  intent,
  view,
  collection,
  filters = [],
  matchedAssets,
  availableAssets,
  totalVisible
}: {
  query: string;
  intent?: string;
  view?: string;
  collection?: string;
  filters?: string[];
  matchedAssets: StockMediaAsset[];
  availableAssets?: StockMediaAsset[];
  totalVisible: number;
}): SearchResult["discovery"] {
  const discovery = buildDiscoveryQuery(query);
  const matchedIntent = matchDiscoveryIntent(query, intent);
  const filterUniverse = matchedAssets.length ? matchedAssets : (availableAssets || matchedAssets);
  const mode = collection ? "collection" : view ? "saved-view" : query.trim() ? "smart-query" : "browse";
  const noun = matchedAssets.length === 1 ? "asset" : "assets";
  const summary =
    mode === "smart-query"
      ? `Smart discovery found ${matchedAssets.length.toLocaleString()} ${noun} from ${totalVisible.toLocaleString()} visible records.`
      : mode === "saved-view"
        ? `Saved view contains ${matchedAssets.length.toLocaleString()} ${noun}.`
        : mode === "collection"
          ? `Collection view contains ${matchedAssets.length.toLocaleString()} ${noun}.`
          : `Browsing ${matchedAssets.length.toLocaleString()} visible ${noun}.`;

  return {
    mode,
    summary,
    expandedTerms: discovery.expandedTerms,
    matchedIntent: matchedIntent
      ? {
          id: matchedIntent.id,
          label: matchedIntent.label,
          query: matchedIntent.query,
          description: matchedIntent.description,
          safetyNote: matchedIntent.safetyNote
        }
      : undefined,
    intentPresets: queryIntentPresets.map((preset) => ({
      id: preset.id,
      label: preset.label,
      query: preset.query,
      description: preset.description,
      suggestedFilters: preset.suggestedFilters
    })),
    suggestedFilters: suggestedFilters(filterUniverse, filters, query),
    noResultHelp: matchedAssets.length ? undefined : noResultHelp({ query, filters, availableAssets: availableAssets || matchedAssets }),
    scoreHint: query.trim()
      ? "Results are ranked by title, metadata, synonym match, portal readiness, and derivative availability."
      : "Default order balances approval state, curation signals, and visual diversity.",
    rankingExplanation: [
      { label: "Text match", detail: "Title and approved metadata matches rank first." },
      { label: "Intent expansion", detail: "Deterministic ministry synonyms widen recall without embeddings." },
      { label: "Trust readiness", detail: "Portal-ready and approved assets get rank boosts, but not permission changes." },
      { label: "Derivative signal", detail: "Assets with role-safe previews rank slightly higher for browsing." }
    ],
    safetyNote: matchedIntent?.safetyNote || "Discovery suggestions are search hints only. Item-level rights, people, review, and download gates remain permission truth."
  };
}
