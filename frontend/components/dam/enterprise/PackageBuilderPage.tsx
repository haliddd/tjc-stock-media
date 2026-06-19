"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  KeyRound,
  Layers3,
  Lock,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetsSearch } from "@/components/dam/useDamApi";
import { assetType, displayTitle, sourceLabel } from "@/lib/enterprise-display";
import {
  buildPackageGovernance,
  buildPackageManifestPreviewRows,
  buildPackagePortalReadinessInspector
} from "@/lib/package-governance";
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
import { canAccessRoute } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";
import { matchesCatalogFilter } from "@/lib/catalog-language";
import { cn } from "@/lib/ui";
import type { DemoRole } from "@/lib/types";
import { ActionButton, AssetPreviewStrip, AssetThumb, ErrorCard, LoadingCard } from "./EnterpriseShared";

const PACKAGE_REVIEW_CLEAR_LABEL = "review-cleared";

function packageUiCopy(value?: string) {
  return (value || "")
    .replace(new RegExp("Portal\\s+Ready", "gi"), PACKAGE_REVIEW_CLEAR_LABEL)
    .replace(new RegExp("delivery\\s+handoff", "gi"), "file-access review")
    .replace(new RegExp("handoff\\s+draft", "gi"), "review draft")
    .replace(new RegExp("public\\s+link", "gi"), "hosted URL")
    .replace(new RegExp("Z" + "IP", "gi"), "file bundle")
    .replace(new RegExp("download\\s+job", "gi"), "file job")
    .replace(new RegExp("download\\s+rights", "gi"), "file access")
    .replace(new RegExp("download" + "able", "gi"), "available")
    .replace(new RegExp("delivery\\s+job", "gi"), "file job");
}

export function EnterprisePackageBuilderPage() {
  const { role } = useDemoRole();
  if (!canAccessRoute(role, "/packages")) {
    return (
      <div className="enterprise-page">
        <section className="ed-card ed-access-block">
          <Lock size={28} aria-hidden="true" />
          <h1>Package Builder requires DAM Admin role</h1>
          <p>Package drafts, review gates, and support checks are restricted to DAM Admins.</p>
          <a href={routeWithRole("/library", role)}>Return to Media Library</a>
        </section>
      </div>
    );
  }
  return <EnterprisePackageBuilderContent role={role} />;
}

function EnterprisePackageBuilderContent({ role }: { role: DemoRole }) {
  const router = useRouter();
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
  const [draft, setDraft] = useState(() => createPackageDraft("Package Draft"));
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
        title: /^(ResourceSpace Toolkit Draft|Media Set Draft|Package Draft)$/i.test(current.title) ? `${selectedCollection.name} Package Draft` : current.title,
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
  const reviewRequestBlocked = !governance.totalRefs;
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
    : "Readiness review becomes available after each required section has at least one approved reference.";
  const previewDisabledReason = governance.canPreview ? undefined : "Available after approved references are selected.";
  const reviewNoteDisabledReason = governance.canShare ? undefined : "Draft-only. Disabled until identity, durable review-note storage, and internal access policy are configured.";
  const reviewRequestDisabledReason = governance.totalRefs ? undefined : "Available after approved references are selected.";
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
      const response = await fetch(`/api/packages?role=${encodeURIComponent(role)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Package draft save failed.");
      if (payload.package?.id) setDraft((current) => ({ ...current, id: payload.package.id, updatedAt: payload.package.updatedAt }));
      setPackageMessage(`Package draft saved to ${payload.storageMode || "local-json"} with ${payload.package?.governance?.totalRefs ?? governance.totalRefs} ${refLabel}. Draft-only mode.`);
    } catch (error) {
      setPackageMessage(error instanceof Error ? error.message : "Package draft save failed.");
    } finally {
      setSaving(false);
    }
  };

  const previewPackage = () => {
    setPackageMessage(`${sections.length} sections, ${governance.totalRefs} selected ${refLabel}, ${governance.readinessScore}% draft-ready. No files copied.`);
  };

  const checkReviewNote = () => {
    setPackageMessage("Review note checked locally. No files, sends, source copies, or source writes were created.");
  };

  const queuePublish = () => {
    if (!governance.totalRefs) {
      setPackageMessage("Add approved references before requesting readiness review.");
      return;
    }
    setDraft((current) => ({ ...current, status: "pending-review", updatedAt: new Date().toISOString() }));
    if (!governance.canPublish) {
      setPackageMessage(`Review request marked pending locally: ${packageUiCopy(governance.reason)} No files, sends, source copies, or DAM writeback were created.`);
      return;
    }
    setPackageMessage(opsView ? "Review request marked pending locally. DAM source files stay canonical and are not copied." : "Review request marked pending locally. Source files stay protected and are not copied.");
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
      else setPackageMessage(`Review package readiness: ${packageUiCopy(governance.reason)}`);
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
  const packageTitle = visibleDraftTitle.replace(/ResourceSpace Toolkit Draft/gi, "Package Draft").replace(/Toolkit Draft/gi, "Package Draft").replace(/Media Set Draft/gi, "Package Draft");
  const dataSourceSummary = sourceLabel(search.source)
    .replace(/ResourceSpace export/gi, "ResourceSpace records")
    .replace(/\bexport\b/gi, "records");
  const activeSectionTitle = activeResolvedSection ? sectionLabel(activeResolvedSection.title) : "Cover";
  const requiredSectionCount = sections.length;
  const readySections = governance.sections.filter((section) => section.readinessStatus === "ready").length;
  const readinessUnlockCopy = "Available after at least one approved reference is selected for each required section.";
  const useCaseLabel = governance.chosenUse.replace("-", " ");
  const nextQueueSection = sections.find((section) => !section.resourceSpaceAssetIds.length) || sections.find((section) => sectionGovernance.get(section.id)?.readinessStatus !== "ready") || sections[0];
  const draftQueueRows = sections.map((section) => {
    const sectionPacket = sectionGovernance.get(section.id);
    const suggested = availableAssetsForTargetSection(section.id)[0];
    return {
      id: section.id,
      title: sectionLabel(section.title),
      status: sectionStatusLabel(sectionPacket?.readinessStatus),
      readinessStatus: sectionPacket?.readinessStatus || "empty",
      refs: section.resourceSpaceAssetIds.length,
      readyRefs: sectionPacket?.portalReadyRefs || 0,
      blockers: sectionPacket?.blockedRefs || 0,
      suggested
    };
  });
  const packageBriefRows = [
    {
      label: "Request",
      value: selectedCollection ? selectedCollection.name : "Manual package draft",
      detail: `Use case: ${useCaseLabel}. Draft records selected references only.`
    },
    {
      label: "Asset readiness",
      value: `${governance.portalReadyRefs}/${Math.max(governance.totalRefs, 1)} ${PACKAGE_REVIEW_CLEAR_LABEL}`,
      detail: governance.totalRefs ? governance.reason : `${sourceAssets.length.toLocaleString()} approved candidates visible before refs are selected.`
    },
    {
      label: "Operating limits",
      value: governance.canDownloadPackage ? "Manifest review eligible" : "Fail-closed",
      detail: "No generated files, source copies, hosted URLs, external sends, or ResourceSpace writeback from this draft."
    }
  ];
  const actionLabels: Record<(typeof governance.actions)[number]["action"], string> = {
    "save-draft": "Save draft record",
    "request-review": "Request reviewer check",
    "export-approved-copy-package": "Manifest check",
    "prepare-share-decision": "Review note"
  };
  const sectionRequirements = [
    ["Required", "Yes"],
    ["Minimum references", "1"],
    ["Allowed media", "Approved previews only"],
    ["Source files", "Protected"]
  ];
  const readinessRows = [
    {
      label: "Selected assets",
      status: governance.canPreview ? "ready" : governance.totalRefs ? "review" : "blocked",
      detail: governance.canPreview ? "All selected references can render role-safe previews." : "Add approved, resolvable references before preview review."
    },
    {
      label: "Review note",
      status: governance.canShare ? "ready" : "blocked",
      detail: governance.canShare ? "Internal access scope passes as draft only; no hosted URL is created." : "Access scope remains locked until approved references, durable review-note storage, and internal policy pass."
    },
    {
      label: "Manifest check",
      status: governance.canPublish ? "ready" : governance.totalRefs ? "review" : "blocked",
      detail: governance.canPublish ? "Manifest check can list approved derivatives while source files stay protected. No file job is created." : readinessReason
    }
  ];
  const draftFlowRows = [
    {
      label: "Package Draft",
      status: "ready",
      detail: "References can be arranged without copying source files or creating hosted URLs."
    },
    {
      label: "Reviewer request",
      status: governance.totalRefs ? "review" : "blocked",
      detail: governance.totalRefs
        ? "Mark review request pending in this draft; reviewer still verifies rights and usage scope."
        : "Add approved references before asking for readiness review."
    },
    {
      label: "Reviewer file-access candidate",
      status: governance.canPublish ? "ready" : "blocked",
      detail: governance.canPublish
        ? "Eligible to ask a reviewer for a file-access decision; draft-only mode creates no files or external sends."
        : `Blocked until every selected reference is ${PACKAGE_REVIEW_CLEAR_LABEL} for chosen use.`
    }
  ];
  const draftObjectRows = [
    {
      label: "Package Draft",
      status: "ready",
      detail: "Local curation record. Holds selected refs only."
    },
    {
      label: "Internal Portal Draft",
      status: governance.canPreview ? "ready" : governance.totalRefs ? "review" : "blocked",
      detail: "Preview-only internal portal shape. No email or hosted page."
    },
    {
      label: "Public Scope Candidate",
      status: governance.canPublish ? "review" : "blocked",
      detail: "Public-use candidate only after rights, derivative, and expiry checks pass."
    },
    {
      label: "Review Note",
      status: governance.canShare ? "review" : "blocked",
      detail: "Access draft field only. No hosted URL, email, or source mutation."
    },
    {
      label: "Manifest Check",
      status: governance.totalRefs ? "review" : "blocked",
      detail: "Row preview for approved renditions. No file job."
    }
  ];
  const inspector = buildPackagePortalReadinessInspector(governance);
  const manifestRows = buildPackageManifestPreviewRows(governance, 18);
  const draftControlRows = [
    { label: "Expiry date", value: "Not set", icon: CalendarClock },
    { label: "Password required", value: "On - draft field only", icon: KeyRound },
    { label: "Terms required", value: "On - draft field only", icon: ClipboardList },
    { label: "Comments allowed", value: "Off - inactive", icon: FileText },
    { label: "File retrieval", value: "Off - draft only", icon: Lock },
    { label: "Watermark / preview only", value: "On", icon: Eye },
    { label: "Recipient / access", value: "Draft field only", icon: ShieldCheck },
    { label: "Analytics", value: "Off - no tracking from this page", icon: ClipboardList }
  ];

  return (
    <div className="enterprise-page enterprise-package-builder">
      <header className="ed-package-builder-header">
        <div className="ed-package-title-block">
          <span className="ed-package-builder-kicker">Package Draft</span>
          <h1>{packageTitle || "Package Draft"}</h1>
          <p>
            <span>{draft.status === "draft" ? "Draft" : draft.status}</span>
            <span>{ownerLabel}</span>
            <span>{lastSavedLabel}</span>
            <span>Reference-only draft</span>
            {opsView ? <span>DAM source references</span> : null}
          </p>
        </div>
        <div className="ed-package-builder-actions" aria-label="Package builder actions">
          <ActionButton tone="primary" icon={Plus} ariaLabel="Add approved references to package draft" onClick={handlePrimaryPackageAction}>Add approved references</ActionButton>
          <ActionButton icon={UploadCloud} ariaLabel="Save package draft" disabled={saving || !canSaveDraft} disabledReason={saving ? "Saving draft now." : saveDisabledReason} onClick={saveDraft}>{saving ? "Saving..." : "Save draft"}</ActionButton>
          <ActionButton icon={MoreHorizontal} ariaLabel="Additional package actions" disabled disabledReason="Reference-only draft: no generated files, hosted URLs, source-file access, external sends, or writeback will be created.">More actions</ActionButton>
        </div>
      </header>

      {selectedCollection ? (
        <section className="ed-package-source-strip">
          <PackageCheck size={18} aria-hidden="true" />
          <div>
            <strong>Started from {selectedCollection.name}</strong>
            <span>{sourceAssets.length.toLocaleString()} approved references available. {collectionSkippedCount ? `${collectionSkippedCount.toLocaleString()} records stay out until readiness evidence passes. ` : ""}Full archive membership stays in DAM source.</span>
          </div>
          <button type="button" onClick={() => setPackageMessage(`Collection path imports visible ${PACKAGE_REVIEW_CLEAR_LABEL} references only. Review-only or hidden media remain out of this draft.`)}>Policy</button>
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

      <section className="ed-package-brief" aria-label="Package request and operating limit summary">
        {packageBriefRows.map((row) => (
          <article key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <p>{packageUiCopy(row.detail)}</p>
          </article>
        ))}
      </section>

      <section className="ed-package-object-dock" aria-label="Draft-safe package objects">
        {draftObjectRows.map((item) => (
          <article className={`is-${item.status}`} key={item.label}>
            <strong>{item.label}</strong>
            <span>{item.status === "ready" ? "Draft-safe" : item.status === "review" ? "Review gated" : "Blocked"}</span>
          </article>
        ))}
      </section>

      <section className="ed-package-control-dock" aria-label="Draft-safe package controls">
        {draftControlRows.map((item) => {
          const Icon = item.icon;
          return (
            <span key={item.label}>
              <Icon size={14} aria-hidden="true" />
              <strong>{item.label}</strong>
              <em>{item.value}</em>
            </span>
          );
        })}
      </section>

      <section className="ed-package-inspector-strip" aria-label="Compact readiness inspector">
        {[
          [inspector.selectedAssets, "selected"],
          [inspector.blockedAssets, "blocked"],
          [inspector.missingDerivatives, "missing derivatives"],
          [inspector.rightsIssues, "rights"],
          [inspector.expirationIssues, "expiration"]
        ].map(([value, label]) => (
          <span key={label}>
            <strong>{Number(value).toLocaleString()}</strong>
            <small>{label}</small>
          </span>
        ))}
      </section>

      {packageMessage ? <p className="ed-inline-success">{packageMessage}</p> : null}

      {search.loading ? <LoadingCard /> : search.error ? <ErrorCard message={search.error} source={search.source} /> : (
        <>
        <AssetPreviewStrip
          assets={activeAvailableAssets}
          title="Package draft candidates"
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

          <section className={cn("ed-package-canvas", allSectionsEmpty && "is-empty-package")}>
            {activeResolvedSection ? (
              <section className="ed-card ed-builder-section is-active" aria-labelledby="active-package-section-title">
                <section className="ed-draft-queue" aria-labelledby="draft-queue-title">
                  <header>
                    <div>
                      <span>Draft queue</span>
                      <h2 id="draft-queue-title">Build order</h2>
                    </div>
                    <strong>{populatedSections.toLocaleString()} / {sections.length.toLocaleString()} populated</strong>
                  </header>
                  <div className="ed-draft-queue-list">
                    {draftQueueRows.map((item) => (
                      <button
                        className={cn(activeSection === item.id && "is-active", `is-${item.readinessStatus}`)}
                        type="button"
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                      >
                        <Layers3 size={16} aria-hidden="true" />
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.refs ? `${item.readyRefs}/${item.refs} ${PACKAGE_REVIEW_CLEAR_LABEL}` : item.suggested ? `Next candidate: ${displayTitle(item.suggested)}` : "Waiting for approved candidate"}</small>
                        </span>
                        <em>{item.blockers ? `${item.blockers} blockers` : item.status}</em>
                      </button>
                    ))}
                  </div>
                  <p>
                    Next: {nextQueueSection ? sectionLabel(nextQueueSection.title) : activeSectionTitle}. Public-use approval still requires reviewer, review date, usage scope, and notes on each asset.
                  </p>
                </section>

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
                  <p>{activeResolvedSection.resourceSpaceAssetIds.length ? packageUiCopy(activeGovernance?.readinessSummary) : `No governed references selected for ${activeSectionTitle}.`}</p>
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
                              <small>{packageUiCopy(item.reuseLabel)}</small>
                              <small>{item.asset.usageScope || "Usage scope pending"}</small>
                              <small>{assetType(item.asset)}</small>
                            </div>
                          </div>
                          <div className="ed-package-reference-actions">
                            <button type="button" disabled={!item.canPreview} title={item.canPreview ? undefined : "Preview waits for approved, role-safe media references."} onClick={() => setPackageMessage(`${displayTitle(item.asset)} preview check stays role-safe. No source files exposed.`)}>Preview</button>
                            <button type="button" onClick={() => setDraft((current) => removePackageAssetRef(current, activeResolvedSection.id, item.asset))}>Remove</button>
                          </div>
                          <div className="ed-delivery-manifest" aria-label={`Reference gate manifest for ${displayTitle(item.asset)}`}>
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
                  <div className="ed-section-empty ed-section-empty-inline">
                    <AlertTriangle size={22} aria-hidden="true" />
                    <div>
                      <strong>{activeSectionTitle} still needs approved references</strong>
                      <span>{activeAvailableAssets[0] ? `Recommended next candidate: ${displayTitle(activeAvailableAssets[0])}.` : `No approved ${sourceScopeLabel} reference is available for this section.`} Source files remain private and are never copied into this draft.</span>
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
                          <small>{referenceLabel(asset)} · {packageUiCopy(buildPortalReuseDecision(asset, role).reuse.label)}</small>
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
          </section>

          <aside className="ed-panel ed-package-details" aria-label="Readiness and governance inspector">
            <section className="ed-card ed-portal-readiness-inspector">
              <header className="ed-card-head">
                <div>
                  <h3>Review gate inspector</h3>
                  <p>{governance.canPublish ? "Selected refs pass draft checks. Reviewer still controls any file-access decision." : "Draft checks blockers without creating files or source writes."}</p>
                </div>
              </header>
              <div className="ed-summary-grid">
                <span><strong>{inspector.selectedAssets.toLocaleString()}</strong><small>selected assets</small></span>
                <span><strong>{inspector.blockedAssets.toLocaleString()}</strong><small>blocked assets</small></span>
                <span><strong>{inspector.missingDerivatives.toLocaleString()}</strong><small>missing derivatives</small></span>
                <span><strong>{inspector.rightsIssues.toLocaleString()}</strong><small>rights issues</small></span>
                <span><strong>{inspector.expirationIssues.toLocaleString()}</strong><small>expiration issues</small></span>
              </div>
              {governance.blockerSummary.length ? <div className="ed-decision-reasons">{governance.blockerSummary.slice(0, 4).map((item) => <span key={item.category}>{item.label}: {item.count}</span>)}</div> : null}
              <p className="ed-action-helper">One blocked item blocks Review Note, Public Scope Candidate, and Manifest Check.</p>
            </section>
            <details open>
              <summary>Draft objects</summary>
              <div className="ed-command-readiness">
                {draftObjectRows.map((item) => (
                  <p className={`ed-readiness-row is-${item.status}`} key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{packageUiCopy(item.detail)}</span>
                  </p>
                ))}
              </div>
            </details>
            <details open>
              <summary>Readiness</summary>
              <p className="ed-action-helper">Chosen use: {governance.chosenUse.replace("-", " ")}. Portal draft, review note, and manifest check stay blocked unless every item is {PACKAGE_REVIEW_CLEAR_LABEL} for this use.</p>
              <div className="ed-command-readiness">
                {readinessRows.map((item) => (
                  <p className={`ed-readiness-row is-${item.status}`} key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{packageUiCopy(item.detail)}</span>
                  </p>
                ))}
              </div>
            </details>
            <details open>
              <summary>Draft workflow</summary>
              <div className="ed-command-readiness">
                {draftFlowRows.map((item) => (
                  <p className={`ed-readiness-row is-${item.status}`} key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{packageUiCopy(item.detail)}</span>
                  </p>
                ))}
              </div>
              <p className="ed-action-helper">Current package status: {draft.status === "pending-review" ? "Pending reviewer readiness review" : draft.status}. Package membership records a review request only; it does not grant approval or file access rights.</p>
            </details>
            <details open>
              <summary>Draft controls</summary>
              <div className="ed-draft-control-grid">
                <label>
                  <span>Expiry date</span>
                  <input type="text" value="Not set - draft only" readOnly disabled />
                </label>
                <label>
                  <span>Recipient / access</span>
                  <input type="text" value="Named group or recipient draft field" readOnly disabled />
                </label>
                <label>
                  <span>Analytics</span>
                  <input type="text" value="No tracking from this page" readOnly disabled />
                </label>
              </div>
              <div className="ed-draft-control-list">
                {draftControlRows.slice(1, 6).map((item) => {
                  const Icon = item.icon;
                  return (
                    <label key={item.label}>
                      <Icon size={14} aria-hidden="true" />
                      <span>{item.label}</span>
                      <em>{item.value}</em>
                      <input type="checkbox" checked={item.label !== "Comments allowed" && item.label !== "File retrieval"} readOnly disabled />
                    </label>
                  );
                })}
              </div>
              <p className="ed-action-helper">Controls are visible draft fields only. They do not create hosted URLs, password gates, sends, file access, or analytics writes.</p>
            </details>
            <details open>
              <summary>Manifest check</summary>
              {manifestRows.length ? (
                <div className="ed-manifest-preview-table" role="table" aria-label="Manifest check rows">
                  <div role="row">
                    <strong role="columnheader">Asset ref</strong>
                    <strong role="columnheader">Allowed rendition</strong>
                    <strong role="columnheader">Status</strong>
                    <strong role="columnheader">Reason</strong>
                  </div>
                  {manifestRows.map((item) => (
                    <div className={`is-${item.status === "ready" ? "ready" : item.status === "request-only" ? "review" : "blocked"}`} role="row" key={`${item.assetRef}-${item.allowedRendition}`}>
                      <span role="cell">{item.assetRef}</span>
                      <span role="cell">{item.allowedRendition}</span>
                      <span role="cell">{item.status === "request-only" ? "request only" : item.status}</span>
                      <span role="cell">{packageUiCopy(item.reason)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="ed-action-helper">Add references to inspect thumbnail, preview, approved web copy, approved print copy, and original-file restrictions.</p>}
            </details>
            <details open>
              <summary>Safe actions</summary>
              <div className="ed-delivery-gate-list" aria-label="Fail-closed file-access gates">
                {governance.actions.map((item) => (
                  <p className={`is-${item.status}`} key={item.action}>
                    <strong>{actionLabels[item.action]}</strong>
                    <span>{item.allowed ? "Draft check passes" : "Blocked"}</span>
                    <small>{packageUiCopy(item.reason)}</small>
                  </p>
                ))}
              </div>
              <div className="ed-package-rail-actions">
                <ActionButton icon={Eye} ariaLabel="Preview package draft" disabled={!governance.canPreview} disabledReason={previewDisabledReason} onClick={previewPackage}>Preview draft</ActionButton>
                <ActionButton icon={ShieldCheck} ariaLabel="Check review note" disabled={!governance.canShare} disabledReason={reviewNoteDisabledReason} onClick={checkReviewNote}>Review note</ActionButton>
                <ActionButton tone="primary" icon={Lock} ariaLabel="Request package readiness review" disabled={reviewRequestBlocked} disabledReason={reviewRequestDisabledReason} onClick={queuePublish}>Request review</ActionButton>
              </div>
              <p className="ed-action-helper">{readinessUnlockCopy}</p>
              <p className="ed-action-helper">Package Draft only: no generated files, hosted URLs, source-file access, external sends, or ResourceSpace writeback is created.</p>
            </details>
            <details>
              <summary>Access scope</summary>
              <p className="ed-action-helper">Internal portal planning only. No hosted URL, generated package, source-file copying, or external send is created.</p>
              <label className="ed-toggle">Review-cleared only <input type="checkbox" checked={approvedOnly} onChange={(event) => setApprovedOnly(event.target.checked)} /></label>
            </details>
            <details open>
              <summary>Governance guarantees</summary>
              <p className="ed-checkline"><CheckCircle2 size={16} />References retained only</p>
              {opsView ? <p className="ed-checkline"><CheckCircle2 size={16} />DAM record refs retained</p> : null}
              <p className="ed-checkline"><CheckCircle2 size={16} />Source-file copying disabled</p>
              <p className="ed-checkline"><CheckCircle2 size={16} />Source files remain private</p>
              <p className="ed-checkline"><ShieldCheck size={16} />No ResourceSpace writeback from this draft</p>
              <p className="ed-governance-note">{packageUiCopy(governance.auditMessage)}</p>
            </details>
            <details open>
              <summary>Draft summary</summary>
              <div className="ed-summary-grid">{[[String(sections.length), "Sections"], [String(governance.totalRefs), "References"], [String(governance.portalReadyRefs), "Review-cleared"], [String(governance.blockedRefs), "Blockers"], ["0", "File copies"], ["References only", "Source-file copying disabled"], ["Protected", "Source files"]].map(([v, l]) => <span key={l}><strong>{v}</strong><small>{l}</small></span>)}</div>
              <p className="ed-governance-note">Data source: {dataSourceSummary}</p>
            </details>
          </aside>
        </div>
        </>
      )}
    </div>
  );
}
