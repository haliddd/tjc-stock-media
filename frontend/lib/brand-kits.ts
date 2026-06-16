import { brandKitCollectionId } from "@/lib/env";
import { buildBrandKitGovernance } from "@/lib/brand-kit-governance";
import { getResourceSpaceCollectionAssets } from "@/lib/media-source/resourcespace-api";
import { getMediaSourceSession } from "@/lib/media-source/session";
import { canReview, canSeeAsset } from "@/lib/permissions";
import { assetForRolePayload } from "@/lib/source-redaction";
import type { DemoRole, StockMediaAsset } from "@/lib/types";

export type BrandKitSectionConfig = {
  id: string;
  title: string;
  envKey: string;
};

export type BrandKitPrinciple = {
  title: string;
  description: string;
};

export type BrandKitLogoUsage = {
  title: string;
  guidance: string;
  variant: "color" | "reverse";
  discouraged?: boolean;
};

export type BrandKitConfig = {
  id: string;
  title: string;
  owner: string;
  reviewDate?: string;
  collectionEnvKey: string;
  navItems: string[];
  principles: BrandKitPrinciple[];
  keyMessages: string[];
  logoUsage: BrandKitLogoUsage[];
  sections: BrandKitSectionConfig[];
};
export type BrandKitRouteError = {
  body: {
    error: string;
  };
  status: 404;
};

export type BrandKitSectionMapping = BrandKitSectionConfig & {
  resourceSpaceCollectionId: string;
  configured: boolean;
};

export const brandKitConfigs = {
  "mvp-2024": {
    id: "mvp-2024",
    title: "MVP 2024",
    owner: "Brand Team",
    reviewDate: "2025-03-01",
    collectionEnvKey: "BRAND_KIT_MVP_2024_COLLECTION_ID",
    navItems: ["How to use these assets", "Key messages", "Logo usage", "Color & typography", "Photography style", "Example applications", "Downloads", "Allowed channels", "FAQs"],
    principles: [
      { title: "Worship God", description: "Keep communication reverent, accurate, and centered on faith." },
      { title: "Follow Christ", description: "Use approved words and visuals with humility and clarity." },
      { title: "Love People", description: "Protect consent, privacy, and dignity in every media choice." },
      { title: "Bring Hope", description: "Choose images and messages that feel welcoming and truthful." }
    ],
    keyMessages: [
      "Use approved media first.",
      "Keep guidance clear and faithful.",
      "Protect people, privacy, and consent.",
      "Route unclear reuse through DAM review."
    ],
    logoUsage: [
      { title: "Primary logo", guidance: "Preferred", variant: "color" },
      { title: "Reverse logo", guidance: "Ensure clear contrast", variant: "reverse" },
      { title: "On photo", guidance: "Ensure clear contrast", variant: "color" },
      { title: "Don't alter", guidance: "No effects or distortions", variant: "color", discouraged: true }
    ],
    sections: [
      { id: "logos", title: "Logo usage", envKey: "BRAND_KIT_LOGO_COLLECTION_ID" },
      { id: "social", title: "Social templates", envKey: "BRAND_KIT_SOCIAL_TEMPLATES_COLLECTION_ID" },
      { id: "downloads", title: "Approved downloads", envKey: "BRAND_KIT_MVP_2024_COLLECTION_ID" }
    ]
  }
} satisfies Record<string, BrandKitConfig>;

export function getBrandKitConfig(id: string) {
  return brandKitConfigs[id as keyof typeof brandKitConfigs] || null;
}

export function brandKitUnknownError(): BrandKitRouteError {
  return { body: { error: "Unknown brand kit." }, status: 404 };
}

function assetMatchesCollection(asset: StockMediaAsset, collectionId: string) {
  const normalized = collectionId.trim().toLowerCase();
  if (!normalized) return false;
  return [
    asset.collection,
    asset.sourceAlbumPath,
    asset.sourcePath,
    ...(asset.sourceAlbumMemberships || [])
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function buildSectionMappings(config: BrandKitConfig): BrandKitSectionMapping[] {
  return config.sections.map((section) => {
    const resourceSpaceCollectionId = brandKitCollectionId(section.envKey);
    return {
      ...section,
      resourceSpaceCollectionId,
      configured: Boolean(resourceSpaceCollectionId)
    };
  });
}

function buildBrandKitWarnings({
  config,
  collectionId,
  matchedAssetCount,
  sectionMappings
}: {
  config: BrandKitConfig;
  collectionId: string;
  matchedAssetCount: number;
  sectionMappings: BrandKitSectionMapping[];
}) {
  return [
    ...(!collectionId ? [`Missing ${config.collectionEnvKey}`] : []),
    ...(collectionId && !matchedAssetCount ? [`Configured ${config.collectionEnvKey}, but no exported ResourceSpace records matched collection/source membership ${collectionId}.`] : []),
    ...sectionMappings.filter((section) => !section.configured).map((section) => `Missing ${section.envKey}`)
  ];
}

function canSeeBrandKitOperations(role: DemoRole) {
  return canReview(role);
}

function publicSectionMappings(sectionMappings: BrandKitSectionMapping[]) {
  return sectionMappings.map(({ resourceSpaceCollectionId: _resourceSpaceCollectionId, envKey: _envKey, ...section }) => section);
}

function publicWarnings(warnings: string[]) {
  return warnings.length ? ["Brand kit downloads are limited until media-team mappings and review status are complete."] : [];
}

export async function buildBrandKitResponse(config: BrandKitConfig, role: DemoRole) {
  const { assets, rawSource, ...envelope } = await getMediaSourceSession(role);
  const collectionId = brandKitCollectionId(config.collectionEnvKey);
  const sectionMappings = buildSectionMappings(config);
  const liveCollection = collectionId ? await getResourceSpaceCollectionAssets(collectionId) : null;
  const sourceAssets = liveCollection?.ok ? liveCollection.assets : assets;

  const matchedSourceAssets = collectionId
    ? sourceAssets
      .filter((asset) => liveCollection?.ok ? true : assetMatchesCollection(asset, collectionId))
      .filter((asset) => canSeeAsset(role, asset))
      .slice(0, 36)
    : [];
  const matchedAssets = matchedSourceAssets.map((asset) => assetForRolePayload(role, asset));
  const warnings = [...new Set(buildBrandKitWarnings({
    config,
    collectionId,
    matchedAssetCount: matchedAssets.length,
    sectionMappings
  }))];
  const opsView = canSeeBrandKitOperations(role);
  const governanceWarnings = opsView ? warnings : publicWarnings(warnings);

  return {
    kit: {
      id: config.id,
      title: config.title,
      owner: config.owner,
      reviewDate: config.reviewDate,
      configured: Boolean(collectionId),
      navItems: config.navItems,
      principles: config.principles,
      keyMessages: config.keyMessages,
      logoUsage: config.logoUsage,
      sections: opsView ? sectionMappings : publicSectionMappings(sectionMappings),
      ...(opsView ? {
        resourceSpaceCollectionId: collectionId || null,
        collectionEnvKey: config.collectionEnvKey
      } : {})
    },
    assets: matchedAssets,
    governance: buildBrandKitGovernance({
      configured: Boolean(collectionId),
      assets: matchedSourceAssets,
      role,
      missingSectionMappings: sectionMappings.filter((section) => !section.configured).length,
      warnings: governanceWarnings
    }),
    ...envelope,
    ...(opsView ? { rawSource } : {}),
    warnings: governanceWarnings,
    collectionStatus: opsView && liveCollection
      ? {
          ok: liveCollection.ok,
          status: liveCollection.status,
          message: liveCollection.message,
          resourceCount: liveCollection.resourceIds?.length || matchedAssets.length
        }
      : undefined
  };
}
