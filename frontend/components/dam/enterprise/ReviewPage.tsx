"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, ChevronDown, ChevronRight, FileText, Filter, Grid3X3, Lock, Minus, MoreVertical, Plus, Save, Search, ShieldAlert } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useDownloadGate, useReviewQueue } from "@/components/dam/useDamApi";
import { assetRecordRef, assetType, displayTitle, formatBytes } from "@/lib/enterprise-display";
import { assetEnterpriseStatus, type EnterpriseStatus } from "@/lib/enterprise-status";
import { presentReviewContext } from "@/lib/portal-context-presenters";
import { emptyReviewChecklist, initialReviewChecklistForAsset, reviewActionDisabledReason, reviewChecklistItems, reviewEvidenceCompletion } from "@/lib/review-decision-presenter";
import { buildReviewQueueMetrics, buildReviewSignals, buildSelectedReviewGuidance, checklistActionLabel, reviewEvidenceGroups, reviewMetadataCompleteness, reviewWaitingDays, reviewWorkbenchTabs, type PendingReviewDecisionSummary } from "@/lib/review-workbench";
import { routeWithRole } from "@/lib/role-routes";
import type { ReviewEvidenceChecklist, StockMediaAsset } from "@/lib/types";
import { normalizeReviewQueueId, reviewGovernanceGroupsForAsset, reviewRiskFlags, type ReviewQueueId } from "@/lib/workflow-policy";
import { cn } from "@/lib/ui";
import { ActionButton, AssetThumb, ErrorCard, IconButton, LoadingCard, SourcePill } from "./EnterpriseShared";

const reviewQueuePageSizeOptions = [8, 12, 20];
const evidenceRequiredBeforeCompletion = new Set<keyof ReviewEvidenceChecklist>([
  "rightsConfirmed",
  "attributionConfirmed",
  "creditRequirementChecked"
]);

function reviewChipLabels(asset: StockMediaAsset) {
  const flags = reviewRiskFlags(asset);
  const chips = new Set<string>();
  reviewGovernanceGroupsForAsset(asset, Boolean(asset.pendingReviewWrite)).filter((group) => group.active).forEach((group) => chips.add(group.label));
  if (assetEnterpriseStatus(asset) === "Needs Review") chips.add("Needs review");
  if (flags.includes("Rights unclear")) chips.add("Rights missing");
  if (flags.includes("People/minors status unresolved")) chips.add("People unresolved");
  if (flags.some((flag) => /source/i.test(flag))) chips.add("Source missing");
  return [...chips].slice(0, 4);
}

export function EnterpriseReviewPage() {
  const { role, ready } = useDemoRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [queueId, setQueueId] = useState<ReviewQueueId>(() => normalizeReviewQueueId(searchParams.get("queue")));
  const review = useReviewQueue(role, queueId);
  const rawQueue = review.data?.assets || [];
  const pendingWritesByAssetId = review.data?.pendingWrites || {};
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDecisionById, setPendingDecisionById] = useState<Record<string, PendingReviewDecisionSummary>>({});
  const [comment, setComment] = useState("");
  const [checklist, setChecklist] = useState<ReviewEvidenceChecklist>(emptyReviewChecklist);
  const [decisionMessage, setDecisionMessage] = useState("");
  const [reviewListMessage, setReviewListMessage] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [reviewSignalQuery, setReviewSignalQuery] = useState("");
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState(reviewWorkbenchTabs[0]);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const downloadGate = useDownloadGate(selectedId || "", role);
  const queue = useMemo(() => {
    const dateValue = (asset: (typeof rawQueue)[number]) => Date.parse(asset.importDate || asset.capturedDate || asset.reviewedDate || "") || 0;
    return [...rawQueue].sort((left, right) => sortOrder === "oldest" ? dateValue(left) - dateValue(right) : dateValue(right) - dateValue(left));
  }, [rawQueue, sortOrder]);
  const filteredQueue = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();
    if (!query) return queue;
    return queue.filter((asset) => [
      displayTitle(asset),
      assetRecordRef(asset),
      asset.collection,
      asset.sourceSystem,
      asset.sourcePlatform,
      asset.usageScope,
      assetEnterpriseStatus(asset)
    ].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [queue, queueSearch]);
  const pageCount = Math.max(1, Math.ceil(filteredQueue.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredQueue.length);
  const pagedQueue = useMemo(() => filteredQueue.slice(pageStart, pageEnd), [filteredQueue, pageStart, pageEnd]);
  const queueMetrics = useMemo(() => buildReviewQueueMetrics(queue), [queue]);
  const reviewSignals = useMemo(() => buildReviewSignals(queue), [queue]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!pagedQueue.length) {
      if (!selectedId && filteredQueue[0]) setSelectedId(filteredQueue[0].id);
      return;
    }

    if (!selectedId || !pagedQueue.some((asset) => asset.id === selectedId)) {
      setSelectedId(pagedQueue[0].id);
    }
  }, [pagedQueue, filteredQueue, selectedId]);

  useEffect(() => {
    const nextQueue = normalizeReviewQueueId(searchParams.get("queue"));
    setQueueId(nextQueue);
  }, [searchParams]);

  useEffect(() => {
    const selectedAsset = queue.find((asset) => asset.id === selectedId);
    setChecklist(initialReviewChecklistForAsset(selectedAsset));
    setComment("");
    setDecisionMessage("");
    setActiveWorkbenchTab(reviewWorkbenchTabs[0]);
  }, [queue, selectedId]);

  if (!ready) return <div className="enterprise-page"><LoadingCard label="Loading role..." /></div>;
  if (role !== "Reviewer" && role !== "DAM Admin") return <div className="enterprise-page"><section className="ed-card ed-access-block"><Lock size={28} /><h1>Review inbox requires reviewer access</h1><p>Approvals, evidence review, assignment, and decision actions are available only to Reviewer and DAM Admin roles.</p><Link href={routeWithRole("/", role)}>Return to Asset Library</Link></section></div>;
  if (review.loading) return <div className="enterprise-page"><LoadingCard label="Loading ResourceSpace review queue..." /></div>;
  if (review.error) return <div className="enterprise-page"><ErrorCard message={review.error} source={review.source} /></div>;
  const selectedAsset = queue.find((asset) => asset.id === selectedId) || queue[0];
  const rightsUsageView = queueId === "rights-review";
  const pageTitle = rightsUsageView ? "Rights & Usage" : "Review Queue";
  const pageSubtitle = rightsUsageView
    ? "Review rights evidence, use scope, consent, and gated-copy decisions."
    : "Validate assets before they become broadly available.";
  const selectedStatus = assetEnterpriseStatus(selectedAsset);
  const currentQueueLabel = review.data?.queues?.find((item) => item.id === queueId)?.label || "Pending review";
  const selectedPendingWrite = pendingWritesByAssetId[selectedAsset?.id || ""];
  const selectedPending = pendingDecisionById[selectedAsset?.id || ""] || (selectedPendingWrite ? {
    status: "Needs Review" as EnterpriseStatus,
    action: selectedPendingWrite.requestedStatus,
    message: `Queued ${selectedPendingWrite.requestedStatus} / ${selectedPendingWrite.syncState}. ResourceSpace remains unchanged until sync succeeds or media team completes follow-up.`
  } : undefined);
  const evidenceCompletion = reviewEvidenceCompletion(checklist, comment);
  const evidencePercent = Math.round((evidenceCompletion.completed / evidenceCompletion.total) * 100);
  const metadataCompleteness = reviewMetadataCompleteness(selectedAsset);
  const selectedGuidance = buildSelectedReviewGuidance({ asset: selectedAsset, checklist, comment, pending: selectedPending });
  const topBlocker = selectedGuidance.approveMissingLabels[0] || evidenceCompletion.missingLabels[0] || selectedGuidance.riskFlags.find((flag) => flag !== "Standard review") || "No required evidence blocker";
  const nextSafeAction = topBlocker === "Owner/license evidence missing"
    ? "Add or verify required rights evidence"
    : evidenceCompletion.missingLabels.length ? "Add or verify required evidence" : "Review evidence checklist";
  const selectedRiskFlags = selectedGuidance.riskFlags.filter((flag) => flag !== "Standard review");
  const reviewPresentation = selectedAsset ? presentReviewContext({
    asset: selectedAsset,
    role,
    currentStatus: selectedStatus,
    pendingStatus: selectedPending?.status,
    nextBestAction: selectedGuidance.nextBestAction,
    approvalReady: selectedGuidance.approvalReady,
    queueLabel: rightsUsageView ? "Rights reviewer" : "Reviewer queue"
  }) : null;
  const detailRows = reviewPresentation?.detailRows || [];
  const evidenceTableRows = reviewPresentation?.evidenceTableRows || [];
  const governanceGroups = selectedGuidance.governanceGroups || [];
  const sensitiveEvidence = selectedGuidance.sensitiveMinistryEvidence || [];
  const publicDisabledReason = selectedAsset ? reviewActionDisabledReason({ asset: selectedAsset, action: "Approve Public", checklist, note: comment }) : "";
  const requestInfoDisabledReason = selectedAsset ? reviewActionDisabledReason({ asset: selectedAsset, action: "Request More Info", checklist, note: comment }) : "";
  const restrictDisabledReason = selectedAsset ? reviewActionDisabledReason({ asset: selectedAsset, action: "Do Not Use", checklist, note: comment }) : "";
  const selectQueue = (nextQueue: ReviewQueueId) => {
    setQueueId(nextQueue);
    setCurrentPage(1);
    setSelectedId(null);
    router.push(routeWithRole(`/review?queue=${encodeURIComponent(nextQueue)}`, role), { scroll: false });
  };
  const toggleChecklist = (field: keyof ReviewEvidenceChecklist) => {
    setChecklist((current) => ({ ...current, [field]: !current[field] }));
  };
  const selectNextAsset = () => {
    if (!filteredQueue.length || !selectedAsset) return;
    const currentIndex = filteredQueue.findIndex((asset) => asset.id === selectedAsset.id);
    const next = filteredQueue[(currentIndex + 1) % filteredQueue.length];
    setSelectedId(next?.id || filteredQueue[0]?.id || null);
  };
  const decide = async (nextStatus: EnterpriseStatus, action: "Approve Public" | "Request More Info" | "Do Not Use") => {
    if (!selectedAsset) return;
    const disabledReason = reviewActionDisabledReason({ asset: selectedAsset, action, checklist, note: comment });
    if (disabledReason) {
      setDecisionMessage(`Review blocked. ${disabledReason}.`);
      return;
    }
    const response = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, id: selectedAsset.id, action, notes: comment || `Reviewer decision for ${displayTitle(selectedAsset)}. Pending ResourceSpace sync required.`, checklist, reviewerName: "Alex Kim" }) });
    const payload = await response.json().catch(() => ({}));
    const syncState = typeof payload.syncState === "string" ? payload.syncState : response.ok ? "queued" : "blocked";
    const prefix = syncState === "synced_to_resourcespace" ? "Synced to ResourceSpace." : syncState === "sync_failed" ? "Sync failed." : syncState === "blocked" ? "Blocked." : "Queued for ResourceSpace sync.";
    const message = `${prefix} ${payload.message || payload.error || "ResourceSpace writeback is not configured. This decision is saved as a portal pending-sync event."}`;
    if (response.ok) {
      setPendingDecisionById((current) => ({ ...current, [selectedAsset.id]: { status: nextStatus, message, action } }));
    }
    setDecisionMessage(message);
  };
  const queuePortalNote = (action: string) => {
    if (!selectedAsset) return;
    const message = `${action} noted for ${displayTitle(selectedAsset)}. ResourceSpace remains unchanged until live writeback is configured.`;
    setPendingDecisionById((current) => ({ ...current, [selectedAsset.id]: { status: "Read-only", message, action } }));
    setDecisionMessage(message);
    setComment((current) => current || message);
  };
  const requestGatedDownload = async () => {
    if (!selectedAsset) return;
    const payload = await downloadGate.requestDownload({ reason: `Reviewer gated download check for ${displayTitle(selectedAsset)}`, variant: "review-preview" });
    if (payload.allowed && payload.downloadUrl) {
      setDecisionMessage("Download gate approved. Opening approved copy.");
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setDecisionMessage(payload.message || payload.reason || "Download gate blocked this request.");
  };
  return (
    <div className="enterprise-page enterprise-review">
      <div className="ed-review-grid">
        <section className="ed-review-triage" aria-labelledby="review-triage-title">
          <header className="ed-review-triage-head">
            <div>
              <span className="ed-section-eyebrow">{currentQueueLabel}</span>
              <h1 id="review-triage-title">{pageTitle}</h1>
              <p>{pageSubtitle}</p>
            </div>
            <div className="ed-review-triage-count" aria-label={`${filteredQueue.length} records in current filtered queue`}>
              <strong>{filteredQueue.length.toLocaleString()}</strong>
              <span>active queue</span>
            </div>
          </header>
          <div className="ed-review-triage-grid" aria-label="Review Queue Triage summary">
            <article>
              <span>Queue</span>
              <strong>{filteredQueue.length.toLocaleString()}</strong>
              <p>{queueSearch.trim() ? `${queue.length.toLocaleString()} total in ${currentQueueLabel}; search narrows this view.` : `${currentQueueLabel} records in the active review queue.`}</p>
            </article>
            <article>
              <span>Record</span>
              <strong>{assetRecordRef(selectedAsset)}</strong>
              <p>{displayTitle(selectedAsset)} · {selectedStatus}</p>
            </article>
            <article>
              <span>Evidence</span>
              <strong>{evidenceCompletion.completed}/{evidenceCompletion.total}</strong>
              <p>{evidencePercent}% complete. Approval remains blocked until requirements pass.</p>
            </article>
            <article className={evidenceCompletion.missingLabels.length || selectedRiskFlags.length ? "is-blocked" : "is-clear"}>
              <span>Top blocker</span>
              <strong>{topBlocker}</strong>
              <p>Next safe action: {nextSafeAction}.</p>
            </article>
          </div>
        </section>
        <aside className="ed-review-list ed-panel">
          <header className="ed-review-list-head">
            <div>
              <h2>Queue list</h2>
              <p>{filteredQueue.length.toLocaleString()} active records{queueSearch.trim() ? ` from ${queue.length.toLocaleString()} queue records` : ""}.</p>
            </div>
            <IconButton label="Filter" onClick={() => setReviewListMessage("Use saved views and search for this review pass. More facets stay disabled until ResourceSpace exposes stable review fields.")}><Filter size={16} /></IconButton>
          </header>
          <SourcePill source={review.source} live={review.live} />
          <div className="ed-review-inbox-head">
            <span>{currentQueueLabel}</span>
            <strong>{filteredQueue.length.toLocaleString()} active</strong>
          </div>
          <label className="ed-review-queue-search">
            <Search size={14} aria-hidden="true" />
            <span className="sr-only">Search review queue</span>
            <input value={queueSearch} onChange={(event) => { setQueueSearch(event.target.value); setCurrentPage(1); }} placeholder="Search title, ID, collection..." />
          </label>
          <div className="ed-review-taxonomy" aria-label="Review taxonomy rail and evidence signals">
            <section>
              <header><span>Review queues</span><em>{(review.data?.queues || []).length.toLocaleString()}</em></header>
              <div>
                {(review.data?.queues || []).map((tab) => (
                  <button className={cn(queueId === tab.id && "is-active")} type="button" key={tab.id} aria-current={queueId === tab.id ? "true" : undefined} onClick={() => selectQueue(normalizeReviewQueueId(tab.id))}>
                    <span>{tab.label}</span>
                    <em title="Global saved-view record count">{tab.count.toLocaleString()} global</em>
                  </button>
                ))}
              </div>
            </section>
            <details>
              <summary><span>Evidence signals</span><em>{reviewSignals.filter((item) => item.count > 0).length.toLocaleString()}</em><ChevronDown size={14} /></summary>
              <label className="ed-taxonomy-search">
                <Search size={14} aria-hidden="true" />
                <span className="sr-only">Search review signals</span>
                <input value={reviewSignalQuery} onChange={(event) => setReviewSignalQuery(event.target.value)} placeholder="Search evidence signals..." />
              </label>
              <div>
                {reviewSignals
                  .filter((item) => item.count > 0)
                  .filter((item) => item.label.toLowerCase().includes(reviewSignalQuery.trim().toLowerCase()))
                  .map((item) => (
                    <button type="button" key={item.label} disabled title="Evidence signal only. Use queue tabs for wired filtering.">
                      <span>{item.label}</span>
                      <em>{item.count.toLocaleString()}</em>
                    </button>
                  ))}
              </div>
            </details>
            <details>
              <summary><span>Queue health</span><em>{queueMetrics.filter((item) => item.value !== "0").length.toLocaleString()}</em><ChevronDown size={14} /></summary>
              <div>
                {queueMetrics.filter((item) => item.value !== "0").map((item) => (
                  <p className={`is-${item.tone}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </p>
                ))}
              </div>
            </details>
          </div>
          {reviewListMessage ? <p className="ed-inline-success">{reviewListMessage}</p> : null}
          <div className="ed-review-list-tools" aria-label="Review queue paging controls">
            <span>Sort by</span>
            <button className="ed-sort" type="button" onClick={() => { setSortOrder((order) => order === "oldest" ? "newest" : "oldest"); setCurrentPage(1); }}>{sortOrder === "oldest" ? "Oldest first" : "Newest first"} <ChevronDown size={14} /></button>
            <button type="button" aria-label="Sort ascending" onClick={() => { setSortOrder("oldest"); setCurrentPage(1); }}><ArrowUp size={14} /></button>
            <button type="button" aria-label="Sort descending" onClick={() => { setSortOrder("newest"); setCurrentPage(1); }}><ArrowDown size={14} /></button>
            <label className="ed-page-size">
              <span>Rows per page</span>
              <select
                aria-label="Rows per review queue page"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
              >
                {reviewQueuePageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
          {pagedQueue.map((asset) => {
            const recordAgeDays = reviewWaitingDays(asset);
            const rowFlags = reviewChipLabels(asset);
            return <button className={cn("ed-queue-item", selectedAsset?.id === asset.id && "is-active")} type="button" key={asset.id} onClick={() => setSelectedId(asset.id)}><AssetThumb asset={asset} /><span><strong title={displayTitle(asset)}>{displayTitle(asset)}</strong><small>{assetType(asset)} · {formatBytes(asset.fileSizeBytes)}</small><small>Record {assetRecordRef(asset)}{recordAgeDays ? ` · ${recordAgeDays}d` : ""}</small><span className="ed-review-row-meta">{rowFlags.map((flag) => <em key={flag}>{flag}</em>)}</span>{pendingDecisionById[asset.id] || pendingWritesByAssetId[asset.id] || asset.pendingReviewWrite ? <em>Pending sync</em> : null}</span></button>;
          })}
          <nav className="ed-review-pager" aria-label="Review queue pages">
            <span>{filteredQueue.length ? `${(pageStart + 1).toLocaleString()}-${pageEnd.toLocaleString()} of ${filteredQueue.length.toLocaleString()}` : "No review records"}</span>
            <button type="button" aria-label="Previous page" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1}>‹</button>
            {Array.from({ length: Math.min(4, pageCount) }, (_, index) => index + 1).map((page) => <button className={safeCurrentPage === page ? "is-active" : ""} type="button" key={page} onClick={() => setCurrentPage(page)}>{page}</button>)}
            <button type="button" aria-label="Next page" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={safeCurrentPage === pageCount}>›</button>
          </nav>
        </aside>
        {selectedAsset ? (
          <>
            <main className="ed-review-canvas">
              <div className="ed-breadcrumb">{pageTitle} <span>/</span> ResourceSpace {assetRecordRef(selectedAsset)}</div>
              <header className="ed-detail-header">
                <div className="ed-review-title-row">
                  <div>
                    <h1 title={displayTitle(selectedAsset)}>{displayTitle(selectedAsset)}</h1>
                    <span className="ed-file-soft">{selectedStatus} · {selectedAsset.usageScope || "Do Not Publish"} · {(selectedAsset.fileExtension || assetType(selectedAsset)).toUpperCase()}</span>
                  </div>
                  <div className="ed-detail-actions">
                    <ActionButton tone="primary" icon={Save} onClick={() => queuePortalNote("Reviewer progress saved")}>Save progress</ActionButton>
                    <ActionButton icon={ArrowRight} onClick={selectNextAsset}>Next asset</ActionButton>
                    <ActionButton icon={MoreVertical} onClick={() => queuePortalNote("More reviewer actions opened")}>More actions</ActionButton>
                  </div>
                </div>
              </header>
              <section className="ed-review-next-action" aria-label="Next required review evidence">
                <span>Next required evidence</span>
                <strong>{reviewPresentation?.nextAction}</strong>
                <p>{reviewPresentation?.nextDetail}</p>
                <button type="button" onClick={() => queuePortalNote("Reviewer guidance viewed")}>View guidance</button>
              </section>
              <div className={cn("ed-hero-preview is-review", previewExpanded && "is-expanded")}>
                <span className="ed-preview-derivative-label">Portal-safe preview derivative</span>
                <AssetThumb asset={selectedAsset} className="ed-review-preview-image" fit="contain" />
                <div className="ed-preview-redaction-note" aria-label="Preview redaction notice">
                  <Lock size={14} aria-hidden="true" />
                  <span>Role-safe derivative only. Source/original hidden.</span>
                </div>
                <button className="ed-preview-corner" type="button" aria-label="Open preview record" onClick={() => queuePortalNote("Preview record opened")}>▣</button>
                <div className="ed-preview-toolbar" aria-label="Preview zoom controls">
                  <button type="button" aria-label="Zoom out" disabled title="Zoom controls are disabled until safe preview tooling is connected."><Minus size={15} /></button>
                  <button type="button" aria-label="Zoom in" disabled title="Zoom controls are disabled until safe preview tooling is connected."><Plus size={15} /></button>
                  <strong>100%</strong>
                  <button type="button" aria-label={previewExpanded ? "Collapse preview" : "Expand preview"} onClick={() => setPreviewExpanded((expanded) => !expanded)}><Grid3X3 size={15} /></button>
                </div>
                <button className="ed-preview-ratio" type="button" onClick={() => setPreviewExpanded((expanded) => !expanded)}>1:1</button>
              </div>
              <section className="ed-review-summary-strip" aria-label="Selected review record summary">
                <span><small>Record ID</small><strong>{assetRecordRef(selectedAsset)}</strong></span>
                <span><small>Rights status</small><strong>{selectedAsset.rightsStatus || "Needs evidence"}</strong></span>
                <span><small>Policy</small><strong>{selectedAsset.downloadPolicy || "not-downloadable"}</strong></span>
                <span><small>Next required action</small><strong>{topBlocker}</strong></span>
              </section>
              <section className="ed-review-governance-groups" aria-label="Review queue governance groups">
                {governanceGroups.map((group) => (
                  <span className={group.active ? "is-active" : ""} key={group.id} title={group.detail}>
                    <strong>{group.label}</strong>
                    <small>{group.active ? group.detail : "clear"}</small>
                  </span>
                ))}
              </section>
              <nav className="ed-tabs is-large" role="tablist" aria-label="Review workbench sections">{reviewWorkbenchTabs.map((tab) => <button className={activeWorkbenchTab === tab ? "is-active" : ""} type="button" role="tab" aria-selected={activeWorkbenchTab === tab} key={tab} onClick={() => setActiveWorkbenchTab(tab)}>{tab}</button>)}</nav>
              <section className="ed-card ed-metadata-card"><dl className="ed-metadata is-two">{detailRows.map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}</dl></section>
              <div className="ed-review-cards">
                <section className="ed-card ed-score-card"><h3>Metadata completeness</h3><div className="ed-score-ring">{metadataCompleteness.percent}%</div><p>{metadataCompleteness.label} required</p><button type="button" onClick={() => setActiveWorkbenchTab("Details")}>View details</button></section>
                <section className="ed-card"><h3>Risk signals</h3>{selectedGuidance.riskFlags.length ? selectedGuidance.riskFlags.slice(0, 3).map((row, index) => <p className="ed-checkline" key={`${row}-${index}`}><ShieldAlert size={16} />{row}</p>) : <p className="ed-review-muted">No elevated signal exported.</p>}{selectedGuidance.riskFlags.length > 3 ? <button type="button" onClick={() => setActiveWorkbenchTab("Rights")}>View all signals ({selectedGuidance.riskFlags.length})</button> : null}</section>
                <section className="ed-card"><h3>Review policy</h3><p>Workflow state creates next action. ResourceSpace remains final approval truth; portal queueing is not live sync unless verified.</p><button type="button" onClick={() => queuePortalNote("Review policy opened")}>View policy</button><button type="button" onClick={requestGatedDownload}>Check download gate</button></section>
              </div>
            </main>
            <aside className="ed-review-rail">
              <section className="ed-card ed-review-evidence-panel">
                <header className="ed-evidence-head">
                  <div>
                    <h3>Evidence and next action</h3>
                    <p>{selectedStatus}</p>
                  </div>
                  <strong>{evidenceCompletion.completed}/{evidenceCompletion.total}</strong>
                </header>
                <div className="ed-evidence-progress"><strong>{evidenceCompletion.completed}/{evidenceCompletion.total} checks complete</strong><span>{evidencePercent}%</span></div>
                <div className="ed-evidence-meter" aria-label={`${evidenceCompletion.completed} of ${evidenceCompletion.total} review checks complete`}><span style={{ width: `${evidencePercent}%` }} /></div>
                <p className="ed-evidence-model">Checklist model: 11 evidence checks plus 1 reviewer note. Rights checks require evidence before approval can proceed.</p>
                <p className="ed-evidence-next"><span>Next required check</span><strong>{evidenceCompletion.missingLabels[0] || "Ready for final reviewer action"}</strong></p>
                <div className="ed-evidence-table">
                  {evidenceTableRows.map(([leftLabel, leftValue, rightLabel, rightValue]) => (
                    <div key={`${leftLabel}-${rightLabel}`}>
                      <dt>{leftLabel}</dt><dd>{leftValue}</dd><dt>{rightLabel}</dt><dd>{rightValue}</dd>
                    </div>
                  ))}
                </div>
                {selectedGuidance.approveMissingLabels.length ? <p className="ed-review-missing"><AlertTriangle size={16} />Approval blocked until required evidence is complete.<span>Missing: {selectedGuidance.approveMissingLabels.slice(0, 3).join(", ")}.</span></p> : <p className="ed-inline-success">Evidence packet can be queued for approval review.</p>}
                <div className="ed-sensitive-evidence" aria-label="Sensitive ministry evidence model">
                  <h4>Sensitive ministry evidence</h4>
                  {sensitiveEvidence.map((item) => (
                    <p className={cn(item.active && "is-active", item.blocked && "is-blocked")} key={item.id}>
                      <span><strong>{item.label}</strong><small>{item.owner} · {item.detail}</small></span>
                      <em>{item.blocked ? item.missingEvidence.slice(0, 2).join(", ") : item.active ? "evidence required" : "not signaled"}</em>
                    </p>
                  ))}
                </div>
                {decisionMessage ? <p className="ed-inline-success">{decisionMessage}</p> : null}
                <div className="ed-evidence-checks">
                  {reviewEvidenceGroups.map((group) => (
                    <section className="ed-evidence-group" key={group.title}>
                      <h4>{group.title}<span>{group.fields.filter((field) => checklist[field]).length}/{group.fields.length}</span></h4>
                      {group.fields.map((field) => {
                        const item = reviewChecklistItems.find((candidate) => candidate.field === field);
                        if (!item) return null;
                        const complete = checklist[item.field];
                        const evidenceLocked = evidenceRequiredBeforeCompletion.has(item.field) && !checklist.proofLinkAttached && !complete;
                        return <label className={cn(complete && "is-complete", evidenceLocked && "is-locked")} key={item.field}><input type="checkbox" checked={complete} disabled={evidenceLocked} onChange={() => toggleChecklist(item.field)} /><span><strong>{item.label}</strong><small>{evidenceLocked ? "Add proof link or evidence note before this can be completed." : item.hint}</small></span><em>{checklistActionLabel(item.field, complete)}</em><ChevronRight size={16} /></label>;
                      })}
                      {group.title === "Approval decision" ? (
                        <label className={comment.trim().length > 10 ? "is-complete is-note" : "is-note"}>
                          <span><strong>Reviewer note</strong><small>Required for final decision</small></span>
                          <textarea className="ed-review-note" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add evidence note, reviewer name, scope, or follow-up needed..." />
                        </label>
                      ) : null}
                    </section>
                  ))}
                </div>
                <div className="ed-review-panel-actions">
                  <ActionButton tone="primary" icon={Save} onClick={() => queuePortalNote("Reviewer progress saved")}>Save progress</ActionButton>
                  <ActionButton icon={FileText} onClick={() => queuePortalNote("Submission package review requested")}>View details</ActionButton>
                </div>
                <nav className="ed-review-decision-actions" aria-label="Review decision actions">
                  <button type="button" disabled={Boolean(publicDisabledReason)} title={publicDisabledReason || "Evidence complete for public decision."} onClick={() => decide("Approved", "Approve Public")}>Queue public decision</button>
                  <button type="button" disabled={Boolean(requestInfoDisabledReason)} title={requestInfoDisabledReason || "Evidence complete for request decision."} onClick={() => decide("Needs Review", "Request More Info")}>Request evidence</button>
                  <button type="button" disabled={Boolean(restrictDisabledReason)} title={restrictDisabledReason || "Evidence complete for restriction decision."} onClick={() => decide("Restricted", "Do Not Use")}>Restrict use</button>
                </nav>
                <p className="ed-action-disabled-reason">{publicDisabledReason || "Public approval evidence checks are complete; ResourceSpace still remains final truth."}</p>
              </section>
            </aside>
          </>
        ) : <main><ErrorCard message="No reviewable ResourceSpace records found." source={review.source} /></main>}
      </div>
    </div>
  );
}
