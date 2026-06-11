"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Download, Folder, MoreHorizontal, Search, Share2, Sparkles } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetsSearch } from "@/components/dam/useDamApi";
import type { CatalogSort, StockMediaAsset } from "@/lib/types";
import { sourceNoun } from "@/lib/enterprise-display";
import { ActionButton, AssetCard, ErrorCard, IconButton, InspectorDrawer, LoadingCard, PageHeader, SavedViewPanel, SourcePill } from "./EnterpriseShared";

export function EnterpriseLibraryPage() {
  const { role } = useDemoRole();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("");
  const [collection, setCollection] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<CatalogSort>("Approved first");
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [libraryMessage, setLibraryMessage] = useState("");
  const limit = 15;
  const search = useAssetsSearch({ role, query, filters, view: view || undefined, collection: collection || undefined, sort, limit, offset });
  const assets = search.data?.assets || [];
  const discovery = search.data?.discovery;
  useEffect(() => {
    if (!selectedId && assets[0]) {
      setSelectedId(assets[0].id);
      setSelectedIds([assets[0].id]);
    }
  }, [assets, selectedId]);
  useEffect(() => {
    setOffset(0);
    setSelectedId(null);
    setSelectedIds([]);
  }, [query, filters, view, collection, sort, role]);
  const selected = assets.find((asset) => asset.id === selectedId) || assets[0];
  const pagination = search.data?.pagination;
  const toggleAsset = (asset: StockMediaAsset) => {
    setSelectedId(asset.id);
    setSelectedIds((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id]);
  };
  const announceLibraryAction = (message: string) => setLibraryMessage(message);
  const saveCurrentSearch = async () => {
    if (!query && !view && !collection && !filters.length) {
      announceLibraryAction("Choose a query, saved view, collection, or filter before saving this beta search.");
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
    announceLibraryAction(`Saved "${payload.search?.title || "search"}" to ${payload.storageMode || "local-json"}. Durable team saved views need backend storage.`);
  };
  const toggleFilter = (filter: string) => {
    setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
  };
  const clearAll = () => {
    setQuery("");
    setView("");
    setCollection("");
    setFilters([]);
    setSort("Approved first");
  };
  return (
    <div className="enterprise-page enterprise-library">
      <PageHeader title="Asset Library" count={search.data ? `${search.data.total.toLocaleString()} assets` : undefined} actions={<><ActionButton onClick={() => announceLibraryAction("Saved views are available in the left panel. Choose one to update the library query.")}>Saved views <ChevronDown size={14} /></ActionButton><ActionButton tone="primary" onClick={() => void saveCurrentSearch()}>Save this search</ActionButton><IconButton label="More" onClick={() => announceLibraryAction("More library actions are limited to backend-gated download, package, and share workflows in this beta.")}><MoreHorizontal size={17} /></IconButton></>} />
      {libraryMessage ? <p className="ed-inline-success">{libraryMessage}</p> : null}
      <section className="ed-approved-banner"><CheckCircle2 size={24} /><div><strong>{search.live ? `Showing ${sourceNoun(search.source)}-backed records` : `${sourceNoun(search.source)} disconnected or read-only`}</strong><span>{search.source?.detail || "The UI is waiting for the backend DAM source."}</span></div><SourcePill source={search.source} live={search.live} /><button type="button" onClick={() => announceLibraryAction("Source banner kept visible for tester safety; it cannot be dismissed in this beta.")}>×</button></section>
      <form className="ed-library-search" role="search" onSubmit={(event) => event.preventDefault()}>
        <Search size={17} aria-hidden="true" />
        <label className="sr-only" htmlFor="library-local-search">Search media assets</label>
        <input id="library-local-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${sourceNoun(search.source)} title, keyword, collection, source, or filename...`} />
        {query ? <button type="button" onClick={() => setQuery("")}>Clear</button> : null}
      </form>
      {discovery ? (
        <section className="ed-smart-discovery" aria-label="Smart discovery">
          <div>
            <span><Sparkles size={15} aria-hidden="true" /> Smart discovery</span>
            <strong>{discovery.summary}</strong>
            <small>{discovery.scoreHint}</small>
          </div>
          {discovery.expandedTerms.length ? (
            <p>{discovery.expandedTerms.slice(0, 6).map((term) => <button type="button" key={term} onClick={() => setQuery(term)}>{term}</button>)}</p>
          ) : null}
          {discovery.suggestedFilters.length ? (
            <nav aria-label="Suggested filters">
              {discovery.suggestedFilters.map((item) => (
                <button
                  type="button"
                  className={filters.includes(item.filter) ? "is-active" : ""}
                  key={item.filter}
                  onClick={() => toggleFilter(item.filter)}
                >
                  {item.label} <span>{item.count.toLocaleString()}</span>
                </button>
              ))}
            </nav>
          ) : null}
        </section>
      ) : null}
      <div className="ed-filter-bar">
        <label><span className="sr-only">Sort assets</span><select className="ed-input" value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}><option>Approved first</option><option>Recently approved</option><option>Newest</option><option>A-Z</option></select></label>
        {["portal ready", "approved public", "no people", "landscape", "photo"].map((item) => <button className={filters.includes(item) ? "is-active" : ""} type="button" key={item} onClick={() => toggleFilter(item)}>{item}<ChevronDown size={14} /></button>)}
        <button type="button" onClick={clearAll}>Clear all</button>
      </div>
      {filters.length ? <p className="ed-active-filters">{filters.map((filter) => <button type="button" key={filter} onClick={() => toggleFilter(filter)}>{filter} ×</button>)}</p> : null}
      {search.loading ? <LoadingCard /> : search.error ? <ErrorCard message={search.error} source={search.source} /> : (
        <div className="ed-library-grid">
          <SavedViewPanel
            savedViews={search.data?.savedViews}
            collections={search.data?.collections}
            source={search.source}
            activeView={view}
            activeCollection={collection}
            onViewSelect={(id) => { setView(id); setCollection(""); setQuery(""); }}
            onCollectionSelect={(id) => { setCollection(collection === id ? "" : id); setView(""); setQuery(""); }}
            onSavedViewsExpand={() => announceLibraryAction("Saved view management is local-only for this beta. Use listed views to test search behavior.")}
            onFacetSelect={(label) => announceLibraryAction(`${label} facet selected. Stable facet filtering waits for ResourceSpace field mapping.`)}
          />
          <main className="ed-asset-workspace">
            <div className="ed-bulk-toolbar"><strong>{selectedIds.length} selected</strong><button type="button" onClick={() => announceLibraryAction("Bulk download stays backend-gated. Open a record to request an approved copy.")}><Download size={15} />Download</button><button type="button" onClick={() => announceLibraryAction("Collection edits are not written back in beta. Use Package Builder for portal-local refs.")}><Folder size={15} />Add to collection</button><button type="button" onClick={() => announceLibraryAction("Share links are disabled until identity and access policy are connected.")}><Share2 size={15} />Share</button><button type="button" onClick={() => announceLibraryAction("Bulk more actions are disabled until backend policy actions are connected.")}><MoreHorizontal size={15} />More</button><button type="button" onClick={() => setSelectedIds(assets.map((asset) => asset.id))}>Select visible</button></div>
            {assets.length ? <div className="ed-grid">{assets.map((asset) => <AssetCard asset={asset} selected={selectedIds.includes(asset.id)} onSelect={() => toggleAsset(asset)} key={asset.id} />)}</div> : (
              <section className="ed-empty-state ed-empty-search">
                <span className="ed-empty-icon"><Search size={24} /></span>
                <p className="ed-empty-eyebrow">{sourceNoun(search.source)} discovery</p>
                <h2>No {sourceNoun(search.source)} records match this search</h2>
                <p>Try a broader ministry, category, channel, or rights term. Saved views and common filters stay available for a fast reset.</p>
                <div className="ed-empty-actions">
                  <ActionButton tone="primary" onClick={clearAll}>Reset library</ActionButton>
                  <ActionButton onClick={() => setQuery("")}>Clear search</ActionButton>
                </div>
                <div className="ed-empty-suggestions" aria-label="Suggested searches">
                  {["Sabbath", "Teaching", "No people", "Approved Public"].map((term) => (
                    <button type="button" key={term} onClick={() => setQuery(term)}>{term}</button>
                  ))}
                </div>
              </section>
            )}
            {pagination ? <div className="ed-bulk-toolbar" aria-label="Library pagination"><strong>Showing {pagination.rangeStart.toLocaleString()}-{pagination.rangeEnd.toLocaleString()} of {search.data?.total.toLocaleString()}</strong><button type="button" disabled={!pagination.hasPrevious} onClick={() => setOffset(pagination.previousOffset)}>Previous</button><button type="button" disabled={!pagination.hasNext} onClick={() => setOffset(pagination.nextOffset)}>Next</button></div> : null}
          </main>
          <InspectorDrawer asset={selected} source={search.source} live={search.live} />
        </div>
      )}
    </div>
  );
}
