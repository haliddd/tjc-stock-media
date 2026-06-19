"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Grid3X3, Images, Search, ShieldAlert } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetsSearch } from "@/components/dam/useDamApi";
import { collectionDefinitionForId } from "@/lib/catalog-language";
import { canReview } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";
import type { CatalogCollection, SavedViewSummary } from "@/lib/types";
import { ActionButton, ErrorCard, LoadingCard, PageHeader } from "./EnterpriseShared";
import type { EnterpriseStatus } from "@/lib/enterprise-status";

type CollectionSectionId = "featured" | "ministry" | "channel" | "review";
type CollectionFilterId =
  | "all"
  | "ready"
  | "review"
  | "guidance"
  | "internal"
  | "rights"
  | "ministry"
  | "year"
  | "media";

type CollectionReadiness = {
  readyCount: number;
  reviewNeeded: number;
  status: EnterpriseStatus;
  useGuidance: string;
  nextAction: string;
  blockers: string[];
};

type CollectionCardModel = {
  collection: CatalogCollection;
  section: CollectionSectionId;
  readiness: CollectionReadiness;
};

const reviewSavedViewIds = new Set(["needs-review", "rights-basis-review", "children-youth-review", "rendition-gaps", "duplicate-candidates", "stale-approvals"]);

const sectionCopy: Record<CollectionSectionId, { title: string; description: string }> = {
  featured: {
    title: "Featured albums / events",
    description: "Common starting points with item-level use guidance."
  },
  ministry: {
    title: "Ministry albums / events",
    description: "Church life, worship, teaching, and teams."
  },
  channel: {
    title: "Channel albums / events",
    description: "Website, slide, print, and social groupings."
  },
  review: {
    title: "Review worklists",
    description: "Reviewer queues kept out of normal browsing."
  }
};

function normalizeText(value = "") {
  return value.toLowerCase();
}

function matchesCollection(collection: CatalogCollection, query: string) {
  if (!query.trim()) return true;
  const definition = collectionDefinitionForId(collection.id);
  const haystack = [
    collection.name,
    collection.description,
    definition?.group,
    collection.countLabel,
    collection.dateRange,
    collection.ministry,
    collection.approvalSummary,
    collection.peopleWarning,
    collection.searchQuery,
    definition?.routeFilter
  ].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

function collectionReadiness(collection: CatalogCollection): CollectionReadiness {
  const readyMatch = collection.approvalSummary.match(/\d+/);
  const readyCount = readyMatch ? Number(readyMatch[0]) : collection.count;
  const reviewNeeded = Math.max(0, collection.count - readyCount);
  const definition = collectionDefinitionForId(collection.id);
  const isReviewList = definition?.group === "Governance collections" || collection.id === "review-intake" || collection.id === "archive-reference";
  const isInternal = /internal/i.test(collection.name) || /internal/i.test(collection.description);
  const blockers = [
    reviewNeeded ? `${reviewNeeded.toLocaleString()} asset${reviewNeeded === 1 ? "" : "s"} need review` : "",
    collection.peopleWarning || "",
    /rights/i.test(collection.id) || /rights/i.test(collection.description) ? "Rights evidence needs reviewer attention" : "",
    collection.id === "archive-reference" ? "Archive/reference records are not promoted for reuse" : ""
  ].filter(Boolean);
  return {
    readyCount,
    reviewNeeded,
    status: blockers.length || isReviewList ? "Needs Review" : isInternal ? "Read-only" : "Active",
    useGuidance: blockers.length || isReviewList
      ? "Restricted until reviewed"
      : isInternal
        ? "Internal ministry"
        : "Item-level use guidance",
    nextAction: blockers.length || isReviewList ? "Review issues" : "Open album",
    blockers
  };
}

function sectionForCollection(collection: CatalogCollection): CollectionSectionId {
  const group = collectionDefinitionForId(collection.id)?.group;
  if (group === "Ministry collections") return "ministry";
  if (group === "Channel collections") return "channel";
  if (group === "Governance collections" || collection.id === "review-intake" || collection.id === "archive-reference") return "review";
  return "featured";
}

function filterMatches(model: CollectionCardModel, activeFilter: CollectionFilterId) {
  const { collection, section, readiness } = model;
  const name = normalizeText(collection.name);
  const description = normalizeText(collection.description);
  if (activeFilter === "all") return true;
  if (activeFilter === "ready") return readiness.status === "Active" || readiness.status === "Read-only";
  if (activeFilter === "review") return readiness.status === "Needs Review" || section === "review";
  if (activeFilter === "guidance") return name.includes("public") || readiness.useGuidance === "Item-level use guidance";
  if (activeFilter === "internal") return name.includes("internal") || description.includes("internal") || readiness.useGuidance === "Internal ministry";
  if (activeFilter === "rights") return collection.id.includes("rights") || description.includes("rights");
  if (activeFilter === "ministry") return section === "ministry";
  if (activeFilter === "year") return collection.dateRange !== "Date not available";
  if (activeFilter === "media") return section === "channel";
  return true;
}

function sectionedCollections(models: CollectionCardModel[]) {
  const sectionOrder: CollectionSectionId[] = ["featured", "ministry", "channel", "review"];
  return sectionOrder
    .map((section) => ({ section, collections: models.filter((model) => model.section === section) }))
    .filter((group) => group.collections.length);
}

function filterLabel(filter: CollectionFilterId) {
  const labels: Record<CollectionFilterId, string> = {
    all: "All albums",
    ready: "Openable",
    review: "Needs review",
    guidance: "Use guidance",
    internal: "Internal ministry",
    rights: "Missing rights",
    ministry: "By ministry",
    year: "By year",
    media: "By media type"
  };
  return labels[filter];
}

function collectionGuidanceBadge(readiness: CollectionReadiness, canSeeReviewTools: boolean) {
  if (readiness.status === "Needs Review") {
    return { label: canSeeReviewTools ? "Needs review" : "Restricted", className: "is-warning" };
  }
  if (readiness.status === "Read-only") return { label: "Internal ministry", className: "is-warning" };
  return { label: "Use guidance", className: "is-success" };
}

function CollectionGuidanceBadge({ readiness, canSeeReviewTools }: { readiness: CollectionReadiness; canSeeReviewTools: boolean }) {
  const badge = collectionGuidanceBadge(readiness, canSeeReviewTools);
  return <span className={`ed-badge ${badge.className}`}>{badge.label}</span>;
}

function audienceForSection(section: CollectionSectionId, collection: CatalogCollection) {
  if (section === "channel") return "Communications teams";
  if (section === "review") return "Reviewers and admins";
  return collection.ministry || "Church teams";
}

function usageSentence(readiness: CollectionReadiness, canSeeReviewTools: boolean) {
  if (readiness.status === "Needs Review") {
    return canSeeReviewTools
      ? "This album has items that need reviewer attention before broader use."
      : "Some items in this album are restricted until a reviewer confirms usage guidance.";
  }
  if (readiness.status === "Read-only") return "Use inside ministry contexts unless item guidance says otherwise.";
  return "Open the album and follow each item usage note before sharing.";
}

function reviewViews(savedViews: SavedViewSummary[] = []) {
  return savedViews.filter((view) => reviewSavedViewIds.has(view.id));
}

function CollectionPreviewStrip({ images }: { images: CatalogCollection["images"] }) {
  const previews = images.slice(0, 5);
  return (
    <div className="ed-collection-preview-strip" aria-hidden="true">
      {previews.length ? previews.map((image, index) => (
        <span key={`${image.src}-${index}`}>
          <img src={image.src} alt="" />
        </span>
      )) : (
        <>
          <span className="is-empty"><Images size={15} /></span>
          <span className="is-empty"><Images size={15} /></span>
          <span className="is-empty"><Images size={15} /></span>
        </>
      )}
    </div>
  );
}

function CollectionCard({
  model,
  active,
  onSelectDetails,
  onOpen,
  canSeeReviewTools
}: {
  model: CollectionCardModel;
  active: boolean;
  onSelectDetails: () => void;
  onOpen: () => void;
  canSeeReviewTools: boolean;
}) {
  const { collection, readiness, section } = model;
  return (
    <article className={`ed-collection-card${active ? " is-selected" : ""}${section === "review" ? " is-worklist" : ""}`}>
      <button
        type="button"
        className="ed-collection-card-select"
        onClick={onSelectDetails}
        aria-label={`Show details for ${collection.name}`}
        aria-pressed={active}
      >
        <CollectionPreviewStrip images={collection.images} />
        <span className="ed-collection-card-copy">
          <strong>{collection.name}</strong>
          <span>{collection.description}</span>
        </span>
      </button>
      <div className="ed-collection-card-meta">
        <span>{collection.countLabel}</span>
        <span>{collection.dateRange}</span>
        <CollectionGuidanceBadge readiness={readiness} canSeeReviewTools={canSeeReviewTools} />
      </div>
      <div className="ed-collection-card-actions">
        <button type="button" onClick={onOpen}>Open album</button>
        {canSeeReviewTools ? <button type="button" onClick={onSelectDetails}>{active ? "Selected" : "Details"}</button> : null}
      </div>
    </article>
  );
}

function AlbumDetails({
  model,
  canSeeReviewTools,
  onOpen,
  onReview
}: {
  model?: CollectionCardModel;
  canSeeReviewTools: boolean;
  onOpen: (collection: CatalogCollection) => void;
  onReview: () => void;
}) {
  if (!model) {
    return (
      <aside className="ed-panel ed-collection-inspector">
        <section className="ed-empty-state is-quiet">
          <FolderOpen size={24} />
          <h2>Select an album or event</h2>
          <p>Choose a group to see use guidance and next action.</p>
        </section>
      </aside>
    );
  }

  const { collection, readiness, section } = model;
  const audience = audienceForSection(section, collection);
  const usage = usageSentence(readiness, canSeeReviewTools);
  return (
    <aside className="ed-panel ed-collection-inspector" aria-label={`${collection.name} album or event details`}>
      <div className="ed-panel-title">
        <h3>{collection.name}</h3>
        <CollectionGuidanceBadge readiness={readiness} canSeeReviewTools={canSeeReviewTools} />
      </div>
      <p className="ed-collection-inspector-summary">{collection.description}</p>
      <CollectionPreviewStrip images={collection.images} />
      <dl className="ed-collection-inspector-metadata">
        <div>
          <dt>Items</dt>
          <dd>{collection.countLabel}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{collection.dateRange}</dd>
        </div>
        <div>
          <dt>Ministry</dt>
          <dd>{collection.ministry}</dd>
        </div>
        <div>
          <dt>Audience</dt>
          <dd>{audience}</dd>
        </div>
        <div>
          <dt>Usage</dt>
          <dd>{readiness.useGuidance}</dd>
        </div>
      </dl>
      <section className="ed-collection-usage-note" aria-label="Use guidance">
        <CollectionGuidanceBadge readiness={readiness} canSeeReviewTools={canSeeReviewTools} />
        <p>{usage}</p>
      </section>
      {canSeeReviewTools && readiness.status === "Needs Review" ? (
        <section className="ed-collection-review-summary" aria-label="Review issues">
          <strong>Review issues</strong>
          <ul>
            {readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </section>
      ) : null}
      <div className="ed-collection-inspector-actions">
        <ActionButton tone="primary" icon={FolderOpen} onClick={() => onOpen(collection)}>Open album</ActionButton>
        {readiness.status === "Needs Review" ? (
          <ActionButton onClick={() => onOpen(collection)}>Request permission</ActionButton>
        ) : null}
        {canSeeReviewTools && readiness.status === "Needs Review" ? (
          <ActionButton icon={ShieldAlert} onClick={onReview}>Review issues</ActionButton>
        ) : null}
      </div>
    </aside>
  );
}

export function EnterpriseCollectionsPage() {
  const router = useRouter();
  const { role } = useDemoRole();
  const canSeeReviewTools = canReview(role);
  const search = useAssetsSearch({ role, sort: "Approved first", limit: 48 });
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CollectionFilterId>("all");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");

  const allModels = useMemo(() => {
    return (search.data?.collections || [])
      .filter((collection) => matchesCollection(collection, submittedQuery))
      .map((collection) => ({
        collection,
        section: sectionForCollection(collection),
        readiness: collectionReadiness(collection)
      }))
      .filter((model) => canSeeReviewTools || model.section !== "review");
  }, [canSeeReviewTools, search.data?.collections, submittedQuery]);

  const filteredModels = useMemo(
    () => allModels.filter((model) => filterMatches(model, activeFilter)),
    [activeFilter, allModels]
  );
  const selectedModel = filteredModels.find((model) => model.collection.id === selectedCollectionId) || filteredModels[0];
  const collectionGroups = sectionedCollections(filteredModels);
  const reviewerWorklists = canSeeReviewTools ? reviewViews(search.data?.savedViews) : [];
  const filteredReviewerWorklists = activeFilter === "all" || activeFilter === "review" || activeFilter === "rights" ? reviewerWorklists : [];
  const filters: CollectionFilterId[] = canSeeReviewTools
    ? ["all", "ready", "review", "guidance", "internal", "rights", "ministry", "year", "media"]
    : ["all", "ready", "guidance", "internal", "ministry", "year", "media"];
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
    setSelectedCollectionId("");
  }

  function openCollection(collection: CatalogCollection) {
    const routeFilter = collectionDefinitionForId(collection.id)?.routeFilter;
    const path = routeFilter
      ? `/library?filter=${encodeURIComponent(routeFilter)}`
      : `/library?collection=${encodeURIComponent(collection.id)}`;
    router.push(routeWithRole(path, role));
  }

  function viewAllMedia() {
    router.push(routeWithRole("/library", role));
  }

  function openReviewIssues() {
    router.push(routeWithRole("/review?queue=pending", role));
  }

  function openSavedReviewView(view: SavedViewSummary) {
    router.push(routeWithRole(`/library?view=${encodeURIComponent(view.id)}`, role));
  }

  return (
    <div className="enterprise-page enterprise-collections">
      <PageHeader
        title="Albums / Events"
        subtitle="Browse albums and event groups. Some albums include restricted items. Open an album to see usage guidance."
        count={`${filteredModels.length.toLocaleString()} albums`}
        actions={(
          <>
            <ActionButton icon={FolderOpen} onClick={() => selectedModel && openCollection(selectedModel.collection)} disabled={!selectedModel} disabledReason="Select an album or event first.">Open selected</ActionButton>
            <ActionButton icon={Grid3X3} onClick={viewAllMedia}>View all media</ActionButton>
          </>
        )}
      />

      <form className="ed-search-shell ed-collection-search" onSubmit={submit}>
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search albums, events, ministries..." />
        {submittedQuery ? <button type="button" onClick={() => { setQuery(""); setSubmittedQuery(""); setSelectedCollectionId(""); }}>Clear</button> : null}
      </form>

      {search.loading ? <LoadingCard label="Loading albums / events..." /> : search.error ? <ErrorCard message={search.error} source={search.source} /> : (
        <div className="ed-collection-browser-grid">
          <aside className="ed-panel ed-collection-filter-rail" aria-label="Album and event filters">
            <section className="ed-collection-filter-summary">
              <strong>{allModels.length.toLocaleString()}</strong>
              <span>albums and events ready to browse</span>
            </section>
            <nav>
              {filters.map((filter) => {
                const count = allModels.filter((model) => filterMatches(model, filter)).length;
                return (
                  <button
                    type="button"
                    key={filter}
                    className={activeFilter === filter ? "is-active" : ""}
                    aria-pressed={activeFilter === filter}
                    onClick={() => { setActiveFilter(filter); setSelectedCollectionId(""); }}
                  >
                    <span>{filterLabel(filter)}</span>
                    <em>{count.toLocaleString()}</em>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="ed-collection-browser-main" aria-label="Albums and events browser">
            {collectionGroups.length || filteredReviewerWorklists.length ? (
              <>
                {collectionGroups.map((group) => (
                  <section className={`ed-collection-section is-${group.section}`} key={group.section}>
                    <header>
                      <div>
                        <h2>{sectionCopy[group.section].title}</h2>
                        <p>{sectionCopy[group.section].description}</p>
                      </div>
                      <span>{group.collections.length.toLocaleString()} album{group.collections.length === 1 ? "" : "s"}</span>
                    </header>
                    <div className="ed-collection-card-grid">
                      {group.collections.map((model) => (
                        <CollectionCard
                          key={model.collection.id}
                          model={model}
                          active={selectedModel?.collection.id === model.collection.id}
                          onSelectDetails={() => setSelectedCollectionId(model.collection.id)}
                          onOpen={() => openCollection(model.collection)}
                          canSeeReviewTools={canSeeReviewTools}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                {filteredReviewerWorklists.length ? (
                  <section className="ed-collection-section is-review-worklists">
                    <header>
                      <div>
                        <h2>Review worklists</h2>
                        <p>Reviewer-only queues for rights, consent, and metadata.</p>
                      </div>
                      <span>{filteredReviewerWorklists.length.toLocaleString()} worklist{filteredReviewerWorklists.length === 1 ? "" : "s"}</span>
                    </header>
                    <div className="ed-collection-worklist-grid">
                      {filteredReviewerWorklists.map((view) => (
                        <button type="button" key={view.id} onClick={() => openSavedReviewView(view)}>
                          <span>{view.label}</span>
                          <strong>{view.count.toLocaleString()}</strong>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <section className="ed-empty-state">
                <Search size={24} />
                <h2>No albums or events match</h2>
                <p>Try a ministry, event, channel, or reset filters.</p>
                <ActionButton onClick={() => { setQuery(""); setSubmittedQuery(""); setActiveFilter("all"); }}>Clear filters</ActionButton>
              </section>
            )}
          </main>

          <AlbumDetails model={selectedModel} canSeeReviewTools={canSeeReviewTools} onOpen={openCollection} onReview={openReviewIssues} />
        </div>
      )}
    </div>
  );
}
