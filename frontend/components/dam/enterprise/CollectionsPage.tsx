"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Package, Search, ShieldCheck } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetsSearch } from "@/components/dam/useDamApi";
import { sourceLabel, sourceNoun } from "@/lib/enterprise-display";
import { routeWithRole } from "@/lib/role-routes";
import type { CatalogCollection } from "@/lib/types";
import { ActionButton, AssetPreviewStrip, ErrorCard, LoadingCard, PageHeader, SourcePill, StatusBadge } from "./EnterpriseShared";

function matchesCollection(collection: CatalogCollection, query: string) {
  if (!query.trim()) return true;
  const haystack = [
    collection.name,
    collection.description,
    collection.countLabel,
    collection.dateRange,
    collection.ministry,
    collection.approvalSummary,
    collection.peopleWarning,
    collection.searchQuery
  ].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

function packageReadiness(collection: CatalogCollection) {
  const readyMatch = collection.approvalSummary.match(/\d+/);
  const readyCount = readyMatch ? Number(readyMatch[0]) : collection.count;
  const reviewNeeded = Math.max(0, collection.count - readyCount);
  const score = collection.count ? Math.round((readyCount / collection.count) * 100) : 0;
  return {
    readyCount,
    reviewNeeded,
    score,
    label: reviewNeeded ? `${score}% package-ready` : "Ready set",
    bestUse: collection.searchQuery || `${collection.ministry} media`
  };
}

export function EnterpriseCollectionsPage() {
  const router = useRouter();
  const { role } = useDemoRole();
  const search = useAssetsSearch({ role, sort: "Approved first", limit: 36 });
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const collections = useMemo(
    () => (search.data?.collections || []).filter((collection) => matchesCollection(collection, submittedQuery)),
    [search.data?.collections, submittedQuery]
  );
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) || collections[0];
  const totals = collections.reduce(
    (sum, collection) => {
      const readiness = packageReadiness(collection);
      return {
        ready: sum.ready + readiness.readyCount,
        review: sum.review + readiness.reviewNeeded,
        total: sum.total + collection.count
      };
    },
    { ready: 0, review: 0, total: 0 }
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    setSelectedCollectionId("");
  }

  function openCollection(collection: CatalogCollection) {
    router.push(routeWithRole(`/?collection=${encodeURIComponent(collection.id)}`, role));
  }

  function startToolkit(collection: CatalogCollection) {
    router.push(routeWithRole(`/packages?collection=${encodeURIComponent(collection.id)}`, role));
  }

  return (
    <div className="enterprise-page enterprise-collections">
      <PageHeader
        title="Collections"
        subtitle="Package cabinet for ministry kits. Collections organize assets; each record keeps its own reuse decision."
        count={`${collections.length.toLocaleString()} packages`}
        actions={<><ActionButton icon={FolderOpen} onClick={() => selectedCollection && openCollection(selectedCollection)}>Open selected</ActionButton><ActionButton icon={Package} onClick={() => selectedCollection && startToolkit(selectedCollection)}>Start toolkit draft</ActionButton><ActionButton icon={ShieldCheck}>Item-level checks</ActionButton></>}
      />
      <section className="ed-approved-banner">
        <Package size={22} />
        <div><strong>{sourceLabel(search.source)}</strong><span>{search.source?.detail || `${sourceNoun(search.source)} source unavailable.`}</span></div>
        <span>Package approval never overrides asset approval</span>
      </section>
      <form className="ed-search-shell" onSubmit={submit}>
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ministry kits, events, channels, safety notes..." />
        {submittedQuery ? <button type="button" onClick={() => { setQuery(""); setSubmittedQuery(""); setSelectedCollectionId(""); }}>Clear</button> : null}
      </form>
      {search.loading ? <LoadingCard label="Loading collection cabinet..." /> : search.error ? <ErrorCard message={search.error} source={search.source} /> : (
        <>
        <AssetPreviewStrip
          assets={search.data?.assets || []}
          title="Collection preview samples"
          detail={selectedCollection ? `${selectedCollection.name} opens with preview-backed records where local derivatives exist.` : "Preview-backed records appear first for local beta review."}
        />
        <div className="ed-library-grid">
          <aside className="ed-panel ed-facet-panel">
            <section>
              <div className="ed-panel-title"><h3>Cabinet summary</h3><SourcePill source={search.source} live={search.live} /></div>
              <div className="ed-summary-grid">
                <span><strong>{totals.ready.toLocaleString()}</strong><small>Ready items</small></span>
                <span><strong>{totals.review.toLocaleString()}</strong><small>Need review</small></span>
                <span><strong>{totals.total.toLocaleString()}</strong><small>Total refs</small></span>
                <span><strong>{collections.length.toLocaleString()}</strong><small>Packages</small></span>
              </div>
            </section>
            <section>
              <div className="ed-panel-title"><h3>Use cases</h3></div>
              {["Website image", "Slide background", "Newsletter/social"].map((item) => <button type="button" key={item} onClick={() => { setQuery(item); setSubmittedQuery(item); }}>{item}</button>)}
            </section>
          </aside>
          <main className="ed-asset-workspace">
            {collections.length ? (
              <div className="ed-table-mini">
                {collections.map((collection) => {
                  const readiness = packageReadiness(collection);
                  const active = selectedCollection?.id === collection.id;
                  return (
                    <p className="ed-collection-package-row" key={collection.id}>
                      <strong>{collection.name}</strong>
                      <span>{collection.ministry} · {collection.countLabel} · {readiness.label}</span>
                      <StatusBadge status={readiness.reviewNeeded ? "Needs Review" : "Approved"} />
                      <button type="button" onClick={() => setSelectedCollectionId(collection.id)}>{active ? "Selected" : "Inspect"}</button>
                      <button type="button" onClick={() => openCollection(collection)}>Open media</button>
                      <button type="button" onClick={() => startToolkit(collection)}>Build toolkit</button>
                    </p>
                  );
                })}
              </div>
            ) : (
              <section className="ed-empty-state"><Search size={24} /><h2>No collections match this search</h2><p>Try a ministry, event, or channel term.</p><ActionButton onClick={() => { setQuery(""); setSubmittedQuery(""); }}>Clear search</ActionButton></section>
            )}
          </main>
          <aside className="ed-panel">
            {selectedCollection ? (
              <>
                <div className="ed-panel-title"><h3>{selectedCollection.name}</h3><StatusBadge status={packageReadiness(selectedCollection).reviewNeeded ? "Needs Review" : "Approved"} /></div>
                <p>{selectedCollection.description}</p>
                <section className="ed-collection-toolkit-callout">
                  <strong>{packageReadiness(selectedCollection).score}% ready for package planning</strong>
                  <span>Toolkit builder will add visible Portal Ready refs only. It will not create a ZIP, copy originals, or bypass item-level approval.</span>
                </section>
                <dl className="ed-metadata">
                  <div><dt>Ministry</dt><dd>{selectedCollection.ministry}</dd></div>
                  <div><dt>Best use</dt><dd>{packageReadiness(selectedCollection).bestUse}</dd></div>
                  <div><dt>Date range</dt><dd>{selectedCollection.dateRange}</dd></div>
                  <div><dt>Approval summary</dt><dd>{selectedCollection.approvalSummary}</dd></div>
                  <div><dt>Reuse rule</dt><dd>Asset-level approval required</dd></div>
                </dl>
                {selectedCollection.peopleWarning ? <p className="ed-setup-note">{selectedCollection.peopleWarning}</p> : null}
                <ActionButton tone="primary" icon={FolderOpen} onClick={() => openCollection(selectedCollection)}>Open collection media</ActionButton>
                <ActionButton icon={Package} onClick={() => startToolkit(selectedCollection)}>Start governed toolkit</ActionButton>
              </>
            ) : (
              <section className="ed-empty-state"><Package size={24} /><h2>Select a collection</h2><p>Pick a package to inspect readiness and reuse rules.</p></section>
            )}
          </aside>
        </div>
        </>
      )}
    </div>
  );
}
