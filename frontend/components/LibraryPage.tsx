"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Database, Filter, FolderOpen, LayoutGrid, List, Mail, Package, RotateCcw, Search, UploadCloud } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { DamEmptyState as EmptyState, DamHeroSearch as HeroSearch, DamMediaCard as MediaCard, DamPrimaryAction as PrimaryAction, DamTrustSignalStrip as TrustSignalStrip, DamUseCaseCard as UseCaseCard, findUseCases } from "@/components/dam/DamWorkspace";
import { FilterSidebar } from "@/components/FilterSidebar";
import { GatedDownloadButton } from "@/components/GatedDownloadButton";
import { LibraryPagination } from "@/components/LibraryPagination";
import { useDemoRole } from "@/components/RoleProvider";
import { RawStatusBadge, UsageBadge } from "@/components/StatusBadge";
import type { CatalogSort, DemoRole, SearchResult, StockMediaAsset } from "@/lib/types";
import { assetLibraryScanSummary, assetMetadataHealth } from "@/lib/asset-governance";
import { assetPresentation } from "@/lib/presentation";
import { cn } from "@/lib/ui";
import { viewerVerdictForAsset } from "@/lib/viewer-verdict";

const viewerDefaultView = "approved-church-wide";
const sortOptions: CatalogSort[] = ["Approved first", "Recently approved", "Newest", "A-Z"];
const viewerFacetGroups = [
  { label: "Use", options: ["Website image", "Slide background", "Newsletter", "Youth-safe"] },
  { label: "Media type", options: ["Photo", "Video", "Graphic", "Document"] },
  { label: "People", options: ["No people", "Adults visible", "Youth review needed"] },
  { label: "Availability", options: ["Approved copies", "Review required before use", "Source restricted"] }
] as const;

function healthTone(score: number) {
  if (score >= 90) return "border-[#b8d9c6] bg-[#edf8f1] text-[#22563a]";
  if (score >= 70) return "border-[#ead6a8] bg-[#fff7e5] text-[#725216]";
  return "border-[#e5b7b5] bg-[#fff0ef] text-[#7d2d2a]";
}

function OpsAssetRow({ asset, selected }: { asset: StockMediaAsset; selected?: boolean }) {
  const display = assetPresentation(asset, "Reviewer");
  const health = assetMetadataHealth(asset);
  const scan = assetLibraryScanSummary(asset, "Reviewer");
  return (
    <Link
      href={`/assets/${asset.id}`}
      className={cn(
        "grid min-h-32 items-center gap-3 border-b border-[#e1e7e2] bg-white px-3 py-3 text-sm transition last:border-b-0 hover:bg-[#f7faf7] xl:grid-cols-[minmax(9rem,12rem)_minmax(10rem,1fr)_minmax(6rem,8rem)_minmax(7rem,9rem)_minmax(6rem,8rem)_minmax(6rem,8rem)_minmax(5rem,7rem)]",
        selected && "bg-[#eef8f2]"
      )}
    >
      <span className="block aspect-video w-full overflow-hidden rounded-[12px] bg-[#e9efeb]">
        {display.image ? <img className="h-full w-full object-cover" src={display.image} alt={asset.thumbnailAlt} loading="lazy" /> : null}
      </span>
      <span className="min-w-0">
        <strong className="line-clamp-2 text-base font-black leading-tight text-tjc-ink">{display.title}</strong>
        <span className="mt-1 block truncate text-xs font-semibold text-tjc-muted">{asset.collection}</span>
      </span>
      <span data-badge-slot="ops-status"><RawStatusBadge status={asset.status} size="xs" /></span>
      <span data-badge-slot="ops-usage"><UsageBadge scope={asset.usageScope} size="xs" /></span>
      <span className="text-xs font-semibold text-tjc-muted">{scan.rightsRiskLabel} · {scan.peopleLabel}</span>
      <span className="truncate text-xs font-semibold text-tjc-muted">RS {asset.resourceSpaceId || asset.id}</span>
      <span className={cn("h-fit rounded-[10px] border px-2 py-1 text-xs font-black tabular-nums", healthTone(health.score))} title={scan.nextActionDetail}>{scan.nextAction}</span>
    </Link>
  );
}

function ViewerAssetListRow({ asset, role }: { asset: StockMediaAsset; role: DemoRole }) {
  const display = assetPresentation(asset, role);
  const verdict = viewerVerdictForAsset(asset, role);
  const scan = assetLibraryScanSummary(asset, role);
  return (
    <Link
      href={`/assets/${asset.id}`}
      className="viewer-asset-list-row grid min-h-28 items-center gap-3 border-b border-[var(--dam-border)] bg-white px-3 py-3 text-sm transition last:border-b-0 hover:bg-[var(--dam-panel-muted)] md:grid-cols-[9rem_minmax(0,1fr)_10rem_9rem_8rem]"
    >
      <span className="block aspect-video overflow-hidden rounded-xl bg-[#e9e8f2]">
        {display.image ? <img className="h-full w-full object-cover" src={display.image} alt={asset.thumbnailAlt} loading="lazy" /> : null}
      </span>
      <span className="min-w-0">
        <strong className="line-clamp-2 text-base font-black leading-tight text-[var(--dam-ink)]">{display.title}</strong>
        <span className="mt-1 block truncate text-sm font-semibold text-[var(--dam-muted)]">{display.cardSubtitle}</span>
      </span>
      <span className={cn("grid w-fit gap-0.5 rounded-md border px-2.5 py-1 text-xs font-black", verdict.canDownload ? "border-[#b8d9c6] bg-[#edf8f1] text-[#22563a]" : "border-[#ead6a8] bg-[#fff7e5] text-[#725216]")}>
        <strong>{verdict.label}</strong>
        <small className="font-semibold">{scan.nextAction}</small>
      </span>
      <span className="truncate text-xs font-semibold text-[var(--dam-muted)]">{scan.reuseTierLabel} · {asset.mediaType}</span>
      <span className="truncate text-xs font-black text-[var(--dam-muted)]">Ref {asset.id}</span>
    </Link>
  );
}

function ReviewNeededShelf({ assets, onOpen }: { assets: StockMediaAsset[]; onOpen: () => void }) {
  if (!assets.length) return null;
  return (
    <section className="review-needed-shelf mt-3" aria-label="Items needing review">
      <header>
        <span>Holding shelf</span>
        <div>
          <h3>Approved records needing final reuse checks</h3>
          <p>Open a record for guidance. Downloads stay blocked until reuse checks clear.</p>
        </div>
        <button type="button" onClick={onOpen}>Show all</button>
      </header>
      <div className="review-needed-shelf-grid">
        {assets.slice(0, 6).map((asset) => {
          const display = assetPresentation(asset, "Viewer");
          return (
            <Link className="review-needed-card" href={`/assets/${asset.id}`} key={asset.id}>
              <span className="review-needed-thumb">
                {display.image ? <img src={display.image} alt={asset.thumbnailAlt} loading="lazy" /> : <span>Preview protected</span>}
              </span>
              <span className="review-needed-copy">
                <strong>{display.title}</strong>
                <small>{asset.mediaType} - Open record first</small>
              </span>
              <em>Review needed</em>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function LibraryPage() {
  const { role, ready } = useDemoRole();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedView, setSelectedView] = useState(viewerDefaultView);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [sort, setSort] = useState<CatalogSort>("Approved first");
  const [filters, setFilters] = useState<string[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [reviewNeededPreview, setReviewNeededPreview] = useState<StockMediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pageOffset, setPageOffset] = useState(0);
  const [pageLimit, setPageLimit] = useState(24);
  const opsView = role === "Reviewer" || role === "DAM Admin";

  useEffect(() => {
    function updatePageLimit() {
      const width = window.innerWidth;
      setPageLimit(width < 640 ? 10 : width >= 1536 ? 36 : 24);
    }
    updatePageLimit();
    window.addEventListener("resize", updatePageLimit);
    return () => window.removeEventListener("resize", updatePageLimit);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialView = params.get("view");
    const initialCollection = params.get("collection");
    const initialQuery = params.get("q");
    if (initialView) {
      setSelectedView(initialView);
      setSelectedCollection("");
      return;
    }
    if (initialCollection) {
      setSelectedView("");
      setSelectedCollection(initialCollection);
      return;
    }
    if (initialQuery) {
      setSelectedView("");
      setQuery(initialQuery);
      setSubmittedQuery(initialQuery);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (role === "Viewer") {
      setSelectedView((current) => {
        if (submittedQuery || selectedCollection) return current === viewerDefaultView ? "" : current;
        return current || viewerDefaultView;
      });
    } else if (selectedView === viewerDefaultView && !submittedQuery) {
      setSelectedView("");
    }
  }, [ready, role, selectedView, submittedQuery, selectedCollection]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({ q: submittedQuery, sort, limit: String(pageLimit), offset: String(pageOffset) });
    if (selectedView) params.set("view", selectedView);
    if (selectedCollection) params.set("collection", selectedCollection);
    filters.forEach((filter) => params.append("filter", filter));
    return `/api/assets/search?${params.toString()}`;
  }, [submittedQuery, sort, pageLimit, pageOffset, selectedView, selectedCollection, filters]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(apiUrl)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load media.");
        return data as SearchResult;
      })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, ready]);

  useEffect(() => {
    if (!ready || role !== "Viewer") {
      setReviewNeededPreview([]);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ view: "batch-approved-blockers", limit: "6" });
    fetch(`/api/assets/search?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as SearchResult;
      })
      .then((data) => {
        if (!cancelled) setReviewNeededPreview(data?.assets || []);
      })
      .catch(() => {
        if (!cancelled) setReviewNeededPreview([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, role]);

  useEffect(() => {
    setPageOffset(0);
  }, [selectedView, selectedCollection, submittedQuery, filters, sort, role]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = String(new FormData(event.currentTarget).get("q") || "").trim();
    setSelectedView("");
    setSelectedCollection("");
    setSubmittedQuery(nextQuery);
    setQuery(nextQuery);
    window.history.replaceState(null, "", nextQuery ? `/?q=${encodeURIComponent(nextQuery)}` : "/");
  }

  function openSavedView(viewId: string) {
    setSelectedView(viewId);
    setSelectedCollection("");
    setSubmittedQuery("");
    setQuery("");
    window.history.replaceState(null, "", `/?view=${encodeURIComponent(viewId)}`);
  }

  function clearSearchState() {
    const defaultView = role === "Viewer" ? viewerDefaultView : "";
    setSelectedView(defaultView);
    setSelectedCollection("");
    setSubmittedQuery("");
    setQuery("");
    setFilters([]);
    window.history.replaceState(null, "", defaultView ? `/?view=${encodeURIComponent(defaultView)}` : "/");
  }

  function toggleFilter(filter: string) {
    setFilters((current) => (current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]));
  }

  const assets = result?.assets || [];
  const selectedAsset = assets[0];
  const inspectorAsset = selectedAsset || (!opsView ? reviewNeededPreview[0] : undefined);
  const selectedAssetDisplay = inspectorAsset ? assetPresentation(inspectorAsset, role) : null;
  const selectedAssetVerdict = inspectorAsset ? viewerVerdictForAsset(inspectorAsset, role) : null;
  const pagination = result?.pagination;
  const activeView = result?.savedViews.find((view) => view.id === selectedView);
  const activeCollection = result?.collections.find((collection) => collection.id === selectedCollection);
  const viewerSafeDefaultEmpty = role === "Viewer" && selectedView === viewerDefaultView && !submittedQuery && !filters.length && !activeCollection;
  const title = opsView ? "Asset Library" : "Find approved media";
  const subtitle = opsView
    ? "Search media, source records, rights signals, packages, and ministry queues from one workspace."
    : "Search by ministry use, event, topic, or package.";
  const currentWorkspaceLabel = activeCollection?.name || (selectedView === viewerDefaultView ? "Ready copies" : activeView?.label) || (submittedQuery ? `Search: ${submittedQuery}` : "Ready copies");

  return (
    <div className="dam-shell">
      <section className="find-hero asset-bank-header p-3 sm:p-4" aria-label={opsView ? "Asset library front door" : "Find approved media"}>
        <div className={cn("relative z-[1] grid gap-3", opsView ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,.55fr)] lg:items-end" : "xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-end")}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <span className="dam-kicker">{opsView ? "Asset library" : "Asset library"}</span>
                <h1 className="dam-page-title mt-1">{title}</h1>
              </div>
              {!opsView ? (
                <span className="rounded-md border border-[#d6dfd8] bg-[#f8faf8] px-2.5 py-1 text-xs font-black text-tjc-evergreen">
                  Ready copies only by default
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 max-w-[58ch] text-sm font-semibold leading-relaxed text-tjc-muted">{subtitle}</p>
            <p className="mt-1 max-w-[72ch] text-xs font-black uppercase tracking-[.04em] text-[#725216]">
              Controlled reuse system: no evidence = no public/external download.
            </p>
            <div className="mt-3">
              <HeroSearch
                value={query}
                onChange={setQuery}
                onSubmit={submit}
                ops={opsView}
                placeholder={opsView ? "Search assets, collections, people, rights, source records..." : "Search assets, collections, people, rights, source records..."}
              />
            </div>
            {!opsView ? (
              <div className="asset-bank-controlbar mt-3 flex flex-wrap items-center gap-2" aria-label="Asset library controls">
                <span className="inline-flex min-h-8 items-center rounded-md border border-[#b8d9c6] bg-[#edf8f1] px-2.5 text-xs font-black text-[#22563a]" role="status">
                  Ready only
                </span>
                <button className="inline-flex min-h-8 items-center rounded-md border border-[#d1d5db] bg-white px-2.5 text-xs font-black text-[#3f4a43]" type="button" onClick={() => setFiltersOpen(true)}>
                  Filters
                </button>
                <button className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-black", viewMode === "grid" ? "border-[#b8d9c6] bg-[#edf8f1] text-[#22563a]" : "border-[#d1d5db] bg-white text-[#3f4a43]")} type="button" onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"}>
                  <LayoutGrid size={14} strokeWidth={1.9} aria-hidden="true" />
                  Grid
                </button>
                <button className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-black", viewMode === "list" ? "border-[#b8d9c6] bg-[#edf8f1] text-[#22563a]" : "border-[#d1d5db] bg-white text-[#3f4a43]")} type="button" onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"}>
                  <List size={14} strokeWidth={1.9} aria-hidden="true" />
                  List
                </button>
                <Link className="inline-flex min-h-8 items-center rounded-md border border-[#d1d5db] bg-white px-2.5 text-xs font-black text-tjc-evergreen" href="/collections">
                  Packages
                </Link>
              </div>
            ) : null}
          </div>
          {opsView ? (
            <div className="grid gap-3 rounded-[12px] border border-[#e5e7eb] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-black text-tjc-evergreen">
                <CheckCircle2 size={18} strokeWidth={1.9} aria-hidden="true" />
                Operations truth visible
              </div>
              <p className="text-sm font-semibold leading-relaxed text-tjc-muted">
                Reviewer/Admin search includes verdict, rights evidence, source, custody, package, audit, and blocked reuse state.
              </p>
            </div>
          ) : (
            <div className="asset-bank-rule grid gap-1 rounded-lg border border-[#e5e7eb] bg-[#fbfcfb] p-3 text-sm font-semibold leading-relaxed text-tjc-muted">
              <strong className="text-tjc-evergreen">Approved-copy workspace</strong>
              <span>Downloads stay blocked until a media record clears reuse checks.</span>
            </div>
          )}
        </div>
      </section>

      {!opsView ? (
        <>
          <div className="mt-3">
            <TrustSignalStrip
              signals={[
                { label: "Default library", value: "Approved copies first", tone: "approved" },
                { label: "Reuse decision", value: "Open record before download", tone: "info" },
                { label: "Protected source", value: "Originals request-only", tone: "blocked" },
                { label: "Unsure?", value: "Request DAM review", tone: "review" }
              ]}
            />
          </div>
          <section className="find-usecase-grid mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-7" aria-label="Common media tasks">
            {findUseCases.map((task) => {
              const props = {
                label: task.label,
                detail: task.detail,
                icon: task.icon
              };
              if ("href" in task) return <UseCaseCard {...props} href={task.href} key={task.label} />;
              return <UseCaseCard {...props} onClick={() => openSavedView(task.view)} key={task.label} />;
            })}
          </section>
        </>
      ) : (
        <section className="ops-workbench mt-5 grid gap-3 p-4 xl:grid-cols-[1fr_.9fr]" aria-label="Operational search summary">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Visible here", value: result?.counts.visibleToRole ?? "-", tone: "bg-[#f2f6fa] text-[#27435b]" },
              { label: "Portal ready", value: result?.counts.portalReady ?? "-", tone: "bg-[#eef8f2] text-[#194f34]" },
              { label: "Rights review", value: result?.counts.rightsReview ?? "-", tone: "bg-[#fff8e8] text-[#71500f]" },
              { label: "Children/youth", value: result?.counts.childrenYouth ?? "-", tone: "bg-[#fff1ef] text-[#7b332f]" }
            ].map((item) => (
              <div className={cn("rounded-[16px] p-3", item.tone)} key={item.label}>
                <strong className="block text-2xl font-black tabular-nums">{item.value}</strong>
                <span className="text-xs font-black">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-2 text-sm font-semibold text-tjc-muted">
            <div className="flex items-center gap-2 text-tjc-evergreen">
              <Database size={17} strokeWidth={1.9} aria-hidden="true" />
              <strong>{result?.source.label || "Loading source"}</strong>
            </div>
            <p>{result?.source.detail || "Loading media-library source state."}</p>
          </div>
        </section>
      )}

      {opsView ? (
        <section className="mt-3 grid gap-3 rounded-[12px] border border-[#d9dee3] bg-white p-3 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,.45fr)]" aria-label="Rights and incident search">
          <div>
            <span className="dam-kicker">Rights Search</span>
            <h2 className="mt-1 text-lg font-black text-tjc-ink">Find assets by source, license, person, event, package, download, or pending write.</h2>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-tjc-muted">
              This route is the incident desk: find all assets from a source, under a license, involving people/minors, expired, Do Not Use, downloaded by a user, used in a package, or waiting on ResourceSpace sync.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Verdict", "Approved / Restricted / Do Not Use"],
              ["Rights", "Owner/license, attribution, proof link"],
              ["Custody", "ResourceSpace, Drive, S3 derivative"],
              ["Audit", "Downloads, denials, share links, review actions"]
            ].map(([label, value]) => (
              <div className="rounded-md border border-[#e1e7e2] bg-[#fbfcfa] p-2" key={label}>
                <strong className="block font-black text-tjc-ink">{label}</strong>
                <span className="mt-1 block font-semibold leading-snug text-tjc-muted">{value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="mt-5 rounded-[12px] border border-[#dfb9b5] bg-[#fff1ef] p-4 text-sm font-semibold text-[#7b332f]" role="alert">
          {error}
        </section>
      ) : null}

      <div className={cn("asset-bank-console mt-5 grid gap-4", !opsView && "lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_24rem]")} data-testid="asset-bank-console">
        {!opsView ? (
          <aside className="find-facet-rail order-2 grid gap-3 self-start rounded-lg border border-[#d9dee3] bg-white p-3 lg:order-none lg:sticky lg:top-[calc(var(--app-header-height)+1rem)]" aria-label="Asset bank navigation">
            <section className="grid gap-2">
              <div>
                <h2 className="text-xs font-black uppercase tracking-[.04em] text-[#52606b]">Workspace</h2>
                <p className="mt-1 truncate text-sm font-black text-tjc-ink">{currentWorkspaceLabel}</p>
              </div>
              <div className="rounded-md border border-[#d9dee3] bg-[#f8faf9] px-2.5 py-2 text-xs font-semibold leading-relaxed text-tjc-muted">
                Downloads stay blocked until each media record clears reuse checks. Package approval never replaces item verdict.
              </div>
            </section>
            <section className="grid gap-1.5" aria-label="Saved views">
              <h3 className="text-xs font-black uppercase tracking-[.04em] text-[#52606b]">Saved views</h3>
              {[
                ["Ready copies", viewerDefaultView],
                ["Website image", "website-hero"],
                ["Slide background", "sermon-slides"],
                ["Youth-safe", "no-people"],
                ["Review needed", "batch-approved-blockers"]
              ].map(([label, view]) => (
                <button
                  className={cn(
                    "flex min-h-9 items-center justify-between rounded-md px-2 text-left text-xs font-black transition",
                    selectedView === view ? "bg-[#e8f3ee] text-tjc-evergreen" : "text-[#3f4a43] hover:bg-[#f7faf8]"
                  )}
                  type="button"
                  onClick={() => openSavedView(view)}
                  key={view}
                >
                  <span>{label}</span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
              <Link className="flex min-h-9 items-center justify-between rounded-md px-2 text-xs font-black text-[#3f4a43] hover:bg-[#f7faf8]" href="/collections">
                <span>Packages</span>
                <span aria-hidden="true">›</span>
              </Link>
            </section>
            <section className="grid gap-3" aria-label="Facets">
              <h3 className="text-xs font-black uppercase tracking-[.04em] text-[#52606b]">Facets</h3>
              {viewerFacetGroups.map((group) => (
                <div className="grid gap-1.5" key={group.label}>
                  <strong className="text-xs font-black text-tjc-ink">{group.label}</strong>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((filter) => (
                      <button
                        className={cn(
                          "min-h-7 rounded-md border px-2 text-[11px] font-black transition",
                          filters.includes(filter) ? "border-[#92b9aa] bg-[#e8f3ee] text-tjc-evergreen" : "border-[#d9dee3] bg-white text-[#52606b] hover:bg-[#f8faf9]"
                        )}
                        type="button"
                        onClick={() => toggleFilter(filter)}
                        aria-pressed={filters.includes(filter)}
                        key={filter}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </aside>
        ) : null}

      <section className="asset-bank-results order-1 grid gap-3 lg:order-none" aria-label="Find results">
        {!(viewerSafeDefaultEmpty && !loading && !assets.length) ? (
        <div className="asset-results-toolbar flex flex-wrap items-end justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-white px-3 py-3">
          <div>
            <h2 className="text-lg font-black text-tjc-ink">
              {loading ? "Loading media" : assets.length ? "Media results" : "Asset results"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-tjc-muted">
              {viewerSafeDefaultEmpty
                ? "Ready-only default is active."
                : pagination && result?.total
                ? `Showing ${pagination.rangeStart.toLocaleString()}-${pagination.rangeEnd.toLocaleString()} of ${result.total.toLocaleString()}`
                : activeCollection
                  ? `Package: ${activeCollection.name}`
                  : activeView
                    ? `View: ${activeView.label}`
                    : "Search or choose a use case."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {assets.length || filters.length ? (
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#c5d1c9] bg-white px-3 text-sm font-black text-tjc-evergreen transition hover:bg-[#eef7f1]" type="button" onClick={() => setFiltersOpen(true)}>
                <Filter size={16} strokeWidth={1.9} aria-hidden="true" />
                Filters
              </button>
            ) : null}
            {assets.length ? (
              <label className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#c5d1c9] bg-white px-3 text-sm font-black text-[#3f4a43]">
                Sort
                <select className="bg-transparent text-tjc-evergreen" value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}>
                  {sortOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ) : null}
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#c5d1c9] bg-white px-3 text-sm font-black text-tjc-evergreen transition hover:bg-[#eef7f1]" type="button" onClick={clearSearchState}>
              <RotateCcw size={16} strokeWidth={1.9} aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
        ) : null}

        {loading ? (
          <div className="media-results-grid" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="skeleton h-80 rounded-[14px]" key={index} />
            ))}
          </div>
        ) : null}

        {!loading && !assets.length ? (
          <div data-testid="library-empty-state">
            {viewerSafeDefaultEmpty ? (
              <div className="asset-empty-inline" data-testid="viewer-safe-empty-state">
                <EmptyState
                  title="No approved copies are ready yet"
                  description="Media may exist, but it still needs review, rights checks, or approved copies before normal users can reuse it."
                  primary={<PrimaryAction href="/collections" icon={Package}>Browse packages</PrimaryAction>}
                  secondary={<PrimaryAction href="mailto:media@tjc.org?subject=Request%20DAM%20review&body=Please%20review%20media%20for%20safe%20reuse.%0AContext:%20" tone="secondary" icon={Mail}>Request DAM review</PrimaryAction>}
                  tertiary={<PrimaryAction href="/upload" tone="secondary" icon={UploadCloud}>Send new media</PrimaryAction>}
                  className="library-empty-compact"
                />
                <button className="mt-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#e5cf93] bg-[#fff8e8] px-3 text-sm font-black text-[#71500f] transition hover:bg-[#fff2d2] active:translate-y-px" type="button" onClick={() => openSavedView("batch-approved-blockers")}>
                  Show items needing review, downloads stay blocked
                </button>
                <ReviewNeededShelf assets={reviewNeededPreview} onOpen={() => openSavedView("batch-approved-blockers")} />
              </div>
            ) : (
              <EmptyState
                title="No approved media matches this search"
                description="Try another use case, browse packages, or send media to the team for DAM review."
                primary={<PrimaryAction onClick={clearSearchState} icon={Search}>Find approved media</PrimaryAction>}
                secondary={<PrimaryAction href="/collections" tone="secondary" icon={FolderOpen}>Browse packages</PrimaryAction>}
              />
            )}
          </div>
        ) : null}

        {!loading && assets.length && !opsView && viewMode === "grid" ? (
          <div className="media-results-grid">
            {assets.map((asset, index) => (
              <MediaCard asset={asset} role={role} priority={index === 0 || index === 7} key={asset.id} />
            ))}
          </div>
        ) : null}

        {!loading && assets.length && !opsView && viewMode === "list" ? (
          <div className="overflow-hidden rounded-xl border border-[var(--dam-border)] bg-white shadow-[var(--dam-shadow-soft)]">
            <div className="hidden grid-cols-[9rem_minmax(0,1fr)_10rem_9rem_8rem] gap-3 border-b border-[var(--dam-border)] bg-[var(--dam-panel-muted)] px-3 py-2 text-xs font-black text-[var(--dam-muted)] md:grid">
              <span>Preview</span><span>Asset</span><span>Verdict</span><span>Type</span><span>Reference</span>
            </div>
            {assets.map((asset) => <ViewerAssetListRow asset={asset} role={role} key={asset.id} />)}
          </div>
        ) : null}

        {!loading && assets.length && opsView ? (
          <div className="overflow-hidden rounded-[12px] border border-[#d8e1da] bg-white">
            <div className="hidden grid-cols-[minmax(9rem,12rem)_minmax(10rem,1fr)_minmax(6rem,8rem)_minmax(7rem,9rem)_minmax(6rem,8rem)_minmax(6rem,8rem)_minmax(5rem,7rem)] gap-3 border-b border-[#d8e1da] bg-[#f3f6f4] px-3 py-2 text-xs font-black text-[#526059] xl:grid">
              <span>Preview</span><span>Asset</span><span>Workflow</span><span>Distribution</span><span>People</span><span>Reference</span><span>Health</span>
            </div>
            {assets.map((asset) => <OpsAssetRow asset={asset} key={asset.id} />)}
          </div>
        ) : null}

        {assets.length && pagination && result?.total ? (
          <LibraryPagination
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            total={result.total}
            hasPrevious={pagination.hasPrevious}
            hasNext={pagination.hasNext}
            loading={loading}
            onPrevious={() => setPageOffset(pagination.previousOffset)}
            onNext={() => setPageOffset(pagination.nextOffset)}
            pageSize={pageLimit}
            onPage={(page) => setPageOffset(Math.max(0, (page - 1) * pageLimit))}
          />
        ) : null}
      </section>

        {!opsView && inspectorAsset && selectedAssetDisplay && selectedAssetVerdict ? (
          <aside className="library-inspector-rail order-3 hidden self-start xl:grid" aria-label="Selected asset inspector">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-tjc-muted">1 of {result?.total?.toLocaleString() || assets.length.toLocaleString()}</span>
              <Link className="text-xs font-black text-tjc-evergreen" href={`/assets/${inspectorAsset.id}`}>Open record</Link>
            </div>
            <div className="overflow-hidden rounded-[10px] border border-[#d9dee3] bg-[#eef0f7]">
              {selectedAssetDisplay.image ? (
                <img className="aspect-[4/3] w-full object-cover" src={selectedAssetDisplay.image} alt={inspectorAsset.thumbnailAlt} loading="lazy" />
              ) : (
                <div className="dam-unavailable-preview min-h-44">
                  <strong>Preview unavailable</strong>
                  <span>Open record for derivative and permission state.</span>
                </div>
              )}
            </div>
            <div>
              <h2 className="line-clamp-2 text-lg font-black text-tjc-ink">{selectedAssetDisplay.title}</h2>
              <p className="mt-1 text-sm font-semibold text-tjc-muted">{selectedAssetDisplay.cardSubtitle}</p>
            </div>
            <section className={cn("rounded-[10px] border p-3", selectedAssetVerdict.canDownload ? "border-[#b8d9c6] bg-[#edf8f1]" : "border-[#ead6a8] bg-[#fff8e8]")} aria-label="Selected asset use decision">
              <span className="block text-xs font-black uppercase tracking-[.05em] text-[#536057]">Can I use this?</span>
              <strong className={cn("mt-1 block text-lg font-black leading-tight", selectedAssetVerdict.canDownload ? "text-[#22563a]" : "text-[#725216]")}>{selectedAssetVerdict.label}</strong>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-[#4d5b52]">{selectedAssetVerdict.reason}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-xs font-black text-[#52606b]">{inspectorAsset.mediaType}</span>
                <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-xs font-black text-[#52606b]">Source/original restricted</span>
              </div>
            </section>
            <dl className="library-inspector-ledger">
              {[
                ["Asset ID", inspectorAsset.id],
                ["Usage", inspectorAsset.usageScope],
                ["People", inspectorAsset.peopleRisk || "Unknown"],
                ["Review", inspectorAsset.reviewedDate || "Pending"],
                ["Source/original", "Restricted"],
                ["Evidence gate", selectedAssetVerdict.canDownload ? "Cleared for approved copy" : "Public download blocked"]
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {selectedAssetVerdict.canDownload ? (
              <GatedDownloadButton className="dam-action-button" href={selectedAssetVerdict.downloadHref} reason={`Library inspector approved-copy request for ${inspectorAsset.title}`}>Download Approved Copy</GatedDownloadButton>
            ) : (
              <Link className="dam-action-button" href={`/assets/${inspectorAsset.id}`}>View usage guidance</Link>
            )}
            <p className="text-xs font-semibold leading-relaxed text-tjc-muted">
              Collections and saved views help discovery only. Item-level record verdict controls reuse. Master/original files stay restricted.
            </p>
          </aside>
        ) : null}
      </div>

      <Dialog
        open={filtersOpen}
        title="Filter media"
        description={opsView ? "Use operational filters for review and governance work." : "Filter approved media by use, people visibility, and media type."}
        onClose={() => setFiltersOpen(false)}
        placement="right"
        maxWidthClassName="max-w-[28rem]"
        footer={(
          <>
            <PrimaryAction tone="secondary" onClick={() => setFilters([])}>Clear filters</PrimaryAction>
            <PrimaryAction onClick={() => setFiltersOpen(false)}>Show results</PrimaryAction>
          </>
        )}
      >
        {opsView ? (
          <FilterSidebar filters={filters} onToggle={toggleFilter} onClear={() => setFilters([])} variant="drawer" />
        ) : (
          <div className="grid gap-4">
            {[
              { label: "Best use", options: ["Website image", "Slide background", "Newsletter", "Social", "Youth-safe"] },
              { label: "Media type", options: ["Photo", "Video", "Audio", "Graphic", "Document"] },
              { label: "People visibility", options: ["No people", "Adults visible", "People unknown", "Youth review needed"] },
              { label: "Availability", options: ["Approved copies", "Review required before use", "Source file restricted"] }
            ].map((group) => (
              <section className="grid gap-2" key={group.label}>
                <h3 className="text-sm font-black text-tjc-ink">{group.label}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((filter) => (
                    <button
                      type="button"
                      className={cn(
                        "min-h-10 rounded-[10px] border px-3 text-left text-xs font-black transition",
                        filters.includes(filter) ? "border-[#92c2b0] bg-[#e8f5ef] text-tjc-evergreen" : "border-[#d8e1da] bg-white text-[#3f4a43] hover:bg-[#f8faf8]"
                      )}
                      onClick={() => toggleFilter(filter)}
                      aria-pressed={filters.includes(filter)}
                      key={filter}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}
