import type { DemoRole, DamPackage, ReuseBlocker, ReuseState, StockMediaAsset } from "@/lib/types";
import type { ResolvedPackageSection } from "@/lib/package-drafts";
import { buildPortalReuseDecision } from "@/lib/portal-reuse-decision";
import { canContribute, canReview } from "@/lib/permissions";
import { packageAssetRef as normalizedPackageAssetRef } from "@/lib/package-refs";
import { assetForRolePayload } from "@/lib/source-redaction";

export type PackageGovernanceAsset = {
  ref: string;
  sectionId: string;
  sectionTitle: string;
  asset: StockMediaAsset;
  reuseState: ReuseState;
  reuseLabel: string;
  canPreview: boolean;
  canDownload: boolean;
  publishReady: boolean;
  shareReady: boolean;
  blockers: ReuseBlocker[];
  blockerCategories: PackageBlockerCategory[];
  reason: string;
};

export type PackageBlockerCategory =
  | "missing-ref"
  | "missing-rights"
  | "minors-consent"
  | "missing-derivative"
  | "stale-lifecycle"
  | "withdrawal-takedown"
  | "channel-mismatch"
  | "required-notice"
  | "sensitivity-domain-review"
  | "missing-source"
  | "original-master-restricted"
  | "review-required";

export type PackageBlockerSummary = {
  category: PackageBlockerCategory;
  label: string;
  count: number;
  refs: string[];
};

export type PackageActionDecision = {
  action: "save-draft" | "request-review" | "export-approved-copy-package" | "prepare-share-decision";
  allowed: boolean;
  status: "allowed" | "blocked" | "queued" | "preview";
  reason: string;
  originalMasterIncluded: false;
  requiresApprovedCopyGate: boolean;
  durableShareStorage: false;
};

export type PackageGovernanceSection = {
  id: string;
  title: string;
  totalRefs: number;
  resolvedRefs: number;
  missingRefs: Array<string | number>;
  readinessScore: number;
  readinessStatus: "ready" | "review" | "blocked" | "empty";
  readinessSummary: string;
  portalReadyRefs: number;
  internalOnlyRefs: number;
  reviewRequiredRefs: number;
  blockedRefs: number;
  blockers: string[];
  assets: PackageGovernanceAsset[];
};

export type PackageGovernancePacket = {
  role: DemoRole;
  canPreview: boolean;
  canShare: boolean;
  canPublish: boolean;
  totalRefs: number;
  resolvedRefs: number;
  missingRefs: number;
  readinessScore: number;
  readinessLabel: string;
  readinessStatus: "ready" | "review" | "blocked" | "empty";
  portalReadyRefs: number;
  internalOnlyRefs: number;
  reviewRequiredRefs: number;
  blockedRefs: number;
  reason: string;
  auditMessage: string;
  blockerSummary: PackageBlockerSummary[];
  actions: PackageActionDecision[];
  commandCenter: Array<{
    label: string;
    status: "ready" | "blocked" | "review";
    detail: string;
  }>;
  sections: PackageGovernanceSection[];
};

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function roleCanShareInternal(role: DemoRole) {
  return canContribute(role);
}

function opsView(role: DemoRole) {
  return canReview(role);
}

function assetReason(asset: StockMediaAsset, blockers: ReuseBlocker[]) {
  if (!blockers.length) return asset.usageGuidance || "Portal reuse checks pass.";
  return blockers.map((blocker) => blocker.label).join(", ");
}

const blockerCategoryLabels: Record<PackageBlockerCategory, string> = {
  "missing-ref": "Missing media reference",
  "missing-rights": "Rights or consent missing",
  "minors-consent": "Minors/consent review",
  "missing-derivative": "Approved-copy derivative missing",
  "stale-lifecycle": "Stale or expired lifecycle",
  "withdrawal-takedown": "Withdrawal/takedown",
  "channel-mismatch": "Approved channel mismatch",
  "required-notice": "Required notice missing",
  "sensitivity-domain-review": "Sensitivity/domain review",
  "missing-source": "Source/provenance missing",
  "original-master-restricted": "Source file excluded",
  "review-required": "Review required"
};

function categoryForBlocker(asset: StockMediaAsset, blocker: ReuseBlocker): PackageBlockerCategory {
  const text = `${blocker.code} ${blocker.label} ${asset.rightsStatus || ""} ${asset.consentStatus || ""} ${asset.rightsNotes || ""}`.toLowerCase();
  if (blocker.code === "blocked-source") return "missing-source";
  if (blocker.code === "blocked-rights") {
    if (!asset.approvedChannels?.length || /channel/.test(text)) return "channel-mismatch";
    if (!asset.requiredNotice && (asset.hymnNumberOrTitle || /notice|hymn|music/.test(text))) return "required-notice";
    return "missing-rights";
  }
  if (blocker.code === "blocked-people-minors") return "minors-consent";
  if (blocker.code === "blocked-derivative") return "missing-derivative";
  if (blocker.code === "blocked-reviewer-date") return "stale-lifecycle";
  if (blocker.code === "blocked-sensitive") return "sensitivity-domain-review";
  if (blocker.code === "blocked-archive" || blocker.code === "blocked-do-not-use") {
    return asset.withdrawalStatus && asset.withdrawalStatus !== "active" ? "withdrawal-takedown" : "review-required";
  }
  return "review-required";
}

function addSummary(
  map: Map<PackageBlockerCategory, PackageBlockerSummary>,
  category: PackageBlockerCategory,
  ref: string
) {
  const current = map.get(category) || { category, label: blockerCategoryLabels[category], count: 0, refs: [] };
  current.count += 1;
  if (!current.refs.includes(ref)) current.refs.push(ref);
  map.set(category, current);
}

function packageBlockerSummary(sections: PackageGovernanceSection[]): PackageBlockerSummary[] {
  const map = new Map<PackageBlockerCategory, PackageBlockerSummary>();
  for (const section of sections) {
    for (const missing of section.missingRefs) addSummary(map, "missing-ref", String(missing));
    for (const item of section.assets) {
      if (!item.publishReady) addSummary(map, "original-master-restricted", item.ref);
      for (const category of item.blockerCategories) addSummary(map, category, item.ref);
    }
  }
  return [...map.values()].sort((left, right) => left.label.localeCompare(right.label));
}

export function buildPackageActionDecisions(input: {
  hasRefs: boolean;
  canPreview: boolean;
  canShare: boolean;
  canPublish: boolean;
  missingRefs: number;
  blockedRefs: number;
  reason: string;
}): PackageActionDecision[] {
  return [
    {
      action: "save-draft",
      allowed: input.hasRefs,
      status: input.hasRefs ? "preview" : "blocked",
      reason: input.hasRefs ? "Draft can be saved as a local package readiness record." : "Add media references before saving package readiness.",
      originalMasterIncluded: false,
      requiresApprovedCopyGate: false,
      durableShareStorage: false
    },
    {
      action: "request-review",
      allowed: input.hasRefs && input.blockedRefs > 0,
      status: input.hasRefs && input.blockedRefs > 0 ? "queued" : "blocked",
      reason: input.blockedRefs > 0 ? "Blocked items can be queued for review; ResourceSpace approval remains authoritative." : "No blocked refs require package review.",
      originalMasterIncluded: false,
      requiresApprovedCopyGate: false,
      durableShareStorage: false
    },
    {
      action: "export-approved-copy-package",
      allowed: input.canPublish,
      status: input.canPublish ? "allowed" : "blocked",
      reason: input.canPublish ? "Every item is Portal Ready; export may include approved-copy derivatives only." : input.reason,
      originalMasterIncluded: false,
      requiresApprovedCopyGate: true,
      durableShareStorage: false
    },
    {
      action: "prepare-share-decision",
      allowed: input.canShare && input.missingRefs === 0,
      status: input.canShare && input.missingRefs === 0 ? "preview" : "blocked",
      reason: input.canShare && input.missingRefs === 0
        ? "Internal access decision can be prepared, but no durable public link is created here."
        : input.reason,
      originalMasterIncluded: false,
      requiresApprovedCopyGate: true,
      durableShareStorage: false
    }
  ];
}

function packageGovernanceRef(asset: StockMediaAsset) {
  return normalizedPackageAssetRef(asset) || "media-reference";
}

function classifyAsset(sectionId: string, sectionTitle: string, asset: StockMediaAsset, role: DemoRole): PackageGovernanceAsset {
  const packet = buildPortalReuseDecision(asset, role);
  const ref = packageGovernanceRef(asset);
  const portalReady = packet.reuse.state === "portal-ready";
  const internalReady = packet.reuse.state === "internal-ready";
  const canShare = portalReady || (internalReady && roleCanShareInternal(role));

  return {
    ref,
    sectionId,
    sectionTitle,
    asset: assetForRolePayload(role, asset),
    reuseState: packet.reuse.state,
    reuseLabel: packet.reuse.label,
    canPreview: packet.access.viewDetailPreview.allowed,
    canDownload: packet.access.downloadApprovedCopy.allowed,
    publishReady: portalReady,
    shareReady: canShare,
    blockers: packet.reuse.blockers,
    blockerCategories: packet.reuse.blockers.map((blocker) => categoryForBlocker(asset, blocker)),
    reason: assetReason(asset, packet.reuse.blockers)
  };
}

function command(label: string, ready: boolean, detail: string, review = false): PackageGovernancePacket["commandCenter"][number] {
  return {
    label,
    status: ready ? "ready" : review ? "review" : "blocked",
    detail
  };
}

function readinessScore(totalRefs: number, portalReadyRefs: number) {
  return totalRefs ? Math.round((portalReadyRefs / totalRefs) * 100) : 0;
}

function readinessStatus({
  totalRefs,
  missingRefs,
  blockedRefs
}: {
  totalRefs: number;
  missingRefs: number;
  blockedRefs: number;
}): PackageGovernancePacket["readinessStatus"] {
  if (!totalRefs) return "empty";
  if (missingRefs) return "blocked";
  if (blockedRefs) return "review";
  return "ready";
}

function readinessLabel(status: PackageGovernancePacket["readinessStatus"], score: number) {
  if (status === "empty") return "Add refs";
  if (status === "blocked") return "Refs missing";
  if (status === "review") return `${score}% publish-ready`;
  return "Ready to publish";
}

function sectionReadinessSummary(section: {
  totalRefs: number;
  missingRefs: Array<string | number>;
  portalReadyRefs: number;
  internalOnlyRefs: number;
  reviewRequiredRefs: number;
}) {
  if (!section.totalRefs) return "No refs selected. Section will stay out of distribution draft output.";
  if (section.missingRefs.length) return `${section.missingRefs.length} ref${section.missingRefs.length === 1 ? "" : "s"} no longer resolves.`;
  if (section.reviewRequiredRefs) return `${section.reviewRequiredRefs} ref${section.reviewRequiredRefs === 1 ? "" : "s"} need rights review before publish.`;
  if (section.internalOnlyRefs) return `${section.internalOnlyRefs} internal-only ref${section.internalOnlyRefs === 1 ? "" : "s"} block public publish.`;
  return `${section.portalReadyRefs}/${section.totalRefs} refs are Portal Ready.`;
}

export function buildPackageGovernance(draft: DamPackage, resolvedSections: ResolvedPackageSection[], role: DemoRole): PackageGovernancePacket {
  const canSeeOpsCopy = opsView(role);
  const sections = resolvedSections.map((section): PackageGovernanceSection => {
    const assets = section.assets.map((asset) => classifyAsset(section.id, section.title, asset, role));
    const portalReadyRefs = assets.filter((item) => item.reuseState === "portal-ready").length;
    const internalOnlyRefs = assets.filter((item) => item.reuseState === "internal-ready").length;
    const reviewRequiredRefs = assets.filter((item) => item.reuseState !== "portal-ready" && item.reuseState !== "internal-ready").length;
    const blockedRefs = section.missingResourceSpaceAssetIds.length + internalOnlyRefs + reviewRequiredRefs;
    const blockers = uniqueStrings([
      ...section.missingResourceSpaceAssetIds.map((ref) => canSeeOpsCopy ? `Missing ResourceSpace ref ${ref}` : `Missing media reference ${ref}`),
      ...assets.flatMap((item) => item.publishReady ? [] : [`${item.ref}: ${item.reason}`])
    ]);
    const sectionScore = readinessScore(section.resourceSpaceAssetIds.length, portalReadyRefs);
    const sectionStatus = readinessStatus({
      totalRefs: section.resourceSpaceAssetIds.length,
      missingRefs: section.missingResourceSpaceAssetIds.length,
      blockedRefs
    });

    return {
      id: section.id,
      title: section.title,
      totalRefs: section.resourceSpaceAssetIds.length,
      resolvedRefs: section.assets.length,
      missingRefs: section.missingResourceSpaceAssetIds,
      readinessScore: sectionScore,
      readinessStatus: sectionStatus,
      readinessSummary: sectionReadinessSummary({
        totalRefs: section.resourceSpaceAssetIds.length,
        missingRefs: section.missingResourceSpaceAssetIds,
        portalReadyRefs,
        internalOnlyRefs,
        reviewRequiredRefs
      }),
      portalReadyRefs,
      internalOnlyRefs,
      reviewRequiredRefs,
      blockedRefs,
      blockers,
      assets
    };
  });

  const totalRefs = draft.sections.reduce((sum, section) => sum + section.resourceSpaceAssetIds.length, 0);
  const allAssets = sections.flatMap((section) => section.assets);
  const resolvedRefs = allAssets.length;
  const missingRefs = sections.reduce((sum, section) => sum + section.missingRefs.length, 0);
  const portalReadyRefs = allAssets.filter((item) => item.reuseState === "portal-ready").length;
  const internalOnlyRefs = allAssets.filter((item) => item.reuseState === "internal-ready").length;
  const reviewRequiredRefs = allAssets.filter((item) => item.reuseState !== "portal-ready" && item.reuseState !== "internal-ready").length;
  const blockedRefs = missingRefs + internalOnlyRefs + reviewRequiredRefs;
  const hasRefs = totalRefs > 0;
  const refNoun = canSeeOpsCopy ? "refs" : "references";
  const canPreview = hasRefs && missingRefs === 0 && allAssets.every((item) => item.canPreview);
  const canShare = canPreview && allAssets.every((item) => item.shareReady);
  const canPublish = hasRefs && missingRefs === 0 && allAssets.every((item) => item.publishReady);
  const packageScore = readinessScore(totalRefs, portalReadyRefs);
  const packageStatus = readinessStatus({ totalRefs, missingRefs, blockedRefs });
  const reason = !hasRefs
    ? `Package needs media ${refNoun} before preview, share, or publish.`
    : missingRefs
      ? `Package has media ${refNoun} that no longer resolve.`
      : internalOnlyRefs
        ? "Publish blocked because some refs are Internal ready only."
        : reviewRequiredRefs
          ? "Readiness blocked until every ref is Portal Ready."
          : "Every ref is Portal Ready for distribution readiness review.";
  const blockerSummary = packageBlockerSummary(sections);
  const actions = buildPackageActionDecisions({ hasRefs, canPreview, canShare, canPublish, missingRefs, blockedRefs, reason });

  return {
    role,
    canPreview,
    canShare,
    canPublish,
    totalRefs,
    resolvedRefs,
    missingRefs,
    readinessScore: packageScore,
    readinessLabel: readinessLabel(packageStatus, packageScore),
    readinessStatus: packageStatus,
    portalReadyRefs,
    internalOnlyRefs,
    reviewRequiredRefs,
    blockedRefs,
    reason,
    auditMessage: `Package governance: ${portalReadyRefs}/${totalRefs} Portal Ready, ${internalOnlyRefs} internal-only, ${reviewRequiredRefs} review-required, ${missingRefs} missing.`,
    blockerSummary,
    actions,
    commandCenter: [
      command("Preview distribution set", canPreview, canPreview ? `All ${refNoun} can render a role-safe preview.` : `Preview waits for resolvable ${refNoun} and role-safe previews.`, !canPreview && hasRefs),
      command("Prepare internal access packet", canShare, canShare ? "Access stays policy-scoped; no public link is created here." : `Access waits for Portal Ready ${refNoun} or internal-ready ${refNoun} allowed for this role.`, !canShare && hasRefs),
      command("Queue readiness review", canPublish, canPublish ? (canSeeOpsCopy ? "All refs are Portal Ready; DAM source files stay canonical." : "All references are Portal Ready; source files stay protected.") : reason, !canPublish && hasRefs)
    ],
    sections
  };
}
