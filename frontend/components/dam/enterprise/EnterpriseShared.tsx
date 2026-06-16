"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Cloud,
  Database,
  Download,
  Filter,
  Folder,
  HardDrive,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Star,
  type LucideIcon
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import type { DamReadinessResult, MediaSourceStatus, StockMediaAsset } from "@/lib/types";
import { useDemoRole } from "@/components/RoleProvider";
import { custodyMapRows, custodyMapStatus } from "@/lib/admin-control";
import { inspectorDrawerTabs } from "@/lib/asset-record-workbench";
import { assetDate, assetRecordRef, assetType, displayTitle, formatBytes, recordIdLabel, sourceLabel, sourceNoun } from "@/lib/enterprise-display";
import { inspectorMetadataRows } from "@/lib/enterprise-metadata";
import { assetEnterpriseStatus, statusToneClass, type EnterpriseStatus } from "@/lib/enterprise-status";
import { mediaPreviewState, mediaPreviewUnavailableReason } from "@/lib/media-preview-state";
import { presentAssetCardContext, presentAssetDetailContext } from "@/lib/portal-context-presenters";
import { routeWithRole } from "@/lib/role-routes";
import { matchesCatalogFilter } from "@/lib/catalog-language";
import { cn } from "@/lib/ui";

export function StatusBadge({ status }: { status: EnterpriseStatus }) {
  return <span className={cn("ed-badge", statusToneClass(status))}>{status}</span>;
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

export function SourcePill({ source, live }: { source?: MediaSourceStatus | null; live?: boolean }) {
  return <span className={cn("ed-source-pill", live && "is-live", source?.adapter === "demo-fallback" && "is-fallback")}>{sourceLabel(source)}</span>;
}

export function LoadingCard({ label = "Loading ResourceSpace data..." }: { label?: string }) {
  return <section className="ed-card ed-empty-state" role="status"><Database size={24} /><h2>{label}</h2><p>Source system connection pending where noted. Previews and metadata may be beta fixtures. No frontend secrets are used.</p></section>;
}

export function ErrorCard({ message, source }: { message: string; source?: MediaSourceStatus | null }) {
  return <section className="ed-card ed-empty-state"><AlertTriangle size={24} /><h2>{sourceNoun(source)} data unavailable</h2><p>{message}</p><SourcePill source={source} /></section>;
}

export function AssetThumb({ asset, className, fit = "cover" }: { asset?: StockMediaAsset; className?: string; fit?: "cover" | "contain" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [asset?.thumbnail]);
  const state = mediaPreviewState(asset, failed);
  if (!asset || state !== "Preview available") {
    return (
      <div className={cn("ed-doc-thumb", className)}>
        <strong>{asset ? assetType(asset) : "DAM"}</strong>
        <span>{state}</span>
        <small>{mediaPreviewUnavailableReason(state)}</small>
        {asset ? <small>{recordIdLabel()} {assetRecordRef(asset)}</small> : null}
      </div>
    );
  }
  return <img className={cn("ed-thumb", fit === "contain" && "is-contain", className)} src={asset.thumbnail} alt={asset.thumbnailAlt || displayTitle(asset)} onError={() => setFailed(true)} />;
}

export function AssetCard({
  asset,
  selected = false,
  onSelect,
  onQuickLook
}: {
  asset: StockMediaAsset;
  selected?: boolean;
  onSelect?: (event?: MouseEvent<HTMLButtonElement>) => void;
  onQuickLook?: () => void;
}) {
  const { role } = useDemoRole();
  const title = displayTitle(asset);
  const recordLabel = recordIdLabel();
  const recordRef = assetRecordRef(asset);
  const cardContext = presentAssetCardContext(asset, role);
  const tagChips = cardContext.tagLabels.length
    ? cardContext.tagLabels
    : Array.from(new Set([asset.collection, asset.usageScope, asset.mediaType]))
      .filter((tag) => tag && !/^(not provided|unknown|media library)$/i.test(tag))
      .slice(0, 3);
  return (
    <article className={cn("ed-asset-card", selected && "is-selected")}>
      <div className="ed-card-media">
        <button className="ed-card-preview-button" type="button" onClick={onQuickLook || onSelect} aria-label={`Open quick look for ${title}`}>
          <AssetThumb asset={asset} />
        </button>
        <span className="ed-file-chip">{assetType(asset)}</span>
        <span className="ed-check" aria-hidden="true">{selected ? <Check size={13} /> : null}</span>
        <span className="ed-card-tools" aria-label="Asset quick actions">
          <button className="ed-card-select-checkbox" type="button" onClick={(event) => onSelect?.(event)} aria-pressed={selected} aria-label={selected ? `Deselect ${title}` : `Select ${title}`}>
            <span aria-hidden="true">{selected ? <Check size={13} /> : null}</span>
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
        <span className="ed-card-date">{cardContext.sourceLabel} · {assetDate(asset)}</span>
        <button className="ed-card-hover-action" type="button" onClick={onQuickLook || onSelect}>Quick look</button>
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
    { label: "Rights & Usage", open: true, options: [
      { label: "Ready to use", filter: "portal ready" },
      { label: "Approved public", filter: "approved public" },
      { label: "Approved internal", filter: "approved internal" },
      { label: "Needs review", filter: "needs review" },
      { label: "Do not publish", filter: "archive only" }
    ] },
    { label: "Review risk", options: [
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
    { label: "File Type", open: true, options: [
      { label: "Photo", filter: "photo" },
      { label: "Video", filter: "video" },
      { label: "Audio", filter: "audio" },
      { label: "Graphic", filter: "graphic" },
      { label: "Document", filter: "document" }
    ] },
    { label: "Orientation", options: [
      { label: "Landscape", filter: "landscape" },
      { label: "Portrait", filter: "portrait" },
      { label: "Square", filter: "square" }
    ] },
    { label: "Source", options: [
      { label: "ResourceSpace", filter: "resourcespace" },
      { label: "Google Photos export", filter: "lm photos" },
      { label: "Manual upload", filter: "photographer" }
    ] },
    { label: "Metadata Completeness", options: [
      { label: "Metadata enrichment", filter: "metadata enrichment" },
      { label: "Taxonomy drift", filter: "taxonomy drift" }
    ] }
  ];
  const visualOnlyGroups: Array<{ label: string; options: string[] }> = [
    { label: "Dimensions", options: ["Web hero ready", "High resolution", "Derivative ready"] },
    { label: "Date", options: ["Recently imported", "Reviewed this year", "Needs re-review date"] }
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
    <aside className="ed-panel ed-facet-panel ed-smart-filter-rail" aria-label="Premium taxonomy rail">
      <header className="ed-filter-rail-head">
        <div>
          <span>Premium Taxonomy Rail</span>
          <strong>DAM discovery</strong>
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
        <summary><span>Tags</span><ChevronDown size={14} /></summary>
        <label className="ed-taxonomy-search">
          <Search size={14} aria-hidden="true" />
          <span className="sr-only">Search tags</span>
          <input value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} placeholder="Search tags..." />
        </label>
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
  const { role } = useDemoRole();
  const presentation = asset ? presentAssetDetailContext(asset, role, source) : null;
  const approved = Boolean(presentation?.approved);
  const status: EnterpriseStatus = presentation?.status || "Not configured";
  const blockers = presentation?.packet.viewerVerdict.blockers?.slice(0, 3) || [];
  return (
    <section className={cn("ed-card ed-verdict-card", approved ? "is-approved" : "is-blocked")}>
      <div className="ed-decision-header">
        <h3>Can I use this?</h3>
        <StatusBadge status={status} />
      </div>
      <div className="ed-verdict-body">
        <span aria-hidden="true">{approved ? <Check size={24} /> : <Lock size={22} />}</span>
        <div className="ed-verdict-summary">
          <strong>{presentation?.canUseTitle || "Review required before use"}</strong>
          <small>{presentation?.canUseSummary || `Review required before using this ${sourceNoun(source)} record.`}</small>
          <p>{presentation?.canUseReason || "Usage rights are not fully provided."}</p>
        </div>
      </div>
      {blockers.length ? <div className="ed-decision-reasons" aria-label="Decision reasons">{blockers.map((blocker) => <span key={blocker.code}>{blocker.label}</span>)}</div> : null}
      {approved ? (
        <Link className="ed-action is-primary" href={routeWithRole("/guide", role)}>View Usage Guidelines</Link>
      ) : onRequestReview ? (
        <button className="ed-action" type="button" onClick={onRequestReview}>Request DAM review</button>
      ) : asset ? (
        <Link className="ed-action" href={routeWithRole(`/assets/${asset.id}`, role)}>Open full record</Link>
      ) : (
        <Link className="ed-action" href={routeWithRole("/guide", role)}>View Usage Guidelines</Link>
      )}
    </section>
  );
}

export function InspectorDrawer({ asset, source, live }: { asset?: StockMediaAsset; source?: MediaSourceStatus | null; live?: boolean }) {
  const { role } = useDemoRole();
  const [tab, setTab] = useState(inspectorDrawerTabs[0]);
  const [message, setMessage] = useState("");
  if (!asset) return <aside className="ed-inspector ed-panel"><h2>Select an asset</h2><p>{sourceNoun(source)} search returned no visible assets.</p></aside>;
  const presentation = presentAssetDetailContext(asset, role, source);
  const tabRows = inspectorMetadataRows({ asset, tab, source });
  return (
    <aside className="ed-inspector ed-panel">
      <div className="ed-drawer-top"><span>‹</span><strong>{recordIdLabel(source)} {assetRecordRef(asset)}</strong><span>›</span><button type="button" onClick={() => setMessage("Inspector stays pinned on desktop. Select another record to change context.")}>×</button></div>
      <AssetThumb asset={asset} className="ed-inspector-preview" fit="contain" />
      <section className="ed-inspector-identity" aria-label="Selected asset identity">
        <h2 title={displayTitle(asset)}>{displayTitle(asset)}</h2>
        <div className="ed-inspector-facts">
          <span>{assetType(asset)}</span>
          <span>{formatBytes(asset.fileSizeBytes)}</span>
          <span>{assetDate(asset)}</span>
        </div>
      </section>
      <div className="ed-meta-line"><StatusBadge status={assetEnterpriseStatus(asset)} /><span>{asset.collection || "Unassigned collection"}</span></div>
      <SourcePill source={source} live={live} />
      <RightsVerdictCard asset={asset} source={source} />
      <nav className="ed-tabs" aria-label="Asset inspector tabs">{inspectorDrawerTabs.map((item) => <button className={cn(tab === item && "is-active")} type="button" key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
      <dl className="ed-metadata">
        {tabRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {message ? <p className="ed-inline-success">{message}</p> : null}
      <div className="ed-inspector-actions">
        <ActionButton tone="dark" icon={Download} disabled disabledReason="Open the full record to run the backend download gate. Original/source files remain restricted.">Download</ActionButton>
        <ActionButton icon={Folder} disabled disabledReason="Use Package Builder for governed references. This panel does not copy originals.">Add to package</ActionButton>
        <ActionButton icon={Share2} disabled disabledReason="Public links are not available in internal beta.">Share asset</ActionButton>
      </div>
      <p className="ed-action-helper">Open full record for backend download-ticket checks. Package and share actions stay disabled here; no ZIP, public link, or original copy is created.</p>
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
            Preview role-safe media, reuse state, and source evidence before opening full record.
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
          <ActionButton icon={Folder} disabled disabledReason={canUseAsset ? "Use Package Builder for governed references." : "Resolve rights review before adding this asset to a package."}>Add to package</ActionButton>
        </div>
        <p className="ed-action-helper px-5 pb-5">Quick look is read-only. Original/source files remain restricted; no package copy, ZIP, or public link is created here.</p>
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
