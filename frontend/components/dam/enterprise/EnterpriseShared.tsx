"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  FileText,
  Filter,
  Folder,
  HardDrive,
  Info,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Tags,
  type LucideIcon
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import type { DamReadinessResult, DemoRole, MediaSourceStatus, ReuseBlocker, StockMediaAsset } from "@/lib/types";
import { useDemoRole } from "@/components/RoleProvider";
import { custodyMapRows, custodyMapStatus } from "@/lib/admin-control";
import { inspectorDrawerTabs } from "@/lib/asset-record-workbench";
import { assetDate, assetRecordRef, assetType, displayTitle, formatBytes, recordIdLabel, sourceLabel, sourceNoun } from "@/lib/enterprise-display";
import { inspectorMetadataRows } from "@/lib/enterprise-metadata";
import { assetEnterpriseStatus, statusToneClass, type EnterpriseStatus } from "@/lib/enterprise-status";
import { mediaPreviewState, mediaPreviewUnavailableReason } from "@/lib/media-preview-state";
import { betaVisibilityLabel, presentAssetCardContext, presentAssetDetailContext, reuseAnswerLabel } from "@/lib/portal-context-presenters";
import { routeWithRole } from "@/lib/role-routes";
import { matchesCatalogFilter } from "@/lib/catalog-language";
import { cn } from "@/lib/ui";

export function StatusBadge({ status }: { status: EnterpriseStatus }) {
  const label = status === "Approved"
    ? "Approved for reuse"
    : status === "Missing Consent"
      ? "Consent needed"
      : status === "Restricted"
        ? "Restricted source"
        : status === "Read-only"
          ? "Internal only"
          : status;
  return <span className={cn("ed-badge", statusToneClass(status))}>{label}</span>;
}

function primaryBlockerLabel(blockers: ReuseBlocker[] = []) {
  return blockers[0]?.label || "No blocker";
}

function blockerEvidenceHint(blocker: ReuseBlocker) {
  if (blocker.code === "blocked-rights") return "Rights, consent, approved channel, or required notice evidence.";
  if (blocker.code === "blocked-people-minors") return "People visibility, youth/minors, and consent evidence.";
  if (blocker.code === "blocked-source") return "Source custody and record provenance confirmation.";
  if (blocker.code === "blocked-derivative") return "Approved derivative/copy before download or distribution.";
  if (blocker.code === "blocked-reviewer-date") return "Reviewer, review date, or lifecycle recheck.";
  if (blocker.code === "blocked-sensitive") return "Doctrine, sacrament, hymn/music, testimony, or pastoral review.";
  if (blocker.code === "blocked-archive") return "Archive/reference-only decision.";
  if (blocker.code === "blocked-do-not-use") return "Restriction or withdrawal decision.";
  return "Reviewer decision and evidence.";
}

function roleCanActOnReview(role: DemoRole) {
  return role === "Reviewer" || role === "DAM Admin";
}

function TrustAnswerStrip({
  visible,
  reuse,
  source
}: {
  visible: string;
  reuse: string;
  source?: string;
}) {
  return (
    <div className="ed-trust-answer-strip" aria-label="Beta visibility and reuse answers">
      <span><small>Beta visibility</small><strong>{visible}</strong></span>
      <span><small>Reuse/download</small><strong>{reuse}</strong></span>
      {source ? <span><small>Source truth</small><strong>{source}</strong></span> : null}
    </div>
  );
}

export function BlockedReasonList({
  blockers,
  limit = 4
}: {
  blockers?: ReuseBlocker[];
  limit?: number;
}) {
  const visibleBlockers = (blockers || []).slice(0, limit);
  if (!visibleBlockers.length) {
    return <p className="ed-inline-success"><CheckCircle2 size={16} aria-hidden="true" />No active reuse blocker in this role-safe view.</p>;
  }
  return (
    <ul className="ed-decision-reasons" aria-label="Reuse blockers">
      {visibleBlockers.map((blocker) => (
        <li key={blocker.code} title={blockerEvidenceHint(blocker)}>
          <Lock size={14} aria-hidden="true" />
          <span>
            <strong>{blocker.label}</strong>
            <small>{blockerEvidenceHint(blocker)}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function NextActionPanel({
  title,
  detail,
  action,
  onAction,
  disabled = false,
  disabledReason
}: {
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <section className="ed-card">
      <header className="ed-card-head">
        <div>
          <h3>Next required action</h3>
          <p>{title}</p>
        </div>
        <Info size={18} aria-hidden="true" />
      </header>
      <p className="ed-action-helper">{detail}</p>
      {action ? <ActionButton onClick={onAction} disabled={disabled} disabledReason={disabledReason}>{action}</ActionButton> : null}
    </section>
  );
}

export function ClearanceStatusPanel({
  asset,
  source,
  onRequestReview,
  compact = false
}: {
  asset?: StockMediaAsset;
  source?: MediaSourceStatus | null;
  onRequestReview?: () => void;
  compact?: boolean;
}) {
  const { role } = useDemoRole();
  const presentation = asset ? presentAssetDetailContext(asset, role, source) : null;
  const approved = Boolean(presentation?.approved);
  const status: EnterpriseStatus = presentation?.status || "Not configured";
  const blockers = presentation?.packet.viewerVerdict.blockers || [];
  const primaryBlocker = primaryBlockerLabel(blockers);
  const actionLabel = approved ? "View use guidance" : roleCanActOnReview(role) ? "Open review action" : "Request DAM review";

  return (
    <section className={cn("ed-card ed-verdict-card", approved ? "is-approved" : "is-blocked", compact && "is-compact")}>
      <div className="ed-decision-header">
        <h3>Reuse answer</h3>
        <StatusBadge status={status} />
      </div>
      <TrustAnswerStrip
        visible={presentation ? betaVisibilityLabel(asset) : "Visibility unknown"}
        reuse={presentation ? reuseAnswerLabel(presentation.packet.reuse.state) : "Needs review before reuse"}
        source={sourceTruthDisplay(source)}
      />
      <div className="ed-verdict-body">
        <span aria-hidden="true">{approved ? <Check size={24} /> : <Lock size={22} />}</span>
        <div className="ed-verdict-summary">
          <strong>{presentation?.canUseTitle || "Review required before use"}</strong>
          <small>{presentation?.canUseSummary || `Review required before using this ${sourceNoun(source)} record.`}</small>
          <p>{presentation?.canUseReason || "Usage rights are not fully provided."}</p>
        </div>
      </div>
      {!approved ? (
        <p className="ed-action-helper"><strong>Primary blocker:</strong> {primaryBlocker}. Evidence required before download or distribution.</p>
      ) : null}
      <BlockedReasonList blockers={blockers} />
      {approved ? (
        <Link className="ed-action is-primary" href={routeWithRole("/help", role)}>View use guidance</Link>
      ) : onRequestReview ? (
        <button className="ed-action" type="button" onClick={onRequestReview}>{actionLabel}</button>
      ) : asset ? (
        <Link className="ed-action" href={routeWithRole(`/assets/${asset.id}`, role)}>{actionLabel}</Link>
      ) : (
        <Link className="ed-action" href={routeWithRole("/help", role)}>View use guidance</Link>
      )}
    </section>
  );
}

export function MetadataGroup({
  title,
  description,
  rows,
  empty = "Not provided in current role-safe view."
}: {
  title: string;
  description?: string;
  rows: Array<[string, string | number | undefined | null]>;
  empty?: string;
}) {
  const visibleRows = rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
  return (
    <section className="ed-card">
      <header className="ed-card-head">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      {visibleRows.length ? (
        <dl className="ed-metadata">
          {visibleRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      ) : <p className="ed-empty-copy">{empty}</p>}
    </section>
  );
}

export function SuggestedTagGroup({
  approved = [],
  suggested = [],
  role,
  onDecision
}: {
  approved?: string[];
  suggested?: string[];
  role: DemoRole;
  onDecision?: (tag: string, decision: "accept" | "reject" | "ignore") => void;
}) {
  const canDecide = roleCanActOnReview(role) && Boolean(onDecision);
  return (
    <section className="ed-card">
      <header className="ed-card-head">
        <div>
          <h3>Discovery tags</h3>
          <p>Tags help search. They do not clear rights, consent, channel, or reuse.</p>
        </div>
        <Tags size={18} aria-hidden="true" />
      </header>
      {approved.length ? <div className="ed-card-tags" aria-label="Approved discovery tags">{approved.map((tag) => <span key={tag}>{tag}</span>)}</div> : <p className="ed-empty-copy">No approved discovery tags in this record.</p>}
      {suggested.length ? (
        <div className="ed-table-mini" aria-label="Suggested tags">
          {suggested.map((tag) => (
            <p key={tag}>
              <strong>{tag}</strong>
              <span>Suggested only</span>
              {canDecide ? (
                <span>
                  <button type="button" onClick={() => onDecision?.(tag, "accept")}>Accept</button>
                  <button type="button" onClick={() => onDecision?.(tag, "reject")}>Reject</button>
                  <button type="button" onClick={() => onDecision?.(tag, "ignore")}>Ignore</button>
                </span>
              ) : null}
            </p>
          ))}
        </div>
      ) : <p className="ed-action-helper">No pending suggestions. AI/helper suggestions stay separate from approved metadata.</p>}
    </section>
  );
}

export function EvidenceChecklistSummary({
  rows
}: {
  rows: Array<{ label: string; value: string; ok?: boolean; detail?: string }>;
}) {
  return (
    <section className="ed-card">
      <header className="ed-card-head">
        <div>
          <h3>Evidence summary</h3>
          <p>Evidence first, then operational follow-up.</p>
        </div>
        <FileText size={18} aria-hidden="true" />
      </header>
      <div className="ed-table-mini">
        {rows.map((row) => (
          <p className={row.ok ? "is-clear" : "is-blocked"} key={row.label}>
            <strong>{row.label}</strong>
            <span>{row.value}</span>
            {row.detail ? <small>{row.detail}</small> : null}
          </p>
        ))}
      </div>
    </section>
  );
}

export function RoleSafeActionBar({
  asset,
  role,
  onRequestReview,
  onDownloadApprovedCopy,
  onMessage
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  onRequestReview?: () => void;
  onDownloadApprovedCopy?: () => void;
  onMessage?: (message: string) => void;
}) {
  const presentation = presentAssetDetailContext(asset, role);
  const packet = presentation.packet;
  return (
    <section className="ed-card">
      <header className="ed-card-head">
        <div>
          <h3>Role-safe actions</h3>
          <p>{role} actions stay derivative-only and review-gated.</p>
        </div>
      </header>
      <div className="ed-inspector-actions">
        <ActionButton
          tone={packet.access.downloadApprovedCopy.allowed ? "primary" : "secondary"}
          icon={Download}
          disabled={!packet.access.downloadApprovedCopy.allowed}
          disabledReason={packet.access.downloadApprovedCopy.reason || "Clearance must pass before download."}
          onClick={onDownloadApprovedCopy}
        >
          Download approved copy
        </ActionButton>
        <ActionButton icon={FileText} onClick={onRequestReview}>
          {presentation.requestReviewLabel}
        </ActionButton>
        <ActionButton
          icon={Folder}
          disabled
          disabledReason="Use Distribution Sets for governed drafts. No collection membership grants permission."
          onClick={() => onMessage?.("Use Distribution Sets for governed drafts.")}
        >
          Add to distribution set
        </ActionButton>
      </div>
      {!packet.access.downloadApprovedCopy.allowed ? (
        <LockedActionNotice reason={packet.access.downloadApprovedCopy.reason || "Reviewer action required before an approved derivative can be downloaded."} />
      ) : null}
      <p className="ed-action-helper">No public links, CDN/embed, portal shortcuts, or source-file delivery in v1 beta.</p>
    </section>
  );
}

export function AdminDiagnosticCard({
  role,
  title = "Admin diagnostics",
  rows
}: {
  role: DemoRole;
  title?: string;
  rows: Array<[string, string | number | undefined | null]>;
}) {
  if (role !== "DAM Admin") return null;
  return <MetadataGroup title={title} description="Admin-only source, lifecycle, and audit diagnostics." rows={rows} />;
}

export function ReadinessSummary({
  title,
  status,
  rows,
  detail
}: {
  title: string;
  status: EnterpriseStatus;
  rows: Array<[string, string | number]>;
  detail?: string;
}) {
  return (
    <section className="ed-card">
      <header className="ed-card-head">
        <div>
          <h3>{title}</h3>
          {detail ? <p>{detail}</p> : null}
        </div>
        <StatusBadge status={status} />
      </header>
      <div className="ed-summary-grid">
        {rows.map(([value, label]) => <span key={`${label}-${value}`}><strong>{value}</strong><small>{label}</small></span>)}
      </div>
    </section>
  );
}

export function DistributionReadinessCard({
  state,
  selectedCount,
  blockerCount,
  readyCount,
  detail,
  blockers = []
}: {
  state: EnterpriseStatus;
  selectedCount: number;
  blockerCount: number;
  readyCount: number;
  detail: string;
  blockers?: string[];
}) {
  return (
    <section className="ed-card">
      <header className="ed-card-head">
        <div>
          <h3>Distribution set readiness</h3>
          <p>{detail}</p>
        </div>
        <StatusBadge status={state} />
      </header>
      <div className="ed-summary-grid">
        <span><strong>{selectedCount.toLocaleString()}</strong><small>selected</small></span>
        <span><strong>{readyCount.toLocaleString()}</strong><small>item-ready</small></span>
        <span><strong>{blockerCount.toLocaleString()}</strong><small>blockers</small></span>
        <span><strong>0</strong><small>source files</small></span>
      </div>
      {blockers.length ? <div className="ed-decision-reasons">{blockers.slice(0, 4).map((blocker) => <span key={blocker}>{blocker}</span>)}</div> : null}
      <p className="ed-action-helper">One blocked item blocks the set. Collections and distribution sets are curation, not permission.</p>
    </section>
  );
}

export function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return <button className="ed-icon-button" type="button" aria-label={label} onClick={onClick}>{children}</button>;
}

export function ActionButton({ children, tone = "secondary", icon: Icon, onClick, disabled = false, disabledReason, ariaLabel }: { children: ReactNode; tone?: "primary" | "secondary" | "dark"; icon?: LucideIcon; onClick?: () => void; disabled?: boolean; disabledReason?: string; ariaLabel?: string }) {
  return (
    <button className={cn("ed-action", tone === "primary" && "is-primary", tone === "dark" && "is-dark")} type="button" aria-label={ariaLabel} onClick={onClick} disabled={disabled} title={disabled ? disabledReason : undefined} data-disabled-reason={disabled ? disabledReason : undefined}>
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function LockedActionNotice({ title = "Download locked", reason }: { title?: string; reason: string }) {
  return (
    <p className="ed-lock-notice">
      <Lock size={15} aria-hidden="true" />
      <span>
        <strong>{title} - reviewer action required</strong>
        <small>{reason}</small>
      </span>
    </p>
  );
}

export function PageHeader({ title, subtitle, count, actions }: { title: string; subtitle?: string; count?: string; actions?: ReactNode }) {
  return (
    <header className="ed-page-header">
      <div>
        <h1>{title} {count ? <span>{count}</span> : null}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="ed-page-actions">{actions}</div> : null}
    </header>
  );
}

export function DamSegmentedNav({
  label,
  items,
  activeId,
  onSelect,
  className
}: {
  label: string;
  items: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    disabled?: boolean;
  }>;
  activeId: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <nav className={cn("ed-segmented-nav", className)} aria-label={label}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeId === item.id;
        const content = (
          <>
            {Icon ? <Icon size={15} aria-hidden="true" /> : null}
            <span>{item.label}</span>
          </>
        );

        if (item.href && !item.disabled) {
          return (
            <Link className={cn(active && "is-active")} href={item.href} key={item.id} aria-current={active ? "page" : undefined}>
              {content}
            </Link>
          );
        }

        return (
          <button
            className={cn(active && "is-active")}
            type="button"
            key={item.id}
            aria-pressed={active}
            disabled={item.disabled}
            onClick={() => onSelect?.(item.id)}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}

export type DamToolbarAction = {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  ariaLabel?: string;
};

export type DamToolbarQuickFilter = {
  id: string;
  label: string;
  active?: boolean;
  onClick: () => void;
};

export function DamToolbar({
  label = "DAM toolbar",
  searchValue,
  searchPlaceholder = "Search assets, records, packages, collections...",
  onSearchChange,
  onClearSearch,
  onOpenFilters,
  filterCount = 0,
  selectedCount = 0,
  sortControl,
  quickFilters = [],
  actions = [],
  primaryAction,
  moreAction
}: {
  label?: string;
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  onClearSearch?: () => void;
  onOpenFilters: () => void;
  filterCount?: number;
  selectedCount?: number;
  sortControl?: ReactNode;
  quickFilters?: DamToolbarQuickFilter[];
  actions?: DamToolbarAction[];
  primaryAction?: DamToolbarAction;
  moreAction?: DamToolbarAction;
}) {
  const renderAction = (action: DamToolbarAction, className?: string) => {
    const Icon = action.icon;
    return (
      <button
        className={className}
        type="button"
        key={action.label}
        aria-label={action.ariaLabel || action.label}
        disabled={action.disabled}
        title={action.disabled ? action.disabledReason : undefined}
        onClick={action.onClick}
      >
        {Icon ? <Icon size={15} aria-hidden="true" /> : null}
        <span>{action.label}</span>
      </button>
    );
  };

  return (
    <section className="ed-dam-toolbar" aria-label={label}>
      <div className="ed-dam-toolbar-main">
        <label className="ed-dam-toolbar-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search media library</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
          {searchValue ? <button type="button" onClick={onClearSearch} aria-label="Clear search">Clear</button> : null}
        </label>
        <button className="ed-dam-toolbar-filter" type="button" onClick={onOpenFilters} aria-label="Open filters">
          <Filter size={15} aria-hidden="true" />
          <span>Filters</span>
          {filterCount ? <em>{filterCount}</em> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
        {actions.length ? <div className="ed-dam-toolbar-actions">{actions.map((action) => renderAction(action))}</div> : null}
        {moreAction ? renderAction(moreAction, "ed-dam-toolbar-more") : null}
        {primaryAction ? renderAction(primaryAction, "ed-dam-toolbar-primary") : null}
      </div>
      {(selectedCount || sortControl || quickFilters.length) ? (
        <div className="ed-dam-toolbar-secondary">
          <span className="ed-dam-toolbar-selection">{selectedCount ? `${selectedCount.toLocaleString()} selected` : "No selection"}</span>
          {sortControl ? <div className="ed-dam-toolbar-sort">{sortControl}</div> : null}
          {quickFilters.length ? (
            <div className="ed-dam-toolbar-quick" aria-label="Quick filters">
              {quickFilters.map((filter) => (
                <button className={cn(filter.active && "is-active")} type="button" key={filter.id} aria-pressed={Boolean(filter.active)} onClick={filter.onClick}>
                  {filter.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function sourceTruthDisplay(source?: MediaSourceStatus | null) {
  const label = sourceLabel(source);
  if (/fixture|fallback|demo/i.test(label)) return "Local demo data";
  if (/resourcespace|dam/i.test(label)) return "Hosted DAM instance";
  if (/local/i.test(label)) return "Local demo data";
  return label;
}

export function SourcePill({ source, live }: { source?: MediaSourceStatus | null; live?: boolean }) {
  return <span className={cn("ed-source-pill", live && "is-live", source?.adapter === "demo-fallback" && "is-fallback")}>{sourceTruthDisplay(source)}</span>;
}

export function LoadingCard({ label = "Loading ResourceSpace data..." }: { label?: string }) {
  return <section className="ed-card ed-empty-state" role="status"><Database size={24} /><h2>{label}</h2><p>Source connection pending where noted. Unavailable media stays clearly marked. No frontend secrets are used.</p></section>;
}

export function ErrorCard({ message, source }: { message: string; source?: MediaSourceStatus | null }) {
  return <section className="ed-card ed-empty-state"><AlertTriangle size={24} /><h2>{sourceNoun(source)} data unavailable</h2><p>{message}</p><SourcePill source={source} /></section>;
}

function assetPreviewUrl(asset: StockMediaAsset, fit: "cover" | "contain") {
  if (asset.thumbnail) return asset.thumbnail;
  if (fit === "contain" && asset.preview) return asset.preview;
  return asset.imageUrls?.small || asset.imageUrls?.detail || asset.preview || "";
}

function previewFallbackDetail(state: ReturnType<typeof mediaPreviewState>) {
  if (state === "Preview failed") return "Approved derivative not loaded";
  if (state === "Preview restricted") return "Source/original remains restricted";
  if (state === "Unsupported file type") return "Approved derivative not loaded";
  if (state === "Preview loading") return "Loading preview state";
  return "Approved derivative not loaded";
}

function previewFallbackTone(state: ReturnType<typeof mediaPreviewState>) {
  if (state === "Preview restricted") return "is-restricted";
  if (state === "Preview failed") return "is-failed";
  return "is-unavailable";
}

export function AssetThumb({ asset, className, fit = "cover" }: { asset?: StockMediaAsset; className?: string; fit?: "cover" | "contain" }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = asset ? assetPreviewUrl(asset, fit) : "";
  useEffect(() => setFailed(false), [imageUrl]);
  const state = mediaPreviewState(asset, failed);
  if (!asset || state !== "Preview available") {
    return (
      <div className={cn("ed-doc-thumb ed-preview-fallback", previewFallbackTone(state), className)} aria-label={asset ? `Preview unavailable for ${displayTitle(asset)}` : "Preview loading"}>
        <strong>Preview unavailable</strong>
        <span>{previewFallbackDetail(state)}</span>
        <small>{state === "Preview restricted" ? "Approved derivative not loaded" : "Source/original remains restricted"}</small>
        {asset ? <small>Reference {assetRecordRef(asset)}</small> : <small>{mediaPreviewUnavailableReason(state)}</small>}
      </div>
    );
  }
  return <img className={cn("ed-thumb", fit === "contain" && "is-contain", className)} src={imageUrl} alt={asset.thumbnailAlt || displayTitle(asset)} onError={() => setFailed(true)} />;
}

export function AssetPreviewStrip({
  assets,
  title = "Preview samples",
  detail,
  className,
  limit = 5
}: {
  assets: StockMediaAsset[];
  title?: string;
  detail?: string;
  className?: string;
  limit?: number;
}) {
  const { role } = useDemoRole();
  const visibleAssets = assets.slice(0, limit);
  if (!visibleAssets.length) return null;
  return (
    <section className={cn("ed-preview-sample-strip", className)} aria-label={title}>
      <header>
        <div>
          <span>Role-safe previews</span>
          <h2>{title}</h2>
          {detail ? <p>{detail}</p> : null}
        </div>
        <strong>{visibleAssets.length.toLocaleString()} visible</strong>
      </header>
      <div>
        {visibleAssets.map((asset) => (
          <Link href={routeWithRole(`/assets/${asset.id}`, role)} key={asset.id} aria-label={`Open preview record for ${displayTitle(asset)}`}>
            <AssetThumb asset={asset} />
            <span>
              <strong>{displayTitle(asset)}</strong>
              <small>{assetRecordRef(asset)} · {assetType(asset)}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AssetCard({
  asset,
  selected = false,
  onSelect,
  onQuickLook
}: {
  asset: StockMediaAsset;
  selected?: boolean;
  onSelect?: (event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  onQuickLook?: () => void;
}) {
  const { role } = useDemoRole();
  const title = displayTitle(asset);
  const recordLabel = recordIdLabel();
  const recordRef = assetRecordRef(asset);
  const cardContext = presentAssetCardContext(asset, role);
  const tagChips = Array.from(new Set([
    asset.eventName,
    asset.collection,
    asset.mediaType === "photo" ? "Photo" : `${assetType(asset)} future-review`,
    ...(asset.tjcTerms || []),
    ...(asset.tags || [])
  ]))
      .filter((tag) => tag && !/^(not provided|unknown|media library)$/i.test(tag))
      .filter((tag) => tag !== cardContext.approvalLabel)
      .slice(0, 3);
  const handleCardSelect = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button,a,input,select,textarea,[role='button']")) return;
    onSelect?.(event);
  };
  const handleKeySelect = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    onSelect?.(event);
  };
  return (
    <article
      className={cn("ed-asset-card", selected && "is-selected")}
      data-asset-id={asset.id}
      aria-selected={selected}
      tabIndex={0}
      onClick={handleCardSelect}
      onKeyDown={handleKeySelect}
    >
      <div className="ed-card-media">
        <button className="ed-card-preview-button" type="button" onClick={onQuickLook || onSelect} aria-label={`Open quick look for ${title}`}>
          <AssetThumb asset={asset} />
        </button>
        <span className="ed-file-chip">{assetType(asset)}</span>
        <span className="ed-check">{selected ? <Check size={13} /> : null}</span>
        <span className="ed-card-tools" aria-label="Asset quick actions">
          <button type="button" onClick={(event) => onSelect?.(event)} aria-pressed={selected} aria-label={selected ? `Deselect ${title}` : `Select ${title}`}>
            <Check size={14} aria-hidden="true" />
          </button>
          <button type="button" onClick={onQuickLook || onSelect} aria-label={`Preview ${title}`}>
            <Star size={14} aria-hidden="true" />
          </button>
          <Link href={routeWithRole(`/assets/${asset.id}`, role)} aria-label={`Open record for ${title}`}>
            <MoreHorizontal size={14} aria-hidden="true" />
          </Link>
        </span>
      </div>
      <strong title={title}>{title}</strong>
      <small>
        <span>{recordLabel} {recordRef}</span>
        <span aria-hidden="true"> · </span>
        <span>{formatBytes(asset.fileSizeBytes)}</span>
      </small>
      {tagChips.length ? (
        <div className="ed-card-tags" aria-label={`Tags for ${title}`}>
          {tagChips.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      ) : null}
      <div className="ed-card-footer">
        <StatusBadge status={assetEnterpriseStatus(asset)} />
        <span className="ed-card-date">{cardContext.reuseAnswerLabel} · {cardContext.betaVisibilityLabel} · {assetDate(asset)}</span>
        <button className="ed-card-hover-action" type="button" onClick={onQuickLook || onSelect}>View details</button>
      </div>
    </article>
  );
}

export function PremiumTaxonomyRail({
  savedViews = [],
  collections = [],
  visibleAssets = [],
  source,
  activeView,
  activeCollection,
  activeFilters = [],
  filterCounts = {},
  onViewSelect,
  onCollectionSelect,
  onSavedViewsExpand,
  onFacetSelect,
  onFilterToggle,
  onClearFilters
}: {
  savedViews?: Array<{ id: string; label: string; count: number }>;
  collections?: Array<{ id: string; name: string; count: number }>;
  visibleAssets?: StockMediaAsset[];
  source?: MediaSourceStatus | null;
  activeView?: string;
  activeCollection?: string;
  activeFilters?: string[];
  filterCounts?: Record<string, number>;
  onViewSelect?: (id: string) => void;
  onCollectionSelect?: (id: string) => void;
  onSavedViewsExpand?: () => void;
  onFacetSelect?: (label: string) => void;
  onFilterToggle?: (filter: string) => void;
  onClearFilters?: () => void;
}) {
  const [tagQuery, setTagQuery] = useState("");
  const firstViews = savedViews.slice(0, 8);
  const visibleFilterCounts = useMemo(() => {
    const keys = [
      "worship", "youth", "baptism", "sermon", "choir", "retreat", "family", "nature", "stage", "pastor", "event",
      "portal ready", "approved public", "approved internal", "needs review", "archive only", "rights review", "missing source",
      "stale approval", "rendition gap", "duplicate candidate", "no people", "adults only", "people unknown", "possible minors",
      "children/youth", "photo", "video", "audio", "graphic", "document", "landscape", "portrait", "square", "resourcespace",
      "lm photos", "photographer", "metadata enrichment", "taxonomy drift"
    ];
    return Object.fromEntries(keys.map((filter) => [filter, visibleAssets.filter((asset) => matchesCatalogFilter(asset, filter)).length]));
  }, [visibleAssets]);
  const countFor = (filter: string) => filterCounts[filter] ?? visibleFilterCounts[filter];
  const tagOptions = [
    { label: "Worship", filter: "worship" },
    { label: "Youth", filter: "youth" },
    { label: "Baptism", filter: "baptism" },
    { label: "Sermon", filter: "sermon" },
    { label: "Choir", filter: "choir" },
    { label: "Retreat", filter: "retreat" },
    { label: "Family", filter: "family" },
    { label: "Nature", filter: "nature" },
    { label: "Stage", filter: "stage" },
    { label: "Pastor", filter: "pastor" },
    { label: "Event", filter: "event" }
  ];
  const visibleTags = tagOptions.filter((option) => option.label.toLowerCase().includes(tagQuery.trim().toLowerCase()));
  const wiredFilterGroups: Array<{ label: string; open?: boolean; options: Array<{ label: string; filter: string }> }> = [
    { label: "Reuse/download answer", open: true, options: [
      { label: "Reuse approved", filter: "portal ready" },
      { label: "Public approval record", filter: "approved public" },
      { label: "Internal approval record", filter: "approved internal" },
      { label: "Needs review before reuse", filter: "needs review" },
      { label: "Archive / Do Not Publish", filter: "archive only" }
    ] },
    { label: "Review state", options: [
      { label: "Rights review", filter: "rights review" },
      { label: "Missing source", filter: "missing source" },
      { label: "Stale approval", filter: "stale approval" },
      { label: "Rendition gaps", filter: "rendition gap" },
      { label: "Duplicate candidate", filter: "duplicate candidate" }
    ] },
    { label: "People / Minors", open: true, options: [
      { label: "No people", filter: "no people" },
      { label: "People visible", filter: "adults only" },
      { label: "Minors unknown", filter: "people unknown" },
      { label: "Minors confirmed", filter: "possible minors" },
      { label: "Sensitive context", filter: "children/youth" }
    ] },
    { label: "Media type", open: true, options: [
      { label: "Images", filter: "photo" },
      { label: "Graphic/document review", filter: "graphic" }
    ] },
    { label: "Orientation", options: [
      { label: "Landscape", filter: "landscape" },
      { label: "Portrait", filter: "portrait" },
      { label: "Square", filter: "square" }
    ] },
    { label: "Source custody", options: [
      { label: "DAM record", filter: "resourcespace" },
      { label: "LM Photos import", filter: "lm photos" },
      { label: "Manual upload", filter: "photographer" }
    ] },
    { label: "Metadata Completeness", options: [
      { label: "Metadata enrichment", filter: "metadata enrichment" },
      { label: "Taxonomy drift", filter: "taxonomy drift" }
    ] }
  ];
  const visualOnlyGroups: Array<{ label: string; options: string[] }> = [
    { label: "Derivative readiness", options: ["Approved copy ready", "Derivative missing", "Channel derivative pending"] },
    { label: "Approved channel", options: ["Website", "Social", "Projection", "Print", "Livestream future"] },
    { label: "Ministry / event", options: ["Sabbath", "Religious Education", "Evangelical Service", "Retreat"] },
    { label: "Date", options: ["Recently imported", "Reviewed this year", "Needs recheck date"] }
  ];
  const optionRow = ({ label, filter }: { label: string; filter: string }) => {
    const checked = activeFilters.includes(filter);
    const count = countFor(filter);
    return (
      <label className={cn("ed-filter-option", checked && "is-active")} key={filter}>
        <input type="checkbox" checked={checked} onChange={() => onFilterToggle?.(filter)} />
        <span>{label}</span>
        {typeof count === "number" ? <em>{count.toLocaleString()}</em> : null}
      </label>
    );
  };
  return (
    <aside className="ed-panel ed-facet-panel ed-smart-filter-rail" aria-label="Governed facet rail">
      <header className="ed-filter-rail-head">
        <div>
          <span>Governed facets</span>
          <strong>Find evidence, not permission</strong>
        </div>
        {activeFilters.length ? <button type="button" onClick={onClearFilters}>Clear all</button> : null}
      </header>
      <details open className="ed-filter-section">
        <summary><span>Saved views</span><button type="button" onClick={(event) => { event.preventDefault(); onSavedViewsExpand?.(); }} aria-label="Create or manage saved views"><Plus size={14} /></button></summary>
        <div className="ed-saved-view-list">
          {firstViews.map((view) => <button className={cn(activeView === view.id && "is-active")} type="button" key={view.id} aria-current={activeView === view.id ? "true" : undefined} onClick={() => onViewSelect?.(view.id)}><span>{view.label}</span><em>{view.count.toLocaleString()}</em></button>)}
          {!firstViews.length ? <p>No saved views mapped yet.</p> : <button className="ed-link-button" type="button" onClick={onSavedViewsExpand}>Show more</button>}
        </div>
      </details>
      <details open className="ed-filter-section">
        <summary><span>Collections</span><ChevronDown size={14} /></summary>
        <div className="ed-filter-options">
          {collections.slice(0, 7).map((collection) => <label className={cn("ed-filter-option", activeCollection === collection.id && "is-active")} key={collection.id}><input type="checkbox" checked={activeCollection === collection.id} onChange={() => onCollectionSelect?.(collection.id)} /><span>{collection.name}</span><em>{collection.count.toLocaleString()}</em></label>)}
          {!collections.length ? <p className="ed-filter-disabled">No collections mapped.</p> : null}
        </div>
      </details>
      <details open className="ed-filter-section">
        <summary><span>Discovery tags</span><ChevronDown size={14} /></summary>
        <label className="ed-taxonomy-search">
          <Search size={14} aria-hidden="true" />
          <span className="sr-only">Search tags</span>
          <input value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} placeholder="Search tags..." />
        </label>
        <p className="ed-action-helper">Tags support discovery only; rights and clearance live in status/evidence fields.</p>
        <div className="ed-filter-options">
          {visibleTags.length ? visibleTags.map(optionRow) : <p className="ed-filter-disabled">No matching tags.</p>}
        </div>
      </details>
      {wiredFilterGroups.map((group) => (
        <details open={group.open} className="ed-filter-section" key={group.label}>
          <summary><span>{group.label}</span><ChevronDown size={14} /></summary>
          <div className="ed-filter-options">
            {group.options.map(optionRow)}
          </div>
        </details>
      ))}
      {visualOnlyGroups.map((group) => (
        <details className="ed-filter-section" key={group.label}>
          <summary><span>{group.label}</span><ChevronDown size={14} /></summary>
          <div className="ed-filter-options">
            {group.options.map((option) => <label className="ed-filter-option is-disabled" key={option}><input type="checkbox" disabled /><span>{option}</span><em>Not mapped</em></label>)}
          </div>
        </details>
      ))}
    </aside>
  );
}

export const SavedViewPanel = PremiumTaxonomyRail;

export function RightsVerdictCard({ asset, source, onRequestReview }: { asset?: StockMediaAsset; source?: MediaSourceStatus | null; onRequestReview?: () => void }) {
  return <ClearanceStatusPanel asset={asset} source={source} onRequestReview={onRequestReview} />;
}

export function InspectorDrawer({ asset, source, live }: { asset?: StockMediaAsset; source?: MediaSourceStatus | null; live?: boolean }) {
  const { role } = useDemoRole();
  const [tab, setTab] = useState(inspectorDrawerTabs[0]);
  const [message, setMessage] = useState("");
  if (!asset) {
    return (
      <aside className="ed-inspector ed-panel ed-inspector-empty">
        <span className="ed-empty-eyebrow">Context rail</span>
        <h2>No asset selected</h2>
        <p>{sourceNoun(source)} search returned no visible assets. Use this rail to keep the next safe action obvious.</p>
        <div className="ed-empty-intel">
          <span><strong>1</strong><small>Reset filters</small></span>
          <span><strong>2</strong><small>Try saved views</small></span>
          <span><strong>3</strong><small>Request review</small></span>
        </div>
        <SourcePill source={source} live={live} />
      </aside>
    );
  }
  const presentation = presentAssetDetailContext(asset, role, source);
  const tabRows = inspectorMetadataRows({ asset, tab, source });
  return (
    <aside className="ed-inspector ed-panel">
      <header className="ed-inspector-record-header">
        <span>Selected asset</span>
        <strong>{recordIdLabel(source)} {assetRecordRef(asset)}</strong>
        <button type="button" onClick={() => setMessage("Inspector stays pinned on desktop. Select another record to change context.")}>Pinned</button>
      </header>
      <AssetThumb asset={asset} className="ed-inspector-preview" fit="contain" />
      <section className="ed-inspector-identity" aria-label="Selected asset identity">
        <h2 title={displayTitle(asset)}>{displayTitle(asset)}</h2>
        <div className="ed-inspector-facts">
          <span>{assetType(asset)}</span>
          <span>{formatBytes(asset.fileSizeBytes)}</span>
          <span>{assetDate(asset)}</span>
        </div>
      </section>
      <div className="ed-inspector-status-row">
        <StatusBadge status={assetEnterpriseStatus(asset)} />
        <span>{asset.collection || "Unassigned collection"}</span>
        <SourcePill source={source} live={live} />
      </div>
      <TrustAnswerStrip
        visible={betaVisibilityLabel(asset)}
        reuse={reuseAnswerLabel(presentation.packet.reuse.state)}
        source={sourceTruthDisplay(source)}
      />
      <RightsVerdictCard asset={asset} source={source} />
      <nav className="ed-tabs" aria-label="Asset inspector tabs">{inspectorDrawerTabs.map((item) => <button className={cn(tab === item && "is-active")} type="button" key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
      <dl className="ed-metadata">
        {tabRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {message ? <p className="ed-inline-success">{message}</p> : null}
      <div className="ed-inspector-actions">
        <ActionButton tone="dark" icon={Download} disabled disabledReason="Open the full record to run the approved-copy download gate. Source files remain restricted.">Download</ActionButton>
        <ActionButton icon={Folder} disabled disabledReason="Use Distribution Sets for governed references. This panel does not copy source files.">Add to distribution set</ActionButton>
      </div>
      <LockedActionNotice reason="Open the full record to run the approved-copy gate. Reviewer evidence, approved derivative, and source restrictions still apply." />
      <p className="ed-action-helper">Open full record for approved-copy ticket checks. Distribution actions stay gated; no ZIP, public link, or source-file copy is created.</p>
    </aside>
  );
}

export function AssetQuickLookDrawer({
  asset,
  open,
  onOpenChange,
  source,
  live
}: {
  asset?: StockMediaAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: MediaSourceStatus | null;
  live?: boolean;
}) {
  const { role } = useDemoRole();
  const [tab, setTab] = useState(inspectorDrawerTabs[0]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => setTab(inspectorDrawerTabs[0]), [asset?.id]);
  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [open, asset?.id]);
  if (!asset) return null;
  const tabRows = inspectorMetadataRows({ asset, tab, source });
  const presentation = presentAssetDetailContext(asset, role, source);
  const canUseAsset = presentation.approved;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="ed-quicklook-sheet w-[min(96vw,44rem)] max-w-none gap-0 border-l border-[#cdd9d1] bg-[#fbfdfb] p-0">
        <SheetHeader className="border-b border-[#d8e2dc] px-5 py-4">
          <SheetTitle ref={titleRef} tabIndex={-1} className="text-base font-black text-tjc-ink">Asset quick look</SheetTitle>
          <SheetDescription className="text-sm font-semibold text-tjc-muted">
            Preview role-safe media, reuse state, and clearance evidence before opening full record.
          </SheetDescription>
        </SheetHeader>
        <div className="ed-quicklook-body">
          <AssetThumb asset={asset} className="ed-quicklook-preview" fit="contain" />
          <section className="ed-quicklook-summary">
            <div>
              <span>{recordIdLabel(source)} {assetRecordRef(asset)}</span>
              <h2 title={displayTitle(asset)}>{displayTitle(asset)}</h2>
              <p>
                <span>{asset.collection || "Unassigned collection"}</span>
                <span aria-hidden="true"> · </span>
                <span>{assetType(asset)}</span>
                <span aria-hidden="true"> · </span>
                <span>{formatBytes(asset.fileSizeBytes)}</span>
              </p>
            </div>
            <div className="ed-meta-line">
              <StatusBadge status={assetEnterpriseStatus(asset)} />
              <span>{assetDate(asset)}</span>
              <SourcePill source={source} live={live} />
            </div>
          </section>
          <RightsVerdictCard asset={asset} source={source} />
          <nav className="ed-tabs" aria-label="Quick look metadata tabs">
            {inspectorDrawerTabs.map((item) => (
              <button className={cn(tab === item && "is-active")} type="button" key={item} onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </nav>
          <dl className="ed-metadata">
            {tabRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </div>
        <div className="ed-quicklook-actions">
          <Link className="ed-action is-dark" href={routeWithRole(`/assets/${asset.id}`, role)}>Open full record</Link>
          <ActionButton icon={Download} disabled disabledReason={canUseAsset ? "Use full record download gate before any approved-copy download." : "Needs review before download is available."}>Download</ActionButton>
          <ActionButton icon={Folder} disabled disabledReason={canUseAsset ? "Use Distribution Sets for governed references." : "Resolve rights review before adding this asset to a distribution set."}>Add to distribution set</ActionButton>
        </div>
        <div className="px-5 pb-3">
          <LockedActionNotice reason={canUseAsset ? "Use full record ticket gate before downloading an approved copy." : "Reviewer action required before any approved-copy download is available."} />
        </div>
        <p className="ed-action-helper px-5 pb-5">Quick look is read-only. Source files remain restricted; no distribution copy, ZIP, or public link is created here.</p>
      </SheetContent>
    </Sheet>
  );
}

export function MiniLine({ tone = "indigo" }: { tone?: "indigo" | "green" | "orange" | "red" }) {
  const values = [20, 34, 28, 36, 31, 45, 62, 38, 35, 42, 29, 51, 44, 58];
  return <svg className={cn("ed-spark", `is-${tone}`)} viewBox="0 0 140 44" aria-hidden="true"><polyline points={values.map((v, i) => `${i * 10},${44 - v * .55}`).join(" ")} /></svg>;
}

export function KpiCard({ label, value, delta, icon: Icon, danger = false, showTrend = true }: { label: string; value: string; delta: string; icon: LucideIcon; danger?: boolean; showTrend?: boolean }) {
  return (
    <article className="ed-card ed-kpi">
      <div><span>{label}</span><strong>{value}</strong><small className={danger ? "is-down" : ""}>{delta}</small><small>ResourceSpace / portal period</small></div>
      <i><Icon size={18} /></i>
      {showTrend ? <MiniLine tone={danger ? "red" : "indigo"} /> : null}
    </article>
  );
}

export function ChartCard({ title, large = false, sample = false, children }: { title: string; large?: boolean; sample?: boolean; children?: ReactNode }) {
  return (
    <section className={cn("ed-card ed-chart", large && "is-large")}>
      <header><h3>{title}</h3><button type="button" disabled title="Expanded analytics view pending beta instrumentation.">View all</button></header>
      {sample ? <p className="ed-sample-label">Sample until portal usage logging is connected</p> : null}
      {children}
    </section>
  );
}

export function CustodyMapPanel({ readiness }: { readiness?: DamReadinessResult | null }) {
  const iconById = {
    drive: HardDrive,
    resourcespace: Database,
    s3: Cloud,
    portal: ShieldCheck
  };
  const systems = custodyMapRows(readiness);
  return (
    <section className="ed-card ed-custody-map">
      <header className="ed-card-head"><div><h3>DAM custody map</h3><p>Backend truth stays layered: Drive, ResourceSpace, S3, then this UI.</p></div><StatusBadge status={custodyMapStatus(readiness, "metadata-source")} /></header>
      <div className="ed-custody-grid">
        {systems.map(({ id, name, role, detail, status }) => {
          const Icon = iconById[id];
          return <article key={id}>
            <Icon size={20} aria-hidden="true" />
            <strong>{name}</strong>
            <span>{role}</span>
            <p>{detail}</p>
            <StatusBadge status={status} />
          </article>;
        })}
      </div>
    </section>
  );
}
