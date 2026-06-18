"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderPlus,
  MessageSquareText,
  Search,
  ShieldAlert,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetsSearch } from "@/components/dam/useDamApi";
import { assetRecordRef, displayTitle, sourceTruthLabel } from "@/lib/enterprise-display";
import { assetEnterpriseStatus } from "@/lib/enterprise-status";
import { canContribute, canReview } from "@/lib/permissions";
import { buildPortalReuseDecision } from "@/lib/portal-reuse-decision";
import { betaVisibilityLabel, reuseAnswerLabel } from "@/lib/portal-context-presenters";
import { routeWithRole } from "@/lib/role-routes";
import type { StockMediaAsset } from "@/lib/types";
import { AssetCard, AssetThumb, SourcePill, StatusBadge } from "./EnterpriseShared";

function countBy(assets: StockMediaAsset[], predicate: (asset: StockMediaAsset) => boolean) {
  return assets.reduce((total, asset) => total + (predicate(asset) ? 1 : 0), 0);
}

function DashboardKpi({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  return (
    <article className={`ed-dashboard-kpi is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function DashboardAction({
  href,
  icon: Icon,
  title,
  detail,
  disabled = false
}: {
  href: string;
  icon: typeof Search;
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <button className="ed-dashboard-action" type="button" disabled title={detail}>
        <Icon size={18} aria-hidden="true" />
        <span><strong>{title}</strong><small>{detail}</small></span>
      </button>
    );
  }

  return (
    <Link className="ed-dashboard-action" href={href}>
      <Icon size={18} aria-hidden="true" />
      <span><strong>{title}</strong><small>{detail}</small></span>
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}

function RecentActivityRow({ asset }: { asset: StockMediaAsset }) {
  const { role } = useDemoRole();
  const packet = buildPortalReuseDecision(asset, role);
  return (
    <Link className="ed-dashboard-activity-row" href={routeWithRole(`/assets/${asset.id}`, role)}>
      <AssetThumb asset={asset} />
      <span>
        <strong>{displayTitle(asset)}</strong>
        <small>{assetRecordRef(asset)} · {betaVisibilityLabel(asset)} · {reuseAnswerLabel(packet.reuse.state)}</small>
      </span>
      <StatusBadge status={assetEnterpriseStatus(asset)} />
    </Link>
  );
}

export function EnterpriseDashboardPage() {
  const { role } = useDemoRole();
  const search = useAssetsSearch({ role, sort: "Approved first", limit: 18 });
  const assets = search.data?.assets || [];
  const approved = countBy(assets, (asset) => buildPortalReuseDecision(asset, role).viewerVerdict.canDownload);
  const needsReview = countBy(assets, (asset) => assetEnterpriseStatus(asset) === "Needs Review");
  const rightsUnclear = countBy(assets, (asset) => {
    const packet = buildPortalReuseDecision(asset, role);
    return packet.reuse.blockers.some((blocker) => /rights|consent|people|minors/i.test(`${blocker.code} ${blocker.label}`));
  });
  const recentUploads = countBy(assets, (asset) => asset.status === "Needs Review" || asset.status === "Possible Minors");
  const openRequests = Math.max(6, rightsUnclear + needsReview);
  const heroAssets = assets.slice(0, 6);
  const selected = assets[0];
  const selectedPacket = selected ? buildPortalReuseDecision(selected, role) : null;

  return (
    <div className="enterprise-page enterprise-dashboard">
      <section className="ed-dashboard-hero" aria-labelledby="dashboard-title">
        <div className="ed-dashboard-hero-copy">
          <span className="ed-section-eyebrow">DAM command center</span>
          <h1 id="dashboard-title">Find safe-to-use church media with evidence visible.</h1>
          <p>Search hosted DAM records, inspect reuse status, and route review work without exposing source files.</p>
          <form className="ed-dashboard-search" action={routeWithRole("/library", role)} role="search">
            <Search size={19} aria-hidden="true" />
            <label className="sr-only" htmlFor="dashboard-search">Search media library</label>
            <input id="dashboard-search" name="q" placeholder="Search photos, events, ministries, people, tags, references..." />
            <button type="submit">Search Library</button>
          </form>
        </div>
        <aside className="ed-dashboard-beta-card" aria-label="Beta scope">
          <SourcePill source={search.source} live={search.live} />
          <dl>
            <div><dt>Beta scope</dt><dd>Photo-only beta</dd></div>
            <div><dt>Source files</dt><dd>Restricted</dd></div>
            <div><dt>Source truth</dt><dd>{sourceTruthLabel(search.source)}</dd></div>
          </dl>
          <p>Reuse/download depends on item evidence. Non-photo records may remain reference or review items.</p>
        </aside>
      </section>

      <section className="ed-dashboard-kpis" aria-label="Dashboard summary">
        <DashboardKpi label="Approved photos" value={approved} detail="Approved-copy gate can run" tone="good" />
        <DashboardKpi label="Needs review" value={needsReview} detail="Reviewer evidence required" tone="warn" />
        <DashboardKpi label="Rights unclear" value={rightsUnclear} detail="Rights, consent, or people check" tone="danger" />
        <DashboardKpi label="Recent uploads" value={recentUploads} detail="Intake is not approval" tone="neutral" />
        <DashboardKpi label="Open requests" value={openRequests} detail="Reuse, review, access, rights" tone="neutral" />
      </section>

      <section className="ed-dashboard-actions" aria-label="Quick actions">
        <DashboardAction href={routeWithRole("/upload", role)} icon={UploadCloud} title="Upload photos" detail="Build reviewer packet" disabled={!canContribute(role)} />
        <DashboardAction href={routeWithRole("/library?filter=portal+ready", role)} icon={CheckCircle2} title="Browse approved library" detail="Approved copy first" />
        <DashboardAction href={routeWithRole("/review", role)} icon={ShieldAlert} title="Review queue" detail="Evidence workbench" disabled={!canReview(role)} />
        <DashboardAction href={routeWithRole("/collections", role)} icon={FolderPlus} title="Create collection" detail="Curate without approving" disabled={role === "Viewer"} />
      </section>

      <div className="ed-dashboard-workspace">
        <main className="ed-dashboard-library-preview" aria-label="Media preview">
          <header>
            <div>
              <span className="ed-section-eyebrow">Image-forward Library</span>
              <h2>Role-safe media preview</h2>
              <p>Visual browsing stays primary. Table view remains available in Library for power users.</p>
            </div>
            <Link href={routeWithRole("/library", role)}>Open Library <ArrowRight size={14} aria-hidden="true" /></Link>
          </header>
          <div className="ed-grid ed-dashboard-grid">
            {heroAssets.map((asset) => (
              <AssetCard asset={asset} key={asset.id} />
            ))}
          </div>
        </main>

        <aside className="ed-dashboard-trust-panel" aria-label="Selected asset trust panel">
          <header>
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <h2>Can I use this?</h2>
              <p>Every record shows primary reuse decision first.</p>
            </div>
          </header>
          {selected && selectedPacket ? (
            <>
              <AssetThumb asset={selected} fit="contain" className="ed-dashboard-selected-preview" />
              <h3>{displayTitle(selected)}</h3>
              <p>{assetRecordRef(selected)} · {reuseAnswerLabel(selectedPacket.reuse.state)}</p>
              <div className="ed-dashboard-trust-facts">
                <span><small>Primary decision</small><strong>{selectedPacket.viewerVerdict.canDownload ? "Can use" : selectedPacket.reuse.state === "blocked-do-not-use" ? "Restricted" : "Needs review"}</strong></span>
                <span><small>Approved copy</small><strong>{selectedPacket.access.downloadApprovedCopy.allowed ? "Available" : "Review required"}</strong></span>
                <span><small>Source/original</small><strong>Restricted source</strong></span>
                <span><small>Source truth</small><strong>{sourceTruthLabel(search.source)}</strong></span>
              </div>
              <Link className="ed-action is-primary" href={routeWithRole(`/assets/${selected.id}`, role)}>View details</Link>
            </>
          ) : (
            <p>No role-safe record loaded yet.</p>
          )}
        </aside>
      </div>

      <section className="ed-dashboard-activity" aria-label="Recent activity and uploads">
        <header>
          <div>
            <span className="ed-section-eyebrow">Recent activity</span>
            <h2>Recent uploads and review movement</h2>
          </div>
          <Link href={routeWithRole("/recent-uploads", role)}>Recent Uploads <Clock3 size={14} aria-hidden="true" /></Link>
        </header>
        <div>
          {assets.slice(0, 5).map((asset) => <RecentActivityRow asset={asset} key={asset.id} />)}
        </div>
        <p><MessageSquareText size={14} aria-hidden="true" /> Requests queue work. Approval, download, and source access stay gated until evidence is reviewed.</p>
      </section>
    </div>
  );
}
