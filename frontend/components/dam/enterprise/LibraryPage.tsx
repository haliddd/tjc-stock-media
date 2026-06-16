"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Archive, CheckCircle2, ChevronLeft, ChevronRight, Download, FileText, Filter, Folder, FolderPlus, Grid3X3, List, Search, Send, ShieldCheck, SlidersHorizontal, Tags, X } from "lucide-react";
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
import type { CatalogSort, DemoRole, MediaSourceStatus, StockMediaAsset } from "@/lib/types";
import { assetRecordRef, assetType, displayTitle, sourceNoun } from "@/lib/enterprise-display";
import { canReview } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";
import { buildLibraryMetadataCsv, buildLibrarySelectionSummary, reconcileVisibleSelection, selectRangeInVisibleOrder, shouldShowBulkBar, toggleSelectedId, type BulkActionId } from "@/lib/library-bulk-selection";
import { ActionButton, AssetCard, AssetQuickLookDrawer, DamSegmentedNav, DamToolbar, ErrorCard, InspectorDrawer, LoadingCard, PageHeader, SavedViewPanel, SourcePill } from "./EnterpriseShared";

const PAGE_SIZE_OPTIONS = [15, 30, 60, 120];
type LibraryViewMode = "grid" | "table";

const bulkActionIcons: Partial<Record<BulkActionId, typeof FolderPlus>> = {
  "add-to-collection": FolderPlus,
  "create-collection": FolderPlus,
  "request-reuse": Send,
  "send-review": FileText,
  "assign-tags": Tags,
  "mark-internal": ShieldCheck,
  "download-approved": Download,
  "export-metadata": FileText,
  approve: CheckCircle2,
  reject: X,
  archive: Archive
};

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

function BulkActionBar({
  selectedAssets,
  role,
  onClear,
  onAction
}: {
  selectedAssets: StockMediaAsset[];
  role: DemoRole;
  onClear: () => void;
  onAction: (actionId: BulkActionId, label: string) => void;
}) {
  const summary = useMemo(() => buildLibrarySelectionSummary(selectedAssets, role), [selectedAssets, role]);

  if (!shouldShowBulkBar(selectedAssets.length)) return null;

  return (
    <section className="ed-bulk-action-bar" aria-label="Selected asset bulk actions">
      <div className="ed-bulk-action-count">
        <strong>{selectedAssets.length.toLocaleString()} selected</strong>
        <span>Approved-copy gates and source restrictions still apply.</span>
      </div>
      <div className="ed-bulk-action-buttons">
        {summary.actions.map((action) => {
          const Icon = bulkActionIcons[action.id];
          const disabled = !action.enabled;
          const reason = disabled ? action.disabledReason : action.warning || action.disabledReason;
          const helper = disabled ? action.disabledReason || action.statusLabel : action.statusLabel;
          return (
            <button
              type="button"
              key={action.id}
              disabled={disabled}
              title={reason}
              data-disabled-reason={disabled ? action.disabledReason : undefined}
              aria-label={`${action.label}: ${action.statusLabel}${reason ? `. ${reason}` : ""}`}
              onClick={() => onAction(action.id, action.label)}
            >
              {Icon ? <Icon size={15} aria-hidden="true" /> : null}
              <span>{action.label}</span>
              <small>{helper}</small>
            </button>
          );
        })}
      </div>
      <button className="ed-bulk-clear" type="button" onClick={onClear} aria-label="Clear selected assets">
        <X size={15} aria-hidden="true" />
        Clear
      </button>
    </section>
  );
}

function SelectionSummaryRail({
  assets,
  role,
  source,
  live,
  onAction
}: {
  assets: StockMediaAsset[];
  role: DemoRole;
  source?: MediaSourceStatus | null;
  live?: boolean;
  onAction: (actionId: BulkActionId, label: string) => void;
}) {
  const summary = useMemo(() => buildLibrarySelectionSummary(assets, role), [assets, role]);
  const visibleActions = summary.actions.slice(0, 8);
  const breakdowns = [
    ["Status", summary.statusBreakdown],
    ["Type", summary.typeBreakdown],
    ["Rights / consent", summary.rightsBreakdown]
  ] as const;

  return (
    <aside className="ed-inspector ed-panel ed-selection-summary-rail" aria-label="Multi-selection summary">
      <div className="ed-drawer-top">
        <span>Bulk</span>
        <strong>{summary.count.toLocaleString()} selected</strong>
        <span>Safe actions</span>
      </div>
      <section className="ed-selection-hero">
        <strong>{summary.count.toLocaleString()}</strong>
        <span>visible assets selected</span>
        <SourcePill source={source} live={live} />
      </section>
      <div className="ed-selection-breakdowns">
        {breakdowns.map(([label, rows]) => (
          <section key={label}>
            <h3>{label}</h3>
            <dl>
              {rows.slice(0, 5).map(([value, count]) => (
                <div key={`${label}-${value}`}>
                  <dt>{value}</dt>
                  <dd>{count.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <section className="ed-selection-shared">
        <h3>Shared tags</h3>
        {summary.sharedTags.length ? (
          <div className="ed-card-tags">{summary.sharedTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        ) : <p>No tags shared across every selected asset.</p>}
      </section>
      <section className="ed-selection-shared">
        <h3>Selected references</h3>
        <p>{summary.references.slice(0, 8).join(", ")}</p>
        <small>{summary.references.length > 8 ? `+${summary.references.length - 8} more references` : "Current visible selection"}</small>
      </section>
      <section className="ed-selection-shared">
        <h3>ResourceSpace IDs</h3>
        <p>{summary.resourceSpaceIds.slice(0, 8).join(", ")}</p>
      </section>
      <section className="ed-selection-warnings">
        <h3>Warnings</h3>
        {summary.warnings.map((warning) => <p key={warning}>{warning}</p>)}
      </section>
      <section className="ed-selection-actions">
        <h3>Available bulk actions</h3>
        {visibleActions.map((action) => {
          const Icon = bulkActionIcons[action.id];
          const helper = action.enabled ? action.statusLabel : action.disabledReason || action.statusLabel;
          return (
            <button
              type="button"
              key={action.id}
              disabled={!action.enabled}
              title={!action.enabled ? action.disabledReason : action.warning}
              data-disabled-reason={!action.enabled ? action.disabledReason : undefined}
              onClick={() => onAction(action.id, action.label)}
            >
              {Icon ? <Icon size={15} aria-hidden="true" /> : null}
              <span>{action.label}</span>
              <small>{helper}</small>
            </button>
          );
        })}
      </section>
    </aside>
  );
}

function LibraryAssetTable({
  assets,
  selectedIds,
  onSelect,
  onQuickLook
}: {
  assets: StockMediaAsset[];
  selectedIds: string[];
  onSelect: (asset: StockMediaAsset, event?: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey">) => void;
  onQuickLook: (asset: StockMediaAsset) => void;
}) {
  return (
    <div className="ed-library-table-wrap" role="region" aria-label="Library table view">
      <table className="ed-table ed-library-table">
        <thead>
          <tr>
            <th scope="col">Select</th>
            <th scope="col">Asset</th>
            <th scope="col">Status</th>
            <th scope="col">Type</th>
            <th scope="col">Rights</th>
            <th scope="col">Reference</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const selected = selectedIds.includes(asset.id);
            const title = displayTitle(asset);
            return (
              <tr className={selected ? "is-selected" : ""} key={asset.id} onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey) onSelect(asset, event);
              }}>
                <td>
                  <button className="ed-row-select-checkbox" type="button" aria-pressed={selected} aria-label={selected ? `Deselect ${title}` : `Select ${title}`} onClick={(event) => { event.stopPropagation(); onSelect(asset, event); }}>
                    {selected ? <CheckCircle2 size={14} aria-hidden="true" /> : null}
                  </button>
                </td>
                <td><strong title={title}>{title}</strong><small>{asset.collection || "Unassigned"}</small></td>
                <td>{asset.status}</td>
                <td>{assetType(asset)}</td>
                <td>{asset.rightsStatus || asset.consentStatus || "Not provided"}</td>
                <td>{assetRecordRef(asset)}</td>
                <td><button type="button" onClick={(event) => { event.stopPropagation(); onQuickLook(asset); }}>Quick look</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EnterpriseLibraryPage() {
  const { role } = useDemoRole();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("");
  const [collection, setCollection] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<CatalogSort>("Newest");
  const [limit, setLimit] = useState(15);
  const [offset, setOffset] = useState(0);
  const [viewMode, setViewMode] = useState<LibraryViewMode>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [quickLookId, setQuickLookId] = useState<string | null>(null);
  const [libraryMessage, setLibraryMessage] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const search = useAssetsSearch({ role, query, filters, view: view || undefined, collection: collection || undefined, sort, limit, offset });
  const assets = search.data?.assets || [];
  const discovery = search.data?.discovery;
  const noResultHelp = discovery?.noResultHelp;
  const savedViewLabel = search.data?.savedViews?.find((item) => item.id === view)?.label;
  const collectionLabel = search.data?.collections?.find((item) => item.id === collection)?.name;
  const activeFilterCount = (query ? 1 : 0) + (view ? 1 : 0) + (collection ? 1 : 0) + filters.length;
  const visibleIds = useMemo(() => assets.map((asset) => asset.id), [assets]);
  const selectedAssets = useMemo(() => {
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return selectedIds.map((id) => byId.get(id)).filter((asset): asset is StockMediaAsset => Boolean(asset));
  }, [assets, selectedIds]);
  const selectedAssetSet = useMemo(() => new Set(selectedIds), [selectedIds]);
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
    setOffset(0);
    setSelectedId(null);
    setSelectionAnchorId(null);
    setSelectedIds((current) => {
      if (current.length) setLibraryMessage("Selection cleared because page, filters, sort, or role changed.");
      return [];
    });
  }, [query, filters, view, collection, sort, role]);
  useEffect(() => {
    setSelectedIds((current) => {
      if (!current.length) return current;
      const { nextIds, hiddenCount } = reconcileVisibleSelection(current, visibleIds);
      if (hiddenCount) setLibraryMessage(`${hiddenCount.toLocaleString()} hidden selected asset${hiddenCount === 1 ? "" : "s"} cleared after results changed.`);
      return nextIds.length === current.length ? current : nextIds;
    });
  }, [visibleIds]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !selectedIds.length) return;
      setSelectedIds([]);
      setSelectionAnchorId(null);
      setLibraryMessage("Selection cleared.");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds.length]);
  const selected = selectedAssets.length === 1 ? selectedAssets[0] : assets.find((asset) => asset.id === selectedId) || assets[0];
  const quickLookAsset = assets.find((asset) => asset.id === quickLookId) || null;
  const pagination = search.data?.pagination;
  const toggleAsset = (asset: StockMediaAsset, event?: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey">) => {
    setSelectedId(asset.id);
    setSelectedIds((current) => {
      if (event?.shiftKey) {
        return selectRangeInVisibleOrder({
          currentIds: current,
          visibleIds,
          anchorId: selectionAnchorId,
          targetId: asset.id,
          additive: Boolean(event.metaKey || event.ctrlKey)
        });
      }
      return toggleSelectedId(current, asset.id);
    });
    setSelectionAnchorId(asset.id);
  };
  const openQuickLook = (asset: StockMediaAsset) => {
    setSelectedId(asset.id);
    setQuickLookId(asset.id);
  };
  const announceLibraryAction = (message: string) => setLibraryMessage(message);
  const clearSelection = () => {
    setSelectedIds([]);
    setSelectionAnchorId(null);
    announceLibraryAction("Selection cleared.");
  };
  const selectAllVisible = () => {
    setSelectedIds(visibleIds);
    setSelectionAnchorId(visibleIds[0] || null);
    announceLibraryAction(`${visibleIds.length.toLocaleString()} visible asset${visibleIds.length === 1 ? "" : "s"} selected.`);
  };
  const exportSelectedMetadataCsv = () => {
    if (!selectedAssets.length) {
      announceLibraryAction("Select visible assets before exporting metadata.");
      return;
    }
    const csv = buildLibraryMetadataCsv(selectedAssets);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tjc-library-selected-metadata-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    announceLibraryAction(`Export metadata: ${selectedAssets.length.toLocaleString()} role-safe visible asset${selectedAssets.length === 1 ? "" : "s"} exported. Source/original fields were excluded.`);
  };
  const announceBulkAction = (actionId: BulkActionId, label: string) => {
    const action = buildLibrarySelectionSummary(selectedAssets, role).actions.find((item) => item.id === actionId);
    if (!action) return;
    if (actionId === "export-metadata" && action.enabled) {
      exportSelectedMetadataCsv();
      return;
    }
    const suffix = action.warning || action.disabledReason || "No files copied and no source/originals exposed.";
    announceLibraryAction(`${label}: ${action.statusLabel}. ${suffix}`);
  };
  const saveCurrentSearch = async () => {
    if (!query && !view && !collection && !filters.length) {
      announceLibraryAction("Choose a query, saved view, collection, or filter before saving this search.");
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
    announceLibraryAction(`Saved "${payload.search?.title || "search"}" to ${payload.storageMode || "local-json"}. Team-wide saved views need backend storage.`);
  };
  const toggleFilter = (filter: string) => {
    setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
  };
  const runSuggestedQuery = (term: string) => {
    setQuery(term);
    setView("");
    setCollection("");
  };
  const openSuggestedView = (id: string) => {
    setView(id);
    setCollection("");
    setQuery("");
    setFilters([]);
  };
  const clearAll = () => {
    setQuery("");
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
      onViewSelect={(id) => { setView(id); setCollection(""); setQuery(""); setFilters([]); setFiltersOpen(false); }}
      onCollectionSelect={(id) => { setCollection(collection === id ? "" : id); setView(""); setQuery(""); setFiltersOpen(false); }}
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
        subtitle="Browse role-safe media for ministry use. Source/original files remain restricted."
      />
      {libraryMessage ? <p className="ed-inline-success">{libraryMessage}</p> : null}
      <section className="ed-approved-banner"><CheckCircle2 size={24} /><div><strong>{search.live ? `Showing ${sourceNoun(search.source)}-backed records` : `${sourceNoun(search.source)} disconnected or read-only`}</strong><span>{search.source?.detail || "Source system connection pending where noted. Previews and metadata are beta fixtures. Original/source files remain restricted."}</span></div><SourcePill source={search.source} live={search.live} /></section>
      <DamSegmentedNav
        label="Library workspace views"
        activeId="assets"
        items={[
          { id: "assets", label: "Assets", icon: Grid3X3, href: routeWithRole("/", role) },
          { id: "collections", label: "Collections", icon: Folder, href: routeWithRole("/collections", role) },
          { id: "packages", label: "Packages", icon: Archive, href: routeWithRole("/packages", role) },
          ...(canReview(role) ? [{ id: "rights", label: "Rights", icon: ShieldCheck, href: routeWithRole("/review?queue=rights-review", role) }] : [])
        ]}
      />
      <DamToolbar
        label="Library asset toolbar"
        searchValue={query}
        searchPlaceholder={canReview(role) ? "Search ResourceSpace title, filename, collection, ID..." : "Search title, collection, ministry, tag..."}
        onSearchChange={setQuery}
        onClearSearch={() => setQuery("")}
        onOpenFilters={() => setFiltersOpen(true)}
        filterCount={activeFilterCount}
        selectedCount={selectedIds.length}
        actions={[
          {
            label: "Select all visible",
            icon: CheckCircle2,
            onClick: selectAllVisible,
            disabled: !assets.length,
            disabledReason: "No visible assets to select."
          }
        ]}
        sortControl={<div className="ed-library-view-controls"><div className="ed-view-toggle" aria-label="Asset view mode"><button type="button" className={viewMode === "grid" ? "is-active" : ""} aria-label="Grid view" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}><Grid3X3 size={15} aria-hidden="true" /></button><button type="button" className={viewMode === "table" ? "is-active" : ""} aria-label="Table view" aria-pressed={viewMode === "table"} onClick={() => setViewMode("table")}><List size={15} aria-hidden="true" /></button></div><label><span className="sr-only">Sort assets</span><select className="ed-input" value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}><option>Approved first</option><option>Recently approved</option><option>Newest</option><option>A-Z</option></select></label></div>}
        quickFilters={[{ id: "approved public", label: "Approved" }, { id: "portal ready", label: "Public use" }, { id: "no people", label: "No people" }, { id: "landscape", label: "Landscape" }, { id: "photo", label: "Photo" }].map((item) => ({ id: item.id, label: item.label, active: filters.includes(item.id), onClick: () => toggleFilter(item.id) }))}
      />
      <AppliedFilterBar
        query={query}
        viewLabel={savedViewLabel}
        collectionLabel={collectionLabel}
        filters={filters}
        resultCount={search.data?.total}
        onClearQuery={() => setQuery("")}
        onClearView={() => setView("")}
        onClearCollection={() => setCollection("")}
        onRemoveFilter={toggleFilter}
        onClearAll={clearAll}
        onOpenFilters={() => setFiltersOpen(true)}
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
            <BulkActionBar selectedAssets={selectedAssets} role={role} onClear={clearSelection} onAction={announceBulkAction} />
            {assets.length && viewMode === "grid" ? <div className="ed-grid">{assets.map((asset) => (
              <AssetCard
                asset={asset}
                selected={selectedAssetSet.has(asset.id)}
                onSelect={(event) => toggleAsset(asset, event)}
                onQuickLook={() => openQuickLook(asset)}
                key={asset.id}
              />
            ))}</div> : null}
            {assets.length && viewMode === "table" ? (
              <LibraryAssetTable assets={assets} selectedIds={selectedIds} onSelect={toggleAsset} onQuickLook={openQuickLook} />
            ) : null}
            {!assets.length ? (
              <section className="ed-empty-state">
                <Search size={24} />
                <h2>{noResultHelp?.title || `No ${sourceNoun(search.source)} records match this search`}</h2>
                <p>{noResultHelp?.guidance || "Try a broader ministry, category, channel, or rights term."}</p>
                {noResultHelp?.querySuggestions.length ? (
                  <nav aria-label="Suggested searches">
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
                <ActionButton onClick={clearAll}>Clear all</ActionButton>
              </section>
            ) : null}
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
          {selectedAssets.length > 1 ? (
            <SelectionSummaryRail assets={selectedAssets} role={role} source={search.source} live={search.live} onAction={announceBulkAction} />
          ) : (
            <InspectorDrawer asset={selected} source={search.source} live={search.live} />
          )}
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
