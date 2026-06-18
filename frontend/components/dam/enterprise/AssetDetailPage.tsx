"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, FileText, Lock, PackageCheck, Star } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetDetail, useDownloadGate, useReviewRequest } from "@/components/dam/useDamApi";
import { assetHasRenditionGap, assetMetadataHealth } from "@/lib/asset-governance";
import { assetDetailTabs, isActivityTab } from "@/lib/asset-record-workbench";
import { assetRecordRef, assetType, displayTitle, sourceLabel } from "@/lib/enterprise-display";
import { assetDetailMetadataRows, assetKeywordText } from "@/lib/enterprise-metadata";
import { betaVisibilityLabel, presentAssetDetailContext, reuseAnswerLabel } from "@/lib/portal-context-presenters";
import { routeWithRole } from "@/lib/role-routes";
import { cn } from "@/lib/ui";
import { ActionButton, AdminDiagnosticCard, AssetThumb, BlockedReasonList, ClearanceStatusPanel, EvidenceChecklistSummary, ErrorCard, LoadingCard, MetadataGroup, NextActionPanel, RoleSafeActionBar, SuggestedTagGroup } from "./EnterpriseShared";

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

function assetSourceTruth(source: Parameters<typeof sourceLabel>[0]) {
  const label = sourceLabel(source);
  if (/fixture|fallback|demo/i.test(label)) return "Local demo data";
  if (/resourcespace|dam/i.test(label)) return "Hosted DAM instance";
  if (/local/i.test(label)) return "Local demo data";
  return label;
}

export function EnterpriseAssetDetailPage({ id }: { id: string }) {
  const { role } = useDemoRole();
  const detail = useAssetDetail(id, role);
  const downloadGate = useDownloadGate(id, role);
  const reviewRequest = useReviewRequest(id, role);
  const [tab, setTab] = useState(assetDetailTabs[0]);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [assetActionMessage, setAssetActionMessage] = useState("");
  const [assetActionPending, setAssetActionPending] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const asset = detail.data?.asset;
  const related = detail.data?.related || [];
  if (detail.loading) return <div className="enterprise-page"><LoadingCard label="Loading media asset record..." /></div>;
  if (detail.error || !asset) return <div className="enterprise-page"><ErrorCard message={detail.error || "Asset not found."} source={detail.source} /></div>;
  const metadataRows = assetDetailMetadataRows(asset, role);
  const presentation = presentAssetDetailContext(asset, role, detail.source);
  const reusePacket = presentation.packet;
  const approved = presentation.approved;
  const canViewReviewerNotes = role === "Reviewer" || role === "DAM Admin";
  const actionLabel = assetActionPending ? "Queueing review..." : presentation.requestReviewLabel;
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
  const summaryFacts = presentation.summaryFacts;
  const hasVersionData = Boolean(asset.originalFilename || asset.duplicateRole || asset.duplicateGroup);
  const metadataHealth = assetMetadataHealth(asset);
  const approvedChannels = asset.approvedChannels?.length ? asset.approvedChannels.join(", ") : "No approved channel recorded";
  const evidenceRows = [
    { label: "Source", value: reusePacket.metadataConfidence.source, ok: reusePacket.metadataConfidence.source === "verified", detail: "Custody/provenance evidence" },
    { label: "Rights", value: reusePacket.metadataConfidence.rights, ok: reusePacket.metadataConfidence.rights === "approved", detail: "Rights, consent, and approved channel" },
    { label: "People/minors", value: reusePacket.metadataConfidence.peopleMinors, ok: reusePacket.metadataConfidence.peopleMinors === "reviewed", detail: "Visibility and consent posture" },
    { label: "Review", value: reusePacket.metadataConfidence.review, ok: reusePacket.metadataConfidence.review === "complete", detail: "Reviewer/date evidence" }
  ];
  const suggestedTagValues = [
    ...(asset.suggestedTags || []),
    ...(asset.aiVisibleTagSuggestions || []),
    ...(asset.aiTjcTermSuggestions || [])
  ];
  const activityItems = [
    asset.reviewedDate ? `Reviewed ${asset.reviewedDate} by ${asset.reviewer || "review team"}` : "",
    asset.pendingReviewWrite ? (canViewReviewerNotes ? "Pending review sync to DAM source" : "Pending review sync") : "",
    downloadMessage
  ].filter(Boolean);
  const roleSafeReviewNote = canViewReviewerNotes
    ? asset.rightsNotes || "No reviewer note exported."
    : "Reviewer notes are restricted. No contributor-visible note exported in this beta view.";
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
    setDownloadMessage(result.allowed ? `Download gate allowed. Audit ${result.auditId || "recorded"}.` : `Download blocked: ${result.reason || result.requiredAction || "Not allowed"}.`);
    if (result.allowed && result.downloadUrl) window.location.href = result.downloadUrl;
  };
  const canOpenResourceSpace = reusePacket.access.viewResourceSpaceAdminLink.allowed;
  return (
    <div className="enterprise-page enterprise-detail">
      <div className="ed-detail-layout">
        <main>
          <header className="ed-detail-header">
            <div className="ed-detail-title-block">
              <nav className="ed-breadcrumb" aria-label="Breadcrumb">
                <Link href={routeWithRole("/", role)}>Library</Link>
                <span aria-hidden="true">/</span>
                <span>Asset {assetRecordRef(asset)}</span>
              </nav>
              <h1 title={displayTitle(asset)}>{displayTitle(asset)}</h1>
              <p className="ed-asset-summary-line">
                {summaryFacts.map((fact, index) => (
                  <Fragment key={fact}>
                    {index ? <span className="ed-fact-separator" aria-hidden="true"> · </span> : null}
                    <span>{fact}</span>
                  </Fragment>
                ))}
              </p>
            </div>
            <div className="ed-detail-actions">
              <ActionButton icon={FileText} onClick={requestReview} disabled={assetActionPending}>{actionLabel}</ActionButton>
              <div className="ed-action-menu-wrap">
                <ActionButton onClick={() => setActionsOpen((open) => !open)}>More actions <ChevronDown size={14} /></ActionButton>
                {actionsOpen ? (
                  <div className="ed-more-actions-menu ed-detail-actions-menu" role="menu">
                    {approved ? <button type="button" role="menuitem" onClick={() => { void requestApprovedDownload(); setActionsOpen(false); }}><Download size={15} />Download approved copy<span>Runs approved-copy gate and audit before delivery.</span></button> : null}
                    <button type="button" role="menuitem" onClick={() => { setAssetActionMessage("Favorite saved for this beta session."); setActionsOpen(false); }}><Star size={15} />Favorite<span>Save this record for this beta session.</span></button>
                    <button type="button" role="menuitem" onClick={() => { setTab("Activity"); setActionsOpen(false); }}><FileText size={15} />View activity<span>Open exported activity and review notes.</span></button>
                    <button type="button" role="menuitem" onClick={() => { setAssetActionMessage("Use Distribution Sets to add governed references without copying source files."); setActionsOpen(false); }}><PackageCheck size={15} />Add to distribution set<span>Collect reference without moving source files.</span></button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          {assetActionMessage ? <p className="ed-inline-success">{assetActionMessage}</p> : null}
          <section className="ed-trust-answer-strip ed-detail-answer-strip" aria-label="Asset trust answers">
            <span><small>Beta visibility</small><strong>{betaVisibilityLabel(asset)}</strong></span>
            <span><small>Reuse/download</small><strong>{reuseAnswerLabel(reusePacket.reuse.state)}</strong></span>
            <span><small>Source truth</small><strong>{assetSourceTruth(detail.source)}</strong></span>
          </section>
          <section className={cn("ed-detail-preview-workbench", lowResolutionPreview && "is-low-resolution", limitedDerivative && "has-limited-derivative")} aria-label="Role-safe media preview workbench">
            <div className="ed-hero-preview">
              <AssetThumb asset={asset} fit="contain" className="ed-detail-preview-media" />
              <div className="ed-preview-caption" aria-label="Preview derivative facts">
                <span>Preview only · Zoom unavailable until safe derivative is exported</span>
                <span>{derivativeStatus} · {asset.imageDimensions || "Dimensions not provided"}</span>
              </div>
            </div>
          </section>
          <nav className="ed-tabs is-large" aria-label="Asset record tabs">{assetDetailTabs.map((item) => <button className={cn(tab === item && "is-active")} type="button" key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
          <section className="ed-card ed-metadata-card">
            {tab === "Metadata" ? <dl className="ed-metadata is-two">{metadataRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
            {tab === "Keywords" ? <div className="ed-chip-row">{assetKeywordText(asset) !== "Not provided" ? [...(asset.tags || []), ...(asset.tjcTerms || [])].map((keyword) => <span key={keyword}>{keyword}</span>) : <p>Not provided in the current data source.</p>}<p className="ed-action-helper">Keywords are discovery metadata only. They do not change clearance, download, or distribution state.</p></div> : null}
            {tab === "Suggested tags" ? <SuggestedTagGroup approved={[...(asset.tags || []), ...(asset.tjcTerms || [])]} suggested={suggestedTagValues} role={role} onDecision={(tag, decision) => setAssetActionMessage(`Suggested tag "${tag}" marked ${decision} locally for this beta view. No clearance or ResourceSpace writeback changed.`)} /> : null}
            {tab === "Comments" ? <div className="ed-comment-stack"><p className="ed-comment"><strong>{canViewReviewerNotes ? "Reviewer note" : "Visible note"}</strong> {roleSafeReviewNote}</p><input className="ed-input" aria-label="Add asset comment" placeholder="Add a local follow-up note..." /></div> : null}
            {isActivityTab(tab) ? <div className="ed-table-mini">{[asset.reviewedDate ? `Reviewed ${asset.reviewedDate} by ${asset.reviewer || "review team"}` : "Review activity not provided", asset.pendingReviewWrite ? (canViewReviewerNotes ? "Pending review sync to DAM source" : "Pending review sync") : "No pending write", downloadMessage || "No download gate action this session"].map((item) => <p key={item}>{item}</p>)}</div> : null}
          </section>
          <section className="ed-card"><header className="ed-card-head"><h3>Related Media</h3><span>{related.length} results</span></header><div className="ed-related-strip">{related.length ? related.slice(0, 5).map((item) => <AssetThumb asset={item} key={item.id} />) : <p>No related media records found.</p>}</div></section>
        </main>
        <aside className="ed-detail-rail">
          <ClearanceStatusPanel asset={asset} source={detail.source} onRequestReview={() => { void requestReview(); }} />
          <NextActionPanel
            title={approved ? "Use approved copy within recorded scope." : presentation.primaryActionLabel}
            detail={approved ? "Download still records audit and runs approved-copy gate. Source files stay restricted." : `${reusePacket.viewerVerdict.reason} Primary blocker: ${reusePacket.reuse.blockers[0]?.label || "review evidence"}.`}
            action={approved ? "Download approved copy" : "Request DAM review"}
            onAction={approved ? requestApprovedDownload : requestReview}
            disabled={assetActionPending}
            disabledReason="Review request is already queueing."
          />
          <MetadataGroup title="Approved channels and scope" description="Channel permission is separate from tags, collections, and package membership." rows={[
            ["Usage scope", asset.usageScope],
            ["Download filename", asset.damFilenames?.web || "Generated at delivery"],
            ["Approved channels", approvedChannels],
            ["Required notice", asset.requiredNotice || "Not recorded"],
            ["Reuse tier", asset.reuseTier || "Not recorded"]
          ]} />
          {role === "DAM Admin" ? (
            <MetadataGroup title="Filename automation" description="The DAM automatically generates filenames from available metadata. Date and rendition are auto-applied. Event or collection is preferred but not required. Subject is optional and can be added later. If metadata is missing, the DAM uses a safe fallback such as needs-triage or shared-import. Users should not manually type technical filenames. Display titles and DAM filenames are generated metadata. Source files and ResourceSpace IDs stay untouched." rows={[
              ["Original filename", asset.originalFilename || "Preserved when exported"],
              ["DAM original filename", asset.damFilenames?.original || "Generated at import"],
              ["DAM web filename", asset.damFilenames?.web || "Generated at delivery"],
              ["Human title", displayTitle(asset)],
              ["Date source", asset.damFilenames?.dateSource?.replace(/_/g, " ") || "Generated from best available metadata"],
              ["Sequence", asset.damFilenames?.sequence || "Permanent DAM sequence"]
            ]} />
          ) : null}
          {!approved ? <MetadataGroup title="Primary blocker" rows={[
            ["Blocker", reusePacket.reuse.blockers[0]?.label || "Review evidence needed"],
            ["Evidence needed", reusePacket.viewerVerdict.reason],
            ["Reviewer role", reusePacket.reuse.blockers.some((blocker) => blocker.code === "blocked-sensitive") ? "Domain reviewer / DAM reviewer" : "Reviewer or DAM Admin"]
          ]} /> : null}
          <EvidenceChecklistSummary rows={evidenceRows} />
          <MetadataGroup title="Metadata completeness" rows={[
            ["State", metadataHealth.state],
            ["Score", `${metadataHealth.score}%`],
            ["Gaps", metadataHealth.missing.length ? metadataHealth.missing.join(", ") : "None in current role-safe view"]
          ]} />
          <RoleSafeActionBar asset={asset} role={role} onRequestReview={() => { void requestReview(); }} onDownloadApprovedCopy={requestApprovedDownload} onMessage={setAssetActionMessage} />
          <BlockedReasonList blockers={reusePacket.reuse.blockers} />
          <AdminDiagnosticCard role={role} rows={[
            ["Source mode", detail.source?.label || "Not loaded"],
            ["Live source", detail.live ? "Yes" : "No"],
            ["Record source", detail.source?.adapter || "unknown"],
            ["ResourceSpace admin link", canOpenResourceSpace && detail.data?.resourceSpaceUrl ? "Available" : "Unavailable"],
            ["Pending write", asset.pendingReviewWrite?.syncState || "None"]
          ]} />
          {hasVersionData ? <AdminDiagnosticCard role={role} title="Version diagnostics" rows={[
            ["DAM original filename", asset.damFilenames?.original || "Generated at import"],
            ["DAM web filename", asset.damFilenames?.web || "Generated at delivery"],
            ["Original file", asset.originalFilename || "Not provided"],
            ["Duplicate role", asset.duplicateRole || "Not provided"],
            ["Duplicate group", asset.duplicateGroup || "Not provided"]
          ]} /> : null}
          <section className="ed-card"><header className="ed-card-head"><h3>Recent Activity</h3></header>{activityItems.length ? <div className="ed-table-mini">{activityItems.map((item) => <p key={item}>{item}</p>)}</div> : <p className="ed-empty-copy">No review activity provided.</p>}</section>
        </aside>
      </div>
      {!approved ? (
        <div className="ed-sticky-action-bar is-blocked">
          <div><Lock size={18} /><span><strong>{presentation.canUseTitle}</strong></span></div>
          <ActionButton icon={FileText} onClick={requestReview} disabled={assetActionPending}>{assetActionPending ? "Queueing review..." : "Request DAM review"}</ActionButton>
          <ActionButton onClick={() => setAssetActionMessage("More actions are limited until policy-backed actions are connected.")}>More actions <ChevronDown size={14} /></ActionButton>
        </div>
      ) : null}
    </div>
  );
}
