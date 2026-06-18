"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Search, ShieldCheck } from "lucide-react";
import { DamEmptyState as EmptyState, DamHeroSearch as HeroSearch, DamPrimaryAction as PrimaryAction, DamTrustSignalStrip as TrustSignalStrip, DamUseCaseCard as UseCaseCard } from "@/components/dam/DamWorkspace";
import { DamPackageCard as PackageCard, DamPackageInspector as PackageInspector, PackageCabinetHeader, packageReadinessForRole } from "@/components/dam/DamPortal";
import { useDemoRole } from "@/components/RoleProvider";
import type { CatalogCollection, SearchResult } from "@/lib/types";

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

const packageUseCases = [
  { label: "Website image", detail: "Open approved web-ready package media.", view: "website-hero", icon: Search },
  { label: "Slide background", detail: "Find visuals for worship, class, or sermon decks.", view: "sermon-slides", icon: FolderOpen },
  { label: "Newsletter/social", detail: "Start from announcement and recap media.", view: "newsletter", icon: ShieldCheck }
] as const;

export function CollectionsPage() {
  const router = useRouter();
  const { role, ready } = useDemoRole();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const mobileInspectorRef = useRef<HTMLDivElement>(null);
  const opsView = role === "Reviewer" || role === "DAM Admin";

  const apiUrl = useMemo(() => "/api/assets/search?sort=Approved+first&limit=36", []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(apiUrl)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load packages.");
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

  const collections = useMemo(
    () => (result?.collections || []).filter((collection) => matchesCollection(collection, submittedQuery)),
    [result?.collections, submittedQuery]
  );
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) || collections[0];
  const packageReadinessTotals = collections.reduce(
    (totals, collection) => {
      const readiness = packageReadinessForRole(collection, role);
      return {
        ready: totals.ready + readiness.readyCount,
        review: totals.review + readiness.reviewNeeded
      };
    },
    { ready: 0, review: 0 }
  );
  const readyTotal = opsView ? result?.counts.portalReady ?? packageReadinessTotals.ready : packageReadinessTotals.ready;
  const reviewTotal = opsView
    ? result?.counts.needsReview ?? packageReadinessTotals.review
    : packageReadinessTotals.review;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  function openCollection(collection: CatalogCollection) {
    router.push(`/?collection=${encodeURIComponent(collection.id)}`);
  }

  function inspectCollection(collectionId: string) {
    setSelectedCollectionId(collectionId);
    window.setTimeout(() => {
      if (window.innerWidth < 1024) mobileInspectorRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  }

  return (
    <div className="dam-shell grid gap-5">
      <section className="find-hero asset-bank-header p-3 sm:p-4 lg:p-5" aria-label="Packages front door">
        <div className="relative z-[1] grid gap-4 xl:grid-cols-[minmax(0,.72fr)_minmax(22rem,.28fr)] xl:items-end">
          <div>
            <span className="dam-kicker">Ministry portals</span>
            <h1 className="dam-page-title mt-1">Packages</h1>
            <p className="mt-2 max-w-[60ch] text-sm font-semibold leading-relaxed text-tjc-muted sm:text-base">
              Curated ministry kits for websites, slides, newsletters, and safe reuse.
            </p>
            <p className="mt-2 max-w-[64ch] text-sm font-semibold text-[#53615a]">
              Package approval is not item approval. Package readiness helps planning, but every media record keeps its own final reuse decision.
            </p>
            <div className="mt-4">
              <HeroSearch value={query} onChange={setQuery} onSubmit={submit} placeholder="Search Sabbath, Bible study, fellowship, youth-safe..." />
            </div>
          </div>
          <div className="asset-bank-rule rounded-[10px] border border-[#e5e7eb] bg-[#fbfcfb] p-3 text-sm font-semibold leading-relaxed text-tjc-muted">
            <strong className="block text-tjc-evergreen">Package approval is not item approval.</strong>
            <span>Use package context to start faster, then check verdict, evidence, approved copy, and source restriction on every item.</span>
          </div>
        </div>
      </section>

      <section className="find-usecase-grid package-usecase-strip grid gap-2 sm:grid-cols-3" aria-label="Package use cases">
        {packageUseCases.map((item) => (
          <UseCaseCard
            key={item.label}
            label={item.label}
            detail={item.detail}
            icon={item.icon}
            onClick={() => router.push(`/?view=${item.view}`)}
          />
        ))}
      </section>

      <TrustSignalStrip
        signals={[
          { label: "Package purpose", value: "Curated ministry kit", tone: "info" },
          { label: "Item approval", value: "Still checked per asset", tone: "blocked" },
          { label: "Ready media", value: `${readyTotal?.toLocaleString?.() ?? readyTotal ?? "-"} approved copies`, tone: "approved" },
          { label: "Needs review", value: `${reviewTotal?.toLocaleString?.() ?? reviewTotal ?? "-"} item warnings`, tone: "review" }
        ]}
      />

      <section className="grid gap-3 rounded-[12px] border border-[#d9dee3] bg-white p-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.4fr)]" aria-label="Package reuse warning">
        <div>
          <span className="dam-kicker">Package Readiness</span>
          <h2 className="mt-1 text-lg font-black text-tjc-ink">Packages organize media; they do not grant permission.</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-tjc-muted">
            Every asset keeps its own verdict, evidence gate, approved derivative state, and source/original restriction. Open each media record to confirm final reuse decision.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border border-[#b8d9c6] bg-[#edf8f1] p-2 text-[#22563a]">
            <dt className="font-black">Approved copies</dt>
            <dd className="mt-1 text-lg font-black tabular-nums">{readyTotal?.toLocaleString?.() ?? readyTotal ?? "-"}</dd>
          </div>
          <div className="rounded-md border border-[#ead6a8] bg-[#fff8e8] p-2 text-[#725216]">
            <dt className="font-black">Review needed</dt>
            <dd className="mt-1 text-lg font-black tabular-nums">{reviewTotal?.toLocaleString?.() ?? reviewTotal ?? "-"}</dd>
          </div>
          <div className="rounded-md border border-[#e5b7b5] bg-[#fff1ef] p-2 text-[#7d2d2a]">
            <dt className="font-black">Unsafe items</dt>
            <dd className="mt-1 text-lg font-black tabular-nums">{reviewTotal?.toLocaleString?.() ?? reviewTotal ?? "-"}</dd>
          </div>
        </dl>
      </section>

      {error ? (
        <section className="rounded-[12px] border border-[#dfb9b5] bg-[#fff1ef] p-4 text-sm font-semibold text-[#7b332f]" role="alert">{error}</section>
      ) : null}

      <section className="collections-workbench grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,32rem)]" aria-label="Ministry packages">
        <div className="grid gap-4">
          <PackageCabinetHeader
            collections={collections}
            readyTotal={readyTotal}
            reviewTotal={reviewTotal}
            submittedQuery={submittedQuery}
            onClear={() => {
                setQuery("");
                setSubmittedQuery("");
                setSelectedCollectionId("");
            }}
          />

          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, index) => <div className="skeleton h-72 rounded-[14px]" key={index} />)}
            </div>
          ) : null}

          {!loading && !collections.length ? (
            <EmptyState
              title="No packages match this search"
              description="Try a ministry, event, or media use. Packages stay curated, and each media record still controls reuse."
              primary={<PrimaryAction onClick={() => { setQuery(""); setSubmittedQuery(""); }} icon={Search}>Search packages</PrimaryAction>}
            />
          ) : null}

          {!loading && collections.length ? (
            <div className="package-list-grid grid gap-3">
              {collections.map((collection) => (
                <div key={collection.id}>
                  <PackageCard
                    collection={collection}
                    role={role}
                    active={selectedCollection?.id === collection.id}
                    onInspect={() => inspectCollection(collection.id)}
                    onOpen={() => openCollection(collection)}
                  />
                  {selectedCollection?.id === collection.id ? (
                    <div ref={mobileInspectorRef} className="mt-4 scroll-mt-24 xl:hidden">
                      <PackageInspector collection={selectedCollection} totalCollections={collections.length} onOpen={openCollection} opsView={opsView} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-[calc(var(--app-header-height)+1rem)]">
            <PackageInspector collection={selectedCollection} totalCollections={collections.length} onOpen={openCollection} opsView={opsView} />
          </div>
        </div>
      </section>
    </div>
  );
}
