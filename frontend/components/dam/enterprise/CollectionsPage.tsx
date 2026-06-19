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
type CollectionStatus = "Active" | "Public scope" | "Internal only" | "Restricted" | "Needs review";

type CollectionReadiness = {
  readyCount: number;
  reviewNeeded: number;
  status: CollectionStatus;
  nextAction: string;
  blockers: string[];
};

type CollectionCardModel = {
  collection: CatalogCollection;
  section: CollectionSectionId;
  readiness: CollectionReadiness;
};

const reviewSavedViewIds = new Set(["needs-review", "rights-basis-review", "children-youth-review", "rendition-gaps", "duplicate-candidates", "stale-approvals"]);

const neutralCollectionCopy: Record<string, { name?: string; description?: string }> = {
  "approved-public-delivery": {
    name: "Public scope",
    description: "Media grouped for public-scope church communication."
  },
  "approved-internal-delivery": {
    name: "Internal only",
    description: "Media grouped for ministry teams and member-facing material."
  },
  "review-intake": {
    name: "Needs review",
    description: "Albums and items waiting for reviewer decision."
  },
  "archive-reference": {
    name: "Restricted archive",
    description: "Archive/reference media searchable for history, not promoted for reuse."
  },
  "social-ready": {
    name: "Social channel",
    description: "Square, event, and detail assets grouped for social channels."
  },
  "projection-ready": {
    name: "Projection channel",
    description: "Slides, worship backgrounds, and presentation-friendly media."
  },
  "print-ready": {
    name: "Print channel",
    description: "Newsletter, bulletin, and print-channel media."
  },
  "missing-rights": {
    name: "Needs review: rights",
    description: "Albums with items needing rights basis or consent evidence."
  },
  "people-minors-governance": {
    name: "Needs review: people",
    description: "People visibility and minors review worklist."
  },
  "missing-derivative": {
    name: "Needs review: preview",
    description: "Items missing preview or dimension readiness."
  },
  "duplicate-cleanup": {
    name: "Needs review: duplicates",
    description: "Potential duplicate/version items needing cleanup decisions."
  },
  "stale-approval": {
    name: "Needs review: recheck",
    description: "Items due for lifecycle recheck."
  }
};

const sectionCopy: Record<CollectionSectionId, { title: string; description: string }> = {
  featured: {
    title: "Featured albums / events",
    description: "Common starting points with item-level scope."
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
  const searchText = `${collection.id} ${collection.name} ${collection.description} ${collection.searchQuery} ${definition?.routeFilter || ""}`;
  const isInternal = /internal/i.test(searchText);
  const isPublicScope = /public/i.test(searchText);
  const isRestrictedArchive = collection.id === "archive-reference";
  const reviewBlockers = [
    reviewNeeded ? `${reviewNeeded.toLocaleString()} asset${reviewNeeded === 1 ? "" : "s"} need review` : "",
    collection.peopleWarning || "",
    /rights/i.test(collection.id) || /rights/i.test(collection.description) ? "Rights evidence needs reviewer attention" : ""
  ].filter(Boolean);
  const blockers = [
    ...reviewBlockers,
    isRestrictedArchive ? "Archive/reference records are not promoted for reuse" : ""
  ].filter(Boolean);
  const status: CollectionStatus = isRestrictedArchive
    ? "Restricted"
    : reviewBlockers.length || isReviewList
      ? "Needs review"
      : isInternal
        ? "Internal only"
        : isPublicScope
          ? "Public scope"
          : "Active";
  return {
    readyCount,
    reviewNeeded,
    status,
    nextAction: status === "Needs review" ? "Review worklist" : "Open album",
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
  if (activeFilter === "ready") return readiness.status === "Active";
  if (activeFilter === "review") return readiness.status === "Needs review" || section === "review";
  if (activeFilter === "guidance") return readiness.status === "Public scope" || name.includes("public");
  if (activeFilter === "internal") return readiness.status === "Internal only" || name.includes("internal") || description.includes("internal");
  if (activeFilter === "rights") return readiness.status === "Restricted" || collection.id.includes("rights") || description.includes("rights");
  if (activeFilter === "ministry") return section === "ministry";
  if (activeFilter === "year") return collection.dateRange !== "Date not available";
  if (activeFilter === "media") return section === "channel";
  return true;
}

function sectionedCollections(models: CollectionCardModel[]) {
  const sectionOrder: CollectionSectionId[] = ["featured", "ministry", "channel"];
  return sectionOrder
    .map((section) => ({ section, collections: models.filter((model) => model.section === section) }))
    .filter((group) => group.collections.length);
}

function filterLabel(filter: CollectionFilterId) {
  const labels: Record<CollectionFilterId, string> = {
    all: "All albums",
    ready: "Active",
    review: "Needs review",
    guidance: "Public scope",
    internal: "Internal only",
    rights: "Restricted",
    ministry: "By ministry",
    year: "By year",
    media: "By media type"
  };
  return labels[filter];
}

function collectionGuidanceBadge(readiness: CollectionReadiness, canSeeReviewTools: boolean) {
  if (readiness.status === "Needs review") {
    return { label: canSeeReviewTools ? "Needs review" : "Restricted", className: "is-warning" };
  }
  if (readiness.status === "Restricted") return { label: "Restricted", className: "is-danger" };
  if (readiness.status === "Internal only") return { label: "Internal only", className: "is-warning" };
  if (readiness.status === "Public scope") return { label: "Public scope", className: "is-success" };
  return { label: "Active", className: "is-success" };
}

function displayCollectionName(collection: CatalogCollection, canSeeReviewTools: boolean) {
  return scrubPublicUseCopy(neutralCollectionCopy[collection.id]?.name || collection.name, canSeeReviewTools);
}

function displayCollectionDescription(collection: CatalogCollection, canSeeReviewTools: boolean) {
  return scrubPublicUseCopy(neutralCollectionCopy[collection.id]?.description || collection.description, canSeeReviewTools);
}

function scrubPublicUseCopy(value: string, canSeeReviewTools: boolean) {
  const neutral = value
    .replace(/public use/gi, "Public scope")
    .replace(/public church communication/gi, "public-scope church communication")
    .replace(/approved public/gi, "public-scope")
    .replace(/approved internal/gi, "internal-only")
    .replace(/\bapproved\b/gi, "reviewed")
    .replace(/\bcleared\b/gi, "scoped")
    .replace(/reviewer approval/gi, "reviewer decision");
  if (canSeeReviewTools) return neutral;
  return neutral.replace(/reviewer\/admin/gi, "reviewer");
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
  if (readiness.status === "Needs review") {
    return canSeeReviewTools
      ? "This album has items that need reviewer attention before broader use."
      : "Some items in this album are restricted until a reviewer confirms scope.";
  }
  if (readiness.status === "Restricted") return "Open for reference only unless a reviewer changes scope.";
  if (readiness.status === "Internal only") return "Use inside ministry contexts unless item guidance says otherwise.";
  if (readiness.status === "Public scope") return "Open the album and follow item-level scope before sharing.";
  return "Open the album and follow each item note before sharing.";
}

function displayReadinessStatus(readiness: CollectionReadiness, canSeeReviewTools: boolean) {
  if (readiness.status === "Needs review" && !canSeeReviewTools) return "Restricted";
  return readiness.status;
}

function reviewViews(savedViews: SavedViewSummary[] = []) {
  return savedViews.filter((view) => reviewSavedViewIds.has(view.id));
}

function displaySavedViewLabel(view: SavedViewSummary) {
  return scrubPublicUseCopy(view.label, true).replace(/\bapprovals?\b/gi, "review");
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
  const name = displayCollectionName(collection, canSeeReviewTools);
  const description = displayCollectionDescription(collection, canSeeReviewTools);
  return (
    <article className={`ed-collection-card${active ? " is-selected" : ""}${section === "review" ? " is-worklist" : ""}`}>
      <button
        type="button"
        className="ed-collection-card-select"
        onClick={onSelectDetails}
        aria-label={`Show details for ${name}`}
        aria-pressed={active}
      >
        <CollectionPreviewStrip images={collection.images} />
        <span className="ed-collection-card-copy">
          <strong>{name}</strong>
          <span>{description}</span>
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
          <p>Choose a group to see scope and next action.</p>
        </section>
      </aside>
    );
  }

  const { collection, readiness, section } = model;
  const audience = audienceForSection(section, collection);
  const usage = usageSentence(readiness, canSeeReviewTools);
  const name = displayCollectionName(collection, canSeeReviewTools);
  const description = displayCollectionDescription(collection, canSeeReviewTools);
  const ministry = scrubPublicUseCopy(collection.ministry, canSeeReviewTools);
  const displayAudience = scrubPublicUseCopy(audience, canSeeReviewTools);
  return (
    <aside className="ed-panel ed-collection-inspector" aria-label={`${name} album or event details`}>
      <div className="ed-panel-title">
        <h3>{name}</h3>
        <CollectionGuidanceBadge readiness={readiness} canSeeReviewTools={canSeeReviewTools} />
      </div>
      <p className="ed-collection-inspector-summary">{description}</p>
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
          <dd>{ministry}</dd>
        </div>
        <div>
          <dt>Audience</dt>
          <dd>{displayAudience}</dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>{displayReadinessStatus(readiness, canSeeReviewTools)}</dd>
        </div>
      </dl>
      <section className="ed-collection-usage-note" aria-label="Scope guidance">
        <CollectionGuidanceBadge readiness={readiness} canSeeReviewTools={canSeeReviewTools} />
        <p>{usage}</p>
      </section>
      {canSeeReviewTools && readiness.status === "Needs review" ? (
        <section className="ed-collection-review-summary" aria-label="Review issues">
          <strong>Review issues</strong>
          <ul>
            {readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </section>
      ) : null}
      <div className="ed-collection-inspector-actions">
        <ActionButton tone="primary" icon={FolderOpen} onClick={() => onOpen(collection)}>Open album</ActionButton>
        {canSeeReviewTools && readiness.status === "Needs review" ? (
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
  const albumModels = filteredModels.filter((model) => model.section !== "review");
  const reviewCollectionModels = canSeeReviewTools ? filteredModels.filter((model) => model.section === "review") : [];
  const selectedModel =
    filteredModels.find((model) => model.collection.id === selectedCollectionId)
    || albumModels[0]
    || reviewCollectionModels[0];
  const collectionGroups = sectionedCollections(albumModels);
  const reviewerWorklists = canSeeReviewTools ? reviewViews(search.data?.savedViews) : [];
  const filteredReviewerWorklists = activeFilter === "all" || activeFilter === "review" || activeFilter === "rights" ? reviewerWorklists : [];
  const secondaryWorklistCount = reviewCollectionModels.length + filteredReviewerWorklists.length;
  const allAlbumCount = allModels.filter((model) => model.section !== "review").length;
  const pageCount = albumModels.length
    ? `${albumModels.length.toLocaleString()} album${albumModels.length === 1 ? "" : "s"}`
    : secondaryWorklistCount
      ? `${secondaryWorklistCount.toLocaleString()} worklist${secondaryWorklistCount === 1 ? "" : "s"}`
      : "0 albums";
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
        subtitle="Browse albums and event groups by ministry, date, channel, and media type. Each item keeps its own scope."
        count={pageCount}
        actions={(
          <>
            <ActionButton icon={FolderOpen} onClick={() => selectedModel && openCollection(selectedModel.collection)} disabled={!selectedModel} disabledReason="Select an album or event first.">Open album</ActionButton>
            <ActionButton icon={Grid3X3} onClick={viewAllMedia}>View all media</ActionButton>
          </>
        )}
      />

      <form className="ed-search-shell ed-collection-search" onSubmit={submit}>
        <Search size={18} />
        <input aria-label="Search albums and events" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search albums, events, ministries..." />
        {submittedQuery ? <button type="button" onClick={() => { setQuery(""); setSubmittedQuery(""); setSelectedCollectionId(""); }}>Clear</button> : null}
      </form>

      {search.loading ? <LoadingCard label="Loading albums / events..." /> : search.error ? <ErrorCard message={search.error} source={canSeeReviewTools ? search.source : undefined} /> : (
        <div className="ed-collection-browser-grid">
          <aside className="ed-panel ed-collection-filter-rail" aria-label="Album and event filters">
            <section className="ed-collection-filter-summary">
              <strong>{allAlbumCount.toLocaleString()}</strong>
              <span>albums and events in current search</span>
            </section>
            <nav>
              {filters.map((filter) => {
                const count = filter === "all"
                  ? allAlbumCount
                  : allModels.filter((model) => filterMatches(model, filter)).length;
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

          <section className="ed-collection-browser-main" aria-label="Albums and events browser">
            {collectionGroups.length || secondaryWorklistCount ? (
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
                {secondaryWorklistCount ? (
                  <section className="ed-collection-section is-review-worklists">
                    <header>
                      <div>
                        <h2>Reviewer/admin worklist</h2>
                        <p>Secondary queues for rights, consent, metadata, and restricted groups.</p>
                      </div>
                      <span>{secondaryWorklistCount.toLocaleString()} worklist{secondaryWorklistCount === 1 ? "" : "s"}</span>
                    </header>
                    {reviewCollectionModels.length ? (
                      <div className="ed-collection-card-grid">
                        {reviewCollectionModels.map((model) => (
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
                    ) : null}
                    {filteredReviewerWorklists.length ? (
                      <div className="ed-collection-worklist-grid">
                        {filteredReviewerWorklists.map((view) => (
                          <button type="button" key={view.id} onClick={() => openSavedReviewView(view)}>
                            <span>{displaySavedViewLabel(view)}</span>
                            <strong>{view.count.toLocaleString()}</strong>
                          </button>
                        ))}
                      </div>
                    ) : null}
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
          </section>

          <AlbumDetails model={selectedModel} canSeeReviewTools={canSeeReviewTools} onOpen={openCollection} onReview={openReviewIssues} />
        </div>
      )}
    </div>
  );
}
