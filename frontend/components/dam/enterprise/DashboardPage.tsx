"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderPlus,
  LayoutDashboard,
  MessageSquareText,
  Search,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  type LucideIcon
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetsSearch } from "@/components/dam/useDamApi";
import { publicAssetRef } from "@/lib/asset-refs";
import { assetRecordRef, displayTitle, sourceTruthLabel } from "@/lib/enterprise-display";
import { assetEnterpriseStatus } from "@/lib/enterprise-status";
import { canReview } from "@/lib/permissions";
import { buildPortalReuseDecision } from "@/lib/portal-reuse-decision";
import { betaVisibilityLabel, reuseAnswerLabel } from "@/lib/portal-context-presenters";
import { routeWithRole } from "@/lib/role-routes";
import type { DemoRole, StockMediaAsset } from "@/lib/types";
import { AssetCard, AssetThumb, SourcePill, StatusBadge } from "./EnterpriseShared";

const SOURCE_TRUTH_VALUE = "__source_truth__";

type DashboardScopeRow = {
  label: string;
  value: string;
};

type DashboardCopy = {
  eyebrow: string;
  title: string;
  body: string;
  searchPlaceholder: string;
  scopeLabel: string;
  scopeBadge: string;
  scopeRows: DashboardScopeRow[];
  scopeNote: string;
  approvedLabel: string;
  approvedDetail: string;
  needsReviewDetail: string;
  rightsDetail: string;
  recentUploadsDetail: string;
  openRequestsDetail: string;
  libraryEyebrow: string;
  libraryTitle: string;
  libraryBody: string;
  trustBody: string;
  clearedCopyLabel: string;
  clearedCopyAvailableValue: string;
  clearedCopyBlockedValue: string;
  fullFileLabel: string;
  fullFileValue: string;
  recordBasisLabel: string;
  recordBasisValue: string;
  activityTitle: string;
  activityHref: string;
  activityLinkLabel: string;
  activityNote: string;
};

export function dashboardCopyForRole(role: DemoRole): DashboardCopy {
  if (canReview(role)) {
    return {
      eyebrow: "DAM command center",
      title: "Find safe-to-use church media with evidence visible.",
      body: "Search media records, inspect reuse status, and route review work while protected files stay gated.",
      searchPlaceholder: "Search photos, events, ministries, people, tags, references...",
      scopeLabel: "Current media scope",
      scopeBadge: "Review source",
      scopeRows: [
        { label: "Media scope", value: "Photos first" },
        { label: "Protected files", value: "Restricted" },
        { label: "Record basis", value: SOURCE_TRUTH_VALUE }
      ],
      scopeNote: "Reuse and download depend on item evidence. Non-photo records may remain reference or review items.",
      approvedLabel: "Approved photos",
      approvedDetail: "Approved-copy gate can run",
      needsReviewDetail: "Reviewer evidence required",
      rightsDetail: "Rights, consent, or people check",
      recentUploadsDetail: "Intake is not approval",
      openRequestsDetail: "Reuse, review, access, rights",
      libraryEyebrow: "Image-forward Library",
      libraryTitle: "Role-safe media preview",
      libraryBody: "Visual browsing stays primary. Table view remains available in Library for power users.",
      trustBody: "Every record shows primary reuse decision first.",
      clearedCopyLabel: "Approved copy",
      clearedCopyAvailableValue: "Available",
      clearedCopyBlockedValue: "Review required",
      fullFileLabel: "Source/original",
      fullFileValue: "Restricted source",
      recordBasisLabel: "Record basis",
      recordBasisValue: SOURCE_TRUTH_VALUE,
      activityTitle: "Recent uploads and review movement",
      activityHref: "/review",
      activityLinkLabel: "Review Uploads",
      activityNote: "Requests queue work. Approval, download, and protected-file access stay gated until evidence is reviewed."
    };
  }

  return {
    eyebrow: "Media command center",
    title: "Find church media and use it with care.",
    body: role === "Contributor"
      ? "Upload event photos, follow reviewer questions, and browse cleared media from one place."
      : "Browse cleared media, check use guidance, and ask the media team for help.",
    searchPlaceholder: "Search photos, events, ministries, tags, references...",
    scopeLabel: "Current media guidance",
    scopeBadge: "Media library",
    scopeRows: [
      { label: "Media scope", value: "Photos first" },
      { label: "Use guidance", value: "Shown on each item" },
      { label: "Full file", value: "Request required" }
    ],
    scopeNote: "Cleared copies show use guidance. Anything unclear stays in review until the media team clears it.",
    approvedLabel: "Cleared media",
    approvedDetail: "Use guidance available",
    needsReviewDetail: "Media team review required",
    rightsDetail: "Consent or people check",
    recentUploadsDetail: role === "Contributor" ? "Your recent submissions" : "Recent media activity",
    openRequestsDetail: "Help and correction requests",
    libraryEyebrow: "Media Library",
    libraryTitle: "Cleared media preview",
    libraryBody: "Browse visually first. Open an item for use guidance and request help when something is unclear.",
    trustBody: "Each item shows whether it can be used or needs review.",
    clearedCopyLabel: "Use guidance",
    clearedCopyAvailableValue: "Shown",
    clearedCopyBlockedValue: "Review required",
    fullFileLabel: "Full file",
    fullFileValue: "Request required",
    recordBasisLabel: "Record basis",
    recordBasisValue: "Media library",
    activityTitle: role === "Contributor" ? "Your upload and request flow" : "Recent media activity",
    activityHref: role === "Contributor" ? "/recent-uploads" : "/library",
    activityLinkLabel: role === "Contributor" ? "My Uploads" : "Open Library",
    activityNote: "Requests send media questions to the team. Items that need review stay gated until cleared."
  };
}

type DashboardActionModel = {
  href: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  disabled?: boolean;
};

export function dashboardActionsForRole(role: DemoRole): DashboardActionModel[] {
  if (role === "Contributor") {
    return [
      { href: "/upload", icon: UploadCloud, title: "Upload photos", detail: "Send event photos for review" },
      { href: "/my-tasks", icon: Clock3, title: "My Work", detail: "Drafts and reviewer questions" },
      { href: "/recent-uploads", icon: CheckCircle2, title: "My Uploads", detail: "Track submitted batches" },
      { href: "/requests", icon: MessageSquareText, title: "Requests", detail: "Ask media team for help" }
    ];
  }

  if (role === "Reviewer") {
    return [
      { href: "/review", icon: ShieldAlert, title: "Review uploads", detail: "Evidence workbench" },
      { href: "/my-tasks", icon: Clock3, title: "My Work", detail: "Assigned review follow-up" },
      { href: "/upload", icon: UploadCloud, title: "Upload photos", detail: "Send photos into review" },
      { href: "/requests", icon: MessageSquareText, title: "Requests", detail: "Answer media questions" }
    ];
  }

  if (role === "DAM Admin") {
    return [
      { href: "/admin", icon: LayoutDashboard, title: "Support Zone", detail: "Readiness and blocked operations" },
      { href: "/review", icon: ShieldAlert, title: "Review uploads", detail: "Evidence workbench" },
      { href: "/my-tasks", icon: Clock3, title: "My Work", detail: "Bottlenecks and follow-up" },
      { href: "/requests", icon: MessageSquareText, title: "Requests", detail: "Media team support" }
    ];
  }

  return [
    { href: "/library?filter=portal+ready", icon: CheckCircle2, title: "Browse cleared media", detail: "Use guidance first" },
    { href: "/collections", icon: FolderPlus, title: "Albums & events", detail: "Browse by gathering" },
    { href: "/requests", icon: MessageSquareText, title: "Requests", detail: "Ask media team for help" },
    { href: "/help", icon: ShieldCheck, title: "Use guidance", detail: "Check sharing rules" }
  ];
}

export function dashboardRecordRefForRole(asset: StockMediaAsset, role: DemoRole) {
  return canReview(role) ? assetRecordRef(asset) : publicAssetRef(asset);
}

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
  icon: LucideIcon;
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
  const recordRef = dashboardRecordRefForRole(asset, role);
  return (
    <Link className="ed-dashboard-activity-row" href={routeWithRole(`/assets/${asset.id}`, role)}>
      <AssetThumb asset={asset} />
      <span>
        <strong>{displayTitle(asset)}</strong>
        <small>{recordRef} · {betaVisibilityLabel(asset)} · {reuseAnswerLabel(packet.reuse.state)}</small>
      </span>
      <StatusBadge status={assetEnterpriseStatus(asset)} />
    </Link>
  );
}

export function EnterpriseDashboardPage() {
  const { role } = useDemoRole();
  const copy = dashboardCopyForRole(role);
  const actions = dashboardActionsForRole(role);
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
  const selectedRecordRef = selected ? dashboardRecordRefForRole(selected, role) : "";
  const scopeRows = copy.scopeRows.map((row) => ({
    ...row,
    value: row.value === SOURCE_TRUTH_VALUE ? sourceTruthLabel(search.source) : row.value
  }));
  const recordBasisValue = copy.recordBasisValue === SOURCE_TRUTH_VALUE ? sourceTruthLabel(search.source) : copy.recordBasisValue;
  const showOpsSource = canReview(role);

  return (
    <div className="enterprise-page enterprise-dashboard">
      <section className="ed-dashboard-hero" aria-labelledby="dashboard-title">
        <div className="ed-dashboard-hero-copy">
          <span className="ed-section-eyebrow">{copy.eyebrow}</span>
          <h1 id="dashboard-title">{copy.title}</h1>
          <p>{copy.body}</p>
          <form className="ed-dashboard-search" action={routeWithRole("/library", role)} role="search">
            <Search size={19} aria-hidden="true" />
            <label className="sr-only" htmlFor="dashboard-search">Search media library</label>
            <input id="dashboard-search" name="q" placeholder={copy.searchPlaceholder} />
            <button type="submit">Search Library</button>
          </form>
        </div>
        <aside className="ed-dashboard-beta-card" aria-label={copy.scopeLabel}>
          {showOpsSource ? <SourcePill source={search.source} live={search.live} /> : <span className="ed-source-pill">{copy.scopeBadge}</span>}
          <dl>
            {scopeRows.map((row) => (
              <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
            ))}
          </dl>
          <p>{copy.scopeNote}</p>
        </aside>
      </section>

      <section className="ed-dashboard-kpis" aria-label="Dashboard summary">
        <DashboardKpi label={copy.approvedLabel} value={approved} detail={copy.approvedDetail} tone="good" />
        <DashboardKpi label="Needs review" value={needsReview} detail={copy.needsReviewDetail} tone="warn" />
        <DashboardKpi label="Rights unclear" value={rightsUnclear} detail={copy.rightsDetail} tone="danger" />
        <DashboardKpi label="Recent uploads" value={recentUploads} detail={copy.recentUploadsDetail} tone="neutral" />
        <DashboardKpi label="Open requests" value={openRequests} detail={copy.openRequestsDetail} tone="neutral" />
      </section>

      <section className="ed-dashboard-actions" aria-label="Quick actions">
        {actions.map((action) => (
          <DashboardAction
            key={`${action.href}-${action.title}`}
            href={routeWithRole(action.href, role)}
            icon={action.icon}
            title={action.title}
            detail={action.detail}
            disabled={action.disabled}
          />
        ))}
      </section>

      <div className="ed-dashboard-workspace">
        <section className="ed-dashboard-library-preview" aria-label="Media preview">
          <header>
            <div>
              <span className="ed-section-eyebrow">{copy.libraryEyebrow}</span>
              <h2>{copy.libraryTitle}</h2>
              <p>{copy.libraryBody}</p>
            </div>
            <Link href={routeWithRole("/library", role)}>Open Library <ArrowRight size={14} aria-hidden="true" /></Link>
          </header>
          <div className="ed-grid ed-dashboard-grid">
            {heroAssets.map((asset) => (
              <AssetCard asset={asset} key={asset.id} />
            ))}
          </div>
        </section>

        <aside className="ed-dashboard-trust-panel" aria-label="Selected asset trust panel">
          <header>
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <h2>Can I use this?</h2>
              <p>{copy.trustBody}</p>
            </div>
          </header>
          {selected && selectedPacket ? (
            <>
              <AssetThumb asset={selected} fit="contain" className="ed-dashboard-selected-preview" />
              <h3>{displayTitle(selected)}</h3>
              <p>{selectedRecordRef} · {reuseAnswerLabel(selectedPacket.reuse.state)}</p>
              <div className="ed-dashboard-trust-facts">
                <span><small>Primary decision</small><strong>{selectedPacket.viewerVerdict.canDownload ? "Can use" : selectedPacket.reuse.state === "blocked-do-not-use" ? "Restricted" : "Needs review"}</strong></span>
                <span><small>{copy.clearedCopyLabel}</small><strong>{selectedPacket.access.downloadApprovedCopy.allowed ? copy.clearedCopyAvailableValue : copy.clearedCopyBlockedValue}</strong></span>
                <span><small>{copy.fullFileLabel}</small><strong>{copy.fullFileValue}</strong></span>
                <span><small>{copy.recordBasisLabel}</small><strong>{recordBasisValue}</strong></span>
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
            <h2>{copy.activityTitle}</h2>
          </div>
          <Link href={routeWithRole(copy.activityHref, role)}>{copy.activityLinkLabel} <Clock3 size={14} aria-hidden="true" /></Link>
        </header>
        <div>
          {assets.slice(0, 5).map((asset) => <RecentActivityRow asset={asset} key={asset.id} />)}
        </div>
        <p><MessageSquareText size={14} aria-hidden="true" /> {copy.activityNote}</p>
      </section>
    </div>
  );
}
