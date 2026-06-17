"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
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
import { assetRecordRef, assetType, displayTitle, formatBytes, sourceNoun } from "@/lib/enterprise-display";
import { assetEnterpriseStatus } from "@/lib/enterprise-status";
import { canReview } from "@/lib/permissions";
import { buildPortalReuseDecision } from "@/lib/portal-reuse-decision";
import { betaVisibilityLabel, reuseAnswerLabel } from "@/lib/portal-context-presenters";
import { routeWithRole } from "@/lib/role-routes";
import {
  buildLibraryBulkActions,
  buildLibrarySelectionSummary,
  reconcileVisibleSelection,
  selectRangeInVisibleOrder,
  shouldShowBulkBar,
  toggleSelectedId,
  type BulkActionId,
  type LibraryBulkAction,
  type LibrarySelectionSummary
} from "@/lib/library-bulk-selection";
import { ActionButton, AssetCard, AssetQuickLookDrawer, AssetThumb, DamSegmentedNav, DamToolbar, ErrorCard, InspectorDrawer, LoadingCard, PageHeader, SavedViewPanel, SourcePill, StatusBadge } from "./EnterpriseShared";

const PAGE_SIZE_OPTIONS = [15, 30, 60, 120];

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

function BulkActionButton({ action, onRun }: { action: LibraryBulkAction; onRun: (action: LibraryBulkAction) => void }) {
  const Icon = bulkActionIcons[action.id];
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
      <span>{action.label}</span>
      <em>{action.statusLabel}</em>
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
  return (
    <section className="ed-library-bulk-command" aria-label="Selected asset bulk actions">
      <div className="ed-library-bulk-count">
        <CheckCircle2 size={18} aria-hidden="true" />
        <span><strong>{selectedCount.toLocaleString()}</strong> selected</span>
      </div>
      <div className="ed-library-bulk-actions">
        {actions.map((action) => <BulkActionButton key={action.id} action={action} onRun={onRunAction} />)}
      </div>
      <div className="ed-library-bulk-end">
        <button type="button" onClick={onSelectVisible}>Select all visible</button>
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
        <h2>{summary.count.toLocaleString()} assets selected</h2>
        <p>Bulk actions stay role-aware. Approved-copy downloads exclude source/original files.</p>
      </div>
      <CountBreakdown title="Status" rows={summary.statusBreakdown} />
      <CountBreakdown title="Type" rows={summary.typeBreakdown} />
      <CountBreakdown title="Rights / consent" rows={summary.rightsBreakdown} />
      <section className="ed-selection-breakdown">
        <h3>Shared tags</h3>
        {summary.sharedTags.length ? (
          <div className="ed-selection-tags">{summary.sharedTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        ) : <p><span>No shared tags across all selected assets</span></p>}
      </section>
      <section className="ed-selection-breakdown">
        <h3>Selected references</h3>
        <p><span>{summary.references.join(", ") || "No references"}</span></p>
        {summary.resourceSpaceIds.length ? <small>ResourceSpace IDs: {summary.resourceSpaceIds.join(", ")}</small> : null}
      </section>
      <section className="ed-selection-breakdown">
        <h3>Available actions</h3>
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

function AppliedFilterBar({
  query,
  viewLabel,
  collectionLabel,
  filters,
  resultCount,
  onClearQuery,
  onClearView,
  onClearCollection,
  onRemoveFilter,
  onClearAll,
  onOpenFilters
}: {
  query: string;
  viewLabel?: string;
  collectionLabel?: string;
  filters: string[];
  resultCount?: number;
  onClearQuery: () => void;
  onClearView: () => void;
  onClearCollection: () => void;
  onRemoveFilter: (filter: string) => void;
  onClearAll: () => void;
  onOpenFilters: () => void;
}) {
  const chips = [
    ...(query ? [{ key: "query", label: `Search: ${query}`, onRemove: onClearQuery }] : []),
    ...(viewLabel ? [{ key: "view", label: `Saved view: ${viewLabel}`, onRemove: onClearView }] : []),
    ...(collectionLabel ? [{ key: "collection", label: `Collection: ${collectionLabel}`, onRemove: onClearCollection }] : []),
    ...filters.map((filter) => ({ key: `filter-${filter}`, label: filter.replace(/\b\w/g, (letter) => letter.toUpperCase()), onRemove: () => onRemoveFilter(filter) }))
  ];

  return (
    <section className="ed-applied-filter-bar" aria-label="Applied filters">
      <button className="ed-mobile-filter-trigger" type="button" onClick={onOpenFilters}>
        <SlidersHorizontal size={15} aria-hidden="true" />
        Filters
        {chips.length ? <em>{chips.length}</em> : null}
      </button>
      <div>
        <strong>{typeof resultCount === "number" ? `${resultCount.toLocaleString()} results` : "Results"}</strong>
        <span>{chips.length ? `${chips.length} active filter${chips.length === 1 ? "" : "s"}` : "No filters applied"}</span>
      </div>
      <div className="ed-applied-chips">
        {chips.map((chip) => (
          <button type="button" key={chip.key} onClick={chip.onRemove}>
            {chip.label}
            <span aria-hidden="true">×</span>
          </button>
        ))}
        {chips.length ? <button className="is-clear" type="button" onClick={onClearAll}>Clear all</button> : null}
      </div>
      <button className="ed-more-filters" type="button" onClick={onOpenFilters}>
        <Filter size={15} aria-hidden="true" />
        More filters
      </button>
    </section>
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
    : "No matching assets";
  const summaryText = total
    ? `Showing ${rangeStart.toLocaleString()}\u2013${rangeEnd.toLocaleString()} of ${total.toLocaleString()} \u00b7 ${pageText}`
    : "No matching assets";

  return (
    <div className={cn("ed-library-pagination", isSecondary ? "is-secondary" : "is-primary")} aria-label={isSecondary ? "Secondary library pagination" : "Library pagination"}>
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
  return (
    <>
      <div className="ed-mobile-card-list" aria-label="Library results">
        {assets.map((asset) => {
          const packet = buildPortalReuseDecision(asset, role);
          const selected = selectedIds.includes(asset.id);
          return (
            <article
              key={asset.id}
              className={cn(selected && "is-selected")}
              data-asset-id={asset.id}
              aria-selected={selected}
              tabIndex={0}
              onClick={(event) => {
                if (shouldIgnoreRowClick(event.target)) return;
                onSelect(asset, event);
              }}
              onKeyDown={(event) => {
                if (event.key !== " " && event.key !== "Enter") return;
                event.preventDefault();
                onSelect(asset, event);
              }}
            >
              <header>
                <label className="ed-selection-check" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => onSelect(asset, event as unknown as MouseEvent<HTMLElement>)}
                    aria-label={selected ? `Deselect ${displayTitle(asset)}` : `Select ${displayTitle(asset)}`}
                  />
                  <span>{selected ? <Check size={13} aria-hidden="true" /> : null}</span>
                </label>
                <strong>{displayTitle(asset)}</strong>
                <StatusBadge status={assetEnterpriseStatus(asset)} />
              </header>
              <p>{betaVisibilityLabel(asset)} · {reuseAnswerLabel(packet.reuse.state)} · {assetType(asset)}</p>
              <span>{assetRecordRef(asset)} · {formatBytes(asset.fileSizeBytes)}</span>
              <button type="button" onClick={() => onQuickLook(asset)}>View details</button>
            </article>
          );
        })}
      </div>
      <table className="ed-table ed-desktop-table" aria-label="Library results">
        <thead>
          <tr>
            <th>Media</th>
            <th>Primary status</th>
            <th>Rights / consent</th>
            <th>Usage / people</th>
            <th>Type</th>
            <th>Reference</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const packet = buildPortalReuseDecision(asset, role);
            const primaryBlocker = packet.reuse.blockers[0]?.label || "None";
            const selected = selectedIds.includes(asset.id);
            return (
              <tr
                key={asset.id}
                className={selected ? "is-active" : undefined}
                aria-selected={selected}
                data-asset-id={asset.id}
                tabIndex={0}
                onClick={(event) => {
                  if (shouldIgnoreRowClick(event.target)) return;
                  onSelect(asset, event);
                }}
                onKeyDown={(event) => {
                  if (event.key !== " " && event.key !== "Enter") return;
                  event.preventDefault();
                  onSelect(asset, event);
                }}
              >
                <td>
                  <div className="ed-row-media">
                    <label className="ed-selection-check" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => onSelect(asset, event as unknown as MouseEvent<HTMLElement>)}
                        aria-label={selected ? `Deselect ${displayTitle(asset)}` : `Select ${displayTitle(asset)}`}
                      />
                      <span>{selected ? <Check size={13} aria-hidden="true" /> : null}</span>
                    </label>
                    <AssetThumb asset={asset} />
                    <span><strong>{displayTitle(asset)}</strong><small>{assetRecordRef(asset)} · {formatBytes(asset.fileSizeBytes)}</small></span>
                  </div>
                </td>
                <td><StatusBadge status={assetEnterpriseStatus(asset)} /><small>{reuseAnswerLabel(packet.reuse.state)}</small></td>
                <td><span className="ed-table-pill is-beta">{betaVisibilityLabel(asset)}</span><small>{primaryBlocker === "None" ? "Evidence clear" : primaryBlocker}</small></td>
                <td><span className="ed-table-primary">{asset.usageScope || "Pending"}</span><small>{asset.peopleRisk || "People/minors unknown"}</small></td>
                <td><span className="ed-table-pill">{assetType(asset)}</span></td>
                <td><strong className="ed-row-ref">Reference {assetRecordRef(asset)}</strong><small>{primaryBlocker === "None" ? "Evidence clear" : primaryBlocker}</small></td>
                <td>
                  <div className="ed-library-row-actions">
                    <button className="ed-row-open" type="button" aria-label={`View details for ${displayTitle(asset)}`} onClick={() => onQuickLook(asset)}>Open</button>
                    <button className={cn("ed-row-select", selected && "is-selected")} type="button" aria-pressed={selected} onClick={(event) => onSelect(asset, event)}>
                      {selected ? <><CheckCircle2 size={13} aria-hidden="true" />Selected</> : "Select"}
                    </button>
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
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState("");
  const [view, setView] = useState("");
  const [collection, setCollection] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<CatalogSort>("Approved first");
  const [viewMode, setViewMode] = useState<"grid" | "table" | "review">("grid");
  const [limit, setLimit] = useState(30);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [quickLookId, setQuickLookId] = useState<string | null>(null);
  const [libraryMessage, setLibraryMessage] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  useEffect(() => {
    if (!assets[0]) return;
    if (!selectedId) {
      setSelectedId(assets[0].id);
      return;
    }
    if (!assets.some((asset) => asset.id === selectedId)) {
      setSelectedId(assets[0].id);
    }
  }, [assets, selectedId]);
  useEffect(() => {
    if (!selectedIds.length) return;
    const reconciled = reconcileVisibleSelection(selectedIds, visibleIds);
    if (!reconciled.hiddenCount) return;
    setSelectedIds(reconciled.nextIds);
    setSelectionAnchorId(reconciled.nextIds[reconciled.nextIds.length - 1] || null);
    setLibraryMessage(`${reconciled.hiddenCount.toLocaleString()} hidden selected asset${reconciled.hiddenCount === 1 ? "" : "s"} cleared after page, filter, sort, or role change.`);
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
  const selected = selectedAssets.length === 1 ? selectedAssets[0] : assets.find((asset) => asset.id === selectedId) || assets[0];
  const selectionSummary = useMemo(() => selectedAssets.length > 1 ? buildLibrarySelectionSummary(selectedAssets, role) : null, [role, selectedAssets]);
  const bulkActions = useMemo(() => buildLibraryBulkActions(selectedAssets, role), [role, selectedAssets]);
  const quickLookAsset = assets.find((asset) => asset.id === quickLookId) || null;
  const pagination = search.data?.pagination;
  const toggleAsset = (asset: StockMediaAsset, event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    const shiftKey = Boolean(event && "shiftKey" in event && event.shiftKey);
    const additive = Boolean(event && "metaKey" in event && (event.metaKey || event.ctrlKey));
    setSelectedId(asset.id);
    setSelectedIds((current) => shiftKey
      ? selectRangeInVisibleOrder({ currentIds: current, visibleIds, anchorId: selectionAnchorId || selectedId, targetId: asset.id, additive })
      : toggleSelectedId(current, asset.id));
    setSelectionAnchorId(asset.id);
  };
  const openQuickLook = (asset: StockMediaAsset) => {
    setSelectedId(asset.id);
    setQuickLookId(asset.id);
  };
  const clearSelection = () => {
    setSelectedIds([]);
    setSelectionAnchorId(null);
    announceLibraryAction("Selection cleared.");
  };
  const selectAllVisible = () => {
    setSelectedIds(visibleIds);
    setSelectionAnchorId(visibleIds[0] || null);
    if (visibleIds[0]) setSelectedId(visibleIds[0]);
    announceLibraryAction(`${visibleIds.length.toLocaleString()} visible asset${visibleIds.length === 1 ? "" : "s"} selected.`);
  };
  const announceLibraryAction = (message: string) => setLibraryMessage(message);
  const exportSelectedMetadata = () => {
    const escapeCsv = (value: string | number | undefined) => `"${String(value || "").replace(/"/g, '""')}"`;
    const headers = ["id", "title", "status", "usageScope", "mediaType", "collection", "reference"];
    const rows = selectedAssets.map((asset) => [
      asset.id,
      displayTitle(asset),
      asset.status,
      asset.usageScope,
      asset.mediaType,
      asset.collection,
      assetRecordRef(asset)
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `library-selected-metadata-${selectedAssets.length}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    announceLibraryAction(`Exported safe metadata for ${selectedAssets.length.toLocaleString()} selected asset${selectedAssets.length === 1 ? "" : "s"}. Source paths and originals were not included.`);
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
      announceLibraryAction(`Download approved copies: ${action.statusLabel}. Use existing approved-copy gate per eligible asset; source/original files stay restricted.`);
      return;
    }
    if (action.id === "request-reuse") {
      announceLibraryAction(`Reuse request draft ready for ${action.statusLabel}. Rights-unclear items stay flagged for reviewer evidence.`);
      return;
    }
    if (action.id === "add-to-collection" || action.id === "create-collection") {
      announceLibraryAction(`${action.label} prepared locally for ${action.statusLabel}. No source files were copied.`);
      return;
    }
    announceLibraryAction(`${action.label}: ${action.statusLabel}. Safe beta workflow visible; live writeback not performed.`);
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
    if (viewMode !== "grid" || event.pointerType !== "mouse" || event.button !== 0) return;
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
      announceLibraryAction("Choose a query, saved view, collection, or filter before saving this search.");
      return;
    }
    const response = await fetch("/api/saved-searches", {
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
    announceLibraryAction(`Saved "${payload.search?.title || "search"}" to ${payload.storageMode || "local-json"}. Team-wide saved views need durable team storage.`);
  };
  const toggleFilter = (filter: string) => {
    setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
  };
  const runIntentPreset = (preset: NonNullable<typeof discovery>["intentPresets"][number]) => {
    setIntent(preset.id);
    setQuery(preset.query);
    setView("");
    setCollection("");
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
    setSort("Newest");
  };
  const filterPanel = (
    <SavedViewPanel
      savedViews={search.data?.savedViews}
      collections={search.data?.collections}
      visibleAssets={assets}
      source={search.source}
      activeView={view}
      activeCollection={collection}
      activeFilters={filters}
      filterCounts={filterCounts}
      onViewSelect={(id) => { setView(id); setCollection(""); setQuery(""); setIntent(""); setFilters([]); setFiltersOpen(false); }}
      onCollectionSelect={(id) => { setCollection(collection === id ? "" : id); setView(""); setQuery(""); setIntent(""); setFiltersOpen(false); }}
      onSavedViewsExpand={() => announceLibraryAction("Saved views are listed from the current DAM catalog. Use Save this search to keep the current query where storage is configured.")}
      onFacetSelect={(label) => announceLibraryAction(`${label} requires ResourceSpace field mapping before it can filter results.`)}
      onFilterToggle={toggleFilter}
      onClearFilters={() => setFilters([])}
    />
  );
  return (
    <div className="enterprise-page enterprise-library">
      <PageHeader
        title="Library"
        subtitle="Browse role-safe media for ministry use. Source files remain restricted."
      />
      {libraryMessage ? <p className="ed-inline-success">{libraryMessage}</p> : null}
      <section className="ed-approved-banner"><CheckCircle2 size={24} /><div><strong>{search.live ? `Showing ${sourceNoun(search.source)}-backed records` : `${sourceNoun(search.source)} disconnected or read-only`}</strong><span>{search.source?.detail || "Source connection pending where noted. Unavailable media stays clearly marked. Source files remain restricted."}</span></div><SourcePill source={search.source} live={search.live} /></section>
      <section className="ed-trust-answer-strip ed-library-answer-strip" aria-label="Library trust model">
        <span><small>Beta scope</small><strong>Photo-only beta</strong></span>
        <span><small>Reuse/download</small><strong>Item evidence decides</strong></span>
        <span><small>Status language</small><strong>Approved for reuse / Needs review</strong></span>
        <span><small>Source truth</small><strong>{search.live ? "Hosted DAM instance" : "Local demo data"}</strong></span>
      </section>
      <DamSegmentedNav
        label="Library workspace views"
        activeId="assets"
        items={[
          { id: "assets", label: "Assets", icon: Grid3X3, href: routeWithRole("/library", role) },
          { id: "collections", label: "Collections", icon: Folder, href: routeWithRole("/collections", role) },
          { id: "packages", label: "Distribution Sets", icon: Archive, href: routeWithRole("/distribution-sets", role) },
          ...(canReview(role) ? [{ id: "rights", label: "Rights", icon: ShieldCheck, href: routeWithRole("/governance/rights-consent", role) }] : [])
        ]}
      />
      <DamToolbar
        label="Library asset toolbar"
        searchValue={query}
        searchPlaceholder={canReview(role) ? "Search DAM title, reference, collection, ministry, tag..." : "Search title, ministry, event, tag..."}
        onSearchChange={updateSearchQuery}
        onClearSearch={() => { setQuery(""); setIntent(""); }}
        onOpenFilters={() => setFiltersOpen(true)}
        filterCount={activeFilterCount}
        selectedCount={selectedIds.length}
        sortControl={<div className="ed-library-view-controls"><div className="ed-view-toggle" aria-label="Asset view mode"><button type="button" className={viewMode === "grid" ? "is-active" : ""} aria-label="Grid view" onClick={() => setViewMode("grid")}><Grid3X3 size={15} aria-hidden="true" /></button><button type="button" className={viewMode === "table" ? "is-active" : ""} aria-label="Table view" onClick={() => setViewMode("table")}><List size={15} aria-hidden="true" /></button><button type="button" className={viewMode === "review" ? "is-active" : ""} aria-label="Review list view" onClick={() => setViewMode("review")}><ShieldCheck size={15} aria-hidden="true" /></button></div><label><span className="sr-only">Sort assets</span><select className="ed-input" value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}><option>Approved first</option><option>Recently approved</option><option>Newest</option><option>A-Z</option></select></label></div>}
        quickFilters={[{ id: "portal ready", label: "Approved for reuse" }, { id: "needs review", label: "Needs evidence" }, { id: "rights review", label: "Rights review" }, { id: "people unknown", label: "People/minors" }, { id: "photo", label: "Photos" }, { id: "internal", label: "Internal-only" }].map((item) => ({ id: item.id, label: item.label, active: filters.includes(item.id), onClick: () => toggleFilter(item.id) }))}
      />
      <p className="ed-action-helper">Photo beta only. Non-photo records remain reference/review items; reuse and download still require item evidence.</p>
      <div className="ed-selection-utility-row">
        <button type="button" onClick={selectAllVisible} disabled={!visibleIds.length}>
          <CheckSquare size={15} aria-hidden="true" />
          Select all visible
        </button>
        {selectedIds.length ? <span>{selectedIds.length.toLocaleString()} selected across current visible results</span> : <span>Use checkbox, Cmd/Ctrl-click, Shift-click, or grid drag select.</span>}
      </div>
      {discovery ? (
        <section className="ed-smart-discovery" aria-label="Smart discovery packet">
          <div>
            <span>Intent presets</span>
            <strong>{discovery.matchedIntent?.label || "Browse"}</strong>
            <small>{discovery.matchedIntent?.description || discovery.summary}</small>
          </div>
          <nav aria-label="Query intent presets">
            {discovery.intentPresets.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={intent === preset.id || discovery.matchedIntent?.id === preset.id ? "is-active" : undefined}
                onClick={() => runIntentPreset(preset)}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </nav>
          {discovery.expandedTerms.length ? (
            <p className="ed-discovery-terms"><strong>Expanded terms</strong> {discovery.expandedTerms.slice(0, 8).join(", ")}</p>
          ) : null}
          {discovery.suggestedFilters.length ? (
            <nav aria-label="Suggested discovery filters">
              {discovery.suggestedFilters.map((item) => (
                <button
                  type="button"
                  key={item.filter}
                  className={filters.includes(item.filter) ? "is-active" : undefined}
                  onClick={() => toggleFilter(item.filter)}
                >
                  {item.label} <span>{item.count.toLocaleString()}</span>
                </button>
              ))}
            </nav>
          ) : null}
          <details className="ed-discovery-notes">
            <summary>Discovery notes</summary>
            <p><strong>Ranking</strong> {discovery.rankingExplanation.map((item) => item.label).join(" -> ")}. {discovery.scoreHint}</p>
            <p>{discovery.safetyNote}</p>
          </details>
        </section>
      ) : null}
      <AppliedFilterBar
        query={query}
        viewLabel={savedViewLabel}
        collectionLabel={collectionLabel}
        filters={filters}
        resultCount={search.data?.total}
        onClearQuery={() => { setQuery(""); setIntent(""); }}
        onClearView={() => setView("")}
        onClearCollection={() => setCollection("")}
        onRemoveFilter={toggleFilter}
        onClearAll={clearAll}
        onOpenFilters={() => setFiltersOpen(true)}
      />
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
      {search.loading ? <LoadingCard /> : search.error ? <ErrorCard message={search.error} source={search.source} /> : (
        <div className="ed-library-grid">
          <div className="ed-desktop-filter-rail">{filterPanel}</div>
          <main className="ed-asset-workspace">
            {assets.length && viewMode !== "grid" ? (
              <LibraryResultList assets={assets} role={role} selectedIds={selectedIds} onSelect={toggleAsset} onQuickLook={openQuickLook} />
            ) : assets.length ? <div
              className="ed-grid ed-marquee-grid"
              ref={gridRef}
              onPointerDown={startMarquee}
              onPointerMove={moveMarquee}
              onPointerUp={endMarquee}
              onPointerCancel={endMarquee}
            >
              {assets.map((asset) => (
              <AssetCard
                asset={asset}
                selected={selectedIds.includes(asset.id)}
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
                <p className="ed-empty-eyebrow">{sourceNoun(search.source)} discovery</p>
                <h2>{noResultHelp?.title || `No ${sourceNoun(search.source)} records match this search`}</h2>
                <p>{noResultHelp?.guidance || "Try a broader ministry, category, channel, or rights term. Saved views and common filters stay available for a fast reset."}</p>
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
                  <ActionButton tone="primary" onClick={clearAll}>Reset library</ActionButton>
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
          </main>
          {selectionSummary ? <SelectionSummaryPanel summary={selectionSummary} /> : <InspectorDrawer asset={selected} source={search.source} live={search.live} />}
        </div>
      )}
      <AssetQuickLookDrawer
        asset={quickLookAsset || undefined}
        open={Boolean(quickLookAsset)}
        onOpenChange={(open) => {
          if (!open) setQuickLookId(null);
        }}
        source={search.source}
        live={search.live}
      />
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="ed-mobile-filter-sheet w-[min(92vw,24rem)] max-w-none gap-0 border-r border-[#d8e2dc] bg-[#fbfdfb] p-0">
          <SheetHeader className="border-b border-[#d8e2dc] px-4 py-4">
            <SheetTitle className="text-base font-black text-tjc-ink">Filters</SheetTitle>
            <SheetDescription className="text-sm font-semibold text-tjc-muted">
              Refine assets by saved views, rights, source-safe fields, people visibility, and media properties.
            </SheetDescription>
          </SheetHeader>
          <div className="ed-mobile-filter-body">{filterPanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
