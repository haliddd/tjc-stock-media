"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Cloud,
  Database,
  Download,
  Folder,
  HardDrive,
  Lock,
  MoreHorizontal,
  Plus,
  Share2,
  ShieldCheck,
  Star,
  type LucideIcon
} from "lucide-react";
import type { DamReadinessResult, MediaSourceStatus, StockMediaAsset } from "@/lib/types";
import { custodyMapRows, custodyMapStatus } from "@/lib/admin-control";
import { inspectorDrawerTabs } from "@/lib/asset-record-workbench";
import { assetDate, assetType, displayTitle, formatBytes, metadataQualityLabel, recordIdLabel, sourceLabel, sourceNoun } from "@/lib/enterprise-display";
import { inspectorMetadataRows } from "@/lib/enterprise-metadata";
import { assetEnterpriseStatus, statusToneClass, type EnterpriseStatus } from "@/lib/enterprise-status";
import { mediaPreviewState, mediaPreviewUnavailableReason } from "@/lib/media-preview-state";
import { cn } from "@/lib/ui";

export function StatusBadge({ status }: { status: EnterpriseStatus }) {
  return <span className={cn("ed-badge", statusToneClass(status))}>{status}</span>;
}

export function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return <button className="ed-icon-button" type="button" aria-label={label} onClick={onClick}>{children}</button>;
}

export function ActionButton({ children, tone = "secondary", icon: Icon, onClick, disabled = false }: { children: ReactNode; tone?: "primary" | "secondary" | "dark"; icon?: LucideIcon; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className={cn("ed-action", tone === "primary" && "is-primary", tone === "dark" && "is-dark")} type="button" onClick={onClick} disabled={disabled}>
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, count, actions }: { title: string; subtitle?: string; count?: string; actions?: ReactNode }) {
  return (
    <header className="ed-page-header">
      <div>
        <h1>{title} {count ? <span>{count}</span> : null}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="ed-page-actions">{actions}</div> : null}
    </header>
  );
}

export function SourcePill({ source, live }: { source?: MediaSourceStatus | null; live?: boolean }) {
  return <span className={cn("ed-source-pill", live && "is-live", source?.adapter === "demo-fallback" && "is-fallback")}>{sourceLabel(source)}</span>;
}

export function LoadingCard({ label = "Loading ResourceSpace data..." }: { label?: string }) {
  return <section className="ed-card ed-empty-state" role="status"><Database size={24} /><h2>{label}</h2><p>Reading through backend API routes. No frontend secrets are used.</p></section>;
}

export function ErrorCard({ message, source }: { message: string; source?: MediaSourceStatus | null }) {
  return <section className="ed-card ed-empty-state"><AlertTriangle size={24} /><h2>{sourceNoun(source)} data unavailable</h2><p>{message}</p><SourcePill source={source} /></section>;
}

export function AssetThumb({ asset, className, fit = "cover" }: { asset?: StockMediaAsset; className?: string; fit?: "cover" | "contain" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [asset?.thumbnail]);
  const state = mediaPreviewState(asset, failed);
  if (!asset || state !== "Preview available") {
    return (
      <div className={cn("ed-doc-thumb", className)}>
        <strong>{asset ? assetType(asset) : "DAM"}</strong>
        <span>{state}</span>
        <small>{mediaPreviewUnavailableReason(state)}</small>
        {asset ? <small>{recordIdLabel()} {asset.resourceSpaceId || asset.id}</small> : null}
      </div>
    );
  }
  return <img className={cn("ed-thumb", fit === "contain" && "is-contain", className)} src={asset.thumbnail} alt={asset.thumbnailAlt || displayTitle(asset)} onError={() => setFailed(true)} />;
}

export function AssetCard({ asset, selected = false, onSelect }: { asset: StockMediaAsset; selected?: boolean; onSelect?: () => void }) {
  return (
    <article className={cn("ed-asset-card", selected && "is-selected")}>
      <button className="ed-card-media" type="button" onClick={onSelect} aria-pressed={selected} aria-label={`Select ${asset.title}`}>
        <AssetThumb asset={asset} />
        <span className="ed-file-chip">{assetType(asset)}</span>
        <span className="ed-check">{selected ? <Check size={13} /> : null}</span>
        <span className="ed-card-tools"><Star size={14} /><Download size={14} /><MoreHorizontal size={14} /></span>
      </button>
      <strong title={displayTitle(asset)}>{displayTitle(asset)}</strong>
      <small>{recordIdLabel()} {asset.resourceSpaceId || asset.id} · {assetDate(asset)} · {formatBytes(asset.fileSizeBytes)}</small>
      <div className="ed-card-footer"><StatusBadge status={assetEnterpriseStatus(asset)} /><span className="ed-quality-chip">{metadataQualityLabel(asset)}</span><Link href={`/assets/${asset.id}`}>Open record</Link></div>
    </article>
  );
}

export function SavedViewPanel({
  savedViews = [],
  collections = [],
  source,
  activeView,
  activeCollection,
  onViewSelect,
  onCollectionSelect,
  onSavedViewsExpand,
  onFacetSelect
}: {
  savedViews?: Array<{ id: string; label: string; count: number }>;
  collections?: Array<{ id: string; name: string; count: number }>;
  source?: MediaSourceStatus | null;
  activeView?: string;
  activeCollection?: string;
  onViewSelect?: (id: string) => void;
  onCollectionSelect?: (id: string) => void;
  onSavedViewsExpand?: () => void;
  onFacetSelect?: (label: string) => void;
}) {
  const firstViews = savedViews.slice(0, 5);
  return (
    <aside className="ed-panel ed-facet-panel">
      <section>
        <div className="ed-panel-title"><h3>Saved views</h3><button type="button" onClick={onSavedViewsExpand} aria-label="Show saved view setup note"><Plus size={14} /></button></div>
        {firstViews.map((view, index) => <button className={cn((activeView ? activeView === view.id : index === 0) && "is-active")} type="button" key={view.id} onClick={() => onViewSelect?.(view.id)}><span>{view.label}</span><em>{view.count.toLocaleString()}</em></button>)}
        {!firstViews.length ? <p>No saved views mapped yet.</p> : <button className="ed-link-button" type="button" onClick={onSavedViewsExpand}>Show all saved views</button>}
      </section>
      <section>
        <div className="ed-panel-title"><h3>{sourceNoun(source)} collections</h3><ChevronDown size={14} /></div>
        {collections.slice(0, 7).map((collection) => <label className="ed-check-row" key={collection.id}><input type="checkbox" checked={activeCollection === collection.id} onChange={() => onCollectionSelect?.(collection.id)} /><span>{collection.name}</span><em>{collection.count.toLocaleString()}</em></label>)}
      </section>
      {[
        ["File type", ["photo", "video", "document", "audio", "graphic"]],
        ["Usage state", ["Approved Public", "Approved Internal", "Needs Review", "Do Not Use"]],
        ["Review risk", ["No people", "People unknown", "Possible minors", "Rights review"]]
      ].map(([group, rows]) => (
        <section key={group as string}>
          <div className="ed-panel-title"><h3>{group as string}</h3><ChevronDown size={14} /></div>
          {(rows as string[]).map((label) => <label className="ed-check-row" key={label}><input type="checkbox" checked={false} onChange={() => onFacetSelect?.(label)} /><span>{label}</span></label>)}
        </section>
      ))}
    </aside>
  );
}

export function RightsVerdictCard({ asset, source }: { asset?: StockMediaAsset; source?: MediaSourceStatus | null }) {
  const approved = asset?.reuseDecision?.downloadable || assetEnterpriseStatus(asset) === "Approved";
  const blocked = asset?.reuseDecision && !asset.reuseDecision.downloadable;
  const noun = sourceNoun(source);
  return (
    <section className={cn("ed-card ed-verdict-card", approved ? "is-approved" : "is-blocked")}>
      <div className="ed-card-head">
        <h3>Can I use this?</h3>
        <StatusBadge status={approved ? "Approved" : blocked ? "Needs Review" : "Not configured"} />
      </div>
      <div className="ed-verdict-body">
        <span>{approved ? <Check size={28} /> : <Lock size={24} />}</span>
        <div>
          <strong>{approved ? `Yes, this ${noun} record is approved.` : "Review required before use."}</strong>
          <p>{asset?.reuseDecision?.summary || asset?.usageGuidance || `Usage rights are not fully provided in ${noun}.`}</p>
        </div>
      </div>
      <Link className="ed-action" href="/guide">View Usage Guidelines</Link>
    </section>
  );
}

export function InspectorDrawer({ asset, source, live }: { asset?: StockMediaAsset; source?: MediaSourceStatus | null; live?: boolean }) {
  const [tab, setTab] = useState(inspectorDrawerTabs[0]);
  const [message, setMessage] = useState("");
  if (!asset) {
    return (
      <aside className="ed-inspector ed-panel ed-inspector-empty">
        <span className="ed-empty-eyebrow">Context rail</span>
        <h2>No asset selected</h2>
        <p>{sourceNoun(source)} search returned no visible assets. Use this rail to keep the next safe action obvious.</p>
        <div className="ed-empty-intel">
          <span><strong>1</strong><small>Reset filters</small></span>
          <span><strong>2</strong><small>Try saved views</small></span>
          <span><strong>3</strong><small>Request review</small></span>
        </div>
        <SourcePill source={source} live={live} />
      </aside>
    );
  }
  const tabRows = inspectorMetadataRows({ asset, tab, source });
  return (
    <aside className="ed-inspector ed-panel">
      <div className="ed-drawer-top"><span>‹</span><strong>{recordIdLabel(source)} {asset.resourceSpaceId || asset.id}</strong><span>›</span><button type="button" onClick={() => setMessage("Inspector stays pinned on desktop. Select another record to change context.")}>×</button></div>
      <AssetThumb asset={asset} className="ed-inspector-preview" fit="contain" />
      <h2 title={displayTitle(asset)}>{displayTitle(asset)}</h2>
      <div className="ed-meta-line"><StatusBadge status={assetEnterpriseStatus(asset)} /><span>{assetDate(asset)}</span><span>{formatBytes(asset.fileSizeBytes)}</span></div>
      <SourcePill source={source} live={live} />
      <RightsVerdictCard asset={asset} source={source} />
      <nav className="ed-tabs" aria-label="Asset inspector tabs">{inspectorDrawerTabs.map((item) => <button className={cn(tab === item && "is-active")} type="button" key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
      <dl className="ed-metadata">
        {tabRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {message ? <p className="ed-inline-success">{message}</p> : null}
      <div className="ed-inspector-actions">
        <ActionButton tone="dark" icon={Download} disabled={!asset.reuseDecision?.downloadable} onClick={() => setMessage("Open the asset record to run the backend download gate before downloading.")}>Download</ActionButton>
        <ActionButton icon={Folder} onClick={() => setMessage("Use Package Builder to add ResourceSpace refs without copying originals.")}>Add to package</ActionButton>
        <ActionButton icon={Share2} onClick={() => setMessage("Share links wait for identity and access policy. No public link was created.")}>Share asset</ActionButton>
      </div>
    </aside>
  );
}

export function MiniLine({ tone = "indigo" }: { tone?: "indigo" | "green" | "orange" | "red" }) {
  const values = [20, 34, 28, 36, 31, 45, 62, 38, 35, 42, 29, 51, 44, 58];
  return <svg className={cn("ed-spark", `is-${tone}`)} viewBox="0 0 140 44" aria-hidden="true"><polyline points={values.map((v, i) => `${i * 10},${44 - v * .55}`).join(" ")} /></svg>;
}

export function KpiCard({ label, value, delta, icon: Icon, danger = false, showTrend = true }: { label: string; value: string; delta: string; icon: LucideIcon; danger?: boolean; showTrend?: boolean }) {
  return (
    <article className="ed-card ed-kpi">
      <div><span>{label}</span><strong>{value}</strong><small className={danger ? "is-down" : ""}>{delta}</small><small>ResourceSpace / portal period</small></div>
      <i><Icon size={18} /></i>
      {showTrend ? <MiniLine tone={danger ? "red" : "indigo"} /> : null}
    </article>
  );
}

export function ChartCard({ title, large = false, sample = false, children }: { title: string; large?: boolean; sample?: boolean; children?: ReactNode }) {
  return (
    <section className={cn("ed-card ed-chart", large && "is-large")}>
      <header><h3>{title}</h3><button type="button">View all</button></header>
      {sample ? <p className="ed-sample-label">Sample until portal usage logging is connected</p> : null}
      {children}
    </section>
  );
}

export function CustodyMapPanel({ readiness }: { readiness?: DamReadinessResult | null }) {
  const iconById = {
    drive: HardDrive,
    resourcespace: Database,
    s3: Cloud,
    portal: ShieldCheck
  };
  const systems = custodyMapRows(readiness);
  return (
    <section className="ed-card ed-custody-map">
      <header className="ed-card-head"><div><h3>DAM custody map</h3><p>Backend truth stays layered: Drive, ResourceSpace, S3, then this UI.</p></div><StatusBadge status={custodyMapStatus(readiness, "metadata-source")} /></header>
      <div className="ed-custody-grid">
        {systems.map(({ id, name, role, detail, status }) => {
          const Icon = iconById[id];
          return <article key={id}>
            <Icon size={20} aria-hidden="true" />
            <strong>{name}</strong>
            <span>{role}</span>
            <p>{detail}</p>
            <StatusBadge status={status} />
          </article>;
        })}
      </div>
    </section>
  );
}
