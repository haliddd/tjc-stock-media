"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, FileText, PackageCheck, Star } from "lucide-react";
import { isRoleSafePreviewSrc } from "@/components/MediaPreview";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetDetail, useDownloadGate, useReviewRequest, type DownloadGateResponse } from "@/components/dam/useDamApi";
import { assetHasRenditionGap, assetMetadataHealth } from "@/lib/asset-governance";
import { assetDetailTabs } from "@/lib/asset-record-workbench";
import { assetRecordRef, assetType, displayTitle, recordIdLabel, sourceTruthLabel } from "@/lib/enterprise-display";
import {
  assetDetailMetadataRows,
  assetKeywordText,
  assetRecordActivityRows,
  assetRecordOverviewRows,
  assetRecordRightsRows,
  type AssetRecordRow,
  type AssetRecordRowTone,
  type MetadataRow
} from "@/lib/enterprise-metadata";
import { betaVisibilityLabel, presentAssetDetailContext, reuseAnswerLabel } from "@/lib/portal-context-presenters";
import { routeWithRole } from "@/lib/role-routes";
import type { DemoRole, MediaSourceStatus, StockMediaAsset } from "@/lib/types";
import { cn } from "@/lib/ui";
import { ActionButton, AdminDiagnosticCard, AssetThumb, ErrorCard, LoadingCard, MetadataGroup, StatusBadge } from "./EnterpriseShared";

const LOW_RES_LONG_EDGE = 1600;
const LOW_RES_SHORT_EDGE = 900;

function parseDimensions(value?: string) {
  const match = value?.match(/(\d{2,5})\D+(\d{2,5})/);
  if (!match) return null;
  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height };
}

function isLowResolution(dimensions: ReturnType<typeof parseDimensions>) {
  if (!dimensions) return false;
  const longEdge = Math.max(dimensions.width, dimensions.height);
  const shortEdge = Math.min(dimensions.width, dimensions.height);
  return longEdge < LOW_RES_LONG_EDGE || shortEdge < LOW_RES_SHORT_EDGE;
}

function roleSafePreviewAsset(asset: StockMediaAsset): StockMediaAsset {
  const imageUrls = asset.imageUrls
    ? {
        small: isRoleSafePreviewSrc(asset.imageUrls.small) ? asset.imageUrls.small : "",
        card: isRoleSafePreviewSrc(asset.imageUrls.card) ? asset.imageUrls.card : "",
        collection: isRoleSafePreviewSrc(asset.imageUrls.collection) ? asset.imageUrls.collection : "",
        detail: isRoleSafePreviewSrc(asset.imageUrls.detail) ? asset.imageUrls.detail : ""
      }
    : undefined;
  return {
    ...asset,
    thumbnail: isRoleSafePreviewSrc(asset.thumbnail) ? asset.thumbnail : "",
    preview: isRoleSafePreviewSrc(asset.preview) ? asset.preview : undefined,
    imageUrls
  };
}

function detailActionCopy(role: string, approved: boolean, reason: string, blocker?: string) {
  if (approved) {
    return {
      heading: "Approved copy available",
      detail: role === "Viewer"
        ? "Gate records usage terms and delivers only approved derivative."
        : "Gate mints one-time ticket, records audit, and keeps originals restricted.",
      primary: "Download approved copy",
      secondary: role === "DAM Admin" ? "Review source policy" : "Request source access"
    };
  }
  const reviewerLabel = role === "DAM Admin" ? "assign reviewer or policy owner" : role === "Reviewer" ? "record reviewer decision" : "ask reviewer to clear evidence";
  return {
    heading: "Download blocked",
    detail: `${reason} Next step: ${reviewerLabel}${blocker ? ` for ${blocker}` : ""}.`,
    primary: role === "Reviewer" || role === "DAM Admin" ? "Open review action" : "Request DAM review",
    secondary: "Why blocked"
  };
}

function formatSyncState(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "None";
}

type WorkflowActionId =
  | "download-approved-copy"
  | "draft-rendition-review"
  | "draft-version-note"
  | "open-activity"
  | "blocked";

type OperationalWorkflowAction = {
  id: WorkflowActionId;
  label: string;
  state: "available" | "blocked" | "local";
  reason: string;
};

type RenditionWorkflowItem = {
  id: string;
  label: string;
  readiness: string;
  tone: AssetRecordRowTone;
  filename?: string;
  allowedRole: string;
  checksum: string;
  sourceRelation: string;
  gate: string;
  auditNote: string;
  action: OperationalWorkflowAction;
};

type VersionWorkflowItem = {
  id: string;
  label: string;
  current: string;
  comparison: string;
  visibleTo: string;
  sourceRelation: string;
  auditNote: string;
  tone: AssetRecordRowTone;
  action: OperationalWorkflowAction;
};

function canSeePrivateAssetRecordFields(role: DemoRole) {
  return role === "DAM Admin";
}

function canSeeOperationalAssetRecordFields(role: DemoRole) {
  return role === "Reviewer" || canSeePrivateAssetRecordFields(role);
}

function safeValue(value: unknown, fallback = "Not provided") {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || fallback;
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function shortChecksum(asset: StockMediaAsset, role: DemoRole) {
  if (!asset.checksumSha256) {
    return role === "DAM Admin" ? "Checksum missing from current export" : "Source check not exported";
  }
  if (!canSeePrivateAssetRecordFields(role)) return "Source check recorded; value hidden";
  return `SHA-256 ${asset.checksumSha256.slice(0, 12)}...`;
}

function sourceRelationLabel(asset: StockMediaAsset, role: DemoRole) {
  const source = asset.sourceSystem || asset.sourcePlatform || "source record";
  const custody = asset.masterCustodyPathStatus ? asset.masterCustodyPathStatus.replace(/-/g, " ") : "custody status not exported";
  if (canSeePrivateAssetRecordFields(role)) return `${source}; ${custody}. Source path stays read-only.`;
  if (canSeeOperationalAssetRecordFields(role)) return `${source}; source custody evidence visible without path disclosure.`;
  return "Derived from governed source record; source internals hidden.";
}

function buildRenditionWorkflowItems(
  asset: StockMediaAsset,
  role: DemoRole,
  approved: boolean,
  primaryBlocker: string
): RenditionWorkflowItem[] {
  const mediaType = asset.mediaType;
  const thumbnailReady = Boolean(asset.thumbnail || asset.imageUrls?.small || asset.imageUrls?.card);
  const approvedCopyReady = Boolean(asset.imageUrls?.download) && (
    asset.downloadPolicy === "approved-copy-allowed" ||
    asset.downloadPolicy === "internal-approved-copy-allowed"
  );
  const sourceRelation = sourceRelationLabel(asset, role);
  const checksum = shortChecksum(asset, role);
  const blockedDownloadReason = approved ? "Approved-copy gate still required." : `Blocked until review clears ${primaryBlocker}.`;
  const draftReviewAction: OperationalWorkflowAction = {
    id: "draft-rendition-review",
    label: canSeeOperationalAssetRecordFields(role) ? "Draft audit note" : "Request review",
    state: "local",
    reason: "Session-only note. No ResourceSpace writeback."
  };

  const rows: RenditionWorkflowItem[] = [
    {
      id: "original-master",
      label: "Original/master",
      readiness: "Restricted source",
      tone: "restricted",
      filename: canSeePrivateAssetRecordFields(role) ? asset.damFilenames?.original || asset.originalFilename : undefined,
      allowedRole: "DAM Admin metadata view only",
      checksum,
      sourceRelation,
      gate: "Request-only outside this prototype",
      auditNote: "Original is never included in approved-copy delivery or local package output.",
      action: {
        id: "blocked",
        label: "Download original disabled",
        state: "blocked",
        reason: "Source immutability: original/master delivery is not exposed here."
      }
    },
    {
      id: "thumb-preview",
      label: "Thumbnail preview",
      readiness: thumbnailReady ? "Ready" : "Missing derivative",
      tone: thumbnailReady ? "ready" : "review",
      filename: asset.damFilenames?.thumb,
      allowedRole: "All roles preview",
      checksum,
      sourceRelation: "Browse derivative only; not proof of reuse permission.",
      gate: thumbnailReady ? "Role-safe preview route" : "Reviewer/rendition work needed",
      auditNote: thumbnailReady ? "Preview availability recorded separately from rights approval." : "Missing thumbnail should stay review-visible.",
      action: thumbnailReady
        ? {
            id: "open-activity",
            label: "View audit trail",
            state: "local",
            reason: "Opens local activity history."
          }
        : draftReviewAction
    },
    {
      id: "approved-web-copy",
      label: "Approved web copy",
      readiness: approvedCopyReady ? approved ? "Ready behind gate" : "Generated but blocked" : "Not generated",
      tone: approvedCopyReady ? approved ? "pending" : "blocked" : "review",
      filename: asset.damFilenames?.web,
      allowedRole: approved ? "Approved-copy gate" : "Reviewer clearance required",
      checksum,
      sourceRelation: canSeePrivateAssetRecordFields(role)
        ? "Derivative must stay traceable to source record and checksum evidence."
        : "Derivative must stay traceable to source record and file-check evidence.",
      gate: approvedCopyReady ? blockedDownloadReason : "Approved derivative missing",
      auditNote: "Download action mints approved-copy ticket only when review gates pass.",
      action: approvedCopyReady && approved
        ? {
            id: "download-approved-copy",
            label: "Run approved-copy gate",
            state: "available",
            reason: "Creates audited ticket; no original included."
          }
        : {
            id: "blocked",
            label: approvedCopyReady ? "Download blocked" : "Generate copy disabled",
            state: "blocked",
            reason: approvedCopyReady ? blockedDownloadReason : "Prototype does not generate derivatives or mutate source media."
          }
    },
    {
      id: "social-crop",
      label: "Social crop",
      readiness: mediaType === "photo" || mediaType === "graphic" ? safeValue(asset.damFilenames?.social, "Reserved slot") : "Placeholder",
      tone: asset.damFilenames?.social ? "info" : "review",
      filename: asset.damFilenames?.social,
      allowedRole: "Reviewer/DAM Admin decision",
      checksum,
      sourceRelation: "Channel derivative must inherit rights scope and approved channels.",
      gate: asset.approvedChannels?.includes("social") ? "Social channel listed" : "Channel review needed",
      auditNote: "Filename reservation does not create an approved social asset.",
      action: draftReviewAction
    },
    {
      id: "print-copy",
      label: "Print copy",
      readiness: mediaType === "photo" || mediaType === "graphic" || mediaType === "document" ? safeValue(asset.damFilenames?.print, "Request") : "Placeholder",
      tone: asset.damFilenames?.print ? "info" : "review",
      filename: asset.damFilenames?.print,
      allowedRole: "Reviewer/DAM Admin decision",
      checksum,
      sourceRelation: "Print derivative remains separate from master/original.",
      gate: asset.approvedChannels?.includes("print") ? "Print channel listed" : "Reviewer approval required",
      auditNote: "Print handoff stays blocked until scope and reviewer evidence match.",
      action: draftReviewAction
    }
  ];

  if (mediaType === "video" || mediaType === "audio") {
    rows.push({
      id: "av-transcode",
      label: mediaType === "video" ? "Video transcode" : "Audio derivative",
      readiness: "Future workflow",
      tone: "pending",
      allowedRole: "Reviewer/DAM Admin decision",
      checksum,
      sourceRelation,
      gate: "No live transcode/writeback",
      auditNote: "Preview, captions/waveform, and approved copy are modeled only.",
      action: draftReviewAction
    });
  }

  return rows;
}

function buildVersionWorkflowItems(asset: StockMediaAsset, role: DemoRole, source?: MediaSourceStatus | null): VersionWorkflowItem[] {
  const canSeePrivate = canSeePrivateAssetRecordFields(role);
  const canSeeOperational = canSeeOperationalAssetRecordFields(role);
  const refLabel = recordIdLabel(source);
  const sourceFile = canSeePrivate ? safeValue(asset.originalFilename) : "Restricted";
  const checksum = shortChecksum(asset, role);
  const versionLabel = safeValue(asset.versionOrEdition, "No edition recorded");
  const duplicateDetail = [asset.duplicateRole, asset.duplicateGroup, asset.duplicateSimilarityHint].filter(Boolean).join(" / ");
  const approvedCopyDisplay = asset.damFilenames?.web || (asset.imageUrls?.download ? "Available through approved-copy gate" : "");
  const pendingSync = asset.pendingReviewWrite
    ? `${asset.pendingReviewWrite.syncState.replace(/_/g, " ")}${asset.pendingReviewWrite.id && canSeeOperational ? ` (${asset.pendingReviewWrite.id})` : ""}`
    : "None";
  const localVersionAction: OperationalWorkflowAction = {
    id: "draft-version-note",
    label: canSeeOperational ? "Draft version note" : "Request review",
    state: "local",
    reason: "Session-only note. No ResourceSpace writeback."
  };

  return [
    {
      id: "record-version",
      label: "Current record",
      current: `${assetRecordRef(asset)} / ${versionLabel}`,
      comparison: `${refLabel}; generated filenames describe derivatives only.`,
      visibleTo: "All roles",
      sourceRelation: sourceRelationLabel(asset, role),
      auditNote: "Record comparison is metadata-only in this local prototype.",
      tone: "info",
      action: {
        id: "open-activity",
        label: "View activity",
        state: "local",
        reason: "Opens local lifecycle and gate events."
      }
    },
    {
      id: "source-vs-approved",
      label: "Source vs approved copy",
      current: `Source: ${sourceFile}`,
      comparison: `Approved copy: ${safeValue(approvedCopyDisplay, "Not generated")}`,
      visibleTo: canSeePrivate ? "DAM Admin" : "Restricted",
      sourceRelation: checksum,
      auditNote: "Compare never exposes private path or original download to non-admin roles.",
      tone: asset.damFilenames?.web || asset.imageUrls?.download ? "ready" : "review",
      action: {
        id: "blocked",
        label: "Replace source disabled",
        state: "blocked",
        reason: "Source media mutation and replacement are outside local prototype scope."
      }
    },
    {
      id: "duplicate-canonical",
      label: "Duplicate/canonical",
      current: canSeePrivate ? safeValue(duplicateDetail, "No duplicate role recorded") : asset.duplicateGroup || asset.duplicateRole ? "Duplicate evidence recorded" : "No duplicate role recorded",
      comparison: canSeePrivate ? "Admin can see cleanup metadata; album membership must be preserved." : "Cleanup metadata hidden from non-admin roles.",
      visibleTo: canSeePrivate ? "DAM Admin" : "Restricted summary",
      sourceRelation: canSeePrivate ? safeValue(asset.sourceAlbumMemberships, "Album membership not exported") : "Membership details hidden.",
      auditNote: "Duplicate linking may preserve every source album membership; no source files moved.",
      tone: duplicateDetail ? "pending" : "info",
      action: localVersionAction
    },
    {
      id: "pending-replacement",
      label: "Pending replacement/sync",
      current: pendingSync,
      comparison: asset.pendingReviewWrite ? "Review queue item visible; live sync remains disabled." : "No replacement request is queued in this role-safe record.",
      visibleTo: canSeeOperational ? "Reviewer/DAM Admin" : "Summary only",
      sourceRelation: "ResourceSpace writeback not enabled from asset detail.",
      auditNote: "Replacement, version upload, and live writeback actions fail closed here.",
      tone: asset.pendingReviewWrite ? "pending" : "info",
      action: localVersionAction
    }
  ];
}

function workflowActionDisabled(action: OperationalWorkflowAction) {
  return action.state === "blocked";
}

function WorkflowActionButton({
  action,
  onAction
}: {
  action: OperationalWorkflowAction;
  onAction: (action: OperationalWorkflowAction) => void;
}) {
  return (
    <button
      className={cn("ed-workflow-action", action.state === "blocked" && "is-blocked")}
      type="button"
      onClick={() => onAction(action)}
      disabled={workflowActionDisabled(action)}
      title={action.reason}
    >
      {action.label}
    </button>
  );
}

function RenditionWorkflowPanel({
  items,
  onAction
}: {
  items: RenditionWorkflowItem[];
  onAction: (action: OperationalWorkflowAction) => void;
}) {
  return (
    <div className="ed-workflow-table-wrap">
      <table className="ed-workflow-table" aria-label="Rendition operational workflow">
        <thead>
          <tr>
            <th>Rendition</th>
            <th>Status</th>
            <th>Allowed role/action</th>
            <th>Reason</th>
            <th>Safe request action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className={cn(`is-${item.tone}`)} key={item.id}>
              <td>
                <strong>{item.label}</strong>
                {item.filename ? <code>{item.filename}</code> : null}
              </td>
              <td>
                <span>{item.readiness}</span>
                <small>{item.checksum}</small>
              </td>
              <td>{item.allowedRole}</td>
              <td>
                {item.gate}
                <small>{item.auditNote}</small>
              </td>
              <td><WorkflowActionButton action={item.action} onAction={onAction} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VersionWorkflowPanel({
  items,
  onAction
}: {
  items: VersionWorkflowItem[];
  onAction: (action: OperationalWorkflowAction) => void;
}) {
  return (
    <div className="ed-workflow-table-wrap">
      <table className="ed-workflow-table" aria-label="Version comparison workflow">
        <thead>
          <tr>
            <th>Version field</th>
            <th>Current display</th>
            <th>Visible to</th>
            <th>Comparison/reason</th>
            <th>Local action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className={cn(`is-${item.tone}`)} key={item.id}>
              <td><strong>{item.label}</strong></td>
              <td>
                <span>{item.current}</span>
                <small>{item.sourceRelation}</small>
              </td>
              <td>{item.visibleTo}</td>
              <td>
                {item.comparison}
                <small>{item.auditNote}</small>
              </td>
              <td><WorkflowActionButton action={item.action} onAction={onAction} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetadataRows({ rows }: { rows: MetadataRow[] }) {
  return (
    <dl className="ed-metadata is-two ed-record-metadata">
      {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

function RecordRowGrid({ rows, labelledBy }: { rows: AssetRecordRow[]; labelledBy?: string }) {
  return (
    <div className="ed-record-row-grid" aria-labelledby={labelledBy}>
      {rows.map((row) => (
        <article className={cn("ed-record-row", row.tone && `is-${row.tone}`)} key={row.id}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
          {row.filename ? <code>{row.filename}</code> : null}
          {row.detail ? <small>{row.detail}</small> : null}
        </article>
      ))}
    </div>
  );
}

function ActivityTimeline({ rows }: { rows: AssetRecordRow[] }) {
  return (
    <div className="ed-record-activity" aria-label="Asset record activity">
      {rows.map((row) => (
        <article className={cn("ed-record-event", row.tone && `is-${row.tone}`)} key={row.id}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
          {row.detail ? <small>{row.detail}</small> : null}
        </article>
      ))}
    </div>
  );
}

function downloadGateRows(result: DownloadGateResponse | null, message: string): AssetRecordRow[] {
  if (!result) {
    return [{
      id: "download-gate-session",
      label: "Download gate",
      value: "No request this session",
      detail: "Approved-copy delivery remains ticket-gated.",
      tone: "info"
    }];
  }
  return [
    {
      id: "download-gate-session",
      label: "Download gate",
      value: result.allowed ? "Allowed" : "Blocked",
      detail: message || result.message || result.reason || "Gate response recorded.",
      tone: result.allowed ? "ready" : "blocked"
    },
    {
      id: "download-gate-audit",
      label: "Audit",
      value: result.auditId || "Not recorded",
      detail: result.reasonCode || result.reasonCodes?.join(", ") || "No reason code returned.",
      tone: result.auditId ? "info" : "review"
    },
    {
      id: "download-gate-ticket",
      label: "Ticket",
      value: result.ticketExpiresAt ? `Expires ${result.ticketExpiresAt}` : result.ticketId || "Not issued",
      detail: "Ticket secret and delivery URL are not displayed in record UI.",
      tone: result.ticketExpiresAt || result.ticketId ? "pending" : "restricted"
    }
  ];
}

function deliveryManifestRows(result: DownloadGateResponse | null): AssetRecordRow[] {
  return (result?.deliveryManifest?.items || []).map((item) => ({
    id: `manifest-${item.id}`,
    label: item.label,
    value: item.status,
    detail: item.detail || item.routeBoundary || "Delivery manifest item",
    tone: item.status === "ready" ? "ready" : item.status === "request-only" ? "restricted" : "review"
  }));
}

function RelatedPanel({ assets, role }: { assets: StockMediaAsset[]; role: DemoRole }) {
  if (!assets.length) return <p className="ed-empty-copy">No related media records found.</p>;
  return (
    <div className="ed-record-related-grid">
      {assets.slice(0, 8).map((item) => (
        <Link href={routeWithRole(`/assets/${encodeURIComponent(item.id)}`, role)} key={item.id} className="ed-record-related-item">
          <AssetThumb asset={item} />
          <strong>{displayTitle(item)}</strong>
          <small>{assetRecordRef(item)} / {assetType(item)}</small>
        </Link>
      ))}
    </div>
  );
}

export function EnterpriseAssetDetailPage({ id }: { id: string }) {
  const { role } = useDemoRole();
  const detail = useAssetDetail(id, role);
  const downloadGate = useDownloadGate(id, role);
  const reviewRequest = useReviewRequest(id, role);
  const [tab, setTab] = useState(assetDetailTabs[0]);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [lastDownloadResult, setLastDownloadResult] = useState<DownloadGateResponse | null>(null);
  const [assetActionMessage, setAssetActionMessage] = useState("");
  const [assetActionPending, setAssetActionPending] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const asset = detail.data?.asset;
  const related = detail.data?.related || [];
  if (detail.loading) return <div className="enterprise-page"><LoadingCard label="Loading media asset record..." /></div>;
  if (detail.error || !asset) return <div className="enterprise-page"><ErrorCard message={detail.error || "Asset not found."} source={detail.source} /></div>;

  const presentation = presentAssetDetailContext(asset, role, detail.source);
  const reusePacket = presentation.packet;
  const approved = presentation.approved;
  const canViewReviewerNotes = role === "Reviewer" || role === "DAM Admin";
  const parsedDimensions = parseDimensions(asset.imageDimensions);
  const lowResolutionPreview = asset.mediaType === "photo" && isLowResolution(parsedDimensions);
  const limitedDerivative = assetHasRenditionGap(asset);
  const derivativeStatus = !asset.thumbnail
    ? "Preview unavailable"
    : limitedDerivative
      ? "Derivative limited"
      : lowResolutionPreview
        ? "Low-res derivative"
        : approved
          ? "Reuse-approved derivative"
          : "Role-safe derivative";
  const metadataRows = assetDetailMetadataRows(asset, role);
  const overviewRows = assetRecordOverviewRows(asset, role, detail.source);
  const rightsRows = assetRecordRightsRows(asset, role);
  const metadataHealth = assetMetadataHealth(asset);
  const approvedChannels = asset.approvedChannels?.length ? asset.approvedChannels.join(", ") : "No approved channel recorded";
  const primaryBlocker = reusePacket.reuse.blockers[0]?.label || "review evidence";
  const actionCopy = detailActionCopy(role, approved, reusePacket.viewerVerdict.reason, primaryBlocker);
  const safePreviewAsset = roleSafePreviewAsset(asset);
  const evidenceRows: AssetRecordRow[] = [
    { id: "evidence-source", label: "Source", value: reusePacket.metadataConfidence.source, detail: "Custody/provenance evidence", tone: reusePacket.metadataConfidence.source === "verified" ? "ready" : "review" },
    { id: "evidence-rights", label: "Rights", value: reusePacket.metadataConfidence.rights, detail: "Rights, consent, and approved channel", tone: reusePacket.metadataConfidence.rights === "approved" ? "ready" : "review" },
    { id: "evidence-people", label: "People/minors", value: reusePacket.metadataConfidence.peopleMinors, detail: "Visibility and consent posture", tone: reusePacket.metadataConfidence.peopleMinors === "reviewed" ? "ready" : "review" },
    { id: "evidence-review", label: "Review", value: reusePacket.metadataConfidence.review, detail: "Reviewer/date evidence", tone: reusePacket.metadataConfidence.review === "complete" ? "ready" : "review" }
  ];
  const blockerRows: AssetRecordRow[] = reusePacket.reuse.blockers.length
    ? reusePacket.reuse.blockers.map((blocker) => ({ id: `blocker-${blocker.code}`, label: blocker.label, value: "Blocks reuse", detail: blocker.code, tone: "blocked" }))
    : [{ id: "blocker-none", label: "Blockers", value: "None active", detail: "Current role-safe reuse packet has no active blocker.", tone: "ready" }];
  const suggestedTagValues = [
    ...(asset.suggestedTags || []),
    ...(asset.aiVisibleTagSuggestions || []),
    ...(asset.aiTjcTermSuggestions || [])
  ];
  const activityRows = [
    ...assetRecordActivityRows(asset, role),
    ...downloadGateRows(lastDownloadResult, downloadMessage)
  ];
  const manifestRows = deliveryManifestRows(lastDownloadResult);
  const actionMessage = assetActionMessage || downloadMessage;
  const canOpenResourceSpace = reusePacket.access.viewResourceSpaceAdminLink.allowed;

  const requestReview = async () => {
    if (assetActionPending) return;
    setAssetActionPending(true);
    setAssetActionMessage("");
    const result = await reviewRequest.requestReview({
      notes: `DAM review requested from Asset Detail for ${displayTitle(asset)}. Reason: ${asset.reuseDecision?.summary || reusePacket.viewerVerdict.reason || "Usage decision requires reviewer confirmation."}`
    });
    setAssetActionPending(false);
    if (!result.ok) {
      setAssetActionMessage(`Review request failed: ${result.error || "Reviewer queue did not accept this request."}`);
      return;
    }
    const queueReference = result.pendingWriteId || result.pendingWrite?.id;
    setAssetActionMessage(`${result.message || "Review request queued for reviewer follow-up."}${queueReference && canViewReviewerNotes ? ` Queue id: ${queueReference}.` : ""}`);
    detail.refresh();
  };

  const requestApprovedDownload = async () => {
    const result = await downloadGate.requestDownload({ termsAccepted: true, usageChannel: "portal", reason: `Asset detail approved-copy request for ${displayTitle(asset)}` });
    setLastDownloadResult(result);
    setDownloadMessage(result.allowed
      ? `Download gate allowed. Audit ${result.auditId || "recorded"}${result.ticketExpiresAt ? `. Ticket expires ${result.ticketExpiresAt}` : ""}.`
      : `Approved-copy gate blocked delivery: ${result.reason || result.requiredAction || "Not allowed"}. Next step: ${result.requiredAction || "request DAM review"}.`);
    if (result.allowed && result.downloadUrl) window.location.href = result.downloadUrl;
  };

  const renditionWorkflowItems = buildRenditionWorkflowItems(asset, role, approved, primaryBlocker);
  const versionWorkflowItems = buildVersionWorkflowItems(asset, role, detail.source);

  const handleWorkflowAction = (action: OperationalWorkflowAction) => {
    if (action.id === "download-approved-copy") {
      void requestApprovedDownload();
      return;
    }
    if (action.id === "open-activity") {
      setTab("Activity");
      setAssetActionMessage(action.reason);
      return;
    }
    if (action.id === "draft-rendition-review") {
      if (canSeeOperationalAssetRecordFields(role)) {
        setAssetActionMessage(`Local audit note drafted: ${action.reason}`);
        return;
      }
      void requestReview();
      return;
    }
    if (action.id === "draft-version-note") {
      setAssetActionMessage(`Local version note drafted: ${action.reason} Version writes remain disabled.`);
    }
  };

  return (
    <div className="enterprise-page enterprise-detail">
      <div className="ed-detail-layout">
        <main>
          <header className="ed-detail-header ed-record-header">
            <div className="ed-detail-title-block">
              <nav className="ed-breadcrumb" aria-label="Breadcrumb">
                <Link href={routeWithRole("/", role)}>Library</Link>
                <span aria-hidden="true">/</span>
                <span>Asset record</span>
              </nav>
              <div className="ed-record-title-row">
                <h1 title={displayTitle(asset)}>{displayTitle(asset)}</h1>
                <StatusBadge status={presentation.status} />
              </div>
              <p className="ed-asset-summary-line ed-record-ref-line">
                <span>Ref {assetRecordRef(asset)}</span>
                <span>{assetType(asset)}</span>
                <span>{asset.collection || "Unassigned collection"}</span>
              </p>
            </div>
            <div className="ed-detail-actions ed-record-actions">
              <ActionButton tone="primary" icon={approved ? Download : FileText} onClick={approved ? requestApprovedDownload : requestReview} disabled={assetActionPending}>
                {assetActionPending && !approved ? "Queueing review..." : actionCopy.primary}
              </ActionButton>
              <div className="ed-action-menu-wrap">
                <ActionButton ariaLabel="Open asset record tools" onClick={() => setActionsOpen((open) => !open)}><ChevronDown size={14} />Tools</ActionButton>
                {actionsOpen ? (
                  <div className="ed-more-actions-menu ed-detail-actions-menu" role="menu">
                    {approved ? <button type="button" role="menuitem" onClick={() => { void requestApprovedDownload(); setActionsOpen(false); }}><Download size={15} />Download approved copy<span>Runs approved-copy ticket gate and audit.</span></button> : null}
                    <button type="button" role="menuitem" onClick={() => { setAssetActionMessage("Favorite saved for this session."); setActionsOpen(false); }}><Star size={15} />Favorite<span>Save this record locally for this session.</span></button>
                    <button type="button" role="menuitem" onClick={() => { setTab("Activity"); setActionsOpen(false); }}><FileText size={15} />View activity<span>Open review, lifecycle, and gate events.</span></button>
                    <button type="button" role="menuitem" onClick={() => { setAssetActionMessage("Use Distribution Sets to add governed references without copying source files."); setActionsOpen(false); }}><PackageCheck size={15} />Add to distribution set<span>Collect reference without moving source files.</span></button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <section className={cn("ed-detail-preview-workbench", lowResolutionPreview && "is-low-resolution", limitedDerivative && "has-limited-derivative")} aria-label="Role-safe media preview">
            <div className="ed-hero-preview">
              <AssetThumb asset={safePreviewAsset} fit="contain" className="ed-detail-preview-media" />
              <div className="ed-preview-caption" aria-label="Preview derivative facts">
                <span>Preview only</span>
                <span>{derivativeStatus} / {asset.imageDimensions || "Dimensions not provided"}</span>
              </div>
            </div>
          </section>

          {actionMessage ? <p className="ed-inline-success ed-record-session-message">{actionMessage}</p> : null}

          <nav className="ed-tabs is-large" aria-label="Asset record tabs">{assetDetailTabs.map((item) => <button className={cn(tab === item && "is-active")} type="button" key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
          <section className="ed-card ed-metadata-card ed-record-tab-panel">
            {tab === "Overview" ? (
              <>
                <header className="ed-record-panel-head">
                  <div>
                    <h2>Record overview</h2>
                    <p>{actionCopy.heading}. {actionCopy.detail}</p>
                  </div>
                  <ActionButton icon={approved ? Download : FileText} onClick={approved ? requestApprovedDownload : requestReview} disabled={assetActionPending}>
                    {assetActionPending && !approved ? "Queueing review..." : actionCopy.primary}
                  </ActionButton>
                </header>
                <div className="ed-record-answer-grid" aria-label="Current asset use state">
                  <span><small>Use state</small><strong>{reuseAnswerLabel(reusePacket.reuse.state)}</strong></span>
                  <span><small>Visibility</small><strong>{betaVisibilityLabel(asset)}</strong></span>
                  <span><small>Source/original</small><strong>{reusePacket.access.downloadOriginal.label || "Restricted"}</strong></span>
                  <span><small>Primary blocker</small><strong>{reusePacket.reuse.blockers[0]?.label || "None active"}</strong></span>
                </div>
                <MetadataRows rows={overviewRows} />
              </>
            ) : null}

            {tab === "Metadata" ? (
              <>
                <header className="ed-record-panel-head">
                  <div>
                    <h2>Metadata</h2>
                    <p>Display metadata, discovery terms, generated derivative names.</p>
                  </div>
                </header>
                <MetadataRows rows={metadataRows} />
                <div className="ed-record-keywords">
                  <strong>Keywords</strong>
                  <div className="ed-chip-row">
                    {assetKeywordText(asset) !== "Not provided" ? [...(asset.tags || []), ...(asset.tjcTerms || [])].map((keyword) => <span key={keyword}>{keyword}</span>) : <p>Not provided in current data source.</p>}
                  </div>
                  {suggestedTagValues.length ? <small>Suggested only: {suggestedTagValues.join(", ")}</small> : null}
                </div>
              </>
            ) : null}

            {tab === "Rights" ? (
              <>
                <header className="ed-record-panel-head">
                  <div>
                    <h2>Rights</h2>
                    <p>Rights, consent, people/minors, reviewer evidence, and blockers.</p>
                  </div>
                </header>
                <MetadataRows rows={rightsRows} />
                <RecordRowGrid rows={evidenceRows} />
                <RecordRowGrid rows={blockerRows} />
              </>
            ) : null}

            {tab === "Renditions" ? (
              <>
                <header className="ed-record-panel-head">
                  <div>
                    <h2>Renditions</h2>
                    <p>Original restricted. Derivatives list readiness, role/action, reason, and safe request path only.</p>
                  </div>
                </header>
                <RenditionWorkflowPanel items={renditionWorkflowItems} onAction={handleWorkflowAction} />
                {manifestRows.length ? (
                  <>
                    <h3 className="ed-record-subhead">Last delivery manifest</h3>
                    <RecordRowGrid rows={manifestRows} />
                  </>
                ) : null}
              </>
            ) : null}

            {tab === "Versions" ? (
              <>
                <header className="ed-record-panel-head">
                  <div>
                    <h2>Versions</h2>
                    <p>Generated filenames, duplicate metadata when allowed, and pending replacement/sync. Local display only; no live version writes.</p>
                  </div>
                </header>
                <VersionWorkflowPanel items={versionWorkflowItems} onAction={handleWorkflowAction} />
              </>
            ) : null}

            {tab === "Activity" ? (
              <>
                <header className="ed-record-panel-head">
                  <div>
                    <h2>Activity</h2>
                    <p>Review, rights, lifecycle, and download-gate events visible to this role.</p>
                  </div>
                </header>
                <ActivityTimeline rows={activityRows} />
              </>
            ) : null}

            {tab === "Related" ? (
              <>
                <header className="ed-record-panel-head">
                  <div>
                    <h2>Related</h2>
                    <p>{related.length} related record{related.length === 1 ? "" : "s"}.</p>
                  </div>
                </header>
                <RelatedPanel assets={related} role={role} />
              </>
            ) : null}
          </section>
        </main>

        <aside className="ed-detail-rail ed-record-rail">
          <MetadataGroup title="Use state" rows={[
            ["State", reuseAnswerLabel(reusePacket.reuse.state)],
            ["Visibility", betaVisibilityLabel(asset)],
            ["Download gate", approved ? "Approved-copy gate available" : reusePacket.viewerVerdict.reason],
            ["Source/original", reusePacket.access.downloadOriginal.label || "Restricted"]
          ]} />
          <MetadataGroup title="Rights" rows={[
            ["Usage scope", asset.usageScope],
            ["Rights", asset.rightsStatus || "Not provided"],
            ["Consent", asset.consentStatus || "Not provided"],
            ["People/minors", asset.peopleRisk || "Unknown"],
            ["Approved channels", approvedChannels]
          ]} />
          <MetadataGroup title="Collections" rows={[
            ["Collection", asset.collection],
            ["Event", asset.eventName || asset.eventSeries],
            ["Record source", sourceTruthLabel(detail.source)],
            ["Type", assetType(asset)]
          ]} />
          <MetadataGroup title="Reviewer/date" rows={[
            ["Reviewer", canViewReviewerNotes ? asset.reviewer || "Not provided" : asset.reviewer ? "Recorded" : "Not provided"],
            ["Review date", canViewReviewerNotes ? asset.reviewedDate || "Not provided" : asset.reviewedDate ? "Recorded" : "Not provided"],
            ["Notes", canViewReviewerNotes ? asset.rightsNotes || "No reviewer note exported" : "Restricted to reviewer roles"]
          ]} />
          <MetadataGroup title="Lifecycle/recheck" rows={[
            ["Recheck", asset.approvalRecheckDate || asset.expirationOrRecheckDate || "Not scheduled"],
            ["Rights expiration", asset.rightsExpirationDate || "Not provided"],
            ["Consent expiration", asset.consentExpirationDate || "Not provided"],
            ["Withdrawal", asset.withdrawalStatus || "Active"],
            ["Pending sync", formatSyncState(asset.pendingReviewWrite?.syncState)]
          ]} />
          <MetadataGroup title="Metadata completeness" rows={[
            ["State", metadataHealth.state],
            ["Score", `${metadataHealth.score}%`],
            ["Gaps", metadataHealth.missing.length ? metadataHealth.missing.join(", ") : "None in current role-safe view"]
          ]} />
          <AdminDiagnosticCard role={role} rows={[
            ["Source mode", detail.source?.label || "Not loaded"],
            ["Live source", detail.live ? "Yes" : "No"],
            ["Record source", detail.source?.adapter || "unknown"],
            ["ResourceSpace admin link", canOpenResourceSpace && detail.data?.resourceSpaceUrl ? "Available" : "Unavailable"],
            ["Pending write", formatSyncState(asset.pendingReviewWrite?.syncState)]
          ]} />
        </aside>
      </div>
    </div>
  );
}
