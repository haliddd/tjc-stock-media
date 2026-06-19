"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Archive, Check, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight, Download, FileText, Filter, Folder, FolderPlus, Grid3X3, Inbox, List, Search, ShieldCheck, SlidersHorizontal, Tags, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePagination } from "@/components/hooks/use-pagination";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetsSearch } from "@/components/dam/useDamApi";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import type { CatalogSort, DemoRole, StockMediaAsset } from "@/lib/types";
import { assetDate } from "@/lib/enterprise-display";
import { matchesCatalogFilter, normalizeCatalogSort } from "@/lib/catalog-language";
import { canContribute, canReview } from "@/lib/permissions";
import { buildPortalReuseDecision } from "@/lib/portal-reuse-decision";
import { routeWithRole } from "@/lib/role-routes";
import {
  buildLibraryBulkActions,
  buildLibraryMetadataCsv,
  buildLibrarySelectionSummary,
  reconcileVisibleSelection,
  selectRangeInVisibleOrder,
  shouldShowBulkBar,
  toggleSelectedId,
  type BulkActionId,
  type LibraryBulkAction,
  type LibrarySelectionSummary
} from "@/lib/library-bulk-selection";
import { ActionButton, LoadingCard } from "./EnterpriseShared";

const PAGE_SIZE_OPTIONS = [15, 30, 60, 120];
type LibraryDensity = "comfortable" | "compact";
type LibraryViewMode = "table" | "grid";

const bulkActionIcons: Record<BulkActionId, typeof FolderPlus> = {
  "add-to-collection": FolderPlus,
  "create-collection": Folder,
  "request-reuse": Inbox,
  "send-review": ShieldCheck,
  "assign-tags": Tags,
  "mark-internal": CheckSquare,
  "download-approved": Download,
  "export-metadata": FileText,
  approve: CheckCircle2,
  reject: X,
  archive: Archive
};

const bulkActionPriority: Record<BulkActionId, number> = {
  "export-metadata": 0,
  "download-approved": 1,
  "send-review": 2,
  "assign-tags": 3,
  "add-to-collection": 4,
  "create-collection": 5,
  "request-reuse": 6,
  "mark-internal": 7,
  approve: 8,
  reject: 9,
  archive: 10
};

const bulkActionToolbarLabels: Partial<Record<BulkActionId, string>> = {
  "download-approved": "Request copies",
  "send-review": "Review",
  "assign-tags": "Tags"
};

const BROWSE_PHOTOS_SUBTITLE = "Find church media by event, date, ministry, album, or keyword. Open an item for use guidance before sharing.";

type LibraryTopFilterOption = { label: string; filter: string };
type LibraryTopFilterGroup = { id: string; label: string; options: LibraryTopFilterOption[] };

function dateYearFilterOptions(): LibraryTopFilterOption[] {
  const year = new Date().getFullYear();
  return [
    { label: "Recently added", filter: "recently approved" },
    { label: String(year), filter: String(year) },
    { label: String(year - 1), filter: String(year - 1) },
    { label: String(year - 2), filter: String(year - 2) },
    { label: "Needs recheck", filter: "stale approval" }
  ];
}

function libraryTopFilterGroupsForRole(role: DemoRole): LibraryTopFilterGroup[] {
  const groups: LibraryTopFilterGroup[] = [
  {
    id: "event",
    label: "Event",
    options: [
      { label: "Sabbath worship", filter: "event:worship" },
      { label: "Baptism", filter: "event:baptism" },
      { label: "Fellowship", filter: "event:fellowship" },
      { label: "Retreat", filter: "event:retreat" },
      { label: "Sermon / teaching", filter: "event:sermon" },
      { label: "Youth", filter: "event:youth" }
    ]
  },
  {
    id: "date",
    label: "Date / year",
    options: dateYearFilterOptions()
  },
  {
    id: "ministry",
    label: "Ministry",
    options: [
      { label: "Religious Education", filter: "ministry:religious education" },
      { label: "Sabbath Service", filter: "ministry:sabbath service" },
      { label: "Evangelical Service", filter: "ministry:evangelical service" },
      { label: "Fellowship", filter: "ministry:fellowship" },
      { label: "Hymns of Praise", filter: "ministry:hymns of praise" }
    ]
  },
  {
    id: "location",
    label: "Church / location",
    options: [
      { label: "Has church", filter: "has church" },
      { label: "Has region", filter: "has region" },
      { label: "Local church", filter: "church" },
      { label: "Regional", filter: "region" }
    ]
  },
  {
    id: "media",
    label: "Media Type",
    options: [
      { label: "Photos", filter: "photo" },
      { label: "Video", filter: "video" },
      { label: "Audio", filter: "audio" },
      { label: "Graphics", filter: "graphic" },
      { label: "Documents", filter: "document" }
    ]
  }
  ];

  groups.push({
    id: "access",
    label: "Access",
    options: [
      { label: canReview(role) ? "Approved public" : "Ready with permission", filter: "approved public" },
      ...(canContribute(role) ? [{ label: "Internal use", filter: "approved internal" }] : []),
      { label: "Needs permission", filter: "needs review" },
      ...(canReview(role) ? [{ label: "Archive / reference", filter: "archive only" }] : [])
    ]
  });

  return groups;
}

function selectLabelWithCount(label: string, count?: number) {
  return typeof count === "number" ? `${label} (${count.toLocaleString()})` : label;
}

function sortDisplayLabel(sortOption: CatalogSort) {
  if (sortOption === "Approved first") return "Cleared first";
  if (sortOption === "Recently approved") return "Recently cleared";
  return sortOption;
}

function mediaTypeLabel(asset: StockMediaAsset) {
  return asset.mediaType.charAt(0).toUpperCase() + asset.mediaType.slice(1);
}

function browseTitle(asset?: StockMediaAsset) {
  return asset?.title?.trim() || asset?.eventName?.trim() || asset?.collection?.trim() || "Church media";
}

function browseAlbum(asset?: StockMediaAsset) {
  return asset?.collection?.trim() || "Church media";
}

function browseEventDate(asset?: StockMediaAsset) {
  if (!asset) return "Date not provided";
  const event = asset.eventName || asset.eventSeries || browseAlbum(asset);
  return `${event} - ${assetDate(asset)}`;
}

function browseLocation(asset?: StockMediaAsset) {
  return [asset?.church, asset?.region].filter(Boolean).join(" - ") || "Location not provided";
}

function browsePreviewUrl(asset: StockMediaAsset) {
  return asset.thumbnail || asset.imageUrls?.card || asset.imageUrls?.small || asset.imageUrls?.detail || asset.preview || "";
}

type BrowseAllowedUse = "Available with permission" | "Internal only" | "Restricted";

function allowedUseForAsset(asset: StockMediaAsset, role: DemoRole): { label: BrowseAllowedUse; detail: string; nextStep: string } {
  const packet = buildPortalReuseDecision(asset, role);
  if (packet.access.downloadApprovedCopy.allowed && packet.reuse.state === "portal-ready") {
    return {
      label: "Available with permission",
      detail: "Recorded use scope is available. Ask if scope is unclear.",
      nextStep: "Request use copy"
    };
  }
  if (packet.access.downloadApprovedCopy.allowed && packet.reuse.state === "internal-ready") {
    return {
      label: "Internal only",
      detail: "Internal ministry use only.",
      nextStep: "Request permission"
    };
  }
  return {
    label: "Restricted",
    detail: "Ask the media team before reuse.",
    nextStep: "Request permission"
  };
}

function BrowseAccessBadge({ allowed }: { allowed: BrowseAllowedUse }) {
  return (
    <span className={cn("ed-badge", allowed === "Available with permission" && "is-success", allowed === "Internal only" && "is-warning", allowed === "Restricted" && "is-danger")}>
      {allowed}
    </span>
  );
}

function BrowseThumb({ asset, className, fit = "cover" }: { asset: StockMediaAsset; className?: string; fit?: "cover" | "contain" }) {
  const [failed, setFailed] = useState(false);
  const url = browsePreviewUrl(asset);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) {
    return (
      <div className={cn("ed-doc-thumb ed-preview-fallback", className)} aria-label={`Preview unavailable for ${browseTitle(asset)}`}>
        <strong>Preview unavailable</strong>
        <span>Open details or ask the media team.</span>
      </div>
    );
  }
  return <img className={cn("ed-thumb", fit === "contain" && "is-contain", className)} src={url} alt={asset.thumbnailAlt || browseTitle(asset)} onError={() => setFailed(true)} />;
}

function BrowseErrorCard({ message }: { message: string }) {
  return (
    <section className="ed-card ed-empty-state">
      <AlertTriangle size={24} aria-hidden="true" />
      <h2>Browse Media unavailable</h2>
      <p>{message}</p>
    </section>
  );
}

function BrowseDetailAnswers({
  asset,
  role,
  onMessage
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  onMessage: (message: string) => void;
}) {
  const allowed = allowedUseForAsset(asset, role);
  const title = browseTitle(asset);
  const canSeeSupportDetails = canReview(role);
  const openRequestForm = (type: "Request permission" | "Report privacy or rights issue") => {
    const params = new URLSearchParams({
      type,
      media: asset.id,
      title
    });
    window.location.assign(routeWithRole(`/requests?${params.toString()}`, role));
  };
  const requestPermission = () => openRequestForm("Request permission");
  const reportIssue = () => openRequestForm("Report privacy or rights issue");

  return (
    <>
      <dl className="ed-library-detail-grid" aria-label="Media details">
        <div><dt>Event</dt><dd>{asset.eventName || asset.eventSeries || browseAlbum(asset)}</dd></div>
        <div><dt>Date</dt><dd>{assetDate(asset)}</dd></div>
        <div><dt>Album</dt><dd>{browseAlbum(asset)}</dd></div>
        <div><dt>Type</dt><dd>{mediaTypeLabel(asset)}</dd></div>
        <div><dt>Location</dt><dd>{browseLocation(asset)}</dd></div>
      </dl>
      <section className="ed-card ed-library-usage-card">
        <header className="ed-card-head">
          <div><h3>Usage</h3><p>{allowed.detail}</p></div>
          <BrowseAccessBadge allowed={allowed.label} />
        </header>
        <div className="ed-inspector-actions">
          <ActionButton icon={Inbox} onClick={requestPermission}>Request permission</ActionButton>
          <ActionButton icon={AlertTriangle} onClick={reportIssue}>Report issue</ActionButton>
        </div>
      </section>
      {canSeeSupportDetails ? (
        <details className="ed-card ed-support-zone-details">
          <summary>Support Zone details</summary>
          <dl className="ed-metadata">
            <div><dt>Source system</dt><dd>Read-only source</dd></div>
            <div><dt>Reference</dt><dd>{asset.resourceSpaceId || asset.id}</dd></div>
            <div><dt>Review status</dt><dd>{asset.status}</dd></div>
            <div><dt>Writeback</dt><dd>Gated</dd></div>
          </dl>
        </details>
      ) : null}
    </>
  );
}

function BrowseInspectorDrawer({
  asset,
  role,
  onMessage
}: {
  asset?: StockMediaAsset;
  role: DemoRole;
  onMessage: (message: string) => void;
}) {
  if (!asset) {
    return (
      <aside className="ed-inspector ed-panel ed-inspector-empty">
        <span className="ed-empty-eyebrow">Details</span>
        <h2>No media selected</h2>
        <p>Select media to see usage guidance.</p>
        <div className="ed-empty-intel">
          <span><strong>1</strong><small>Search</small></span>
          <span><strong>2</strong><small>Filter</small></span>
          <span><strong>3</strong><small>Request permission</small></span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="ed-inspector ed-panel">
      <header className="ed-inspector-record-header">
        <span>Details</span>
        <strong>{browseTitle(asset)}</strong>
      </header>
      <BrowseThumb asset={asset} className="ed-inspector-preview" fit="contain" />
      <section className="ed-inspector-identity" aria-label="Selected media identity">
        <h2 title={browseTitle(asset)}>{browseTitle(asset)}</h2>
        <div className="ed-inspector-facts">
          <span>{mediaTypeLabel(asset)}</span>
          <span>{assetDate(asset)}</span>
          <span>{browseAlbum(asset)}</span>
        </div>
      </section>
      <BrowseDetailAnswers asset={asset} role={role} onMessage={onMessage} />
    </aside>
  );
}

function BrowseQuickLookDrawer({
  asset,
  role,
  open,
  onOpenChange,
  onMessage
}: {
  asset?: StockMediaAsset;
  role: DemoRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessage: (message: string) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [open, asset?.id]);
  if (!asset) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="ed-quicklook-sheet w-[min(96vw,44rem)] max-w-none gap-0 border-l border-[#cdd9d1] bg-[#fbfdfb] p-0">
        <SheetHeader className="border-b border-[#d8e2dc] px-5 py-4">
          <SheetTitle ref={titleRef} tabIndex={-1} className="text-base font-black text-tjc-ink">Media details</SheetTitle>
          <SheetDescription className="text-sm font-semibold text-tjc-muted">
            Event, album, and use guidance.
          </SheetDescription>
        </SheetHeader>
        <div className="ed-quicklook-body">
          <BrowseThumb asset={asset} className="ed-quicklook-preview" fit="contain" />
          <section className="ed-quicklook-summary">
            <div>
              <span>{browseEventDate(asset)}</span>
              <h2 title={browseTitle(asset)}>{browseTitle(asset)}</h2>
              <p>
                <span>{browseAlbum(asset)}</span>
                <span aria-hidden="true"> - </span>
                <span>{mediaTypeLabel(asset)}</span>
              </p>
            </div>
            <div className="ed-meta-line">
              <BrowseAccessBadge allowed={allowedUseForAsset(asset, role).label} />
              <span>{browseLocation(asset)}</span>
            </div>
          </section>
          <BrowseDetailAnswers asset={asset} role={role} onMessage={onMessage} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BulkActionButton({ action, onRun }: { action: LibraryBulkAction; onRun: (action: LibraryBulkAction) => void }) {
  const Icon = bulkActionIcons[action.id];
  const toolbarLabel = bulkActionToolbarLabels[action.id] || action.label;
  return (
    <button
      type="button"
      className={cn(action.enabled && "is-enabled", !action.enabled && "is-disabled")}
      disabled={!action.enabled}
      title={!action.enabled ? action.disabledReason : action.warning || action.statusLabel}
      data-disabled-reason={!action.enabled ? action.disabledReason : undefined}
      onClick={() => onRun(action)}
    >
      <Icon size={15} aria-hidden="true" />
      <span>
        <strong>{toolbarLabel}</strong>
        <em>{action.statusLabel}</em>
      </span>
    </button>
  );
}

function LibraryBulkActionBar({
  selectedCount,
  actions,
  onClear,
  onSelectVisible,
  onRunAction
}: {
  selectedCount: number;
  actions: LibraryBulkAction[];
  onClear: () => void;
  onSelectVisible: () => void;
  onRunAction: (action: LibraryBulkAction) => void;
}) {
  if (!shouldShowBulkBar(selectedCount)) return null;
  const toolbarActions = [...actions]
    .sort((left, right) => Number(right.enabled) - Number(left.enabled) || bulkActionPriority[left.id] - bulkActionPriority[right.id])
    .slice(0, 5);
  const overflowCount = Math.max(0, actions.length - toolbarActions.length);

  return (
    <section className="ed-library-bulk-command" aria-label="Selected media actions">
      <div className="ed-library-bulk-count">
        <CheckCircle2 size={18} aria-hidden="true" />
        <span><strong>{selectedCount.toLocaleString()}</strong> selected</span>
      </div>
      <div className="ed-library-bulk-actions">
        {toolbarActions.map((action) => <BulkActionButton key={action.id} action={action} onRun={onRunAction} />)}
      </div>
      <div className="ed-library-bulk-end">
        {overflowCount ? <span>{overflowCount} more in summary</span> : null}
        <button type="button" onClick={onSelectVisible}>Select visible media</button>
        <button type="button" onClick={onClear}><X size={14} aria-hidden="true" />Clear</button>
      </div>
    </section>
  );
}

function CountBreakdown({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <section className="ed-selection-breakdown">
      <h3>{title}</h3>
      {rows.slice(0, 5).map(([label, count]) => (
        <p key={label}><span>{label}</span><strong>{count}</strong></p>
      ))}
    </section>
  );
}

function SelectionSummaryPanel({ summary }: { summary: LibrarySelectionSummary }) {
  return (
    <aside className="ed-inspector ed-panel ed-selection-summary-panel" aria-label="Selection summary">
      <header className="ed-inspector-record-header">
        <span>Multi-select summary</span>
        <strong>{summary.count.toLocaleString()} selected</strong>
      </header>
      <div className="ed-selection-summary-hero">
        <CheckSquare size={22} aria-hidden="true" />
        <h2>{summary.count.toLocaleString()} media selected</h2>
        <p>Selected actions use cleared-use copies only.</p>
      </div>
      <CountBreakdown title="Status" rows={summary.statusBreakdown} />
      <CountBreakdown title="Type" rows={summary.typeBreakdown} />
      <CountBreakdown title="Rights / consent" rows={summary.rightsBreakdown} />
      <section className="ed-selection-breakdown">
        <h3>Shared tags</h3>
        {summary.sharedTags.length ? (
          <div className="ed-selection-tags">{summary.sharedTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        ) : <p><span>No shared tags across all selected media</span></p>}
      </section>
      <section className="ed-selection-breakdown">
        <h3>Selected media</h3>
        <p><span>{summary.references.join(", ") || "No public references"}</span></p>
      </section>
      <section className="ed-selection-breakdown">
        <h3>Available next steps</h3>
        {summary.actions.map((action) => (
          <p key={action.id} className={!action.enabled ? "is-disabled" : undefined}>
            <span>{action.label}</span>
            <strong>{action.statusLabel}</strong>
          </p>
        ))}
      </section>
      {summary.warnings.length ? (
        <div className="ed-selection-warnings">
          {summary.warnings.map((warning) => <p key={warning}><AlertTriangle size={14} aria-hidden="true" />{warning}</p>)}
        </div>
      ) : null}
    </aside>
  );
}

function LibraryFilterSelect({
  label,
  value,
  placeholder,
  onChange,
  children
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="ed-library-filter-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        <option value="">{placeholder}</option>
        {children}
      </select>
    </label>
  );
}

function AppliedFilterBar({
  query,
  savedViews = [],
  collections = [],
  activeView,
  activeCollection,
  viewLabel,
  collectionLabel,
  filters,
  filterGroups,
  filterCounts = {},
  visibleAssets,
  resultCount,
  onClearQuery,
  onClearView,
  onClearCollection,
  onRemoveFilter,
  onViewSelect,
  onCollectionSelect,
  onSetFilterGroup,
  onClearAll,
  onOpenFilters,
  showInlineControls
}: {
  query: string;
  savedViews?: Array<{ id: string; label: string; count: number }>;
  collections?: Array<{ id: string; name: string; count: number }>;
  activeView: string;
  activeCollection: string;
  viewLabel?: string;
  collectionLabel?: string;
  filters: string[];
  filterGroups: LibraryTopFilterGroup[];
  filterCounts?: Record<string, number>;
  visibleAssets: StockMediaAsset[];
  resultCount?: number;
  onClearQuery: () => void;
  onClearView: () => void;
  onClearCollection: () => void;
  onRemoveFilter: (filter: string) => void;
  onViewSelect: (id: string) => void;
  onCollectionSelect: (id: string) => void;
  onSetFilterGroup: (group: LibraryTopFilterGroup, filter: string) => void;
  onClearAll: () => void;
  onOpenFilters: () => void;
  showInlineControls: boolean;
}) {
  const chips = [
    ...(query ? [{ key: "query", label: `Search: ${query}`, onRemove: onClearQuery }] : []),
    ...(viewLabel ? [{ key: "view", label: `Saved view: ${viewLabel}`, onRemove: onClearView }] : []),
    ...(collectionLabel ? [{ key: "collection", label: `Album: ${collectionLabel}`, onRemove: onClearCollection }] : []),
    ...filters.map((filter) => ({ key: `filter-${filter}`, label: filter.replace(/\b\w/g, (letter) => letter.toUpperCase()), onRemove: () => onRemoveFilter(filter) }))
  ];
  const countFor = (filter: string) => filterCounts[filter] ?? visibleAssets.filter((asset) => matchesCatalogFilter(asset, filter)).length;
  const selectedFilterForGroup = (group: LibraryTopFilterGroup) => group.options.find((option) => filters.includes(option.filter))?.filter || "";

  return (
    <section className="ed-applied-filter-bar" aria-label="Browse Media filters">
      <button className="ed-mobile-filter-trigger" type="button" onClick={onOpenFilters}>
        <SlidersHorizontal size={15} aria-hidden="true" />
        Filters
        {chips.length ? <em>{chips.length}</em> : null}
      </button>
      <div className="ed-filterbar-summary">
        <strong>{typeof resultCount === "number" ? `${resultCount.toLocaleString()} results` : "Results"}</strong>
        <span>{chips.length ? `${chips.length} active filter${chips.length === 1 ? "" : "s"}` : "No filters applied"}</span>
      </div>
      {showInlineControls ? <div className="ed-discovery-filter-controls">
        <LibraryFilterSelect label="Saved search" value={activeView} placeholder="All saved searches" onChange={onViewSelect}>
          {savedViews.map((item) => <option value={item.id} key={item.id}>{selectLabelWithCount(item.label, item.count)}</option>)}
        </LibraryFilterSelect>
        <LibraryFilterSelect label="Album" value={activeCollection} placeholder="All albums" onChange={onCollectionSelect}>
          {collections.map((item) => <option value={item.id} key={item.id}>{selectLabelWithCount(item.name, item.count)}</option>)}
        </LibraryFilterSelect>
        {filterGroups.map((group) => (
          <LibraryFilterSelect
            key={group.id}
            label={group.label}
            value={selectedFilterForGroup(group)}
            placeholder="Any"
            onChange={(value) => onSetFilterGroup(group, value)}
          >
            {group.options.map((option) => <option value={option.filter} key={option.filter}>{selectLabelWithCount(option.label, countFor(option.filter))}</option>)}
          </LibraryFilterSelect>
        ))}
      </div> : null}
      <div className="ed-filterbar-actions">
        <button className="ed-more-filters" type="button" onClick={onOpenFilters}>
          <Filter size={15} aria-hidden="true" />
          Filters
        </button>
        <button className="ed-clear-filters" type="button" onClick={onClearAll} disabled={!chips.length}>Clear filters</button>
      </div>
      {chips.length ? (
        <div className="ed-applied-chips">
          {chips.map((chip) => (
            <button type="button" key={chip.key} onClick={chip.onRemove}>
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BrowseFilterPanel({
  savedViews = [],
  collections = [],
  visibleAssets = [],
  activeView,
  activeCollection,
  activeFilters = [],
  filterGroups,
  filterCounts = {},
  onViewSelect,
  onCollectionSelect,
  onSavedViewsExpand,
  onFilterToggle,
  onClearFilters
}: {
  savedViews?: Array<{ id: string; label: string; count: number }>;
  collections?: Array<{ id: string; name: string; count: number }>;
  visibleAssets?: StockMediaAsset[];
  activeView?: string;
  activeCollection?: string;
  activeFilters?: string[];
  filterGroups: LibraryTopFilterGroup[];
  filterCounts?: Record<string, number>;
  onViewSelect?: (id: string) => void;
  onCollectionSelect?: (id: string) => void;
  onSavedViewsExpand?: () => void;
  onFilterToggle?: (filter: string) => void;
  onClearFilters?: () => void;
}) {
  const countFor = (filter: string) => filterCounts[filter] ?? visibleAssets.filter((asset) => matchesCatalogFilter(asset, filter)).length;
  const optionRow = ({ label, filter }: LibraryTopFilterOption) => {
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
    <aside className="ed-panel ed-facet-panel ed-smart-filter-rail" aria-label="Browse Media filters">
      <header className="ed-filter-rail-head">
        <div>
          <span>Browse Media</span>
          <strong>Filters</strong>
        </div>
        {activeFilters.length ? <button type="button" onClick={onClearFilters}>Clear all</button> : null}
      </header>
      <details open className="ed-filter-section">
        <summary><span>Albums</span><ChevronRight size={14} /></summary>
        <div className="ed-filter-options">
          {collections.slice(0, 8).map((collection) => (
            <label className={cn("ed-filter-option", activeCollection === collection.id && "is-active")} key={collection.id}>
              <input type="checkbox" checked={activeCollection === collection.id} onChange={() => onCollectionSelect?.(collection.id)} />
              <span>{collection.name}</span>
              <em>{collection.count.toLocaleString()}</em>
            </label>
          ))}
          {!collections.length ? <p className="ed-filter-disabled">No albums available.</p> : null}
        </div>
      </details>
      <details open className="ed-filter-section">
        <summary><span>Saved searches</span><ChevronRight size={14} /></summary>
        <div className="ed-filter-section-toolbar">
          <button type="button" onClick={onSavedViewsExpand} aria-label="Save current search">Save</button>
        </div>
        <div className="ed-saved-view-list">
          {savedViews.slice(0, 8).map((view) => (
            <button className={cn(activeView === view.id && "is-active")} type="button" key={view.id} aria-current={activeView === view.id ? "true" : undefined} onClick={() => onViewSelect?.(view.id)}>
              <span>{view.label}</span>
              <em>{view.count.toLocaleString()}</em>
            </button>
          ))}
          {!savedViews.length ? <p>No saved searches yet.</p> : <button className="ed-link-button" type="button" onClick={onSavedViewsExpand}>Show more</button>}
        </div>
      </details>
      {filterGroups.map((group) => (
        <details open={group.id === "event" || group.id === "date" || group.id === "media"} className="ed-filter-section" key={group.id}>
          <summary><span>{group.label}</span><ChevronRight size={14} /></summary>
          <div className="ed-filter-options">
            {group.options.map(optionRow)}
          </div>
        </details>
      ))}
      <p className="ed-action-helper">Filters narrow media; item details keep usage guidance.</p>
    </aside>
  );
}

function LibrarySavedViewStrip({
  savedViews = [],
  activeView,
  activeCollection,
  total,
  onViewSelect,
  onCollectionClear,
  onClearAll,
  onSaveSearch,
  canSaveSearch
}: {
  savedViews?: Array<{ id: string; label: string; count: number }>;
  activeView: string;
  activeCollection: string;
  total?: number;
  onViewSelect: (id: string) => void;
  onCollectionClear: () => void;
  onClearAll: () => void;
  onSaveSearch: () => void;
  canSaveSearch: boolean;
}) {
  const visibleViews = savedViews.slice(0, 6);
  return (
    <section className="ed-library-saved-view-strip" aria-label="Saved Browse Media searches">
      <div>
        <span><Folder size={14} aria-hidden="true" />Saved searches</span>
        <strong>{typeof total === "number" ? `${total.toLocaleString()} visible media` : "Browse Media"}</strong>
        <small>Open common searches without changing permission checks.</small>
      </div>
      <nav aria-label="Saved search shortcuts">
        <button type="button" className={!activeView && !activeCollection ? "is-active" : undefined} onClick={onClearAll}>
          All media
          {typeof total === "number" ? <span>{total.toLocaleString()}</span> : null}
        </button>
        {visibleViews.map((item) => (
          <button
            type="button"
            className={activeView === item.id ? "is-active" : undefined}
            key={item.id}
            onClick={() => onViewSelect(item.id)}
          >
            {item.label}
            <span>{item.count.toLocaleString()}</span>
          </button>
        ))}
        {activeCollection ? <button type="button" className="is-active" onClick={onCollectionClear}>Album active</button> : null}
        <button type="button" onClick={onSaveSearch} disabled={!canSaveSearch}>Save search</button>
      </nav>
    </section>
  );
}

function LibraryBrowserTopBar({
  query,
  searchPlaceholder,
  onSearchChange,
  onClearSearch,
  onOpenFilters,
  filterCount,
  selectedCount,
  resultCount,
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
  sort,
  onSortChange,
  inspectorOpen,
  onInspectorToggle,
  canUsePowerTools
}: {
  query: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenFilters: () => void;
  filterCount: number;
  selectedCount: number;
  resultCount?: number;
  viewMode: LibraryViewMode;
  onViewModeChange: (mode: LibraryViewMode) => void;
  density: LibraryDensity;
  onDensityChange: (density: LibraryDensity) => void;
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
  inspectorOpen: boolean;
  onInspectorToggle: () => void;
  canUsePowerTools: boolean;
}) {
  return (
    <header className="ed-library-v3-topbar" aria-label="Browse Media controls">
      <div className="ed-library-v3-title">
        <span>Browse Media</span>
        <h1>Media Library</h1>
        <small>{BROWSE_PHOTOS_SUBTITLE}</small>
        {typeof resultCount === "number" ? <small>{resultCount.toLocaleString()} items</small> : null}
      </div>
      <label className="ed-library-v3-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Search Browse Media</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
        {query ? <button type="button" onClick={onClearSearch} aria-label="Clear search">Clear</button> : null}
      </label>
      <div className="ed-library-v3-controls">
        <button className="ed-library-v3-filter-button" type="button" onClick={onOpenFilters}>
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filters
          {filterCount ? <em>{filterCount}</em> : null}
        </button>
        <div className="ed-view-toggle" aria-label="Asset view mode">
          <button type="button" className={viewMode === "grid" ? "is-active" : ""} aria-pressed={viewMode === "grid"} aria-label="Gallery view" onClick={() => onViewModeChange("grid")}><Grid3X3 size={15} aria-hidden="true" />Gallery</button>
          <button type="button" className={viewMode === "table" ? "is-active" : ""} aria-pressed={viewMode === "table"} aria-label="List view" onClick={() => onViewModeChange("table")}><List size={15} aria-hidden="true" />List</button>
        </div>
        {canUsePowerTools ? <div className="ed-library-density-toggle" aria-label="Grid density">
          <button type="button" className={density === "comfortable" ? "is-active" : ""} onClick={() => onDensityChange("comfortable")}>Comfort</button>
          <button type="button" className={density === "compact" ? "is-active" : ""} onClick={() => onDensityChange("compact")}>Dense</button>
        </div> : null}
        {canUsePowerTools ? <label className="ed-library-v3-sort">
          <span className="sr-only">Sort media</span>
          <select aria-label="Sort media" value={sort} onChange={(event) => onSortChange(event.target.value as CatalogSort)}>
            {(["Approved first", "Recently approved", "Newest", "A-Z"] as CatalogSort[]).map((option) => (
              <option value={option} key={option}>{sortDisplayLabel(option)}</option>
            ))}
          </select>
        </label> : null}
        <button className="ed-library-v3-inspector-button" type="button" onClick={onInspectorToggle} aria-pressed={inspectorOpen}>
          {inspectorOpen ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronLeft size={15} aria-hidden="true" />}
          Details
        </button>
        {canUsePowerTools ? <strong className="ed-library-v3-selected">{selectedCount ? `${selectedCount.toLocaleString()} selected` : "No selection"}</strong> : null}
      </div>
    </header>
  );
}

function LibraryPaginationControls({
  rangeStart,
  rangeEnd,
  total,
  pageSize,
  onPage,
  onPageSizeChange,
  loading = false,
  variant = "primary"
}: {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
}) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const currentPage = total ? Math.max(1, Math.ceil(rangeStart / Math.max(1, pageSize))) : 1;
  const isSecondary = variant === "secondary";
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: isSecondary ? 3 : 5,
  });
  const pageText = `Page ${currentPage.toLocaleString()} of ${totalPages.toLocaleString()}`;
  const compactRangeText = total
    ? `Showing ${rangeStart.toLocaleString()}\u2013${rangeEnd.toLocaleString()}`
    : "No matching media";
  const summaryText = total
    ? `Showing ${rangeStart.toLocaleString()}\u2013${rangeEnd.toLocaleString()} of ${total.toLocaleString()} \u00b7 ${pageText}`
    : "No matching media";

  return (
    <div className={cn("ed-library-pagination", isSecondary ? "is-secondary" : "is-primary")} aria-label={isSecondary ? "Secondary Browse Media pagination" : "Browse Media pagination"}>
      <div className="ed-library-pagination-summary">
        <strong>
          {loading ? "Loading results" : (
            <>
              <span className="ed-page-range-full">{summaryText}</span>
              <span className="ed-page-range-short">{compactRangeText}</span>
            </>
          )}
        </strong>
      </div>

      {!isSecondary ? <label className="ed-library-page-size">
        <span>Per page</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Results per page"
          disabled={loading}
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label> : null}

      <Pagination className="ed-library-pagination-nav">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={loading || currentPage <= 1}
              onClick={() => onPage(currentPage - 1)}
            >
              <ChevronLeft size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>Previous</span>
            </PaginationPrevious>
          </PaginationItem>
          {!isSecondary ? (
            <PaginationItem className="ed-library-page-status-mobile-item">
              <span className="ed-library-page-status">{pageText}</span>
            </PaginationItem>
          ) : null}

          {!isSecondary && showLeftEllipsis ? (
            <>
              <PaginationItem className="ed-library-numbered-page">
                <PaginationLink disabled={loading} onClick={() => onPage(1)}>1</PaginationLink>
              </PaginationItem>
              <PaginationItem className="ed-library-numbered-page">
                <PaginationEllipsis />
              </PaginationItem>
            </>
          ) : null}

          {!isSecondary ? pages.map((page) => (
            <PaginationItem className="ed-library-numbered-page" key={page}>
              <PaginationLink
                disabled={loading || page === currentPage}
                isActive={page === currentPage}
                onClick={() => onPage(page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )) : null}

          {!isSecondary && showRightEllipsis ? (
            <>
              <PaginationItem className="ed-library-numbered-page">
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem className="ed-library-numbered-page">
                <PaginationLink disabled={loading} onClick={() => onPage(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          ) : null}

          <PaginationItem>
            <PaginationNext
              disabled={loading || currentPage >= totalPages}
              onClick={() => onPage(currentPage + 1)}
            >
              <span>Next</span>
              <ChevronRight size={15} strokeWidth={1.9} aria-hidden="true" />
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function BrowseAssetCard({
  asset,
  role,
  selected = false,
  onSelect,
  onQuickLook
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  selected?: boolean;
  onSelect?: (event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  onQuickLook?: () => void;
}) {
  const title = browseTitle(asset);
  const allowed = allowedUseForAsset(asset, role);
  const canBulkSelect = canReview(role);
  const handleCardSelect = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button,a,input,select,textarea,[role='button']")) return;
    if (canBulkSelect) onSelect?.(event);
    else onQuickLook?.();
  };
  return (
    <article
      className={cn("ed-asset-card", selected && "is-selected")}
      data-asset-id={asset.id}
      onClick={handleCardSelect}
    >
      <div className="ed-card-media">
        <button className="ed-card-preview-button" type="button" onClick={onQuickLook || onSelect} aria-label={`View details for ${title}`}>
          <BrowseThumb asset={asset} />
        </button>
        {canBulkSelect ? <button
          className="ed-card-select-control"
          type="button"
          onClick={(event) => onSelect?.(event)}
          aria-pressed={selected}
          aria-label={selected ? `Deselect ${title}` : `Select ${title}`}
        >
          {selected ? <Check size={13} aria-hidden="true" /> : null}
        </button> : null}
        <span className="ed-card-status"><BrowseAccessBadge allowed={allowed.label} /></span>
      </div>
      <strong title={title}>{title}</strong>
      <small className="ed-card-meta-row">
        <span>{asset.eventName || asset.eventSeries || browseAlbum(asset)}</span>
        <span>{assetDate(asset)}</span>
      </small>
      <small className="ed-card-meta-row">
        <span>{browseAlbum(asset)}</span>
        <span>{mediaTypeLabel(asset)}</span>
      </small>
      <span className="ed-card-next-step">{allowed.nextStep}</span>
    </article>
  );
}

function LibraryResultList({
  assets,
  role,
  selectedIds,
  onSelect,
  onQuickLook
}: {
  assets: StockMediaAsset[];
  role: DemoRole;
  selectedIds: string[];
  onSelect: (asset: StockMediaAsset, event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  onQuickLook: (asset: StockMediaAsset) => void;
}) {
  const shouldIgnoreRowClick = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest("button,a,input,select,textarea,[role='button']"));
  const canBulkSelect = canReview(role);
  return (
    <>
      <div className="ed-mobile-card-list" aria-label="Browse Media results">
        {assets.map((asset) => {
          const allowed = allowedUseForAsset(asset, role);
          const selected = selectedIds.includes(asset.id);
          const title = browseTitle(asset);
          return (
            <article
              key={asset.id}
              className={cn(selected && "is-selected")}
              data-asset-id={asset.id}
              onClick={(event) => {
                if (shouldIgnoreRowClick(event.target)) return;
                if (canBulkSelect) onSelect(asset, event);
                else onQuickLook(asset);
              }}
            >
              <button className="ed-card-preview-button" type="button" onClick={() => onQuickLook(asset)} aria-label={`View details for ${title}`}>
                <BrowseThumb asset={asset} />
              </button>
              <header>
                {canBulkSelect ? <label className="ed-selection-check" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => onSelect(asset, event as unknown as MouseEvent<HTMLElement>)}
                    aria-label={selected ? `Deselect ${title}` : `Select ${title}`}
                  />
                  <span>{selected ? <Check size={13} aria-hidden="true" /> : null}</span>
                </label> : null}
                <strong>{title}</strong>
                <BrowseAccessBadge allowed={allowed.label} />
              </header>
              <p>{browseEventDate(asset)}</p>
              <span>{browseAlbum(asset)} - {browseLocation(asset)} - {mediaTypeLabel(asset)}</span>
              <p><strong>Next:</strong> {allowed.nextStep}</p>
              <button type="button" onClick={() => onQuickLook(asset)}>View details</button>
            </article>
          );
        })}
      </div>
      <table className="ed-table ed-desktop-table" aria-label="Browse Media results">
        <thead>
          <tr>
            <th>Media</th>
            <th>Event / date</th>
            <th>Ministry / location</th>
            <th>Usage</th>
            <th>Next step</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const allowed = allowedUseForAsset(asset, role);
            const selected = selectedIds.includes(asset.id);
            const title = browseTitle(asset);
            return (
              <tr
                key={asset.id}
                className={selected ? "is-active" : undefined}
                data-asset-id={asset.id}
                onClick={(event) => {
                  if (shouldIgnoreRowClick(event.target)) return;
                  if (canBulkSelect) onSelect(asset, event);
                  else onQuickLook(asset);
                }}
              >
                <td>
                  <div className="ed-row-media">
                    {canBulkSelect ? <label className="ed-selection-check" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => onSelect(asset, event as unknown as MouseEvent<HTMLElement>)}
                        aria-label={selected ? `Deselect ${title}` : `Select ${title}`}
                      />
                      <span>{selected ? <Check size={13} aria-hidden="true" /> : null}</span>
                      <BrowseThumb asset={asset} />
                    </label> : <button className="ed-card-preview-button" type="button" onClick={() => onQuickLook(asset)} aria-label={`View details for ${title}`}><BrowseThumb asset={asset} /></button>}
                    <span><strong>{title}</strong><small>{browseEventDate(asset)}</small></span>
                  </div>
                </td>
                <td><span className="ed-table-primary">{asset.eventName || asset.eventSeries || browseAlbum(asset)}</span><small>{assetDate(asset)}</small></td>
                <td><span>{asset.tjcTerms?.[0] || asset.tags?.[0] || browseAlbum(asset)}</span><small>{browseLocation(asset)}</small></td>
                <td><BrowseAccessBadge allowed={allowed.label} /><small>{allowed.detail}</small></td>
                <td><strong className="ed-row-ref">{allowed.nextStep}</strong></td>
                <td>
                  <div className="ed-library-row-actions">
                    <button className="ed-row-open" type="button" aria-label={`View details for ${title}`} onClick={() => onQuickLook(asset)}>Details</button>
                    {canBulkSelect ? <button className={cn("ed-row-select", selected && "is-selected")} type="button" aria-pressed={selected} onClick={(event) => onSelect(asset, event)}>
                      {selected ? <><CheckCircle2 size={13} aria-hidden="true" />Selected</> : "Select"}
                    </button> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function EnterpriseLibraryPage() {
  const { role } = useDemoRole();
  const canUsePowerTools = canReview(role);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams?.get("q") || "");
  const [intent, setIntent] = useState(() => searchParams?.get("intent") || "");
  const [view, setView] = useState(() => searchParams?.get("view") || "");
  const [collection, setCollection] = useState(() => searchParams?.get("collection") || "");
  const [filters, setFilters] = useState<string[]>(() => searchParams?.getAll("filter") || []);
  const [sort, setSort] = useState<CatalogSort>(() => normalizeCatalogSort(searchParams?.get("sort")));
  const [viewMode, setViewMode] = useState<LibraryViewMode>("grid");
  const [density, setDensity] = useState<LibraryDensity>("comfortable");
  const [limit, setLimit] = useState(30);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [quickLookId, setQuickLookId] = useState<string | null>(null);
  const [libraryMessage, setLibraryMessage] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [marquee, setMarquee] = useState<{ active: boolean; additive: boolean; startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const search = useAssetsSearch({ role, query, filters, view: view || undefined, collection: collection || undefined, intent: intent || undefined, sort, limit, offset });
  const assets = search.data?.assets || [];
  const visibleIds = useMemo(() => assets.map((asset) => asset.id), [assets]);
  const discovery = search.data?.discovery;
  const noResultHelp = discovery?.noResultHelp;
  const savedViewLabel = search.data?.savedViews?.find((item) => item.id === view)?.label;
  const collectionLabel = search.data?.collections?.find((item) => item.id === collection)?.name;
  const activeFilterCount = (query ? 1 : 0) + (view ? 1 : 0) + (collection ? 1 : 0) + filters.length;
  const filterCounts = useMemo(() => {
    const entries = discovery?.suggestedFilters?.map((item) => [item.filter, item.count] as const) || [];
    return Object.fromEntries(entries);
  }, [discovery?.suggestedFilters]);
  const topFilterGroups = useMemo(() => libraryTopFilterGroupsForRole(role), [role]);
  useEffect(() => {
    setViewMode("grid");
  }, [role]);
  useEffect(() => {
    if (!selectedId) return;
    if (!assets.some((asset) => asset.id === selectedId)) setSelectedId(null);
  }, [assets, selectedId]);
  useEffect(() => {
    if (!selectedIds.length) return;
    const reconciled = reconcileVisibleSelection(selectedIds, visibleIds);
    if (!reconciled.hiddenCount) return;
    setSelectedIds(reconciled.nextIds);
    setSelectionAnchorId(reconciled.nextIds[reconciled.nextIds.length - 1] || null);
    setLibraryMessage(`${reconciled.hiddenCount.toLocaleString()} hidden selected media item${reconciled.hiddenCount === 1 ? "" : "s"} cleared after page, filter, sort, or role change.`);
  }, [selectedIds, visibleIds]);
  useEffect(() => {
    const clearOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || !selectedIds.length) return;
      setSelectedIds([]);
      setSelectionAnchorId(null);
      setLibraryMessage("Selection cleared.");
    };
    window.addEventListener("keydown", clearOnEscape);
    return () => window.removeEventListener("keydown", clearOnEscape);
  }, [selectedIds.length]);
  useEffect(() => {
    setOffset(0);
    setSelectedId(null);
    setSelectedIds([]);
    setSelectionAnchorId(null);
  }, [query, intent, filters, view, collection, sort, role]);
  const selectedAssets = useMemo(() => selectedIds.map((id) => assets.find((asset) => asset.id === id)).filter((asset): asset is StockMediaAsset => Boolean(asset)), [assets, selectedIds]);
  const selected = selectedAssets.length === 1 ? selectedAssets[0] : selectedId ? assets.find((asset) => asset.id === selectedId) : inspectorOpen ? assets[0] : undefined;
  const selectionSummary = useMemo(() => selectedAssets.length > 1 ? buildLibrarySelectionSummary(selectedAssets, role) : null, [role, selectedAssets]);
  const bulkActions = useMemo(() => buildLibraryBulkActions(selectedAssets, role), [role, selectedAssets]);
  const quickLookAsset = assets.find((asset) => asset.id === quickLookId) || null;
  const pagination = search.data?.pagination;
  const toggleAsset = (asset: StockMediaAsset, event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    const shiftKey = Boolean(event && "shiftKey" in event && event.shiftKey);
    const additive = Boolean(event && "metaKey" in event && (event.metaKey || event.ctrlKey));
    setSelectedId(asset.id);
    setInspectorOpen(true);
    setSelectedIds((current) => shiftKey
      ? selectRangeInVisibleOrder({ currentIds: current, visibleIds, anchorId: selectionAnchorId || selectedId, targetId: asset.id, additive })
      : toggleSelectedId(current, asset.id));
    setSelectionAnchorId(asset.id);
  };
  const openQuickLook = (asset: StockMediaAsset) => {
    setSelectedId(asset.id);
    setInspectorOpen(true);
    setQuickLookId(asset.id);
  };
  const clearSelection = () => {
    setSelectedIds([]);
    setSelectedId(null);
    setSelectionAnchorId(null);
    setInspectorOpen(false);
    announceLibraryAction("Selection cleared.");
  };
  const selectAllVisible = () => {
    setSelectedIds(visibleIds);
    setSelectionAnchorId(visibleIds[0] || null);
    if (visibleIds[0]) setSelectedId(visibleIds[0]);
    setInspectorOpen(Boolean(visibleIds.length));
    announceLibraryAction(`${visibleIds.length.toLocaleString()} visible media item${visibleIds.length === 1 ? "" : "s"} selected.`);
  };
  const announceLibraryAction = (message: string) => setLibraryMessage(message);
  const exportSelectedMetadata = () => {
    const csv = buildLibraryMetadataCsv(selectedAssets);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tjc-browse-photos-selected-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    announceLibraryAction(`List exported: ${selectedAssets.length.toLocaleString()} visible media item${selectedAssets.length === 1 ? "" : "s"}. Private archive fields were excluded.`);
  };
  const runBulkAction = (action: LibraryBulkAction) => {
    if (!action.enabled) {
      announceLibraryAction(action.disabledReason || `${action.label} is not available for current selection.`);
      return;
    }
    if (action.id === "export-metadata") {
      exportSelectedMetadata();
      return;
    }
    if (action.id === "download-approved") {
      announceLibraryAction(`Copy request: ${action.statusLabel}. Existing permission checks apply per eligible item; private archive files stay protected.`);
      return;
    }
    if (action.id === "request-reuse") {
      announceLibraryAction(`Open item details to request permission. ${action.statusLabel}; rights-unclear items stay flagged for reviewer evidence.`);
      return;
    }
    if (action.id === "add-to-collection" || action.id === "create-collection") {
      announceLibraryAction(`Use Albums workflow for ${action.label.toLowerCase()}. ${action.statusLabel}; private archive files stay protected.`);
      return;
    }
    announceLibraryAction(`${action.label}: ${action.statusLabel}. Record status unchanged until review is completed.`);
  };
  const marqueeRect = (state: NonNullable<typeof marquee>) => ({
    left: Math.min(state.startX, state.currentX),
    top: Math.min(state.startY, state.currentY),
    width: Math.abs(state.currentX - state.startX),
    height: Math.abs(state.currentY - state.startY)
  });
  const idsInsideMarquee = (state: NonNullable<typeof marquee>) => {
    const rect = marqueeRect(state);
    const right = rect.left + rect.width;
    const bottom = rect.top + rect.height;
    const cards = Array.from(gridRef.current?.querySelectorAll<HTMLElement>("[data-asset-id]") || []);
    return cards
      .filter((card) => {
        const cardRect = card.getBoundingClientRect();
        return cardRect.left <= right && cardRect.right >= rect.left && cardRect.top <= bottom && cardRect.bottom >= rect.top;
      })
      .map((card) => card.dataset.assetId)
      .filter((id): id is string => Boolean(id));
  };
  const startMarquee = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canUsePowerTools || viewMode !== "grid" || event.pointerType !== "mouse" || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button,a,input,select,textarea,[role='button']")) return;
    if (!target.closest(".ed-asset-card")) return;
    setMarquee({ active: true, additive: event.metaKey || event.ctrlKey, startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY });
  };
  const moveMarquee = (event: ReactPointerEvent<HTMLDivElement>) => {
    setMarquee((current) => {
      if (!current?.active) return current;
      const next = { ...current, currentX: event.clientX, currentY: event.clientY };
      if (Math.abs(next.currentX - next.startX) < 6 && Math.abs(next.currentY - next.startY) < 6) return next;
      const ids = idsInsideMarquee(next);
      setSelectedIds((existing) => next.additive ? Array.from(new Set([...existing, ...ids])) : ids);
      setSelectionAnchorId(ids[ids.length - 1] || selectionAnchorId);
      if (ids[ids.length - 1]) setSelectedId(ids[ids.length - 1]);
      return next;
    });
  };
  const endMarquee = () => {
    setMarquee(null);
  };
  const updateSearchQuery = (value: string) => {
    setQuery(value);
    setIntent("");
  };
  const saveCurrentSearch = async () => {
    if (!query && !view && !collection && !filters.length) {
      announceLibraryAction("Choose a query, saved search, album, or filter before saving this search.");
      return;
    }
    const response = await fetch(`/api/saved-searches?role=${encodeURIComponent(role)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        title: query || view || collection || filters.join(", "),
        query,
        view,
        collection,
        filters,
        sort
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      announceLibraryAction(payload.error || "Saved search failed.");
      return;
    }
    announceLibraryAction(`Saved "${payload.search?.title || "search"}". Team-wide saved searches may not be available for every role.`);
  };
  const toggleFilter = (filter: string) => {
    setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
  };
  const setTopFilterGroup = (group: LibraryTopFilterGroup, filter: string) => {
    const groupFilters = new Set(group.options.map((option) => option.filter));
    setFilters((current) => {
      const withoutGroup = current.filter((item) => !groupFilters.has(item));
      return filter ? [...withoutGroup, filter] : withoutGroup;
    });
  };
  const runSuggestedQuery = (term: string) => {
    setQuery(term);
    setIntent("");
    setView("");
    setCollection("");
  };
  const openSuggestedView = (id: string) => {
    setView(id);
    setCollection("");
    setQuery("");
    setIntent("");
    setFilters([]);
  };
  const clearAll = () => {
    setQuery("");
    setIntent("");
    setView("");
    setCollection("");
    setFilters([]);
  };
  const filterPanel = (
    <BrowseFilterPanel
      savedViews={search.data?.savedViews}
      collections={search.data?.collections}
      visibleAssets={assets}
      activeView={view}
      activeCollection={collection}
      activeFilters={filters}
      filterGroups={topFilterGroups}
      filterCounts={filterCounts}
      onViewSelect={(id) => { setView(id); setCollection(""); setQuery(""); setIntent(""); setFilters([]); setFiltersOpen(false); }}
      onCollectionSelect={(id) => { setCollection(collection === id ? "" : id); setView(""); setQuery(""); setIntent(""); setFiltersOpen(false); }}
      onSavedViewsExpand={() => announceLibraryAction("Saved searches are listed from Browse Media. Use Save search to keep the current query when available.")}
      onFilterToggle={toggleFilter}
      onClearFilters={() => setFilters([])}
    />
  );
  const inspectorTitle = selectionSummary ? `${selectionSummary.count.toLocaleString()} selected` : selected ? browseTitle(selected) : "No media selected";
  return (
    <div className="enterprise-page enterprise-library">
      <LibraryBrowserTopBar
        query={query}
        searchPlaceholder="Search event, date, ministry, album, or keyword..."
        onSearchChange={updateSearchQuery}
        onClearSearch={() => { setQuery(""); setIntent(""); }}
        onOpenFilters={() => setFiltersOpen(true)}
        filterCount={activeFilterCount}
        selectedCount={selectedIds.length}
        resultCount={search.data?.total}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        density={density}
        onDensityChange={setDensity}
        sort={sort}
        onSortChange={setSort}
        inspectorOpen={inspectorOpen}
        onInspectorToggle={() => setInspectorOpen((current) => !current)}
        canUsePowerTools={canUsePowerTools}
      />
      {libraryMessage ? <p className="ed-inline-success">{libraryMessage}</p> : null}
      {search.loading ? <LoadingCard label="Loading church media..." /> : search.error ? <BrowseErrorCard message={search.error} /> : (
        <div className={cn("ed-library-grid", inspectorOpen ? "is-inspector-open" : "is-inspector-collapsed")} aria-label="Browse Media browser">
          <section className="ed-asset-workspace" aria-label="Media results pane">
            <AppliedFilterBar
              query={query}
              savedViews={search.data?.savedViews}
              collections={search.data?.collections}
              activeView={view}
              activeCollection={collection}
              viewLabel={savedViewLabel}
              collectionLabel={collectionLabel}
              filters={filters}
              filterGroups={topFilterGroups}
              filterCounts={filterCounts}
              visibleAssets={assets}
              resultCount={search.data?.total}
              onClearQuery={() => { setQuery(""); setIntent(""); }}
              onClearView={() => setView("")}
              onClearCollection={() => setCollection("")}
              onRemoveFilter={toggleFilter}
              onViewSelect={(id) => { setView(id); setCollection(""); setQuery(""); setIntent(""); setFilters([]); }}
              onCollectionSelect={(id) => { setCollection(id); setView(""); setQuery(""); setIntent(""); }}
              onSetFilterGroup={setTopFilterGroup}
              onClearAll={clearAll}
              onOpenFilters={() => setFiltersOpen(true)}
              showInlineControls
            />
            {canUsePowerTools ? <LibrarySavedViewStrip
              savedViews={search.data?.savedViews}
              activeView={view}
              activeCollection={collection}
              total={search.data?.total}
              onViewSelect={(id) => { setView(id); setCollection(""); setQuery(""); setIntent(""); setFilters([]); }}
              onCollectionClear={() => setCollection("")}
              onClearAll={clearAll}
              onSaveSearch={saveCurrentSearch}
              canSaveSearch={Boolean(query || view || collection || filters.length)}
            /> : null}
            <LibraryBulkActionBar
              selectedCount={selectedAssets.length}
              actions={bulkActions}
              onClear={clearSelection}
              onSelectVisible={selectAllVisible}
              onRunAction={runBulkAction}
            />
            {pagination ? (
              <LibraryPaginationControls
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
                total={search.data?.total || 0}
                pageSize={limit}
                loading={search.loading}
                onPage={(page) => setOffset(Math.max(0, (page - 1) * limit))}
                onPageSizeChange={(nextLimit) => {
                  setLimit(nextLimit);
                  setOffset(0);
                }}
              />
            ) : null}
            {assets.length && viewMode === "table" ? (
              <section className="ed-route-table-wrap" aria-label="Media table">
                <LibraryResultList assets={assets} role={role} selectedIds={selectedIds} onSelect={toggleAsset} onQuickLook={openQuickLook} />
              </section>
            ) : assets.length ? <div
              className={cn("ed-grid ed-marquee-grid", density === "compact" && "is-compact")}
              ref={gridRef}
              onPointerDown={startMarquee}
              onPointerMove={moveMarquee}
              onPointerUp={endMarquee}
              onPointerCancel={endMarquee}
            >
              {assets.map((asset) => (
                <BrowseAssetCard
                  asset={asset}
                  role={role}
                  selected={canUsePowerTools ? selectedIds.includes(asset.id) : selected?.id === asset.id}
                  onSelect={(event) => toggleAsset(asset, event)}
                  onQuickLook={() => openQuickLook(asset)}
                  key={asset.id}
                />
              ))}
              {marquee?.active ? (() => {
                const rect = marqueeRect(marquee);
                return <span className="ed-selection-marquee" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} aria-hidden="true" />;
              })() : null}
            </div> : (
              <section className="ed-empty-state ed-empty-search is-quiet">
                <span className="ed-empty-icon"><Search size={24} /></span>
                <p className="ed-empty-eyebrow">Browse Media results</p>
                <h2>{noResultHelp?.title || "No media match current filters"}</h2>
                <p>{noResultHelp?.guidance || "Clear filters, use a saved search, or search a broader ministry, event, album, tag, or keyword."}</p>
                {noResultHelp?.querySuggestions.length ? (
                  <nav className="ed-empty-suggestions" aria-label="Suggested searches">
                    {noResultHelp.querySuggestions.map((term) => <button type="button" key={term} onClick={() => runSuggestedQuery(term)}>{term}</button>)}
                  </nav>
                ) : null}
                {noResultHelp?.filters.length ? (
                  <nav aria-label="Suggested recovery filters">
                    {noResultHelp.filters.map((item) => <button type="button" key={item.filter} onClick={() => toggleFilter(item.filter)}>{item.label} <span>{item.count.toLocaleString()}</span></button>)}
                  </nav>
                ) : null}
                {noResultHelp?.savedViews.length ? (
                  <nav aria-label="Suggested saved views">
                    {noResultHelp.savedViews.map((item) => <button type="button" key={item.id} onClick={() => openSuggestedView(item.id)}>{item.label}</button>)}
                  </nav>
                ) : null}
                <div className="ed-empty-actions">
                  <ActionButton tone="primary" onClick={clearAll}>Reset filters</ActionButton>
                  <ActionButton onClick={() => setQuery("")}>Clear search</ActionButton>
                </div>
              </section>
            )}
            {pagination ? (
              <LibraryPaginationControls
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
                total={search.data?.total || 0}
                pageSize={limit}
                loading={search.loading}
                variant="secondary"
                onPage={(page) => setOffset(Math.max(0, (page - 1) * limit))}
                onPageSizeChange={(nextLimit) => {
                  setLimit(nextLimit);
                  setOffset(0);
                }}
              />
            ) : null}
          </section>
          <aside className={cn("ed-library-inspector-rail", !inspectorOpen && "is-collapsed")} aria-label="Media details">
            <button className="ed-inspector-rail-toggle" type="button" onClick={() => setInspectorOpen((current) => !current)} aria-expanded={inspectorOpen}>
              {inspectorOpen ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronLeft size={15} aria-hidden="true" />}
              <span>Details</span>
              <em>{inspectorTitle}</em>
            </button>
            {inspectorOpen ? (selectionSummary ? <SelectionSummaryPanel summary={selectionSummary} /> : <BrowseInspectorDrawer asset={selected} role={role} onMessage={announceLibraryAction} />) : null}
          </aside>
        </div>
      )}
      <BrowseQuickLookDrawer
        asset={quickLookAsset || undefined}
        role={role}
        open={Boolean(quickLookAsset)}
        onOpenChange={(open) => {
          if (!open) setQuickLookId(null);
        }}
        onMessage={announceLibraryAction}
      />
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="ed-filter-drawer-sheet w-[min(92vw,28rem)] max-w-none gap-0 border-l border-[#d8e2dc] bg-[#fbfdfb] p-0">
          <SheetHeader className="border-b border-[#d8e2dc] px-4 py-4">
            <SheetTitle className="text-base font-black text-tjc-ink">Filters</SheetTitle>
            <SheetDescription className="text-sm font-semibold text-tjc-muted">
              Event, date, ministry, album, church/location, media type, and allowed access.
            </SheetDescription>
          </SheetHeader>
          <div className="ed-mobile-filter-body">{filterPanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
