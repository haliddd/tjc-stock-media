"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetsSearch } from "@/components/dam/useDamApi";
import { assetType, displayTitle, sourceLabel } from "@/lib/enterprise-display";
import { buildPackageGovernance } from "@/lib/package-governance";
import {
  addPackageAssetRef,
  availableAssetsForSection,
  createPackageDraft,
  packageAssetsForCollection,
  removePackageAssetRef,
  resolvePackageSections
} from "@/lib/package-drafts";
import { packageAssetRef } from "@/lib/package-refs";
import { buildPortalReuseDecision } from "@/lib/portal-reuse-decision";
import { routeWithRole } from "@/lib/role-routes";
import { matchesCatalogFilter } from "@/lib/catalog-language";
import { cn } from "@/lib/ui";
import { ActionButton, AssetPreviewStrip, AssetThumb, DistributionReadinessCard, ErrorCard, LoadingCard } from "./EnterpriseShared";

export function EnterprisePackageBuilderPage() {
  const router = useRouter();
  const { role } = useDemoRole();
  const opsView = role === "Reviewer" || role === "DAM Admin";
  const sourceRecordLabel = opsView ? "ResourceSpace" : "media library";
  const refLabel = opsView ? "ResourceSpace refs" : "media references";
  const refLabelSingular = opsView ? "ResourceSpace reference" : "media reference";
  const [activeSection, setActiveSection] = useState("cover");
  const [approvedOnly, setApprovedOnly] = useState(true);
  const [sourceCollectionId, setSourceCollectionId] = useState("");
  const [sourceCollectionChecked, setSourceCollectionChecked] = useState(false);
  const [packageFilters, setPackageFilters] = useState<string[]>([]);
  const [packageFacetQuery, setPackageFacetQuery] = useState("");
  const [draft, setDraft] = useState(() => createPackageDraft("Distribution Set Draft"));
  const [packageMessage, setPackageMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const search = useAssetsSearch({
    role,
    view: sourceCollectionId ? undefined : "approved-church-wide",
    collection: sourceCollectionId || undefined,
    filters: packageFilters,
    sort: "Approved first",
    limit: sourceCollectionId ? 72 : 18
  });
  const assets = search.data?.assets || [];
  const collections = search.data?.collections || [];
  const selectedCollection = collections.find((collection) => collection.id === sourceCollectionId);

  const packageAssetStatus = useCallback(
    (asset: (typeof assets)[number]) => buildPortalReuseDecision(asset, role).reuse.state === "portal-ready" ? "Approved" : "Needs Review",
    [role]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const collectionId = new URLSearchParams(window.location.search).get("collection") || "";
    setSourceCollectionId(collectionId);
    setSourceCollectionChecked(true);
  }, []);

  useEffect(() => {
    if (!sourceCollectionChecked) return;
    if (sourceCollectionId) {
      if (!selectedCollection) return;
      setDraft((current) => ({
        ...current,
        title: /^(ResourceSpace Toolkit Draft|Media Set Draft)$/i.test(current.title) ? `${selectedCollection.name} Media Set Draft` : current.title,
        description: current.description || `Started from ${selectedCollection.name}. Add approved references manually; full archive membership remains in the DAM.`,
        collectionId: selectedCollection.id
      }));
      return;
    }
  }, [selectedCollection, sourceCollectionChecked, sourceCollectionId]);

  const sourceAssets = useMemo(
    () => selectedCollection ? packageAssetsForCollection(selectedCollection, assets, packageAssetStatus) : assets,
    [assets, packageAssetStatus, selectedCollection]
  );
  const sections = useMemo(() => resolvePackageSections(draft, sourceAssets), [sourceAssets, draft]);
  const governance = useMemo(() => buildPackageGovernance(draft, sections, role), [draft, role, sections]);
  const sectionGovernance = useMemo(() => new Map(governance.sections.map((section) => [section.id, section])), [governance.sections]);
  const allSectionsEmpty = governance.totalRefs === 0;
  const activeAvailableAssets = availableAssetsForSection({ draft, sectionId: activeSection, assets: sourceAssets, approvedOnly, statusOf: packageAssetStatus });
  const publishBlocked = !governance.canPublish;
  const canSaveDraft = role === "Contributor" || role === "Reviewer" || role === "DAM Admin";
  const referenceLabel = (asset: (typeof assets)[number]) => packageAssetRef(asset) || "media-reference";
  const sourceScopeLabel = selectedCollection ? `${selectedCollection.name} collection` : sourceRecordLabel;
  const visibleDraftTitle = opsView ? draft.title : draft.title.replace(/ResourceSpace/gi, "Media");
  const collectionVisibleCount = selectedCollection ? assets.length : 0;
  const collectionSkippedCount = selectedCollection ? Math.max(0, collectionVisibleCount - sourceAssets.length) : 0;
  const packageFacetOptions = [
    { label: "Worship", filter: "worship" },
    { label: "Sermon", filter: "sermon" },
    { label: "Stage", filter: "stage" },
    { label: "Website hero", filter: "landscape" },
    { label: "No people", filter: "no people" },
    { label: "Photo", filter: "photo" },
    { label: "Graphic", filter: "graphic" },
    { label: "Approved public", filter: "approved public" },
    { label: "Approved internal", filter: "approved internal" },
    { label: "Metadata enrichment", filter: "metadata enrichment" }
  ];
  const visiblePackageFacets = packageFacetOptions.filter((option) => option.label.toLowerCase().includes(packageFacetQuery.trim().toLowerCase()));
  const packageFacetCount = (filter: string) => assets.filter((asset) => matchesCatalogFilter(asset, filter)).length;
  const readinessReason = governance.totalRefs
    ? governance.reason
    : "Readiness unlocks after each required section has at least one approved reference.";
  const previewDisabledReason = governance.canPreview ? undefined : "Available after approved references are selected.";
  const shareDisabledReason = governance.canShare ? undefined : "Disabled in beta until identity and internal access policy are configured.";
  const publishDisabledReason = governance.canPublish ? undefined : governance.totalRefs ? readinessReason : "Available after approved references are selected.";
  const saveDisabledReason = canSaveDraft ? undefined : "Save draft requires Contributor, Reviewer, or DAM Admin role.";
  const availableAssetsForTargetSection = (sectionId: string) => availableAssetsForSection({ draft, sectionId, assets: sourceAssets, approvedOnly, statusOf: packageAssetStatus });
  const addFirstAvailableAsset = (sectionId: string) => {
    const nextAsset = availableAssetsForTargetSection(sectionId)[0];
    if (!nextAsset) {
      setPackageMessage(`No approved ${sourceScopeLabel} media reference is available for this section.`);
      return;
    }
    setDraft((current) => addPackageAssetRef(current, sectionId, nextAsset));
    setPackageMessage(`${displayTitle(nextAsset)} added as a governed ${refLabelSingular}.`);
  };
  const togglePackageFilter = (filter: string) => {
    setPackageFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
  };

  const saveDraft = async () => {
    if (!canSaveDraft) {
      setPackageMessage("Package draft save requires Contributor, Reviewer, or DAM Admin role.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Package draft save failed.");
      if (payload.package?.id) setDraft((current) => ({ ...current, id: payload.package.id, updatedAt: payload.package.updatedAt }));
      setPackageMessage(`Distribution set draft saved to ${payload.storageMode || "local-json"} with ${payload.package?.governance?.totalRefs ?? governance.totalRefs} ${refLabel}.`);
    } catch (error) {
      setPackageMessage(error instanceof Error ? error.message : "Package draft save failed.");
    } finally {
      setSaving(false);
    }
  };

  const previewPackage = () => {
    setPackageMessage(`${sections.length} sections, ${governance.totalRefs} selected ${refLabel}, ${governance.readinessScore}% ready. No files copied.`);
  };

  const prepareShare = () => {
    setPackageMessage("Access scope checked locally. No external email, public link, ZIP, or download was created.");
  };

  const queuePublish = () => {
    setPackageMessage(opsView ? "Readiness review can be queued locally. DAM source files stay canonical and are not copied." : "Readiness review can be queued locally. Source files stay protected and are not copied.");
  };

  const sectionLabel = (title: string) => title.replace(/^\d+\.\s*/, "");
  const sectionPurpose = (sectionId: string) => {
    if (sectionId === "cover") return "Primary reference for package identity, thumbnails, and stakeholder preview.";
    if (sectionId === "hero-assets") return "Approved visual references for hero placements, banners, and ministry page leads.";
    if (sectionId === "social-media") return "Safe references for social posts, announcements, and short-form ministry updates.";
    if (sectionId === "documents") return "Reference documents, graphics, and support media attached to the set.";
    return "Governed references for this package section.";
  };
  const sectionStatusLabel = (status?: "ready" | "review" | "blocked" | "empty") => {
    if (status === "ready") return "Ready";
    if (status === "empty") return "Needs references";
    if (status === "review") return "Needs review";
    if (status === "blocked") return "Blocked";
    return "Needs references";
  };
  const handlePrimaryPackageAction = () => {
    if (governance.totalRefs) {
      if (governance.canPreview) previewPackage();
      else setPackageMessage(`Review package readiness: ${governance.reason}`);
      return;
    }
    if (activeAvailableAssets[0]) {
      addFirstAvailableAsset(activeSection);
      return;
    }
    router.push(routeWithRole("/", role));
  };
  const activeResolvedSection = sections.find((section) => section.id === activeSection) || sections[0];
  const activeGovernance = activeResolvedSection ? sectionGovernance.get(activeResolvedSection.id) : undefined;
  const populatedSections = sections.filter((section) => section.resourceSpaceAssetIds.length > 0).length;
  const lastSavedLabel = draft.updatedAt ? `Last saved ${new Date(draft.updatedAt).toLocaleString()}` : "Not saved yet";
  const ownerLabel = opsView ? "DAM Operations" : "Media team";
  const packageTitle = visibleDraftTitle.replace(/ResourceSpace Toolkit Draft/gi, "Distribution Set Draft").replace(/Toolkit Draft/gi, "Distribution Set Draft").replace(/Media Set Draft/gi, "Distribution Set Draft");
  const dataSourceSummary = sourceLabel(search.source)
    .replace(/ResourceSpace export/gi, "ResourceSpace records")
    .replace(/\bexport\b/gi, "records");
  const activeSectionTitle = activeResolvedSection ? sectionLabel(activeResolvedSection.title) : "Cover";
  const requiredSectionCount = sections.length;
  const readySections = governance.sections.filter((section) => section.readinessStatus === "ready").length;
  const readinessUnlockCopy = "Available after at least one approved reference is selected for each required section.";
  const sectionRequirements = [
    ["Required", "Yes"],
    ["Minimum references", "1"],
    ["Allowed media", "Approved previews only"],
    ["Source files", "Protected"]
  ];
  const readinessRows = [
    {
      label: "Reference review",
      status: governance.canPreview ? "ready" : governance.totalRefs ? "review" : "blocked",
      detail: governance.canPreview ? "All selected references can render role-safe previews." : "Add approved, resolvable references before preview review."
    },
    {
      label: "Access scope",
      status: governance.canShare ? "ready" : "blocked",
      detail: governance.canShare ? "Internal access scope passes without public-link creation." : "Access scope remains locked until approved references and internal policy pass."
    },
    {
      label: "Readiness review",
      status: governance.canPublish ? "ready" : governance.totalRefs ? "review" : "blocked",
      detail: governance.canPublish ? "Readiness checks pass while source files stay protected." : readinessReason
    }
  ];
  const manifestRows = activeGovernance?.assets.flatMap((item) => item.deliveryManifest.items.map((manifest) => ({
    assetRef: item.ref,
    id: `${item.ref}-${manifest.id}`,
    label: manifest.label,
    status: manifest.status,
    detail: manifest.detail
  }))).slice(0, 12) || [];

  return (
    <div className="enterprise-page enterprise-package-builder">
      <header className="ed-package-builder-header">
        <div className="ed-package-title-block">
          <span className="ed-package-builder-kicker">Distribution set draft</span>
          <h1>{packageTitle || "Distribution Set Draft"}</h1>
          <p>
            <span>{draft.status === "draft" ? "Draft" : draft.status}</span>
            <span>{ownerLabel}</span>
            <span>{lastSavedLabel}</span>
            <span>Reference-only internal beta</span>
            {opsView ? <span>DAM source references</span> : null}
          </p>
        </div>
        <div className="ed-package-builder-actions" aria-label="Package builder actions">
          <ActionButton tone="primary" icon={Plus} ariaLabel="Add approved references to package draft" onClick={handlePrimaryPackageAction}>Add approved references</ActionButton>
          <ActionButton icon={UploadCloud} ariaLabel="Save package draft" disabled={saving || !canSaveDraft} disabledReason={saving ? "Saving draft now." : saveDisabledReason} onClick={saveDraft}>{saving ? "Saving..." : "Save draft"}</ActionButton>
          <ActionButton icon={MoreHorizontal} ariaLabel="Additional package actions" disabled disabledReason="Reference-only beta: no ZIP, public link, source-file access, external share, or writeback will be created.">More actions</ActionButton>
        </div>
      </header>

      {selectedCollection ? (
        <section className="ed-package-source-strip">
          <PackageCheck size={18} aria-hidden="true" />
          <div>
            <strong>Started from {selectedCollection.name}</strong>
            <span>{sourceAssets.length.toLocaleString()} approved references available. {collectionSkippedCount ? `${collectionSkippedCount.toLocaleString()} records stay out until readiness evidence passes. ` : ""}Full archive membership stays in DAM source.</span>
          </div>
          <button type="button" onClick={() => setPackageMessage("Collection path imports visible Portal Ready references only. Review-only or hidden media remain out of this draft.")}>Policy</button>
        </section>
      ) : null}

      <section className={cn("ed-package-readiness ed-package-readiness-compact", `is-${governance.readinessStatus}`)} aria-label="Package readiness summary">
        <div>
          <span>References</span>
          <strong>{governance.totalRefs.toLocaleString()}</strong>
        </div>
        <div>
          <span>Sections ready</span>
          <strong>{readySections.toLocaleString()} / {requiredSectionCount.toLocaleString()}</strong>
        </div>
        <div>
          <span>Readiness</span>
          <strong>{governance.readinessScore}%</strong>
        </div>
        <div>
          <span>Blockers</span>
          <strong>{governance.blockedRefs.toLocaleString()}</strong>
        </div>
      </section>

      {packageMessage ? <p className="ed-inline-success">{packageMessage}</p> : null}

      {search.loading ? <LoadingCard /> : search.error ? <ErrorCard message={search.error} source={search.source} /> : (
        <>
        <AssetPreviewStrip
          assets={activeAvailableAssets}
          title="Distribution preview candidates"
          detail={`Approved ${sourceScopeLabel} references available for ${activeSectionTitle}.`}
          limit={4}
        />
        <div className="ed-builder-grid">
          <aside className="ed-package-left-rail" aria-label="Package outline">
            <section className="ed-panel ed-package-outline" aria-labelledby="package-outline-title">
              <div className="ed-panel-title">
                <h2 id="package-outline-title">Set outline</h2>
                <span>{sections.length.toLocaleString()} sections</span>
              </div>
              <div className="ed-package-outline-list" role="tablist" aria-label="Package sections">
                {sections.map((section) => {
                  const sectionPacket = sectionGovernance.get(section.id);
                  const status = sectionStatusLabel(sectionPacket?.readinessStatus);
                  return (
                    <button className={cn(activeSection === section.id && "is-active", sectionPacket && `is-${sectionPacket.readinessStatus}`)} type="button" role="tab" key={section.id} aria-selected={activeSection === section.id} onClick={() => setActiveSection(section.id)} aria-label={`${sectionLabel(section.title)}: ${section.resourceSpaceAssetIds.length} references, ${status}`}>
                      {section.assets[0] ? <AssetThumb asset={section.assets[0]} /> : <FileText size={22} aria-hidden="true" />}
                      <span>
                        <strong>{sectionLabel(section.title)}</strong>
                        <small>{section.resourceSpaceAssetIds.length.toLocaleString()} references</small>
                      </span>
                      <em>{status}</em>
                    </button>
                  );
                })}
              </div>
              <p className="ed-package-outline-helper">Sections organize a governed draft. They do not grant item-level clearance.</p>
              <details className="ed-package-taxonomy">
                  <summary>Browse DAM records</summary>
                  <header>
                    <span>Browse DAM records</span>
                  {packageFilters.length ? <button type="button" onClick={() => setPackageFilters([])}>Clear</button> : <em>{assets.length.toLocaleString()}</em>}
                </header>
                <label className="ed-taxonomy-search">
                  <Search size={14} aria-hidden="true" />
                  <span className="sr-only">Search package filters</span>
                  <input value={packageFacetQuery} onChange={(event) => setPackageFacetQuery(event.target.value)} placeholder="Search tags, type..." />
                </label>
                <div>
                  {collections.slice(0, 5).map((collection) => (
                    <button className={cn(sourceCollectionId === collection.id && "is-active")} type="button" key={collection.id} aria-current={sourceCollectionId === collection.id ? "true" : undefined} onClick={() => { setSourceCollectionId(sourceCollectionId === collection.id ? "" : collection.id); setPackageFilters([]); }}>
                      <span>{collection.name}</span>
                      <em>{collection.count.toLocaleString()}</em>
                    </button>
                  ))}
                </div>
                <div>
                  {visiblePackageFacets.map((option) => (
                    <button className={cn(packageFilters.includes(option.filter) && "is-active")} type="button" key={option.filter} aria-pressed={packageFilters.includes(option.filter)} onClick={() => togglePackageFilter(option.filter)}>
                      <span>{option.label}</span>
                      <em>{packageFacetCount(option.filter).toLocaleString()}</em>
                    </button>
                  ))}
                </div>
              </details>
            </section>
          </aside>

          <main className={cn("ed-package-canvas", allSectionsEmpty && "is-empty-package")}>
            {activeResolvedSection ? (
              <section className="ed-card ed-builder-section is-active" aria-labelledby="active-package-section-title">
                <header className="ed-active-section-header">
                  <div>
                    <span>Active section</span>
                    <h2 id="active-package-section-title">{sectionLabel(activeResolvedSection.title)}</h2>
                    <p>{sectionPurpose(activeResolvedSection.id)}</p>
                  </div>
                  <div className="ed-active-section-status">
                    <strong>{activeResolvedSection.resourceSpaceAssetIds.length.toLocaleString()}</strong>
                    <span>references</span>
                    <em className={cn(activeGovernance && `is-${activeGovernance.readinessStatus}`)}>{sectionStatusLabel(activeGovernance?.readinessStatus)}</em>
                  </div>
                </header>

                <div className="ed-section-requirements" aria-label={`${activeSectionTitle} requirements`}>
                  {sectionRequirements.map(([label, value]) => (
                    <span key={label}>
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </span>
                  ))}
                </div>

                <div className="ed-active-section-summary">
                  <p>{activeResolvedSection.resourceSpaceAssetIds.length ? activeGovernance?.readinessSummary : `No governed references selected for ${activeSectionTitle}.`}</p>
                  <ActionButton ariaLabel={`Add references to ${activeSectionTitle}`} disabled={!activeAvailableAssets[0]} disabledReason={`No approved ${sourceScopeLabel} reference is available for this section.`} onClick={() => addFirstAvailableAsset(activeResolvedSection.id)}>Add references to {activeSectionTitle}</ActionButton>
                </div>

                {activeGovernance?.assets.length ? (
                  <section className="ed-section-reference-workbench" aria-labelledby="selected-references-title">
                    <header>
                      <div>
                        <h3 id="selected-references-title">Selected references</h3>
                        <p>Governed records assigned to {activeSectionTitle}. Source files stay private.</p>
                      </div>
                      <span>{activeGovernance.assets.length.toLocaleString()} selected</span>
                    </header>
                    <div className="ed-package-reference-list" aria-label={`${activeSectionTitle} references`}>
                      {activeGovernance.assets.map((item) => (
                        <article className="ed-package-reference-row" key={`${item.sectionId}-${item.ref}`}>
                          <AssetThumb asset={item.asset} className="ed-package-reference-thumb" />
                          <div className="ed-package-reference-main">
                            <strong>{displayTitle(item.asset)}</strong>
                            <span>{opsView ? "ResourceSpace ref" : "Internal ref"} {item.ref}</span>
                            <div>
                              <small>{item.reuseLabel}</small>
                              <small>{item.asset.usageScope || "Usage scope pending"}</small>
                              <small>{assetType(item.asset)}</small>
                            </div>
                          </div>
                          <div className="ed-package-reference-actions">
                            <button type="button" disabled={!item.canPreview} title={item.canPreview ? undefined : "Preview waits for approved, role-safe media references."} onClick={() => setPackageMessage(`${displayTitle(item.asset)} preview check stays role-safe. No source files exposed.`)}>Preview</button>
                            <button type="button" onClick={() => setDraft((current) => removePackageAssetRef(current, activeResolvedSection.id, item.asset))}>Remove</button>
                          </div>
                          <div className="ed-delivery-manifest" aria-label={`Delivery readiness manifest for ${displayTitle(item.asset)}`}>
                            {item.deliveryManifest.items.map((manifest) => (
                              <span className={`is-${manifest.status}`} key={manifest.id}>
                                <strong>{manifest.label}</strong>
                                <small>{manifest.status === "ready" ? "Ready" : manifest.status === "request-only" ? "Request only" : "Blocked"}</small>
                              </span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : (
                  <div className="ed-section-empty">
                    <FileText size={28} aria-hidden="true" />
                    <div>
                      <strong>No governed references selected for {activeSectionTitle}</strong>
                      <span>Add approved preview references that have cleared rights and usage review. Source files remain private and are never copied into this draft.</span>
                      <button type="button" disabled={!activeAvailableAssets[0]} title={!activeAvailableAssets[0] ? `No approved ${sourceScopeLabel} reference is available for this section.` : undefined} onClick={() => addFirstAvailableAsset(activeResolvedSection.id)}>Add references to {activeSectionTitle}</button>
                    </div>
                  </div>
                )}

                <section className="ed-reference-picker-panel" aria-labelledby="reference-picker-title">
                  <header>
                    <div>
                      <h3 id="reference-picker-title">Reference picker</h3>
                      <p>Approved candidates from {sourceScopeLabel}. This picker adds references only.</p>
                    </div>
                    <span className="ed-package-source-pill">{dataSourceSummary}</span>
                  </header>
                  <div className="ed-reference-picker-list">
                    {activeAvailableAssets.length ? activeAvailableAssets.slice(0, 3).map((asset) => (
                      <button type="button" key={asset.id} onClick={() => setDraft((current) => addPackageAssetRef(current, activeResolvedSection.id, asset))}>
                        <AssetThumb asset={asset} className="ed-reference-picker-thumb" />
                        <span>
                          <strong>{displayTitle(asset)}</strong>
                          <small>{referenceLabel(asset)} · {buildPortalReuseDecision(asset, role).reuse.label}</small>
                        </span>
                        <em>Add</em>
                      </button>
                    )) : (
                      <p>No approved references available for this section.</p>
                    )}
                  </div>
                </section>
              </section>
            ) : null}
          </main>

          <aside className="ed-panel ed-package-details" aria-label="Readiness and governance inspector">
            <DistributionReadinessCard
              state={governance.canPublish ? "Approved" : governance.totalRefs ? "Needs Review" : "Draft"}
              selectedCount={governance.totalRefs}
              readyCount={governance.portalReadyRefs}
              blockerCount={governance.blockedRefs}
              detail={governance.canPublish ? "Every selected item is Portal Ready for approved derivatives." : "Item-level blockers must clear before any delivery handoff."}
              blockers={governance.blockerSummary.map((item) => `${item.label}: ${item.count}`)}
            />
            <details open>
              <summary>Readiness</summary>
              <p className="ed-action-helper">Chosen use: {governance.chosenUse.replace("-", " ")}. Share, publish, and package download stay blocked unless every item is Portal Ready for this use.</p>
              <div className="ed-command-readiness">
                {readinessRows.map((item) => (
                  <p className={`ed-readiness-row is-${item.status}`} key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </p>
                ))}
              </div>
            </details>
            <details open>
              <summary>Derivative manifest</summary>
              {manifestRows.length ? (
                <div className="ed-command-readiness">
                  {manifestRows.map((item) => (
                    <p className={`ed-readiness-row is-${item.status === "ready" ? "ready" : item.status === "request-only" ? "review" : "blocked"}`} key={item.id}>
                      <strong>{item.label}</strong>
                      <span>{item.assetRef}: {item.detail}</span>
                    </p>
                  ))}
                </div>
              ) : <p className="ed-action-helper">Add references to view thumbnail, preview, approved web copy, approved print copy, and original restriction readiness.</p>}
            </details>
            <details open>
              <summary>Safe actions</summary>
              <div className="ed-package-rail-actions">
                <ActionButton icon={Eye} ariaLabel="Preview reference set" disabled={!governance.canPreview} disabledReason={previewDisabledReason} onClick={previewPackage}>Preview set</ActionButton>
                <ActionButton icon={Send} ariaLabel="Check internal access scope" disabled={!governance.canShare} disabledReason={shareDisabledReason} onClick={prepareShare}>Access scope</ActionButton>
                <ActionButton tone="primary" icon={Lock} ariaLabel="Review package readiness gate" disabled={publishBlocked} disabledReason={publishDisabledReason} onClick={queuePublish}>Review readiness</ActionButton>
              </div>
              <p className="ed-action-helper">{readinessUnlockCopy}</p>
              <p className="ed-action-helper">Distribution set draft only: no ZIP, public link, source-file access, external share, or ResourceSpace writeback is created.</p>
            </details>
            <details>
              <summary>Access scope</summary>
              <p className="ed-action-helper">Internal distribution draft only. No public link, ZIP package, source-file copying, or external share is created in beta.</p>
              <label className="ed-toggle">Portal Ready only <input type="checkbox" checked={approvedOnly} onChange={(event) => setApprovedOnly(event.target.checked)} /></label>
            </details>
            <details open>
              <summary>Governance guarantees</summary>
              <p className="ed-checkline"><CheckCircle2 size={16} />References retained only</p>
              {opsView ? <p className="ed-checkline"><CheckCircle2 size={16} />DAM record refs retained</p> : null}
              <p className="ed-checkline"><CheckCircle2 size={16} />Source-file copying disabled</p>
              <p className="ed-checkline"><CheckCircle2 size={16} />Source files remain private</p>
              <p className="ed-checkline"><ShieldCheck size={16} />No ResourceSpace writeback from this draft</p>
              <p className="ed-governance-note">{governance.auditMessage}</p>
            </details>
            <details open>
              <summary>Distribution summary</summary>
              <div className="ed-summary-grid">{[[String(sections.length), "Sections"], [String(governance.totalRefs), "References"], [String(governance.portalReadyRefs), "Portal Ready"], [String(governance.blockedRefs), "Blockers"], ["0", "File copies"], ["References only", "Source-file copying disabled"], ["Protected", "Source files"]].map(([v, l]) => <span key={l}><strong>{v}</strong><small>{l}</small></span>)}</div>
              <p className="ed-governance-note">Data source: {dataSourceSummary}</p>
            </details>
          </aside>
        </div>
        </>
      )}
    </div>
  );
}
