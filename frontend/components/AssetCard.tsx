"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, Eye, FileLock2, Mail, ShieldCheck } from "lucide-react";
import { AssetQuickLookDialog } from "@/components/AssetQuickLookDialog";
import { GatedDownloadButton } from "@/components/GatedDownloadButton";
import { MediaPreview } from "@/components/MediaPreview";
import { ReuseStateBadge } from "@/components/StatusBadge";
import type { DemoRole, StockMediaAsset } from "@/lib/types";
import { assetLibraryScanSummary } from "@/lib/asset-governance";
import { assetPresentation } from "@/lib/presentation";
import { cn } from "@/lib/ui";

type AssetCardVariant = "standard" | "wide" | "tall" | "feature";

function mediaAspectClass(variant: AssetCardVariant) {
  if (variant === "feature") return "aspect-[16/9]";
  if (variant === "wide") return "aspect-[16/10]";
  if (variant === "tall") return "aspect-[5/4]";
  return "aspect-[4/3]";
}

function compactCardReason(value?: string) {
  if (!value) return "Review details in asset record";
  return value
    .replace(/Needs reviewer decision/gi, "Needs review")
    .replace(/Needs portal review/gi, "Needs review")
    .replace(/Rights or consent unclear/gi, "Rights unclear")
    .replace(/People\/minors review required/gi, "People check")
    .replace(/Children\/youth possible/gi, "People check")
    .replace(/Reviewer\/date missing/gi, "Reviewer missing")
    .replace(/Approved derivative missing/gi, "Approved copy missing")
    .replace(/Unknown - reviewer should confirm before public use/gi, "Needs review");
}

function simpleVerdict(asset: StockMediaAsset, canDownload: boolean, hasWarnings: boolean, blocker: string) {
  if (canDownload && !hasWarnings) {
    return {
      label: "Ready to use",
      detail: "Approved copy available. Check guidance before sharing.",
      tone: "ready",
      action: "Download approved copy",
      icon: ShieldCheck
    } as const;
  }
  if (asset.usageScope === "Internal" || /internal/i.test(asset.status)) {
    return {
      label: "Internal only",
      detail: "Use guidance limits where this can be shared.",
      tone: "internal",
      action: "View use guidance",
      icon: FileLock2
    } as const;
  }
  if (asset.status === "Do Not Use" || asset.status === "Searchable Archive" || asset.usageScope === "Archive Only" || /do not use|archive/i.test(blocker)) {
    return {
      label: "Not available yet",
      detail: "This item is not cleared for normal reuse.",
      tone: "unavailable",
      action: "View guidance",
      icon: FileLock2
    } as const;
  }
  if (/source|derivative|original|copy/i.test(blocker)) {
    return {
      label: "Source restricted",
      detail: "Approved copy or source access is not ready for self-serve use.",
      tone: "restricted",
      action: "View use guidance",
      icon: FileLock2
    } as const;
  }
  return {
    label: "Review first",
    detail: blocker || "A reviewer needs to clear this before reuse.",
    tone: "review",
    action: "Request review",
    icon: Mail
  } as const;
}

export function AssetCard({
  asset,
  role,
  variant = "standard"
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  variant?: AssetCardVariant;
}) {
  const [quickLookOpen, setQuickLookOpen] = useState(false);
  const display = assetPresentation(asset, role);
  const canDownload = display.download.approvedCopy.allowed;
  const downloadHref = `/api/download/${asset.id}?role=${encodeURIComponent(role)}`;
  const confidence = display.confidence.filter((item) => item.tone === "warn").slice(0, 1);
  const hasWarnings = confidence.length > 0;
  const blocker = compactCardReason(display.download.reuse.blockers[0]?.label || confidence[0]?.state || display.download.reuse.label || display.quickLabel);
  const verdict = simpleVerdict(asset, canDownload, hasWarnings, blocker);
  const VerdictIcon = verdict.icon;
  const scan = assetLibraryScanSummary(asset, role);
  const previewLabel = display.image ? "Preview export pending" : `${asset.mediaType} preview restricted`;
  const previewDetail = display.image
    ? undefined
    : `${asset.collection || "Collection"} · ${display.download.reuse.blockers[0]?.label || display.download.approvedCopy.reason || "Reviewer-only until reuse checks pass."}`;
  const opsView = role === "Reviewer" || role === "DAM Admin";

  return (
    <article className="dam-asset-card group flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-[#cad8cf] bg-white transition duration-200 hover:border-[#7ca792] hover:bg-[#fbfdfb]" aria-label={`${display.title}: ${verdict.label}`}>
      <div className={cn("dam-asset-card-media relative overflow-hidden bg-[#edf2ed]", mediaAspectClass(variant))}>
        <Link href={`/assets/${asset.id}`} className="absolute inset-0 block" aria-label={`Open ${display.title}`}>
          <MediaPreview
            src={display.image}
            alt={asset.thumbnailAlt}
            label={previewLabel}
            detail={previewDetail}
            imgClassName="transition duration-300 ease-out group-hover:scale-[1.02]"
          />
        </Link>
        {opsView ? (
          <span className="dam-asset-card-primary absolute left-2 top-2 z-[2] max-w-[calc(100%-1rem)]" data-badge-slot="asset-card-primary">
            <ReuseStateBadge asset={asset} size="xs" />
          </span>
        ) : (
          <span
            className={cn(
              "dam-asset-card-primary absolute left-2 top-2 z-[2] max-w-[calc(100%-1rem)] rounded-md border px-2.5 py-1 text-[11px] font-black shadow-sm",
              verdict.tone === "ready" && "border-[#9fcfb4] bg-white text-[#164d34]",
              verdict.tone === "internal" && "border-[#b5cde5] bg-white text-[#1f4f73]",
              verdict.tone === "unavailable" && "border-[#d8cbd3] bg-white text-[#5f4a59]",
              verdict.tone === "restricted" && "border-[#ead6a8] bg-white text-[#725216]",
              verdict.tone === "review" && "border-[#ead6a8] bg-white text-[#725216]"
            )}
          >
            {verdict.label}
          </span>
        )}
        <button
          className="dam-asset-card-preview-action absolute bottom-2 right-2 z-[2] inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#c5d3ca] bg-white px-2.5 text-[11px] font-black text-tjc-evergreen transition hover:bg-[#eef7f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-px max-sm:h-8 max-sm:w-8 max-sm:px-0"
          type="button"
          onClick={() => setQuickLookOpen(true)}
          aria-haspopup="dialog"
          aria-label={`Quick preview ${display.title}`}
        >
          <Eye size={13} strokeWidth={1.9} aria-hidden="true" />
          <span className="sr-only">Preview</span>
        </button>
      </div>
      <div className="dam-asset-card-body grid flex-1 content-start gap-3 border-t border-[#d6dfd8] p-3.5 text-tjc-ink max-sm:gap-2 max-sm:p-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="dam-asset-card-title line-clamp-2 text-sm font-black leading-tight text-tjc-ink max-sm:text-[12px]">{display.title}</h2>
            <span className="dam-asset-card-subtitle mt-1 block truncate text-xs font-semibold text-tjc-muted max-sm:text-[10px]">{display.cardSubtitle}</span>
          </div>
          {canDownload && !hasWarnings ? (
            <GatedDownloadButton className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#92cfad] bg-[#e6f7ec] text-[#164d34] transition hover:bg-[#d9f0e3] active:translate-y-px" href={downloadHref} ariaLabel={`Download approved copy of ${display.title}`} reason={`Approved-copy card request for ${display.title}`}>
              <Download aria-hidden="true" size={15} strokeWidth={1.8} />
            </GatedDownloadButton>
          ) : (
            <Link className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#d6dfd8] bg-white text-tjc-evergreen transition hover:bg-[#eef7f1] active:translate-y-px" href={`/assets/${asset.id}`} aria-label={`${verdict.action} for ${display.title}`}>
              <ArrowRight aria-hidden="true" size={15} strokeWidth={1.8} />
            </Link>
          )}
        </div>
        <div className="dam-asset-card-meta grid gap-2 text-xs leading-snug text-tjc-muted max-sm:text-[10px]">
          <span
            className={cn(
              "dam-asset-card-use-line grid grid-cols-[auto_1fr] items-start gap-2 rounded-md border px-2.5 py-2 text-[12px]",
              verdict.tone === "ready" && "border-[#b8d9c6] bg-[#edf8f1] text-[#164d34]",
              verdict.tone === "internal" && "border-[#c8d7e6] bg-[#f2f7fb] text-[#27435b]",
              verdict.tone === "unavailable" && "border-[#d8cbd3] bg-[#f7f3f6] text-[#5f4a59]",
              verdict.tone === "restricted" && "border-[#ead6a8] bg-[#fff8e8] text-[#704707]",
              verdict.tone === "review" && "border-[#ead6a8] bg-[#fff8e8] text-[#704707]"
            )}
            aria-label={`Use verdict: ${verdict.label}`}
          >
            <VerdictIcon className="mt-0.5 shrink-0" size={14} strokeWidth={1.9} aria-hidden="true" />
            <span>
              <strong className="block font-black">{scan.trustLabel}</strong>
              <span className="mt-0.5 block line-clamp-2 font-semibold">{scan.nextAction}: {scan.nextActionDetail}</span>
            </span>
          </span>
          <span className="line-clamp-1 font-semibold">{scan.reuseTierLabel} · {scan.rightsRiskLabel} · {asset.collection || display.cardSubtitle}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-[#eef1ef] pt-2 text-[10px] font-bold leading-snug text-tjc-muted max-sm:hidden" aria-label="Source metadata">
          <span className="truncate">{scan.peopleLabel} · {scan.sourceCustodyLabel}</span>
          <span className="rounded-md bg-[#f6f8f5] px-2 py-1 tabular-nums text-[#6f7a72]">{opsView ? asset.resourceSpaceId ? `RS ${asset.resourceSpaceId}` : "RS export" : "Use guidance"}</span>
        </div>
        <div className="mt-auto grid">
          {canDownload && !hasWarnings ? (
            <GatedDownloadButton className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-tjc-evergreen px-3 text-sm font-black text-white transition hover:bg-[#062d24] active:translate-y-px" href={downloadHref} reason={`Approved-copy card request for ${display.title}`}>
              <Download size={15} strokeWidth={1.8} aria-hidden="true" />
              {verdict.action}
            </GatedDownloadButton>
          ) : (
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#c5d1c9] bg-white px-3 text-sm font-black text-tjc-evergreen transition hover:bg-[#eef7f1] active:translate-y-px" href={`/assets/${asset.id}`}>
              {verdict.action}
              <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      <AssetQuickLookDialog asset={asset} role={role} open={quickLookOpen} onClose={() => setQuickLookOpen(false)} />
    </article>
  );
}
