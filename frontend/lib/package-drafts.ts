import { collectionDefinitions, includesAny } from "@/lib/catalog-language";
import type { EnterpriseStatus } from "@/lib/enterprise-status";
import type { CatalogCollection, DamPackage, DamPackageSection, DemoRole, StockMediaAsset } from "@/lib/types";
import { buildPackageGovernance } from "@/lib/package-governance";
import { normalizePackageRef, normalizePackageRefs, packageAssetRef } from "@/lib/package-refs";

export type PackageAssetStatus = EnterpriseStatus;

export type ResolvedPackageSection = DamPackageSection & {
  assets: StockMediaAsset[];
  missingResourceSpaceAssetIds: Array<string | number>;
};

type NormalizedPackageSection = Omit<DamPackageSection, "resourceSpaceAssetIds"> & {
  resourceSpaceAssetIds: string[];
};

export type PackagePublishReadiness = {
  canPublish: boolean;
  canPreview: boolean;
  canShare: boolean;
  totalRefs: number;
  portalReadyRefs: number;
  internalOnlyRefs: number;
  reviewRequiredRefs: number;
  blockedRefs: number;
  missingRefs: number;
  reason: string;
  auditMessage: string;
};

export const defaultPackageSections: DamPackageSection[] = [
  { id: "cover", title: "Cover", resourceSpaceAssetIds: [] },
  { id: "hero-assets", title: "01. Hero Assets", resourceSpaceAssetIds: [] },
  { id: "social-media", title: "02. Social Media", resourceSpaceAssetIds: [] },
  { id: "documents", title: "03. Documents", resourceSpaceAssetIds: [] }
];

export function packageResourceRef(asset: StockMediaAsset): string {
  return packageAssetRef(asset);
}

export function createPackageDraft(title = "Package Draft"): DamPackage {
  return {
    id: "portal-local-draft",
    title,
    status: "draft",
    sections: defaultPackageSections.map((section) => ({ ...section, resourceSpaceAssetIds: [] }))
  };
}

export function packageHasRefs(draft: DamPackage) {
  return draft.sections.some((section) => section.resourceSpaceAssetIds.length > 0);
}

export function updatePackageTitle(draft: DamPackage, title: string): DamPackage {
  return {
    ...draft,
    title
  };
}

function sectionWithRefs(section: DamPackageSection, refs: Array<string | number>): DamPackageSection {
  return {
    ...section,
    resourceSpaceAssetIds: normalizePackageRefs(refs)
  };
}

function sectionsWithGlobalPackageRefs(sections: DamPackageSection[]): NormalizedPackageSection[] {
  const seen = new Set<string>();
  return sections.map((section) => ({
    ...section,
    resourceSpaceAssetIds: normalizePackageRefs(section.resourceSpaceAssetIds).filter((ref) => {
      if (seen.has(ref)) return false;
      seen.add(ref);
      return true;
    })
  }));
}

function draftPackageRefs(draft: DamPackage) {
  return new Set(normalizePackageRefs(draft.sections.flatMap((section) => section.resourceSpaceAssetIds)));
}

export function seedPackageDraft(draft: DamPackage, assets: StockMediaAsset[], statusOf: (asset: StockMediaAsset) => PackageAssetStatus): DamPackage {
  if (packageHasRefs(draft)) return draft;
  const approvedAssets = assets.filter((asset) => statusOf(asset) === "Approved");
  if (!approvedAssets.length) return draft;

  return {
    ...draft,
    sections: sectionsWithGlobalPackageRefs(draft.sections.map((section) => {
      if (section.id === "cover") return sectionWithRefs(section, approvedAssets.slice(0, 1).map(packageResourceRef));
      if (section.id === "hero-assets") return sectionWithRefs(section, approvedAssets.filter((asset) => asset.mediaType === "photo").slice(0, 5).map(packageResourceRef));
      if (section.id === "social-media") return sectionWithRefs(section, approvedAssets.slice(5, 10).map(packageResourceRef));
      if (section.id === "documents") {
        return sectionWithRefs(
          section,
          approvedAssets
            .filter((asset) => asset.mediaType === "document" || asset.mediaType === "graphic")
            .slice(0, 5)
            .map(packageResourceRef)
        );
      }
      return section;
    }))
  };
}

export function packageAssetsForCollection(
  collection: CatalogCollection | undefined,
  assets: StockMediaAsset[],
  statusOf: (asset: StockMediaAsset) => PackageAssetStatus
) {
  if (!collection) return assets;
  const definition = collectionDefinitions.find((item) => item.id === collection.id);
  const matchesDefinition = definition
    ? (asset: StockMediaAsset) => includesAny(asset, definition.terms)
    : (asset: StockMediaAsset) => asset.collection === collection.id || asset.collection === collection.name;

  return assets.filter((asset) => matchesDefinition(asset) && statusOf(asset) === "Approved");
}

export function seedPackageDraftFromCollection(
  draft: DamPackage,
  collection: CatalogCollection,
  assets: StockMediaAsset[],
  statusOf: (asset: StockMediaAsset) => PackageAssetStatus
): DamPackage {
  if (packageHasRefs(draft)) return draft;
  const collectionAssets = packageAssetsForCollection(collection, assets, statusOf);
  if (!collectionAssets.length) {
    return {
      ...draft,
      title: `${collection.name} Package Draft`,
      description: `Started from ${collection.name}. No visible Portal Ready refs were available in this role.`,
      collectionId: collection.id
    };
  }

  return seedPackageDraft(
    {
      ...draft,
      title: `${collection.name} Package Draft`,
      description: `Started from ${collection.name}. Contains visible Portal Ready refs only; full archive membership remains in the DAM.`,
      collectionId: collection.id
    },
    collectionAssets,
    statusOf
  );
}

function buildAssetLookup(assets: StockMediaAsset[]) {
  const lookup = new Map<string, StockMediaAsset>();
  assets.forEach((asset) => {
    const id = normalizePackageRef(asset.id);
    const resourceSpaceId = normalizePackageRef(asset.resourceSpaceId);
    if (id) lookup.set(id, asset);
    if (resourceSpaceId) lookup.set(resourceSpaceId, asset);
  });
  return lookup;
}

export function resolvePackageSections(draft: DamPackage, assets: StockMediaAsset[]): ResolvedPackageSection[] {
  const lookup = buildAssetLookup(assets);
  return sectionsWithGlobalPackageRefs(draft.sections).map((section) => {
    const refs = section.resourceSpaceAssetIds;
    const resolved = refs.map((id) => lookup.get(id)).filter((asset): asset is StockMediaAsset => Boolean(asset));
    const missing = refs.filter((id) => !lookup.has(id));
    return {
      ...section,
      resourceSpaceAssetIds: refs,
      assets: resolved,
      missingResourceSpaceAssetIds: missing
    };
  });
}

export function addPackageAssetRef(draft: DamPackage, sectionId: string, asset: StockMediaAsset): DamPackage {
  const ref = packageResourceRef(asset);
  if (!ref || draftPackageRefs(draft).has(ref)) return draft;
  return {
    ...draft,
    sections: draft.sections.map((section) => (
      section.id === sectionId
        ? sectionWithRefs(section, [...section.resourceSpaceAssetIds, ref])
        : section
    ))
  };
}

export function removePackageAssetRef(draft: DamPackage, sectionId: string, asset: StockMediaAsset): DamPackage {
  const ref = packageResourceRef(asset);
  return {
    ...draft,
    sections: draft.sections.map((section) => (
      section.id === sectionId
        ? sectionWithRefs(section, section.resourceSpaceAssetIds.filter((id) => normalizePackageRef(id) !== ref))
        : section
    ))
  };
}

export function availableAssetsForSection({
  draft,
  sectionId,
  assets,
  approvedOnly,
  statusOf
}: {
  draft: DamPackage;
  sectionId: string;
  assets: StockMediaAsset[];
  approvedOnly: boolean;
  statusOf: (asset: StockMediaAsset) => PackageAssetStatus;
}) {
  const activeRefs = draftPackageRefs(draft);
  return assets
    .filter((asset) => Boolean(packageResourceRef(asset)))
    .filter((asset) => !activeRefs.has(packageResourceRef(asset)))
    .filter((asset) => !approvedOnly || statusOf(asset) === "Approved")
    .slice(0, 6);
}

export function packagePublishReadiness(
  draft: DamPackage,
  resolvedSections: ResolvedPackageSection[],
  _statusOf: (asset: StockMediaAsset) => PackageAssetStatus,
  role: DemoRole = "DAM Admin"
): PackagePublishReadiness {
  const governance = buildPackageGovernance(draft, resolvedSections, role);
  return {
    canPublish: governance.canPublish,
    canPreview: governance.canPreview,
    canShare: governance.canShare,
    totalRefs: governance.totalRefs,
    portalReadyRefs: governance.portalReadyRefs,
    internalOnlyRefs: governance.internalOnlyRefs,
    reviewRequiredRefs: governance.reviewRequiredRefs,
    blockedRefs: governance.blockedRefs,
    missingRefs: governance.missingRefs,
    reason: governance.reason,
    auditMessage: governance.auditMessage
  };
}
