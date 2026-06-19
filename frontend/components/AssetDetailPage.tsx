"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, ExternalLink, FileLock2, History, Link2, LockKeyhole, Mail, PackagePlus, ScrollText, Search, ShieldCheck, ShieldX, UserCheck } from "lucide-react";
import { MediaPreview } from "@/components/MediaPreview";
import { DamEmptyState as EmptyState } from "@/components/dam/DamWorkspace";
import { DamProtectedPreview as ProtectedPreview, DamRecordMetadataRow as RecordMetadataRow, DamRecordMetadataSection as RecordMetadataSection } from "@/components/dam/DamRecord";
import { DamActionBar, DamActionButton } from "@/components/dam/ActionBar";
import { DamBlockedActionNote, DamDecisionLedger, DamDetailPanel, DamMetadataGrid, DamPreviewWorkbench, DamRelatedMediaStrip, DamSourceRestrictionCard, DamSourceTruthCard, DamVersionHistoryPanel, DamWorkflowPanel } from "@/components/dam/DetailPanel";
import { DamSafeCopy } from "@/components/dam/SafeCopy";
import { DamVerdictBadge } from "@/components/dam/VerdictBadge";
import { AssetActionsMenu } from "@/components/AssetActionsMenu";
import { useDemoRole } from "@/components/RoleProvider";
import { decideAccess } from "@/lib/access-decisions";
import { assetGovernancePassport } from "@/lib/asset-governance";
import { assetPresentation, detailImageUrl, provenanceSummary } from "@/lib/presentation";
import { requestReviewMailto, viewerVerdictForAsset } from "@/lib/viewer-verdict";
import { routeWithRole } from "@/lib/role-routes";
import type { DemoRole, MediaSourceStatus, StockMediaAsset } from "@/lib/types";
import { cn } from "@/lib/ui";

type DetailResponse = {
  asset: StockMediaAsset;
  source: MediaSourceStatus;
  related: StockMediaAsset[];
  resourceSpaceUrl?: string | null;
};

function FieldList({ items }: { items: Array<{ label: string; value?: string }> }) {
  return (
    <dl className="grid gap-3">
      {items.map((item) => (
        <RecordMetadataRow label={item.label} value={item.value} key={item.label} />
      ))}
    </dl>
  );
}

function TagSection({ asset }: { asset: StockMediaAsset }) {
  const tags = Array.from(new Set([...(asset.usageTerms || []), ...(asset.tags || []), ...(asset.tjcTerms || [])])).slice(0, 18);
  if (!tags.length) return null;
  return (
    <section className="grid gap-3 rounded-[12px] border border-[#e5e7eb] bg-white p-4" aria-label="Tags">
      <h2 className="text-xl font-black text-tjc-ink">Tags</h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span className="rounded-md bg-[#eef4f0] px-3 py-1.5 text-xs font-black text-[#415149]" key={`${tag}-${index}`}>{tag}</span>
        ))}
      </div>
    </section>
  );
}

function usageChannels(asset: StockMediaAsset, canDownload: boolean) {
  if (!canDownload) return [];
  if (asset.usageScope === "Internal") return ["Internal training", "Member education", "Reviewer-approved ministry packets"];
  if (asset.usageScope === "Public and Internal") return ["Worship slides", "Newsletters", "Internal training", "Approved social posts"];
  if (asset.usageScope === "Public") return ["Worship slides", "Newsletters", "Approved web pages", "Approved social posts"];
  return ["Reviewer-approved use only"];
}

function blockedChannels(asset: StockMediaAsset, blockerLabels: string[], canDownload: boolean) {
  if (!canDownload && blockerLabels.length) return blockerLabels;
  const blocked = ["Paid advertising without review", "Source/original redistribution", "External partner use without scoped share link"];
  if (asset.peopleRisk === "Possible minors") blocked.unshift("Public youth/minor use until reviewer clears consent");
  if (asset.usageScope === "Internal") blocked.unshift("Public posting");
  return blocked;
}

function lifecycleState(asset: StockMediaAsset) {
  if (asset.status === "Do Not Use") return "Restricted";
  if (asset.status === "Searchable Archive" || asset.usageScope === "Archive Only") return "Archived";
  if (asset.status === "Needs Review" || asset.status === "Possible Minors") return "In Review";
  if (asset.status === "Approved Public" || asset.status === "Approved Internal") return "Approved";
  return asset.workflowState || "Draft";
}

function meaningfulValue(value?: string) {
  return Boolean(value && !/^(unknown|not exported|not applicable|none|n\/a|pending)$/i.test(value.trim()));
}

function sourceClass(asset: StockMediaAsset) {
  const source = `${asset.sourceSystem || ""} ${asset.sourcePlatform || ""} ${asset.sourceAccount || ""} ${asset.sourceAlbumPath || ""}`.toLowerCase();
  if (/church|tjc|lm photos|photographer|media team/.test(source)) return "Church source / photographer";
  if (/web|online|unsplash|pexels|free|stock|internet/.test(source)) return "Online or third-party source";
  return "Source class not exported";
}

function RightsEvidenceGate({
  asset,
  role,
  proofHref,
  canDownload
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  proofHref?: string | null;
  canDownload: boolean;
}) {
  const opsView = role === "Reviewer" || role === "DAM Admin";
  const sourceEvidence = asset.sourceAccount || asset.sourceSystem || asset.sourcePlatform || asset.sourceAlbumPath || asset.eventName || asset.collection;
  const ownerLicense = asset.rightsStatus || (asset.rightsNotes?.toLowerCase().includes("licensed") ? asset.rightsNotes : "");
  const proofLabel = proofHref && opsView ? "Open ResourceSpace proof record" : meaningfulValue(asset.rightsNotes) ? "Proof noted in rights notes" : "Proof link not exported";
  const rows = [
    { label: "Source", value: sourceEvidence || "Evidence missing", ok: meaningfulValue(sourceEvidence) },
    { label: "Source class", value: sourceClass(asset), ok: sourceClass(asset) !== "Source class not exported" },
    { label: "Owner/license", value: ownerLicense || "Evidence missing", ok: meaningfulValue(ownerLicense) },
    { label: "Usage scope", value: asset.usageScope || "Evidence missing", ok: meaningfulValue(asset.usageScope) },
    { label: "Attribution", value: asset.rightsNotes?.toLowerCase().includes("credit") ? asset.rightsNotes : "Not required unless reviewer notes require it", ok: true },
    { label: "Reviewer", value: asset.reviewer || "Reviewer missing", ok: Boolean(asset.reviewer) },
    { label: "Review date", value: asset.reviewedDate || "Review date missing", ok: Boolean(asset.reviewedDate) },
    { label: "Expiration / re-review", value: asset.reviewedDate ? "Re-review policy not exported" : "Re-review date missing", ok: false },
    { label: "Proof attachment/link", value: proofLabel, ok: Boolean(proofHref && opsView) || meaningfulValue(asset.rightsNotes) }
  ];
  const missingCount = rows.filter((row) => !row.ok).length;
  return (
    <section className={cn("rounded-[12px] border p-4", missingCount ? "border-[#ead6a8] bg-[#fff8e8]" : "border-[#b8d9c6] bg-[#edf8f1]")} aria-label="Copyright evidence gate">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase tracking-[.04em] text-[#52606b]">Copyright Evidence Gate</span>
          <h3 className="mt-1 text-base font-black text-tjc-ink">{missingCount ? "Evidence missing" : "Evidence complete enough for this verdict"}</h3>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-tjc-muted">
            No evidence means public/external download stays blocked. Online “free” is not proof.
          </p>
        </div>
        <span className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-black", canDownload ? "border-[#b8d9c6] bg-white text-[#22563a]" : "border-[#e5b7b5] bg-white text-[#7d2d2a]")}>
          {canDownload ? <CheckCircle2 size={14} strokeWidth={1.9} aria-hidden="true" /> : <AlertTriangle size={14} strokeWidth={1.9} aria-hidden="true" />}
          {canDownload ? "Approved derivative available" : "Public download blocked"}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div className="rounded-[9px] border border-[#e1e7e2] bg-white px-3 py-2" key={row.label}>
            <dt className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[.03em] text-[#52606b]">
              {row.ok ? <CheckCircle2 size={13} strokeWidth={1.9} aria-hidden="true" className="text-[#22563a]" /> : <AlertTriangle size={13} strokeWidth={1.9} aria-hidden="true" className="text-[#725216]" />}
              {row.label}
            </dt>
            <dd className="mt-1 break-words text-sm font-semibold text-tjc-ink">
              {row.label === "Proof attachment/link" && proofHref && opsView ? (
                <a className="inline-flex items-center gap-1 text-tjc-evergreen underline-offset-2 hover:underline" href={proofHref} target="_blank" rel="noreferrer">
                  {row.value}
                  <ExternalLink size={13} strokeWidth={1.9} aria-hidden="true" />
                </a>
              ) : row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DerivativeCustodyCard({
  asset,
  role,
  canDownload
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  canDownload: boolean;
}) {
  const opsView = role === "Reviewer" || role === "DAM Admin";
  const adminOps = role === "DAM Admin";
  const cards = [
    {
      label: "Approved Copy",
      value: canDownload ? "S3 Derivative Ready" : "Derivative pending or blocked",
      detail: canDownload ? "Viewer-safe copy. Use this for approved reuse." : "No approved public/external copy until review clears.",
      tone: canDownload ? "ok" : "warn",
      icon: ShieldCheck
    },
    {
      label: "Master Original Restricted",
      value: opsView ? asset.masterDrivePath || asset.sourcePath || "Google Drive custody path not exported" : "Hidden for this role",
      detail: "Google Shared Drive remains long-term custody. Master/original is not a Viewer download.",
      tone: "blocked",
      icon: LockKeyhole
    },
    {
      label: adminOps ? "ResourceSpace ID" : opsView ? "Source Record" : "Media Team Record",
      value: opsView ? asset.resourceSpaceId || asset.id : "Media Team review record",
      detail: opsView ? "ResourceSpace remains metadata, review, rights, and status truth." : "The Media Team keeps source custody, review, rights, and status truth.",
      tone: "info",
      icon: ScrollText
    },
    {
      label: opsView ? "Pending ResourceSpace Write" : "Pending Review Update",
      value: asset.pendingReviewWrite ? `${asset.pendingReviewWrite.requestedStatus} / ${asset.pendingReviewWrite.syncState}` : "None queued",
      detail: opsView ? "Pending writes are not final truth until ResourceSpace is checked again and reviewed." : "Review updates are not final until the Media Team confirms them.",
      tone: asset.pendingReviewWrite ? "warn" : "info",
      icon: History
    }
  ] as const;
  return (
    <section className="grid gap-3 rounded-[12px] border border-[#d9dee3] bg-white p-4" aria-label="Derivative and source separation">
      <div>
        <span className="text-xs font-black uppercase tracking-[.04em] text-[#52606b]">Approved copy vs source custody</span>
        <h3 className="mt-1 text-base font-black text-tjc-ink">Use derivative, protect original</h3>
      </div>
      <div className="grid gap-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className={cn("grid grid-cols-[auto_1fr] gap-3 rounded-[10px] border p-3", card.tone === "ok" && "border-[#b8d9c6] bg-[#edf8f1]", card.tone === "warn" && "border-[#ead6a8] bg-[#fff8e8]", card.tone === "blocked" && "border-[#e5b7b5] bg-[#fff1ef]", card.tone === "info" && "border-[#c8d7e6] bg-[#f2f7fb]")} key={card.label}>
              <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              <span className="min-w-0">
                <strong className="block text-sm font-black text-tjc-ink">{card.label}</strong>
                <span className="mt-0.5 block break-words text-sm font-semibold text-tjc-muted">{card.value}</span>
                <span className="mt-1 block text-xs font-semibold leading-snug text-tjc-muted">{card.detail}</span>
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function IncidentAuditCard({ asset, role }: { asset: StockMediaAsset; role: DemoRole }) {
  const opsView = role === "Reviewer" || role === "DAM Admin";
  const isDoNotUse = asset.status === "Do Not Use" || asset.usageScope === "Do Not Use";
  return (
    <section className={cn("rounded-[12px] border p-4", isDoNotUse ? "border-[#e5b7b5] bg-[#fff1ef]" : "border-[#d9dee3] bg-white")} aria-label="Rights incident and audit">
      <div className="flex items-start gap-3">
        {isDoNotUse ? <ShieldX size={20} strokeWidth={1.9} aria-hidden="true" className="text-[#7d2d2a]" /> : <UserCheck size={20} strokeWidth={1.9} aria-hidden="true" className="text-tjc-evergreen" />}
        <div>
          <h3 className="text-base font-black text-tjc-ink">{isDoNotUse ? "Do Not Use / takedown path" : "Audit answer"}</h3>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-tjc-muted">
            {opsView
              ? "Reviewer/Admin audit must answer who used this asset, why it was allowed or blocked, and what to do if it becomes unsafe."
              : "If this asset becomes unsafe, request DAM review. Do not reuse remembered source files."}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {[
          ["Allowed scope", asset.usageScope || "Not exported"],
          ["Blocked scope", asset.usageScope === "Internal" ? "Public/external posting" : "Source/original redistribution"],
          ["Who reviewed", asset.reviewer || "Reviewer pending"],
          ["Who downloaded", opsView ? "Admin audit log records allowed/denied downloads" : "Hidden for this role"]
        ].map(([label, value]) => (
          <div className="rounded-[9px] border border-[#e1e7e2] bg-white px-3 py-2" key={label}>
            <dt className="text-xs font-black uppercase tracking-[.03em] text-[#52606b]">{label}</dt>
            <dd className="mt-1 font-semibold text-tjc-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RoleContextCard({ role }: { role: DemoRole }) {
  return (
    <section className="rounded-[12px] border border-[#c8d7e6] bg-[#f2f7fb] p-4 text-sm" aria-label="Identity-ready role context">
      <span className="text-xs font-black uppercase tracking-[.04em] text-[#52606b]">Acting role</span>
      <h3 className="mt-1 text-base font-black text-tjc-ink">{role}</h3>
      <p className="mt-1 font-semibold leading-relaxed text-tjc-muted">
        Identity-ready for future universal TJC login: user id, church role, DAM role, region/local church, and permissions claims.
      </p>
    </section>
  );
}

function roleSafeRequestHref(asset: StockMediaAsset, role: DemoRole, type: "Request permission" | "Report privacy or rights issue") {
  const params = new URLSearchParams({
    type,
    media: asset.id,
    title: asset.title || asset.eventName || asset.collection || "Media asset"
  });
  return routeWithRole(`/requests?${params.toString()}`, role);
}

function roleSafeUsageStatus(verdict: ReturnType<typeof viewerVerdictForAsset>) {
  if (verdict.canDownload) {
    return {
      label: "Available with permission",
      detail: "Use only within listed guidance after the media team request is checked.",
      primaryAction: "Request use copy",
      panelTone: "ready" as const
    };
  }
  if (verdict.tone === "unavailable" || verdict.tone === "restricted") {
    return {
      label: "Restricted",
      detail: verdict.reason || "Ask the media team before reuse.",
      primaryAction: "Request permission",
      panelTone: "restricted" as const
    };
  }
  return {
    label: "Permission needed",
    detail: verdict.reason || "Ask the media team before reuse.",
    primaryAction: "Request permission",
    panelTone: "review" as const
  };
}

function RoleSafeAssetDetailPage({
  asset,
  role,
  title,
  subtitle,
  preview,
  verdict
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  title: string;
  subtitle?: string;
  preview?: string;
  verdict: ReturnType<typeof viewerVerdictForAsset>;
}) {
  const usage = roleSafeUsageStatus(verdict);
  const requestPermissionHref = roleSafeRequestHref(asset, role, "Request permission");
  const reportIssueHref = roleSafeRequestHref(asset, role, "Report privacy or rights issue");
  const detailFacts = [
    { label: "Album", value: asset.collection || "Not provided" },
    { label: "Date", value: asset.eventDate || asset.capturedDate || asset.importDate || "Not provided" },
    { label: "Type", value: asset.mediaType },
    { label: "Usage", value: usage.label }
  ];
  const metadataItems = [
    { label: "Album", value: asset.collection },
    { label: "Event", value: asset.eventName || asset.eventSeries },
    { label: "Date", value: asset.eventDate || asset.capturedDate || asset.importDate },
    { label: "Type", value: asset.mediaType },
    { label: "People/youth", value: asset.peopleRisk || "Ask media team" },
    { label: "Credit", value: asset.rightsNotes?.toLowerCase().includes("credit") ? "Credit may be required; ask media team." : "Ask media team if credit is needed." }
  ];

  return (
    <div className="dam-shell dam-asset-record-v2 grid gap-5">
      <section className="dam-record-command-v2" aria-label="Media record header">
        <div className="dam-record-breadcrumb" aria-label="Breadcrumb">
          <Link href={routeWithRole("/library", role)}>Media Library</Link>
          <span>/</span>
          <strong>{title}</strong>
        </div>
        <div className="dam-record-command-row">
          <div className="min-w-0">
            <span className="dam-record-route-chip">Asset detail</span>
            <h1>{title}</h1>
            <p>{[asset.collection, asset.eventDate || asset.capturedDate || asset.importDate, asset.mediaType].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="dam-record-command-actions">
            <DamActionButton href={routeWithRole("/library", role)} tone="secondary" icon={ArrowLeft}>Back to Library</DamActionButton>
          </div>
        </div>
      </section>

      <DamDetailPanel
        preview={
          <DamPreviewWorkbench
            title={title}
            subtitle={subtitle || "Open guidance before reuse."}
            status={usage.label}
            facts={detailFacts}
          >
            {preview ? (
              <MediaPreview src={preview} alt={asset.thumbnailAlt} label="Preview available" detail={subtitle || asset.collection} loading="eager" />
            ) : (
              <ProtectedPreview
                label="Preview protected"
                detail={usage.detail}
                signals={["Request permission", "Report issue", "Media team review"]}
                className="asset-detail-protected-preview h-full rounded-none"
              />
            )}
          </DamPreviewWorkbench>
        }
        decision={
          <>
            <section className={cn("dam-verdict-command-panel", usage.panelTone === "ready" && "is-ready", usage.panelTone === "restricted" && "is-restricted", usage.panelTone === "review" && "is-blocked")} data-testid="asset-primary-verdict">
              <div className="dam-verdict-command-top">
                <span>Use guidance</span>
                <span className="dam-related-record-verdict">{usage.label}</span>
              </div>
              <h2>{usage.label}</h2>
              <p>{usage.detail}</p>
              <div className="dam-verdict-command-actions">
                <DamActionButton href={requestPermissionHref} tone="primary" icon={Mail}>{usage.primaryAction}</DamActionButton>
                <DamActionButton href={reportIssueHref} tone="secondary" icon={AlertTriangle}>Report issue</DamActionButton>
              </div>
            </section>
            <DamMetadataGrid title="Media details" items={metadataItems} />
          </>
        }
      />
    </div>
  );
}

function OpsDetails({
  asset,
  role,
  resourceSpaceUrl
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  resourceSpaceUrl: string | null;
}) {
  const passport = assetGovernancePassport(asset);
  const canOpenResourceSpace = decideAccess(role, "viewResourceSpaceAdminLink", asset).allowed;
  const canSeeOriginal = decideAccess(role, "viewOriginalMetadata", asset).allowed;
  return (
    <section className="grid gap-3" aria-label="Admin source details">
      <details className="rounded-[12px] border border-[#e5e7eb] bg-white p-4">
        <summary className="cursor-pointer text-sm font-black text-tjc-evergreen">Admin source truth</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FieldList
            items={[
              { label: "ResourceSpace source", value: asset.sourceSystem || asset.sourcePlatform || "ResourceSpace export" },
              { label: "ResourceSpace ID", value: asset.resourceSpaceId || asset.id },
              { label: "Raw status", value: asset.status },
              { label: "Workflow state", value: asset.workflowState || "Not exported" },
              { label: "Source/original path", value: canSeeOriginal ? asset.sourcePath || asset.masterDrivePath : "Restricted for this role" },
              { label: "Pending write status", value: asset.pendingReviewWrite ? `${asset.pendingReviewWrite.requestedStatus} / ${asset.pendingReviewWrite.syncState}` : "None queued" }
            ]}
          />
          <div className="grid gap-3">
            <div className={cn("rounded-[10px] border p-4", passport.portalReady ? "border-[#b9d8c6] bg-[#eef8f2] text-[#194f34]" : "border-[#e5cf93] bg-[#fff8e8] text-[#71500f]")}>
              <strong className="block text-sm font-black">Launch readiness evidence</strong>
              <span className="mt-2 block text-3xl font-black tabular-nums">{passport.score}%</span>
              <span className="mt-1 block text-sm font-semibold">{passport.decision}</span>
            </div>
            <AssetActionsMenu asset={asset} resourceSpaceUrl={resourceSpaceUrl} canOpenResourceSpace={canOpenResourceSpace} canExposeResourceSpaceId label="Source actions" />
          </div>
        </div>
      </details>
      <details className="rounded-[12px] border border-[#e5e7eb] bg-white p-4">
        <summary className="cursor-pointer text-sm font-black text-tjc-evergreen">Audit and decision history</summary>
        <div className="mt-4 grid gap-2">
          {passport.auditTrail.map((item) => (
            <div className={cn("grid grid-cols-[auto_1fr] gap-3 rounded-[10px] border p-3", item.tone === "ok" ? "border-[#b9d8c6] bg-[#eef8f2] text-[#194f34]" : "border-[#e5cf93] bg-[#fff8e8] text-[#71500f]")} key={`${item.event}-${item.date}`}>
              <History size={16} strokeWidth={1.9} aria-hidden="true" />
              <span>
                <strong className="block text-sm font-black">{item.event}</strong>
                <span className="mt-1 block text-xs font-semibold">{item.actor} / {item.date}</span>
                <span className="mt-1 block text-sm font-semibold leading-snug">{item.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

export function AssetDetailPage({ id }: { id: string }) {
  const { role, ready } = useDemoRole();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setError("");
    fetch(`/api/assets/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load media record.");
        return body as DetailResponse;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, role, ready]);

  const opsView = role === "Reviewer" || role === "DAM Admin";
  const canOpenResourceSpace = data?.asset ? decideAccess(role, "viewResourceSpaceAdminLink", data.asset).allowed : false;

  const content = useMemo(() => {
    if (!data) return null;
    const { asset } = data;
    const display = assetPresentation(asset, role);
    const verdict = viewerVerdictForAsset(asset, role);
    const provenance = provenanceSummary(asset, role);
    return { asset, display, verdict, provenance, preview: detailImageUrl(asset, role) };
  }, [data, role]);

  if (error) {
    return (
      <div className="dam-shell">
        <DamActionButton href="/" tone="secondary" icon={ArrowLeft}>Back to Find</DamActionButton>
        <div className="mt-4">
          <EmptyState title="Media record did not load" description={error} primary={<DamActionButton href="/" icon={Search} tone="primary">Find approved media</DamActionButton>} />
        </div>
      </div>
    );
  }

  if (!content || !data) {
    return (
      <div className="dam-shell">
        <div className="skeleton h-[72dvh] rounded-[14px]" />
      </div>
    );
  }

  const { asset, display, verdict, provenance, preview } = content;
  if (!opsView) {
    return (
      <RoleSafeAssetDetailPage
        asset={asset}
        role={role}
        title={display.title}
        subtitle={display.cardSubtitle}
        preview={preview}
        verdict={verdict}
      />
    );
  }

  const passport = assetGovernancePassport(asset);
  const requestHref = requestReviewMailto(asset, role);
  const adminOps = role === "DAM Admin";
  const sourceGuidance = adminOps ? asset.sourceAccount || asset.sourceSystem || asset.sourcePlatform || "Source not exported" : opsView ? "Media library record" : "Media team";
  const referenceLabel = adminOps ? "ResourceSpace ID" : "Reference code";
  const referenceCode = adminOps ? asset.resourceSpaceId || asset.id : asset.id;
  const safeCopyTone = verdict.tone === "ready" ? "approved" : verdict.tone === "unavailable" ? "blocked" : verdict.tone === "restricted" ? "restricted" : "pending";
  const sourceRestrictionCopy = verdict.canDownload
    ? "Use the approved copy shown here. Source-file access stays request-only."
    : "Source files stay with the Media Team. Request review before reuse or source-file access.";
  const tags = Array.from(new Set([...(asset.usageTerms || []), ...(asset.tags || []), ...(asset.tjcTerms || [])])).slice(0, 10);
  const metadataItems = [
    { label: "Usage rights", value: asset.rightsStatus || asset.rightsNotes || "Reviewer should confirm before public use" },
    { label: "Ministry / event", value: asset.eventName || asset.collection },
    { label: "People sensitivity", value: asset.peopleRisk || "Unknown" },
    { label: "Usage scope", value: asset.usageScope },
    { label: "DAM filename", value: asset.damFilenames?.web || asset.damFilenames?.original || "Generated at delivery" },
    { label: "Review date", value: asset.reviewedDate || "Review pending" },
    { label: referenceLabel, value: referenceCode },
    { label: "Source file", value: verdict.canDownload ? "Approved copy available; source access restricted" : "Request-only" },
    {
      label: "Tags",
      value: tags.length ? (
        <span className="dam-record-tag-list">
          {tags.map((tag) => <span key={tag}>{tag}</span>)}
        </span>
      ) : "Not provided"
    }
  ];
  const allowedUseChannels = usageChannels(asset, verdict.canDownload);
  const blockedUseChannels = blockedChannels(asset, verdict.blockers.map((blocker) => blocker.label), verdict.canDownload);
  const approvalDate = asset.reviewedDate ? `${asset.reviewedDate}${passport.warnings.includes("Approval recheck due") ? " · recheck due" : ""}` : "Review pending";
  const attribution = asset.rightsNotes?.toLowerCase().includes("credit") ? asset.rightsNotes : "Not required unless reviewer notes say otherwise";
  const currentVersion = asset.originalFilename || asset.checksumSha256 ? `${asset.originalFilename || "Approved derivative"}${asset.checksumSha256 ? ` · checksum ${asset.checksumSha256.slice(0, 10)}...` : ""}` : "Current approved copy";
  const replacementAsset = asset.duplicateGroup ? `Duplicate group ${asset.duplicateGroup}; reviewer chooses canonical record` : undefined;
  const recentChanges = [
    asset.reviewer && asset.reviewedDate ? `Reviewed by ${asset.reviewer} on ${asset.reviewedDate}` : "Reviewer evidence pending",
    asset.pendingReviewWrite ? `Queued decision: ${asset.pendingReviewWrite.requestedStatus} / ${asset.pendingReviewWrite.syncState}` : "No pending review write",
    passport.warnings[0] || "No exported maintenance warning"
  ];

  return (
    <div className="dam-shell dam-asset-record-v2 grid gap-5">
      <section className="dam-record-command-v2" aria-label="Media record header">
        <div className="dam-record-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Find</Link>
          <span>/</span>
          <span>{asset.collection}</span>
          <span>/</span>
          <strong>{display.title}</strong>
        </div>
        <div className="dam-record-command-row">
          <div className="min-w-0">
            <span className="dam-record-route-chip">{opsView ? "Enterprise media record" : "Asset record"}</span>
            <h1>{display.title}</h1>
            <p>{asset.mediaType} · {asset.fileExtension || "media"} · {asset.imageDimensions || "dimensions pending"} · {opsView ? provenance.publicLabel : asset.eventName || asset.collection}</p>
          </div>
          <div className="dam-record-command-actions">
            <DamActionButton href="/" tone="secondary" icon={ArrowLeft}>Back to Find</DamActionButton>
            <DamActionButton href="#credit" tone="quiet" icon={ScrollText}>View credit</DamActionButton>
            <AssetActionsMenu asset={asset} resourceSpaceUrl={data.resourceSpaceUrl ?? null} canOpenResourceSpace={canOpenResourceSpace} canExposeResourceSpaceId={adminOps} label={opsView ? "Asset actions" : "Record actions"} />
          </div>
        </div>
      </section>

      <DamDetailPanel
        preview={
          <div className="grid gap-4">
            <DamPreviewWorkbench
              title={display.title}
              subtitle={preview ? display.cardSubtitle : "Protected preview stays blocked until the record clears reuse checks."}
              status={preview ? "Preview available" : "Protected"}
              facts={[
                { label: "Dimensions", value: asset.imageDimensions || "Not exported" },
                { label: "File type", value: asset.fileExtension || asset.mediaType },
                { label: "Source", value: sourceGuidance },
                { label: referenceLabel, value: referenceCode }
              ]}
            >
              {preview ? (
                <MediaPreview src={preview} alt={asset.thumbnailAlt} label="Preview available" detail={display.cardSubtitle} loading="eager" />
              ) : (
                <ProtectedPreview
                  label="Preview protected"
                  detail={verdict.reason}
                  signals={["Open verdict first", "Request review to unblock", "Source file stays request-only"]}
                  className="asset-detail-protected-preview h-full rounded-none"
                />
              )}
            </DamPreviewWorkbench>
          </div>
        }
        decision={
          <>
            <section className={cn("dam-verdict-command-panel", verdict.tone === "ready" && "is-ready", verdict.tone === "restricted" && "is-restricted", verdict.tone === "unavailable" && "is-blocked")} data-testid="asset-primary-verdict">
              <div className="dam-verdict-command-top">
                <span>Can I use this?</span>
                <DamVerdictBadge verdict={verdict} />
              </div>
              <h2>{verdict.title}</h2>
              <p>{verdict.reason}</p>
              <DamSafeCopy tone={safeCopyTone} title={verdict.canDownload ? "Approved copy available" : "Reuse is not self-serve yet"}>
                {verdict.canDownload
                  ? "Download the approved copy and keep the visible usage guidance with the media."
                  : "Do not download, publish, or reuse this media until the record clears review."}
              </DamSafeCopy>
              <DamSourceRestrictionCard detail={sourceRestrictionCopy} />
              <DerivativeCustodyCard asset={asset} role={role} canDownload={verdict.canDownload} />
              <RightsEvidenceGate asset={asset} role={role} proofHref={data.resourceSpaceUrl} canDownload={verdict.canDownload} />
              <DamDecisionLedger
                allowed={allowedUseChannels}
                blocked={blockedUseChannels}
                approver={asset.reviewer || (verdict.canDownload ? "Media Team" : "Reviewer pending")}
                expires={approvalDate}
                attribution={attribution}
                replacement={replacementAsset}
              />
              {!verdict.canDownload ? (
                <DamBlockedActionNote
                  action="Download"
                  reason={verdict.reason}
                  nextStep="Request DAM review before reuse."
                />
              ) : null}
              <div className="dam-verdict-command-actions">
                {verdict.canDownload ? (
                  <DamActionButton href={verdict.downloadHref} tone="primary" icon={Download}>Download approved copy</DamActionButton>
                ) : (
                  <DamActionButton href={requestHref} tone="primary" icon={Mail}>Request DAM review</DamActionButton>
                )}
                <DamActionButton href={requestHref} tone="secondary" icon={FileLock2}>Request source-file access</DamActionButton>
              </div>
            </section>
            <RoleContextCard role={role} />
            <IncidentAuditCard asset={asset} role={role} />
            <DamMetadataGrid title="Record metadata" items={metadataItems} />
            <DamSourceTruthCard
              role={role}
              resourceSpace={adminOps ? asset.resourceSpaceId || asset.id : opsView ? "ResourceSpace review record" : "Media Team review record"}
              drive={adminOps ? asset.masterDrivePath || asset.sourcePath || "Drive source not exported" : "Master original managed by Media Team"}
              derivative={verdict.canDownload ? "Approved portal copy available" : "Derivative blocked until review clears"}
            />
          </>
        }
      />

      <DamRelatedMediaStrip assets={data.related} role={role} />

      <section className="record-metadata-grid grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,.45fr)]" aria-label="Use guidance">
        <div className="grid gap-4">
          <RecordMetadataSection title="Use guidance" id="use-guidance" className="scroll-mt-28" >
            <FieldList items={display.guidanceFacts.map((fact) => ({ label: fact.label, value: fact.value }))} />
          </RecordMetadataSection>

          <RecordMetadataSection title="Credit" id="credit" className="scroll-mt-28">
            <p className="mt-2 text-sm font-semibold leading-relaxed text-tjc-muted">{asset.rightsNotes?.toLowerCase().includes("credit") ? asset.rightsNotes : "Credit not required unless noted by reviewer."}</p>
          </RecordMetadataSection>
        </div>

        <aside className="grid gap-4">
          <DamWorkflowPanel
            state={lifecycleState(asset)}
            reviewer={asset.reviewer || (opsView ? "Unassigned reviewer" : "Media Team")}
            nextAction={verdict.canDownload ? "Download approved copy and keep the visible verdict with the media." : "Request DAM review before reuse, publishing, or source access."}
            blockers={passport.blockers}
          />
          <DamVersionHistoryPanel
            current={currentVersion}
            previous={asset.duplicateRole ? `Duplicate role: ${asset.duplicateRole}` : undefined}
            replacement={replacementAsset}
            changes={recentChanges}
          />
          <RecordMetadataSection title="People/youth note">
            <p className="mt-2 text-sm font-semibold leading-relaxed text-tjc-muted">
              {asset.peopleRisk === "Possible minors"
                ? "People or youth may be visible. Review is required before public reuse."
                : asset.peopleRisk && asset.peopleRisk !== "Unknown"
                  ? asset.peopleRisk
                  : "People visibility has not been confirmed. Request review before public reuse."}
            </p>
          </RecordMetadataSection>
          <TagSection asset={asset} />
        </aside>
      </section>

      <DamActionBar
        reminder={<><ShieldCheck size={17} strokeWidth={1.9} aria-hidden="true" /> Downloads follow the visible usage verdict.</>}
      >
        {verdict.canDownload ? (
          <DamActionButton href={verdict.downloadHref} tone="primary" icon={Download}>Download approved copy</DamActionButton>
        ) : (
          <DamActionButton href={requestHref} tone="primary" icon={Mail}>Request DAM review</DamActionButton>
        )}
        <DamActionButton href="/collections" tone="secondary" icon={PackagePlus}>Browse packages</DamActionButton>
        <DamActionButton tone="secondary" icon={Link2} disabled disabledReason="Share link creation is limited to DAM Manager/Admin policy in this portal.">Create share link</DamActionButton>
        <DamActionButton href={requestHref} tone="secondary" icon={FileLock2}>Request source access</DamActionButton>
        <DamActionButton href="#credit" tone="quiet" icon={ScrollText}>View credit</DamActionButton>
      </DamActionBar>

      {adminOps ? <OpsDetails asset={asset} role={role} resourceSpaceUrl={data.resourceSpaceUrl ?? null} /> : null}
    </div>
  );
}
