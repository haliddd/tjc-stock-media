import { buildPortalReuseDecision } from "@/lib/portal-reuse-decision";
import { buildDeliveryReadinessManifest, type DeliveryReadinessManifest } from "@/lib/delivery-readiness";
import type { DemoRole, StockMediaAsset } from "@/lib/types";

export type BrandKitGovernance = {
  canPreview: boolean;
  canShare: boolean;
  canDownloadKit: boolean;
  deliveryReady: boolean;
  betaDeliveryDisabled: true;
  configured: boolean;
  totalAssets: number;
  portalReadyAssets: number;
  internalOnlyAssets: number;
  reviewRequiredAssets: number;
  missingSectionMappings: number;
  blockers: string[];
  summary: string;
  readinessPacket: {
    role: DemoRole;
    originalMasterIncluded: false;
    shareCreatesPublicLink: false;
    downloadCreatesZip: false;
    deliveryMode: "disabled-beta-packet";
    manifests: DeliveryReadinessManifest[];
  };
  commands: Array<{
    label: string;
    status: "ready" | "blocked" | "review";
    detail: string;
  }>;
};

function command(label: string, ready: boolean, detail: string, review = false): BrandKitGovernance["commands"][number] {
  return {
    label,
    status: ready ? "ready" : review ? "review" : "blocked",
    detail
  };
}

export function buildBrandKitGovernance({
  configured,
  assets,
  role,
  missingSectionMappings,
  warnings
}: {
  configured: boolean;
  assets: StockMediaAsset[];
  role: DemoRole;
  missingSectionMappings: number;
  warnings: string[];
}): BrandKitGovernance {
  const decisions = assets.map((asset) => buildPortalReuseDecision(asset, role));
  const portalReadyAssets = decisions.filter((item) => item.reuse.state === "portal-ready").length;
  const internalOnlyAssets = decisions.filter((item) => item.reuse.state === "internal-ready").length;
  const reviewRequiredAssets = decisions.filter((item) => item.reuse.state !== "portal-ready" && item.reuse.state !== "internal-ready").length;
  const manifests = assets.map((asset) => buildDeliveryReadinessManifest(asset, "public-web"));
  const deliveryReady = configured && assets.length > 0 && decisions.every((item) => item.reuse.state === "portal-ready") && manifests.every((item) => item.portalReadyForChosenUse);
  const canPreview = configured && assets.length > 0 && decisions.every((item) => item.access.viewDetailPreview.allowed);
  const canShare = false;
  const canDownloadKit = false;
  const blockers = [
    ...warnings,
    ...(!configured ? ["Brand kit collection is not configured."] : []),
    ...(configured && !assets.length ? ["Brand kit collection has no role-visible mapped assets."] : []),
    ...(internalOnlyAssets ? [`${internalOnlyAssets} assets are internal-only.`] : []),
    ...(reviewRequiredAssets ? [`${reviewRequiredAssets} assets need review before delivery handoff.`] : []),
    ...(deliveryReady ? ["Brand kit packet is ready, but ZIP, public link, invite, and file delivery stay off until durable storage, expiry, audit, and revocation are connected."] : [])
  ];
  const summary = deliveryReady
    ? `${portalReadyAssets} of ${assets.length} assets are Portal Ready; delivery remains gated.`
    : `${portalReadyAssets} of ${assets.length} assets are Portal Ready; ${blockers.length} blockers remain.`;

  return {
    canPreview,
    canShare,
    canDownloadKit,
    deliveryReady,
    betaDeliveryDisabled: true,
    configured,
    totalAssets: assets.length,
    portalReadyAssets,
    internalOnlyAssets,
    reviewRequiredAssets,
    missingSectionMappings,
    blockers: [...new Set(blockers)],
    summary,
    readinessPacket: {
      role,
      originalMasterIncluded: false,
      shareCreatesPublicLink: false,
      downloadCreatesZip: false,
      deliveryMode: "disabled-beta-packet",
      manifests
    },
    commands: [
      command("Preview", canPreview, canPreview ? "Mapped assets can render role-safe previews." : "Preview waits for configured collection and visible assets.", configured && assets.length > 0),
      command("Handoff draft", canShare, deliveryReady ? "Handoff stays local; no public link or invite delivery is created." : "Handoff waits until every mapped asset is Portal Ready.", configured && assets.length > 0),
      command("Delivery check", canDownloadKit, deliveryReady ? "Delivery is gated; no ZIP, public link, or approved-copy file is created." : "Delivery check stays disabled until every mapped asset is Portal Ready.", configured)
    ]
  };
}
