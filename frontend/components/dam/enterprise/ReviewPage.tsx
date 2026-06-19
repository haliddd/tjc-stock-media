"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Clock3,
  Database,
  FileText,
  FolderOpen,
  ImageIcon,
  Info,
  Lock,
  X
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useReviewQueue } from "@/components/dam/useDamApi";
import { assetRecordRef, displayTitle, sourceTruthLabel } from "@/lib/enterprise-display";
import { assetEnterpriseStatus, type EnterpriseStatus } from "@/lib/enterprise-status";
import { initialReviewChecklistForAsset, reviewActionDisabledReason } from "@/lib/review-decision-presenter";
import {
  buildReviewWorkbenchState,
  buildSelectedReviewGuidance,
  contributorVisibleText,
  reviewSourceReadState,
  safeReviewWorkbenchText,
  reviewWaitingDays,
  type PendingReviewDecisionSummary
} from "@/lib/review-workbench";
import { routeWithRole } from "@/lib/role-routes";
import type { ReviewActionBackend, ReviewQueueId } from "@/lib/workflow-policy";
import { missingReviewFields, normalizeReviewQueueId, reviewRiskFlags } from "@/lib/workflow-policy";
import type { DemoRole, ReviewEvidenceChecklist, StockMediaAsset, UsageScope } from "@/lib/types";
import { cn } from "@/lib/ui";
import { AssetThumb, LoadingCard } from "./EnterpriseShared";

type ReviewUploadStatus = "New" | "Needs info" | "Rights attention" | "Ready to approve" | "Approved" | "Restricted" | "Rejected";

type ReviewUploadBatch = {
  id: string;
  eventName: string;
  uploadedBy: string;
  eventDate: string;
  submittedDate: string;
  ministry: string;
  status: ReviewUploadStatus;
  reason: string;
  items: StockMediaAsset[];
  photoCount: number;
  videoCount: number;
  rightsAttentionCount: number;
  needsInfoCount: number;
  readyCount: number;
};

type SimpleCheck = {
  id: "event" | "rights" | "people" | "scope";
  label: string;
  done: boolean;
  detail: string;
  action: string;
};

type BrowserUploadReceipt = {
  id: string;
  batchName: string;
  mediaType: string;
  fileCount: number;
  status: string;
  date: string;
  eventDate?: string;
  ministry?: string;
  reviewStatus?: string;
};

type ReviewShellAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "primary" | "secondary";
};

type ReviewStatusCard = {
  label: string;
  value: string;
  detail: string;
  tone?: "ok" | "warn" | "blocked" | "neutral";
};

const approvalScopes: UsageScope[] = ["Public", "Public and Internal", "Internal", "Archive Only", "Do Not Publish", "Do Not Use"];
const reviewNoteId = "review-upload-note";
const usageScopeId = "review-upload-usage-scope";
const contributorUploadsKey = "tjc-upload-intake-my-uploads-v1";
const drawerFocusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");

function getDrawerFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(drawerFocusableSelector)).filter((element) => (
    element.tabIndex >= 0
    && element.getAttribute("aria-disabled") !== "true"
    && !element.closest("[hidden], [aria-hidden='true']")
    && element.getClientRects().length > 0
  ));
}

function meaningful(value?: string | null) {
  return Boolean(value && !/^(unknown|not exported|not applicable|none|n\/a)$/i.test(value.trim()));
}

function displayDate(value?: string | null, fallback = "Date needed") {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(parsed));
}

function assetHasEventName(asset?: StockMediaAsset) {
  return Boolean(asset && [
    asset.eventName,
    asset.sourceAlbum,
    asset.collection
  ].some(meaningful));
}

function assetHasEventDate(asset?: StockMediaAsset) {
  return Boolean(asset && [asset.eventDate, asset.capturedDate].some(meaningful));
}

function eventDateFor(asset?: StockMediaAsset) {
  return asset?.eventDate || asset?.capturedDate || "";
}

function submittedDateFor(asset?: StockMediaAsset) {
  return asset?.importDate || asset?.fileModifiedDate || asset?.capturedDate || asset?.eventDate || "";
}

function eventNameFor(asset?: StockMediaAsset) {
  return asset?.eventName || asset?.sourceAlbum || asset?.collection || "Submitted church media";
}

function ministryFor(asset?: StockMediaAsset) {
  return asset?.collection || asset?.church || asset?.region || "Media ministry";
}

function uploadedByFor(asset?: StockMediaAsset) {
  const sourceAccount = meaningful(asset?.sourceAccount) ? asset?.sourceAccount : "";
  if (sourceAccount && !/resourcespace|export|snapshot/i.test(sourceAccount)) return sourceAccount;
  return "Contributor pending";
}

function batchKeyFor(asset: StockMediaAsset) {
  return [
    asset.importBatch,
    asset.eventName,
    asset.eventDate,
    asset.sourceAlbum,
    asset.sourceAlbumPath,
    asset.collection
  ].find((value) => meaningful(value)) || asset.id;
}

function assetNeedsRightsAttention(asset: StockMediaAsset) {
  const missing = missingReviewFields(asset);
  return missing.includes("consent") || missing.includes("rights notes") || !assetHasRightsConsentProof(asset);
}

function assetNeedsPeopleAttention(asset: StockMediaAsset) {
  return !asset.peopleRisk || asset.peopleRisk === "Unknown" || /minor|children|youth/i.test(asset.peopleRisk);
}

function assetNeedsEventInfo(asset: StockMediaAsset) {
  return !assetHasEventName(asset) || !assetHasEventDate(asset);
}

function assetIsReadyCandidate(asset: StockMediaAsset) {
  return !assetNeedsRightsAttention(asset) && !assetNeedsPeopleAttention(asset) && !assetNeedsEventInfo(asset) && asset.usageScope !== "Do Not Publish" && asset.status === "Needs Review";
}

function batchStatusFor(items: StockMediaAsset[]): ReviewUploadStatus {
  if (items.every((asset) => asset.status === "Approved Public" || asset.status === "Approved Internal")) return "Approved";
  if (items.every((asset) => asset.status === "Do Not Use")) return "Restricted";
  if (items.some(assetNeedsRightsAttention)) return "Rights attention";
  if (items.some((asset) => assetNeedsEventInfo(asset) || missingReviewFields(asset).length)) return "Needs info";
  if (items.some(assetIsReadyCandidate)) return "Ready to approve";
  return "New";
}

function batchReasonFor(items: StockMediaAsset[], status: ReviewUploadStatus) {
  if (!items.length) return "No media in this upload";
  const count = items.length;
  const noun = count === 1 ? "media item" : "media items";
  if (items.some(assetNeedsRightsAttention)) return "Rights proof missing";
  if (items.some(assetNeedsPeopleAttention)) return "People/minors visible";
  if (items.some(assetNeedsEventInfo)) return "Needs event date";
  if (status === "Ready to approve") return "Ready for reviewer decision";
  if (status === "Approved") return "Approved items stay governed";
  if (status === "Restricted") return "Do not publish";
  return `${count.toLocaleString()} ${noun} waiting for review`;
}

function buildReviewUploadBatches(assets: StockMediaAsset[]): ReviewUploadBatch[] {
  const groups = new Map<string, StockMediaAsset[]>();
  for (const asset of assets) {
    const key = batchKeyFor(asset);
    groups.set(key, [...(groups.get(key) || []), asset]);
  }

  return [...groups.entries()].map(([id, items]) => {
    const sorted = [...items].sort((left, right) => {
      const leftDate = Date.parse(submittedDateFor(left)) || 0;
      const rightDate = Date.parse(submittedDateFor(right)) || 0;
      return rightDate - leftDate;
    });
    const first = sorted[0];
    const status = batchStatusFor(sorted);
    return {
      id,
      eventName: eventNameFor(first),
      uploadedBy: uploadedByFor(first),
      eventDate: displayDate(eventDateFor(first)),
      submittedDate: displayDate(submittedDateFor(first), "Submitted date needed"),
      ministry: ministryFor(first),
      status,
      reason: batchReasonFor(sorted, status),
      items: sorted,
      photoCount: sorted.filter((asset) => asset.mediaType === "photo").length,
      videoCount: sorted.filter((asset) => asset.mediaType === "video").length,
      rightsAttentionCount: sorted.filter(assetNeedsRightsAttention).length,
      needsInfoCount: sorted.filter((asset) => assetNeedsEventInfo(asset) || missingReviewFields(asset).length).length,
      readyCount: sorted.filter(assetIsReadyCandidate).length
    };
  }).sort((left, right) => {
    const statusOrder: Record<ReviewUploadStatus, number> = {
      "Rights attention": 0,
      "Needs info": 1,
      "New": 2,
      "Ready to approve": 3,
      "Approved": 4,
      "Restricted": 5,
      "Rejected": 6
    };
    return statusOrder[left.status] - statusOrder[right.status] || right.items.length - left.items.length;
  });
}

function simpleStatusTone(status: ReviewUploadStatus) {
  if (status === "Ready to approve" || status === "Approved") return "is-ready";
  if (status === "Rights attention") return "is-rights";
  if (status === "Restricted" || status === "Rejected") return "is-restricted";
  if (status === "Needs info") return "is-needs-info";
  return "is-new";
}

function displayReviewUploadStatus(status: ReviewUploadStatus) {
  if (status === "Ready to approve") return "Ready for decision";
  if (status === "Restricted") return "Do Not Publish";
  if (status === "Rejected") return "Restricted follow-up";
  return status;
}

function countMedia(batch: ReviewUploadBatch) {
  const pieces = [
    batch.photoCount ? `${batch.photoCount} photo${batch.photoCount === 1 ? "" : "s"}` : "",
    batch.videoCount ? `${batch.videoCount} video${batch.videoCount === 1 ? "" : "s"}` : ""
  ].filter(Boolean);
  return pieces.length ? pieces.join(" / ") : `${batch.items.length} media item${batch.items.length === 1 ? "" : "s"}`;
}

function peopleFlagForBatch(batch: ReviewUploadBatch) {
  if (batch.items.some((asset) => /minor|children|youth/i.test(asset.peopleRisk || ""))) return "Possible minors";
  if (batch.items.some((asset) => asset.peopleRisk === "Adults visible")) return "Adults visible";
  if (batch.items.length && batch.items.every((asset) => asset.peopleRisk === "No people")) return "No people";
  return "People/minors unknown";
}

function assetHasDownloadCopy(asset?: StockMediaAsset) {
  return Boolean(asset?.imageUrls?.download || asset?.downloadPolicy === "approved-copy-allowed" || asset?.downloadPolicy === "internal-approved-copy-allowed");
}

function assetHasRightsConsentProof(asset?: StockMediaAsset) {
  if (!asset) return false;
  const structuredRightsBasisForReview = Boolean(asset.rightsBasis && asset.rightsBasis !== "unknown" && asset.rightsBasis !== "fair-use-internal-only");
  const structuredConsentEvidenceForReview = asset.peopleRisk === "No people" || Boolean(asset.consentReleaseRecordId?.trim());
  const rightsClear = structuredRightsBasisForReview;
  const consentClear = structuredConsentEvidenceForReview;
  return rightsClear && consentClear;
}

function assetHasSourceEvidence(asset?: StockMediaAsset) {
  if (!asset) return false;
  return [
    asset.resourceSpaceId,
    asset.resource_space_id,
    asset.sourceSystem,
    asset.sourcePlatform,
    asset.sourceAccount,
    asset.sourceFolder,
    asset.sourceAlbum,
    asset.sourceAlbumPath,
    asset.sourcePath,
    asset.source_path,
    asset.importBatch
  ].some((value) => meaningful(String(value || "")));
}

function buildSimpleChecks(asset: StockMediaAsset | undefined, checklist: ReviewEvidenceChecklist, approvalScope: UsageScope | ""): SimpleCheck[] {
  const sourceDone = Boolean(checklist.sourceConfirmed || assetHasSourceEvidence(asset));
  const eventDone = Boolean(asset && assetHasEventName(asset) && assetHasEventDate(asset) && sourceDone);
  const rightsDone = Boolean(assetHasRightsConsentProof(asset) && checklist.rightsConfirmed && checklist.proofLinkAttached && checklist.attributionConfirmed && checklist.creditRequirementChecked);
  const peopleDone = Boolean(checklist.peopleVisibilityConfirmed && checklist.childrenYouthChecked);
  const scopeDone = Boolean(
    checklist.usageScopeSelected
    && checklist.sensitiveContextChecked
    && checklist.expirationRereviewSet
    && checklist.derivativeAvailable
    && approvalScope
  );
  return [
    {
      id: "event",
      label: "Event/source",
      done: eventDone,
      detail: eventDone ? "Event details and source evidence are present." : "Confirm event name, date, ministry, and source before approval.",
      action: eventDone ? "Open advanced" : "Add details"
    },
    {
      id: "rights",
      label: "Rights/consent",
      done: rightsDone,
      detail: rightsDone ? "Rights/consent proof is noted for this decision." : "Add owner/license, consent, or proof note before approval.",
      action: rightsDone ? "Open advanced" : "Add proof"
    },
    {
      id: "people",
      label: "People/minors",
      done: peopleDone,
      detail: peopleDone ? "People/minors review is marked complete." : "Choose allowed scope when people/minors are visible.",
      action: peopleDone ? "Open advanced" : "Choose usage"
    },
    {
      id: "scope",
      label: "Usage scope",
      done: scopeDone,
      detail: scopeDone ? `Scope selected: ${approvalScope}.` : "Select usage scope.",
      action: scopeDone ? "Open advanced" : "Choose usage"
    }
  ];
}

function nextActionFor(asset: StockMediaAsset | undefined, checks: SimpleCheck[], publicDisabledReason: string) {
  const missing = checks.find((check) => !check.done);
  if (missing?.id === "event") return { message: "This upload needs event/source details before review.", button: "Add details", target: "event" as const };
  if (missing?.id === "rights") return { message: "Rights/consent proof is missing.", button: "Add proof", target: "rights" as const };
  if (missing?.id === "people") return { message: "People/minors are visible or not yet resolved. Choose usage scope.", button: "Choose usage", target: "people" as const };
  if (missing?.id === "scope") return { message: "Choose how this media can be used.", button: "Choose usage", target: "scope" as const };
  if (publicDisabledReason) return { message: "Required checks are close, but approval still has a safety blocker.", button: "Open advanced", target: "advanced" as const };
  return { message: "Required checks are complete for reviewer decision.", button: "Prepare decision", target: "approve" as const };
}

function approvalMetadataMissing(action: "Approve Public" | "Approve Internal", reviewerName: string, reviewDate: string, approvalScope: UsageScope | "") {
  const missing: string[] = [];
  if (reviewerName.trim().length < 2) missing.push("Reviewer name missing");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDate) || reviewDate > new Date().toISOString().slice(0, 10)) missing.push("Review date missing or future");
  if (!approvalScope) missing.push("Approval usage scope missing");
  if (action === "Approve Public" && approvalScope && !["Public", "Public and Internal"].includes(approvalScope)) missing.push("Public approval requires Public or Public and Internal scope");
  if (action === "Approve Internal" && approvalScope && !["Internal", "Public and Internal"].includes(approvalScope)) missing.push("Internal approval requires Internal or Public and Internal scope");
  return missing;
}

function disabledReasonForAction({
  asset,
  action,
  checklist,
  note,
  reviewerName,
  reviewDate,
  approvalScope
}: {
  asset?: StockMediaAsset;
  action: ReviewActionBackend;
  checklist: ReviewEvidenceChecklist;
  note: string;
  reviewerName: string;
  reviewDate: string;
  approvalScope: UsageScope | "";
}) {
  if (!asset) return "Select media first.";
  if (action === "Request More Info" || action === "Do Not Use") {
    return note.trim().length > 10 ? "" : "Reviewer note missing";
  }
  const reviewMissing = reviewActionDisabledReason({ asset, action, checklist, note });
  const approvalMissing = action === "Approve Public" || action === "Approve Internal"
    ? approvalMetadataMissing(action, reviewerName, reviewDate, approvalScope)
    : [];
  return [reviewMissing, ...approvalMissing].filter(Boolean).join(". ");
}

function sanitizedTechnicalRows(asset?: StockMediaAsset) {
  if (!asset) return [];
  return [
    ["Source record ID", assetRecordRef(asset)],
    ["Import batch", asset.importBatch || "Not exported"],
    ["Source album", asset.sourceAlbum || "Not exported"],
    ["Source path", asset.sourceAlbumPath || asset.sourcePath ? "Hidden in portal" : "Not exported"],
    ["Checksum", asset.checksumSha256 ? "Present, hidden in portal" : "Not exported"],
    ["Role-safe copy", assetHasDownloadCopy(asset) ? "Derivative copy listed" : "No approved copy listed"],
    ["Workflow state", asset.workflowState || "Not exported"],
    ["Pending review update", asset.pendingReviewWrite ? `${asset.pendingReviewWrite.requestedStatus} / ${asset.pendingReviewWrite.syncState}` : "None"]
  ];
}

function normalizeBrowserReceipt(value: unknown): BrowserUploadReceipt | null {
  const raw = (value || {}) as Partial<BrowserUploadReceipt>;
  const id = safeReviewWorkbenchText(raw.id);
  const batchName = contributorVisibleText(raw.batchName, "Submitted church media");
  if (!id || !batchName) return null;
  return {
    id,
    batchName,
    mediaType: contributorVisibleText(raw.mediaType, "Not sure"),
    fileCount: Math.max(0, Math.trunc(Number(raw.fileCount) || 0)),
    status: contributorVisibleText(raw.status, "Submitted"),
    date: contributorVisibleText(raw.date, "Recent"),
    eventDate: raw.eventDate ? contributorVisibleText(raw.eventDate, "Date pending") : undefined,
    ministry: raw.ministry ? contributorVisibleText(raw.ministry, "Ministry pending") : undefined,
    reviewStatus: raw.reviewStatus ? contributorVisibleText(raw.reviewStatus, "") || undefined : undefined
  };
}

function readBrowserReceipts() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(contributorUploadsKey) || "[]") as unknown[];
    return Array.isArray(parsed) ? parsed.map(normalizeBrowserReceipt).filter((item): item is BrowserUploadReceipt => Boolean(item)).slice(0, 4) : [];
  } catch {
    return [];
  }
}

function sourceCardValue(source: Parameters<typeof sourceTruthLabel>[0], live?: boolean, error?: string | null) {
  if (error) return "Read unavailable";
  if (!source) return "Disconnected";
  if (source.adapter === "demo-fallback" || source.adapter === "media-library") return "Disconnected";
  if (live) return "Connected";
  if (source.readOnly) return "Read-only";
  return "Configured";
}

function sourceCardDetail(source: Parameters<typeof sourceTruthLabel>[0], role: string, error?: string | null) {
  if (error) return role === "DAM Admin" ? error : "Review source could not be checked. Upload intake can still remain separate.";
  if (!source) return "No review source status returned yet.";
  if (role === "DAM Admin") return `${sourceTruthLabel(source)}: ${source.detail}`;
  return source.adapter === "demo-fallback" || source.adapter === "media-library"
    ? "Review source is not connected in this session."
    : "Review source can be read for this workflow.";
}

function reviewStatusCards({
  batches,
  receipts,
  source,
  live,
  error,
  role,
  accessAllowed,
  loading
}: {
  batches: ReviewUploadBatch[];
  receipts: BrowserUploadReceipt[];
  source: Parameters<typeof sourceTruthLabel>[0];
  live?: boolean;
  error?: string | null;
  role: string;
  accessAllowed: boolean;
  loading?: boolean;
}): ReviewStatusCard[] {
  const sourceValue = loading ? "Checking" : sourceCardValue(source, live, error);
  const queueBlocked = !accessAllowed || Boolean(error) || sourceValue === "Disconnected";
  return [
    {
      label: "Upload intake",
      value: receipts.length ? "Receipts on this browser" : "Available",
      detail: receipts.length
        ? `${receipts.length.toLocaleString()} recent submission${receipts.length === 1 ? "" : "s"} from this browser. Not reviewer work records.`
        : accessAllowed
          ? "Contributors can submit uploads through intake; review still requires source access."
          : "Contributors can submit uploads through intake; reviewer work requires reviewer/admin role.",
      tone: "ok"
    },
    {
      label: "Review queue",
      value: !accessAllowed ? "Access needed" : loading ? "Checking" : queueBlocked ? "Paused" : batches.length ? `${batches.length.toLocaleString()} batch${batches.length === 1 ? "" : "es"}` : "No uploads waiting",
      detail: !accessAllowed
        ? "Reviewer or DAM Admin role required."
        : queueBlocked
          ? "Uploads can be submitted, but review is paused."
          : batches.length
            ? "Batches below need reviewer evidence or decision."
            : "No uploads waiting for review.",
      tone: !accessAllowed || queueBlocked ? "warn" : "ok"
    },
    {
      label: "Source system",
      value: accessAllowed ? sourceValue : "Restricted",
      detail: accessAllowed ? sourceCardDetail(source, role, error) : "Reviewer or DAM Admin role required.",
      tone: !accessAllowed || error || sourceValue === "Disconnected" ? "blocked" : sourceValue === "Checking" ? "neutral" : "ok"
    }
  ];
}

function ReviewUploadsHeader({ cards, subtitle = "Review submitted event media before use guidance changes." }: { cards: ReviewStatusCard[]; subtitle?: string }) {
  return (
    <header className="review-uploads-header">
      <div>
        <span>Media review</span>
        <h1>Review Uploads</h1>
        <p>{subtitle}</p>
      </div>
      <section aria-label="Review upload summary">
        {cards.map((card) => (
          <article className={cn(card.tone && `is-${card.tone}`)} key={card.label}>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>
    </header>
  );
}

function ReviewQueueOverview({
  queues,
  activeQueueId,
  sourceUnavailable
}: {
  queues?: Array<{ id: string; label: string; description: string; count: number }>;
  activeQueueId: ReviewQueueId;
  sourceUnavailable?: boolean;
}) {
  const visibleQueues = queues?.length ? queues : [
    { id: activeQueueId, label: "Review queue", description: sourceUnavailable ? "Queue counts unavailable while source read is paused." : "No queues returned yet.", count: 0 }
  ];
  return (
    <section className="review-queue-overview" aria-label="Available review queues">
      <header>
        <div>
          <h2>Available queues</h2>
          <p>{sourceUnavailable ? "Queue counts need a source check." : "Open lanes for reviewer triage."}</p>
        </div>
      </header>
      <div>
        {visibleQueues.slice(0, 8).map((queue) => (
          <article className={cn(queue.id === activeQueueId && "is-active")} key={queue.id}>
            <strong>{queue.count.toLocaleString()}</strong>
            <span>{queue.label}</span>
            <small>{queue.description}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function BrowserReceiptsPanel({ receipts, role }: { receipts: BrowserUploadReceipt[]; role: DemoRole }) {
  if (!receipts.length) return null;
  return (
    <section className="review-browser-receipts" aria-label="Recent submissions from this browser">
      <header>
        <div>
          <Clock3 size={18} aria-hidden="true" />
          <h2>Recent submissions from this browser</h2>
        </div>
        <Link href={routeWithRole("/recent-uploads", role)}>View My Uploads</Link>
      </header>
      <p>Browser receipts help contributors find recent submissions. They are not reviewer work records and do not enable approval actions.</p>
      <div>
        {receipts.map((receipt) => (
          <article key={receipt.id}>
            <strong>{receipt.batchName}</strong>
            <span>{receipt.date} · {receipt.fileCount ? `${receipt.fileCount} file${receipt.fileCount === 1 ? "" : "s"}` : receipt.mediaType}</span>
            <small>{receipt.reviewStatus || receipt.status || "Submitted"}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function TechnicalDetails({
  role,
  source,
  error,
  queueId,
  canReview,
  batches
}: {
  role: string;
  source: Parameters<typeof sourceTruthLabel>[0];
  error?: string | null;
  queueId: ReviewQueueId;
  canReview: boolean;
  batches: ReviewUploadBatch[];
}) {
  if (role !== "DAM Admin") return null;
  const rows: Array<[string, string]> = [
    ["Queue", queueId],
    ["Role can review", canReview ? "Yes" : "No"],
    ["Rendered batches", batches.length.toLocaleString()],
    ["Source adapter", source?.adapter || "None"],
    ["Source label", source ? sourceTruthLabel(source) : "None"],
    ["Read-only", source?.readOnly ? "Yes" : "No"],
    ["Source detail", source?.detail || "No source status payload"],
    ["Read error", error || "None"]
  ];
  return (
    <details className="review-technical-details">
      <summary>Admin technical details</summary>
      <dl>
        {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </details>
  );
}

function ReviewShellActions({ actions }: { actions: ReviewShellAction[] }) {
  return (
    <nav className="review-shell-actions" aria-label="Review upload next actions">
      {actions.map((action) => action.href ? (
        <Link className={cn(action.tone === "primary" && "is-primary")} href={action.href} key={action.label}>{action.label}</Link>
      ) : (
        <button className={cn(action.tone === "primary" && "is-primary")} type="button" onClick={action.onClick} key={action.label}>{action.label}</button>
      ))}
    </nav>
  );
}

function ReviewRecoveryPanel({
  title,
  body,
  icon,
  actions
}: {
  title: string;
  body: string;
  icon: ReactNode;
  actions: ReviewShellAction[];
}) {
  return (
    <section className="review-recovery-panel">
      <div className="review-recovery-icon" aria-hidden="true">{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
        <ReviewShellActions actions={actions} />
      </div>
    </section>
  );
}

function ReviewBatchQueue({
  batches,
  selectedBatchId,
  search,
  setSearch,
  onSelect
}: {
  batches: ReviewUploadBatch[];
  selectedBatchId?: string;
  search: string;
  setSearch: (value: string) => void;
  onSelect: (batchId: string) => void;
}) {
  return (
    <aside className="review-batch-queue" aria-label="Upload batches">
      <header>
        <div>
          <h2>Uploads to review</h2>
          <p>{batches.length.toLocaleString()} batch{batches.length === 1 ? "" : "es"}</p>
        </div>
      </header>
      <label>
        <span>Find upload</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search event, uploader, ministry..." />
      </label>
      <div className="review-batch-list">
        {batches.map((batch) => (
          <button className={cn("review-batch-card", selectedBatchId === batch.id && "is-active")} type="button" key={batch.id} onClick={() => onSelect(batch.id)}>
            <span className={cn("review-upload-status", simpleStatusTone(batch.status))}>{displayReviewUploadStatus(batch.status)}</span>
            <strong>{batch.eventName}</strong>
            <small>{batch.reason}</small>
            <dl>
              <div><dt>Uploaded by</dt><dd>{batch.uploadedBy}</dd></div>
              <div><dt>Submitted date</dt><dd>{batch.submittedDate}</dd></div>
              <div><dt>Event date</dt><dd>{batch.eventDate}</dd></div>
              <div><dt>File count</dt><dd>{countMedia(batch)}</dd></div>
              <div><dt>Ministry/group</dt><dd>{batch.ministry}</dd></div>
              <div><dt>People/minors flag</dt><dd>{peopleFlagForBatch(batch)}</dd></div>
            </dl>
            <em>Review batch</em>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ReviewBatchSummary({ batch, selectedMedia }: { batch: ReviewUploadBatch; selectedMedia?: StockMediaAsset }) {
  return (
    <section className="review-batch-summary" aria-label="Selected upload summary">
      <div>
        <span className={cn("review-upload-status", simpleStatusTone(batch.status))}>{displayReviewUploadStatus(batch.status)}</span>
        <h2>{batch.eventName}</h2>
        <p>{batch.reason}</p>
      </div>
      <dl>
        <div><dt>Uploaded by</dt><dd>{batch.uploadedBy}</dd></div>
        <div><dt>Event date</dt><dd>{batch.eventDate}</dd></div>
        <div><dt>Ministry</dt><dd>{batch.ministry}</dd></div>
        <div><dt>Files</dt><dd>{countMedia(batch)}</dd></div>
        <div><dt>Current status</dt><dd>{selectedMedia ? assetEnterpriseStatus(selectedMedia) : "None selected"}</dd></div>
      </dl>
    </section>
  );
}

function NextActionBanner({ message, button, onAction }: { message: string; button: string; onAction: () => void }) {
  return (
    <section className="review-next-action" aria-label="Next review action">
      <Info size={18} aria-hidden="true" />
      <div>
        <strong>{message}</strong>
        <span>One decision at a time. Safety checks still apply.</span>
      </div>
      <button type="button" onClick={onAction}>{button}</button>
    </section>
  );
}

function MediaReviewCanvas({
  batch,
  selectedMedia,
  selectedMediaId,
  onSelectMedia
}: {
  batch: ReviewUploadBatch;
  selectedMedia?: StockMediaAsset;
  selectedMediaId?: string;
  onSelectMedia: (id: string) => void;
}) {
  return (
    <section className="media-review-canvas" aria-label="Media preview">
      <div className="media-review-preview">
        {selectedMedia ? (
          <>
            <AssetThumb asset={selectedMedia} className="media-review-main-image" fit="contain" />
            <span><Lock size={14} aria-hidden="true" />Safe preview only</span>
          </>
        ) : (
          <div className="media-review-empty"><ImageIcon size={28} /><strong>No media selected</strong></div>
        )}
      </div>
      <div className="media-review-thumbs" aria-label="Batch media">
        {batch.items.map((asset, index) => (
          <button className={cn(selectedMediaId === asset.id && "is-active")} type="button" key={asset.id} onClick={() => onSelectMedia(asset.id)}>
            <AssetThumb asset={asset} />
            <span>{index + 1}</span>
          </button>
        ))}
      </div>
      <section className="media-review-fields" aria-label="Simple media details">
        <div><span>Event</span><strong>{batch.eventName}</strong></div>
        <div><span>Date</span><strong>{batch.eventDate}</strong></div>
        <div><span>Ministry</span><strong>{batch.ministry}</strong></div>
        <div><span>People/minors visible</span><strong>{selectedMedia?.peopleRisk || "Not sure"}</strong></div>
        <div><span>Suggested album</span><strong>{selectedMedia?.sourceAlbum || selectedMedia?.collection || "Choose during review"}</strong></div>
        <div><span>Notes</span><strong>{selectedMedia?.rightsNotes || selectedMedia?.usageGuidance || "No reviewer note yet"}</strong></div>
      </section>
    </section>
  );
}

function SimpleChecklist({
  checks,
  onAction
}: {
  checks: SimpleCheck[];
  onAction: (check: SimpleCheck) => void;
}) {
  return (
    <div className="simple-review-checklist">
      {checks.map((check, index) => (
        <article className={cn(check.done && "is-done")} key={check.id}>
          <span>{index + 1}</span>
          <div>
            <strong>{check.label}</strong>
            <p>{check.detail}</p>
          </div>
          <em>{check.done ? "Done" : "Needs attention"}</em>
          <button type="button" onClick={() => onAction(check)}>{check.action}</button>
        </article>
      ))}
    </div>
  );
}

function DecisionButton({
  children,
  disabledReason,
  onClick,
  tone = "secondary"
}: {
  children: ReactNode;
  disabledReason?: string;
  onClick: () => void;
  tone?: "primary" | "danger" | "secondary";
}) {
  return (
    <button className={cn("review-decision-button", tone === "primary" && "is-primary", tone === "danger" && "is-danger")} type="button" disabled={Boolean(disabledReason)} title={disabledReason || undefined} onClick={onClick}>
      {children}
    </button>
  );
}

function ReviewDecisionPanel({
  selectedMedia,
  checks,
  comment,
  setComment,
  reviewerName,
  setReviewerName,
  reviewDate,
  setReviewDate,
  approvalScope,
  setApprovalScope,
  decisionMessage,
  actionReasons,
  onSimpleCheckAction,
  onDecision,
  onReject,
  onSaveDraft,
  onOpenAdvanced
}: {
  selectedMedia?: StockMediaAsset;
  checks: SimpleCheck[];
  comment: string;
  setComment: (value: string) => void;
  reviewerName: string;
  setReviewerName: (value: string) => void;
  reviewDate: string;
  setReviewDate: (value: string) => void;
  approvalScope: UsageScope | "";
  setApprovalScope: (value: UsageScope | "") => void;
  decisionMessage: string;
  actionReasons: Record<string, string>;
  onSimpleCheckAction: (check: SimpleCheck) => void;
  onDecision: (action: ReviewActionBackend, status: EnterpriseStatus, label?: string) => void;
  onReject: () => void;
  onSaveDraft: () => void;
  onOpenAdvanced: () => void;
}) {
  return (
    <aside className="review-decision-panel" aria-label="Decision panel">
      <header>
        <h2>Review decision</h2>
        <p>{selectedMedia ? displayTitle(selectedMedia) : "Select media from this upload."}</p>
      </header>
      <SimpleChecklist checks={checks} onAction={onSimpleCheckAction} />
      <label className="review-note-box">
        <span>Reviewer note</span>
        <textarea id={reviewNoteId} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a note for the contributor or future reviewers..." />
      </label>
      <div className="review-approval-fields">
        <label>
          <span>Reviewer</span>
          <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Reviewer name" />
        </label>
        <label>
          <span>Review date</span>
          <input type="date" value={reviewDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setReviewDate(event.target.value)} />
        </label>
        <label>
          <span>Usage scope</span>
          <select id={usageScopeId} value={approvalScope} onChange={(event) => setApprovalScope(event.target.value as UsageScope | "")}>
            <option value="">Select scope</option>
            {approvalScopes.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
          </select>
        </label>
      </div>
      {decisionMessage ? <p className="review-decision-message">{decisionMessage}</p> : null}
      <nav className="review-decision-actions" aria-label="Batch-level review actions">
        <DecisionButton tone="primary" disabledReason={actionReasons.public} onClick={() => onDecision("Approve Public", "Approved", "Prepare public-use decision")}>Prepare public-use decision</DecisionButton>
        <DecisionButton disabledReason={actionReasons.internal} onClick={() => onDecision("Approve Internal", "Approved", "Prepare internal-use decision")}>Prepare internal-use decision</DecisionButton>
        <DecisionButton tone="danger" disabledReason={actionReasons.restrict} onClick={() => onDecision("Do Not Use", "Restricted", "Keep restricted")}>Keep restricted</DecisionButton>
        <DecisionButton tone="danger" disabledReason={actionReasons.reject} onClick={onReject}>Restrict use</DecisionButton>
        <DecisionButton disabledReason={actionReasons.info} onClick={() => onDecision("Request More Info", "Needs Review", "Request info")}>Request info</DecisionButton>
        <button type="button" onClick={onSaveDraft}>Save draft</button>
      </nav>
      <button className="review-advanced-link" type="button" onClick={onOpenAdvanced}>Open advanced details</button>
    </aside>
  );
}

function AdvancedReviewDetailsDrawer({
  open,
  onClose,
  role,
  source,
  selectedMedia,
  checks,
  missingLabels,
  auditRows
}: {
  open: boolean;
  onClose: () => void;
  role: string;
  source: Parameters<typeof sourceTruthLabel>[0];
  selectedMedia?: StockMediaAsset;
  checks: SimpleCheck[];
  missingLabels: string[];
  auditRows: Array<[string, string]>;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const animationFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusableElements = getDrawerFocusableElements(drawer);
    if (!focusableElements.length) {
      event.preventDefault();
      drawer.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;
    const focusIsInsideDrawer = Boolean(activeElement && drawer.contains(activeElement));

    if (event.shiftKey) {
      if (!focusIsInsideDrawer || activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      return;
    }

    if (!focusIsInsideDrawer || activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  if (!open) return null;
  return (
    <div className="advanced-review-backdrop" role="presentation">
      <aside ref={drawerRef} className="advanced-review-drawer" role="dialog" aria-modal="true" aria-label="Advanced review details" tabIndex={-1} onKeyDown={handleKeyDown}>
        <header>
          <div>
            <span>{role}</span>
            <h2>Advanced details</h2>
            <p>Technical source/import information stays hidden until reviewer or admin opens it.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close advanced details"><X size={18} /></button>
        </header>
        <section>
          <h3>Source/import</h3>
          <dl>
            <div><dt>Source truth</dt><dd>{sourceTruthLabel(source)}</dd></div>
            {sanitizedTechnicalRows(selectedMedia).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>
        <section>
          <h3>Full policy checklist</h3>
          <dl>
            {checks.map((check) => <div key={check.id}><dt>{check.label}</dt><dd>{check.done ? "Done" : check.detail}</dd></div>)}
            {missingLabels.slice(0, 8).map((label) => <div key={label}><dt>Blocked by</dt><dd>{label}</dd></div>)}
          </dl>
        </section>
        <section>
          <h3>Audit/readiness</h3>
          <dl>
            {auditRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>
        <section>
          <h3>Raw metadata summary</h3>
          <p>Private URLs, source/original paths, and checksum values are hidden in portal. Open source system for raw private values.</p>
        </section>
      </aside>
    </div>
  );
}

function EmptyReviewUploads({ actions }: { actions: ReviewShellAction[] }) {
  return (
    <section className="review-uploads-empty">
      <FileText size={32} aria-hidden="true" />
      <h2>No uploads waiting for review</h2>
      <p>New submitted photos and videos will appear here when source records are available for reviewer triage.</p>
      <ReviewShellActions actions={actions} />
    </section>
  );
}

export function EnterpriseReviewPage() {
  const { role, ready } = useDemoRole();
  const searchParams = useSearchParams();
  const [queueId, setQueueId] = useState<ReviewQueueId>(() => normalizeReviewQueueId(searchParams?.get("queue")));
  const review = useReviewQueue(role, queueId);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [batchSearch, setBatchSearch] = useState("");
  const [checklist, setChecklist] = useState<ReviewEvidenceChecklist>(() => initialReviewChecklistForAsset(undefined));
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [approvalScope, setApprovalScope] = useState<UsageScope | "">("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [pendingDecisionById, setPendingDecisionById] = useState<Record<string, PendingReviewDecisionSummary>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [browserReceipts, setBrowserReceipts] = useState<BrowserUploadReceipt[]>([]);

  const canAccessReview = role === "Reviewer" || role === "DAM Admin";
  const rawQueue = review.data?.assets || [];
  const batches = useMemo(() => buildReviewUploadBatches(rawQueue), [rawQueue]);
  const filteredBatches = useMemo(() => {
    const query = batchSearch.trim().toLowerCase();
    if (!query) return batches;
    return batches.filter((batch) => [
      batch.eventName,
      batch.uploadedBy,
      batch.eventDate,
      batch.submittedDate,
      batch.ministry,
      batch.status,
      batch.reason
    ].join(" ").toLowerCase().includes(query));
  }, [batches, batchSearch]);
  const selectedBatch = filteredBatches.find((batch) => batch.id === selectedBatchId) || filteredBatches[0];
  const selectedMedia = selectedBatch?.items.find((asset) => asset.id === selectedMediaId) || selectedBatch?.items[0];
  const selectedPendingWrite = selectedMedia ? review.data?.pendingWrites?.[selectedMedia.id] : undefined;
  const selectedPending = selectedMedia ? pendingDecisionById[selectedMedia.id] || (selectedPendingWrite ? {
    status: "Needs Review" as EnterpriseStatus,
    action: selectedPendingWrite.requestedStatus,
    message: "Review follow-up is already queued. Approval status remains unchanged until completed."
  } : undefined) : undefined;
  const selectedGuidance = buildSelectedReviewGuidance({ asset: selectedMedia, checklist, comment, pending: selectedPending });
  const simpleChecks = buildSimpleChecks(selectedMedia, checklist, approvalScope);
  const actionReasons = {
    public: disabledReasonForAction({ asset: selectedMedia, action: "Approve Public", checklist, note: comment, reviewerName, reviewDate, approvalScope }),
    internal: disabledReasonForAction({ asset: selectedMedia, action: "Approve Internal", checklist, note: comment, reviewerName, reviewDate, approvalScope }),
    info: disabledReasonForAction({ asset: selectedMedia, action: "Request More Info", checklist, note: comment, reviewerName, reviewDate, approvalScope }),
    restrict: disabledReasonForAction({ asset: selectedMedia, action: "Do Not Use", checklist, note: comment, reviewerName, reviewDate, approvalScope }),
    reject: selectedMedia ? (comment.trim().length > 10 ? "" : "Reviewer note missing") : "Select media first."
  };
  const nextAction = nextActionFor(selectedMedia, simpleChecks, actionReasons.public);
  const auditRows: Array<[string, string]> = selectedMedia ? [
    ["Imported", displayDate(selectedMedia.importDate || selectedMedia.capturedDate || selectedMedia.eventDate, "Date not exported")],
    ["Waiting", `${reviewWaitingDays(selectedMedia) || 0} day${reviewWaitingDays(selectedMedia) === 1 ? "" : "s"}`],
    ["Current status", assetEnterpriseStatus(selectedMedia)],
    ["Source record", assetRecordRef(selectedMedia)],
    ["Risk signals", reviewRiskFlags(selectedMedia).slice(0, 4).join(", ")]
  ] : [];
  const reviewSourceState = reviewSourceReadState({ source: review.source, live: review.live, error: review.error, loading: review.loading });
  const sourceUnavailable = reviewSourceState === "error" || reviewSourceState === "disconnected";
  const workbenchState = buildReviewWorkbenchState({
    roleReady: ready,
    accessAllowed: canAccessReview,
    loading: review.loading,
    error: review.error,
    source: review.source,
    live: review.live,
    batchCount: batches.length,
    filteredBatchCount: filteredBatches.length
  });
  const statusCards = reviewStatusCards({
    batches,
    receipts: browserReceipts,
    source: review.source,
    live: review.live,
    error: review.error,
    role,
    accessAllowed: canAccessReview,
    loading: review.loading
  });

  const supportHref = role === "DAM Admin" ? routeWithRole("/governance/integrations", role) : "";
  const nextActions = ({ retry = false, includeUploads = true }: { retry?: boolean; includeUploads?: boolean } = {}) => {
    const actions: ReviewShellAction[] = [];
    if (retry) actions.push({ label: "Retry source check", onClick: review.refresh, tone: "primary" });
    if (supportHref) actions.push({ label: "Open Support Zone", href: supportHref });
    if (browserReceipts.length || role === "Contributor") actions.push({ label: "View My Uploads", href: routeWithRole("/recent-uploads", role) });
    if (includeUploads && role !== "Viewer") actions.push({ label: "Upload Photos", href: routeWithRole("/upload", role) });
    actions.push({ label: "Browse Media", href: routeWithRole("/library", role) });
    return actions;
  };

  useEffect(() => {
    const nextQueue = normalizeReviewQueueId(searchParams?.get("queue"));
    setQueueId(nextQueue);
  }, [searchParams]);

  useEffect(() => {
    setBrowserReceipts(readBrowserReceipts());
  }, []);

  useEffect(() => {
    if (!selectedBatch || selectedBatchId === selectedBatch.id) return;
    setSelectedBatchId(selectedBatch.id);
  }, [selectedBatch, selectedBatchId]);

  useEffect(() => {
    if (!selectedBatch) {
      setSelectedMediaId(null);
      return;
    }
    if (!selectedMediaId || !selectedBatch.items.some((asset) => asset.id === selectedMediaId)) {
      setSelectedMediaId(selectedBatch.items[0]?.id || null);
    }
  }, [selectedBatch, selectedMediaId]);

  useEffect(() => {
    const nextChecklist = initialReviewChecklistForAsset(selectedMedia);
    setChecklist(assetHasSourceEvidence(selectedMedia) ? { ...nextChecklist, sourceConfirmed: true } : nextChecklist);
    setComment("");
    setReviewerName("");
    setReviewDate(new Date().toISOString().slice(0, 10));
    setApprovalScope("");
    setDecisionMessage("");
    setAdvancedOpen(false);
  }, [selectedMedia]);

  if (!ready) {
    return (
      <div className="enterprise-page review-uploads-page">
        <ReviewUploadsHeader cards={statusCards} subtitle="Checking role and review queue access." />
        <ReviewQueueOverview activeQueueId={queueId} sourceUnavailable />
        <LoadingCard label="Loading role..." />
      </div>
    );
  }
  if (!canAccessReview) {
    return (
      <section className="enterprise-page review-uploads-page">
        <ReviewUploadsHeader cards={statusCards} subtitle="Review decisions are restricted to assigned reviewers and DAM Admins." />
        <ReviewQueueOverview activeQueueId={queueId} sourceUnavailable />
        <ReviewRecoveryPanel
          icon={<Lock size={24} />}
          title="Reviewer access needed"
          body="This account can submit or track uploads where allowed, but cannot open reviewer decisions."
          actions={nextActions({ includeUploads: role !== "Viewer" })}
        />
        <BrowserReceiptsPanel receipts={browserReceipts} role={role} />
      </section>
    );
  }
  if (review.loading) {
    return (
      <div className="enterprise-page review-uploads-page">
        <ReviewUploadsHeader cards={statusCards} subtitle="Checking submitted uploads and source status." />
        <ReviewQueueOverview activeQueueId={queueId} sourceUnavailable />
        <LoadingCard label="Loading submitted uploads..." />
        <BrowserReceiptsPanel receipts={browserReceipts} role={role} />
      </div>
    );
  }
  if (review.error) {
    return (
      <div className="enterprise-page review-uploads-page">
        <ReviewUploadsHeader cards={statusCards} subtitle="Uploads can be submitted, but review is paused until source read works." />
        <ReviewQueueOverview activeQueueId={queueId} sourceUnavailable />
        <ReviewRecoveryPanel
          icon={<AlertTriangle size={24} />}
          title="Review queue needs attention"
          body="Review Uploads could not read source records. No approval, publishing, download, or sync outcome is implied."
          actions={nextActions({ retry: true })}
        />
        <BrowserReceiptsPanel receipts={browserReceipts} role={role} />
        <TechnicalDetails role={role} source={review.source} error={review.error} queueId={queueId} canReview={canAccessReview} batches={batches} />
      </div>
    );
  }
  if (workbenchState === "review-paused") {
    return (
      <div className="enterprise-page review-uploads-page">
        <ReviewUploadsHeader cards={statusCards} subtitle="Upload intake is available, but the review source is not connected for this session." />
        <ReviewQueueOverview activeQueueId={queueId} sourceUnavailable />
        <ReviewRecoveryPanel
          icon={<Database size={24} />}
          title="Uploads can be submitted, but review is paused"
          body="Source records are not connected, so reviewer queues cannot be treated as durable review work."
          actions={nextActions({ retry: true })}
        />
        <BrowserReceiptsPanel receipts={browserReceipts} role={role} />
        <TechnicalDetails role={role} source={review.source} error={review.error} queueId={queueId} canReview={canAccessReview} batches={batches} />
      </div>
    );
  }
  if (!batches.length) {
    return (
      <div className="enterprise-page review-uploads-page">
        <ReviewUploadsHeader cards={statusCards} subtitle="No source-backed upload batches are waiting right now." />
        <ReviewQueueOverview queues={review.data?.queues} activeQueueId={queueId} />
        <EmptyReviewUploads actions={nextActions({ retry: true })} />
        <BrowserReceiptsPanel receipts={browserReceipts} role={role} />
        <TechnicalDetails role={role} source={review.source} error={review.error} queueId={queueId} canReview={canAccessReview} batches={batches} />
      </div>
    );
  }
  if (!filteredBatches.length) {
    return (
      <div className="enterprise-page review-uploads-page">
        <ReviewUploadsHeader cards={statusCards} subtitle="Review batches are available; current search has no matches." />
        <ReviewQueueOverview queues={review.data?.queues} activeQueueId={queueId} />
        <ReviewRecoveryPanel
          icon={<FolderOpen size={24} />}
          title="No upload batches match this search"
          body="Clear or change the search to return to available review batches."
          actions={nextActions({ retry: true, includeUploads: false })}
        />
        <BrowserReceiptsPanel receipts={browserReceipts} role={role} />
      </div>
    );
  }

  const focusReviewNote = (message: string) => {
    setDecisionMessage(message);
    window.requestAnimationFrame(() => document.getElementById(reviewNoteId)?.focus());
  };
  const focusUsageScope = (message: string) => {
    setDecisionMessage(message);
    window.requestAnimationFrame(() => document.getElementById(usageScopeId)?.focus());
  };
  const runSimpleCheckAction = (check: SimpleCheck) => {
    if (check.id === "event") {
      if (check.done) setAdvancedOpen(true);
      else if (selectedMedia && assetHasEventName(selectedMedia) && assetHasEventDate(selectedMedia) && comment.trim().length > 10) {
        setChecklist((current) => ({ ...current, sourceConfirmed: true }));
        setDecisionMessage("Source/context proof marked from reviewer note.");
      } else {
        focusReviewNote("Add missing event/source details to the reviewer note or ask the contributor for them.");
      }
      return;
    }
    if (check.id === "rights") {
      if (!assetHasRightsConsentProof(selectedMedia)) {
        focusReviewNote("Rights/consent proof is missing. Add proof when available or ask the contributor for more information.");
        return;
      }
      if (comment.trim().length > 10) {
        setChecklist((current) => ({ ...current, rightsConfirmed: true, attributionConfirmed: true, creditRequirementChecked: true, proofLinkAttached: true }));
        setDecisionMessage("Rights/consent proof marked from reviewer note.");
      } else {
        focusReviewNote("Add rights/consent proof in the reviewer note before marking this done.");
      }
      return;
    }
    if (check.id === "people") {
      setChecklist((current) => ({ ...current, peopleVisibilityConfirmed: true, childrenYouthChecked: true }));
      focusUsageScope("People/minors marked reviewed. Choose usage scope before approval.");
      return;
    }
    if (check.id === "scope") {
      if (approvalScope) {
        setChecklist((current) => ({ ...current, usageScopeSelected: true, sensitiveContextChecked: true, expirationRereviewSet: true, derivativeAvailable: assetHasDownloadCopy(selectedMedia) || current.derivativeAvailable }));
        setDecisionMessage("Usage scope marked for this review.");
      } else {
        focusUsageScope("Choose usage scope before approval.");
      }
    }
  };
  const runNextAction = () => {
    if (nextAction.target === "approve") {
      decide("Approve Public", "Approved", "Prepare decision");
    } else if (nextAction.target === "advanced") {
      setAdvancedOpen(true);
    } else {
      const check = simpleChecks.find((item) => item.id === nextAction.target);
      if (check) runSimpleCheckAction(check);
    }
  };
  const saveDraft = () => {
    if (!selectedMedia) return;
    setPendingDecisionById((current) => ({
      ...current,
      [selectedMedia.id]: {
        status: "Needs Review",
        action: "Draft saved",
        message: "Draft note saved. Source media and review status are unchanged."
      }
    }));
    setDecisionMessage("Draft saved. No approval or media change happened.");
  };
  const rejectWithoutWriteback = () => {
    if (!selectedMedia) return;
    if (actionReasons.reject) {
      setDecisionMessage(`Review blocked. ${actionReasons.reject}.`);
      return;
    }
    const message = "Restricted follow-up prepared for reviewer follow-up. No approval status or media changed.";
    setPendingDecisionById((current) => ({
      ...current,
      [selectedMedia.id]: {
        status: "Needs Review",
        action: "Restrict use",
        message
      }
    }));
    setDecisionMessage(message);
  };
  const decide = (action: ReviewActionBackend, _nextStatus: EnterpriseStatus, label?: string) => {
    if (!selectedMedia) return;
    const disabledReason = disabledReasonForAction({ asset: selectedMedia, action, checklist, note: comment, reviewerName, reviewDate, approvalScope });
    if (disabledReason) {
      setDecisionMessage(`Review blocked. ${disabledReason}.`);
      return;
    }
    const message = `${label || action} prepared for media-team follow-up. No approval status or media changed.`;
    setPendingDecisionById((current) => ({
      ...current,
      [selectedMedia.id]: { status: "Needs Review", message, action: label || action }
    }));
    setDecisionMessage(message);
  };

  return (
    <div className="enterprise-page review-uploads-page">
      <ReviewUploadsHeader cards={statusCards} />
      <ReviewQueueOverview queues={review.data?.queues} activeQueueId={queueId} />
      <div className="review-uploads-workflow">
        <ReviewBatchQueue
          batches={filteredBatches}
          selectedBatchId={selectedBatch?.id}
          search={batchSearch}
          setSearch={setBatchSearch}
          onSelect={(batchId) => {
            setSelectedBatchId(batchId);
            const batch = filteredBatches.find((item) => item.id === batchId);
            setSelectedMediaId(batch?.items[0]?.id || null);
          }}
        />
        <section className="review-upload-detail">
          <NextActionBanner message={nextAction.message} button={nextAction.button} onAction={runNextAction} />
          <ReviewBatchSummary batch={selectedBatch!} selectedMedia={selectedMedia} />
          <MediaReviewCanvas batch={selectedBatch!} selectedMedia={selectedMedia} selectedMediaId={selectedMedia?.id} onSelectMedia={setSelectedMediaId} />
        </section>
        <ReviewDecisionPanel
          selectedMedia={selectedMedia}
          checks={simpleChecks}
          comment={comment}
          setComment={setComment}
          reviewerName={reviewerName}
          setReviewerName={setReviewerName}
          reviewDate={reviewDate}
          setReviewDate={setReviewDate}
          approvalScope={approvalScope}
          setApprovalScope={setApprovalScope}
          decisionMessage={decisionMessage || selectedPending?.message || ""}
          actionReasons={actionReasons}
          onSimpleCheckAction={runSimpleCheckAction}
          onDecision={decide}
          onReject={rejectWithoutWriteback}
          onSaveDraft={saveDraft}
          onOpenAdvanced={() => setAdvancedOpen(true)}
        />
      </div>
      <AdvancedReviewDetailsDrawer
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        role={role}
        source={review.source}
        selectedMedia={selectedMedia}
        checks={simpleChecks}
        missingLabels={selectedGuidance.approveMissingLabels}
        auditRows={auditRows}
      />
    </div>
  );
}
