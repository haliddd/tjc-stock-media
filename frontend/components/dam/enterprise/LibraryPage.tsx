"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, ChevronLeft, ChevronRight, Filter, Folder, Grid3X3, List, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
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
import { routeWithRole } from "@/lib/role-routes";
import { ActionButton, AssetCard, AssetQuickLookDrawer, AssetThumb, DamSegmentedNav, DamToolbar, ErrorCard, InspectorDrawer, LoadingCard, PageHeader, SavedViewPanel, SourcePill, StatusBadge } from "./EnterpriseShared";

const PAGE_SIZE_OPTIONS = [15, 30, 60, 120];

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
  onSelect: (asset: StockMediaAsset) => void;
  onQuickLook: (asset: StockMediaAsset) => void;
}) {
  return (
    <>
      <div className="ed-mobile-card-list" aria-label="Library results">
        {assets.map((asset) => {
          const packet = buildPortalReuseDecision(asset, role);
          return (
            <article key={asset.id}>
              <header>
                <strong>{displayTitle(asset)}</strong>
                <StatusBadge status={assetEnterpriseStatus(asset)} />
              </header>
              <p>{packet.reuse.label} · {asset.usageScope || "Usage scope pending"} · {assetType(asset)}</p>
              <span>{assetRecordRef(asset)} · {formatBytes(asset.fileSizeBytes)}</span>
              <button type="button" onClick={() => onQuickLook(asset)}>Quick look</button>
            </article>
          );
        })}
      </div>
      <table className="ed-table ed-desktop-table" aria-label="Library results">
        <thead>
          <tr>
            <th>Media</th>
            <th>Clearance status</th>
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
            return (
              <tr key={asset.id} className={selectedIds.includes(asset.id) ? "is-active" : undefined}>
                <td>
                  <div className="ed-row-media">
                    <AssetThumb asset={asset} />
                    <span><strong>{displayTitle(asset)}</strong><small>{formatBytes(asset.fileSizeBytes)}</small></span>
                  </div>
                </td>
                <td><StatusBadge status={assetEnterpriseStatus(asset)} /> <small>{packet.reuse.label}</small></td>
                <td>{asset.usageScope || "Pending"}<br /><small>{asset.peopleRisk || "People/minors unknown"}</small></td>
                <td>{assetType(asset)}</td>
                <td>{assetRecordRef(asset)}<br /><small>{primaryBlocker === "None" ? "Evidence clear in current role view" : primaryBlocker}</small></td>
                <td>
                  <button type="button" onClick={() => onQuickLook(asset)}>Quick look</button>
                  <button type="button" onClick={() => onSelect(asset)}>{selectedIds.includes(asset.id) ? "Selected" : "Select"}</button>
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
  const [sort, setSort] = useState<CatalogSort>("Newest");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [limit, setLimit] = useState(30);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quickLookId, setQuickLookId] = useState<string | null>(null);
  const [libraryMessage, setLibraryMessage] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const search = useAssetsSearch({ role, query, filters, view: view || undefined, collection: collection || undefined, intent: intent || undefined, sort, limit, offset });
  const assets = search.data?.assets || [];
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
      setSelectedIds([assets[0].id]);
      return;
    }
    if (!assets.some((asset) => asset.id === selectedId)) {
      setSelectedId(assets[0].id);
    }
  }, [assets, selectedId]);
  useEffect(() => {
    setOffset(0);
    setSelectedId(null);
    setSelectedIds([]);
  }, [query, intent, filters, view, collection, sort, role]);
  const selected = assets.find((asset) => asset.id === selectedId) || assets[0];
  const quickLookAsset = assets.find((asset) => asset.id === quickLookId) || null;
  const pagination = search.data?.pagination;
  const toggleAsset = (asset: StockMediaAsset) => {
    setSelectedId(asset.id);
    setSelectedIds((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id]);
  };
  const openQuickLook = (asset: StockMediaAsset) => {
    setSelectedId(asset.id);
    setSelectedIds((current) => current.includes(asset.id) ? current : [...current, asset.id]);
    setQuickLookId(asset.id);
  };
  const announceLibraryAction = (message: string) => setLibraryMessage(message);
  const updateSearchQuery = (value: string) => {
    setQuery(value);
    setIntent("");
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
        searchPlaceholder={canReview(role) ? "Search DAM title, reference, collection, ministry, tag..." : "Search title, ministry, event, tag..."}
        onSearchChange={updateSearchQuery}
        onClearSearch={() => { setQuery(""); setIntent(""); }}
        onOpenFilters={() => setFiltersOpen(true)}
        filterCount={activeFilterCount}
        selectedCount={selectedIds.length}
        sortControl={<div className="ed-library-view-controls"><div className="ed-view-toggle" aria-label="Asset view mode"><button type="button" className={viewMode === "list" ? "is-active" : ""} aria-label="List view" onClick={() => setViewMode("list")}><List size={15} aria-hidden="true" /></button><button type="button" className={viewMode === "grid" ? "is-active" : ""} aria-label="Grid view" onClick={() => setViewMode("grid")}><Grid3X3 size={15} aria-hidden="true" /></button></div><label><span className="sr-only">Sort assets</span><select className="ed-input" value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}><option>Approved first</option><option>Recently approved</option><option>Newest</option><option>A-Z</option></select></label></div>}
        quickFilters={[{ id: "portal ready", label: "Portal Ready" }, { id: "needs review", label: "Needs Review" }, { id: "rights review", label: "Rights Review" }, { id: "people unknown", label: "People/Minors" }, { id: "photo", label: "Photo beta" }].map((item) => ({ id: item.id, label: item.label, active: filters.includes(item.id), onClick: () => toggleFilter(item.id) }))}
      />
      <p className="ed-action-helper">Collection, package, saved view, tag, and metric context never grants reuse permission. Each result shows one clearance status from item-level evidence.</p>
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
            <p><strong>Expanded terms</strong> {discovery.expandedTerms.slice(0, 8).join(", ")}</p>
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
          <p><strong>Ranking</strong> {discovery.rankingExplanation.map((item) => item.label).join(" -> ")}. {discovery.scoreHint}</p>
          <p>{discovery.safetyNote}</p>
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
            {assets.length && viewMode === "list" ? (
              <LibraryResultList assets={assets} role={role} selectedIds={selectedIds} onSelect={toggleAsset} onQuickLook={openQuickLook} />
            ) : assets.length ? <div className="ed-grid">{assets.map((asset) => (
              <AssetCard
                asset={asset}
                selected={selectedIds.includes(asset.id)}
                onSelect={() => toggleAsset(asset)}
                onQuickLook={() => openQuickLook(asset)}
                key={asset.id}
              />
            ))}</div> : (
              <section className="ed-empty-state is-quiet">
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
          <InspectorDrawer asset={selected} source={search.source} live={search.live} />
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
