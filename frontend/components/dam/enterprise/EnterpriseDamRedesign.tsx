"use client";

import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  FolderOpen,
  Grid3X3,
  HelpCircle,
  History,
  Info,
  Layers3,
  Library,
  Link as LinkIcon,
  List,
  Lock,
  Menu,
  PackageCheck,
  Plus,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  Users
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import {
  assetById,
  collectionAssets,
  damAssets,
  damCollections,
  distributionReadiness,
  formatDate,
  governanceRecords,
  initialDistributionSections,
  portalReadyAssets,
  readinessForAssets,
  rightsBadgesForAsset,
  statusMeta,
  type AuditEvent,
  type CanonicalStatus,
  type DamAsset,
  type DamAssetType,
  type DamCollection,
  type DistributionSection,
  type EvidenceItem,
  type GovernanceRecord
} from "@/lib/enterprise-dam-redesign";
import { routeWithRole } from "@/lib/role-routes";
import {
  buildDuplicateHints,
  buildMediaInventory,
  buildRiskFlags,
  parseIntakeSourceName,
  type DetectionConfidence
} from "@/lib/upload-intake-detection";
import { enterpriseReviewActionState } from "@/lib/enterprise-review-actions";
import type { DemoRole } from "@/lib/types";
import { cn } from "@/lib/utils";

type Column<T extends { id: string }> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
};

function roleCanContribute(role: DemoRole) {
  return role === "Contributor" || role === "Reviewer" || role === "DAM Admin";
}

function roleCanReview(role: DemoRole) {
  return role === "Reviewer" || role === "DAM Admin";
}

function assetCollectionNames(asset: DamAsset) {
  return asset.collectionIds
    .map((id) => damCollections.find((collection) => collection.id === id)?.name)
    .filter(Boolean)
    .join(", ") || "Unassigned";
}

function collectionDisplayStatus(collection: DamCollection): CanonicalStatus {
  if (collection.blockedCount) return "Blocked";
  if (collection.needsEvidenceCount) return "Needs Evidence";
  if (collection.readyCount) return "Portal Ready";
  return "Draft";
}

function peopleMinorsLabel(asset: DamAsset) {
  if (asset.peopleVisible === "no" && asset.minorsVisible === "no") return "No people";
  if (asset.minorsVisible === "yes") return "People and minors visible";
  if (asset.minorsVisible === "unknown") return "People/minors unknown";
  if (asset.peopleVisible === "yes") return "People visible";
  return "People visibility unknown";
}

function classForEvidence(state: EvidenceItem["state"]) {
  if (state === "Complete") return "is-complete";
  if (state === "Missing" || state === "Blocked" || state === "Not generated") return "is-blocked";
  return "is-warning";
}

const localBetaPreviewIds = [
  "367",
  "441",
  "368",
  "404",
  "391",
  "447",
  "372",
  "405",
  "392",
  "448",
  "373",
  "406"
];

function localBetaPreviewId(asset: DamAsset) {
  const numericId = asset.id.match(/(\d+)$/)?.[1];
  const index = numericId ? (Number(numericId) - 1001 + localBetaPreviewIds.length) % localBetaPreviewIds.length : 0;
  return localBetaPreviewIds[index] || localBetaPreviewIds[0];
}

function localBetaPreviewUrl(asset: DamAsset, role: DemoRole, variant = "small") {
  return `/api/assets/thumbnail/${localBetaPreviewId(asset)}?variant=${variant}&role=${encodeURIComponent(role)}`;
}

export function StatusBadge({ status, compact = false }: { status: CanonicalStatus; compact?: boolean }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span className={cn("damx-status-badge", meta.className, compact && "is-compact")} title={meta.description}>
      <Icon size={13} aria-hidden="true" />
      {status}
    </span>
  );
}

export function RightsBadge({ label }: { label: string }) {
  const lower = label.toLowerCase();
  const tone = lower.includes("approved") || lower.includes("verified")
    ? "is-approved"
    : lower.includes("required") || lower.includes("expiring") || lower.includes("missing")
      ? "is-warning"
      : lower.includes("blocked") || lower.includes("restricted")
        ? "is-restricted"
        : "is-neutral";
  return <span className={cn("damx-rights-badge", tone)}>{label}</span>;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  statusBadge,
  primaryAction,
  secondaryActions,
  metadata
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  statusBadge?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  metadata?: ReactNode;
}) {
  return (
    <header className="damx-page-header">
      <div className="damx-page-header-main">
        {eyebrow ? <span className="damx-eyebrow">{eyebrow}</span> : null}
        <div className="damx-title-row">
          <h1>{title}</h1>
          {statusBadge}
        </div>
        {description ? <p>{description}</p> : null}
        {metadata ? <div className="damx-page-meta">{metadata}</div> : null}
      </div>
      {(primaryAction || secondaryActions) ? (
        <div className="damx-page-actions">
          {secondaryActions}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}

function EnterpriseButton({
  children,
  icon,
  tone = "secondary",
  disabled,
  disabledReason,
  onClick,
  href,
  ariaLabel
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "primary" | "secondary" | "tertiary" | "danger";
  disabled?: boolean;
  disabledReason?: string;
  onClick?: () => void;
  href?: string;
  ariaLabel?: string;
}) {
  const content = (
    <>
      {icon}
      <span>{children}</span>
    </>
  );
  const className = cn("damx-button", `is-${tone}`);
  if (href && !disabled) {
    return <Link className={className} href={href} aria-label={ariaLabel}>{content}</Link>;
  }
  return (
    <button
      className={className}
      type="button"
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export function AssetThumbnail({ asset, className }: { asset?: DamAsset; className?: string }) {
  const { role } = useDemoRole();
  if (!asset) {
    return (
      <div className={cn("damx-asset-thumb is-empty", className)}>
        <Library size={18} aria-hidden="true" />
        <span>No preview</span>
      </div>
    );
  }
  const sensitivePreviewBlocked = asset.minorsVisible !== "no"
    || (asset.tags.some((tag) => /youth|minor|children|consent|group/i.test(tag)) && asset.evidenceState !== "complete");
  if (!asset.thumbnailUrl || sensitivePreviewBlocked) {
    return (
      <div className={cn("damx-asset-thumb is-empty is-sensitive", asset.sourceAccessState === "restricted" && "is-restricted", className)}>
        <Library size={18} aria-hidden="true" />
        <span>Preview restricted</span>
        <small>{asset.type}</small>
        <small>{asset.title}</small>
        {asset.sourceAccessState === "restricted" ? <em title="Source file restricted"><Lock size={12} aria-hidden="true" /></em> : null}
      </div>
    );
  }
  return (
    <div className={cn("damx-asset-thumb", asset.sourceAccessState === "restricted" && "is-restricted", className)}>
      <img src={localBetaPreviewUrl(asset, role, className?.includes("is-review-preview") || className?.includes("is-large") ? "detail" : "small")} alt={`${asset.title} preview`} loading="lazy" />
      <span>{asset.type}</span>
      {asset.sourceAccessState === "restricted" ? <em title="Source file restricted"><Lock size={12} aria-hidden="true" /></em> : null}
      {asset.peopleVisible === "yes" || asset.peopleVisible === "unknown" || asset.minorsVisible === "yes" || asset.minorsVisible === "unknown" ? (
        <strong title={asset.minorsVisible === "yes" || asset.minorsVisible === "unknown" ? "People or minors visible" : "People visible"}><Users size={12} aria-hidden="true" /></strong>
      ) : null}
    </div>
  );
}

function DamxPreviewStrip({
  assets,
  title,
  detail
}: {
  assets: DamAsset[];
  title: string;
  detail: string;
}) {
  const { role } = useDemoRole();
  const visibleAssets = assets.slice(0, 5);
  if (!visibleAssets.length) return null;
  return (
    <section className="damx-preview-strip" aria-label={title}>
      <header>
        <div>
          <span>Local beta previews</span>
          <h2>{title}</h2>
          <p>{detail}</p>
        </div>
        <strong>{visibleAssets.length} visible</strong>
      </header>
      <div>
        {visibleAssets.map((asset) => (
          <Link href={routeWithRole(`/library/${asset.id}`, role)} key={asset.id}>
            <AssetThumbnail asset={asset} />
            <span><strong>{asset.title}</strong><small>{asset.id} | {asset.type}</small></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function EvidenceChecklist({ items }: { items: EvidenceItem[] }) {
  return (
    <div className="damx-evidence-checklist">
      {items.map((item) => (
        <div className={cn("damx-evidence-row", classForEvidence(item.state))} key={item.requirement}>
          <span aria-hidden="true">{item.state === "Complete" ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}</span>
          <div>
            <strong>{item.requirement}</strong>
            {item.detail ? <small>{item.detail}</small> : null}
          </div>
          <em>{item.state}</em>
          <small>{item.owner}</small>
        </div>
      ))}
    </div>
  );
}

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="damx-audit-timeline">
      {events.map((event, index) => (
        <li key={`${event.timestamp}-${event.action}-${index}`}>
          <span aria-hidden="true"><History size={14} /></span>
          <div>
            <strong>{event.action}</strong>
            <p>{event.notes}</p>
            <small>{event.timestamp} | {event.actor} | {event.result || "Recorded"}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({
  title,
  body,
  actions,
  icon = <Info size={22} aria-hidden="true" />
}: {
  title: string;
  body: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="damx-empty-state">
      <span>{icon}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {actions ? <div className="damx-empty-actions">{actions}</div> : null}
    </section>
  );
}

export function DataTable<T extends { id: string }>({
  label,
  rows,
  columns,
  selectedId,
  selectedIds = [],
  onSelect,
  onToggleRow,
  emptyState,
  pageSize = 8
}: {
  label: string;
  rows: T[];
  columns: Column<T>[];
  selectedId?: string;
  selectedIds?: string[];
  onSelect?: (row: T) => void;
  onToggleRow?: (row: T) => void;
  emptyState?: ReactNode;
  pageSize?: number;
}) {
  const [sortKey, setSortKey] = useState(columns.find((column) => column.sortValue)?.key || "");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey && item.sortValue);
    if (!column?.sortValue) return rows;
    return [...rows].sort((left, right) => {
      const a = column.sortValue?.(left) ?? "";
      const b = column.sortValue?.(right) ?? "";
      const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true });
      return direction === "asc" ? result : -result;
    });
  }, [columns, direction, rows, sortKey]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(column: Column<T>) {
    if (!column.sortValue) return;
    if (sortKey === column.key) {
      setDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(column.key);
    setDirection("asc");
  }

  if (!rows.length) return <>{emptyState}</>;

  return (
    <div className="damx-table-wrap">
      <table className="damx-data-table" aria-label={label}>
        <thead>
          <tr>
            {onToggleRow ? <th aria-label="Select rows" /> : null}
            {columns.map((column) => (
              <th className={column.className} key={column.key}>
                {column.sortValue ? (
                  <button type="button" onClick={() => toggleSort(column)}>
                    {column.header}
                    <ChevronDown size={13} aria-hidden="true" />
                  </button>
                ) : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr
              className={cn(selectedId === row.id && "is-active")}
              key={row.id}
              onClick={() => onSelect?.(row)}
            >
              {onToggleRow ? (
                <td data-label="Selected" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    aria-label={`Select row ${row.id}`}
                    onChange={() => onToggleRow(row)}
                  />
                </td>
              ) : null}
              {columns.map((column) => <td data-label={column.header} className={column.className} key={column.key}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="damx-table-footer">
        <span>{visibleRows.length ? `${((safePage - 1) * pageSize) + 1}-${((safePage - 1) * pageSize) + visibleRows.length} of ${rows.length}` : "0 results"}</span>
        <div>
          <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          <span>Page {safePage} of {pageCount}</span>
          <button type="button" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}

export function ReadinessPanel({
  score,
  blockers,
  ready,
  total,
  title = "Readiness",
  description
}: {
  score: number;
  blockers: string[];
  ready: number;
  total: number;
  title?: string;
  description?: string;
}) {
  const status: CanonicalStatus = blockers.length ? score ? "In Review" : "Blocked" : "Portal Ready";
  return (
    <aside className="damx-readiness-panel">
      <header>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <StatusBadge status={status} compact />
      </header>
      <div className="damx-readiness-score">
        <strong>{score}%</strong>
        <span>{ready} of {total} ready</span>
      </div>
      <div className="damx-meter" aria-label={`${score}% ready`}><span style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div>
      <section>
        <h3>Blockers</h3>
        {blockers.length ? (
          <ul>{blockers.slice(0, 6).map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
        ) : <p>No active blockers. Export or download availability can proceed through the normal gate.</p>}
      </section>
      <p>Collection membership never overrides asset-level approval. Source files remain restricted.</p>
    </aside>
  );
}

export function AssetInspector({
  asset,
  emptyTitle = "Select an asset",
  emptyBody = "Choose an asset to view preview, rights, approved derivative, and audit history."
}: {
  asset?: DamAsset;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  if (!asset) {
    return (
      <aside className="damx-inspector">
        <EmptyState title={emptyTitle} body={emptyBody} icon={<Library size={22} aria-hidden="true" />} />
      </aside>
    );
  }
  const downloadAllowed = asset.displayStatus === "Portal Ready" && asset.derivativeState === "available";
  return (
    <aside className="damx-inspector">
      <AssetThumbnail asset={asset} className="is-large" />
      <div className="damx-inspector-title">
        <div>
          <h2>{asset.title}</h2>
          <span>{asset.id}</span>
        </div>
        <StatusBadge status={asset.displayStatus} />
      </div>
      <div className="damx-inspector-actions">
        <EnterpriseButton
          tone="primary"
          icon={<Download size={15} aria-hidden="true" />}
          disabled={!downloadAllowed}
          disabledReason={downloadAllowed ? undefined : "Approved derivative required before download."}
        >
          Download approved derivative
        </EnterpriseButton>
        <EnterpriseButton icon={<Lock size={15} aria-hidden="true" />}>Request source access</EnterpriseButton>
      </div>
      <section>
        <h3>Rights summary</h3>
        <div className="damx-badge-row">
          {rightsBadgesForAsset(asset).map((badge) => <RightsBadge key={badge} label={badge} />)}
        </div>
      </section>
      <dl className="damx-metadata-list">
        <div><dt>Usage scope</dt><dd>{asset.usageScopes.join(", ")}</dd></div>
        <div><dt>Approved derivative</dt><dd>{asset.approvedDerivativeLabel || "Not generated"}</dd></div>
        <div><dt>People/minors</dt><dd>{peopleMinorsLabel(asset)}</dd></div>
        <div><dt>Collection</dt><dd>{assetCollectionNames(asset)}</dd></div>
        <div><dt>Owner</dt><dd>{asset.owner}</dd></div>
        <div><dt>Expiry</dt><dd>{formatDate(asset.expiryDate)}</dd></div>
      </dl>
      <section>
        <h3>Evidence</h3>
        <EvidenceChecklist items={asset.evidence.slice(0, 5)} />
      </section>
      <section>
        <h3>Audit history</h3>
        <AuditTimeline events={asset.auditEvents} />
      </section>
    </aside>
  );
}

function FilterBar({
  query,
  setQuery,
  savedView,
  setSavedView,
  typeFilter,
  setTypeFilter,
  sort,
  setSort,
  viewMode,
  setViewMode,
  onOpenMobileFilters
}: {
  query: string;
  setQuery: (value: string) => void;
  savedView: string;
  setSavedView: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  viewMode: "table" | "grid";
  setViewMode: (value: "table" | "grid") => void;
  onOpenMobileFilters: () => void;
}) {
  const savedViews = ["Portal Ready", "Needs Evidence", "In Review", "People/Minors", "Internal Only", "Expiring Soon"];
  return (
    <section className="damx-filterbar" aria-label="Library filters">
      <label className="damx-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Search assets</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, asset ID, event, ministry, tag, speaker, filename..."
        />
      </label>
      <div className="damx-saved-views" aria-label="Saved views">
        {savedViews.map((view) => (
          <button
            className={savedView === view ? "is-active" : undefined}
            type="button"
            key={view}
            aria-pressed={savedView === view}
            onClick={() => setSavedView(savedView === view ? "" : view)}
          >
            {view}
          </button>
        ))}
      </div>
      <div className="damx-filter-row">
        <button className="damx-mobile-filter-button" type="button" onClick={onOpenMobileFilters}>
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filters
        </button>
        <label>
          <span>Type</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All types</option>
            {(["Image", "Video", "Audio", "Graphic", "Document"] satisfies DamAssetType[]).map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option>Newest</option>
            <option>Recently updated</option>
            <option>Title</option>
            <option>Expiring soon</option>
            <option>Readiness</option>
          </select>
        </label>
        <div className="damx-view-toggle" aria-label="View mode">
          <button type="button" className={viewMode === "table" ? "is-active" : undefined} onClick={() => setViewMode("table")} aria-label="Table view"><List size={16} aria-hidden="true" /></button>
          <button type="button" className={viewMode === "grid" ? "is-active" : undefined} onClick={() => setViewMode("grid")} aria-label="Grid view"><Grid3X3 size={16} aria-hidden="true" /></button>
        </div>
      </div>
    </section>
  );
}

function MobileAssetCards({ assets, selectedId, onSelect }: { assets: DamAsset[]; selectedId?: string; onSelect: (asset: DamAsset) => void }) {
  return (
    <div className="damx-mobile-card-list">
      {assets.map((asset) => (
        <button className={cn("damx-mobile-asset-card", selectedId === asset.id && "is-active")} type="button" key={asset.id} onClick={() => onSelect(asset)}>
          <AssetThumbnail asset={asset} />
          <span>
            <strong>{asset.title}</strong>
            <small>{asset.id} | {assetCollectionNames(asset)}</small>
            <span><StatusBadge status={asset.displayStatus} compact /> {asset.derivativeState === "available" ? "Derivative ready" : "Derivative missing"}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function EnterpriseLibraryPage() {
  const { role } = useDemoRole();
  const [query, setQuery] = useState("");
  const [savedView, setSavedView] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState("Newest");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedId, setSelectedId] = useState(damAssets[0]?.id || "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const filteredAssets = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const base = damAssets
      .filter((asset) => !typeFilter || asset.type === typeFilter)
      .filter((asset) => {
        if (!savedView) return true;
        if (savedView === "Portal Ready") return asset.displayStatus === "Portal Ready";
        if (savedView === "Needs Evidence") return asset.displayStatus === "Needs Evidence";
        if (savedView === "In Review") return asset.displayStatus === "In Review" || asset.displayStatus === "Submitted";
        if (savedView === "People/Minors") return asset.peopleVisible === "yes" || asset.peopleVisible === "unknown" || asset.minorsVisible === "yes" || asset.minorsVisible === "unknown";
        if (savedView === "Internal Only") return asset.displayStatus === "Approved Internal" || /internal/i.test(asset.usageScopes.join(", "));
        if (savedView === "Expiring Soon") return asset.displayStatus === "Expiring Soon";
        return true;
      })
      .filter((asset) => {
        if (!terms.length) return true;
        const haystack = [
          asset.title,
          asset.id,
          assetCollectionNames(asset),
          asset.ministry,
          asset.type,
          asset.owner,
          asset.usageScopes.join(", "),
          peopleMinorsLabel(asset),
          ...asset.tags
        ].join(" ").toLowerCase();
        return terms.every((term) => haystack.includes(term));
      });
    return [...base].sort((a, b) => {
      if (sort === "Title") return a.title.localeCompare(b.title);
      if (sort === "Recently updated") return (b.captureDate || "").localeCompare(a.captureDate || "");
      if (sort === "Expiring soon") return (a.expiryDate || "9999").localeCompare(b.expiryDate || "9999");
      if (sort === "Readiness") return Number(b.displayStatus === "Portal Ready") - Number(a.displayStatus === "Portal Ready");
      return (b.captureDate || "").localeCompare(a.captureDate || "");
    });
  }, [query, savedView, sort, typeFilter]);
  const selected = filteredAssets.find((asset) => asset.id === selectedId) || filteredAssets[0];
  const collectionOptions = Array.from(new Set(damAssets.map((asset) => assetCollectionNames(asset))));

  const columns: Column<DamAsset>[] = [
    {
      key: "thumbnail",
      header: "Thumbnail",
      render: (asset) => <AssetThumbnail asset={asset} />,
    },
    {
      key: "title",
      header: "Title",
      sortValue: (asset) => asset.title,
      render: (asset) => <span className="damx-title-cell"><strong>{asset.title}</strong><small>{asset.description}</small></span>,
    },
    { key: "id", header: "Asset ID", sortValue: (asset) => asset.id, render: (asset) => asset.id },
    { key: "type", header: "Type", sortValue: (asset) => asset.type, render: (asset) => asset.type },
    { key: "collection", header: "Collection", sortValue: (asset) => assetCollectionNames(asset), render: (asset) => assetCollectionNames(asset) },
    { key: "rights", header: "Rights status", render: (asset) => <RightsBadge label={asset.rightsSummary} /> },
    { key: "scope", header: "Usage scope", render: (asset) => asset.usageScopes.join(", ") },
    { key: "people", header: "People/minors", render: (asset) => peopleMinorsLabel(asset) },
    { key: "derivative", header: "Approved derivative", render: (asset) => asset.approvedDerivativeLabel || "Not generated" },
    { key: "expiry", header: "Expiry", sortValue: (asset) => asset.expiryDate || "9999", render: (asset) => formatDate(asset.expiryDate) },
    { key: "owner", header: "Owner", sortValue: (asset) => asset.owner || "", render: (asset) => asset.owner || "Unassigned" },
    {
      key: "actions",
      header: "Actions",
      render: (asset) => (
        <div className="damx-row-actions">
          <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(asset.id); }}>Open</button>
          <button
            type="button"
            disabled={asset.displayStatus !== "Portal Ready"}
            title={asset.displayStatus !== "Portal Ready" ? "Portal Ready derivative required." : undefined}
            onClick={(event) => { event.stopPropagation(); setNotice(`Approved derivative request recorded for ${asset.title}.`); }}
          >
            Download
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setNotice(`Source access request started for ${asset.title}.`); }}>Request source</button>
        </div>
      )
    }
  ];

  return (
    <div className="damx-page damx-library-page">
      <PageHeader
        title="Library"
        description="Browse approved and reviewable media. Source files remain restricted."
        primaryAction={roleCanContribute(role) ? <EnterpriseButton tone="primary" icon={<UploadCloud size={16} aria-hidden="true" />} href={routeWithRole("/upload", role)}>Upload assets</EnterpriseButton> : undefined}
        secondaryActions={<EnterpriseButton icon={<FolderOpen size={16} aria-hidden="true" />} onClick={() => setNotice("Collection picker opened. Collection membership never grants reuse approval.")}>Add to collection</EnterpriseButton>}
        metadata={<><span>{filteredAssets.length} visible assets</span><span>{portalReadyAssets(filteredAssets).length} Portal Ready</span><span>{collectionOptions.length} collections</span></>}
      />
      {notice ? <p className="damx-notice">{notice}</p> : null}
      <FilterBar
        query={query}
        setQuery={setQuery}
        savedView={savedView}
        setSavedView={setSavedView}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        sort={sort}
        setSort={setSort}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenMobileFilters={() => setMobileFiltersOpen((open) => !open)}
      />
      {mobileFiltersOpen ? (
        <section className="damx-mobile-filter-drawer" aria-label="Mobile filters">
          <label>Collection<select onChange={(event) => setQuery(event.target.value)} defaultValue=""><option value="">Any collection</option>{collectionOptions.map((collection) => <option key={collection}>{collection}</option>)}</select></label>
          <label>Rights status<select onChange={(event) => setSavedView(event.target.value)} value={savedView}><option value="">Any status</option><option>Portal Ready</option><option>Needs Evidence</option><option>In Review</option><option>Internal Only</option></select></label>
        </section>
      ) : null}
      <div className="damx-library-layout">
        <main className="damx-library-main">
          {viewMode === "table" ? (
            <DataTable
              label="Library asset table"
              rows={filteredAssets}
              columns={columns}
              selectedId={selected?.id}
              selectedIds={selectedIds}
              onSelect={(asset) => setSelectedId(asset.id)}
              onToggleRow={(asset) => setSelectedIds((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id])}
              emptyState={<EmptyState title="No assets match your current filters" body="You may not have permission to view restricted source files, or this saved view has no approved assets yet." actions={<><EnterpriseButton onClick={() => { setQuery(""); setSavedView(""); setTypeFilter(""); }}>Clear filters</EnterpriseButton><EnterpriseButton>Request access</EnterpriseButton><EnterpriseButton>View recent uploads</EnterpriseButton></>} />}
              pageSize={10}
            />
          ) : (
            <div className="damx-asset-grid">
              {filteredAssets.map((asset) => (
                <button className={cn("damx-asset-grid-card", selected?.id === asset.id && "is-active")} key={asset.id} type="button" onClick={() => setSelectedId(asset.id)}>
                  <AssetThumbnail asset={asset} />
                  <strong>{asset.title}</strong>
                  <small>{asset.id} | {assetCollectionNames(asset)}</small>
                  <span><StatusBadge status={asset.displayStatus} compact /></span>
                </button>
              ))}
            </div>
          )}
          <MobileAssetCards assets={filteredAssets} selectedId={selected?.id} onSelect={(asset) => setSelectedId(asset.id)} />
        </main>
        <AssetInspector asset={selected} />
      </div>
    </div>
  );
}

const uploadSteps = ["Add media", "Confirm batch", "Submit review packet"] as const;
const uploadDraftKey = "tjc-upload-intake-batch-draft-v1";
const requestedUseOptions = ["Website", "Social", "Newsletter", "Slides", "Print", "Internal training", "Public external use", "Archive only"];
const folderInputProps = { webkitdirectory: "", directory: "" } as unknown as InputHTMLAttributes<HTMLInputElement>;

type UploadReceipt = {
  ok?: boolean;
  batchId?: string;
  status?: string;
  defaultReviewState?: string;
  defaultUsageScope?: string;
  message?: string;
  storageMode?: string;
  custodyMode?: string;
  resourceSpaceWritten?: boolean;
};

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024)).toLocaleString()} KB`;
}

function confidenceLabel(confidence: DetectionConfidence) {
  if (confidence === "high") return "High confidence";
  if (confidence === "medium") return "Needs confirmation";
  return "Reviewer task";
}

function safeHttpUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function EnterpriseUploadPage() {
  const { role } = useDemoRole();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [sourceLink, setSourceLink] = useState("");
  const [batchName, setBatchName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [ministry, setMinistry] = useState("");
  const [source, setSource] = useState("");
  const [location, setLocation] = useState("");
  const [collection, setCollection] = useState("");
  const [language, setLanguage] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [usage, setUsage] = useState<string[]>(["Website"]);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<UploadReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const allowed = roleCanContribute(role);
  const inventory = useMemo(() => buildMediaInventory(files), [files]);
  const duplicateHints = useMemo(() => buildDuplicateHints(files), [files]);
  const detected = useMemo(() => parseIntakeSourceName(inventory.folderName || batchName || ""), [batchName, inventory.folderName]);
  const mergedDetected = {
    ...detected,
    eventName: batchName || detected.eventName,
    eventDate: eventDate || detected.eventDate,
    ministry: ministry || detected.ministry,
    location: location || detected.location,
    photographer: source || detected.photographer
  };
  const riskFlags = useMemo(() => buildRiskFlags({
    folderName: inventory.folderName,
    filenames: files.map((file) => file.name),
    notes,
    tags,
    eventName: batchName,
    ministry
  }), [batchName, files, inventory.folderName, ministry, notes, tags]);
  const validSourceLink = safeHttpUrl(sourceLink);
  const hasFileOrSource = files.length > 0 || Boolean(sourceLink.trim() && validSourceLink);
  const missingAddMedia = [
    !hasFileOrSource && "Add photos, a folder, or a source link",
    sourceLink.trim() && !validSourceLink && "Use a full http or https source link"
  ].filter(Boolean);
  const missingBatch = [
    !batchName.trim() && "Batch/event name",
    !eventDate.trim() && "Date",
    !ministry.trim() && "Ministry/team",
    !source.trim() && "Source/photographer/uploader"
  ].filter(Boolean);
  const readyToSubmit = hasFileOrSource && validSourceLink && missingBatch.length === 0;
  const reviewerTasks = [
    "Rights reviewer verifies ownership/license before public use",
    "People/youth reviewer confirms visibility before approval",
    "Consent/release required before public/external approval when people/youth appear",
    tags.trim() ? "Taxonomy reviewer approves suggested tags" : "Taxonomy reviewer adds approved search terms",
    duplicateHints.length ? "Duplicate candidates need reviewer/admin decision" : "",
    ...riskFlags
  ].filter(Boolean);
  const adminTasks = [
    inventory.largeMediaCount ? "Large media/admin intake required" : "",
    files.length ? "Checksum processing pending" : "",
    duplicateHints.length ? "Duplicate group processing pending" : "",
    "Approved derivatives generated after review",
    "DAM sync pending; upload does not write approval truth"
  ].filter(Boolean);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(uploadDraftKey) || "{}") as Record<string, unknown>;
      setSourceLink(String(saved.sourceLink || ""));
      setBatchName(String(saved.batchName || ""));
      setEventDate(String(saved.eventDate || ""));
      setMinistry(String(saved.ministry || ""));
      setSource(String(saved.source || ""));
      setLocation(String(saved.location || ""));
      setCollection(String(saved.collection || ""));
      setLanguage(String(saved.language || ""));
      setNotes(String(saved.notes || ""));
      setTags(String(saved.tags || ""));
      if (Array.isArray(saved.usage)) setUsage(saved.usage.map(String).filter(Boolean));
    } catch {
      // Local draft restore is best-effort only.
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    window.localStorage.setItem(uploadDraftKey, JSON.stringify({ sourceLink, batchName, eventDate, ministry, source, location, collection, language, notes, tags, usage }));
  }, [batchName, collection, draftLoaded, eventDate, language, location, ministry, notes, source, sourceLink, tags, usage]);

  useEffect(() => {
    if (!inventory.folderName) return;
    const parsed = parseIntakeSourceName(inventory.folderName);
    if (!batchName && parsed.eventName) setBatchName(parsed.eventName);
    if (!eventDate && parsed.eventDate) setEventDate(parsed.eventDate);
    if (!ministry && parsed.ministry) setMinistry(parsed.ministry);
    if (!source && parsed.photographer) setSource(parsed.photographer);
    if (!location && parsed.location) setLocation(parsed.location);
  }, [batchName, eventDate, inventory.folderName, location, ministry, source]);

  if (!allowed) {
    return (
      <div className="damx-page">
        <EmptyState
          title="Create intake batch requires Contributor access"
          body="Contributors can create intake batches. Reviewers approve rights, people/youth, usage scope, and derivatives later."
          actions={<EnterpriseButton href={routeWithRole("/library", role)} icon={<Library size={16} aria-hidden="true" />}>Open Library</EnterpriseButton>}
        />
      </div>
    );
  }

  function handleFiles(fileList: FileList | null) {
    const nextFiles = Array.from(fileList || []);
    setFiles(nextFiles);
    setReceipt(null);
    if (nextFiles.length) setMessage(`${nextFiles.length} file(s) staged locally. System scan prepared a review packet draft.`);
  }

  function addDroppedFiles(fileList: FileList | null) {
    const nextFiles = [...files, ...Array.from(fileList || [])];
    setFiles(nextFiles);
    setReceipt(null);
    if (nextFiles.length) setMessage(`${nextFiles.length} file(s) staged locally. System scan prepared a review packet draft.`);
  }

  function toggleUsage(item: string) {
    setUsage((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  }

  function saveDraft() {
    window.localStorage.setItem(uploadDraftKey, JSON.stringify({ sourceLink, batchName, eventDate, ministry, source, location, collection, language, notes, tags, usage }));
    setMessage("Draft saved locally in this browser. Files are not durable until submit.");
  }

  function clearDraft() {
    window.localStorage.removeItem(uploadDraftKey);
    setFiles([]);
    setSourceLink("");
    setBatchName("");
    setEventDate("");
    setMinistry("");
    setSource("");
    setLocation("");
    setCollection("");
    setLanguage("");
    setNotes("");
    setTags("");
    setUsage(["Website"]);
    setReceipt(null);
    setMessage("Local draft cleared.");
  }

  function goNext() {
    if (step === 0 && missingAddMedia.length) {
      setMessage(missingAddMedia.join(". "));
      return;
    }
    if (step === 1 && missingBatch.length) {
      setMessage(`Complete: ${missingBatch.join(", ")}.`);
      return;
    }
    setMessage("");
    setStep((current) => Math.min(uploadSteps.length - 1, current + 1));
  }

  async function submitBatch() {
    if (!readyToSubmit) {
      setMessage(`Complete: ${[...missingAddMedia, ...missingBatch].join(", ")}.`);
      return;
    }
    setSubmitting(true);
    setMessage("Creating intake batch. Nothing is public.");
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.set("role", role);
    form.set("batchName", batchName);
    form.set("eventName", batchName);
    form.set("eventDate", eventDate);
    form.set("ministry", ministry);
    form.set("source", source);
    form.set("location", location);
    form.set("collection", collection);
    form.set("language", language);
    form.set("intakeNotes", notes);
    form.set("tags", tags);
    form.set("sourceLink", sourceLink);
    form.set("folderName", inventory.folderName || "");
    usage.forEach((item) => form.append("requestedUse", item));
    const response = await fetch("/api/upload", { method: "POST", body: form });
    const body = await response.json().catch(() => ({}));
    setSubmitting(false);
    setReceipt(body);
    if (response.ok) {
      window.localStorage.removeItem(uploadDraftKey);
      setMessage(body.message || "Batch submitted. Your review packet has been created. Nothing is public yet.");
    } else {
      setMessage(body.message || body.error || "We could not create the intake batch. No public asset was created.");
    }
  }

  return (
    <div className="damx-page damx-upload-page">
      <PageHeader
        eyebrow="Contributor intake"
        title="Create intake batch"
        description="Drop photos, folders, or paste a Drive link. The DAM will prepare the review packet automatically."
        primaryAction={<EnterpriseButton tone="primary" icon={<UploadCloud size={16} aria-hidden="true" />} disabled={!readyToSubmit || submitting} disabledReason="Complete media and batch identity before submitting." onClick={submitBatch}>Submit batch for DAM review</EnterpriseButton>}
        secondaryActions={<><EnterpriseButton icon={<Save size={16} aria-hidden="true" />} onClick={saveDraft}>Save draft</EnterpriseButton><EnterpriseButton tone="tertiary" onClick={clearDraft}>Clear</EnterpriseButton></>}
        metadata={<span>Default after submit: Needs Review / Do Not Publish</span>}
      />
      <section className="damx-beta-limit-banner" aria-label="Upload beta limitations">
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          <strong>Batch intake only</strong>
          <span>Submission creates a review packet. It does not approve rights, consent, tags, derivatives, downloads, or ResourceSpace truth.</span>
        </div>
      </section>
      {message ? <p className="damx-notice" role="status">{message}</p> : null}
      <nav className="damx-stepper" aria-label="Upload steps">
        {uploadSteps.map((item, index) => (
          <button className={index === step ? "is-active" : index < step ? "is-complete" : undefined} type="button" key={item} onClick={() => setStep(index)}>
            <span>{index + 1}</span>
            {item}
          </button>
        ))}
      </nav>
      <div className="damx-upload-layout">
        <main className="damx-wizard-panel">
          {step === 0 ? (
            <section className="damx-wizard-step" data-send-step="0">
              <h2>Add media batch</h2>
              <div
                className="damx-dropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  addDroppedFiles(event.dataTransfer.files);
                }}
              >
                <UploadCloud size={28} aria-hidden="true" />
                <strong>Drop photos, folders, or paste a Google Drive folder link.</strong>
                <p>We will detect event info, dates, file types, duplicates, and review tasks.</p>
                <input type="file" multiple aria-label="Browse files" onChange={(event) => handleFiles(event.target.files)} />
              </div>
              <div className="damx-upload-actions-row">
                <label className="damx-folder-picker">
                  <FolderOpen size={16} aria-hidden="true" />
                  <span>Choose folder</span>
                  <input type="file" multiple aria-label="Choose folder" {...folderInputProps} onChange={(event) => handleFiles(event.target.files)} />
                </label>
                <label className="damx-field">
                  <span>Google Drive or source link</span>
                  <input value={sourceLink} onChange={(event) => setSourceLink(event.target.value)} placeholder="https://drive.google.com/..." />
                </label>
              </div>
              {missingAddMedia.length ? <div className="damx-missing-chips">{missingAddMedia.map((item) => <span key={String(item)}>{item}</span>)}</div> : null}
              <section className="damx-scan-summary" aria-label="Batch scan">
                <div>
                  <span>Batch scan</span>
                  <strong>{inventory.fileCount} files detected</strong>
                  <small>{inventory.photoCount} photos | {inventory.heicCount} HEIC | {inventory.videoCount} video | {inventory.audioCount} audio | {formatBytes(inventory.totalBytes)}</small>
                </div>
                <dl>
                  <div><dt>Folder/source</dt><dd>{inventory.folderName || (sourceLink ? "Source link captured" : "Needs media")}</dd></div>
                  <div><dt>Detected date</dt><dd>{mergedDetected.eventDate || "Needs confirmation"}</dd></div>
                  <div><dt>Possible event</dt><dd>{mergedDetected.eventName || "Needs confirmation"}</dd></div>
                  <div><dt>Possible location</dt><dd>{mergedDetected.location || "Optional"}</dd></div>
                  <div><dt>Possible source</dt><dd>{mergedDetected.photographer || "Needs confirmation"}</dd></div>
                  <div><dt>Duplicates</dt><dd>{duplicateHints.length ? `${duplicateHints.length} hint type(s)` : "checking after submit"}</dd></div>
                  <div><dt>Large media</dt><dd>{inventory.largeMediaCount ? `${inventory.largeMediaCount} route to admin intake` : "none"}</dd></div>
                </dl>
                <div className="damx-confidence-row">
                  <span>{confidenceLabel(detected.confidence)}</span>
                  {riskFlags.length ? riskFlags.map((flag) => <span key={flag}>Reviewer task: {flag}</span>) : <span>Reviewer task: standard review</span>}
                </div>
              </section>
              <div className="damx-file-list" aria-label="Selected file preview">
                {files.length ? files.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`}>
                    <FileCheck2 size={16} aria-hidden="true" />
                    <span><strong>{file.name}</strong><small>{file.type || "Unknown type"} | {formatBytes(file.size)} | Staged locally</small></span>
                    <button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>Remove</button>
                  </div>
                )) : <p>No files added yet. A source link can create a review packet without browser file upload.</p>}
              </div>
            </section>
          ) : null}
          {step === 1 ? (
            <section className="damx-wizard-step damx-form-grid" data-send-step="1">
              <h2>Confirm batch details</h2>
              <p className="damx-step-copy">We filled this from folder name and file metadata. Edit only what is wrong.</p>
              <label className="damx-field"><span>Batch / event name *</span><input value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="Youth Service" /></label>
              <label className="damx-field"><span>Date *</span><input value={eventDate} onChange={(event) => setEventDate(event.target.value)} type="date" /></label>
              <label className="damx-field"><span>Ministry / team *</span><input value={ministry} onChange={(event) => setMinistry(event.target.value)} placeholder="Youth / RE" /></label>
              <label className="damx-field"><span>Source / photographer / uploader *</span><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Media team or photographer" /></label>
              <label className="damx-field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Elizabeth NJ" /></label>
              <label className="damx-field"><span>Collection</span><input value={collection} onChange={(event) => setCollection(event.target.value)} placeholder="Youth service" /></label>
              <label className="damx-field"><span>Language</span><input value={language} onChange={(event) => setLanguage(event.target.value)} placeholder="English, Mandarin..." /></label>
              <label className="damx-field"><span>Suggested tags</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Bible, fellowship, youth..." /></label>
              <label className="damx-field is-wide"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything reviewers should know before reuse." /></label>
              <section className="damx-requested-use is-wide" aria-label="Requested use">
                <h3>Requested use</h3>
                <p>Requested use helps reviewers prioritize. It does not approve publishing.</p>
                <div className="damx-checkbox-grid">
                  {requestedUseOptions.map((item) => (
                    <label key={item}>
                      <input type="checkbox" checked={usage.includes(item)} onChange={() => toggleUsage(item)} />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </section>
              {missingBatch.length ? <div className="damx-missing-chips is-wide">{missingBatch.map((item) => <span key={String(item)}>{item}</span>)}</div> : null}
              <section className="damx-auto-explain is-wide">
                <article><strong>Rights assumption</strong><span>TJC-created media / reviewer verifies before public use.</span></article>
                <article><strong>People/youth</strong><span>System will flag likely people or youth. Reviewer confirms before approval.</span></article>
                <article><strong>Consent/release</strong><span>Not required to submit. Required before public/external approval when people/youth appear.</span></article>
              </section>
              <section className="damx-folder-helper is-wide">
                <strong>Best folder name</strong>
                <code>YYYY-MM-DD - Event Name - Church/Location - Photographer</code>
                <span>Example: 2026-06-16 - Youth Service - Elizabeth NJ - John</span>
                <small>Any folder name works. Better names improve auto-fill.</small>
              </section>
            </section>
          ) : null}
          {step === 2 ? (
            <section className="damx-wizard-step" data-send-step="2">
              <h2>Review packet summary</h2>
              <div className="damx-summary-cards">
                <span><strong>{inventory.fileCount}</strong><small>{inventory.photoCount} photos | {inventory.heicCount} HEIC | {inventory.videoCount + inventory.audioCount} video/audio | {duplicateHints.length} duplicate hints</small></span>
                <span><strong>{batchName || "Needs name"}</strong><small>{eventDate || "Needs date"} | {ministry || "Needs ministry"} | {source || "Needs source"}</small></span>
                <span><strong>{reviewerTasks.length}</strong><small>Reviewer tasks created</small></span>
                <span><strong>Needs Review / Do Not Publish</strong><small>Downloads blocked. Originals restricted.</small></span>
              </div>
              <div className="damx-review-task-list"><h3>Reviewer tasks</h3>{reviewerTasks.map((taskItem) => <span key={taskItem}>{taskItem}</span>)}</div>
              <div className="damx-review-task-list"><h3>Admin tasks</h3>{adminTasks.map((taskItem) => <span key={taskItem}>{taskItem}</span>)}</div>
              <section className="damx-submission-state">
                <div><strong>Status after submit</strong><span>Needs Review / Do Not Publish</span></div>
                <div><strong>Download</strong><span>Blocked until reviewer approval</span></div>
                <div><strong>Originals</strong><span>Restricted</span></div>
                <div><strong>ResourceSpace</strong><span>No approval write from upload</span></div>
              </section>
              {receipt ? (
                <section className="damx-submit-receipt" aria-label="Batch submitted">
                  <CheckCircle2 size={22} aria-hidden="true" />
                  <div>
                    <h3>Batch submitted</h3>
                    <p>Your review packet has been created. Nothing is public yet. Reviewers will confirm rights, people/youth, usage scope, and approved copies.</p>
                    <dl>
                      <div><dt>Batch reference</dt><dd>{receipt.batchId || "Not persisted"}</dd></div>
                      <div><dt>Storage</dt><dd>{receipt.storageMode || "source-link-only"}</dd></div>
                      <div><dt>ResourceSpace written</dt><dd>{receipt.resourceSpaceWritten ? "Yes" : "No"}</dd></div>
                    </dl>
                    <div className="damx-receipt-actions">
                      <EnterpriseButton href={routeWithRole("/recent-uploads", role)}>View batch status</EnterpriseButton>
                      <EnterpriseButton onClick={() => { setReceipt(null); setStep(0); }}>Upload another batch</EnterpriseButton>
                      <EnterpriseButton onClick={() => navigator.clipboard?.writeText(receipt.batchId || "")}>Copy batch reference</EnterpriseButton>
                    </div>
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}
        </main>
        <aside className="damx-wizard-aside">
          <h2>What happens next</h2>
          <ol>
            <li>This batch enters Needs Review.</li>
            <li>The DAM prepares previews and metadata.</li>
            <li>Reviewers confirm rights, people/youth, and usage scope.</li>
            <li>Only approved copies become downloadable.</li>
          </ol>
          <section className="damx-custody-card">
            <strong>Source custody</strong>
            <span>Originals stay restricted.</span>
            <span>Approved derivatives are generated later.</span>
            <span>Submission creates a review packet only.</span>
          </section>
        </aside>
      </div>
      <div className="damx-sticky-actions">
        <EnterpriseButton disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</EnterpriseButton>
        <EnterpriseButton onClick={saveDraft}>Save draft</EnterpriseButton>
        {step < uploadSteps.length - 1 ? (
          <EnterpriseButton tone="primary" onClick={goNext}>Next</EnterpriseButton>
        ) : (
          <EnterpriseButton tone="primary" disabled={!readyToSubmit || submitting} disabledReason="Complete media and batch identity before submitting." onClick={submitBatch}>Submit batch for DAM review</EnterpriseButton>
        )}
      </div>
    </div>
  );
}

export function EnterpriseReviewPage() {
  const { role } = useDemoRole();
  const [filter, setFilter] = useState("All");
  const reviewStatuses: CanonicalStatus[] = ["Submitted", "Needs Evidence", "In Review", "Restricted", "Blocked", "Expiring Soon", "Expired"];
  const reviewAssets = damAssets.filter((asset) => reviewStatuses.includes(asset.displayStatus) || asset.blockers.length > 0);
  const visibleQueue = reviewAssets.filter((asset) => {
    if (filter === "All") return true;
    if (filter === "Assigned to me") return asset.displayStatus === "In Review";
    if (filter === "Needs evidence") return asset.displayStatus === "Needs Evidence";
    if (filter === "People/minors") return asset.peopleVisible === "yes" || asset.peopleVisible === "unknown" || asset.minorsVisible === "yes" || asset.minorsVisible === "unknown";
    if (filter === "Expiring") return asset.displayStatus === "Expiring Soon" || asset.displayStatus === "Expired";
    if (filter === "Blocked") return asset.displayStatus === "Blocked" || asset.displayStatus === "Restricted";
    return true;
  });
  const [selectedId, setSelectedId] = useState(visibleQueue[0]?.id || reviewAssets[0]?.id || "");
  const selected = visibleQueue.find((asset) => asset.id === selectedId) || visibleQueue[0] || reviewAssets[0];
  const reviewActionState = enterpriseReviewActionState(selected);
  const approvalDisabledReason = reviewActionState.approveDerivativeDisabledReason;
  const [decisionMessage, setDecisionMessage] = useState("");

  if (!roleCanReview(role)) {
    return (
      <div className="damx-page">
        <EmptyState title="Review Queue requires reviewer access" body="Reviewer and DAM Admin roles can inspect evidence, request changes, restrict use, approve derivatives, and audit decisions." actions={<EnterpriseButton href={routeWithRole("/library", role)}>Open Library</EnterpriseButton>} />
      </div>
    );
  }

  return (
    <div className="damx-page damx-review-page">
      {decisionMessage ? <p className="damx-notice">{decisionMessage}</p> : null}
      <div className="damx-review-layout">
        <aside className="damx-review-worklist">
          <header>
            <div>
              <h1>Review Queue</h1>
              <p>{visibleQueue.length} active records</p>
            </div>
            <StatusBadge status="In Review" compact />
          </header>
          <label className="damx-search is-compact"><Search size={15} aria-hidden="true" /><input placeholder="Search queue..." /></label>
          <div className="damx-filter-pills">
            {["All", "Assigned to me", "Unassigned", "Needs evidence", "People/minors", "Expiring", "Blocked", "High priority"].map((item) => (
              <button className={filter === item ? "is-active" : undefined} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
          <div className="damx-queue-list">
            {visibleQueue.map((asset) => (
              <button className={selected?.id === asset.id ? "is-active" : undefined} type="button" key={asset.id} onClick={() => setSelectedId(asset.id)}>
                <AssetThumbnail asset={asset} />
                <span>
                  <strong>{asset.title}</strong>
                  <small>{asset.id} | SLA {asset.displayStatus === "Blocked" ? "Overdue" : "2d"}</small>
                  <em>{asset.blockers.length} missing evidence</em>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <main className="damx-review-workspace">
          <div className="damx-breadcrumb">Review Queue / {selected?.id}</div>
          <header className="damx-review-header">
            <div>
              <h1>{selected?.title}</h1>
              <p>{selected?.id} | {selected?.type} | {selected ? assetCollectionNames(selected) : "Unassigned"}</p>
            </div>
            {selected ? <StatusBadge status={selected.displayStatus} /> : null}
          </header>
          <div className="damx-review-actionbar">
            <EnterpriseButton icon={<Save size={15} aria-hidden="true" />} onClick={() => setDecisionMessage("Reviewer progress saved.")}>Save progress</EnterpriseButton>
            <EnterpriseButton tone={reviewActionState.requestEvidencePrimary ? "primary" : "secondary"} icon={<FileText size={15} aria-hidden="true" />} onClick={() => setDecisionMessage("Evidence request drafted.")}>Request evidence</EnterpriseButton>
            <EnterpriseButton icon={<CheckCircle2 size={15} aria-hidden="true" />} disabled={reviewActionState.approveDerivativeDisabled} disabledReason={approvalDisabledReason} onClick={() => setDecisionMessage("Derivative approved and queued for audit write.")}>Approve derivative</EnterpriseButton>
            <EnterpriseButton icon={<Lock size={15} aria-hidden="true" />} onClick={() => setDecisionMessage("Use restricted for selected asset.")}>Restrict use</EnterpriseButton>
            <EnterpriseButton tone="danger" icon={<ShieldAlert size={15} aria-hidden="true" />} onClick={() => setDecisionMessage("Reject decision requires confirmation before audit write.")}>Reject</EnterpriseButton>
          </div>
          {selected ? (
            <>
              <AssetThumbnail asset={selected} className="is-review-preview" />
              <section className="damx-review-tabs">
                {["Details", "Rights", "Comments", "Activity", "Files"].map((tab) => <button type="button" key={tab}>{tab}</button>)}
              </section>
              <div className="damx-review-summary-grid">
                <section>
                  <h2>Metadata summary</h2>
                  <dl className="damx-metadata-list">
                    <div><dt>Owner</dt><dd>{selected.owner}</dd></div>
                    <div><dt>Usage scope</dt><dd>{selected.usageScopes.join(", ")}</dd></div>
                    <div><dt>People/minors</dt><dd>{peopleMinorsLabel(selected)}</dd></div>
                  </dl>
                </section>
                <section>
                  <h2>Rights summary</h2>
                  <div className="damx-badge-row">{rightsBadgesForAsset(selected).map((badge) => <RightsBadge key={badge} label={badge} />)}</div>
                </section>
              </div>
              <section>
                <h2>Evidence checklist</h2>
                <EvidenceChecklist items={selected.evidence} />
              </section>
              <section>
                <h2>Audit history</h2>
                <AuditTimeline events={selected.auditEvents} />
              </section>
            </>
          ) : null}
        </main>
        <aside className="damx-decision-panel">
          <h2>Decision panel</h2>
          {selected ? (
            <>
              <div className="damx-readiness-score"><strong>{Math.round((selected.evidence.filter((item) => item.state === "Complete").length / selected.evidence.length) * 100)}%</strong><span>review progress</span></div>
              <section>
                <h3>Current policy result</h3>
                <StatusBadge status={selected.displayStatus} />
                <p>{selected.blockers[0] || "No active blocker in current role-safe view."}</p>
              </section>
              <section>
                <h3>Missing evidence</h3>
                {selected.blockers.length ? <ul>{selected.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p>Checklist complete.</p>}
              </section>
              <section>
                <h3>Recommended next action</h3>
                <p>{reviewActionState.recommendedNextAction}</p>
              </section>
              <div className="damx-decision-buttons">
                {reviewActionState.requestEvidencePrimary ? <EnterpriseButton tone="primary" onClick={() => setDecisionMessage("Evidence request recorded.")}>Request evidence</EnterpriseButton> : null}
                <EnterpriseButton tone={reviewActionState.approveDerivativeDisabled ? "secondary" : "primary"} disabled={reviewActionState.approveDerivativeDisabled} disabledReason={approvalDisabledReason} onClick={() => setDecisionMessage("Approved derivative decision recorded.")}>Approve derivative</EnterpriseButton>
                <EnterpriseButton disabled={reviewActionState.approveDerivativeDisabled} disabledReason={approvalDisabledReason} onClick={() => setDecisionMessage("Approved internal-only decision recorded.")}>Approve internal only</EnterpriseButton>
                {!reviewActionState.requestEvidencePrimary ? <EnterpriseButton onClick={() => setDecisionMessage("Evidence request recorded.")}>Request evidence</EnterpriseButton> : null}
                <EnterpriseButton onClick={() => setDecisionMessage("Restriction recorded.")}>Restrict use</EnterpriseButton>
                <EnterpriseButton tone="danger" onClick={() => setDecisionMessage("Reject requires confirmation. No destructive change made.")}>Reject</EnterpriseButton>
              </div>
            </>
          ) : <EmptyState title="Select review item" body="Choose a queue item to inspect rights evidence and make a decision." />}
        </aside>
      </div>
    </div>
  );
}

export function EnterpriseCollectionsPage() {
  const { role } = useDemoRole();
  const [selectedId, setSelectedId] = useState(damCollections[0]?.id || "");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const collections = damCollections.filter((collection) => {
    const haystack = [collection.name, collection.ministry, collection.useCase, collection.owner, collection.description].join(" ").toLowerCase();
    return query.trim().toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
  });
  const selected = collections.find((collection) => collection.id === selectedId) || collections[0];
  const selectedAssets = selected ? collectionAssets(selected) : [];
  const selectedReadiness = readinessForAssets(selectedAssets);
  const totalAssets = damCollections.reduce((sum, collection) => sum + collection.assetIds.length, 0);
  const columns: Column<DamCollection>[] = [
    { key: "name", header: "Collection name", sortValue: (row) => row.name, render: (row) => <span className="damx-title-cell"><strong>{row.name}</strong><small>{row.description}</small></span> },
    { key: "ministry", header: "Ministry", sortValue: (row) => row.ministry, render: (row) => row.ministry },
    { key: "use", header: "Use case", render: (row) => row.useCase },
    { key: "count", header: "Asset count", sortValue: (row) => row.assetIds.length, render: (row) => row.assetIds.length },
    { key: "ready", header: "Portal Ready assets", render: (row) => readinessForAssets(collectionAssets(row)).ready },
    { key: "needs", header: "Needs Evidence", render: (row) => readinessForAssets(collectionAssets(row)).needsEvidence },
    { key: "owner", header: "Owner", render: (row) => row.owner },
    { key: "updated", header: "Last updated", sortValue: (row) => row.lastUpdated, render: (row) => formatDate(row.lastUpdated) },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={collectionDisplayStatus(row)} compact /> },
    { key: "actions", header: "Actions", render: (row) => <div className="damx-row-actions"><button type="button">Open collection</button><button type="button">Create distribution set</button></div> }
  ];

  return (
    <div className="damx-page damx-collections-page">
      <PageHeader
        title="Collections"
        description="Organize ministry assets into curated sets. Asset-level approval still controls reuse and download."
        metadata={<><span>{collections.length} collections</span><span>{totalAssets} asset references</span></>}
        primaryAction={<EnterpriseButton tone="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setNotice("Create collection opened. This does not approve assets.")}>Create collection</EnterpriseButton>}
        secondaryActions={<EnterpriseButton icon={<PackageCheck size={16} aria-hidden="true" />} href={routeWithRole("/distribution-sets", role)}>Create distribution set</EnterpriseButton>}
      />
      {notice ? <p className="damx-notice">{notice}</p> : null}
      <label className="damx-search"><Search size={16} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search collections by name, ministry, event, use case..." /></label>
      <DamxPreviewStrip
        assets={selectedAssets.length ? selectedAssets : portalReadyAssets()}
        title="Collection preview samples"
        detail={selected ? `${selected.name} records shown with local ResourceSpace thumbnail routes.` : "Preview-backed local records appear before package planning."}
      />
      <div className="damx-library-layout">
        <main className="damx-library-main">
          <DataTable label="Collections table" rows={collections} columns={columns} selectedId={selected?.id} onSelect={(row) => setSelectedId(row.id)} emptyState={<EmptyState title="No collections match this search" body="Try a ministry, owner, status, use case, or readiness term." />} pageSize={8} />
          <div className="damx-mobile-card-list">
            {collections.map((collection) => {
              const ready = readinessForAssets(collectionAssets(collection));
              return (
                <button className={selected?.id === collection.id ? "is-active" : undefined} type="button" key={collection.id} onClick={() => setSelectedId(collection.id)}>
                  <span><strong>{collection.name}</strong><small>{collection.ministry} | {collection.assetIds.length} assets</small><span><StatusBadge status={collectionDisplayStatus(collection)} compact /> {ready.ready} ready | {ready.needsEvidence} needs evidence</span></span>
                </button>
              );
            })}
          </div>
        </main>
        <aside className="damx-inspector">
          {selected ? (
            <>
              <div className="damx-inspector-title"><div><h2>{selected.name}</h2><span>{selected.useCase}</span></div><StatusBadge status={collectionDisplayStatus(selected)} /></div>
              <p>{selected.description}</p>
              <ReadinessPanel score={selectedReadiness.score} ready={selectedReadiness.ready} total={selectedReadiness.total} blockers={selectedAssets.flatMap((asset) => asset.blockers).slice(0, 6)} title="Asset readiness" />
              <div className="damx-inspector-actions">
                <EnterpriseButton tone="primary" icon={<FolderOpen size={15} aria-hidden="true" />} href={routeWithRole(`/library?collection=${selected.id}`, role)}>Open collection</EnterpriseButton>
                <EnterpriseButton icon={<PackageCheck size={15} aria-hidden="true" />} href={routeWithRole(`/distribution-sets?collection=${selected.id}`, role)}>Create distribution set</EnterpriseButton>
              </div>
              <section><h3>Blocked or missing assets</h3>{selectedAssets.filter((asset) => asset.blockers.length).map((asset) => <p className="damx-blocker-line" key={asset.id}>{asset.title}: {asset.blockers[0]}</p>)}</section>
              <p>Collection approval does not override asset approval.</p>
            </>
          ) : <EmptyState title="Select a collection" body="Choose a collection to inspect readiness and reuse rules." />}
        </aside>
      </div>
      <div className="damx-sticky-actions">
        <EnterpriseButton tone="primary" href={routeWithRole(`/library?collection=${selected?.id || ""}`, role)}>Open collection</EnterpriseButton>
        <EnterpriseButton href={routeWithRole(`/distribution-sets?collection=${selected?.id || ""}`, role)}>Create distribution set</EnterpriseButton>
      </div>
    </div>
  );
}

export function EnterprisePackageBuilderPage() {
  const [sections, setSections] = useState<DistributionSection[]>(initialDistributionSections);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || "cover");
  const [message, setMessage] = useState("");
  const activeSection = sections.find((section) => section.id === activeSectionId) || sections[0];
  const readiness = distributionReadiness(sections);
  const activeAssets = activeSection.assetIds.map(assetById).filter((asset): asset is DamAsset => Boolean(asset));
  const available = portalReadyAssets().filter((asset) => !activeSection.assetIds.includes(asset.id));

  function addApprovedAsset() {
    const nextAsset = available[0];
    if (!nextAsset) {
      setMessage("No additional Portal Ready asset is available for this section.");
      return;
    }
    setSections((current) => current.map((section) => section.id === activeSection.id ? { ...section, assetIds: [...section.assetIds, nextAsset.id] } : section));
    setMessage(`${nextAsset.title} added as an approved reference. Source files remain restricted.`);
  }

  function removeAsset(assetId: string) {
    setSections((current) => current.map((section) => section.id === activeSection.id ? { ...section, assetIds: section.assetIds.filter((id) => id !== assetId) } : section));
  }

  const refColumns: Column<DamAsset>[] = [
    { key: "thumb", header: "Thumbnail", render: (asset) => <AssetThumbnail asset={asset} /> },
    { key: "title", header: "Asset title", render: (asset) => <span className="damx-title-cell"><strong>{asset.title}</strong><small>{asset.id}</small></span>, sortValue: (asset) => asset.title },
    { key: "required", header: "Required", render: () => "Yes" },
    { key: "derivative", header: "Approved derivative", render: (asset) => asset.approvedDerivativeLabel || "Not generated" },
    { key: "rights", header: "Rights status", render: (asset) => <RightsBadge label={asset.rightsSummary} /> },
    { key: "source", header: "Source restricted", render: (asset) => asset.sourceAccessState === "restricted" ? "Yes" : "No" },
    { key: "blockers", header: "Blockers", render: (asset) => asset.blockers[0] || "None" },
    { key: "section", header: "Section", render: () => activeSection.name },
    { key: "actions", header: "Actions", render: (asset) => <button type="button" onClick={(event) => { event.stopPropagation(); removeAsset(asset.id); }}>Remove</button> }
  ];

  return (
    <div className="damx-page damx-distribution-page">
      <PageHeader
        title="Distribution Set Draft"
        description="Build a governed package from approved asset references. Source files remain restricted."
        statusBadge={<StatusBadge status={readiness.canGenerate ? "Portal Ready" : readiness.score ? "In Review" : "Draft"} />}
        metadata={<><span>Destination: Website / Newsletter</span><span>Owner: Internet Ministry</span><span>Last saved: Local draft</span></>}
        primaryAction={<EnterpriseButton tone="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={addApprovedAsset}>Add approved assets</EnterpriseButton>}
        secondaryActions={<><EnterpriseButton icon={<ShieldCheck size={16} aria-hidden="true" />} onClick={() => setMessage(`Readiness check: ${readiness.score}% ready, ${readiness.blockers.length} blockers.`)}>Run readiness check</EnterpriseButton><EnterpriseButton icon={<Save size={16} aria-hidden="true" />} onClick={() => setMessage("Draft saved. Only approved asset references were stored.")}>Save draft</EnterpriseButton></>}
      />
      <section className="damx-summary-strip">
        <span><strong>{readiness.readySections}/{readiness.totalSections}</strong><small>Sections ready</small></span>
        <span><strong>{readiness.score}%</strong><small>Readiness</small></span>
        <span><strong>{readiness.blockers.length}</strong><small>Blockers</small></span>
        <span><strong>0</strong><small>Source files copied</small></span>
      </section>
      {message ? <p className="damx-notice">{message}</p> : null}
      <DamxPreviewStrip
        assets={activeAssets.length ? activeAssets : available}
        title="Distribution preview candidates"
        detail={`${activeSection.name} uses approved derivative references only. Source files stay restricted.`}
      />
      <div className="damx-builder-layout">
        <aside className="damx-section-rail">
          <h2>Sections</h2>
          {sections.map((section) => {
            const sectionAssets = section.assetIds.map(assetById).filter((asset): asset is DamAsset => Boolean(asset));
            const ready = sectionAssets.filter((asset) => asset.displayStatus === "Portal Ready").length;
            const blockers = sectionAssets.flatMap((asset) => asset.blockers).length + (section.assetIds.length < section.required ? 1 : 0);
            return (
              <button className={activeSectionId === section.id ? "is-active" : undefined} type="button" key={section.id} onClick={() => setActiveSectionId(section.id)}>
                <strong>{section.name}</strong>
                <span>{section.required} required | {section.assetIds.length} selected</span>
                <em>{blockers ? `${blockers} blockers` : `${ready} ready`}</em>
              </button>
            );
          })}
        </aside>
        <main className="damx-builder-main">
          <header className="damx-section-header"><div><h2>{activeSection.name}</h2><p>Only assets with approved derivatives can be included.</p></div><EnterpriseButton tone="primary" icon={<Plus size={15} aria-hidden="true" />} onClick={addApprovedAsset}>Add approved assets</EnterpriseButton></header>
          {activeAssets.length ? (
            <DataTable label={`${activeSection.name} asset references`} rows={activeAssets} columns={refColumns} pageSize={6} />
          ) : (
            <EmptyState
              title="Add approved assets to this section"
              body="Only assets with approved derivatives can be included. Source files remain restricted and are never copied into this package."
              actions={<EnterpriseButton tone="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={addApprovedAsset}>Add approved assets</EnterpriseButton>}
            />
          )}
        </main>
        <ReadinessPanel
          title="Readiness inspector"
          description="Distribution readiness, missing references, blocked items, policy warnings, and export availability."
          score={readiness.score}
          ready={readiness.readySections}
          total={readiness.totalSections}
          blockers={readiness.blockers}
        />
      </div>
      <div className="damx-sticky-actions">
        <EnterpriseButton tone="primary" disabled={!readiness.canGenerate} disabledReason={readiness.blockers[0] || "All required sections need approved references."} onClick={() => setMessage("Package generated from approved derivatives only.")}>Generate package</EnterpriseButton>
        <EnterpriseButton disabled={!readiness.canGenerate} disabledReason="Manifest unlocks when package is ready." onClick={() => setMessage("Export manifest generated.")}>Export manifest</EnterpriseButton>
      </div>
    </div>
  );
}

function GovernanceModule({
  active,
  onSelect
}: {
  active: string;
  onSelect: (module: string) => void;
}) {
  const modules = [
    ["dashboard", "Governance Dashboard"],
    ["rights", "Rights & Consent"],
    ["metadata", "Metadata Health"],
    ["policy", "Policy Center"],
    ["audit", "Audit Log"],
    ["integrations", "Integrations"]
  ];
  return (
    <nav className="damx-module-nav" aria-label="Governance modules">
      {modules.map(([id, label]) => <button className={active === id ? "is-active" : undefined} type="button" key={id} onClick={() => onSelect(id)}>{label}</button>)}
    </nav>
  );
}

function GovernanceTable({ title, rows }: { title: string; rows: GovernanceRecord[] }) {
  const columns: Column<GovernanceRecord>[] = [
    { key: "name", header: "Name", sortValue: (row) => row.name, render: (row) => <span className="damx-title-cell"><strong>{row.name}</strong><small>{row.detail}</small></span> },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} compact /> },
    { key: "owner", header: "Owner", render: (row) => row.owner },
    { key: "updated", header: "Last updated", sortValue: (row) => row.updated, render: (row) => formatDate(row.updated) },
    { key: "action", header: "Action", render: () => <button type="button">View details</button> }
  ];
  return (
    <section className="damx-governance-section">
      <h2>{title}</h2>
      <DataTable label={title} rows={rows} columns={columns} pageSize={8} />
    </section>
  );
}

export function EnterpriseAdminPage({ initialModule = "dashboard", adminOnly = false }: { initialModule?: string; adminOnly?: boolean }) {
  const { role } = useDemoRole();
  const [active, setActive] = useState(initialModule);
  const rightsRows = governanceRecords.rights;
  const metadataRows = governanceRecords.metadata;
  const policyRows = governanceRecords.policy;
  const integrationRows = governanceRecords.integrations;
  const usersRows: GovernanceRecord[] = [
    { id: "u1", name: "Viewer access", status: "Portal Ready", owner: "DAM Admin", updated: "2026-06-15", detail: "Can search approved derivatives and submit formal requests." },
    { id: "u2", name: "Contributor access", status: "Portal Ready", owner: "DAM Admin", updated: "2026-06-15", detail: "Can create upload/intake drafts and respond to evidence requests." },
    { id: "u3", name: "Reviewer access", status: "In Review", owner: "DAM Admin", updated: "2026-06-14", detail: "Can evaluate evidence and queue review decisions." },
    { id: "u4", name: "DAM Admin access", status: "Needs Evidence", owner: "DAM Admin", updated: "2026-06-14", detail: "Hosted SSO group proof remains launch-blocking." }
  ];
  const taxonomyRows: GovernanceRecord[] = [
    { id: "t1", name: "Ministry vocabulary", status: "In Review", owner: "Metadata steward", updated: "2026-06-15", detail: "Canonical ministry labels align with ResourceSpace exports." },
    { id: "t2", name: "Youth/minors terms", status: "Needs Evidence", owner: "Rights reviewer", updated: "2026-06-14", detail: "Youth, children, minors, consent, and release labels require review." },
    { id: "t3", name: "Usage scope taxonomy", status: "Portal Ready", owner: "Policy reviewer", updated: "2026-06-13", detail: "Website, social, newsletter, slides, internal, and archive scopes are separated." },
    { id: "t4", name: "Duplicate tags", status: "Submitted", owner: "Metadata steward", updated: "2026-06-12", detail: "Near-duplicate labels wait on canonical mapping." }
  ];
  const settingsRows: GovernanceRecord[] = [
    { id: "s1", name: "Download safety", status: "Portal Ready", owner: "Policy engine", updated: "2026-06-15", detail: "Viewer downloads require approved derivative and safe role." },
    { id: "s2", name: "Source access workflow", status: "Portal Ready", owner: "DAM Admin", updated: "2026-06-15", detail: "Original/source access stays formal request-based." },
    { id: "s3", name: "Writeback mode", status: "Blocked", owner: "DAM Admin", updated: "2026-06-14", detail: "ResourceSpace write adapter remains disabled until proven." },
    { id: "s4", name: "Beta feedback tools", status: "In Review", owner: "Platform", updated: "2026-06-13", detail: "Runtime persistence remains local-only unless hosted store is configured." }
  ];
  const auditRows: GovernanceRecord[] = damAssets.flatMap((asset) => asset.auditEvents.map((event, index) => ({
    id: `${asset.id}-${index}`,
    name: `${event.action}: ${asset.title}`,
    status: asset.displayStatus,
    owner: event.actor,
    updated: event.timestamp.slice(0, 10),
    detail: event.notes || event.result || "Audit event recorded."
  })));
  const pageTitle = active === "dashboard" && adminOnly ? "DAM Control Center"
    : active === "dashboard" ? "Governance Dashboard"
    : active === "rights" ? "Rights & Consent"
      : active === "metadata" ? "Metadata Health"
        : active === "policy" ? "Policy Center"
          : active === "audit" ? "Audit Log"
            : active === "integrations" ? "Integrations"
              : active === "users" ? "Users & Roles"
                : active === "taxonomy" ? "Taxonomy"
                  : active === "settings" ? "Settings"
                    : "Governance Dashboard";
  const primarySection = active === "dashboard" && adminOnly ? "admin-control"
    : active === "dashboard" ? "governance-dashboard"
    : active === "rights" ? "governance-rights"
      : active === "metadata" ? "governance-metadata"
        : active === "policy" ? "governance-policy"
          : active === "audit" ? "governance-audit"
            : active === "integrations" ? "governance-integrations"
              : active === "users" ? "admin-users"
                : active === "taxonomy" ? "admin-taxonomy"
                  : active === "settings" ? "admin-settings"
                    : "governance-dashboard";

  const reviewerModules = new Set(["dashboard", "rights", "metadata", "policy"]);
  const adminModules = new Set(["audit", "integrations", "users", "taxonomy", "settings"]);
  const canAccessActiveModule = adminModules.has(active)
    ? role === "DAM Admin"
    : reviewerModules.has(active)
      ? roleCanReview(role)
      : role === "DAM Admin";

  if (adminOnly && role !== "DAM Admin") {
    return (
      <div className="damx-page">
        <EmptyState title="Admin route requires DAM Admin access" body="Users, roles, taxonomy, integrations, and settings are protected from non-admin direct URLs." actions={<EnterpriseButton href={routeWithRole("/library", role)}>Open Library</EnterpriseButton>} />
      </div>
    );
  }

  if (!canAccessActiveModule) {
    const requiredRole = adminModules.has(active) ? "DAM Admin" : "Reviewer or DAM Admin";
    return (
      <div className="damx-page">
        <EmptyState title="Governance requires authorized access" body={`This workspace is available to ${requiredRole} roles. Direct URLs do not expose governance controls.`} actions={<EnterpriseButton href={routeWithRole("/library", role)}>Open Library</EnterpriseButton>} />
      </div>
    );
  }

  return (
    <div className="damx-page damx-governance-page" data-primary-section={primarySection}>
      <PageHeader
        title={pageTitle}
        description="Govern rights, metadata, policies, integrations, and audit activity without one long admin dump."
        metadata={<><span>Approval health: {portalReadyAssets().length}/{damAssets.length}</span><span>Blocked assets: {damAssets.filter((asset) => asset.displayStatus === "Blocked").length}</span><span>Missing evidence: {damAssets.filter((asset) => asset.displayStatus === "Needs Evidence").length}</span></>}
      />
      <DamxPreviewStrip
        assets={portalReadyAssets()}
        title={active === "metadata" ? "Insights preview samples" : "Governance preview samples"}
        detail="Preview-backed local assets are visible before operational tables."
      />
      <GovernanceModule active={active} onSelect={setActive} />
      {active === "dashboard" ? (
        <>
          <section className="damx-governance-grid">
            {[
              ["Approval health", `${portalReadyAssets().length}/${damAssets.length}`, "Portal Ready assets with approved derivatives."],
              ["Missing evidence", String(damAssets.filter((asset) => asset.displayStatus === "Needs Evidence").length), "Owner, consent, or derivative proof missing."],
              ["Expiring rights", String(damAssets.filter((asset) => asset.displayStatus === "Expiring Soon").length), "Rights/license recheck nearing deadline."],
              ["Blocked assets", String(damAssets.filter((asset) => asset.displayStatus === "Blocked").length), "Policy prevents reuse or export."],
              ["Reviewer workload", "6", "Active reviewer queue items."],
              ["Integration health", "3 checks", "ResourceSpace, portal store, identity provider."]
            ].map(([label, value, detail]) => (
              <article className="damx-kpi-card" key={label}><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>
            ))}
          </section>
          <GovernanceTable title="Blocking evidence" rows={[...rightsRows, ...policyRows].filter((row) => row.status === "Needs Evidence" || row.status === "Blocked" || row.status === "Restricted")} />
        </>
      ) : null}
      {active === "rights" ? <GovernanceTable title="Rights & Consent Records" rows={rightsRows} /> : null}
      {active === "metadata" ? <GovernanceTable title="Metadata Health Records" rows={metadataRows} /> : null}
      {active === "policy" ? <GovernanceTable title="Policy Rules" rows={policyRows} /> : null}
      {active === "audit" ? <GovernanceTable title="Immutable Audit Log" rows={auditRows} /> : null}
      {active === "integrations" ? <GovernanceTable title="Integration Health" rows={integrationRows} /> : null}
      {active === "users" ? <GovernanceTable title="Users & Roles" rows={usersRows} /> : null}
      {active === "taxonomy" ? <GovernanceTable title="Taxonomy" rows={taxonomyRows} /> : null}
      {active === "settings" ? <GovernanceTable title="Settings" rows={settingsRows} /> : null}
    </div>
  );
}

export function EnterpriseInsightsPage() {
  return <EnterpriseAdminPage initialModule="metadata" />;
}

export function EnterpriseHelpPage({ policyCenter = false }: { policyCenter?: boolean }) {
  const { role } = useDemoRole();
  const [query, setQuery] = useState("");
  const articles = [
    "How to find approved photos",
    "How to request reuse",
    "Why source files are restricted",
    "What photo-only beta means",
    "Report a rights issue",
    "Review people/minors evidence",
    "Build a distribution set",
    "Understand source custody model"
  ].filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="damx-page damx-help-page">
      <PageHeader
        title={policyCenter ? "Policy Center" : "Help Center"}
        description="Search DAM guidance, requests, rights policy, and role-safe support actions."
        primaryAction={<EnterpriseButton tone="primary" icon={<ClipboardCheck size={16} aria-hidden="true" />}>Request DAM Review</EnterpriseButton>}
        secondaryActions={<><EnterpriseButton icon={<Lock size={16} aria-hidden="true" />}>Request source access</EnterpriseButton><EnterpriseButton icon={<ShieldAlert size={16} aria-hidden="true" />}>Report rights issue</EnterpriseButton></>}
      />
      <label className="damx-search"><Search size={16} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help articles, policies, requests..." /></label>
      <div className="damx-help-grid">
        <section className="damx-help-main">
          <h2>Quick tasks</h2>
          <div className="damx-task-grid">
            {[
              ["Upload assets for review", "/upload", UploadCloud],
              ["Open review queue", "/review", ShieldCheck],
              ["Create distribution set", "/distribution-sets", PackageCheck],
              ["Open Library", "/library", Library]
            ].map(([label, href, Icon]) => (
              <Link href={routeWithRole(String(href), role)} key={String(label)}>
                <Icon size={18} aria-hidden="true" />
                <strong>{String(label)}</strong>
                <span><ArrowRight size={14} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
          <h2>Help articles</h2>
          <div className="damx-help-list">
            {articles.map((article) => (
              <article key={article}>
                <FileText size={16} aria-hidden="true" />
                <div><strong>{article}</strong><p>Policy-safe DAM guidance for approved photos, reuse requests, source restrictions, beta limits, evidence, approvals, and audit trails.</p></div>
                <ExternalLink size={14} aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>
        <aside className="damx-help-aside">
          <section>
            <h2>My open requests</h2>
            <p>3 active requests: source access, consent review, derivative generation.</p>
          </section>
          <section>
            <h2>Recently viewed help</h2>
            <ul><li>Source files require approved access.</li><li>Submission does not publish assets.</li><li>Collection approval does not override asset approval.</li></ul>
          </section>
          <section>
            <h2>Policy shortcuts</h2>
            <div className="damx-badge-row"><RightsBadge label="Download gates" /><RightsBadge label="Public use rules" /><RightsBadge label="Role permissions" /><RightsBadge label="Consent rules" /></div>
          </section>
        </aside>
      </div>
      <footer className="damx-help-footer">True Jesus Church Media Library support. Operational screens keep their own next action and status guidance.</footer>
    </div>
  );
}
