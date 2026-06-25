import { assetIsPortalReady, assetPortalBlockers } from "@/lib/asset-governance";
import { collectionDefinitionForId, collectionDefinitions, includesAny, matchesCatalogFilter } from "@/lib/catalog-language";
import { getActiveMediaSource } from "@/lib/media-source";
import { assetWithRoleImageUrls } from "@/lib/presentation";
import { assetForRolePayload } from "@/lib/source-redaction";
import type { MediaSourceStatus, StockMediaAsset } from "@/lib/types";

export type PublicPortalSort = "curated" | "newest" | "title";
export type PublicPortalMediaType = "all" | StockMediaAsset["mediaType"];

export type PublicPortalPreviewAsset = StockMediaAsset & {
  publicDownloadHref: string;
};

export type PublicPortalReadinessDiagnostic = {
  id: "reviewer-date" | "rights-consent" | "people-minors" | "approved-copy" | "usage-scope" | "publish-state";
  label: string;
  count: number;
  detail: string;
  href: string;
};

export type PublicPortalPreview = {
  collection: {
    id: string;
    name: string;
    description: string;
    searchQuery: string;
  };
  assets: PublicPortalPreviewAsset[];
  counts: {
    collectionMatches: number;
    portalReady: number;
    shown: number;
  };
  filters: {
    sort: PublicPortalSort;
    mediaType: PublicPortalMediaType;
    mediaTypes: PublicPortalMediaType[];
  };
  source: MediaSourceStatus;
  linkEnabled: false;
  localDemoNotice: string;
  usageNotes: string[];
  rightsSummary: string;
  readinessDiagnostics: PublicPortalReadinessDiagnostic[];
  contactPath: string;
  expirationNotice: string;
};

const publicPortalSorts = new Set<PublicPortalSort>(["curated", "newest", "title"]);
const publicPortalMediaTypes: PublicPortalMediaType[] = ["all", "photo", "video", "audio", "graphic", "document"];

export function normalizePublicPortalSort(value?: string | null): PublicPortalSort {
  return publicPortalSorts.has(value as PublicPortalSort) ? value as PublicPortalSort : "curated";
}

export function normalizePublicPortalMediaType(value?: string | null): PublicPortalMediaType {
  return publicPortalMediaTypes.includes(value as PublicPortalMediaType) ? value as PublicPortalMediaType : "all";
}

function publicCollectionMatches(asset: StockMediaAsset, collectionId: string) {
  const definition = collectionDefinitionForId(collectionId);
  if (!definition) return false;
  if (definition.routeFilter) return matchesCatalogFilter(asset, definition.routeFilter);
  return includesAny(asset, definition.terms);
}

function sortPublicAssets(assets: StockMediaAsset[], sort: PublicPortalSort) {
  const sorted = [...assets];
  if (sort === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));
  }
  if (sort === "newest") {
    return sorted.sort((a, b) => (b.reviewedDate || b.capturedDate || b.importDate || "").localeCompare(a.reviewedDate || a.capturedDate || a.importDate || ""));
  }
  return sorted.sort((a, b) =>
    Number(Boolean(b.imageUrls?.collection || b.imageUrls?.card || b.thumbnail)) -
      Number(Boolean(a.imageUrls?.collection || a.imageUrls?.card || a.thumbnail)) ||
    (b.reviewedDate || "").localeCompare(a.reviewedDate || "") ||
    a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })
  );
}

function publicAssetPayload(asset: StockMediaAsset): PublicPortalPreviewAsset {
  const viewerAsset = assetForRolePayload("Viewer", assetWithRoleImageUrls(asset, "Viewer"));
  return {
    ...viewerAsset,
    publicDownloadHref: `/api/download/${encodeURIComponent(asset.id)}?role=Viewer`
  };
}

function blockersFor(asset: StockMediaAsset) {
  return assetPortalBlockers(asset).join(" | ");
}

function countWhere(assets: StockMediaAsset[], predicate: (asset: StockMediaAsset, blockers: string) => boolean) {
  return assets.filter((asset) => predicate(asset, blockersFor(asset))).length;
}

function buildReadinessDiagnostics(collectionMatches: StockMediaAsset[]): PublicPortalReadinessDiagnostic[] {
  const diagnostics: PublicPortalReadinessDiagnostic[] = [
    {
      id: "reviewer-date",
      label: "Reviewer/date evidence",
      count: countWhere(collectionMatches, (asset, blockers) => !asset.reviewer || !asset.reviewedDate || blockers.includes("Reviewer/date missing")),
      detail: "Needs named reviewer and review date before public preview.",
      href: "/review?queue=missing-evidence"
    },
    {
      id: "rights-consent",
      label: "Rights or consent evidence",
      count: countWhere(collectionMatches, (_asset, blockers) =>
        blockers.includes("Rights/consent unclear") ||
        blockers.includes("Consent/release record missing") ||
        blockers.includes("Required notice missing") ||
        blockers.toLowerCase().includes("channel clearance")
      ),
      detail: "Needs rights, consent, notice, or channel evidence before public use.",
      href: "/review?queue=rights-review"
    },
    {
      id: "people-minors",
      label: "People/minors review",
      count: countWhere(collectionMatches, (_asset, blockers) =>
        blockers.includes("People/minors unknown") ||
        blockers.includes("Children/youth review required")
      ),
      detail: "Needs people visibility, youth, or consent review.",
      href: "/review?queue=missing-evidence"
    },
    {
      id: "approved-copy",
      label: "Approved-copy derivative",
      count: countWhere(collectionMatches, (_asset, blockers) => blockers.includes("Approved derivatives missing")),
      detail: "Needs role-safe preview/download derivative before public delivery.",
      href: "/review?queue=derivative-gap"
    },
    {
      id: "usage-scope",
      label: "Usage scope",
      count: countWhere(collectionMatches, (_asset, blockers) => blockers.includes("Usage scope not public-ready")),
      detail: "Needs Public or Public and Internal usage scope.",
      href: "/review?queue=missing-evidence"
    },
    {
      id: "publish-state",
      label: "Publish state",
      count: countWhere(collectionMatches, (asset, blockers) => asset.status !== "Approved Public" || /Do not use|Archive only|Not Approved Public|Lifecycle blocks reuse|Visibility not public/i.test(blockers)),
      detail: "Needs public approval state and current lifecycle before portal preview.",
      href: "/review?queue=pending"
    }
  ];

  return diagnostics.filter((diagnostic) => diagnostic.count > 0);
}

function firstDate(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()[0];
}

export function buildPublicPortalPreview(input: {
  assets: StockMediaAsset[];
  source: MediaSourceStatus;
  collectionId: string;
  sort?: PublicPortalSort;
  mediaType?: PublicPortalMediaType;
}): PublicPortalPreview | null {
  const definition = collectionDefinitionForId(input.collectionId);
  if (!definition) return null;

  const sort = input.sort || "curated";
  const mediaType = input.mediaType || "all";
  const collectionMatches = input.assets.filter((asset) => publicCollectionMatches(asset, definition.id));
  const portalReady = collectionMatches.filter(assetIsPortalReady);
  const filtered = mediaType === "all" ? portalReady : portalReady.filter((asset) => asset.mediaType === mediaType);
  const sorted = sortPublicAssets(filtered, sort);
  const expirationDate = firstDate(sorted.flatMap((asset) => [asset.rightsExpirationDate, asset.expirationDate, asset.expirationOrRecheckDate, asset.approvalRecheckDate]));

  return {
    collection: {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      searchQuery: definition.searchQuery
    },
    assets: sorted.map(publicAssetPayload),
    counts: {
      collectionMatches: collectionMatches.length,
      portalReady: portalReady.length,
      shown: sorted.length
    },
    filters: {
      sort,
      mediaType,
      mediaTypes: publicPortalMediaTypes.filter((item) => item === "all" || portalReady.some((asset) => asset.mediaType === item))
    },
    source: input.source,
    linkEnabled: false,
    localDemoNotice: "Public link not enabled in local demo.",
    usageNotes: [
      "Use approved copies only within visible usage guidance.",
      "Source and original files remain restricted to the Media Team.",
      "Request review when a ministry use is outside the shown scope."
    ],
    rightsSummary: portalReady.length
      ? "Every item shown passes Portal Ready checks: Approved Public status, public usage scope, reviewer/date evidence, rights and people/minors checks, current lifecycle, and approved-copy readiness."
      : "No Portal Ready assets are available for this collection in the current media source.",
    readinessDiagnostics: buildReadinessDiagnostics(collectionMatches),
    contactPath: "media@tjc.org",
    expirationNotice: expirationDate
      ? `Earliest recorded approval or rights recheck: ${expirationDate}.`
      : "No expiration or recheck date is exported for shown Portal Ready assets."
  };
}

export async function loadPublicPortalPreview(input: {
  collectionId: string;
  sort?: PublicPortalSort;
  mediaType?: PublicPortalMediaType;
}) {
  const { assets, status } = await getActiveMediaSource();
  return buildPublicPortalPreview({
    assets,
    source: status,
    collectionId: input.collectionId,
    sort: input.sort,
    mediaType: input.mediaType
  });
}

export function publicPortalCollectionIds() {
  return collectionDefinitions.map((collection) => collection.id);
}
