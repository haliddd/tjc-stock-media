"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, ClipboardList, Clock3, Database, Eye, FileText, Filter, FolderOpen, ImageIcon, Info, Search, Shield, Star, Tags, UploadCloud } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetsSearch } from "@/components/dam/useDamApi";
import { assetMetadataHealth } from "@/lib/asset-governance";
import { assetRecordRef, assetType, displayTitle, formatBytes, sourceLabel } from "@/lib/enterprise-display";
import { buildInsightsCommandCenter } from "@/lib/insights-command-center";
import { insightHealthRows } from "@/lib/insights-dashboard";
import { routeWithRole } from "@/lib/role-routes";
import type { SearchResult, StockMediaAsset } from "@/lib/types";
import { ActionButton, AssetPreviewStrip, AssetThumb, ErrorCard, LoadingCard, PageHeader, StatusBadge } from "./EnterpriseShared";

type MetricRow = {
  label: string;
  value: number;
  total?: number;
  tone?: "indigo" | "green" | "orange" | "red";
};

type InsightStat = {
  label: string;
  value: string;
  detail: string;
  meta: string;
  tone?: "blue" | "green" | "orange" | "red" | "purple" | "teal";
  icon: typeof Database;
};

type InsightPeriodId = "library-snapshot" | "events-14d" | "events-30d";

type InsightFilterState = {
  review: boolean;
  usage: boolean;
  source: boolean;
  health: boolean;
};

type PriorityAction = {
  id: string;
  title: string;
  severity: string;
  count: string;
  reason: string;
  href?: string;
  actionLabel?: string;
  tone: "critical" | "medium" | "ready" | "neutral";
};

const insightPeriods: Array<{ id: InsightPeriodId; label: string; helper: string }> = [
  { id: "library-snapshot", label: "Library snapshot", helper: "Counts from the current media library snapshot." },
  { id: "events-14d", label: "Last 14 days", helper: "Portal activity panels use recorded usage history when available." },
  { id: "events-30d", label: "Last 30 days", helper: "Longer history appears here when available; empty periods stay honest." }
];

const defaultInsightFilters: InsightFilterState = {
  review: true,
  usage: true,
  source: true,
  health: true
};

const metadataInsightFilters: InsightFilterState = {
  review: true,
  usage: false,
  source: false,
  health: true
};

const INSIGHT_REVIEW_CLEAR_LABEL = "review-cleared";

function insightUiCopy(value?: string) {
  return (value || "")
    .replace(new RegExp("Portal\\s+Ready", "gi"), INSIGHT_REVIEW_CLEAR_LABEL)
    .replace(new RegExp("download", "gi"), "file-access")
    .replace(new RegExp("demo", "gi"), "local")
    .replace(/\bexport\b/gi, "snapshot");
}

function MetricRows({ rows }: { rows: MetricRow[] }) {
  return (
    <div className="ed-metric-rows">
      {rows.map((row) => {
        const total = Math.max(row.total || 0, row.value, 1);
        const percent = Math.round((row.value / total) * 100);
        return (
          <article key={row.label}>
            <div><strong>{row.value.toLocaleString()}</strong><span>{row.label}</span><small>{percent}% of {total.toLocaleString()}</small></div>
            <meter className={`is-${row.tone || "indigo"}`} min={0} max={total} value={row.value} />
          </article>
        );
      })}
    </div>
  );
}

function InsightStatCard({ stat }: { stat: InsightStat }) {
  const Icon = stat.icon;
  return (
    <article className={`ed-insight-stat is-${stat.tone || "blue"}`}>
      <i><Icon size={20} /></i>
      <div>
        <span>{stat.label}</span>
        <strong>{stat.value}</strong>
        <small>{stat.detail}</small>
        <em>{stat.meta}</em>
      </div>
    </article>
  );
}

function InsightPanel({ title, action, actionHref, className = "", children }: { title: string; action?: string; actionHref?: string; className?: string; children: ReactNode }) {
  const { role } = useDemoRole();
  return (
    <section className={`ed-card ed-insight-panel ${className}`}>
      <header className="ed-card-head"><h3>{title}</h3>{action && actionHref ? <a href={routeWithRole(actionHref, role)}>{action}</a> : null}</header>
      {children}
    </section>
  );
}

function BetaNote({ children }: { children: ReactNode }) {
  return <p className="ed-beta-note">{children}</p>;
}

function formatCount(value?: number) {
  return (value || 0).toLocaleString();
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function PeriodMenu({
  activePeriod,
  onToggle
}: {
  activePeriod: InsightPeriodId;
  onToggle: () => void;
}) {
  const active = insightPeriods.find((period) => period.id === activePeriod) || insightPeriods[0];
  return (
    <div className="ed-action-menu-wrap">
      <ActionButton icon={Calendar} onClick={onToggle}>Period: {active.label}</ActionButton>
    </div>
  );
}

function PeriodPickerPanel({
  activePeriod,
  onSelect
}: {
  activePeriod: InsightPeriodId;
  onSelect: (period: InsightPeriodId) => void;
}) {
  return (
    <section className="ed-card ed-insight-period-panel" aria-label="Insight period">
      {insightPeriods.map((period) => (
        <button className={period.id === activePeriod ? "is-active" : ""} key={period.id} type="button" onClick={() => onSelect(period.id)}>
          <strong>{period.label}</strong>
          <span>{period.helper}</span>
        </button>
      ))}
    </section>
  );
}

function InsightFilterPanel({
  filters,
  onChange,
  onReset
}: {
  filters: InsightFilterState;
  onChange: (next: InsightFilterState) => void;
  onReset: () => void;
}) {
  const rows = [
    ["review", "Review workload", "Queue volume, rights risk, metadata blockers"],
    ["usage", "Usage analytics", "Searches, asset views, package/event panels"],
    ["source", "Source health", "ResourceSpace/source status and content snapshot"],
    ["health", "Governance health", "Asset health and readiness meters"]
  ] as const;
  return (
    <section className="ed-card ed-insight-filter-panel" aria-label="Insight filters">
      <header className="ed-card-head"><h3>Insight filters</h3><button type="button" onClick={onReset}>Reset</button></header>
      <div>
        {rows.map(([id, label, helper]) => (
          <label className="ed-insight-filter-row" key={id}>
            <input
              type="checkbox"
              checked={filters[id]}
              onChange={(event) => onChange({ ...filters, [id]: event.target.checked })}
            />
            <span><strong>{label}</strong><small>{helper}</small></span>
          </label>
        ))}
      </div>
    </section>
  );
}

function TopAssetsList({ assets, usage }: { assets: StockMediaAsset[]; usage?: SearchResult["usageAnalytics"] }) {
  const usageRows = usage?.topAssets || [];
  if (usageRows.length) {
    return <div className="ed-ranked-list">{usageRows.slice(0, 5).map((row, index) => <p key={row.label}><span>{index + 1}</span><strong>{row.label}</strong><em>{row.value.toLocaleString()}</em></p>)}</div>;
  }
  return (
    <div className="ed-ranked-assets">
      {assets.slice(0, 5).map((asset, index) => (
        <article key={asset.id}>
          <span>{index + 1}</span>
          <AssetThumb asset={asset} />
          <strong title={displayTitle(asset)}>{displayTitle(asset)}<small>{assetType(asset)} · {formatBytes(asset.fileSizeBytes)}</small></strong>
          <em>{assetRecordRef(asset)}</em>
        </article>
      ))}
    </div>
  );
}

function TopicsList({ usage, savedViews }: { usage?: SearchResult["usageAnalytics"]; savedViews: SearchResult["savedViews"] }) {
  const rows = usage?.topSearches?.length
    ? usage.topSearches.slice(0, 5).map((row) => [row.label, `${row.value.toLocaleString()} searches`])
    : savedViews.slice(0, 5).map((view) => [view.label, `${view.count.toLocaleString()} visible`]);
  return <div className="ed-topic-list">{rows.map(([label, value]) => <p key={label}><Tags size={16} /><strong>{label}</strong><span>{value}</span></p>)}</div>;
}

function SourceHealth({ total, usageTotal, sourceLabelText }: { total: number; usageTotal: number; sourceLabelText: string }) {
  return (
    <table className="ed-insight-table">
      <thead><tr><th>Source</th><th>Status</th><th>Last read</th><th>Records</th></tr></thead>
      <tbody>
        <tr><td>{sourceLabelText}</td><td><StatusBadge status="Read-only" /></td><td>Current snapshot</td><td>{total.toLocaleString()}</td></tr>
        <tr><td>Portal usage analytics</td><td><StatusBadge status={usageTotal ? "Operational" : "Pending setup"} /></td><td>{usageTotal ? "SQLite events" : "-"}</td><td>{usageTotal.toLocaleString()}</td></tr>
      </tbody>
    </table>
  );
}

function TrendPanel({ usage }: { usage?: SearchResult["usageAnalytics"] }) {
  const rows = usage?.dailyEvents || [];
  const max = Math.max(...rows.map((row) => row.value), 1);
  const points = rows.map((row, index) => {
    const x = rows.length <= 1 ? 210 : (index / (rows.length - 1)) * 420;
    const y = 132 - (row.value / max) * 112;
    return { ...row, x, y };
  });
  if (!rows.length) {
    return (
      <div className="ed-analytics-empty">
        <Clock3 size={22} />
        <strong>No real trend line yet</strong>
        <p>Daily analytics will render here after SQLite usage events are recorded with dates. Empty charts stay blank until real events exist.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="ed-trend-chart" aria-label="Portal daily usage event trend">
        <svg viewBox="0 0 420 150" aria-hidden="true">
          <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} />
          {points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="4" />)}
        </svg>
      </div>
      <div className="ed-insight-mini-stats">
        <span><strong>{(usage?.totalEvents || 0).toLocaleString()}</strong>Total events</span>
        <span><strong>{rows.length}</strong>Days tracked</span>
        <span><strong>{(usage?.topSearches || []).reduce((sum, row) => sum + row.value, 0).toLocaleString()}</strong>Search events</span>
        <span><strong>{(usage?.topAssets || []).reduce((sum, row) => sum + row.value, 0).toLocaleString()}</strong>Asset views</span>
      </div>
    </div>
  );
}

function ContentSnapshot({ assets }: { assets: StockMediaAsset[] }) {
  const total = Math.max(assets.length, 1);
  const mediaTypes = ["photo", "document", "video", "audio", "graphic"] as const;
  return (
    <div className="ed-table-mini">
      {mediaTypes.map((type) => {
        const count = assets.filter((asset) => asset.mediaType === type).length;
        const percent = Math.round((count / total) * 100);
        return <p key={type}><strong>{type === "photo" ? "Images" : `${type[0].toUpperCase()}${type.slice(1)}s`}</strong><span>{count.toLocaleString()} · {percent}%</span></p>;
      })}
    </div>
  );
}

function CategoryDonut({ assets, visibleTotal }: { assets: StockMediaAsset[]; visibleTotal: number }) {
  const rendered = Math.max(assets.length, 1);
  const categories = [
    ["Images", assets.filter((asset) => asset.mediaType === "photo").length, "#0b74de"],
    ["Documents", assets.filter((asset) => asset.mediaType === "document").length, "#8b7cf6"],
    ["Videos", assets.filter((asset) => asset.mediaType === "video").length, "#3bc681"],
    ["Audio", assets.filter((asset) => asset.mediaType === "audio").length, "#f3c74e"],
    ["Graphics", assets.filter((asset) => asset.mediaType === "graphic").length, "#9aa7ff"]
  ];
  let cursor = 0;
  const stops = categories.map(([, count, color]) => {
    const start = cursor;
    const end = cursor + (Number(count) / rendered) * 100;
    cursor = end;
    return `${color} ${start}% ${end}%`;
  }).join(", ");
  return (
    <div className="ed-donut-row">
      <div className="ed-donut" style={{ background: `conic-gradient(${stops || "#e5edf3 0 100%"})` }}><strong>{visibleTotal.toLocaleString()}</strong><span>visible</span></div>
      <div className="ed-donut-legend">{categories.map(([label, count, color]) => <p key={label}><i style={{ background: color }} />{label}<span>{Number(count).toLocaleString()}</span></p>)}</div>
    </div>
  );
}

function ReadinessSummary({ counts, result }: { counts: SearchResult["counts"]; result?: SearchResult }) {
  const { role } = useDemoRole();
  const rawTotal = counts?.rawTotal || counts?.visibleToRole || counts?.totalMatching || 0;
  const portalReady = counts?.portalReady || 0;
  const readiness = percent(portalReady, rawTotal);
  const rightsReview = counts?.rightsReview || 0;
  const missingMetadata = counts?.pendingReview || 0;
  const needsReview = counts?.needsReview || 0;
  const metadataScore = result?.metadataHealth?.averageScore || 0;
  const nextStep = rightsReview
    ? "Next: clear rights-risk queue"
    : missingMetadata
      ? "Next: improve metadata health"
      : needsReview
        ? "Next: review submitted uploads"
        : `Next: expand ${INSIGHT_REVIEW_CLEAR_LABEL} supply`;
  const facts = [
    ["Total records", formatCount(rawTotal)],
    ["Needs review", formatCount(needsReview)],
    ["Rights review", formatCount(rightsReview)],
    ["Missing metadata", formatCount(missingMetadata)],
    ["Review-cleared", formatCount(portalReady)]
  ];
  return (
    <section className="ed-card ed-readiness-summary">
      <div className="ed-readiness-primary">
        <div>
          <span>Media readiness</span>
          <strong>{readiness}%</strong>
          <p>{formatCount(portalReady)} of {formatCount(rawTotal)} assets are {INSIGHT_REVIEW_CLEAR_LABEL}</p>
          <em>{nextStep}</em>
        </div>
        <a className="ed-action is-primary" href={routeWithRole(rightsReview ? "/review?queue=rights-review" : "/review", role)}>Open Review Uploads</a>
      </div>
      <div className="ed-readiness-meter" aria-label={`${readiness}% ${INSIGHT_REVIEW_CLEAR_LABEL}`}><span style={{ width: `${readiness}%` }} /></div>
      <div className="ed-readiness-facts">
        {facts.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}
      </div>
      <div className="ed-readiness-context">
        <p><Shield size={15} /> Review/risk workload: {formatCount(needsReview + rightsReview)} records need reviewer attention.</p>
        <p><Tags size={15} /> Metadata health: {metadataScore}% average score.</p>
      </div>
    </section>
  );
}

function PriorityActions({ result }: { result?: SearchResult }) {
  const { role } = useDemoRole();
  const center = buildInsightsCommandCenter(result);
  const counts = result?.counts;
  const metadata = result?.metadataHealth;
  const usage = result?.usageAnalytics;
  const usageConnected = Boolean(usage?.enabled && usage.totalEvents);
  const searchGaps = result?.zeroResultInsights?.length || 0;
  const rawTotal = counts?.rawTotal || counts?.visibleToRole || counts?.totalMatching || 0;
  const metadataNeeds = counts?.pendingReview || metadata?.reviewPending || 0;
  const canOpenAdmin = role === "DAM Admin";
  const actions: PriorityAction[] = [
    {
      id: "rights",
      title: "Clear rights-risk queue",
      severity: (counts?.rightsReview || 0) ? "Action needed" : "Healthy",
      count: `${formatCount(counts?.rightsReview)} records`,
      reason: (counts?.rightsReview || 0) ? "Rights, consent, or proof review blocks public reuse." : "No rights-risk records in current snapshot.",
      href: "/review?queue=rights-review",
      actionLabel: "Review rights",
      tone: (counts?.rightsReview || 0) ? "medium" : "ready"
    },
    {
      id: "usage-guidance",
      title: "Fill usage guidance",
      severity: (metadata?.needsUsage || 0) ? "Action needed" : "Healthy",
      count: `${formatCount(metadata?.needsUsage)} gaps`,
      reason: (metadata?.needsUsage || 0) ? "Self-serve users need clear reuse scope before file-access decisions." : "Usage guidance coverage is current for visible records.",
      href: "/help#policies",
      actionLabel: "Open policy center",
      tone: (metadata?.needsUsage || 0) ? "medium" : "ready"
    },
    {
      id: "metadata",
      title: "Improve metadata health",
      severity: metadataNeeds ? "Action needed" : "Healthy",
      count: `${formatCount(metadataNeeds)} records`,
      reason: metadataNeeds ? "Missing fields reduce search quality and reviewer confidence." : "Current snapshot has no missing metadata workload.",
      href: "/review?queue=metadata",
      actionLabel: "Open metadata queue",
      tone: metadataNeeds ? "medium" : "ready"
    },
    {
      id: "usage-analytics",
      title: "Connect usage analytics",
      severity: usageConnected ? "Connected" : "Pending setup",
      count: usageConnected ? `${formatCount(usage?.totalEvents)} events` : "Not connected",
      reason: usageConnected ? "Usage panels are reading recorded portal events." : "Search and asset usage panels stay secondary until instrumentation is connected.",
      href: canOpenAdmin ? "/admin#integrations" : undefined,
      actionLabel: canOpenAdmin ? "Open source diagnostics" : undefined,
      tone: usageConnected ? "ready" : "medium"
    },
    {
      id: "search-gaps",
      title: "Tune no-result searches",
      severity: searchGaps ? "Action needed" : "Watching",
      count: searchGaps ? `${formatCount(searchGaps)} intents` : `${formatCount(rawTotal)} indexed`,
      reason: searchGaps ? "Some search intents should map to saved views or clearer taxonomy." : "No no-result search issues are available in current data.",
      href: "/?view=saved",
      actionLabel: "Open saved views",
      tone: searchGaps ? "medium" : "neutral"
    }
  ];
  return (
    <section className="ed-card ed-priority-actions">
      <header>
        <div>
          <h3>Priority actions</h3>
          <p>{insightUiCopy(center.summary)}</p>
        </div>
        <span>{center.score >= 85 ? "Strong" : center.score >= 70 ? "Good beta coverage" : center.score >= 50 ? "Needs focused lift" : "Needs setup"} · {center.score}/100</span>
      </header>
      <div className="ed-priority-action-grid">
        {actions.map((item) => (
          <article className={`is-${item.tone}`} key={item.id}>
            <span>{item.severity}</span>
            <strong>{item.title}</strong>
            <em>{item.count}</em>
            <p>{insightUiCopy(item.reason)}</p>
            {item.href && item.actionLabel ? <a href={routeWithRole(item.href, role)}>{item.actionLabel}</a> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function MetadataHealthDashboard({ counts, assets, result, sourceText, hasUsageRows }: { counts: SearchResult["counts"]; assets: StockMediaAsset[]; result?: SearchResult; sourceText: string; hasUsageRows: boolean }) {
  const { role } = useDemoRole();
  const metadata = result?.metadataHealth;
  const rawTotal = counts?.rawTotal || counts?.visibleToRole || counts?.totalMatching || 0;
  const averageScore = metadata?.averageScore || 0;
  const complete = metadata?.complete || 0;
  const completionPercent = percent(complete, rawTotal);
  const metadataStatus = averageScore >= 90
    ? "Field coverage strong"
    : averageScore >= 75
      ? "Reviewer-readable, still gaps"
      : "Metadata cleanup needed";
  const fieldRows = [
    {
      id: "source",
      label: "Source provenance",
      value: metadata?.needsSource || counts?.missingSource || 0,
      detail: "Source system, album, account, or custody path missing.",
      icon: Database
    },
    {
      id: "people",
      label: "People visibility",
      value: metadata?.needsPeople || counts?.childrenYouth || 0,
      detail: "People/minors confidence missing or reviewer-sensitive.",
      icon: Eye
    },
    {
      id: "rights",
      label: "Rights basis",
      value: metadata?.needsRights || counts?.rightsReview || 0,
      detail: "Owner, license, consent, or proof fields incomplete.",
      icon: Shield
    },
    {
      id: "usage",
      label: "Usage guidance",
      value: metadata?.needsUsage || 0,
      detail: "Approved channels or self-serve reuse copy missing.",
      icon: FileText
    },
    {
      id: "review",
      label: "Reviewer fields",
      value: metadata?.reviewPending || counts?.pendingReview || 0,
      detail: "Reviewer, review date, or final status not ready.",
      icon: CheckCircle2
    }
  ];
  const recordsNeedingWork = assets
    .map((asset) => ({ asset, health: assetMetadataHealth(asset) }))
    .filter((row) => row.health.missing.length)
    .sort((left, right) => left.health.score - right.health.score)
    .slice(0, 8);
  const requiredRows = [
    ["Average score", `${averageScore}%`],
    ["Complete records", `${complete.toLocaleString()} of ${rawTotal.toLocaleString()}`],
    ["Metadata gaps", `${(metadata?.reviewPending || counts?.pendingReview || 0).toLocaleString()} records`],
    ["Source mode", sourceText],
    ["Usage analytics", hasUsageRows ? "Connected" : "Not connected"]
  ];

  return (
    <>
      <section className="ed-card ed-metadata-summary">
        <div className="ed-readiness-primary">
          <div>
            <span>Metadata health</span>
            <strong>{averageScore}%</strong>
            <p>{complete.toLocaleString()} of {rawTotal.toLocaleString()} records pass required field checks</p>
            <em>{metadataStatus}</em>
          </div>
          <a className="ed-action is-primary" href={routeWithRole("/review?queue=metadata", role)}>Open metadata queue</a>
        </div>
        <div className="ed-readiness-meter" aria-label={`${completionPercent}% metadata complete`}><span style={{ width: `${completionPercent}%` }} /></div>
        <div className="ed-readiness-facts">
          {fieldRows.map((row) => <p key={row.id}><span>{row.label}</span><strong>{row.value.toLocaleString()}</strong></p>)}
        </div>
      </section>

      <section className="ed-card ed-priority-actions ed-metadata-gap-card">
        <header>
          <div>
            <h3>Required field gaps</h3>
            <p>Metadata page now tracks field coverage, not rights workflow workbench state.</p>
          </div>
          <span>{metadataStatus}</span>
        </header>
        <div className="ed-priority-action-grid ed-metadata-gap-grid">
          {fieldRows.map((row) => {
            const Icon = row.icon;
            const tone = row.value ? "medium" : "ready";
            return (
              <article className={`is-${tone}`} key={row.id}>
                <span>{row.value ? "Action needed" : "Healthy"}</span>
                <strong><Icon size={16} /> {row.label}</strong>
                <em>{row.value.toLocaleString()} records</em>
                <p>{row.detail}</p>
                <a href={routeWithRole("/review?queue=metadata", role)}>Review metadata</a>
              </article>
            );
          })}
        </div>
      </section>

      <div className="ed-insights-board is-metadata">
        <InsightPanel title="Records Needing Metadata" action="Open metadata queue" actionHref="/review?queue=metadata">
          {recordsNeedingWork.length ? (
            <div className="ed-metadata-record-list">
              {recordsNeedingWork.map(({ asset, health }) => (
                <article key={asset.id}>
                  <span>{health.score}%</span>
                  <strong>{displayTitle(asset)}<small>{assetType(asset)} · {assetRecordRef(asset)}</small></strong>
                  <em>{health.missing.join(", ")}</em>
                </article>
              ))}
            </div>
          ) : <p className="ed-footnote"><CheckCircle2 size={14} /> No metadata gap rows in the current result set.</p>}
        </InsightPanel>
        <InsightPanel title="Coverage Summary">
          <div className="ed-risk-list">
            {requiredRows.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}
          </div>
        </InsightPanel>
        <InsightPanel title="Hosted Media Dependency" className="is-wide">
          <div className="ed-table-mini">
            <p><strong>Vercel portal</strong><span>Shows records and governed actions.</span></p>
            <p><strong>ResourceSpace host</strong><span>Needed for actual previews, thumbnails, and DAM review screens.</span></p>
            <p><strong>Photo storage</strong><span>Needs hosted ResourceSpace filestore or object storage; Google Shared Drive remains master custody.</span></p>
            <p><strong>Current preview state</strong><span>Missing hosted media renders empty media states.</span></p>
          </div>
        </InsightPanel>
      </div>
    </>
  );
}

function AdminInsights({
  counts,
  usage,
  assets,
  sourceText,
  hasUsageRows,
  filters,
  result
}: {
  counts: SearchResult["counts"];
  usage?: SearchResult["usageAnalytics"];
  assets: StockMediaAsset[];
  sourceText: string;
  hasUsageRows: boolean;
  filters: InsightFilterState;
  result?: SearchResult;
}) {
  const { role } = useDemoRole();
  const rawTotal = counts?.rawTotal || counts?.visibleToRole || counts?.totalMatching || 0;
  const reviewRows: MetricRow[] = [
    { label: "Needs Review", value: counts?.needsReview || 0, total: rawTotal, tone: "orange" },
    { label: "Rights Review", value: counts?.rightsReview || 0, total: rawTotal, tone: "orange" },
    { label: "Missing Metadata", value: counts?.pendingReview || 0, total: rawTotal, tone: "orange" },
    { label: "Children/Youth", value: counts?.childrenYouth || 0, total: rawTotal, tone: "indigo" }
  ];
  const riskRows = [
    ["Rights review", counts?.rightsReview || 0, "orange"],
    ["Metadata gaps", counts?.pendingReview || 0, "orange"],
    ["Policy exceptions", counts?.blocked || 0, "green"],
    ["Unmapped fields", counts?.missingSource || 0, "indigo"]
  ] as const;
  return (
    <>
      <ReadinessSummary counts={counts} result={result} />
      <PriorityActions result={result} />
      <div className="ed-insights-board is-admin">
        {filters.review ? <InsightPanel title="Review Workload" action="Open Review Uploads" actionHref="/review"><MetricRows rows={reviewRows} /></InsightPanel> : null}
        {filters.review ? <InsightPanel title="Governance / Risk Summary" action={role === "DAM Admin" ? "Open admin" : undefined} actionHref={role === "DAM Admin" ? "/admin" : undefined}><div className="ed-risk-list">{riskRows.map(([label, value, tone]) => <p key={label} className={`is-${tone}`}><span>{label}</span><strong>{value.toLocaleString()}</strong></p>)}</div><small>Based on current snapshot period</small></InsightPanel> : null}
        {filters.usage ? <InsightPanel title="Top Assets"><TopAssetsList assets={assets} usage={usage} />{!usage?.topAssets?.length ? <BetaNote>Usage logging is not connected yet; current visible assets appear here instead.</BetaNote> : null}</InsightPanel> : null}
        {filters.source ? <InsightPanel title="Source Health / Integration Status"><SourceHealth total={rawTotal} usageTotal={usage?.totalEvents || 0} sourceLabelText={sourceText} /><p className="ed-footnote"><Info size={14} /> Operational diagnostics visible to reviewer/admin roles.</p></InsightPanel> : null}
        {filters.source ? <InsightPanel title="Content Snapshot"><ContentSnapshot assets={assets} /><p className="ed-footnote"><Info size={14} /> Based on current result page.</p></InsightPanel> : null}
      </div>
      {!Object.values(filters).some(Boolean) ? <section className="ed-card ed-analytics-empty"><Filter size={22} /><strong>No insight sections selected</strong><p>Turn on at least one filter to show operational panels.</p></section> : null}
      {filters.health ? <section className="ed-card"><h3>Asset Health & Governance</h3><div className="ed-health-grid">{insightHealthRows(counts).map((row) => <article key={row.label}><strong>{row.value.toLocaleString()}</strong><span>{row.label}</span><meter className={`is-${row.tone}`} min={0} max={Math.max(rawTotal, row.value, 1)} value={row.value} /></article>)}</div></section> : null}
      {filters.usage ? <section className="ed-analytics-setup"><header><div><h3>Analytics setup</h3><p>Usage panels stay secondary until portal instrumentation records durable search and asset events.</p></div><span>{hasUsageRows ? "Connected" : "Data not connected yet"}</span></header><div className="ed-analytics-setup-grid"><section className="ed-card ed-analytics-setup-panel"><header className="ed-card-head"><h3>Trends</h3></header><TrendPanel usage={usage} /></section><section className="ed-card ed-analytics-setup-panel"><header className="ed-card-head"><h3>Top searched terms</h3></header><TopicsList usage={usage} savedViews={[]} />{!hasUsageRows ? <BetaNote>Search logging is not connected yet; topic rows stay limited to available records.</BetaNote> : null}</section></div></section> : null}
    </>
  );
}

function ViewerInsights({
  counts,
  usage,
  assets,
  savedViews,
  collections
}: {
  counts: SearchResult["counts"];
  usage?: SearchResult["usageAnalytics"];
  assets: StockMediaAsset[];
  savedViews: SearchResult["savedViews"];
  collections: SearchResult["collections"];
}) {
  const { role } = useDemoRole();
  const visible = counts?.visibleToRole || counts?.totalMatching || 0;
  const ready = counts?.portalReady || counts?.approved || 0;
  const needs = counts?.needsReview || 0;
  const stats: InsightStat[] = [
    { label: "Visible Media", value: visible.toLocaleString(), detail: "items you can view", meta: "visible library period", tone: "blue", icon: ImageIcon },
    { label: "Approved Media", value: ready.toLocaleString(), detail: "approved for use", meta: "visible library period", tone: "green", icon: CheckCircle2 },
    { label: "Needs Review", value: needs.toLocaleString(), detail: "may need attention", meta: "visible library period", tone: "orange", icon: Clock3 },
    { label: "Saved Views", value: savedViews.length.toLocaleString(), detail: "saved views", meta: "your library", tone: "purple", icon: Eye },
    { label: "Collections", value: collections.length.toLocaleString(), detail: "your collections", meta: "your library", tone: "blue", icon: FolderOpen },
    { label: "Recent Uploads", value: (counts?.approvedThisMonth || 0).toLocaleString(), detail: "last 30 days", meta: "visible library period", tone: "teal", icon: UploadCloud }
  ];
  const useCases = [
    ["Find images for website or announcements", "Browse photos, banners, and graphics", ImageIcon, "/?q=website%20announcement"],
    ["Find sermon or slide backgrounds", "Widescreen and social sizes", FileText, "/?q=sermon%20slides"],
    ["Find social media content", "Square, story, and announcement assets", Tags, "/?q=social"],
    ["Find newsletter assets", "Header images and content blocks", FileText, "/?q=newsletter"],
    ["Find videos for events or ministries", "Events, testimonies, and ministry highlights", Search, "/?q=video%20events"]
  ] as const;
  const reuseGuide = [
    ["Use approved assets", "All media in this library is reviewed for rights and reuse scope."],
    ["Follow TJC Identity", "Use identity.tjc.org for logo, color, and template guidance."],
    ["Credit when required", "Some assets require attribution. Check asset details."],
    ["When in doubt, ask", "Contact your brand or communications team for help."]
  ];
  const tips = [
    ["Save a view", "Filter results and save for quick access anytime.", Star],
    ["Add to favorites", "Star assets you use often for fast retrieval.", Star],
    ["Collections", "Organize assets by project, event, or ministry.", FolderOpen],
    ["Request access help", "Use Requests when a teammate needs scoped media access.", ClipboardList]
  ] as const;
  return (
    <>
      <div className="ed-insight-stat-grid">{stats.map((stat) => <InsightStatCard key={stat.label} stat={stat} />)}</div>
      <div className="ed-viewer-board">
        <InsightPanel title="My Common Use Cases" action="View all use cases" actionHref="/help">{useCases.map(([title, detail, Icon, href]) => <a className="ed-use-case" href={routeWithRole(href, role)} key={title}><i><Icon size={16} /></i><strong>{title}<small>{detail}</small></strong><span>›</span></a>)}</InsightPanel>
        <InsightPanel title="Frequently Used Topics" action="Browse all topics" actionHref="/?view=saved"><TopicsList usage={usage} savedViews={savedViews} /></InsightPanel>
        <InsightPanel title="Recently Viewed Assets"><div className="ed-recent-assets">{assets.slice(0, 5).map((asset) => <article key={asset.id}><AssetThumb asset={asset} /><strong>{displayTitle(asset)}<small>{assetType(asset)} · {formatBytes(asset.fileSizeBytes)}</small></strong><span>Visible</span></article>)}</div></InsightPanel>
        <InsightPanel title="Top Categories" action="Explore all categories" actionHref="/collections"><CategoryDonut assets={assets} visibleTotal={visible} /></InsightPanel>
        <InsightPanel title="Media Reuse Guide" action="View policies" actionHref="/help#policies">{reuseGuide.map(([title, detail]) => <p className="ed-guide-row" key={title}><CheckCircle2 size={16} /><strong>{title}<small>{detail}</small></strong></p>)}</InsightPanel>
        <InsightPanel title="Tips & Shortcuts" action="View help center" actionHref="/help">{tips.map(([title, detail, Icon]) => <p className="ed-tip-row" key={title}><i><Icon size={16} /></i><strong>{title}<small>{detail}</small></strong></p>)}</InsightPanel>
      </div>
    </>
  );
}

export function EnterpriseInsightsPage() {
  const { role } = useDemoRole();
  const searchParams = useSearchParams();
  const activePanel = searchParams?.get("panel");
  const metadataPanel = activePanel === "metadata";
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePeriod, setActivePeriod] = useState<InsightPeriodId>("library-snapshot");
  const [filters, setFilters] = useState<InsightFilterState>(defaultInsightFilters);
  const [insightStatus, setInsightStatus] = useState("");
  const insights = useAssetsSearch({ role, sort: "Approved first", limit: 5 });
  const counts = insights.data?.counts;
  const usage = insights.data?.usageAnalytics;
  const hasUsageRows = Boolean(usage?.topSearches.length || usage?.topAssets.length);
  const operationalView = role === "Reviewer" || role === "DAM Admin";
  const rawSourceLabel = sourceLabel(insights.source);
  const visibleSourceLabel = insights.source?.adapter === "demo-fallback"
    ? "Local catalog snapshot"
    : rawSourceLabel.replace(/\bexport\b/gi, "snapshot");
  const sourceDetailText = insightUiCopy(insights.source?.detail || "Media library source unavailable.");
  const title = metadataPanel ? "Metadata Health" : "Insights";
  const subtitle = metadataPanel
    ? "Track field coverage, missing metadata, and reviewer-ready record quality."
    : operationalView ? "Monitor library readiness, review workload, and governance signals." : "Overview of media you can view, saved views, and collections.";
  const activePeriodLabel = insightPeriods.find((period) => period.id === activePeriod)?.label || "Library snapshot";

  useEffect(() => {
    setFilters(metadataPanel ? metadataInsightFilters : defaultInsightFilters);
    setFiltersOpen(false);
  }, [metadataPanel]);

  const copyInsightsSummary = async () => {
    if (!insights.data) {
      setInsightStatus("Insights are still loading. Summary copy is available after data loads.");
      return;
    }
    const payload = {
      copiedAt: new Date().toISOString(),
      role,
      period: activePeriodLabel,
      note: activePeriod === "library-snapshot" ? "Counts are from the current media library snapshot." : "Period applies to portal usage event panels where dated SQLite events exist.",
      source: operationalView ? insights.source : undefined,
      counts: insights.data.counts,
      usageAnalytics: operationalView ? insights.data.usageAnalytics : undefined,
      topAssets: insights.data.assets.slice(0, 10).map((asset) => ({
        id: asset.id,
        resourceSpaceId: asset.resourceSpaceId,
        title: displayTitle(asset),
        mediaType: asset.mediaType,
        status: asset.status,
        usageScope: asset.usageScope
      }))
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setInsightStatus(`${activePeriodLabel} summary copied to clipboard. No file, hosted URL, or source writeback was created.`);
    } catch {
      setInsightStatus("Clipboard copy was blocked by the browser. No file, hosted URL, or source writeback was created.");
    }
  };
  return (
    <div className="enterprise-page enterprise-insights">
      <PageHeader title={title} subtitle={subtitle} actions={<><PeriodMenu activePeriod={activePeriod} onToggle={() => { setPeriodMenuOpen((open) => !open); setFiltersOpen(false); }} />{operationalView ? <><ActionButton icon={Filter} onClick={() => { setFiltersOpen((open) => !open); setPeriodMenuOpen(false); }}>{filtersOpen ? "Hide filters" : "Filters"}</ActionButton><ActionButton icon={ClipboardList} onClick={copyInsightsSummary} disabled={insights.loading}>Copy summary</ActionButton></> : null}</>} />
      {periodMenuOpen ? <PeriodPickerPanel activePeriod={activePeriod} onSelect={(period) => { setActivePeriod(period); setPeriodMenuOpen(false); setInsightStatus(`${insightPeriods.find((item) => item.id === period)?.label || "Library snapshot"} selected. Visible counts remain tied to the current media library snapshot.`); }} /> : null}
      {filtersOpen && operationalView ? <InsightFilterPanel filters={filters} onChange={setFilters} onReset={() => setFilters(defaultInsightFilters)} /> : null}
      {insightStatus ? <p className="ed-inline-success ed-insight-status">{insightStatus}</p> : null}
      <section className={operationalView ? "ed-approved-banner" : "ed-role-safe-banner"}>{operationalView ? <Database size={22} /> : <Info size={22} />}<div><strong>{operationalView ? visibleSourceLabel : "Your media insights"}</strong><span>{operationalView ? sourceDetailText : "These insights show media available to your account."}</span></div><span>{operationalView ? (hasUsageRows ? "Usage rows from portal analytics" : "Usage analytics not connected") : "Review operations stay with the media team."}</span></section>
      {insights.loading ? <LoadingCard /> : insights.error ? <ErrorCard message={insights.error} source={insights.source} /> : <>
        <AssetPreviewStrip
          assets={insights.data?.assets || []}
          title={operationalView ? "Current visible media" : "Recently visible media"}
          detail={operationalView ? "Preview-backed assets from the current governed result set. Usage panels only show recorded events when connected." : "Media visible to this account."}
        />
        {operationalView
          ? metadataPanel
            ? <MetadataHealthDashboard counts={counts!} assets={insights.data?.assets || []} result={insights.data || undefined} sourceText={visibleSourceLabel} hasUsageRows={hasUsageRows} />
            : <AdminInsights counts={counts!} usage={usage} assets={insights.data?.assets || []} sourceText={visibleSourceLabel} hasUsageRows={hasUsageRows} filters={filters} result={insights.data || undefined} />
          : <ViewerInsights counts={counts!} usage={usage} assets={insights.data?.assets || []} savedViews={insights.data?.savedViews || []} collections={insights.data?.collections || []} />}
      </>}
    </div>
  );
}
