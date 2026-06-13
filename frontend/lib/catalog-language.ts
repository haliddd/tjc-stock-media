import {
  assetHasChildrenYouthRisk,
  assetHasRenditionGap,
  assetHasTaxonomyDrift,
  assetIsApproved,
  assetIsArchiveOnly,
  assetIsDuplicateCandidate,
  assetIsPortalReady,
  assetNeedsAiEnrichment,
  assetNeedsRightsReview,
  assetNeedsReview,
  assetNeedsSourceReview,
  assetNeedsStaleApprovalReview
} from "@/lib/asset-governance";
import { assetSearchTerms } from "@/lib/tagging-model";
import { safeEnumValue, safeNonNegativeInt } from "@/lib/persisted-record-safety";
import { reviewRiskFlags } from "@/lib/workflow-policy";
import type { ApprovedChannel, CatalogSort, StockMediaAsset } from "@/lib/types";

export type SavedViewDefinition = {
  id: string;
  label: string;
  description: string;
  reason: string;
  terms?: string[];
  match: (asset: StockMediaAsset) => boolean;
};

export type CollectionDefinition = {
  id: string;
  name: string;
  description: string;
  searchQuery: string;
  terms: string[];
};

export type SearchIntentDefinition = {
  view: string;
  confidence: "exact" | "synonym";
  terms: string[];
};

export const catalogSortOptions: CatalogSort[] = ["Approved first", "Recently approved", "Newest", "A-Z"];

export function normalizeCatalogSort(value: unknown, fallback: CatalogSort = "Approved first"): CatalogSort {
  return safeEnumValue(value, catalogSortOptions, fallback);
}

export function assetHaystack(asset: StockMediaAsset) {
  return assetSearchTerms(asset)
    .join(" ")
    .toLowerCase();
}

export function includesAny(asset: StockMediaAsset, terms: string[]) {
  const haystack = assetHaystack(asset);
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function assetTextValues(asset: StockMediaAsset) {
  return [
    asset.collection,
    asset.eventName,
    asset.eventSeries,
    asset.church,
    asset.region,
    asset.publicationTitle,
    asset.language,
    asset.versionOrEdition,
    asset.fileExtension,
    asset.reuseTier,
    asset.visibilityTier,
    asset.sensitivityClass,
    asset.rightsBasis,
    asset.domainReviewer,
    asset.consentStatus,
    asset.withdrawalStatus,
    ...(asset.tags || []),
    ...(asset.tjcTerms || []),
    ...(asset.usageTerms || []),
    ...(asset.approvedChannels || [])
  ];
}

function assetHasFieldValue(asset: StockMediaAsset, value: string) {
  const normalized = value.toLowerCase();
  return assetTextValues(asset).some((item) => item?.toLowerCase() === normalized);
}

function assetHasFieldText(asset: StockMediaAsset, value: string) {
  const normalized = value.toLowerCase();
  return assetTextValues(asset).some((item) => item?.toLowerCase().includes(normalized));
}

function assetHasAnyChannel(asset: StockMediaAsset, channels: ApprovedChannel[]) {
  return channels.some((channel) => asset.approvedChannels?.includes(channel));
}

function assetIsLifecycleReviewDebt(asset: StockMediaAsset) {
  return Boolean(
    asset.withdrawalStatus && asset.withdrawalStatus !== "active" ||
      assetNeedsStaleApprovalReview(asset)
  );
}

export function matchesCatalogQuery(asset: StockMediaAsset, query: string) {
  if (!query.trim()) return true;
  const haystack = assetHaystack(asset);
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export const savedViewDefinitions: SavedViewDefinition[] = [
  {
    id: "approved-church-wide",
    label: "Ready to use",
    description: "Approved copies cleared for normal reuse.",
    reason: "Fastest path for newsletters, websites, slides, and church-wide communication.",
    match: assetIsPortalReady
  },
  {
    id: "batch-approved-blockers",
    label: "Needs review",
    description: "Approved-status media that still has reuse blockers.",
    reason: "Keeps batch approval separate from actual public-safe reuse.",
    match: (asset) => asset.status === "Approved Public" && !assetIsPortalReady(asset)
  },
  {
    id: "internal-ministry",
    label: "Internal ministry use only",
    description: "Useful for teams, recap decks, and internal ministry updates.",
    reason: "Keeps internal assets discoverable without public sharing risk.",
    match: (asset) => asset.status === "Approved Internal" || asset.usageScope === "Internal"
  },
  {
    id: "website-hero",
    label: "Website hero images",
    description: "Wide, quiet, no-people or low-risk images for web headers.",
    reason: "Uses approved status plus available website, landscape, detail, Bible, flower, sanctuary, and no-people metadata.",
    terms: ["website", "hero", "landscape", "sanctuary", "bible", "flower", "plant", "water", "stage"],
    match: (asset) => asset.status === "Approved Public" && (asset.peopleRisk === "No people" || includesAny(asset, ["website", "hero", "landscape", "bible", "flower", "plant", "water", "stage"]))
  },
  {
    id: "sermon-slides",
    label: "Sermon / slide backgrounds",
    description: "Bible, worship, stage, study, and graphic assets for presentation use.",
    reason: "Backed by tags, TJC terms, usage terms, and media type.",
    terms: ["sermon", "slide", "presentation", "worship", "bible", "teaching", "study", "stage", "graphic"],
    match: (asset) => (asset.status === "Approved Public" || asset.status === "Approved Internal") && includesAny(asset, ["sermon", "slide", "presentation", "worship", "bible", "teaching", "study", "stage", "graphic"])
  },
  {
    id: "newsletter",
    label: "Newsletter images",
    description: "Approved photos and details suited for local church updates.",
    reason: "Uses approved assets with newsletter/useful/event/detail tags when present.",
    terms: ["newsletter", "fellowship", "welcome", "flower", "bible", "event", "church life"],
    match: (asset) => asset.status === "Approved Public" && includesAny(asset, ["newsletter", "fellowship", "welcome", "flower", "bible", "event", "church life", "plant"])
  },
  {
    id: "social-media",
    label: "Social media images",
    description: "Approved assets with social, square, event, or detail usefulness.",
    reason: "Shows only approved public assets; derivatives may still be configured by admins.",
    terms: ["social", "square", "event", "fellowship", "flower", "bible", "welcome"],
    match: (asset) => asset.status === "Approved Public" && includesAny(asset, ["social", "square", "event", "fellowship", "flower", "bible", "welcome", "plant"])
  },
  {
    id: "no-people",
    label: "No people",
    description: "Lower-risk details, textures, and object photos.",
    reason: "Uses exported people visibility metadata.",
    match: (asset) => asset.peopleRisk === "No people" && (asset.status === "Approved Public" || asset.status === "Approved Internal")
  },
  {
    id: "people-unknown",
    label: "People unknown",
    description: "Assets where people/minors visibility is not confirmed.",
    reason: "Keeps public-use decisions honest until reviewers classify people/minors visibility.",
    match: (asset) => !asset.peopleRisk || asset.peopleRisk === "Unknown"
  },
  {
    id: "children-youth-review",
    label: "Children/youth review",
    description: "Assets needing extra care before public use.",
    reason: "Uses minors, children/youth, and sensitive-context metadata.",
    match: (asset) => asset.peopleRisk === "Possible minors" || !asset.peopleRisk || asset.peopleRisk === "Unknown" || includesAny(asset, ["children", "youth", "minor"])
  },
  {
    id: "recently-approved",
    label: "Recently approved",
    description: "Newest reviewed public/internal assets.",
    reason: "Uses exported review date where present.",
    match: (asset) => Boolean(asset.reviewedDate) && assetIsApproved(asset)
  },
  {
    id: "needs-review",
    label: "Needs review",
    description: "Blocked until reviewer approval.",
    reason: "Uses review status and people/minors risk.",
    match: assetNeedsReview
  },
  {
    id: "archive-only",
    label: "Archive only",
    description: "Traceable, searchable assets not promoted for reuse.",
    reason: "Uses archive status or archive usage scope.",
    match: (asset) => asset.status === "Searchable Archive" || asset.usageScope === "Archive Only"
  },
  {
    id: "archive-preservation",
    label: "Archive / preservation",
    description: "Preserved records searchable to reviewers/admins but not normal reusable media.",
    reason: "Archive views preserve history without becoming permission truth.",
    match: assetIsArchiveOnly
  },
  {
    id: "portal-ready",
    label: "Portal ready",
    description: "Public-approved assets with enough metadata and renditions for a share portal.",
    reason: "Combines approval, health score, children/youth risk, and derivative readiness.",
    match: assetIsPortalReady
  },
  {
    id: "public-safe",
    label: "Public safe",
    description: "Governed reusable assets that pass portal-ready policy.",
    reason: "Public safe means portal-ready, not raw Approved Public.",
    match: assetIsPortalReady
  },
  {
    id: "website-channel-ready",
    label: "Website channel ready",
    description: "Portal-ready media explicitly cleared for website use.",
    reason: "Combines portal-ready policy with approved channel metadata.",
    terms: ["website", "hero", "web"],
    match: (asset) => assetIsPortalReady(asset) && asset.approvedChannels?.includes("website") === true
  },
  {
    id: "social-channel-ready",
    label: "Social channel ready",
    description: "Portal-ready media explicitly cleared for social use.",
    reason: "Combines portal-ready policy with approved channel metadata.",
    terms: ["social", "instagram", "facebook"],
    match: (asset) => assetIsPortalReady(asset) && asset.approvedChannels?.includes("social") === true
  },
  {
    id: "music-rights-review",
    label: "Music/hymn rights review",
    description: "Hymn, music, choir, livestream, or worship audio/video records needing rights confidence.",
    reason: "Finds records where music rights basis, channel, notice, or reviewer evidence may be missing.",
    terms: ["hymn", "music", "choir", "livestream"],
    match: (asset) => reviewRiskFlags(asset).includes("Music/hymn rights review") || assetHasFieldValue(asset, "music-rights")
  },
  {
    id: "doctrine-sacrament-review",
    label: "Doctrine/sacrament review",
    description: "Baptism, Holy Communion, footwashing, Holy Spirit, and doctrine-sensitive records.",
    reason: "Routes doctrine and sacrament context to domain review without approving reuse.",
    terms: ["baptism", "holy communion", "footwashing", "sacrament"],
    match: (asset) => reviewRiskFlags(asset).includes("Doctrine/sacrament review") || assetHasFieldValue(asset, "doctrine")
  },
  {
    id: "consent-review",
    label: "Consent review",
    description: "People/minors records missing or needing consent evidence.",
    reason: "Consent state remains review evidence, not a search guess.",
    match: (asset) => assetHasChildrenYouthRisk(asset) || /unknown|missing|not confirmed|needs review/i.test(asset.consentStatus || "")
  },
  {
    id: "rights-basis-review",
    label: "Rights basis review",
    description: "Records with unknown, internal-only, missing, or expiring rights basis.",
    reason: "Keeps rights basis separate from raw approval state.",
    match: (asset) => assetNeedsRightsReview(asset) || !asset.rightsBasis || asset.rightsBasis === "unknown" || asset.rightsBasis === "fair-use-internal-only"
  },
  {
    id: "lifecycle-review",
    label: "Lifecycle review",
    description: "Expired, embargoed, withdrawn, takedown, or recheck-due records.",
    reason: "Lifecycle state degrades assets to review instead of silently staying reusable.",
    match: assetIsLifecycleReviewDebt
  },
  {
    id: "ai-enrichment",
    label: "Metadata enrichment queue",
    description: "Assets that need tags, dimensions, people check, or TJC vocabulary.",
    reason: "Metadata suggestions need human review before rights, tags, or reuse guidance change.",
    match: assetNeedsAiEnrichment
  },
  {
    id: "taxonomy-drift",
    label: "Taxonomy drift",
    description: "Generic titles or sparse controlled vocabulary that weaken search.",
    reason: "Finds assets needing normalized terms before teams rely on search.",
    match: assetHasTaxonomyDrift
  },
  {
    id: "stale-approvals",
    label: "Stale approvals",
    description: "Previously approved assets old enough for periodic review.",
    reason: "Keeps permissions and public-use assumptions from going stale.",
    match: (asset) => assetNeedsStaleApprovalReview(asset)
  },
  {
    id: "rendition-gaps",
    label: "Rendition gaps",
    description: "Assets missing downloadable/detail derivatives or dimensions.",
    reason: "Good DAMs expose correct sizes and approved derivatives for each channel.",
    match: assetHasRenditionGap
  },
  {
    id: "duplicate-candidates",
    label: "Duplicate cleanup",
    description: "Potential duplicate groups that need a canonical/source decision.",
    reason: "Best-in-class DAMs keep duplicate records traceable without confusing users.",
    match: (asset) => assetIsDuplicateCandidate(asset)
  }
];

export const collectionDefinitions: CollectionDefinition[] = [
  {
    id: "sabbath",
    name: "Sabbath",
    description: "Worship, Sabbath service, and church life",
    searchQuery: "worship Sabbath service church life Bible fellowship",
    terms: ["sabbath", "worship", "bible", "scripture", "church", "service", "sermon", "fellowship"]
  },
  {
    id: "teaching-study",
    name: "Teaching & Study",
    description: "Bible study, sermon, and teaching visuals",
    searchQuery: "Bible teaching study sermon slides",
    terms: ["teaching", "study", "bible", "scripture", "lesson", "sermon", "slide"]
  },
  {
    id: "seasonal-details",
    name: "Seasonal Details",
    description: "Flowers, decorations, and visual textures",
    searchQuery: "flowers seasonal plant decoration",
    terms: ["seasonal", "flower", "flowers", "plant", "detail", "decoration"]
  },
  {
    id: "welcome-team",
    name: "Welcome Team",
    description: "Hospitality and gathering details",
    searchQuery: "welcome fellowship church hospitality",
    terms: ["welcome", "fellowship", "church", "people", "hospitality"]
  },
  {
    id: "fellowship",
    name: "Fellowship",
    description: "Church Life and ministry gatherings",
    searchQuery: "fellowship church life gathering",
    terms: ["fellowship", "church life", "gathering", "people"]
  },
  {
    id: "web-slides",
    name: "Web & Slides",
    description: "Graphics, slide backgrounds, and web-ready assets",
    searchQuery: "graphic slide website hero",
    terms: ["graphic", "graphics", "slide", "website", "stage", "hero"]
  }
];

export const viewAliases = new Map([
  ["portal-ready", "approved-church-wide"],
  ["public-safe", "portal-ready"],
  ["children-youth", "children-youth-review"]
]);

export const intentDefinitions: SearchIntentDefinition[] = [
  { view: "website-hero", confidence: "exact", terms: ["website hero"] },
  { view: "website-hero", confidence: "synonym", terms: ["hero", "banner", "header"] },
  { view: "portal-ready", confidence: "exact", terms: ["public safe", "safe for web", "governed reusable"] },
  { view: "no-people", confidence: "exact", terms: ["no people"] },
  { view: "children-youth-review", confidence: "synonym", terms: ["children", "youth", "minors", "minor"] },
  { view: "needs-review", confidence: "exact", terms: ["needs review", "review"] },
  { view: "internal-ministry", confidence: "exact", terms: ["internal"] },
  { view: "archive-only", confidence: "exact", terms: ["archive"] },
  { view: "music-rights-review", confidence: "exact", terms: ["hymn rights", "music rights"] },
  { view: "doctrine-sacrament-review", confidence: "exact", terms: ["doctrine review", "sacrament review"] },
  { view: "lifecycle-review", confidence: "exact", terms: ["expired approval", "embargoed", "withdrawn"] }
];

export function matchesCatalogFilter(asset: StockMediaAsset, filter: string) {
  const value = filter.toLowerCase();
  const dimensions = asset.imageDimensions?.match(/(\d+)\D+(\d+)/);
  const width = safeNonNegativeInt(dimensions?.[1]);
  const height = safeNonNegativeInt(dimensions?.[2]);
  if (value === "approved public" || value === "church-wide use") return asset.status === "Approved Public";
  if (value === "approved internal" || value === "internal ministry") return asset.status === "Approved Internal";
  if (value === "needs review") return asset.status === "Needs Review" || asset.status === "Possible Minors";
  if (value === "archive only") return asset.status === "Searchable Archive" || asset.usageScope === "Archive Only";
  if (["photo", "video", "audio", "graphic", "document"].includes(value)) return asset.mediaType === value;
  if (value === "no people") return asset.peopleRisk === "No people";
  if (value === "adults only") return asset.peopleRisk === "Adults visible";
  if (value === "people unknown") return !asset.peopleRisk || asset.peopleRisk === "Unknown";
  if (value === "possible minors" || value === "children/youth") return asset.peopleRisk === "Possible minors";
  if (value === "missing source") return assetNeedsSourceReview(asset);
  if (value === "rights review") return reviewRiskFlags(asset).includes("Rights unclear");
  if (value === "rights basis review" || value === "rights basis missing") return assetNeedsRightsReview(asset) || !asset.rightsBasis || asset.rightsBasis === "unknown";
  if (value === "portal ready") return assetIsPortalReady(asset);
  if (value === "public safe") return assetIsPortalReady(asset);
  if (value === "stock-safe" || value === "stock safe") return asset.reuseTier === "stock-safe";
  if (value === "context-safe" || value === "context safe") return asset.reuseTier === "context-safe";
  if (value === "archive-only" || value === "archive only") return assetIsArchiveOnly(asset);
  if (value === "public visibility") return asset.visibilityTier === "public";
  if (value === "internal visibility" || value === "member visibility") return asset.visibilityTier === "internal/member";
  if (value === "reviewer visibility" || value === "admin visibility") return asset.visibilityTier === "reviewer/admin";
  if (value === "public domain") return asset.rightsBasis === "public-domain" || asset.rightsBasis === "jurisdiction-limited-public-domain";
  if (value === "tjc-owned" || value === "tjc owned") return asset.rightsBasis === "TJC-owned";
  if (value === "contributor license") return asset.rightsBasis === "contributor-license";
  if (value === "hymn license" || value === "hymn permission") return asset.rightsBasis === "hymn-license" || asset.rightsBasis === "hymn-permission";
  if (value === "fair use internal") return asset.rightsBasis === "fair-use-internal-only";
  if (value === "unknown rights") return !asset.rightsBasis || asset.rightsBasis === "unknown";
  if (value === "website channel" || value === "website-ready") return assetHasAnyChannel(asset, ["website"]);
  if (value === "social channel" || value === "social-ready") return assetHasAnyChannel(asset, ["social"]);
  if (value === "print channel" || value === "print-ready") return assetHasAnyChannel(asset, ["print"]);
  if (value === "projection channel" || value === "projection-ready") return assetHasAnyChannel(asset, ["projection"]);
  if (value === "livestream channel" || value === "livestream-ready") return assetHasAnyChannel(asset, ["livestream"]);
  if (value === "internal training channel") return assetHasAnyChannel(asset, ["internal-training"]);
  if (value === "limited share channel") return assetHasAnyChannel(asset, ["limited-share-link"]);
  if (value === "public-safe sensitivity") return asset.sensitivityClass === "public-safe";
  if (value === "member sensitive") return asset.sensitivityClass === "member-sensitive";
  if (value === "sacrament sensitive" || value === "doctrine review") return asset.sensitivityClass === "sacrament-sensitive" || reviewRiskFlags(asset).includes("Doctrine/sacrament review");
  if (value === "youth sensitive" || value === "minors consent") return asset.sensitivityClass === "youth-sensitive" || assetHasChildrenYouthRisk(asset);
  if (value === "testimony sensitive" || value === "pastoral review") return asset.sensitivityClass === "testimony-sensitive" || reviewRiskFlags(asset).includes("Testimony/pastoral sensitivity review");
  if (value === "music rights" || value === "teaching rights") return reviewRiskFlags(asset).includes("Music/hymn rights review") || assetHasFieldValue(asset, "music-rights");
  if (value === "internal governance") return asset.sensitivityClass === "internal-governance";
  if (value === "archive restricted") return asset.sensitivityClass === "archive-restricted";
  if (value === "consent confirmed") return /confirmed|not applicable|documented exception/i.test(`${asset.consentStatus || ""} ${asset.rightsNotes || ""}`);
  if (value === "consent missing" || value === "consent review") return /unknown|missing|not confirmed|needs review/i.test(asset.consentStatus || "") || assetHasChildrenYouthRisk(asset);
  if (value === "ai enrichment" || value === "metadata enrichment") return assetNeedsAiEnrichment(asset);
  if (value === "taxonomy drift") return assetHasTaxonomyDrift(asset);
  if (value === "duplicate candidate") return assetIsDuplicateCandidate(asset);
  if (value === "stale approval" || value === "recheck due") return assetNeedsStaleApprovalReview(asset);
  if (value === "expired" || value === "expired approval") return asset.withdrawalStatus === "expired" || Boolean(asset.expirationDate || asset.rightsExpirationDate || asset.consentExpirationDate) && assetNeedsStaleApprovalReview(asset);
  if (value === "embargoed") return asset.withdrawalStatus === "embargoed" || Boolean(asset.embargoDate) && assetNeedsStaleApprovalReview(asset);
  if (value === "withdrawn" || value === "takedown") return asset.withdrawalStatus === "withdrawn" || asset.withdrawalStatus === "takedown-requested";
  if (value === "lifecycle review") return assetIsLifecycleReviewDebt(asset);
  if (value === "rendition gap") return assetHasRenditionGap(asset);
  if (value === "landscape") return width > height || assetHaystack(asset).includes("landscape");
  if (value === "portrait") return height > width || assetHaystack(asset).includes("portrait");
  if (value === "square") return Boolean(width && height && Math.abs(width - height) < Math.max(width, height) * 0.08) || assetHaystack(asset).includes("square");
  if (value === "has region") return Boolean(asset.region);
  if (value === "has church") return Boolean(asset.church);
  if (value === "has language") return Boolean(asset.language);
  if (value.startsWith("region:")) return asset.region?.toLowerCase() === value.slice("region:".length).trim();
  if (value.startsWith("church:")) return asset.church?.toLowerCase() === value.slice("church:".length).trim();
  if (value.startsWith("language:")) return asset.language?.toLowerCase() === value.slice("language:".length).trim();
  if (value.startsWith("file:")) return asset.fileExtension?.toLowerCase().replace(/^\./, "") === value.slice("file:".length).trim().replace(/^\./, "");
  if (value.startsWith("section:") || value.startsWith("collection:")) return assetHasFieldText(asset, value.split(":").slice(1).join(":").trim());
  if (value.startsWith("ministry:") || value.startsWith("event:")) return assetHasFieldText(asset, value.split(":").slice(1).join(":").trim());
  if (value === "lm photos") return /lm photos/i.test(`${asset.sourceSystem || ""} ${asset.sourceAccount || ""}`);
  if (value === "resourcespace") return Boolean(asset.resourceSpaceId);
  if (value === "photographer") return Boolean(asset.sourceAccount);
  return assetHaystack(asset).includes(value);
}
