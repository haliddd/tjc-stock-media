"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { buildMediaInventory } from "@/lib/upload-intake-detection";
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

function collectionUseStatusLabel(status: CanonicalStatus) {
  if (status === "Portal Ready") return "Use guidance";
  if (status === "Approved Internal") return "Internal guidance";
  if (status === "Needs Evidence") return "Needs item review";
  if (status === "Blocked") return "Blocked";
  return status;
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

function CollectionUseStatusBadge({ collection, compact = false }: { collection: DamCollection; compact?: boolean }) {
  const status = collectionDisplayStatus(collection);
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span className={cn("damx-status-badge", meta.className, compact && "is-compact")} title="Collection status is based on item-level review and use guidance.">
      <Icon size={13} aria-hidden="true" />
      {collectionUseStatusLabel(status)}
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
        <section className="damx-library-main">
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
        </section>
        <AssetInspector asset={selected} />
      </div>
    </div>
  );
}

const uploadDraftKey = "tjc-upload-intake-batch-draft-v1";
const contributorUploadsKey = "tjc-upload-intake-my-uploads-v1";

type UploadReceipt = {
  ok?: boolean;
  batchId?: string;
  status?: string;
  message?: string;
  eventName?: string;
  fileCount?: number;
  sourceLinkCaptured?: boolean;
  submissionStatus?: "Submitted";
  reviewStatus?: "Waiting for review";
  publishStatus?: "Do not use yet";
};

type UploadFilePreview = {
  id: string;
  index: number;
  name: string;
  meta: string;
  url?: string;
};

type UploadDraft = {
  sourceLink: string;
  batchName: string;
  eventDate: string;
  ministry: string;
  locationName: string;
  description: string;
  source: string;
  usageNote: string;
  peopleVisible: string;
  minorsVisible: string;
  rightsNote: string;
  reviewerNote: string;
};

type StoredContributorUpload = {
  id: string;
  batchName: string;
  eventName: string;
  eventDate: string;
  locationName: string;
  ministry: string;
  source: string;
  fileCount: number;
  mediaType: "Photos" | "Videos" | "Photos and videos" | "Not sure";
  peopleMinors: string;
  notes: string;
  submittedAt: string;
  date: string;
  status: "Submitted";
  reviewStatus: "Waiting for review";
  publishStatus: "Do not use yet";
  reviewerNote: "Waiting for review.";
  roleFit: DemoRole[];
};

const maxContributorUploadFiles = 80;
const acceptedPhotoExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic"] as const;
const acceptedPhotoTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
const defaultUploadDraft: UploadDraft = {
  sourceLink: "",
  batchName: "",
  eventDate: "",
  ministry: "",
  locationName: "",
  description: "",
  source: "",
  usageNote: "",
  peopleVisible: "Not sure",
  minorsVisible: "Not sure",
  rightsNote: "",
  reviewerNote: ""
};

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024)).toLocaleString()} KB`;
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

function safeUrlHost(value: string) {
  if (!value.trim()) return "";
  if (!safeHttpUrl(value)) return "";
  return new URL(value.trim()).host.replace(/^www\./, "");
}

function isAcceptedContributorPhoto(file: File) {
  const lowerName = file.name.toLowerCase();
  return acceptedPhotoTypes.includes(file.type as typeof acceptedPhotoTypes[number]) || acceptedPhotoExtensions.some((extension) => lowerName.endsWith(extension));
}

function formatUploadReceiptDate(submittedAt: string) {
  return new Date(submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function mediaTypeForReceipt(inventory: ReturnType<typeof buildMediaInventory>, hasSourceLink: boolean): StoredContributorUpload["mediaType"] {
  if (inventory.photoCount > 0 && inventory.videoCount > 0) return "Photos and videos";
  if (inventory.videoCount > 0) return "Videos";
  if (inventory.photoCount > 0 || inventory.fileCount > 0) return "Photos";
  return hasSourceLink ? "Not sure" : "Photos";
}

function appendStoredContributorUpload(upload: StoredContributorUpload) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(contributorUploadsKey) || "[]") as unknown[];
    const rows = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    window.localStorage.setItem(contributorUploadsKey, JSON.stringify([upload, ...rows.filter((row) => (row as { id?: unknown }).id !== upload.id)]));
    return true;
  } catch {
    return false;
  }
}

function uploadDraftFromStorage(value: unknown): UploadDraft {
  const raw = (value || {}) as Partial<UploadDraft>;
  return {
    ...defaultUploadDraft,
    sourceLink: String(raw.sourceLink || ""),
    batchName: String(raw.batchName || ""),
    eventDate: String(raw.eventDate || ""),
    ministry: String(raw.ministry || ""),
    locationName: String(raw.locationName || ""),
    description: String(raw.description || ""),
    source: String(raw.source || ""),
    usageNote: String(raw.usageNote || ""),
    peopleVisible: String(raw.peopleVisible || defaultUploadDraft.peopleVisible),
    minorsVisible: String(raw.minorsVisible || defaultUploadDraft.minorsVisible),
    rightsNote: String(raw.rightsNote || ""),
    reviewerNote: String(raw.reviewerNote || "")
  };
}

function filesFromDrop(dataTransfer: DataTransfer | null) {
  const directFiles = Array.from(dataTransfer?.files || []);
  if (directFiles.length) return directFiles;
  return Array.from(dataTransfer?.items || [])
    .map((item) => item.kind === "file" ? item.getAsFile() : null)
    .filter((file): file is File => Boolean(file));
}

export function EnterpriseUploadPage() {
  const { role } = useDemoRole();
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<UploadFilePreview[]>([]);
  const [sourceLink, setSourceLink] = useState("");
  const [batchName, setBatchName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [ministry, setMinistry] = useState("");
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [usageNote, setUsageNote] = useState("");
  const [peopleVisible, setPeopleVisible] = useState(defaultUploadDraft.peopleVisible);
  const [minorsVisible, setMinorsVisible] = useState(defaultUploadDraft.minorsVisible);
  const [rightsNote, setRightsNote] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [message, setMessage] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState<UploadReceipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const allowed = roleCanContribute(role);
  const inventory = useMemo(() => buildMediaInventory(files), [files]);
  const validSourceLink = safeHttpUrl(sourceLink);
  const hasSourceLink = Boolean(sourceLink.trim());
  const hasMixedMedia = files.length > 0 && hasSourceLink;
  const unsupportedFiles = files.filter((file) => !isAcceptedContributorPhoto(file));
  const tooManyFiles = files.length > maxContributorUploadFiles;
  const hasValidMediaInput = files.length > 0 || Boolean(sourceLink.trim() && validSourceLink);
  const hasFileOrSource = hasValidMediaInput && !hasMixedMedia;
  const draft: UploadDraft = { sourceLink, batchName, eventDate, ministry, locationName, description, source, usageNote, peopleVisible, minorsVisible, rightsNote, reviewerNote };
  const hasStarted = files.length > 0 || Object.values(draft).some((value) => value.trim() && value !== "Not sure");
  const missingAddMedia = [
    !files.length && !sourceLink.trim() && "Add photos or a source link before sending.",
    hasMixedMedia && "Use photos or a source link, not both.",
    sourceLink.trim() && !validSourceLink && "Use a full http or https source link.",
    tooManyFiles && `Use ${maxContributorUploadFiles} or fewer files.`,
    unsupportedFiles.length > 0 && `Unsupported type: ${unsupportedFiles.slice(0, 3).map((file) => file.name).join(", ")}. Use JPG, PNG, WebP, or HEIC.`
  ].filter((item): item is string => Boolean(item));
  const missingDetails = [
    !batchName.trim() && "Event/album",
    !eventDate.trim() && "Date",
    !ministry.trim() && "Ministry/team",
    !locationName.trim() && "Church/location",
    !source.trim() && "Contributor/source",
    !usageNote.trim() && "Usage note"
  ].filter((item): item is string => Boolean(item));
  const readyToSubmit = hasFileOrSource && missingAddMedia.length === 0 && missingDetails.length === 0;
  const sourceLinkHost = safeUrlHost(sourceLink);
  const peopleMinorsLabel = `People: ${peopleVisible}; minors: ${minorsVisible}`;
  const submissionKind = sourceLink.trim() && !files.length ? "Source-link submission" : "Photo files";
  const selectedCountLabel = files.length
    ? `${files.length} photo${files.length === 1 ? "" : "s"} selected`
    : sourceLink.trim()
      ? "1 source link"
      : "Ready for photos";
  const receiptIsLinkOnly = Boolean(receipt?.sourceLinkCaptured && !receipt.fileCount);
  const receiptTitle = receiptIsLinkOnly ? "Link sent for review" : "Photos sent";
  const receiptResetLabel = receiptIsLinkOnly ? "Share another link or photos" : "Share more photos";
  const readyStateLabel = readyToSubmit
    ? "Ready to send"
    : hasFileOrSource
      ? "Missing details"
    : sourceLink.trim() && !validSourceLink
        ? "Check source link"
        : "Add photos or source link";

  useEffect(() => {
    try {
      const saved = uploadDraftFromStorage(JSON.parse(window.localStorage.getItem(uploadDraftKey) || "{}"));
      setSourceLink(saved.sourceLink);
      setBatchName(saved.batchName);
      setEventDate(saved.eventDate);
      setMinistry(saved.ministry);
      setLocationName(saved.locationName);
      setDescription(saved.description);
      setSource(saved.source);
      setUsageNote(saved.usageNote);
      setPeopleVisible(saved.peopleVisible);
      setMinorsVisible(saved.minorsVisible);
      setRightsNote(saved.rightsNote);
      setReviewerNote(saved.reviewerNote);
    } catch {
      // Local draft restore is best-effort only.
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    try {
      window.localStorage.setItem(uploadDraftKey, JSON.stringify(draft));
    } catch {
      // The explicit Save for later action surfaces storage failures.
    }
  }, [batchName, description, draftLoaded, eventDate, locationName, ministry, minorsVisible, peopleVisible, reviewerNote, rightsNote, source, sourceLink, usageNote]);

  useEffect(() => {
    const nextPreviews = files.map((file, index) => ({
      id: `${file.name}-${file.size}-${index}`,
      index,
      name: file.name,
      meta: `${file.type || "Photo"} | ${formatBytes(file.size)}`,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
    }));
    setFilePreviews(nextPreviews);
    return () => {
      nextPreviews.forEach((preview) => {
        if (preview.url) URL.revokeObjectURL(preview.url);
      });
    };
  }, [files]);

  if (!allowed) {
    return (
      <div className="damx-page">
        <EmptyState
          title="Sharing photos requires Contributor access"
          body="Contributors can send photos to the media team for review."
          actions={<EnterpriseButton href={routeWithRole("/library", role)} icon={<Library size={16} aria-hidden="true" />}>Open Library</EnterpriseButton>}
        />
      </div>
    );
  }

  function handleFiles(fileList: FileList | null, mode: "replace" | "add" = "replace") {
    const nextFiles = Array.from(fileList || []);
    const stagedFiles = mode === "add" ? [...files, ...nextFiles] : nextFiles;
    setFiles(stagedFiles);
    setReceipt(null);
    setDraftSaved(false);
    setFormError("");
    if (nextFiles.length) setMessage(`${nextFiles.length} file${nextFiles.length === 1 ? "" : "s"} added.`);
  }

  function addDroppedFiles(dataTransfer: DataTransfer | null) {
    const droppedFiles = filesFromDrop(dataTransfer);
    const nextFiles = [...files, ...droppedFiles];
    setFiles(nextFiles);
    setReceipt(null);
    setDraftSaved(false);
    setFormError("");
    if (droppedFiles.length) setMessage(`${droppedFiles.length} file${droppedFiles.length === 1 ? "" : "s"} added.`);
  }

  function removeFile(indexToRemove: number) {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
    setReceipt(null);
    setDraftSaved(false);
    setFormError("");
  }

  function clearSourceLink() {
    setSourceLink("");
    setReceipt(null);
    setDraftSaved(false);
    setFormError("");
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(uploadDraftKey, JSON.stringify(draft));
      setDraftSaved(true);
      setFormError("");
      setMessage("");
    } catch {
      setDraftSaved(false);
      setFormError("Browser storage blocked. Draft could not be saved.");
    }
  }

  function resetSubmission() {
    setFiles([]);
    setSourceLink("");
    setBatchName("");
    setEventDate("");
    setMinistry("");
    setSource("");
    setLocationName("");
    setDescription("");
    setUsageNote("");
    setPeopleVisible(defaultUploadDraft.peopleVisible);
    setMinorsVisible(defaultUploadDraft.minorsVisible);
    setRightsNote("");
    setReviewerNote("");
    setReceipt(null);
    setMessage("");
    setDraftSaved(false);
    setFormError("");
    try {
      window.localStorage.removeItem(uploadDraftKey);
    } catch {
      // Clearing a browser draft is best-effort.
    }
  }

  function markEdited() {
    setDraftSaved(false);
    setFormError("");
  }

  async function submitBatch() {
    if (!readyToSubmit) {
      setFormError(missingAddMedia[0] || `Add required details before sending: ${missingDetails.join(", ")}.`);
      return;
    }
    setSubmitting(true);
    setMessage("Sending photos to the media team.");
    setFormError("");
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.set("role", role);
    form.set("batchName", batchName);
    form.set("eventName", batchName);
    form.set("eventDate", eventDate);
    form.set("ministry", ministry);
    form.set("source", source);
    form.set("location", locationName);
    form.set("collection", "");
    form.set("language", "");
    form.set("intakeNotes", [description.trim(), `Usage note: ${usageNote.trim()}`, reviewerNote.trim() ? `Reviewer note: ${reviewerNote.trim()}` : ""].filter(Boolean).join("\n"));
    form.set("notes", rightsNote.trim());
    form.set("peopleVisible", peopleVisible);
    form.set("minorsVisible", minorsVisible);
    form.set("usageRights", rightsNote.trim() || "Unknown - reviewer verifies");
    form.set("tags", "");
    form.set("sourceLink", sourceLink);
    form.set("folderName", inventory.folderName || "");
    form.append("requestedUse", "Website");
    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body?.ok !== false && body?.batchId) {
        setReceipt(body);
        const submittedAt = new Date().toISOString();
        const uploadId = String(body.batchId);
        const saved = appendStoredContributorUpload({
          id: uploadId,
          batchName: batchName.trim(),
          eventName: batchName.trim(),
          eventDate,
          locationName: locationName.trim(),
          ministry: ministry.trim(),
          source: source.trim(),
          fileCount: inventory.fileCount,
          mediaType: mediaTypeForReceipt(inventory, Boolean(sourceLink.trim())),
          peopleMinors: peopleMinorsLabel,
          notes: usageNote.trim() || description.trim(),
          submittedAt,
          date: formatUploadReceiptDate(submittedAt),
          status: "Submitted",
          reviewStatus: "Waiting for review",
          publishStatus: "Do not use yet",
          reviewerNote: "Waiting for review.",
          roleFit: ["Contributor", "Reviewer", "DAM Admin"]
        });
        try {
          window.localStorage.removeItem(uploadDraftKey);
        } catch {
          // Receipt already saved or submission accepted; draft cleanup can fail quietly.
        }
        setMessage(saved ? "" : "Submitted for review. My Uploads could not save this receipt.");
      } else {
        setReceipt(null);
        setFormError(body?.error === "This role can browse media but cannot upload."
          ? "Submission failed. This account cannot send photos."
          : body?.message || "Submission failed. Try again or ask the media team for help.");
        setMessage("");
      }
    } catch {
      setReceipt(null);
      setFormError("Submission failed. Try again or ask the media team for help.");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="damx-page damx-upload-page damx-upload-v36">
      {message ? <p className="damx-notice" role="status">{message}</p> : null}
      {draftSaved ? <p className="damx-notice" role="status">Saved for later in this browser.</p> : null}
      <section className="damx-upload-shell" aria-labelledby="share-photos-title">
        {receipt ? (
          <section className="damx-upload-success" aria-label={receiptIsLinkOnly ? "Source link submission sent" : "Photo submission sent"}>
            <CheckCircle2 size={24} aria-hidden="true" />
            <div>
              <h1>{receiptTitle}</h1>
              <p>Submitted for review. Waiting for review. Nothing is public.</p>
              <ol className="damx-upload-status-timeline" aria-label="Submission status">
                <li>Submitted</li>
                <li>Waiting for review</li>
                <li>Do not use yet</li>
              </ol>
              <dl className="damx-upload-success-summary">
                <div><dt>Submission</dt><dd>{batchName}</dd></div>
                <div><dt>Sent</dt><dd>{files.length ? `${files.length} photo${files.length === 1 ? "" : "s"}` : "Source link"}</dd></div>
                <div><dt>Event date</dt><dd>{eventDate}</dd></div>
                <div><dt>Ministry/team</dt><dd>{ministry}</dd></div>
              </dl>
              <div className="damx-upload-actions">
                <EnterpriseButton tone="primary" href={routeWithRole("/recent-uploads", role)}>View My Uploads</EnterpriseButton>
                <EnterpriseButton tone="secondary" onClick={resetSubmission}>{receiptResetLabel}</EnterpriseButton>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="damx-upload-card" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addDroppedFiles(event.dataTransfer); }}>
              <header className="damx-upload-card-header">
                <div>
                  <h1 id="share-photos-title">Upload Photos</h1>
                  <p>Send event photos to the media team for review.</p>
                </div>
                <span className={cn("damx-upload-ready", readyToSubmit && "is-ready")}>{readyStateLabel}</span>
              </header>

              <label className="damx-upload-dropzone">
                <UploadCloud size={34} aria-hidden="true" />
                <strong id="damx-upload-file-label">Upload photos from computer</strong>
                <em>Drag files here or choose files</em>
                <input id="damx-upload-file-input" type="file" multiple accept="image/*,.jpg,.jpeg,.png,.webp,.heic" aria-labelledby="damx-upload-file-label" onChange={(event) => handleFiles(event.target.files)} />
              </label>

              <div className="damx-drive-link">
                <LinkIcon size={17} aria-hidden="true" />
	                <input value={sourceLink} onChange={(event) => { setSourceLink(event.target.value); setReceipt(null); }} placeholder="Paste source link" aria-label="Paste source link" />
                {sourceLink ? <button type="button" onClick={() => setSourceLink("")}>Remove</button> : null}
              </div>

              {(files.length || sourceLink.trim()) ? (
                <section className="damx-upload-preview" aria-label="Selected photos and links">
                  <header>
                    <strong>{selectedCountLabel}</strong>
	                    <span>{files.length || validSourceLink ? "Ready for details" : "Source link needs http or https"}</span>
                    {files.length ? <button type="button" onClick={() => setFiles([])}>Remove all</button> : null}
                  </header>
                  <div className="damx-preview-grid">
                    {filePreviews.map((preview) => (
                      <article className="damx-preview-tile" key={preview.id}>
                        {preview.url ? <img src={preview.url} alt={`Preview of ${preview.name}`} /> : <span><FileCheck2 size={18} aria-hidden="true" /></span>}
                        <div>
                          <strong>{preview.name}</strong>
                          <small>{preview.meta}</small>
                        </div>
                      </article>
                    ))}
                    {files.length > filePreviews.length ? <article className="damx-preview-more">+{files.length - filePreviews.length}</article> : null}
                    {sourceLink.trim() ? (
                      <article className="damx-preview-link">
                        <LinkIcon size={18} aria-hidden="true" />
                        <div>
	                          <strong>Source link</strong>
                          <small>{validSourceLink ? sourceLinkHost : "Needs full http or https link"}</small>
                        </div>
                      </article>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </section>

            {hasStarted ? (
              <section className="damx-upload-details" aria-label="Photo details">
                <div className="damx-upload-form-grid">
                  <label className="damx-field"><span>Event name *</span><input value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="Youth Service" /></label>
                  <label className="damx-field"><span>Date *</span><input value={eventDate} onChange={(event) => setEventDate(event.target.value)} type="date" /></label>
                  <label className="damx-field"><span>Ministry / team *</span><input value={ministry} onChange={(event) => setMinistry(event.target.value)} placeholder="Youth / RE" /></label>
                  <label className="damx-field"><span>Photographer / source *</span><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Media team or photographer" /></label>
                  <label className="damx-field"><span>Location *</span><input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="Church, city, or room" /></label>
                  <label className="damx-field is-wide"><span>Intended use / permission note *</span><textarea value={usageNote} onChange={(event) => setUsageNote(event.target.value)} placeholder="How might these photos be used? Note any permission or consent context." /></label>
                  <label className="damx-field is-wide"><span>People / minors note</span><textarea value={rightsNote} onChange={(event) => setRightsNote(event.target.value)} placeholder="Tell us if children, visitors, sensitive settings, or consent questions may be involved." /></label>
                  <label className="damx-field is-wide"><span>Notes for reviewers</span><textarea value={reviewerNote} onChange={(event) => setReviewerNote(event.target.value)} placeholder="Anything the media team should know." /></label>
                </div>
              </section>
            ) : null}

            <footer className="damx-upload-footer">
              <div>
                <p>Media team reviews every submission before use.</p>
                <details>
                  <summary>How review works</summary>
                  <span>We check rights, people/youth visibility, and usage before sharing photos.</span>
                </details>
              </div>
              <div className="damx-upload-actions">
                <EnterpriseButton tone="tertiary" onClick={saveDraft}>Save for later</EnterpriseButton>
                <EnterpriseButton tone="primary" disabled={!readyToSubmit || submitting} disabledReason="Add photos or a link, plus event details, before sending." onClick={submitBatch}>Send to media team</EnterpriseButton>
              </div>
            </footer>
          </>
        )}
      </section>
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
          <label className="damx-search is-compact"><Search size={15} aria-hidden="true" /><input aria-label="Search review queue" placeholder="Search queue..." /></label>
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
        <section className="damx-review-workspace">
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
        </section>
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
    { key: "ready", header: "Assets with guidance", render: (row) => readinessForAssets(collectionAssets(row)).ready },
    { key: "needs", header: "Needs Evidence", render: (row) => readinessForAssets(collectionAssets(row)).needsEvidence },
    { key: "owner", header: "Owner", render: (row) => row.owner },
    { key: "updated", header: "Last updated", sortValue: (row) => row.lastUpdated, render: (row) => formatDate(row.lastUpdated) },
    { key: "status", header: "Status", render: (row) => <CollectionUseStatusBadge collection={row} compact /> },
    { key: "actions", header: "Actions", render: (row) => <div className="damx-row-actions"><button type="button">Open collection</button></div> }
  ];

  return (
    <div className="damx-page damx-collections-page">
      <PageHeader
        title="Collections"
        description="Organize ministry assets into curated sets. Asset-level approval still controls reuse and download."
        metadata={<><span>{collections.length} collections</span><span>{totalAssets} asset references</span></>}
        primaryAction={<EnterpriseButton tone="primary" icon={<Plus size={16} aria-hidden="true" />} onClick={() => setNotice("Create collection opened. This does not approve assets.")}>Create collection</EnterpriseButton>}
      />
      {notice ? <p className="damx-notice">{notice}</p> : null}
      <label className="damx-search"><Search size={16} aria-hidden="true" /><input aria-label="Search collections" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search collections by name, ministry, event, use case..." /></label>
      <DamxPreviewStrip
        assets={selectedAssets.length ? selectedAssets : portalReadyAssets()}
        title="Collection preview samples"
        detail={selected ? `${selected.name} records shown with local preview routes.` : "Preview-backed local records appear before package planning."}
      />
      <div className="damx-library-layout">
        <section className="damx-library-main">
          <DataTable label="Collections table" rows={collections} columns={columns} selectedId={selected?.id} onSelect={(row) => setSelectedId(row.id)} emptyState={<EmptyState title="No collections match this search" body="Try a ministry, owner, status, use case, or readiness term." />} pageSize={8} />
          <div className="damx-mobile-card-list">
            {collections.map((collection) => {
              const ready = readinessForAssets(collectionAssets(collection));
              return (
                <button className={selected?.id === collection.id ? "is-active" : undefined} type="button" key={collection.id} onClick={() => setSelectedId(collection.id)}>
                  <span><strong>{collection.name}</strong><small>{collection.ministry} | {collection.assetIds.length} assets</small><span><CollectionUseStatusBadge collection={collection} compact /> {ready.ready} with guidance | {ready.needsEvidence} need review</span></span>
                </button>
              );
            })}
          </div>
        </section>
        <aside className="damx-inspector">
          {selected ? (
            <>
              <div className="damx-inspector-title"><div><h2>{selected.name}</h2><span>{selected.useCase}</span></div><CollectionUseStatusBadge collection={selected} /></div>
              <p>{selected.description}</p>
              <ReadinessPanel score={selectedReadiness.score} ready={selectedReadiness.ready} total={selectedReadiness.total} blockers={selectedAssets.flatMap((asset) => asset.blockers).slice(0, 6)} title="Asset readiness" />
              <div className="damx-inspector-actions">
                <EnterpriseButton tone="primary" icon={<FolderOpen size={15} aria-hidden="true" />} href={routeWithRole(`/library?collection=${selected.id}`, role)}>Open collection</EnterpriseButton>
              </div>
              <section><h3>Blocked or missing assets</h3>{selectedAssets.filter((asset) => asset.blockers.length).map((asset) => <p className="damx-blocker-line" key={asset.id}>{asset.title}: {asset.blockers[0]}</p>)}</section>
              <p>Collection approval does not override asset approval.</p>
            </>
          ) : <EmptyState title="Select a collection" body="Choose a collection to inspect readiness and reuse rules." />}
        </aside>
      </div>
      <div className="damx-sticky-actions">
        <EnterpriseButton tone="primary" href={routeWithRole(`/library?collection=${selected?.id || ""}`, role)}>Open collection</EnterpriseButton>
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
        <section className="damx-builder-main">
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
        </section>
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
              ["Approval health", `${portalReadyAssets().length}/${damAssets.length}`, "Assets with approved derivatives and use guidance."],
              ["Missing evidence", String(damAssets.filter((asset) => asset.displayStatus === "Needs Evidence").length), "Owner, consent, or derivative proof missing."],
              ["Expiring rights", String(damAssets.filter((asset) => asset.displayStatus === "Expiring Soon").length), "Rights/license recheck nearing deadline."],
              ["Blocked assets", String(damAssets.filter((asset) => asset.displayStatus === "Blocked").length), "Policy prevents reuse or export."],
              ["Reviewer workload", "6", "Active reviewer queue items."],
              ["Permission Matrix", "4 roles", "Viewer, contributor, reviewer, and admin gates stay role-safe."],
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
    "What current photo support means",
    "Report a rights issue",
    "Review people/minors evidence",
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
      <label className="damx-search"><Search size={16} aria-hidden="true" /><input aria-label="Search help articles and policies" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help articles, policies, requests..." /></label>
      <div className="damx-help-grid">
        <section className="damx-help-main">
          <h2>Quick tasks</h2>
          <div className="damx-task-grid">
            {[
              ["Upload assets for review", "/upload", UploadCloud],
              ["Open review queue", "/review", ShieldCheck],
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
                <div><strong>{article}</strong><p>Policy-safe DAM guidance for approved photos, reuse requests, source restrictions, current limits, evidence, approvals, and audit trails.</p></div>
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
