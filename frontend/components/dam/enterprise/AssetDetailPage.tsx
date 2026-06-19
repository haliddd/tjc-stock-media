"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Download, FileText, Inbox, Star } from "lucide-react";
import { isRoleSafePreviewSrc } from "@/components/MediaPreview";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetDetail, useDownloadGate, useReviewRequest, type DownloadGateResponse } from "@/components/dam/useDamApi";
import { assetCanInspectSourceRecord, assetHasRenditionGap, assetMetadataHealth, assetSourceChecksum, assetSourceRecordTruthRows, type AssetSourceRecordTruthRow } from "@/lib/asset-governance";
import { assetDetailTabs } from "@/lib/asset-record-workbench";
import { assetDate, assetRecordRef, assetType, displayTitle, recordIdLabel, sourceTruthLabel } from "@/lib/enterprise-display";
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
  const canSeeOperationalCopy = role === "Reviewer" || role === "DAM Admin";
  if (approved) {
    return {
      heading: canSeeOperationalCopy ? "Approved copy available" : "Use request available",
      detail: canSeeOperationalCopy
        ? "Gate mints one-time ticket, records audit, and keeps originals restricted."
        : "Usage terms are checked before any use copy is provided.",
      primary: canSeeOperationalCopy ? "Request approved copy" : "Request use copy",
      secondary: role === "DAM Admin" ? "Review source policy" : canSeeOperationalCopy ? "Ask about full file" : "Ask media team"
    };
  }
  const reviewerLabel = role === "DAM Admin" ? "assign reviewer or policy owner" : role === "Reviewer" ? "record reviewer decision" : "ask reviewer to clear evidence";
  return {
    heading: canSeeOperationalCopy ? "Download blocked" : "Use not cleared",
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
  return assetCanInspectSourceRecord(role);
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
  const checksum = assetSourceChecksum(asset);
  if (!checksum) {
    return assetCanInspectSourceRecord(role) ? "Checksum missing from current import" : "File check not recorded";
  }
  if (!canSeePrivateAssetRecordFields(role)) return "File check recorded; value hidden";
  return `SHA-256 ${checksum.slice(0, 12)}...`;
}

function sourceRelationLabel(asset: StockMediaAsset, role: DemoRole) {
  const source = asset.sourceSystem || asset.sourcePlatform || "source record";
  const custody = asset.masterCustodyPathStatus ? asset.masterCustodyPathStatus.replace(/-/g, " ") : "custody status not exported";
  if (canSeePrivateAssetRecordFields(role)) return `${source}; ${custody}. Source path stays read-only.`;
  if (canSeeOperationalAssetRecordFields(role)) return `${source}; source custody evidence visible without path disclosure.`;
  return "Original file protected; use copy shown when cleared.";
}

const reviewerAdminOnlySourceLabels = new Set([
  "Source record ID",
  "Last source check",
  "Source album",
  "Source path",
  "Checksum"
]);

const redactedMissingSourceValues = new Set(["Missing bridge field", "Not provided"]);
const adminOnlySourceValue = "Restricted to DAM admin";
const adminOnlySourceDetail = "Admin-only source/custody evidence hidden for this role.";

function assetSourceRecordRowsForRole(asset: StockMediaAsset, role: DemoRole): AssetSourceRecordTruthRow[] {
  const rows = assetSourceRecordTruthRows(asset, { privateCustodyRestricted: role !== "DAM Admin" });
  if (role === "DAM Admin") return rows;

  return rows.map((row) => {
    if (!reviewerAdminOnlySourceLabels.has(row.label)) return row;
    if (row.value !== adminOnlySourceValue && !redactedMissingSourceValues.has(row.value)) return row;
    return {
      ...row,
      value: adminOnlySourceValue,
      detail: adminOnlySourceDetail
    };
  });
}

function buildRenditionWorkflowItems(
  asset: StockMediaAsset,
  role: DemoRole,
  approved: boolean,
  primaryBlocker: string
): RenditionWorkflowItem[] {
  const mediaType = asset.mediaType;
  const canInspectSource = assetCanInspectSourceRecord(role);
  const thumbnailReady = Boolean(asset.thumbnail || asset.imageUrls?.small || asset.imageUrls?.card);
  const approvedCopyReady = Boolean(asset.imageUrls?.download) && (
    asset.downloadPolicy === "approved-copy-allowed" ||
    asset.downloadPolicy === "internal-approved-copy-allowed"
  );
  const sourceRelation = sourceRelationLabel(asset, role);
  const checksum = shortChecksum(asset, role);
  const blockedDownloadReason = approved
    ? canInspectSource ? "Approved-copy gate still required." : "Use gate still required."
    : `Blocked until review clears ${primaryBlocker}.`;
  const draftReviewAction: OperationalWorkflowAction = {
    id: "draft-rendition-review",
    label: canSeeOperationalAssetRecordFields(role) ? "Open review queue" : "Request review",
    state: "local",
    reason: canInspectSource ? "Opens Review queue. No source-system writeback from this page." : "Review request only. No library records change."
  };

  const rows: RenditionWorkflowItem[] = [
    {
      id: "original-master",
      label: canInspectSource ? "Original/master" : "Original file",
      readiness: canInspectSource ? "Restricted source" : "Restricted",
      tone: "restricted",
      filename: canInspectSource ? asset.damFilenames?.original || asset.originalFilename : undefined,
      allowedRole: canInspectSource ? "Reviewer/DAM Admin metadata view only" : "Review request only",
      checksum,
      sourceRelation,
      gate: canInspectSource ? "Request-only from this portal" : "Not available from portal",
      auditNote: canInspectSource ? "Original is never included in approved-copy delivery output." : "Original file is never included in use-copy delivery.",
      action: {
        id: "blocked",
        label: canInspectSource ? "Download original disabled" : "Original access disabled",
        state: "blocked",
        reason: canInspectSource ? "Source immutability: original/master delivery is not exposed here." : "Portal only offers use copies after review."
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
      sourceRelation: "Preview only; not proof of reuse permission.",
      gate: thumbnailReady ? "Role-safe preview route" : "Reviewer/rendition work needed",
      auditNote: thumbnailReady ? "Preview availability recorded separately from rights approval." : "Missing thumbnail should stay review-visible.",
      action: thumbnailReady
        ? {
            id: "open-activity",
            label: "View audit trail",
            state: "local",
            reason: "Opens activity history."
          }
        : draftReviewAction
    },
    {
      id: "approved-web-copy",
      label: canInspectSource ? "Approved web copy" : "Use copy",
      readiness: approvedCopyReady ? approved ? "Ready behind gate" : "Generated but blocked" : "Not generated",
      tone: approvedCopyReady ? approved ? "pending" : "blocked" : "review",
      filename: asset.damFilenames?.web,
      allowedRole: approved ? canInspectSource ? "Approved-copy gate" : "Use gate" : "Reviewer clearance required",
      checksum,
      sourceRelation: canSeePrivateAssetRecordFields(role)
        ? "Derivative must stay traceable to source record and checksum evidence."
        : canSeeOperationalAssetRecordFields(role)
          ? "Derivative must stay traceable to source record and file-check evidence."
          : "Use copy must keep file-check evidence.",
      gate: approvedCopyReady ? blockedDownloadReason : canInspectSource ? "Approved derivative missing" : "Use copy missing",
      auditNote: canSeeOperationalAssetRecordFields(role)
        ? "Download action mints approved-copy ticket only when review gates pass."
        : "Request is checked against review gates before any use copy is provided.",
      action: approvedCopyReady && approved
        ? {
            id: "download-approved-copy",
            label: canInspectSource ? "Request approved copy" : "Request use copy",
            state: "available",
            reason: "Creates audited ticket; no original included."
          }
        : {
            id: "blocked",
            label: approvedCopyReady ? "Use request blocked" : "Generate copy disabled",
            state: "blocked",
            reason: approvedCopyReady ? blockedDownloadReason : canInspectSource ? "Portal does not generate derivatives or mutate source media." : "Portal does not generate new copies from this screen."
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
      sourceRelation: canInspectSource ? "Print derivative remains separate from master/original." : "Print copy remains separate from full-resolution file.",
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
      gate: canInspectSource ? "No transcode/writeback from portal" : "No transcode from portal",
      auditNote: "Preview, captions/waveform, and approved copy are modeled only.",
      action: draftReviewAction
    });
  }

  return rows;
}

function buildVersionWorkflowItems(asset: StockMediaAsset, role: DemoRole, source?: MediaSourceStatus | null): VersionWorkflowItem[] {
  const canSeePrivate = canSeePrivateAssetRecordFields(role);
  const canSeeOperational = canSeeOperationalAssetRecordFields(role);
  const refLabel = canSeeOperational ? recordIdLabel(source) : "Reference code";
  const sourceFile = canSeePrivate ? safeValue(asset.originalFilename) : "Restricted";
  const checksum = shortChecksum(asset, role);
  const versionLabel = safeValue(asset.versionOrEdition, "No edition recorded");
  const duplicateDetail = [asset.duplicateRole, asset.duplicateGroup, asset.duplicateSimilarityHint].filter(Boolean).join(" / ");
  const approvedCopyDisplay = asset.damFilenames?.web || (asset.imageUrls?.download ? canSeeOperational ? "Available through approved-copy gate" : "Request required" : "");
  const pendingSync = asset.pendingReviewWrite
    ? canSeeOperational
      ? `${asset.pendingReviewWrite.syncState.replace(/_/g, " ")}${asset.pendingReviewWrite.id ? ` (${asset.pendingReviewWrite.id})` : ""}`
      : "Reviewer follow-up queued"
    : "None";
  const localVersionAction: OperationalWorkflowAction = {
    id: "draft-version-note",
    label: canSeeOperational ? "Open review queue" : "Request review",
    state: "local",
    reason: canSeeOperational ? "Opens Review queue. No source-system writeback from this page." : "Review request only. No library records change."
  };

  return [
    {
      id: "record-version",
      label: "Current record",
      current: `${assetRecordRef(asset)} / ${versionLabel}`,
      comparison: `${refLabel}; generated filenames describe derivatives only.`,
      visibleTo: "All roles",
      sourceRelation: sourceRelationLabel(asset, role),
      auditNote: "Record comparison is metadata-only in this portal.",
      tone: "info",
      action: {
        id: "open-activity",
        label: "View activity",
        state: "local",
        reason: "Opens lifecycle and gate events."
      }
    },
    {
      id: "source-vs-approved",
      label: canSeeOperational ? "Source vs approved copy" : "Original vs use copy",
      current: `${canSeeOperational ? "Source" : "Original"}: ${sourceFile}`,
      comparison: `${canSeeOperational ? "Approved copy" : "Use copy"}: ${safeValue(approvedCopyDisplay, "Not generated")}`,
      visibleTo: canSeePrivate ? "Reviewer/DAM Admin" : "Restricted",
      sourceRelation: checksum,
      auditNote: canSeeOperational ? "Compare never exposes private path or original download to non-admin roles." : "Original file stays protected.",
      tone: asset.damFilenames?.web || asset.imageUrls?.download ? "ready" : "review",
      action: {
        id: "blocked",
        label: canSeeOperational ? "Replace source disabled" : "Replace original disabled",
        state: "blocked",
        reason: canSeeOperational ? "Source media mutation and replacement are outside portal scope." : "Original replacement is outside portal scope."
      }
    },
    {
      id: "duplicate-canonical",
      label: "Duplicate/canonical",
      current: canSeePrivate ? safeValue(duplicateDetail, "No duplicate role recorded") : asset.duplicateGroup || asset.duplicateRole ? "Duplicate evidence recorded" : "No duplicate role recorded",
      comparison: canSeePrivate ? "Admin can see cleanup metadata; album membership must be preserved." : "Cleanup metadata hidden from non-admin roles.",
      visibleTo: canSeePrivate ? "Reviewer/DAM Admin" : "Restricted summary",
      sourceRelation: canSeePrivate ? safeValue(asset.sourceAlbumMemberships, "Album membership not exported") : "Membership details hidden.",
      auditNote: canSeeOperational ? "Duplicate linking may preserve every source album membership; no source files moved." : "Duplicate cleanup needs reviewer action; no original files move from portal.",
      tone: duplicateDetail ? "pending" : "info",
      action: localVersionAction
    },
    {
      id: "pending-replacement",
      label: canSeeOperational ? "Pending replacement/sync" : "Pending review request",
      current: pendingSync,
      comparison: asset.pendingReviewWrite
        ? canSeeOperational ? "Review queue item visible; source update remains disabled." : "Review queue item visible to reviewers."
        : "No replacement request is queued in this role-safe record.",
      visibleTo: canSeeOperational ? "Reviewer/DAM Admin" : "Summary only",
      sourceRelation: canSeeOperational ? "Source-system writeback is not enabled from asset detail." : "Record update request only.",
      auditNote: canSeeOperational ? "Replacement, version upload, and record-write actions fail closed here." : "Record changes require reviewer/admin action.",
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
            <th>Action</th>
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

function downloadGateRows(result: DownloadGateResponse | null, message: string, canSeeOperational: boolean): AssetRecordRow[] {
  const gateLabel = canSeeOperational ? "Download gate" : "Use request";
  if (!result) {
    return [{
      id: "download-gate-session",
      label: gateLabel,
      value: "No request this session",
      detail: canSeeOperational ? "Approved-copy delivery remains ticket-gated." : "Use-copy access starts from the request button.",
      tone: "info"
    }];
  }
  return [
    {
      id: "download-gate-session",
      label: gateLabel,
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
      label: canSeeOperational ? "Ticket" : "Receipt",
      value: result.ticketExpiresAt ? `Expires ${result.ticketExpiresAt}` : result.ticketId || "Not issued",
      detail: canSeeOperational ? "Ticket secret and delivery URL are not displayed in record UI." : "Private delivery details are not shown here.",
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

function assetDetailActivityRows(asset: StockMediaAsset, role: DemoRole, result: DownloadGateResponse | null, message: string): AssetRecordRow[] {
  const canSeeOperational = canSeeOperationalAssetRecordFields(role);
  const roleSafeRows = assetRecordActivityRows(asset, role).map((row) => {
    if (canSeeOperational || row.id !== "sync") return row;
    return {
      ...row,
      label: "Pending review",
      value: asset.pendingReviewWrite ? "Reviewer follow-up queued" : "None",
      detail: "Record updates are handled by reviewer/admin workflow."
    };
  });
  return [
    ...roleSafeRows,
    ...downloadGateRows(result, message, canSeeOperational)
  ];
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

function roleSafeRequestHref(asset: StockMediaAsset, role: DemoRole, type: "Request permission" | "Report privacy or rights issue") {
  const params = new URLSearchParams({
    type,
    media: asset.id,
    title: displayTitle(asset)
  });
  return routeWithRole(`/requests?${params.toString()}`, role);
}

function roleSafeUsageSummary(asset: StockMediaAsset, role: DemoRole) {
  const presentation = presentAssetDetailContext(asset, role);
  const packet = presentation.packet;
  if (packet.access.downloadApprovedCopy.allowed && packet.reuse.state === "portal-ready") {
    return {
      label: "Available with permission",
      detail: "Use is available only within listed guidance. Ask before sharing outside that scope.",
      nextStep: "Request use copy",
      primaryAction: "Request use copy",
      tone: "is-success"
    };
  }
  if (packet.access.downloadApprovedCopy.allowed && packet.reuse.state === "internal-ready") {
    return {
      label: "Internal only",
      detail: "Internal ministry use only. Ask before any wider sharing.",
      nextStep: "Request permission",
      primaryAction: "Request permission",
      tone: "is-warning"
    };
  }
  return {
    label: "Restricted",
    detail: packet.viewerVerdict.reason || "Ask the media team before reuse.",
    nextStep: "Request permission",
    primaryAction: "Request permission",
    tone: "is-danger"
  };
}

function RoleSafeAssetDetailPage({
  asset,
  role,
  safePreviewAsset
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  safePreviewAsset: StockMediaAsset;
}) {
  const usage = roleSafeUsageSummary(asset, role);
  const title = displayTitle(asset);
  const requestPermissionHref = roleSafeRequestHref(asset, role, "Request permission");
  const reportIssueHref = roleSafeRequestHref(asset, role, "Report privacy or rights issue");
  const tags = Array.from(new Set([...(asset.usageTerms || []), ...(asset.tags || []), ...(asset.tjcTerms || [])]))
    .filter((tag) => !/\b(ResourceSpace|writeback|sync|source|checksum|path|download|published|approval)\b/i.test(tag))
    .slice(0, 8);

  return (
    <div className="enterprise-page enterprise-detail">
      <div className="ed-detail-layout">
        <main>
          <header className="ed-detail-header ed-record-header">
            <div className="ed-detail-title-block">
              <nav className="ed-breadcrumb" aria-label="Breadcrumb">
                <Link href={routeWithRole("/library", role)}>Media Library</Link>
                <span aria-hidden="true">/</span>
                <span>Asset detail</span>
              </nav>
              <div className="ed-record-title-row">
                <h1 title={title}>{title}</h1>
                <span className={cn("ed-badge", usage.tone)}>{usage.label}</span>
              </div>
              <p className="ed-asset-summary-line ed-record-ref-line">
                <span>{asset.collection || "Album not provided"}</span>
                <span>{assetDate(asset)}</span>
                <span>{assetType(asset)}</span>
              </p>
            </div>
          </header>

          <section className="ed-detail-preview-workbench" aria-label="Media preview">
            <div className="ed-hero-preview">
              <AssetThumb asset={safePreviewAsset} fit="contain" className="ed-detail-preview-media" />
              <div className="ed-preview-caption" aria-label="Preview facts">
                <span>Preview</span>
                <span>{asset.collection || "Album not provided"} / {assetDate(asset)} / {assetType(asset)}</span>
              </div>
            </div>
          </section>

          <section className="ed-card ed-record-tab-panel" aria-label="Usage and next step">
            <header className="ed-record-panel-head">
              <div>
                <h2>Usage</h2>
                <p>{usage.detail}</p>
              </div>
              <span className={cn("ed-badge", usage.tone)}>{usage.label}</span>
            </header>
            <div className="ed-record-answer-grid" aria-label="Current media guidance">
              <span><small>Album</small><strong>{asset.collection || "Not provided"}</strong></span>
              <span><small>Date</small><strong>{assetDate(asset)}</strong></span>
              <span><small>Type</small><strong>{assetType(asset)}</strong></span>
              <span><small>Next step</small><strong>{usage.nextStep}</strong></span>
            </div>
            {tags.length ? (
              <div className="ed-record-keywords">
                <strong>Tags</strong>
                <div className="ed-chip-row">
                  {tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            ) : null}
            <div className="ed-inspector-actions">
              <Link className="ed-action is-primary" href={requestPermissionHref}><Inbox size={16} aria-hidden="true" />{usage.primaryAction}</Link>
              <Link className="ed-action" href={reportIssueHref}><AlertTriangle size={16} aria-hidden="true" />Report issue</Link>
            </div>
          </section>
        </main>

        <aside className="ed-detail-rail ed-record-rail">
          <MetadataGroup title="Media" rows={[
            ["Title", title],
            ["Album", asset.collection],
            ["Event", asset.eventName || asset.eventSeries],
            ["Date", assetDate(asset)],
            ["Type", assetType(asset)]
          ]} />
          <MetadataGroup title="Use guidance" rows={[
            ["Status", usage.label],
            ["Next step", usage.nextStep],
            ["People/youth", asset.peopleRisk || "Ask media team"],
            ["Credit", asset.rightsNotes?.toLowerCase().includes("credit") ? "Credit may be required; ask media team." : "Ask if credit is needed"]
          ]} />
        </aside>
      </div>
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
  const [downloadTermsAccepted, setDownloadTermsAccepted] = useState(false);
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
  const canViewSourceRecord = assetCanInspectSourceRecord(role);
  const canSeeOperationalRecord = canSeeOperationalAssetRecordFields(role);
  const sourceRecordRows = canViewSourceRecord ? assetSourceRecordRowsForRole(asset, role) : [];
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
          ? canSeeOperationalRecord ? "Reuse-approved derivative" : "Cleared-use derivative"
          : "Role-safe derivative";
  const metadataRows = assetDetailMetadataRows(asset, role);
  const overviewRows = assetRecordOverviewRows(asset, role, detail.source);
  const rightsRows = assetRecordRightsRows(asset, role);
  const metadataHealth = assetMetadataHealth(asset);
  const approvedChannels = asset.approvedChannels?.length ? asset.approvedChannels.join(", ") : canSeeOperationalRecord ? "No approved channel recorded" : "No channel recorded";
  const primaryBlocker = reusePacket.reuse.blockers[0]?.label || "review evidence";
  const actionCopy = detailActionCopy(role, approved, reusePacket.viewerVerdict.reason, primaryBlocker);
  const safePreviewAsset = roleSafePreviewAsset(asset);
  if (!canSeeOperationalRecord) {
    return <RoleSafeAssetDetailPage asset={asset} role={role} safePreviewAsset={safePreviewAsset} />;
  }

  const evidenceRows: AssetRecordRow[] = [
    { id: "evidence-source", label: canViewSourceRecord ? "Source" : "Record", value: reusePacket.metadataConfidence.source, detail: canViewSourceRecord ? "Custody/provenance evidence" : "Record provenance evidence", tone: reusePacket.metadataConfidence.source === "verified" ? "ready" : "review" },
    { id: "evidence-rights", label: "Rights", value: reusePacket.metadataConfidence.rights, detail: canSeeOperationalRecord ? "Rights, consent, and approved channel" : "Rights, consent, and use channel", tone: reusePacket.metadataConfidence.rights === "approved" ? "ready" : "review" },
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
  const activityRows = assetDetailActivityRows(asset, role, lastDownloadResult, downloadMessage);
  const manifestRows = canSeeOperationalRecord ? deliveryManifestRows(lastDownloadResult) : [];
  const actionMessage = assetActionMessage || downloadMessage;
  const canOpenResourceSpace = reusePacket.access.viewResourceSpaceAdminLink.allowed;
  const originalAccessLabel = canViewSourceRecord ? reusePacket.access.downloadOriginal.label || "Restricted" : "Restricted";
  const openReviewQueue = () => {
    const params = new URLSearchParams({ asset: asset.id });
    window.location.assign(routeWithRole(`/review?${params.toString()}`, role));
  };

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
    if (!downloadTermsAccepted) {
      setDownloadMessage(canSeeOperationalRecord ? "Accept usage terms before requesting an approved copy." : "Accept usage terms before requesting a use copy.");
      return;
    }
    const result = await downloadGate.requestDownload({ termsAccepted: downloadTermsAccepted, usageChannel: "portal", reason: `Asset detail approved-copy request for ${displayTitle(asset)}` });
    setLastDownloadResult(result);
    if (result.allowed) {
      const receipt = [
        result.auditId ? `Audit ${result.auditId}` : "",
        result.ticketExpiresAt
          ? `${canSeeOperationalRecord ? "ticket expires" : "request expires"} ${result.ticketExpiresAt}`
          : result.ticketId
            ? `${canSeeOperationalRecord ? "ticket" : "request"} ${result.ticketId}`
            : ""
      ].filter(Boolean).join("; ");
      setDownloadMessage(receipt
        ? `${canSeeOperationalRecord ? "Download gate" : "Use request"} allowed. ${receipt}.`
        : `${canSeeOperationalRecord ? "Download gate" : "Use request"} allowed. Receipt details were not returned.`);
    } else {
      setDownloadMessage(`${canSeeOperationalRecord ? "Approved-copy gate" : "Use request"} blocked: ${result.reason || result.requiredAction || "Not allowed"}. Next step: ${result.requiredAction || "request DAM review"}.`);
    }
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
        openReviewQueue();
        return;
      }
      void requestReview();
      return;
    }
    if (action.id === "draft-version-note") {
      if (!canSeeOperationalAssetRecordFields(role)) {
        void requestReview();
        return;
      }
      openReviewQueue();
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
              <ActionButton tone="primary" icon={approved && canSeeOperationalRecord ? Download : FileText} onClick={approved ? requestApprovedDownload : requestReview} disabled={assetActionPending}>
                {assetActionPending && !approved ? "Queueing review..." : actionCopy.primary}
              </ActionButton>
              {approved ? (
                <label className="ed-download-terms">
                  <input type="checkbox" checked={downloadTermsAccepted} onChange={(event) => setDownloadTermsAccepted(event.target.checked)} />
                  <span>Use within listed terms</span>
                </label>
              ) : null}
              <div className="ed-action-menu-wrap">
                <ActionButton ariaLabel="Open asset record tools" onClick={() => setActionsOpen((open) => !open)}><ChevronDown size={14} />Tools</ActionButton>
                {actionsOpen ? (
                  <div className="ed-more-actions-menu ed-detail-actions-menu" role="menu">
                    {approved ? (
                      <button type="button" role="menuitem" onClick={() => { void requestApprovedDownload(); setActionsOpen(false); }}>
                        {canSeeOperationalRecord ? <Download size={15} /> : <FileText size={15} />}{canSeeOperationalRecord ? "Request approved copy" : "Request use copy"}
                        <span>{canSeeOperationalRecord ? "Runs approved-copy gate and audit." : "Checks usage terms and records request."}</span>
                      </button>
                    ) : null}
                    <button type="button" role="menuitem" onClick={() => { setAssetActionMessage("Favorite saved for this session."); setActionsOpen(false); }}><Star size={15} />Favorite<span>Save this record locally for this session.</span></button>
                    <button type="button" role="menuitem" onClick={() => { setTab("Activity"); setActionsOpen(false); }}><FileText size={15} />View activity<span>Open review, lifecycle, and gate events.</span></button>
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
                  <ActionButton icon={approved && canSeeOperationalRecord ? Download : FileText} onClick={approved ? requestApprovedDownload : requestReview} disabled={assetActionPending}>
                    {assetActionPending && !approved ? "Queueing review..." : actionCopy.primary}
                  </ActionButton>
                </header>
                <div className="ed-record-answer-grid" aria-label="Current asset use state">
                  <span><small>Use state</small><strong>{reuseAnswerLabel(reusePacket.reuse.state)}</strong></span>
                  <span><small>Visibility</small><strong>{betaVisibilityLabel(asset)}</strong></span>
                  <span><small>{canViewSourceRecord ? "Source/original" : "Original access"}</small><strong>{originalAccessLabel}</strong></span>
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
                    {assetKeywordText(asset) !== "Not provided" ? [...(asset.tags || []), ...(asset.tjcTerms || [])].map((keyword) => <span key={keyword}>{keyword}</span>) : <p>Not provided in current record.</p>}
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
                    <h2>{canViewSourceRecord ? "Renditions" : "Use copies"}</h2>
                    <p>{canViewSourceRecord ? "Original restricted. Derivatives list readiness, role/action, reason, and safe request path only." : "Original file stays protected. Use copies list readiness, reason, and safe request path only."}</p>
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
                    <h2>{canViewSourceRecord ? "Versions" : "Record history"}</h2>
                    <p>{canViewSourceRecord ? "Generated filenames, duplicate metadata when allowed, and pending replacement/sync. Display only; no version writes." : "Review requests and duplicate notes stay read-only here."}</p>
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
                    <p>{canSeeOperationalRecord ? "Review, rights, lifecycle, and download-gate events visible to this role." : "Review, rights, lifecycle, and request events visible to this role."}</p>
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
            [canSeeOperationalRecord ? "Download gate" : "Use request", approved ? canSeeOperationalRecord ? "Approved-copy gate available" : "Available after terms check" : reusePacket.viewerVerdict.reason],
            [canViewSourceRecord ? "Source/original" : "Original access", originalAccessLabel]
          ]} />
          <MetadataGroup title="Rights" rows={[
            ["Usage scope", asset.usageScope],
            ["Rights", asset.rightsStatus || "Not provided"],
            ["Consent", asset.consentStatus || "Not provided"],
            ["People/minors", asset.peopleRisk || "Unknown"],
            [canSeeOperationalRecord ? "Approved channels" : "Use channels", approvedChannels]
          ]} />
          <MetadataGroup title="Collections" rows={[
            ["Collection", asset.collection],
            ["Event", asset.eventName || asset.eventSeries],
            [canViewSourceRecord ? "Record source" : "Record basis", canViewSourceRecord ? sourceTruthLabel(detail.source) : "Media library"],
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
            [canViewSourceRecord ? "Pending sync" : "Pending review", canViewSourceRecord ? formatSyncState(asset.pendingReviewWrite?.syncState) : asset.pendingReviewWrite ? "Reviewer follow-up queued" : "None"]
          ]} />
          {canViewSourceRecord ? (
            <section className="ed-card">
              <header className="ed-card-head">
                <div>
                  <h3>Source record</h3>
                  <p>Reviewer/admin evidence only. Read-only boundary; no source media mutation or writeback.</p>
                </div>
                <StatusBadge status="Read-only" />
              </header>
              <dl className="ed-metadata">
                {sourceRecordRows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}{row.detail ? <small>{row.detail}</small> : null}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          <MetadataGroup title="Metadata completeness" rows={[
            ["State", metadataHealth.state],
            ["Score", `${metadataHealth.score}%`],
            ["Gaps", metadataHealth.missing.length ? metadataHealth.missing.join(", ") : "None in current role-safe view"]
          ]} />
          <AdminDiagnosticCard role={role} rows={[
            ["Source mode", detail.source?.label || "Not loaded"],
            ["API source", detail.live ? "Configured" : "Not active"],
            ["Record source", detail.source?.adapter || "unknown"],
            ["Source admin link", canOpenResourceSpace && detail.data?.resourceSpaceUrl ? "Available" : "Unavailable"],
            ["Pending write", formatSyncState(asset.pendingReviewWrite?.syncState)]
          ]} />
        </aside>
      </div>
    </div>
  );
}
