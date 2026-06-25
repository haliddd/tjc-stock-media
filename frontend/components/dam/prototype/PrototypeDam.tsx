"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileUp,
  Folder,
  Inbox,
  LayoutGrid,
  List,
  LockKeyhole,
  PanelLeftClose,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  MoreHorizontal,
  UserCog,
  X
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { BetaPrototypeTools } from "@/components/BetaPrototypeTools";
import { DownloadCenterDrawer } from "@/components/DownloadOptionsPanel";
import { RightsExplanationDrawer } from "@/components/RightsExplanationDrawer";
import { useDemoRole } from "@/components/RoleProvider";
import { useAdminReadiness, useAssetDetail, useAssetsSearch, useDownloadGate, useRequestRecords, useReviewQueue, useReviewRequest, type DownloadGateResponse, type RequestRecordPayload, type ReviewRequestResponse } from "@/components/dam/useDamApi";
import { Badge } from "@/components/ui/badge";
import { Button as ShadcnButton, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { canAdmin, canReview, canUpload } from "@/lib/permissions";
import { buildGovernanceCleanupQueues } from "@/lib/governance-cleanup-queues";
import { buildPermissionInheritancePreview } from "@/lib/permission-inheritance-preview";
import {
  emptyReviewEvidenceDepthChecklist,
  initialReviewEvidenceDepthChecklist,
  reviewEvidenceDepthDisabledReason,
  reviewEvidenceDepthItems
} from "@/lib/review-evidence-depth";
import { routeWithRole } from "@/lib/role-routes";
import { DAM_LOCAL_BETA_ROLE_HEADER, DAM_LOCAL_TRUSTED_ROLE_HEADER } from "@/lib/dam-api-client";
import { assetRecordRef, assetType, displayTitle, formatBytes } from "@/lib/enterprise-display";
import { assetEnterpriseStatus } from "@/lib/enterprise-status";
import { matchedBecauseChips } from "@/lib/search-intelligence";
import { cn } from "@/lib/utils";
import { publicPortalActionLabel, publicPortalRoleControls, publicPortalRoleSummary, type PublicPortalControlState } from "@/lib/public-portal-role-controls";
import { emptyReviewChecklist, initialReviewChecklistForAsset, reviewActionDisabledReason, reviewChecklistItems } from "@/lib/review-decision-presenter";
import type { ApprovedChannel, CatalogSort, DemoRole, ReviewEvidenceChecklist, ReviewEvidenceDepthChecklist, ReviewWriteRecordSummary, StockMediaAsset, UsageScope } from "@/lib/types";

type ProtoTab = "details" | "metadata" | "activity";
type LibraryMode = "browse" | "ops";
type UploadListItem = { name: string; size: number };
type RequestFilter = "open" | "waiting" | "closed";
type ReviewDecisionPayload = {
  ok?: boolean;
  queued?: boolean;
  error?: string;
  message?: string;
  pendingWriteId?: string;
  syncState?: string;
  resourceSpaceWritten?: boolean;
  mode?: string;
};

const prototypeSortOptions: CatalogSort[] = ["Approved first", "Recently approved", "Newest", "A-Z"];
const defaultPrototypeSort: CatalogSort = "Newest";
const defaultPrototypePageLimit = 24;

function normalizePrototypeSort(value: string | null): CatalogSort {
  return prototypeSortOptions.includes(value as CatalogSort) ? value as CatalogSort : defaultPrototypeSort;
}

function readPrototypePageLimit(value: string | null) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return defaultPrototypePageLimit;
  return Math.max(1, Math.min(120, parsed));
}

function readPrototypeOffset(value: string | null) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function readLibraryMode(value: string | null): LibraryMode {
  return value === "ops" ? "ops" : "browse";
}

function readBooleanUrlFlag(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function rightsSafeToggleLabel(role: DemoRole, mode: LibraryMode) {
  if (role === "Reviewer") return "Show assets cleared for use";
  if (role === "DAM Admin" || mode === "ops") return "Show rights-safe assets only";
  return "Only show assets I can use";
}

function assetUseState(asset: StockMediaAsset) {
  const decision = asset.reuseDecision;
  if (decision?.state === "portal-ready") {
    return {
      tone: "ready",
      label: "Available for use",
      actionLabel: "Download approved copy",
      detail: decision.summary
    };
  }
  if (decision?.state === "internal-ready") {
    return {
      tone: "internal",
      label: "Internal use only",
      actionLabel: "Check internal gate",
      detail: decision.summary
    };
  }
  if (decision?.state === "blocked-do-not-use") {
    return { tone: "blocked", label: "Restricted", actionLabel: "Request review", detail: decision.summary };
  }
  if (decision?.state === "blocked-archive") {
    return { tone: "restricted", label: "Reference only", actionLabel: "Request review", detail: decision.summary };
  }
  if (decision?.state === "blocked-rights") {
    return { tone: "review", label: "Rights review needed", actionLabel: "Request rights review", detail: decision.summary };
  }
  if (decision?.state === "blocked-people-minors") {
    return { tone: "review", label: "People/youth review", actionLabel: "Request review", detail: decision.summary };
  }
  if (decision?.state === "blocked-reviewer-date") {
    return { tone: "review", label: "Review evidence needed", actionLabel: "Request review", detail: decision.summary };
  }
  if (decision?.state === "blocked-derivative") {
    return { tone: "review", label: "Approved copy missing", actionLabel: "Request approved copy", detail: decision.summary };
  }
  if (decision?.state === "blocked-source") {
    return { tone: "review", label: "Source check needed", actionLabel: "Request review", detail: decision.summary };
  }
  if (decision?.state === "blocked-sensitive") {
    return { tone: "review", label: "Sensitive review", actionLabel: "Request review", detail: decision.summary };
  }
  if (asset.status === "Approved Public" && asset.usageScope === "Public") {
    return { tone: "review", label: "Needs evidence", actionLabel: "Check use gate", detail: "Approval exists, but reuse evidence is incomplete." };
  }
  return { tone: "review", label: "Needs review", actionLabel: "Request review", detail: decision?.summary || "Reviewer confirmation is required before reuse." };
}

const navGroups = [
  {
    label: "LIBRARY",
    items: [
      { label: "Library", href: "/library", icon: LayoutGrid },
      { label: "Collections", href: "/collections", icon: Folder },
      { label: "Brand Kits", href: "/brand-hub", icon: Folder },
      { label: "Shared with me", href: "/library?view=shared", icon: Share2 },
      { label: "Favorites", href: "/library?view=favorites", icon: Check },
      { label: "Recent", href: "/recent-uploads", icon: Inbox },
      { label: "Trash", href: "/requests?filter=trash", icon: X }
    ]
  },
  {
    label: "GOVERNANCE",
    items: [
      { label: "Metadata & Brand Governance", href: "/governance/metadata-health", icon: UserCog },
      { label: "Review", href: "/review", icon: ShieldCheck, guard: canReview },
      { label: "Requests", href: "/requests", icon: Inbox }
    ]
  },
  {
    label: "SAVED VIEWS",
    items: [
      { label: "Campaign 2024", href: "/library?view=campaign-2024", icon: Folder },
      { label: "Website", href: "/library?view=website", icon: Folder },
      { label: "Product shots", href: "/library?view=product-shots", icon: Folder },
      { label: "Need review", href: "/library?view=need-review", icon: Folder },
      { label: "Expiring soon", href: "/library?view=expiring-soon", icon: Folder },
      { label: "Rights issues", href: "/library?view=rights-issues", icon: Folder },
      { label: "External sharing", href: "/library?view=external-sharing", icon: Folder }
    ]
  },
  {
    label: "SETTINGS",
    items: [
      { label: "Admin", href: "/admin", icon: Settings, guard: canAdmin }
    ]
  }
] satisfies Array<{
  label: string;
  items: Array<{ label: string; href: string; icon: typeof LayoutGrid; guard?: (role: DemoRole) => boolean }>;
}>;

const mobileNav = [
  { label: "Library", href: "/library", icon: LayoutGrid },
  { label: "Collections", href: "/collections", icon: Folder },
  { label: "Uploads", href: "/upload", icon: Upload, guard: canUpload },
  { label: "Roles", href: "/rehearsal", icon: UserCog },
  { label: "Review", href: "/review", icon: ShieldCheck, guard: canReview },
  { label: "Requests", href: "/requests", icon: Inbox },
  { label: "Admin", href: "/admin", icon: Settings, guard: canAdmin }
] satisfies Array<{ label: string; href: string; icon: typeof LayoutGrid; guard?: (role: DemoRole) => boolean }>;

function pathActive(pathname: string, href: string) {
  if (href === "/library") return pathname === "/" || pathname === "/library" || pathname.startsWith("/library/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Button({
  children,
  tone = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "ghost" }) {
  const variant = tone === "primary" ? "default" : tone === "ghost" ? "ghost" : "secondary";
  return (
    <ShadcnButton {...props} variant={variant} size="sm" className={cn(`proto-button is-${tone}`, className)}>
      {children}
    </ShadcnButton>
  );
}

function LinkButton({ children, href, tone = "secondary" }: { children: ReactNode; href: string; tone?: "primary" | "secondary" }) {
  const variant = tone === "primary" ? "default" : "secondary";
  return <Link className={cn(buttonVariants({ variant, size: "sm" }), `proto-button is-${tone}`)} href={href}>{children}</Link>;
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return <button type="button" className="proto-icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function localThumbnailRoute(src: string) {
  return src.startsWith("/api/assets/thumbnail/");
}

function assetImage(asset?: StockMediaAsset, variant: "card" | "detail" = "card") {
  if (!asset) return "";
  const src = variant === "detail"
    ? asset.imageUrls?.detail || asset.preview || asset.imageUrls?.card || asset.thumbnail || ""
    : asset.imageUrls?.card || asset.imageUrls?.small || asset.thumbnail || asset.preview || "";
  return src;
}

function protoStatus(asset?: StockMediaAsset) {
  if (!asset) return { label: "Draft", tone: "draft" };
  if (asset.status === "Approved Public" || asset.status === "Approved Internal") return { label: "Approved", tone: "approved" };
  if (asset.status === "Do Not Use") return { label: "Restricted", tone: "danger" };
  if (asset.status === "Searchable Archive") return { label: "Archive", tone: "draft" };
  const status = assetEnterpriseStatus(asset);
  if (status === "Draft") return { label: "Draft", tone: "draft" };
  return { label: "In Review", tone: "review" };
}

function downloadGateMessage(result: DownloadGateResponse) {
  if (result.allowed) {
    return `Approved-copy gate allowed. Audit ${result.auditId || "recorded"}${result.ticketExpiresAt ? `. Ticket expires ${result.ticketExpiresAt}` : ""}.`;
  }
  const reason = result.message || result.reason || result.requiredAction || "Approved copy is not available.";
  const nextStep = result.requiredAction || "request review";
  return `Approved-copy gate blocked: ${reason}. Next step: ${nextStep}.`;
}

function reviewRequestMessage(result: ReviewRequestResponse, showQueueReference: boolean) {
  if (!result.ok) return `Review request failed: ${result.error || "Reviewer queue did not accept this request."}`;
  const queueReference = result.pendingWriteId || result.pendingWrite?.id;
  const base = result.message || (result.requestRecorded ? "Review request sent to the media team." : "Review request queued for reviewer follow-up.");
  return `${base}${queueReference && showQueueReference ? ` Queue id: ${queueReference}.` : ""}`;
}

function reviewDecisionMessage(result: ReviewDecisionPayload) {
  if (result.error) return `Review blocked: ${result.error}`;
  const syncState = result.syncState || (result.resourceSpaceWritten ? "synced_to_resourcespace" : "queued");
  if (result.resourceSpaceWritten || syncState === "synced_to_resourcespace") {
    return `Source sync confirmed. Decision recorded and verified. State: ${syncState}.`;
  }
  if (result.queued || result.pendingWriteId) {
    return `Decision queued for media-team follow-up. Source library remains unchanged until sync is confirmed. State: ${syncState}${result.pendingWriteId ? ` · Queue id: ${result.pendingWriteId}` : ""}.`;
  }
  return result.message || "Review decision response received.";
}

function pendingWriteLabel(pending?: ReviewWriteRecordSummary) {
  if (!pending) return "No pending decision";
  if (pending.syncState === "synced_to_resourcespace") return "Synced";
  if (pending.syncState === "sync_failed" || pending.syncState === "conflict_detected") return "Needs follow-up";
  return "Queued";
}

function StatusPill({ asset, label, tone }: { asset?: StockMediaAsset; label?: string; tone?: string }) {
  const mapped = asset ? protoStatus(asset) : { label: label || "Draft", tone: tone || "draft" };
  const variant = mapped.tone === "danger" ? "destructive" : mapped.tone === "approved" ? "default" : "secondary";
  return <Badge variant={variant} className={`proto-status is-${mapped.tone}`}>{mapped.label}</Badge>;
}

function PrototypeLoadingState({ label }: { label: string }) {
  return (
    <div className="proto-loading" aria-busy="true" aria-live="polite">
      <Skeleton className="proto-loading-skeleton" />
      <span>{label}</span>
    </div>
  );
}

function PrototypeDetailRows({ rows }: { rows: Array<[string, string | number]> }) {
  return (
    <dl className="proto-detail-fact-list">
      {rows.map(([label, value], index) => (
        <div key={`${label}-${index}`}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PrototypeTruthRows({
  rows
}: {
  rows: Array<{ id: string; label: string; value: string; detail: string; tone: "ready" | "review" | "restricted" | "info" }>;
}) {
  return (
    <div className="proto-truth-row-list">
      {rows.map((row) => (
        <article className={`proto-truth-row is-${row.tone}`} key={row.id}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
          <p>{row.detail}</p>
        </article>
      ))}
    </div>
  );
}

function controlStateLabel(state: PublicPortalControlState) {
  if (state === "available") return "Allowed";
  if (state === "gated") return "Gate";
  return "Locked";
}

function portalAssetRef(asset: StockMediaAsset) {
  return `MEDIA-${asset.id}`;
}

function PortalRoleControls({ compact = false }: { compact?: boolean }) {
  const { role } = useDemoRole();
  const summary = publicPortalRoleSummary(role);
  const controls = publicPortalRoleControls(role);
  const visibleControls = compact ? controls.slice(0, 4) : controls;

  return (
    <section className={`proto-role-controls${compact ? " is-compact" : ""}`} aria-label="Role controls">
      <div className="proto-role-controls-head">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          <strong>{summary.title}</strong>
          <small>{summary.subtitle}</small>
        </span>
      </div>
      <div className="proto-role-control-list">
        {visibleControls.map((control) => (
          <div className={`proto-role-control is-${control.state}`} key={control.id}>
            <span>{control.label}</span>
            <strong>{controlStateLabel(control.state)}</strong>
            {!compact ? <small>{control.detail}</small> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function PortalSafeStrip({ role, total }: { role: DemoRole; total: number }) {
  const summary = publicPortalRoleSummary(role);

  return (
    <section className="proto-portal-strip" aria-label="Public-use portal status">
      <div className="proto-portal-strip-copy">
        <span className="proto-portal-eyebrow">Atlas media portal</span>
        <strong>TJC Media Portal</strong>
          <small>{total.toLocaleString()} role-safe records / source originals locked</small>
      </div>
      <div className="proto-portal-chip-row" aria-label="Portal guardrails">
        <span><ShieldCheck size={14} aria-hidden="true" />{summary.title}</span>
        <span><Download size={14} aria-hidden="true" />Approved copies</span>
        <span><LockKeyhole size={14} aria-hidden="true" />No source files</span>
      </div>
      <PortalRoleControls compact />
    </section>
  );
}

function PortalGuardrailRow({ role }: { role: DemoRole }) {
  const summary = publicPortalRoleSummary(role);

  return (
    <div className="proto-guardrail-row" aria-label="Role controls">
      <span><ShieldCheck size={13} aria-hidden="true" />{summary.title}</span>
      <span><Download size={13} aria-hidden="true" />Approved-copy gate</span>
      <span><LockKeyhole size={13} aria-hidden="true" />Source locked</span>
    </div>
  );
}

function AssetImage({ asset, variant = "card" }: { asset?: StockMediaAsset; variant?: "card" | "detail" }) {
  const src = assetImage(asset, variant);
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [previewAvailable, setPreviewAvailable] = useState(Boolean(src));

  useEffect(() => {
    let cancelled = false;
    setResolvedSrc(src);
    setPreviewAvailable(Boolean(src));
    if (!src || !localThumbnailRoute(src)) return;

    fetch(src, { headers: { Accept: "image/*" } })
      .then((response) => {
        if (cancelled) return;
        const previewMode = response.headers.get("X-TJC-Preview-Mode");
        if (!response.ok || previewMode === "generated-local-beta") {
          setPreviewAvailable(false);
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || !previewAvailable) {
    return (
      <div className="proto-image-fallback">
        <Eye size={18} />
        <span>Preview restricted</span>
      </div>
    );
  }
  return <img src={resolvedSrc} alt={asset?.thumbnailAlt || displayTitle(asset)} loading="lazy" onError={() => setPreviewAvailable(false)} />;
}

function assetMeta(asset: StockMediaAsset) {
  return [assetType(asset), asset.imageDimensions, formatBytes(asset.fileSizeBytes)].filter((item) => item && item !== "Not provided").join(" / ");
}

function prototypeDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function prototypePerson(asset: StockMediaAsset) {
  return asset.sourceAccount || asset.reviewer || "Taylor Morgan";
}

function prototypeCaption(asset: StockMediaAsset) {
  return asset.usageGuidance || asset.rightsNotes || "Hero image for campaign use. Reviewer-controlled record with approved-copy downloads separated from source access.";
}

function prototypeExpiration(asset: StockMediaAsset) {
  return prototypeDate(asset.rightsExpirationDate || asset.expirationDate || asset.expirationOrRecheckDate || asset.approvalRecheckDate);
}

function prototypeChannelLabel(channel: ApprovedChannel) {
  const labels: Record<ApprovedChannel, string> = {
    website: "Web",
    livestream: "Livestream",
    projection: "Projection",
    "choir-upload": "Choir",
    print: "Print",
    social: "Social",
    "internal-training": "Internal",
    "limited-share-link": "Share link",
    "archive-only": "Archive"
  };
  return labels[channel] || channel;
}

function prototypeAllowedChannels(asset: StockMediaAsset) {
  const channels = asset.approvedChannels?.filter((channel) => channel !== "archive-only").map(prototypeChannelLabel) || [];
  return channels.length ? channels : ["Web", "Social", "Email", "Print", "In-store", "OOH", "TV", "Paid ads"];
}

function prototypeLicenseLabel(asset: StockMediaAsset) {
  if (asset.rightsBasis === "TJC-owned") return "Owned";
  if (asset.rightsBasis === "contributor-license") return "Contributor license";
  if (asset.rightsBasis === "public-domain") return "Public domain";
  return asset.rightsStatus || "Royalty-free";
}

function PrototypeSidebar() {
  const pathname = usePathname();
  const { role } = useDemoRole();
  return (
    <aside className="proto-sidebar" aria-label="Primary navigation">
      <div className="proto-sidebar-logo-row">
        <Link href={routeWithRole("/library", role)} className="proto-mark" aria-label="Library home">
          <span />
        </Link>
        <div className="proto-sidebar-brand">
          <strong>Atlas DAM</strong>
          <small>Media portal</small>
        </div>
        <button type="button" className="proto-collapse" aria-label="Collapse sidebar"><PanelLeftClose size={15} /></button>
      </div>
      <nav className="proto-sidebar-nav">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => !item.guard || item.guard(role));
          if (!items.length) return null;
          return (
            <section key={group.label}>
              <h2>{group.label}</h2>
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathActive(pathname, item.href);
                return (
                  <Link key={item.href} href={routeWithRole(item.href, role)} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </section>
          );
        })}
      </nav>
      <div className="proto-user-card">
        <span className="proto-avatar">TM</span>
        <span><strong>Taylor Morgan</strong><small>{role}</small></span>
        <ChevronDown size={14} />
      </div>
    </aside>
  );
}

function PrototypeMobileBars() {
  const pathname = usePathname();
  const { role } = useDemoRole();
  const visibleMobileNav = mobileNav.filter((item) => !item.guard || item.guard(role));
  return (
    <>
      <header className="proto-mobile-top">
        <strong>{pathname.startsWith("/upload") ? "Upload" : pathname.startsWith("/review") ? "Review" : pathname.startsWith("/requests") ? "Requests" : pathname.startsWith("/collections") ? "Open albums" : "Library"}</strong>
        <IconButton label="Notifications"><Bell size={17} /></IconButton>
      </header>
      <nav
        className="proto-mobile-bottom"
        style={{ gridTemplateColumns: `repeat(${visibleMobileNav.length}, minmax(0, 1fr))` }}
        aria-label="Mobile navigation"
      >
        {visibleMobileNav.map((item) => {
          const Icon = item.icon;
          const active = pathActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={routeWithRole(item.href, role)}
              className={active ? "is-active" : ""}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function PrototypeDamShell({ children }: { children: ReactNode }) {
  return (
    <div className="proto-root">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="proto-app-shell">
        <PrototypeSidebar />
        <main id="main-content" className="proto-main">{children}</main>
      </div>
      <PrototypeMobileBars />
      <BetaPrototypeTools />
      <Toaster position="bottom-center" toastOptions={{ className: "proto-toast" }} />
    </div>
  );
}

function ToolbarSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="proto-search">
      <Search size={16} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search assets, tags, collections..." />
      <kbd>⌘K</kbd>
    </label>
  );
}

function PrototypeAssetCard({
  asset,
  selected,
  onSelect,
  active,
  onInspect,
  mode,
  matchedBecause = []
}: {
  asset: StockMediaAsset;
  selected: boolean;
  onSelect: () => void;
  active: boolean;
  onInspect: () => void;
  mode: LibraryMode;
  matchedBecause?: string[];
}) {
  const reuseState = assetUseState(asset);
  return (
    <article className={`proto-asset-card is-${mode} ${active ? "is-active" : ""}`} onClick={onInspect}>
      <div className="proto-asset-image">
        <AssetImage asset={asset} />
        <button
          type="button"
          className={`proto-card-check ${selected ? "is-checked" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          aria-label={`${selected ? "Deselect" : "Select"} ${displayTitle(asset)}`}
        >
          {selected ? <Check size={13} /> : null}
        </button>
        <StatusPill asset={asset} />
      </div>
      <div className="proto-asset-copy">
        <strong>{displayTitle(asset)}</strong>
        <span>{assetMeta(asset) || `${assetType(asset)} · ${asset.collection}`}</span>
        <span className={`proto-card-use is-${reuseState.tone}`}>{reuseState.label}</span>
        {matchedBecause.length ? (
          <div className="proto-match-chips">
            <small>Matched because</small>
            <div>
              {matchedBecause.map((chip) => <span key={`${asset.id}-${chip}`}>{chip}</span>)}
            </div>
          </div>
        ) : null}
        {mode === "ops" ? (
          <dl className="proto-card-ops-meta">
            <div><dt>Status</dt><dd>{asset.status}</dd></div>
            <div><dt>Use gate</dt><dd>{reuseState.label}</dd></div>
            <div><dt>Owner</dt><dd>{asset.sourceAccount || asset.reviewer || "Media team"}</dd></div>
            <div><dt>Expires</dt><dd>{asset.rightsExpirationDate || asset.expirationDate || "Not set"}</dd></div>
          </dl>
        ) : null}
      </div>
    </article>
  );
}

function PrototypeAssetInspector({ asset, index, total, onClose }: { asset?: StockMediaAsset; index: number; total: number; onClose?: () => void }) {
  const { role } = useDemoRole();
  const [tab, setTab] = useState<ProtoTab>("details");
  const [message, setMessage] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [downloadCenterOpen, setDownloadCenterOpen] = useState(false);
  const [rightsExplanationOpen, setRightsExplanationOpen] = useState(false);
  const gate = useDownloadGate(asset?.id || "", role);
  const reviewRequest = useReviewRequest(asset?.id || "", role);
  const detail = useAssetDetail(asset?.id || "", role);
  const displayAsset = detail.data?.asset || asset;
  const elevatedRole = canReview(role);
  const reuseState = displayAsset ? assetUseState(displayAsset) : undefined;

  async function download() {
    if (!displayAsset || actionPending) return;
    setActionPending(true);
    setMessage("Checking approved-copy gate...");
    try {
      const payload = await gate.requestDownload({ reason: `Approved-copy request for ${displayTitle(displayAsset)}` });
      setMessage(downloadGateMessage(payload));
      if (payload.allowed && payload.downloadUrl) {
        window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setMessage(`Approved-copy gate failed: ${error instanceof Error ? error.message : "request failed"}.`);
    } finally {
      setActionPending(false);
    }
  }

  async function requestReview() {
    if (!displayAsset || actionPending) return;
    setActionPending(true);
    setMessage("Sending review request...");
    try {
      const payload = await reviewRequest.requestReview({
        notes: `Atlas portal request for ${displayTitle(displayAsset)}. Reason: ${displayAsset.reuseDecision?.summary || displayAsset.status || "Usage decision requires reviewer confirmation."}`
      });
      setMessage(reviewRequestMessage(payload, elevatedRole));
      if (payload.ok) detail.refresh();
    } catch (error) {
      setMessage(`Review request failed: ${error instanceof Error ? error.message : "request failed"}.`);
    } finally {
      setActionPending(false);
    }
  }

  if (!displayAsset) {
    return (
      <aside className="proto-inspector" aria-label="Asset inspector">
        <div className="proto-inspector-nav">
          <div>
            <strong>Asset inspector</strong>
            <span>Metadata / rights / activity</span>
          </div>
        </div>
        <div className="proto-inspector-body">
          <p className="proto-muted">Select an asset.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="proto-inspector" aria-label="Asset inspector">
      <div className="proto-inspector-nav">
        <div>
          <strong>Asset inspector</strong>
          <span>{index + 1} of {total.toLocaleString()} / metadata / rights / activity</span>
        </div>
        <div className="proto-inspector-nav-controls">
          <ChevronLeft size={15} />
          <ChevronRight size={15} />
          <button type="button" onClick={onClose} aria-label="Close inspector"><X size={15} /></button>
        </div>
      </div>
      <div className="proto-inspector-body">
        <div className="proto-inspector-thumb"><AssetImage asset={displayAsset} /></div>
        <div className="proto-inspector-head">
          <div>
            <h2>{displayTitle(displayAsset)}</h2>
            <p>{assetMeta(displayAsset) || assetRecordRef(displayAsset)}</p>
          </div>
          <StatusPill asset={displayAsset} />
        </div>
        <span className={`proto-card-use is-${reuseState?.tone || "review"}`}>{reuseState?.label || "Needs review"}</span>
        <p>Uploaded {displayAsset.importDate || displayAsset.capturedDate || "date pending"} by {displayAsset.sourceAccount || displayAsset.reviewer || "media team"}</p>
        {detail.loading ? <p className="proto-gate-note">Loading asset details from Atlas library...</p> : null}
        {detail.error ? <p className="proto-gate-note">Asset detail unavailable: {detail.error}</p> : null}
        <div className="proto-action-row">
          <button type="button" onClick={() => void download()} disabled={actionPending}><Download size={16} /><span>{reuseState?.actionLabel || "Check use gate"}</span></button>
          <button type="button" onClick={() => void requestReview()} disabled={actionPending}><Share2 size={16} /><span>{reuseState?.tone === "ready" ? "Request usage" : "Request review"}</span></button>
          <Link href={routeWithRole(`/assets/${displayAsset.id}`, role)}><Eye size={16} /><span>Preview</span></Link>
          <button type="button" onClick={() => setDownloadCenterOpen(true)}>
            <Download size={16} />
            <span>Download Center</span>
          </button>
        </div>
        <Button className="w-full justify-start" onClick={() => setRightsExplanationOpen(true)}><ShieldCheck size={14} />Why can I use this?</Button>
        <PortalGuardrailRow role={role} />
        <Separator className="proto-separator" />
        <div className="proto-tabs">
          {(["details", "metadata", "activity"] as ProtoTab[]).map((item) => (
            <button key={item} className={tab === item ? "is-active" : ""} type="button" onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}</button>
          ))}
        </div>
        {tab === "details" ? (
          <div className="proto-detail-stack">
            <section><h3>Description</h3><p>{displayAsset.usageGuidance || displayAsset.rightsNotes || "Review-safe Atlas library record."}</p></section>
            <section><h3>Tags</h3><div className="proto-tag-row">{(displayAsset.tags || displayAsset.tjcTerms || ["review", "media"]).slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}{elevatedRole ? <span>+ Add tag</span> : null}</div></section>
            <section><h3>Rights & Usage</h3><p>{reuseState?.label || "Needs review"}. {reuseState?.detail || "Reviewer evidence required before public use."}</p></section>
            <section><h3>Collections</h3><div className="proto-tag-row"><span>{displayAsset.collection}</span>{displayAsset.eventName ? <span>{displayAsset.eventName}</span> : null}</div></section>
            <section><h3>Version</h3><p>{displayAsset.pendingReviewWrite ? `Pending review sync: ${displayAsset.pendingReviewWrite.syncState}` : "Current record. Version history is not exported in this local detail payload."}</p></section>
            <section><h3>Source file</h3><p>{elevatedRole && displayAsset.originalFilename ? displayAsset.originalFilename : "Restricted source/master"} / source access stays audited</p></section>
            <section><h3>Related files</h3><p>{detail.data?.related?.length ? `${detail.data.related.length} role-visible related file${detail.data.related.length === 1 ? "" : "s"}` : "No related role-visible files exported for this record."}</p></section>
          </div>
        ) : tab === "metadata" ? (
          <dl className="proto-dl">
            <div><dt>{elevatedRole ? "Source record" : "Portal ref"}</dt><dd>{elevatedRole ? displayAsset.resourceSpaceId || assetRecordRef(displayAsset) : portalAssetRef(displayAsset)}</dd></div>
            <div><dt>Source</dt><dd>{elevatedRole ? displayAsset.sourceSystem || displayAsset.sourcePlatform || "Atlas library" : "Portal safe lane"}</dd></div>
            <div><dt>People</dt><dd>{displayAsset.peopleRisk || "Unknown"}</dd></div>
            <div><dt>Review</dt><dd>{displayAsset.reviewedDate || "Pending"}</dd></div>
          </dl>
        ) : (
          <div className="proto-detail-stack">
            <p>Import recorded. Review evidence and sync state remain governed by library policy.</p>
            <p>{displayAsset.pendingReviewWrite ? `Pending sync: ${displayAsset.pendingReviewWrite.syncState}` : "No pending review sync."}</p>
            {detail.data?.related?.length ? <p>{detail.data.related.length} related library item{detail.data.related.length === 1 ? "" : "s"} available.</p> : null}
          </div>
        )}
        {message ? <p className="proto-gate-note">{message}</p> : null}
      </div>
      <DownloadCenterDrawer
        open={downloadCenterOpen}
        onClose={() => setDownloadCenterOpen(false)}
        asset={displayAsset}
        role={role}
        description="Approved-copy rows, request-needed renditions, add-ons, and source-file separation for this record."
      />
      <RightsExplanationDrawer
        open={rightsExplanationOpen}
        onClose={() => setRightsExplanationOpen(false)}
        asset={displayAsset}
        role={role}
        description="Role-safe explanation of the current reuse answer for this record."
      />
    </aside>
  );
}
export function PrototypeLibraryPage() {
  const { role } = useDemoRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [sort, setSort] = useState<CatalogSort>(() => normalizePrototypeSort(searchParams.get("sort")));
  const [limit, setLimit] = useState(() => readPrototypePageLimit(searchParams.get("limit")));
  const [offset, setOffset] = useState(() => readPrototypeOffset(searchParams.get("offset")));
  const [mode, setMode] = useState<LibraryMode>(() => readLibraryMode(searchParams.get("mode")));
  const [rightsSafe, setRightsSafe] = useState(() => readBooleanUrlFlag(searchParams.get("rightsSafe")));
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inspectorClosed, setInspectorClosed] = useState(false);
  const results = useAssetsSearch({ role, query, sort, limit, offset, rightsSafe });
  const assets = results.data?.assets || [];
  const rightsSafeSummary = results.data?.rightsSafe;
  const searchDiscovery = results.data?.discovery;
  const visibleAssetIds = useMemo(() => assets.map((asset) => asset.id), [assets]);
  const visibleAssetIdSet = useMemo(() => new Set(visibleAssetIds), [visibleAssetIds]);
  const activeAsset = results.loading || inspectorClosed ? undefined : assets.find((asset) => asset.id === activeId) || assets[0];
  const total = results.data?.total ?? 0;
  const pagination = results.data?.pagination;
  const pageLimit = pagination?.limit ?? limit;
  const pageOffset = pagination?.offset ?? offset;
  const rangeStart = pagination?.rangeStart ?? 0;
  const rangeEnd = pagination?.rangeEnd ?? 0;
  const currentPage = total ? Math.floor(pageOffset / Math.max(1, pageLimit)) + 1 : 1;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageLimit)));
  const showSearchInspector = !activeAsset && Boolean(query.trim());
  const pageSummary = results.loading
    ? "Loading results"
    : total
      ? `Showing ${rangeStart.toLocaleString()}-${rangeEnd.toLocaleString()} of ${total.toLocaleString()} / Page ${currentPage.toLocaleString()} of ${totalPages.toLocaleString()}`
      : "No matching assets";

  useEffect(() => {
    const params = new URLSearchParams(searchParamString);
    const nextQuery = params.get("q") || "";
    const nextSort = normalizePrototypeSort(params.get("sort"));
    const nextLimit = readPrototypePageLimit(params.get("limit"));
    const nextOffset = readPrototypeOffset(params.get("offset"));
    const nextMode = readLibraryMode(params.get("mode"));
    const nextRightsSafe = readBooleanUrlFlag(params.get("rightsSafe"));

    setQuery((current) => current === nextQuery ? current : nextQuery);
    setSort((current) => current === nextSort ? current : nextSort);
    setLimit((current) => current === nextLimit ? current : nextLimit);
    setOffset((current) => current === nextOffset ? current : nextOffset);
    setMode((current) => current === nextMode ? current : nextMode);
    setRightsSafe((current) => current === nextRightsSafe ? current : nextRightsSafe);
  }, [searchParamString]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamString);
    if (query.trim()) params.set("q", query);
    else params.delete("q");
    params.set("sort", sort);
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (mode === "ops") params.set("mode", "ops");
    else params.delete("mode");
    if (rightsSafe) params.set("rightsSafe", "1");
    else params.delete("rightsSafe");

    const nextSearch = params.toString();
    if (nextSearch !== searchParamString) {
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
    }
  }, [limit, mode, offset, pathname, query, rightsSafe, router, searchParamString, sort]);

  useEffect(() => {
    if (results.loading) return;
    if (!assets.length) {
      if (activeId) setActiveId(null);
      return;
    }
    if (mode === "ops" && (!activeId || !visibleAssetIdSet.has(activeId))) setActiveId(assets[0].id);
    if (mode === "browse" && activeId && !visibleAssetIdSet.has(activeId)) setActiveId(null);
  }, [activeId, assets, mode, results.loading, visibleAssetIdSet]);

  useEffect(() => {
    if (results.loading) return;
    setSelected((current) => {
      if (!current.size) return current;
      const next = new Set(Array.from(current).filter((id) => visibleAssetIdSet.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [results.loading, visibleAssetIdSet]);

  useEffect(() => {
    if (results.loading || !pagination || total <= 0) return;
    const lastOffset = Math.max(0, Math.floor((total - 1) / Math.max(1, pageLimit)) * pageLimit);
    if (pageOffset > lastOffset) setOffset(lastOffset);
  }, [pageLimit, pageOffset, pagination, results.loading, total]);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setOffset(0);
    setActiveId(null);
    setInspectorClosed(false);
  }, []);

  const updateSort = useCallback((value: CatalogSort) => {
    setSort(value);
    setOffset(0);
    setActiveId(null);
    setInspectorClosed(false);
  }, []);

  const updateMode = useCallback((value: LibraryMode) => {
    setMode(value);
    setActiveId(null);
    setInspectorClosed(false);
  }, []);

  const updateRightsSafe = useCallback((checked: boolean) => {
    setRightsSafe(checked);
    setOffset(0);
    setActiveId(null);
    setSelected(new Set<string>());
    setInspectorClosed(false);
  }, []);

  const goToOffset = useCallback((nextOffset: number) => {
    setOffset(Math.max(0, nextOffset));
    setActiveId(null);
    setInspectorClosed(false);
  }, []);

  return (
    <div className={`proto-library-page is-${mode}${activeAsset || showSearchInspector ? " has-inspector" : ""}`}>
      <section className="proto-library-workspace">
        <header className="proto-library-header">
          <div className="proto-title-row">
            <h1>Library</h1>
            <span>{results.loading ? "Loading assets" : `${total.toLocaleString()} assets`}</span>
          </div>
          <ToolbarSearch value={query} onChange={updateQuery} />
          <div className="proto-header-actions">
            <div className="proto-mode-toggle" aria-label="Library mode">
              <button type="button" className={mode === "browse" ? "is-active" : ""} onClick={() => updateMode("browse")}>Browse</button>
              <button type="button" className={mode === "ops" ? "is-active" : ""} onClick={() => updateMode("ops")}>Ops</button>
            </div>
            <label className={`proto-rights-safe-toggle${rightsSafe ? " is-active" : ""}`}>
              <input type="checkbox" checked={rightsSafe} onChange={(event) => updateRightsSafe(event.target.checked)} />
              <span><ShieldCheck size={14} aria-hidden="true" />{rightsSafeToggleLabel(role, mode)}</span>
            </label>
            <Button onClick={() => toast.message("Saved search stays local to this browser. Durable alerts are not configured.")}>Save search <ChevronDown size={14} /></Button>
            <Button onClick={() => toast.message("Filters use current ResourceSpace search facets.")}><SlidersHorizontal size={15} />Filters</Button>
            <LinkButton href={routeWithRole(canUpload(role) ? "/upload" : "/requests", role)} tone="primary">{publicPortalActionLabel(role)} <ChevronDown size={14} /></LinkButton>
          </div>
        </header>
        <div className="proto-toolbar">
          <label className="proto-checkbox-label"><input type="checkbox" checked={selected.size > 0 && selected.size === assets.length} onChange={() => setSelected(selected.size === assets.length ? new Set() : new Set(visibleAssetIds))} /> <span>{selected.size} selected</span></label>
          <Button onClick={() => {
            const firstSelected = Array.from(selected)[0];
            if (firstSelected) setActiveId(firstSelected);
            toast.message(firstSelected ? "Open asset inspector to run the approved-copy gate." : "Select an asset to run the approved-copy gate.");
          }}>Download</Button>
          <Button onClick={() => toast.message("Share links require item approval. Open an asset to request review or approved-copy access.")}>Share</Button>
          {canReview(role)
            ? <Button onClick={() => toast.message("Collection writes are not enabled in this local demo yet.")}>Add to collection</Button>
            : <Button onClick={() => {
              const firstSelected = Array.from(selected)[0];
              if (firstSelected) setActiveId(firstSelected);
              toast.message(firstSelected ? "Open asset inspector to send the review request." : "Select an asset to send a review request.");
            }}>Request review</Button>}
          {canReview(role) ? <Button>More <ChevronDown size={14} /></Button> : null}
          <div className="proto-toolbar-spacer" />
          <span className="proto-sort" aria-live="polite">{pageSummary}</span>
          <Button className="proto-desktop-page-button" disabled={results.loading || !pagination?.hasPrevious} onClick={() => goToOffset(pagination?.previousOffset ?? Math.max(offset - limit, 0))}><ChevronLeft size={14} />Prev</Button>
          <Button className="proto-desktop-page-button" disabled={results.loading || !pagination?.hasNext} onClick={() => goToOffset(pagination?.nextOffset ?? offset + limit)}>Next <ChevronRight size={14} /></Button>
          <Button
            className="proto-sort"
            aria-label="Sort assets"
            onClick={() => updateSort(prototypeSortOptions[(prototypeSortOptions.indexOf(sort) + 1) % prototypeSortOptions.length])}
          >
            Sort: {sort} <ChevronDown size={14} />
          </Button>
          <IconButton label="Grid view"><LayoutGrid size={16} /></IconButton>
          <IconButton label="List view"><List size={16} /></IconButton>
        </div>
        <div className="proto-library-mode-note">
          {mode === "browse" ? (
            <>
              <strong>Browse mode</strong>
              <span>Image-first discovery. Select an asset to open the safe inspector.</span>
            </>
          ) : (
            <>
              <strong>Ops mode</strong>
              <span>Management view with filenames, rights, ownership, expiration, and batch gates.</span>
            </>
          )}
        </div>
        {rightsSafe ? (
          <div className="proto-rights-safe-summary" role="status" aria-live="polite">
            <div>
              <strong>{rightsSafeToggleLabel(role, mode)}</strong>
              <span>{rightsSafeSummary?.explanation || "Filtering results to assets cleared for normal public reuse."}</span>
            </div>
            <div className="proto-rights-safe-counts">
              <span>{(rightsSafeSummary?.totalAfter ?? total).toLocaleString()} shown</span>
              <span>{(rightsSafeSummary?.hidden ?? 0).toLocaleString()} hidden</span>
            </div>
            {rightsSafeSummary?.hiddenReasons?.length ? (
              <div className="proto-rights-safe-reasons">
                {rightsSafeSummary.hiddenReasons.slice(0, 4).map((reason) => <span key={reason.label}>{reason.count} {reason.label}</span>)}
              </div>
            ) : null}
          </div>
        ) : null}
        {results.data ? (
          <section className="proto-search-intelligence" aria-label="Search intelligence">
            <div className="proto-search-summary-card">
              <strong>Search intelligence</strong>
              <p>{searchDiscovery?.summary || "Search uses current metadata and rights-safe ranking."}</p>
              <small>{rightsSafeSummary?.explanation || searchDiscovery?.safetyNote || "Search suggestions never override item-level permission truth."}</small>
              {searchDiscovery?.expandedTerms?.length ? (
                <div className="proto-tag-row">
                  {searchDiscovery.expandedTerms.slice(0, 5).map((term) => <span key={`expanded-${term}`}>{term}</span>)}
                </div>
              ) : null}
            </div>
            <div className="proto-search-summary-card">
              <strong>Queue shortcuts</strong>
              <div className="proto-tag-row">
                {(searchDiscovery?.suggestedFilters || []).slice(0, 4).map((item) => <span key={`filter-${item.filter}`}>{item.label} · {item.count}</span>)}
              </div>
              {searchDiscovery?.noResultHelp ? <small>{searchDiscovery.noResultHelp.guidance}</small> : <small>{searchDiscovery?.scoreHint || "Ranking prefers metadata matches, ready assets, and preview-safe records."}</small>}
            </div>
            <div className="proto-search-summary-card">
              <strong>Visual similarity</strong>
              <p>Not configured for this source.</p>
              <small>Do not infer lookalikes or AI clusters until backed by real similarity data.</small>
            </div>
            <div className="proto-search-summary-card">
              <strong>AI tags</strong>
              <p>Not configured for this source.</p>
              <small>Only exported tags, TJC terms, and rights-safe decisions are used right now.</small>
            </div>
          </section>
        ) : null}
        <div className="proto-mobile-pagination" aria-label="Library pagination">
          <span>{pageSummary}</span>
          <div>
            <Button disabled={results.loading || !pagination?.hasPrevious} onClick={() => goToOffset(pagination?.previousOffset ?? Math.max(offset - limit, 0))}><ChevronLeft size={14} />Prev</Button>
            <Button disabled={results.loading || !pagination?.hasNext} onClick={() => goToOffset(pagination?.nextOffset ?? offset + limit)}>Next <ChevronRight size={14} /></Button>
          </div>
        </div>
        <div className="proto-asset-grid">
          {results.loading ? <PrototypeLoadingState label="Loading library..." /> : results.error ? <div className="proto-error">{results.error}</div> : assets.length ? (
            assets.map((asset) => (
              <PrototypeAssetCard
                key={asset.id}
                asset={asset}
                selected={selected.has(asset.id)}
                active={activeAsset?.id === asset.id}
                onSelect={() => toggle(asset.id)}
                onInspect={() => {
                  setActiveId(asset.id);
                  setInspectorClosed(false);
                }}
                mode={mode}
                matchedBecause={mode === "browse" ? matchedBecauseChips(asset, query, searchDiscovery || {
                  mode: "browse",
                  summary: "",
                  expandedTerms: [],
                  intentPresets: [],
                  suggestedFilters: [],
                  scoreHint: "",
                  rankingExplanation: [],
                  safetyNote: ""
                }, rightsSafe) : []}
              />
            ))
          ) : (
            <div className="proto-empty-state is-quiet">
              <strong>{searchDiscovery?.noResultHelp?.title || "No matching assets"}</strong>
              <span>{rightsSafe ? "No assets are cleared for current use from these results. Turn off rights-safe mode to inspect review-gated records, or request reviewer help." : searchDiscovery?.noResultHelp?.guidance || "Atlas library search returned no records for this query."}</span>
              <div className="proto-tag-row">
                {(searchDiscovery?.noResultHelp?.querySuggestions || []).slice(0, 3).map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => updateQuery(suggestion)}>{suggestion}</button>
                ))}
                {(searchDiscovery?.noResultHelp?.savedViews || []).slice(0, 2).map((view) => (
                  <Link key={view.id} href={routeWithRole(`/?view=${view.id}`, role)}>{view.label}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      {activeAsset ? (
        <PrototypeAssetInspector
          asset={activeAsset}
          index={Math.max(0, assets.findIndex((asset) => asset.id === activeAsset?.id))}
          total={total}
          onClose={() => {
            setActiveId(null);
            setInspectorClosed(true);
          }}
        />
      ) : showSearchInspector ? (
        <aside className="proto-inspector" aria-label="Search intelligence inspector">
          <div className="proto-inspector-nav">
            <div>
              <strong>Search intelligence</strong>
              <span>Query / rights-safe / suggestions</span>
            </div>
          </div>
          <div className="proto-inspector-body">
            <div className="proto-detail-stack">
              <section>
                <h3>Query</h3>
                <p>{query}</p>
              </section>
              <section>
                <h3>Result summary</h3>
                <p>{searchDiscovery?.summary || `Found ${total.toLocaleString()} matching assets from current metadata.`}</p>
              </section>
              <section>
                <h3>Rights-safe layer</h3>
                <div className="proto-tag-row">
                  <span>{rightsSafe ? "Rights-safe only" : "All visible records"}</span>
                  <span>{(rightsSafeSummary?.totalAfter ?? total).toLocaleString()} shown</span>
                  <span>{(rightsSafeSummary?.hidden ?? 0).toLocaleString()} hidden</span>
                </div>
                <p>{rightsSafeSummary?.explanation || searchDiscovery?.safetyNote || "Search does not override item-level rights, people, source, or approved-copy gates."}</p>
              </section>
              <section>
                <h3>Matched because</h3>
                <div className="proto-tag-row">
                  {(searchDiscovery?.expandedTerms?.length ? searchDiscovery.expandedTerms : ["outdoor", "hero", "approved", "web", "social"]).slice(0, 6).map((term) => <span key={term}>{term}</span>)}
                </div>
              </section>
              <section>
                <h3>Suggestions</h3>
                <div className="proto-tag-row">
                  {(searchDiscovery?.noResultHelp?.querySuggestions || ["spring campaign hero", "web-safe outdoor lifestyle", "expiring soon"]).slice(0, 4).map((suggestion) => <button key={suggestion} type="button" onClick={() => updateQuery(suggestion)}>{suggestion}</button>)}
                </div>
              </section>
            </div>
          </div>
        </aside>
      ) : null}
      {activeAsset ? <MobileAssetSheet asset={activeAsset} /> : null}
    </div>
  );
}

function MobileAssetSheet({ asset }: { asset: StockMediaAsset }) {
  const { role } = useDemoRole();
  const gate = useDownloadGate(asset.id, role);
  const reviewRequest = useReviewRequest(asset.id, role);
  const detail = useAssetDetail(asset.id, role);
  const displayAsset = detail.data?.asset || asset;
  const [message, setMessage] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const elevatedRole = canReview(role);

  async function download() {
    if (actionPending) return;
    setActionPending(true);
    setMessage("Checking approved-copy gate...");
    try {
      const payload = await gate.requestDownload({ reason: `Approved-copy request for ${displayTitle(displayAsset)}` });
      setMessage(downloadGateMessage(payload));
      if (payload.allowed && payload.downloadUrl) {
        window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setMessage(`Approved-copy gate failed: ${error instanceof Error ? error.message : "request failed"}.`);
    } finally {
      setActionPending(false);
    }
  }

  async function requestReview() {
    if (actionPending) return;
    setActionPending(true);
    setMessage("Sending review request...");
    try {
      const payload = await reviewRequest.requestReview({
        notes: `Atlas mobile portal request for ${displayTitle(displayAsset)}. Reason: ${displayAsset.reuseDecision?.summary || displayAsset.status || "Usage decision requires reviewer confirmation."}`
      });
      setMessage(reviewRequestMessage(payload, elevatedRole));
      if (payload.ok) detail.refresh();
    } catch (error) {
      setMessage(`Review request failed: ${error instanceof Error ? error.message : "request failed"}.`);
    } finally {
      setActionPending(false);
    }
  }

  return (
    <aside className="proto-mobile-sheet">
      <div className="proto-mobile-sheet-head">
        <div className="proto-mobile-thumb"><AssetImage asset={displayAsset} /></div>
        <div><strong>{displayTitle(displayAsset)}</strong><StatusPill asset={displayAsset} /><span>{assetMeta(displayAsset)}</span>{detail.loading ? <em className="proto-mobile-sheet-note">Loading details...</em> : null}{message ? <em className="proto-mobile-sheet-note">{message}</em> : null}</div>
        <button type="button" className="proto-mobile-sheet-icon" onClick={() => setMessage("Share stays gated by item approval and role.")} aria-label="Share selected asset"><Share2 size={16} /></button>
      </div>
      <Separator className="proto-separator" />
      <div className="proto-tabs"><button className="is-active">Details</button><button>Activity</button></div>
      <div className="proto-action-row">
        <button type="button" onClick={() => void download()} disabled={actionPending}><Download size={16} /><span>Download approved copy</span></button>
        <button type="button" onClick={() => void requestReview()} disabled={actionPending}><Share2 size={16} /><span>Request</span></button>
        <Link href={routeWithRole(`/assets/${displayAsset.id}`, role)}><Eye size={16} /><span>Preview</span></Link>
        <button type="button" onClick={() => setMessage(elevatedRole ? "Source access remains audited and scoped." : "Source/original files remain restricted.")}>
          {elevatedRole ? <MoreHorizontal size={16} /> : <LockKeyhole size={16} />}
          <span>{elevatedRole ? "More" : "Locked"}</span>
        </button>
      </div>
    </aside>
  );
}

export function PrototypeUploadIntake() {
  const { role } = useDemoRole();
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    eventName: "",
    sourceLink: "",
    ministry: "",
    source: "",
    location: "",
    usageRights: "Unknown - reviewer verifies",
    eventDate: "",
    tags: "",
    peopleVisible: "Unknown",
    minorsVisible: "Unknown",
    doctrineSacramentSensitive: "Unknown",
    hymnMusicPresent: "Unknown",
    notes: ""
  });
  const [message, setMessage] = useState("");
  const canSend = canUpload(role);
  const hasMedia = files.length > 0 || Boolean(form.sourceLink.trim());
  const canSubmit = canSend && hasMedia;
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const largeOrMediaFiles = files.filter((file) => {
    const name = file.name.toLowerCase();
    return file.size > 100 * 1024 * 1024 || /^video\//i.test(file.type) || /^audio\//i.test(file.type) || /\.(mov|mp4|m4v|avi|mkv|mp3|wav|m4a|aac|flac)$/i.test(name);
  });
  const missingContext = [
    !hasMedia && "files or source link",
    !form.eventName.trim() && "event name",
    !form.eventDate.trim() && "event date",
    !form.ministry.trim() && "ministry/team",
    !form.source.trim() && "source/photographer"
  ].filter((item): item is string => Boolean(item));
  const intakeWarnings = [
    form.peopleVisible === "Unknown" && "People visibility reviewer confirmation",
    (form.minorsVisible === "Unknown" || form.minorsVisible === "Yes") && "Children/youth visibility reviewer confirmation",
    /unknown|needs review|reviewer verifies/i.test(form.usageRights) && "Rights reviewer verifies ownership/license",
    largeOrMediaFiles.length > 0 && "Large video/audio routes to admin intake",
    !form.tags.trim() && "Taxonomy reviewer maps tags",
    "ResourceSpace import/approval writeback remains pending"
  ].filter((item): item is string => Boolean(item));

  if (!canSend) {
    return (
      <section className="proto-flow-page">
        <div className="proto-flow-card">
          <h1>Upload / Intake</h1>
          <p>Sharing photos requires Contributor access.</p>
          <p className="proto-muted">Every imported asset defaults to Needs Review / Do Not Publish after contributor intake.</p>
        </div>
      </section>
    );
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const dropped = Array.from(event.dataTransfer.files || []);
    if (dropped.length) setFiles(dropped);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const data = new FormData();
    data.set("role", role);
    data.set("collection", form.eventName);
    data.set("eventName", form.eventName);
    data.set("sourceLink", form.sourceLink);
    data.set("ministry", form.ministry);
    data.set("usageRights", form.usageRights);
    data.set("source", form.source);
    data.set("location", form.location);
    data.set("eventDate", form.eventDate);
    data.set("tags", form.tags);
    data.set("notes", form.notes);
    data.set("intakeNotes", form.notes);
    data.set("peopleVisible", form.peopleVisible);
    data.set("minorsVisible", form.minorsVisible);
    data.set("doctrineSacramentSensitive", form.doctrineSacramentSensitive);
    data.set("hymnMusicPresent", form.hymnMusicPresent);
    data.set("approvalSuggestion", "Needs Review");
    files.forEach((file) => data.append("files", file));
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          [DAM_LOCAL_BETA_ROLE_HEADER]: role,
          [DAM_LOCAL_TRUSTED_ROLE_HEADER]: role
        },
        body: data
      });
      const payload = await response.json().catch(() => ({}));
      setMessage(response.ok
        ? `Intake ticket ${payload.requestRecordId || "recorded"} queued. Default state: ${payload.defaultReviewState || "Needs Review"} / ${payload.defaultUsageScope || "Do Not Publish"}. ResourceSpace written: ${payload.resourceSpaceWritten ? "yes" : "no"}.`
        : payload.message || payload.error || "Upload blocked.");
    } catch (error) {
      setMessage(`Upload intake failed: ${error instanceof Error ? error.message : "request failed"}.`);
    }
  }

  return (
    <form className="proto-flow-page" onSubmit={submit}>
      <section className="proto-flow-card proto-upload-card">
        <header>
          <h1>Upload / Intake</h1>
          <h2>Share photos with the media team</h2>
          <p>Guided contributor intake. Media team reviews source, rights, people/youth, and metadata before anything becomes public.</p>
        </header>
        <div className="proto-upload-layout">
          <div>
            <label
              className="proto-dropzone damx-upload-card"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload size={24} />
              <span>Upload photos from computer</span>
              <small>Drag and drop files, or browse. Every item enters review first.</small>
              <input aria-label="Upload photos from computer" type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
            </label>
            <div className="proto-file-list" aria-label="Selected photos and links">
              <p>{files.length ? `${files.length} files selected / ${formatBytes(totalBytes)}` : form.sourceLink.trim() ? "Source link ready for reviewer intake" : "No files or source link selected"}</p>
              {files.length ? <button type="button" className="proto-inline-action" onClick={() => setFiles([])}>Remove all</button> : null}
              {files.length ? (files as UploadListItem[]).slice(0, 5).map((file, index) => (
                <div key={`${file.name}-${index}`}><span>{file.name}</span><small>{formatBytes(file.size)}</small><Check size={14} /></div>
              )) : <span>Add files or paste a source link to create a real intake ticket.</span>}
            </div>
          </div>
          <div className="proto-field-panel" aria-label="Photo details">
            <h2>Required context</h2>
            {[
              ["sourceLink", "Paste Google Drive link"],
              ["eventName", "Event name"],
              ["eventDate", "Date"],
              ["ministry", "Ministry / team"],
              ["source", "Photographer / source"],
              ["location", "Location"],
              ["usageRights", "Usage rights"],
              ["tags", "Suggested tags"],
              ["notes", "Notes for reviewers"]
            ].map(([key, label]) => (
              <label key={key} className="proto-field">
                <span>{label}</span>
                <input type={key === "eventDate" ? "date" : "text"} value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
              </label>
            ))}
            <div className="proto-review-fields">
              <label className="proto-field"><span>People visible</span><select value={form.peopleVisible} onChange={(event) => setForm((current) => ({ ...current, peopleVisible: event.target.value }))}><option>Unknown</option><option>No</option><option>Yes</option></select></label>
              <label className="proto-field"><span>Minors visible</span><select value={form.minorsVisible} onChange={(event) => setForm((current) => ({ ...current, minorsVisible: event.target.value }))}><option>Unknown</option><option>No</option><option>Yes</option></select></label>
              <label className="proto-field"><span>Sacrament/doctrine</span><select value={form.doctrineSacramentSensitive} onChange={(event) => setForm((current) => ({ ...current, doctrineSacramentSensitive: event.target.value }))}><option>Unknown</option><option>No</option><option>Yes</option></select></label>
            </div>
            <div className="proto-upload-readiness">
              <article><span>Missing context</span><strong>{missingContext.length ? missingContext.join(", ") : "Ready for intake ticket"}</strong></article>
              <article><span>Review routing</span><strong>{intakeWarnings.slice(0, 3).join(" / ")}</strong></article>
              <article><span>Custody boundary</span><strong>Atlas records intake metadata only; originals stay with source custody.</strong></article>
            </div>
            <div className="proto-upload-actions">
              <Button type="button" onClick={() => setMessage("Draft is only in this browser until you submit intake.")}>Save draft</Button>
              <Button
                type="submit"
                tone="primary"
                disabled={!canSubmit}
                title={!hasMedia ? "Add photos or a link first." : undefined}
              >
                Send to media team
              </Button>
            </div>
            <p className="proto-muted"><strong>How review works</strong>: rights, people/youth visibility, and usage are reviewed before anything is published.</p>
            <p className="proto-muted">Every imported asset defaults to Needs Review / Do Not Publish.</p>
          </div>
        </div>
        {message ? <p className="proto-gate-note">{message}</p> : null}
      </section>
    </form>
  );
}

function requestMatchesFilter(request: RequestRecordPayload, filter: RequestFilter) {
  if (filter === "closed") return request.status === "Resolved";
  if (filter === "waiting") return request.status === "Waiting on me";
  return request.status !== "Resolved";
}

function requestStatusTone(status: RequestRecordPayload["status"]) {
  if (status === "Resolved") return "approved";
  if (status === "Blocked") return "danger";
  if (status === "Waiting on me") return "review";
  return "draft";
}

function formatAdminDate(value?: string) {
  if (!value) return "No events yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function PrototypeRequestsPage() {
  const { role } = useDemoRole();
  const requestRecords = useRequestRecords(role);
  const requests = requestRecords.data?.requests || [];
  const [filter, setFilter] = useState<RequestFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filteredRequests = useMemo(() => requests.filter((request) => requestMatchesFilter(request, filter)), [filter, requests]);
  const selected = filteredRequests.find((request) => request.id === selectedId) || filteredRequests[0] || requests[0];
  const selectedIndex = Math.max(0, filteredRequests.findIndex((request) => request.id === selected?.id));
  const assetDetail = useAssetDetail(selected?.relatedAssetId || "", role);
  const selectedAsset = assetDetail.data?.asset;
  const openCount = requests.filter((request) => request.status !== "Resolved").length;
  const waitingCount = requests.filter((request) => request.status === "Waiting on me").length;
  const closedCount = requests.filter((request) => request.status === "Resolved").length;
  const canOpenReview = canReview(role);
  const canOpenUpload = canUpload(role);

  useEffect(() => {
    if (!selectedId && filteredRequests[0]) setSelectedId(filteredRequests[0].id);
    if (selectedId && requests.length && !requests.some((request) => request.id === selectedId)) {
      setSelectedId(filteredRequests[0]?.id || requests[0]?.id || null);
    }
  }, [filteredRequests, requests, selectedId]);

  return (
    <section className="proto-flow-page">
      <div className="proto-flow-card proto-review-card" data-primary-section="requests-table">
        <header className="proto-review-head">
          <div>
            <h1>Requests</h1>
            <p>{selected ? selected.relatedAsset : "Portal request tickets from real local actions."}</p>
          </div>
          <StatusPill label={requestRecords.data?.truthBoundary === "portal-ticket-queue-only" ? "Local queue" : "Requests"} tone="draft" />
          <span>{selected ? selectedIndex + 1 : 0} of {filteredRequests.length || requests.length || 0}</span>
          <LinkButton href={routeWithRole(canOpenUpload ? "/upload" : "/library", role)}>{canOpenUpload ? "New intake" : "Browse library"}</LinkButton>
          {canOpenReview ? <LinkButton href={routeWithRole("/review", role)} tone="primary">Open review</LinkButton> : null}
        </header>
        {requestRecords.loading ? <PrototypeLoadingState label="Loading requests..." /> : requestRecords.error ? <div className="proto-error">{requestRecords.error}</div> : (
          <div className="proto-review-layout">
            <div className="proto-comments-panel">
              <div className="proto-tabs" role="tablist" aria-label="Request filters">
                <button type="button" className={filter === "open" ? "is-active" : ""} onClick={() => setFilter("open")}>Open ({openCount})</button>
                <button type="button" className={filter === "waiting" ? "is-active" : ""} onClick={() => setFilter("waiting")}>Waiting ({waitingCount})</button>
                <button type="button" className={filter === "closed" ? "is-active" : ""} onClick={() => setFilter("closed")}>Closed ({closedCount})</button>
              </div>
              <div className="proto-comment-list">
                {filteredRequests.length ? filteredRequests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    className={`proto-request-row${selected?.id === request.id ? " is-active" : ""}`}
                    onClick={() => setSelectedId(request.id)}
                  >
                    <strong>{request.type}</strong>
                    <small>{request.status} / {request.assignedTo}</small>
                    <span>{request.relatedAsset}</span>
                  </button>
                )) : (
                  <div className="proto-request-empty">
                    <strong>No {filter === "open" ? "open" : filter} request tickets</strong>
                    <span>{requests.length ? "Try another filter." : "Open an asset and request review or approved-copy access to create one."}</span>
                    <Link href={routeWithRole("/library", role)}>Browse library</Link>
                  </div>
                )}
              </div>
            </div>
            <aside className="proto-inspector" aria-label="Request detail">
              {selected ? (
                <>
                  <div className="proto-inspector-head">
                    <div className="proto-inspector-thumb">
                      {selectedAsset ? <AssetImage asset={selectedAsset} /> : <div className="proto-inspector-placeholder"><Inbox size={18} /></div>}
                    </div>
                    <div>
                      <h2>{selected.relatedAsset}</h2>
                      <StatusPill label={selected.status} tone={requestStatusTone(selected.status)} />
                      <p>{selected.type} / {selected.assignedTo}</p>
                      <small>{requestRecords.data?.approvalTruth === false ? "Portal ticket. Approval still requires reviewer evidence." : "Request context"}</small>
                    </div>
                  </div>
                  <div className="proto-detail-stack">
                    <section><h3>Truth boundary</h3><p>{requestRecords.data?.approvalTruth === false ? "This queue tracks portal requests only. It does not approve assets or write source truth." : "Request truth loaded from backend."}</p></section>
                    <section><h3>Blocker</h3><p>{selected.blocker}</p></section>
                    <section><h3>Next action</h3><p>{selected.nextAction}</p></section>
                    <section><h3>Required evidence</h3><div className="proto-tag-row">{selected.requiredEvidence.map((item) => <span key={item}>{item}</span>)}</div></section>
                    <section><h3>Timeline</h3><div className="proto-tag-row">{selected.timeline.map((item) => <span key={item}>{item}</span>)}</div></section>
                  </div>
                  <div className="proto-action-row">
                    {selected.relatedAssetId ? <Link href={routeWithRole(`/assets/${selected.relatedAssetId}`, role)}><Eye size={16} /><span>Asset</span></Link> : null}
                    {canOpenReview ? <Link href={routeWithRole("/review", role)}><ShieldCheck size={16} /><span>Review</span></Link> : null}
                    <button type="button" onClick={() => toast.message("Reply updates are not writable in this local demo yet.")}><Send size={16} /><span>Ask info</span></button>
                  </div>
                </>
              ) : <p className="proto-muted">No requests available.</p>}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

export function PrototypeReviewApprove() {
  const { role } = useDemoRole();
  const [activeQueue, setActiveQueue] = useState("pending");
  const queue = useReviewQueue(role, activeQueue);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [approvalScope, setApprovalScope] = useState<UsageScope>("Public");
  const [checklist, setChecklist] = useState<ReviewEvidenceChecklist>(emptyReviewChecklist);
  const [depthChecklist, setDepthChecklist] = useState<ReviewEvidenceDepthChecklist>(emptyReviewEvidenceDepthChecklist);
  const [message, setMessage] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const assets = queue.data?.assets || [];
  const selected = assets.find((asset) => asset.id === selectedId) || assets[0];
  const selectedIndex = Math.max(0, assets.findIndex((asset) => asset.id === selected?.id));
  const selectedPendingWrite = selected ? queue.data?.pendingWrites?.[selected.id] || selected.pendingReviewWrite : undefined;
  const reviewerNameForPayload = reviewerName.trim() || "Local reviewer";
  const selectedUseState = selected ? assetUseState(selected) : null;
  const approveDepthItems = selected ? reviewEvidenceDepthItems(selected, depthChecklist, "Approve Public") : [];
  const approveDepthMissing = selected ? reviewEvidenceDepthItems(selected, depthChecklist, "Approve Public").filter((item) => item.required && !item.checked) : [];

  function combinedDisabledReason(action: "Approve Public" | "Request More Info" | "Searchable Archive" | "Do Not Use") {
    if (!selected) return "Select an asset";
    const base = reviewActionDisabledReason({ asset: selected, action, checklist, note: comment });
    const depth = reviewEvidenceDepthDisabledReason(selected, depthChecklist, action);
    const missing = [base.replace(/^Missing:\s*/, ""), depth.replace(/^Missing:\s*/, "")].filter(Boolean).join(", ");
    return missing ? `Missing: ${missing}` : "";
  }

  const requestChangesDisabled = combinedDisabledReason("Request More Info");
  const archiveDisabled = combinedDisabledReason("Searchable Archive");
  const blockDisabled = combinedDisabledReason("Do Not Use");
  const approveDisabled = combinedDisabledReason("Approve Public");

  useEffect(() => {
    if (!selectedId && assets[0]) setSelectedId(assets[0].id);
    if (selectedId && assets.length && !assets.some((asset) => asset.id === selectedId)) setSelectedId(assets[0]?.id || null);
  }, [assets, selectedId]);

  useEffect(() => {
    setChecklist(initialReviewChecklistForAsset(selected));
    setDepthChecklist(initialReviewEvidenceDepthChecklist(selected));
    setComment("");
  }, [selected?.id]);

  useEffect(() => {
    setSelectedId(null);
    setMessage("");
  }, [activeQueue]);

  if (!canReview(role)) {
    return <section className="proto-flow-page"><div className="proto-flow-card"><h1>Review & Approve</h1><p>Review inbox requires reviewer access.</p></div></section>;
  }

  async function decide(action: "Approve Public" | "Request More Info" | "Searchable Archive" | "Do Not Use") {
    if (!selected || actionPending) return;
    const disabled = combinedDisabledReason(action);
    if (disabled) {
      setMessage(`Review blocked. ${disabled}.`);
      return;
    }
    setActionPending(true);
    setMessage("Sending review decision...");
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [DAM_LOCAL_BETA_ROLE_HEADER]: role,
          [DAM_LOCAL_TRUSTED_ROLE_HEADER]: role
        },
        body: JSON.stringify({
          role,
          id: selected.id,
          action,
          notes: comment.trim(),
          checklist,
          evidenceDepth: depthChecklist,
          reviewerName: reviewerNameForPayload,
          reviewDate,
          approvalScope
        })
      });
      const payload = await response.json().catch(() => ({ error: `Review API returned ${response.status}.` })) as ReviewDecisionPayload;
      setMessage(reviewDecisionMessage(payload));
      if (payload.queued || payload.pendingWriteId || payload.resourceSpaceWritten) queue.refresh();
    } catch (error) {
      setMessage(`Review decision failed: ${error instanceof Error ? error.message : "request failed"}.`);
    } finally {
      setActionPending(false);
    }
  }

  return (
    <section className="proto-flow-page">
      <div className="proto-flow-card proto-review-card">
        <header className="proto-review-head">
          <div><h1>Review & Approve</h1><p>{selected ? displayTitle(selected) : "Loading queue..."}</p></div>
          <StatusPill asset={selected} />
          {selectedUseState ? <span className={`proto-card-use is-${selectedUseState.tone}`}>{selectedUseState.label}</span> : null}
          <span>{selectedIndex + 1} of {assets.length || 1}</span>
          <Button onClick={() => void decide("Request More Info")} disabled={!selected || actionPending || Boolean(requestChangesDisabled)} title={requestChangesDisabled || undefined}>Request changes</Button>
          <Button tone="primary" onClick={() => void decide("Approve Public")} disabled={!selected || actionPending || Boolean(approveDisabled)} title={approveDisabled || undefined}>Approve public</Button>
        </header>
        {queue.loading ? <PrototypeLoadingState label="Loading review queue..." /> : queue.error ? <div className="proto-error">{queue.error}</div> : (
          <div className="proto-review-layout">
            <div className="proto-review-workbench">
              <div className="proto-review-preview"><AssetImage asset={selected} variant="detail" /></div>
              <div className="proto-review-queue-tabs" aria-label="Review queues">
                {(queue.data?.queues || []).slice(0, 6).map((item) => (
                  <button key={item.id} type="button" className={activeQueue === item.id ? "is-active" : ""} onClick={() => setActiveQueue(item.id)}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </button>
                ))}
              </div>
              <div className="proto-review-asset-list" aria-label="Review assets">
                {assets.slice(0, 8).map((asset) => (
                  <button key={asset.id} type="button" className={selected?.id === asset.id ? "is-active" : ""} onClick={() => setSelectedId(asset.id)}>
                    <strong>{displayTitle(asset)}</strong>
                    <small>{asset.status} / {asset.peopleRisk || "People unknown"}</small>
                  </button>
                ))}
                {!assets.length ? <p className="proto-muted">No records in this queue.</p> : null}
              </div>
            </div>
            <aside className="proto-comments-panel">
              <div className="proto-tabs"><button className="is-active">Evidence</button><button>Details</button></div>
              <div className="proto-comment-list">
                <p><strong>Queue source</strong><small>{queue.live ? "Live source" : "Local demo"}</small><span>{queue.data?.source?.detail || "Review queue uses Atlas backend policy."}</span></p>
                <p><strong>Pending write</strong><small>{pendingWriteLabel(selectedPendingWrite)}</small><span>{selectedPendingWrite ? `State: ${selectedPendingWrite.syncState}. Source library remains unchanged until sync confirms.` : "No queued decision for this item yet."}</span></p>
                <p><strong>Reviewer note</strong><small>Required</small><span>{comment.trim() || "Add evidence notes before approving public use."}</span></p>
                <p><strong>Lifecycle</strong><small>{selected?.status || "No asset selected"}</small><span>{selected?.usageScope || "Usage scope pending"} / {selectedUseState?.label || "Reuse state pending"}</span></p>
                <p><strong>Decision guard</strong><small>{approveDisabled ? "Approval blocked" : "Approval evidence complete"}</small><span>{approveDisabled || "Approve queues a public decision; ResourceSpace/source sync must still confirm before truth changes."}</span></p>
                <p><strong>Restrict vs block</strong><small>Consequence</small><span>Request evidence keeps item out of public reuse. Blocking or source-file actions require admin/reviewer follow-up outside this button.</span></p>
                <p><strong>Usage rights</strong><small>{selected?.rightsStatus || "Needs review"}</small><span>{selected?.rightsNotes || "Usage rights evidence should be recorded before any public approval."}</span></p>
                <p><strong>Allowed channels</strong><small>{selected?.approvedChannels?.length ? selected.approvedChannels.join(", ") : "Not exported"}</small><span>{selected?.region || "Region not exported"}{selected?.expirationOrRecheckDate || selected?.approvalRecheckDate || selected?.expirationDate ? ` · review by ${selected.expirationOrRecheckDate || selected.approvalRecheckDate || selected.expirationDate}` : ""}</span></p>
                <p><strong>Release evidence</strong><small>{selected?.consentStatus || "Needs review"}</small><span>{selected?.peopleRisk === "No people" ? "Model/talent release may be not required, but reviewer still records that decision." : selected?.peopleRisk || "People visibility unresolved."}</span></p>
                <p><strong>Compliance status</strong><small>{approveDepthMissing.length ? "Blocked" : "Ready for public review"}</small><span>{approveDepthMissing.length ? approveDepthMissing.slice(0, 3).map((item) => item.label).join(", ") : "Expanded evidence checks are complete for public approval."}</span></p>
              </div>
              <div className="proto-review-fields">
                <label className="proto-field"><span>Reviewer name</span><input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Local reviewer" /></label>
                <label className="proto-field"><span>Review date</span><input type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label>
                <label className="proto-field"><span>Approval scope</span><select value={approvalScope} onChange={(event) => setApprovalScope(event.target.value as UsageScope)}><option value="Public">Public</option><option value="Public and Internal">Public and Internal</option><option value="Internal">Internal</option><option value="Archive Only">Archive Only</option><option value="Do Not Publish">Do Not Publish</option></select></label>
              </div>
              <details className="proto-evidence" open>
                <summary>Review evidence depth</summary>
                {approveDepthItems.map((item) => (
                  <label key={item.field}>
                    <input
                      type="checkbox"
                      checked={Boolean(depthChecklist[item.field])}
                      onChange={() => setDepthChecklist((current) => ({ ...current, [item.field]: !current[item.field] }))}
                    />
                    <span>{item.label}</span>
                    <small>{item.required ? item.hint : `${item.hint} Not required for this record/action.`}</small>
                  </label>
                ))}
              </details>
              <details className="proto-evidence">
                <summary>Workflow checklist</summary>
                {reviewChecklistItems.map((item) => (
                  <label key={item.field}><input type="checkbox" checked={Boolean(checklist[item.field])} onChange={() => setChecklist((current) => ({ ...current, [item.field]: !current[item.field] }))} />{item.label}</label>
                ))}
              </details>
              <label className="proto-comment-box">
                <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." />
                <button type="button" onClick={() => setMessage("Review note will be sent with the next backend decision.")}><Send size={16} /></button>
              </label>
              <div className="proto-action-row">
                <button type="button" onClick={() => void decide("Request More Info")} disabled={!selected || actionPending || Boolean(requestChangesDisabled)} title={requestChangesDisabled || undefined}><Share2 size={16} /><span>Request changes</span></button>
                <button type="button" onClick={() => void decide("Searchable Archive")} disabled={!selected || actionPending || Boolean(archiveDisabled)} title={archiveDisabled || undefined}><Folder size={16} /><span>Archive only</span></button>
                <button type="button" onClick={() => void decide("Do Not Use")} disabled={!selected || actionPending || Boolean(blockDisabled)} title={blockDisabled || undefined}><ShieldCheck size={16} /><span>Block public use</span></button>
                <button type="button" onClick={() => void decide("Approve Public")} disabled={!selected || actionPending || Boolean(approveDisabled)} title={approveDisabled || undefined}><ShieldCheck size={16} /><span>Approve public</span></button>
              </div>
            </aside>
          </div>
        )}
        {message ? <p className="proto-gate-note">{message}</p> : null}
      </div>
    </section>
  );
}

export function PrototypeCollectionsDistribute({ distribution: _distribution = false }: { distribution?: boolean }) {
  const { role } = useDemoRole();
  const publicMode = _distribution;
  const search = useAssetsSearch({ role, sort: "Approved first", limit: 12 });
  const pathname = usePathname();
  const collections = search.data?.collections || [];
  const pathCollectionId = pathname.startsWith("/collections/") ? decodeURIComponent(pathname.split("/").filter(Boolean)[1] || "") : "";
  const selected = collections.find((collection) => collection.id === pathCollectionId) || collections.find((collection) => collection.count > 0) || collections[0];
  const collectionAssets = useAssetsSearch({ role, sort: "Approved first", limit: 12, collection: selected?.id, rightsSafe: publicMode });
  const assets = selected ? collectionAssets.data?.assets || [] : [];
  const [message, setMessage] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const canCreateDraft = canUpload(role);
  const portalReadyCount = assets.filter((asset) => assetUseState(asset).tone === "ready").length;
  const gatedCount = Math.max(0, assets.length - portalReadyCount);
  const selectedCountLabel = collectionAssets.loading ? "Loading assets" : selected?.countLabel || "0 assets";
  const shareReadinessLabel = assets.length
    ? gatedCount
      ? `${gatedCount.toLocaleString()} item${gatedCount === 1 ? "" : "s"} still gated`
      : "All visible items clear item-level reuse checks"
    : "No visible items to share";

  async function checkShareReadiness() {
    if (!selected) return;
    if (!canCreateDraft) {
      setMessage("Collection sharing is unavailable for Viewer. Open an item to request review or approved-copy access.");
      return;
    }
    if (!assets.length) {
      setMessage("No role-visible assets in this collection. Nothing can be shared from this view.");
      return;
    }
    setActionPending(true);
    setMessage("Checking item-level share readiness...");
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [DAM_LOCAL_BETA_ROLE_HEADER]: role,
          [DAM_LOCAL_TRUSTED_ROLE_HEADER]: role
        },
        body: JSON.stringify({
          role,
          assetIds: assets.map((asset) => asset.id),
          title: selected.name,
          audience: "Public-approved portal",
          owner: role
        })
      });
      const payload = await response.json().catch(() => ({ error: `Collection readiness returned ${response.status}.` }));
      setMessage(payload.message || payload.error || "Collection readiness checked. Sharing remains gated per item.");
    } catch (error) {
      setMessage(`Collection readiness check failed: ${error instanceof Error ? error.message : "request failed"}.`);
    } finally {
      setActionPending(false);
    }
  }

  return (
    <section className={`proto-collections-page${selected ? " has-inspector" : ""}`}>
      <div className="proto-collections-workspace">
        <header className="proto-library-header">
          <div className="proto-title-row">
            <h1>{publicMode ? "Portal" : "Collections"}</h1>
            <span>{collections.length.toLocaleString()} collections</span>
          </div>
          <ToolbarSearch value="" onChange={() => setMessage("Collection search follows the library metadata index in the next slice.")} />
          <div className="proto-header-actions">
            <Button onClick={() => setMessage("Filters use exported collection metadata only.")}><SlidersHorizontal size={15} />Filters</Button>
            <Button onClick={() => setMessage("Saved views stay in the sidebar for this prototype pass.")}>Saved views <ChevronDown size={14} /></Button>
            <label className="proto-rights-safe-toggle is-active">
              <input type="checkbox" checked readOnly />
              <span><ShieldCheck size={14} aria-hidden="true" />Rights-safe only</span>
            </label>
          </div>
        </header>

        <div className="proto-collections-filterbar" aria-label="Collection filters">
          <button type="button">Brand <strong>All brands</strong><ChevronDown size={13} /></button>
          <button type="button">Owner <strong>All owners</strong><ChevronDown size={13} /></button>
          <button type="button">Rights-safe <strong>All</strong><ChevronDown size={13} /></button>
          <span />
          <button type="button">Sort <strong>Newest</strong><ChevronDown size={13} /></button>
          <button type="button" aria-label="Grid layout"><LayoutGrid size={15} /></button>
          <button type="button" aria-label="List layout"><List size={15} /></button>
        </div>

        <div className="proto-collection-grid" aria-label="Collections">
          {search.loading ? <PrototypeLoadingState label="Loading collections..." /> : search.error ? <div className="proto-error">{search.error}</div> : collections.length ? collections.map((collection, index) => {
            const active = selected?.id === collection.id;
            const cover = active ? assets[0] : assets[index % Math.max(1, assets.length)];
            const statusTone = active && !gatedCount ? "approved" : index % 4 === 1 ? "review" : "approved";
            const statusLabel = active && gatedCount ? "Shared" : index % 4 === 1 ? "Internal" : "Published";
            return (
              <Link key={collection.id} className={`proto-collection-tile${active ? " is-active" : ""}`} href={routeWithRole(`/collections/${collection.id}`, role)}>
                <div className="proto-collection-tile-cover">
                  {cover ? <AssetImage asset={cover} /> : <div className="proto-inspector-placeholder"><Folder size={18} /></div>}
                  <span className="proto-card-check is-checked"><Check size={13} /></span>
                  <button type="button" aria-label={`More actions for ${collection.name}`}><MoreHorizontal size={16} /></button>
                </div>
                <div className="proto-collection-tile-copy">
                  <strong>{collection.name}</strong>
                  <small>{collection.countLabel} / {collection.dateRange}</small>
                  <span>{collection.description || "Rights-aware DAM collection."}</span>
                  <StatusPill label={statusLabel} tone={statusTone} />
                </div>
              </Link>
            );
          }) : <div className="proto-empty-state"><strong>No collections visible</strong><span>No role-visible collections are available from the current source.</span></div>}
        </div>
      </div>

      <aside className="proto-collection-inspector" aria-label="Collection detail">
        <div className="proto-inspector-nav">
          <div>
            <strong>{selected?.name || "Collection detail"}</strong>
            <span>{selectedCountLabel}</span>
          </div>
          <button type="button" aria-label="Close collection inspector"><X size={15} /></button>
        </div>
        <div className="proto-inspector-body">
          <div className="proto-inspector-thumb">{assets[0] ? <AssetImage asset={assets[0]} /> : <div className="proto-inspector-placeholder"><Folder size={18} /></div>}</div>
          <div className="proto-inspector-head">
            <div>
              <h2>{selected?.name || "No collections visible"}</h2>
              <p>{selected?.description || "No role-visible collections are available from the current source."}</p>
            </div>
            <StatusPill label={gatedCount ? "Shared" : "Published"} tone={gatedCount ? "review" : "approved"} />
          </div>
          <div className="proto-detail-stack">
            <section><h3>Permissions</h3><p>{publicMode ? "External-safe assets only." : "Collection membership never approves assets. Item gates still apply."}</p></section>
            <section><h3>Collaborators</h3><div className="proto-tag-row"><span>Taylor Morgan</span><span>Jordan Kim</span><span>Riley Anderson</span></div></section>
            <section><h3>Item readiness</h3><div className="proto-tag-row"><span>{portalReadyCount.toLocaleString()} ready</span><span>{gatedCount.toLocaleString()} gated</span></div><p>{shareReadinessLabel}.</p></section>
            <section><h3>Source</h3><p>{search.data?.source?.detail || "Reading collection summaries from the current media source."}</p></section>
            {!publicMode && canReview(role) && selected ? <section><h3>Reviewer reference</h3><p>{selected.id}</p></section> : null}
          </div>
          <div className="proto-collection-inspector-actions">
            <LinkButton href={routeWithRole(selected ? `/collections/${selected.id}` : "/collections", role)} tone="primary">Open collection</LinkButton>
            <Button onClick={() => setMessage("No public collection link exists in this local demo. No link was copied.")}><Share2 size={15} />Share collection</Button>
            <Button onClick={() => setMessage("Package download is disabled until all item-level gates pass.")}><Download size={15} />Download package</Button>
            <Button onClick={() => void checkShareReadiness()} disabled={actionPending || !selected}>{canCreateDraft ? "Check readiness" : "Request review"}</Button>
          </div>
          {message ? <p className="proto-gate-note">{message}</p> : null}
        </div>
      </aside>
    </section>
  );
}

export function PrototypeAdminControlCenter() {
  const { role, ready } = useDemoRole();
  const adminAllowed = ready && canAdmin(role);
  const readiness = useAdminReadiness(role);
  const data = readiness.data;
  const metrics = data?.metrics;
  const permissionPreview = buildPermissionInheritancePreview();
  const cleanupQueues = data ? buildGovernanceCleanupQueues(data) : [];
  const totalBlockers = metrics
    ? metrics.needsReview + metrics.rightsReview + metrics.missingSource + metrics.childrenYouth + metrics.renditionGaps
    : 0;

  if (!ready) {
    return <section className="proto-admin-page"><PrototypeLoadingState label="Checking role..." /></section>;
  }

  if (!adminAllowed) {
    return (
      <section className="proto-admin-page">
        <div className="proto-flow-card">
          <header className="proto-admin-header">
            <h1>Admin</h1>
            <p>DAM Admin access is required for source health, audit, policy, and integration controls.</p>
          </header>
          <div className="proto-admin-grid is-wide">
            <article><span>Current role</span><strong>{role}</strong><p>Viewer, Contributor, and Reviewer roles cannot open admin controls.</p></article>
            <article><span>Protected controls</span><strong>Locked</strong><p>Source health, audit logs, role policy, and sync controls stay hidden.</p></article>
            <article><span>Next step</span><strong>Use Library</strong><p>Find approved media or send requests through role-safe workflows.</p></article>
          </div>
          <div className="proto-action-row">
            <Link href={routeWithRole("/library", role)}><Search size={16} /><span>Library</span></Link>
            {canUpload(role) ? <Link href={routeWithRole("/upload", role)}><Upload size={16} /><span>Upload</span></Link> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="proto-admin-page">
      <div className="proto-flow-card">
        <header className="proto-admin-header">
          <div>
            <h1>Admin</h1>
            <p>{data ? `${data.assetCount.toLocaleString()} assets from ${data.source.label}. Latest audit: ${formatAdminDate(data.auditLog.latestAt)}.` : "Reading source health, audit, and policy readiness."}</p>
          </div>
          <Button onClick={() => readiness.refresh()} disabled={readiness.loading}>Refresh</Button>
        </header>

        {readiness.loading ? <PrototypeLoadingState label="Loading admin readiness..." /> : readiness.error ? <div className="proto-error">{readiness.error}</div> : data && metrics ? (
          <>
            <div className="proto-admin-grid">
              <article><span>Launch score</span><strong>{data.score}/100</strong><p>Search, trust, review, share, and governance pillars.</p></article>
              <article><span>Assets in scope</span><strong>{data.assetCount.toLocaleString()}</strong><p>Current backend/export records, not a fake catalog count.</p></article>
              <article><span>Portal ready</span><strong>{metrics.portalReady.toLocaleString()}</strong><p>Approved copies that pass portal reuse policy.</p></article>
              <article><span>Open blockers</span><strong>{totalBlockers.toLocaleString()}</strong><p>Review, rights, source, people/youth, and rendition gaps.</p></article>
            </div>

            <div className="proto-admin-ops-grid">
              <article><div><span>Source truth</span><strong>{data.source.label}</strong></div><StatusPill label={data.source.live ? "Live" : "Local"} tone={data.source.live ? "approved" : "draft"} /><p>{data.source.detail}</p></article>
              <article><div><span>Audit events</span><strong>{data.auditLog.count.toLocaleString()}</strong></div><StatusPill label={data.auditLog.storage?.durable ? "Durable" : "Local"} tone={data.auditLog.storage?.durable ? "approved" : "review"} /><p>{data.auditLog.storage?.detail || "Audit log status is reported by runtime diagnostics."}</p></article>
              <article><div><span>Beta readiness</span><strong>{data.betaReadiness.ready ? "Ready" : "Blocked"}</strong></div><StatusPill label={data.betaReadiness.ready ? "Ready" : "Needs work"} tone={data.betaReadiness.ready ? "approved" : "review"} /><p>{data.betaReadiness.score}/100. {data.betaReadiness.facts.find((fact) => !fact.ready)?.detail || "All tracked beta readiness facts are passing."}</p></article>
            </div>

            <section className="proto-admin-table" aria-label="Integration readiness">
              <header>
                <h2>Integration Readiness</h2>
                <span>Status</span>
                <span>Evidence</span>
              </header>
              {data.integrationReadiness.slice(0, 8).map((item) => (
                <div key={item.id}>
                  <strong>{item.label}</strong>
                  <span>{item.owner}</span>
                  <StatusPill label={item.state || (item.ready ? "Ready" : "Needs work")} tone={item.ready ? "approved" : "review"} />
                  <p>{item.detail}</p>
                </div>
              ))}
            </section>

            <section className="proto-admin-table" aria-label="Action backlog">
              <header>
                <h2>Action Backlog</h2>
                <span>Owner</span>
                <span>Count</span>
              </header>
              {data.actionBacklog.slice(0, 8).map((item) => (
                <div key={item.id}>
                  <strong>{item.label}</strong>
                  <span>{item.owner}</span>
                  <StatusPill label={item.severity} tone={item.severity === "low" ? "approved" : item.severity === "critical" || item.severity === "high" ? "danger" : "review"} />
                  <p>{item.count.toLocaleString()} records. {item.action}</p>
                </div>
              ))}
            </section>

            <section className="proto-admin-grid is-wide" aria-label="Governance cleanup queues">
              {cleanupQueues.map((item) => (
                <article key={item.id}>
                  <span>{item.label}</span>
                  <strong>{item.count === null ? "Unavailable" : item.count.toLocaleString()}</strong>
                  <p>{item.detail}</p>
                  {item.href ? <Link href={item.href}>{item.status === "sample-only" ? "Sample view" : "Open queue"}</Link> : <small>Unavailable in current source</small>}
                </article>
              ))}
            </section>

            <section className="proto-admin-table" aria-label="Permission inheritance preview">
              <header>
                <h2>Permission inheritance preview</h2>
                <span>Inheritance</span>
                <span>Exception</span>
              </header>
              {permissionPreview.rows.map((row) => (
                <div key={row.id}>
                  <strong>{row.label}</strong>
                  <span>{row.inheritance}</span>
                  <StatusPill label="Read-only preview" tone="draft" />
                  <p>{row.detail}</p>
                  <div className="proto-permission-role-grid">
                    <span>Viewer: {row.viewer}</span>
                    <span>Contributor: {row.contributor}</span>
                    <span>Reviewer: {row.reviewer}</span>
                    <span>DAM Admin: {row.admin}</span>
                  </div>
                  <small>{row.exception}</small>
                </div>
              ))}
            </section>

            <section className="proto-admin-table" aria-label="Inheritance assignments preview">
              <header>
                <h2>Inheritance assignments</h2>
                <span>Inherited from</span>
                <span>Exception</span>
              </header>
              {permissionPreview.assignments.map((assignment) => (
                <div key={assignment.scope}>
                  <strong>{assignment.scope}</strong>
                  <span>{assignment.inheritedFrom}</span>
                  <StatusPill label="Preview" tone="review" />
                  <p>{assignment.effect}</p>
                  <small>{assignment.exceptionState}</small>
                </div>
              ))}
            </section>
          </>
        ) : (
          <p className="proto-muted">Admin readiness is unavailable.</p>
        )}
      </div>
    </section>
  );
}

export function PrototypeAssetDetailPage({ id }: { id: string }) {
  const { role } = useDemoRole();
  const [downloadCenterOpen, setDownloadCenterOpen] = useState(false);
  const detail = useAssetDetail(id, role);
  const asset = detail.data?.asset;
  const relatedAssets = detail.data?.related || [];
  const visibleThumbs = asset ? [asset, ...relatedAssets].slice(0, 5) : [];
  return (
    <section className="proto-detail-page">
      {detail.loading ? <PrototypeLoadingState label="Loading asset..." /> : detail.error ? <div className="proto-error">{detail.error}</div> : asset ? (
        <>
        <header className="proto-detail-topbar">
          <Link href={routeWithRole("/library", role)} className="proto-detail-back"><ChevronLeft size={17} />Back to library</Link>
          <div className="proto-detail-top-actions" aria-label="Asset actions">
            <button type="button" onClick={() => setDownloadCenterOpen(true)}><Download size={16} />Download</button>
            <button type="button" onClick={() => toast.message("Share flow stays disabled in local demo. Create audited links from Distribution Sets.")}><Share2 size={16} />Share</button>
            <button type="button" onClick={() => toast.message("Collection changes are disabled in local demo.")}><Folder size={16} />Add to collection</button>
            <button type="button" aria-label="More actions"><MoreHorizontal size={18} />More actions</button>
          </div>
        </header>
        <div className="proto-detail-card">
          <section className="proto-detail-media-panel" aria-label="Asset preview and metadata">
            <header>
              <div>
                <h1>{displayTitle(asset)}</h1>
                <div className="proto-detail-approved-line"><StatusPill asset={asset} /><span>{assetUseState(asset).label}</span></div>
                <p>{assetMeta(asset) || assetRecordRef(asset)} / sRGB IEC61966-2.1</p>
              </div>
            </header>
            <div className="proto-detail-preview"><AssetImage asset={asset} variant="detail" /></div>
            {visibleThumbs.length ? (
              <div className="proto-detail-thumb-rail" aria-label="Related asset previews">
                <button type="button" aria-label="Previous related asset"><ChevronLeft size={17} /></button>
                {visibleThumbs.map((thumb, index) => (
                  <Link
                    key={thumb.id}
                    href={routeWithRole(`/library/${thumb.id}`, role)}
                    className={index === 0 ? "is-active" : ""}
                    aria-label={`Open ${displayTitle(thumb)}`}
                  >
                    <AssetImage asset={thumb} />
                  </Link>
                ))}
                <button type="button" aria-label="Next related asset"><ChevronRight size={17} /></button>
              </div>
            ) : null}
            <section className="proto-detail-downloads">
              <h2>Downloads</h2>
              {([
                ["Original", `${assetType(asset)} / ${asset.imageDimensions || "dimensions pending"} / ${formatBytes(asset.fileSizeBytes)}`, true],
                ["Web Large", `${assetType(asset)} / 1920 x 1280 / approved copy`, false],
                ["Web Medium", `${assetType(asset)} / 1280 x 853 / approved copy`, false],
                ["Print Ready", `${assetType(asset)} / print rendition / request if missing`, false]
              ] as Array<[string, string, boolean]>).map(([label, meta, locked]) => (
                <button key={label} type="button" onClick={() => setDownloadCenterOpen(true)} className={locked ? "is-locked" : ""}>
                  <span><Download size={16} aria-hidden="true" /><strong>{label}</strong><small>{meta}</small></span>
                  {locked ? <LockKeyhole size={15} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                </button>
              ))}
            </section>
            <section className="proto-detail-info-card">
              <h2>Asset information</h2>
              <PrototypeDetailRows rows={[
                ["Filename", displayTitle(asset)],
                ["Asset ID", assetRecordRef(asset)],
                ["Uploaded", `${prototypeDate(asset.importDate || asset.capturedDate || asset.eventDate)} by ${prototypePerson(asset)}`],
                ["Collection", asset.collection || "Campaign 2024"],
                ["Caption", prototypeCaption(asset)],
                ["Tags", (asset.tags || asset.tjcTerms || ["mountains", "lake", "travel", "hero"]).slice(0, 6).join(", ")],
                ["Photographer", prototypePerson(asset)],
                ["Location", asset.region || asset.church || "Banff National Park, Canada"]
              ]} />
            </section>
          </section>
          <aside className="proto-detail-right-panel" aria-label="Rights and releases">
            <div className="proto-detail-tabs">
              {["Rights & Releases", "Metadata", "Versions", "Activity"].map((tab, index) => (
                <button key={tab} type="button" className={index === 0 ? "is-active" : ""}>{tab}</button>
              ))}
            </div>
            <section className="proto-rights-section">
              <h2>Usage rights</h2>
              <dl className="proto-rights-grid">
                {[
                  ["License", prototypeLicenseLabel(asset)],
                  ["License type", asset.rightsBasis || "Standard License"],
                  ["Usage", asset.usageScope || "Commercial"],
                  ["Licensee", "Acme Inc."],
                  ["License ID", asset.consentReleaseRecordId || asset.resourceSpaceId || assetRecordRef(asset)],
                  ["Issue date", prototypeDate(asset.reviewedDate || asset.publishDate || asset.importDate)],
                  ["Expiration date", prototypeExpiration(asset)],
                  ["Licensed for", asset.region || "Worldwide"]
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="proto-rights-section">
              <h2>Allowed channels</h2>
              <div className="proto-channel-row">
                {prototypeAllowedChannels(asset).map((channel) => <span key={channel}><Check size={13} />{channel}</span>)}
              </div>
            </section>
            <section className="proto-rights-section">
              <div className="proto-rights-heading-row">
                <h2>Region matrix</h2>
                <div><span className="is-allowed" />Allowed <span className="is-restricted" />Restricted <span className="is-blocked" />Not allowed</div>
              </div>
              <div className="proto-region-matrix">
                {["North America", "South America", "Europe", "Asia Pacific", "Middle East", "Africa", "Worldwide"].map((region) => (
                  <div key={region}><span>{region}</span><i className={region === "Middle East" ? "is-restricted" : "is-allowed"} /></div>
                ))}
              </div>
            </section>
            <section className="proto-release-card-grid">
              {[
                ["Model releases", asset.peopleRisk === "No people" ? "Not required" : "1 model", asset.peopleRisk === "No people" ? "info" : "ok"],
                ["Property releases", asset.consentStatus || "1 property", "ok"],
                ["Talent/Location permissions", asset.consentReleaseRecordId ? "All clear" : "Not required", asset.consentReleaseRecordId ? "ok" : "info"]
              ].map(([label, value, tone]) => (
                <article key={label}>
                  <div><ShieldCheck size={16} /><strong>{label}</strong><ChevronRight size={15} /></div>
                  <span className={tone === "ok" ? "is-ok" : ""}>{value}</span>
                </article>
              ))}
            </section>
            <section className="proto-compliance-status">
              <ShieldCheck size={28} />
              <div>
                <h2>Compliance status</h2>
                <strong>{assetUseState(asset).tone === "ready" ? "Compliant" : assetUseState(asset).label}</strong>
                <p>{assetUseState(asset).detail || "All required releases are on file. License is active."}</p>
              </div>
              <button type="button" onClick={() => toast.message("Review request opens from review workflow in local demo.")}>Request changes <ChevronDown size={15} /></button>
            </section>
            <section className="proto-rights-bottom-grid">
              <div>
                <h2>Release documents</h2>
                {["Model Release - Riley Anderson.pdf", "Property Release - Banff NP.pdf", "License - Standard License.pdf"].map((doc) => (
                  <button key={doc} type="button" onClick={() => toast.message("Document download disabled in local demo.")}>
                    <span><strong>{doc}</strong><small>PDF / reviewed packet</small></span><Download size={15} />
                  </button>
                ))}
              </div>
              <div>
                <h2>Rights activity</h2>
                {["License issued", "Releases added", "Asset approved"].map((event, index) => (
                  <article key={event}>
                    <i />
                    <span><strong>{event}</strong><small>{index === 2 ? prototypeDate(asset.reviewedDate || asset.publishDate) : prototypeDate(asset.importDate || asset.eventDate)} / {index === 2 ? "Approved for use" : "Recorded by Atlas DAM"}</small></span>
                  </article>
                ))}
              </div>
            </section>
          </aside>
          <DownloadCenterDrawer
            open={downloadCenterOpen}
            onClose={() => setDownloadCenterOpen(false)}
            asset={asset}
            role={role}
            description="Original/source access stays elevated. Approved renditions run through the existing gate."
          />
        </div>
        </>
      ) : <div className="proto-error">Asset not found.</div>}
    </section>
  );
}
