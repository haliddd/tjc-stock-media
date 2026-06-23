"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  FileUp,
  Folder,
  Grid2X2,
  History,
  Inbox,
  LayoutGrid,
  List,
  Lock,
  MessageSquareText,
  MoreHorizontal,
  PanelLeftClose,
  Pause,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Upload,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { BetaPrototypeTools } from "@/components/BetaPrototypeTools";
import { useDemoRole } from "@/components/RoleProvider";
import { useAdminReadiness, useAssetDetail, useAssetsSearch, useDownloadGate, useReviewQueue } from "@/components/dam/useDamApi";
import { canAdmin, canReview, canUpload } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";
import { assetRecordRef, assetType, displayTitle, formatBytes } from "@/lib/enterprise-display";
import { assetEnterpriseStatus } from "@/lib/enterprise-status";
import { buildLibraryMetadataCsv, buildLibrarySelectionSummary } from "@/lib/library-bulk-selection";
import { emptyReviewChecklist, initialReviewChecklistForAsset, reviewActionDisabledReason, reviewChecklistItems } from "@/lib/review-decision-presenter";
import type { DemoRole, ReviewEvidenceChecklist, StockMediaAsset, UsageScope } from "@/lib/types";

type ProtoTab = "details" | "metadata" | "activity" | "history";
type UploadListItem = { name: string; size: number };

type AssetCardViewModel = {
  id: string;
  title: string;
  meta: string;
  statusLabel: string;
  statusTone: string;
};

type CollectionViewModel = {
  id: string;
  name: string;
  description: string;
  countLabel: string;
  owner: string;
  updated: string;
  status: string;
  visibility: string;
};

type ReviewQueueRowViewModel = {
  id: string;
  asset: StockMediaAsset;
  due: string;
  assignee: string;
  stage: string;
  priority: "High" | "Medium" | "Low";
};

type RequestRowViewModel = {
  id: string;
  request: string;
  requester: string;
  due: string;
  status: string;
  priority: "High" | "Medium" | "Low";
  owner: string;
  usage: string;
};

type UserAccessViewModel = {
  name: string;
  email: string;
  role: DemoRole | "Editor";
  groups: string;
  status: "Active" | "Inactive";
  lastActive: string;
};

type AdminMetadataViewModel = {
  field: string;
  key: string;
  type: string;
  required: boolean;
  multi: boolean;
  source: string;
};

type CollectionDraftPreviewResponse = {
  ok?: boolean;
  mode?: string;
  title?: string;
  state?: string;
  assetCount?: number;
  sharePath?: string;
  sharingBlocked?: boolean;
  reuseReadiness?: {
    ready: number;
    blocked: number;
    blockedReferences: string[];
  };
  message?: string;
  error?: string;
};

const navGroups = [
  {
    label: "LIBRARY",
    items: [
      { label: "Library", href: "/library", icon: LayoutGrid },
      { label: "Collections", href: "/collections", icon: Folder },
      { label: "Uploads", href: "/upload", icon: FileUp, guard: canUpload }
    ]
  },
  {
    label: "WORKFLOW",
    items: [
      { label: "Review", href: "/review", icon: ShieldCheck, guard: canReview },
      { label: "Requests", href: "/requests", icon: Inbox }
    ]
  },
  {
    label: "ADMIN",
    items: [
      { label: "Users", href: "/admin/users", icon: Users, guard: canAdmin },
      { label: "Groups", href: "/admin/roles", icon: Users, guard: canAdmin },
      { label: "Metadata", href: "/admin/taxonomy", icon: Tag, guard: canAdmin },
      { label: "Brand Kits", href: "/brand-hub", icon: Grid2X2, guard: canAdmin },
      { label: "Reports", href: "/insights", icon: List, guard: canAdmin },
      { label: "Settings", href: "/admin/settings", icon: Settings, guard: canAdmin }
    ]
  }
] satisfies Array<{
  label: string;
  items: Array<{ label: string; href: string; icon: typeof LayoutGrid; guard?: (role: DemoRole) => boolean }>;
}>;

const mobileNav = [
  { label: "Library", href: "/library", icon: LayoutGrid },
  { label: "Collections", href: "/collections", icon: Folder },
  { label: "Uploads", href: "/upload", icon: Upload },
  { label: "Review", href: "/review", icon: ShieldCheck },
  { label: "More", href: "/admin", icon: MoreHorizontal }
];

const fallbackBuckets = [
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85"
];

const userRows: UserAccessViewModel[] = [
  { name: "Taylor Morgan", email: "taylor.morgan@tjc.org", role: "DAM Admin", groups: "Admins, Marketing", status: "Active", lastActive: "May 14, 2024 9:15 AM" },
  { name: "Jordan Lee", email: "jordan.lee@tjc.org", role: "Editor", groups: "Marketing", status: "Active", lastActive: "May 14, 2024 10:02 AM" },
  { name: "Casey Nguyen", email: "casey.nguyen@tjc.org", role: "Reviewer", groups: "Creative, Reviewers", status: "Active", lastActive: "May 14, 2024 8:42 AM" },
  { name: "Riley Patel", email: "riley.patel@tjc.org", role: "Contributor", groups: "Creative", status: "Active", lastActive: "May 14, 2024 11:21 AM" },
  { name: "Avery Smith", email: "avery.smith@tjc.org", role: "Viewer", groups: "Sales", status: "Active", lastActive: "May 13, 2024 4:35 PM" },
  { name: "Morgan Chen", email: "morgan.chen@tjc.org", role: "Editor", groups: "Marketing", status: "Active", lastActive: "May 13, 2024 3:11 PM" },
  { name: "Jamie Wilson", email: "jamie.wilson@tjc.org", role: "Contributor", groups: "Creative", status: "Active", lastActive: "May 13, 2024 1:08 PM" },
  { name: "Cameron Diaz", email: "cameron.diaz@tjc.org", role: "Reviewer", groups: "Reviewers", status: "Active", lastActive: "May 12, 2024 6:42 PM" },
  { name: "Drew Howard", email: "drew.howard@tjc.org", role: "Viewer", groups: "Sales", status: "Inactive", lastActive: "May 10, 2024 9:20 AM" }
];

const metadataRows: AdminMetadataViewModel[] = [
  { field: "Title", key: "title", type: "Text (Short)", required: true, multi: false, source: "Manual" },
  { field: "Description", key: "description", type: "Text (Long)", required: true, multi: false, source: "Manual" },
  { field: "Tags", key: "tags", type: "Tag (Multi)", required: false, multi: true, source: "Vocabulary" },
  { field: "Asset Type", key: "asset_type", type: "Select", required: true, multi: false, source: "Vocabulary" },
  { field: "Usage Rights", key: "usage_rights", type: "Select", required: true, multi: false, source: "Vocabulary" },
  { field: "Credits", key: "credits", type: "Text (Short)", required: false, multi: false, source: "Manual" },
  { field: "Camera Model", key: "camera_model", type: "Text (Short)", required: false, multi: false, source: "EXIF" },
  { field: "Location", key: "location", type: "Select", required: false, multi: true, source: "Vocabulary" }
];

const requestRows: RequestRowViewModel[] = [
  { id: "REQ-1024", request: "Spring Campaign 2024 Assets", requester: "Jordan Lee", due: "May 16, 2024", status: "In Review", priority: "High", owner: "Taylor Morgan", usage: "Web, Social, Print" },
  { id: "REQ-1027", request: "Website Refresh Imagery", requester: "Avery Scott", due: "May 14, 2024", status: "Approved", priority: "Medium", owner: "Morgan Riley", usage: "Web" },
  { id: "REQ-1031", request: "Product Launch Photos", requester: "Casey Brown", due: "May 20, 2024", status: "Pending Approval", priority: "High", owner: "Taylor Morgan", usage: "Web, Social" },
  { id: "REQ-1034", request: "Trade Show Booth Graphics", requester: "Riley Quinn", due: "May 22, 2024", status: "In Progress", priority: "Medium", owner: "Jamie Chen", usage: "Print, Signage" },
  { id: "REQ-1038", request: "Customer Testimonial Video", requester: "Jamie Chen", due: "May 18, 2024", status: "New", priority: "Low", owner: "Morgan Riley", usage: "Web, Social" },
  { id: "REQ-1041", request: "Q2 Paid Social Ad Assets", requester: "Jordan Lee", due: "May 15, 2024", status: "Approved", priority: "High", owner: "Taylor Morgan", usage: "Social" },
  { id: "REQ-1044", request: "Email Newsletter Images", requester: "Avery Scott", due: "May 17, 2024", status: "In Review", priority: "Medium", owner: "Jamie Chen", usage: "Email" },
  { id: "REQ-1048", request: "Product Packaging Photos", requester: "Casey Brown", due: "May 21, 2024", status: "In Progress", priority: "Medium", owner: "Morgan Riley", usage: "Print" }
];

function pathActive(pathname: string, href: string) {
  if (href === "/library") return pathname === "/" || pathname === "/library" || pathname.startsWith("/library/");
  if (href === "/admin/users") return pathname === "/admin/users" || pathname === "/admin/roles";
  if (href === "/admin/taxonomy") return pathname === "/admin/taxonomy";
  if (href === "/brand-hub") return pathname === "/brand-hub";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function routeLabel(pathname: string) {
  if (pathname.startsWith("/upload")) return "Uploads";
  if (pathname.startsWith("/review")) return "Review";
  if (pathname.startsWith("/requests")) return "Requests";
  if (pathname.startsWith("/collections")) return "Collections";
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/brand-hub")) return "Brand Kits";
  return "Library";
}

function roleCanOpen(item: { href: string }, role: DemoRole) {
  if (item.href === "/upload") return canUpload(role);
  if (item.href === "/review") return canReview(role);
  if (item.href === "/admin") return canAdmin(role);
  return true;
}

function PillButton({
  children,
  tone = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button type="button" {...props} className={`proto-button is-${tone} ${className}`}>
      {children}
    </button>
  );
}

function LinkButton({ children, href, tone = "secondary", className = "" }: { children: ReactNode; href: string; tone?: "primary" | "secondary" | "ghost"; className?: string }) {
  return <Link className={`proto-button is-${tone} ${className}`} href={href}>{children}</Link>;
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return <button type="button" className="proto-icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function SegmentedTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <nav className="proto-tabs" aria-label="Section tabs">
      {tabs.map((tab) => (
        <button key={tab} type="button" className={active === tab ? "is-active" : ""} onClick={() => onChange(tab)}>{tab}</button>
      ))}
    </nav>
  );
}

function PageHeader({
  title,
  count,
  subtitle,
  search,
  onSearch,
  children
}: {
  title: string;
  count?: string;
  subtitle?: string;
  search?: string;
  onSearch?: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <header className="proto-page-header">
      <div className="proto-page-title">
        <h1>{title}</h1>
        {count ? <span>{count}</span> : null}
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {onSearch ? <ToolbarSearch value={search || ""} onChange={onSearch} placeholder={`Search ${title.toLowerCase()}...`} /> : null}
      <div className="proto-header-actions">{children}</div>
    </header>
  );
}

function ToolbarSearch({ value, onChange, placeholder = "Search assets, tags, collections..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="proto-search">
      <Search size={16} />
      <input aria-label={/asset|library/i.test(placeholder) ? "Search media library" : placeholder} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <kbd>⌘K</kbd>
    </label>
  );
}

function DamSidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const pathname = usePathname();
  const { role } = useDemoRole();
  return (
    <aside className="proto-sidebar" aria-label="Primary navigation">
      <div className="proto-sidebar-logo-row">
        <Link href={routeWithRole("/library", role)} className="proto-mark" aria-label="Library home">
          <span />
        </Link>
        <button type="button" className="proto-collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggleCollapsed}><PanelLeftClose size={16} /></button>
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
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </section>
          );
        })}
      </nav>
      <div className="proto-user-card">
        <span className="proto-avatar"><img alt="" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80" /></span>
        <span><strong>Taylor Morgan</strong><small>{role === "DAM Admin" ? "Admin" : role}</small></span>
        <ChevronDown size={15} />
      </div>
      {!collapsed ? <div className="proto-sidebar-tools"><BetaPrototypeTools variant="inline" /></div> : null}
    </aside>
  );
}

function PrototypeMobileBars() {
  const pathname = usePathname();
  const { role } = useDemoRole();
  return (
    <>
      <header className="proto-mobile-top">
        <strong>{routeLabel(pathname)}</strong>
        <BetaPrototypeTools variant="inline" />
        <IconButton label="Notifications"><Bell size={17} /></IconButton>
      </header>
      <nav className="proto-mobile-bottom" aria-label="Mobile navigation">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = pathActive(pathname, item.href);
          const disabled = !roleCanOpen(item, role);
          return (
            <Link key={item.href} href={disabled ? routeWithRole("/library", role) : routeWithRole(item.href, role)} className={`${active ? "is-active" : ""}${disabled ? " is-disabled" : ""}`} aria-disabled={disabled}>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (
    <div className={`proto-root ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="proto-app-shell">
        <DamSidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((value) => !value)} />
        <main id="main-content" className="proto-main">{children}</main>
      </div>
      <PrototypeMobileBars />
      <Toaster position="bottom-center" toastOptions={{ className: "proto-toast" }} />
    </div>
  );
}

function localThumbnailRoute(src: string) {
  return src.startsWith("/api/assets/thumbnail/");
}

function fallbackPhotoForAsset(asset: StockMediaAsset) {
  const seed = Number.parseInt(asset.id, 10);
  const index = Number.isFinite(seed) ? seed % fallbackBuckets.length : displayTitle(asset).length % fallbackBuckets.length;
  return fallbackBuckets[index];
}

function assetImage(asset?: StockMediaAsset, variant: "card" | "detail" = "card") {
  if (!asset) return "";
  return variant === "detail"
    ? asset.imageUrls?.detail || asset.preview || asset.imageUrls?.card || asset.thumbnail || ""
    : asset.imageUrls?.card || asset.imageUrls?.small || asset.thumbnail || asset.preview || "";
}

function statusForAsset(asset?: StockMediaAsset) {
  const status = assetEnterpriseStatus(asset);
  if (status === "Approved") return { label: "Approved", tone: "approved" };
  if (status === "Draft") return { label: "Draft", tone: "draft" };
  if (status === "Restricted") return { label: "Restricted", tone: "danger" };
  if (status === "Missing Consent") return { label: "In Review", tone: "review" };
  return { label: "In Review", tone: "review" };
}

function StatusChip({ asset, label, tone }: { asset?: StockMediaAsset; label?: string; tone?: string }) {
  const mapped = asset ? statusForAsset(asset) : { label: label || "Draft", tone: tone || "draft" };
  return <span className={`proto-status is-${mapped.tone}`}>{mapped.label}</span>;
}

function ProgressMeter({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return <span className="proto-upload-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}><span style={{ width: `${safeValue}%` }} /></span>;
}

function AssetImage({ asset, variant = "card" }: { asset?: StockMediaAsset; variant?: "card" | "detail" }) {
  const src = assetImage(asset, variant);
  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    let cancelled = false;
    setResolvedSrc(src);
    if (!asset || !src || !localThumbnailRoute(src)) return;

    fetch(src, { headers: { Accept: "image/*" } })
      .then((response) => {
        if (cancelled) return;
        if (!response.ok || response.headers.get("X-TJC-Preview-Mode") === "generated-local-beta") {
          setResolvedSrc(fallbackPhotoForAsset(asset));
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedSrc(fallbackPhotoForAsset(asset));
      });

    return () => {
      cancelled = true;
    };
  }, [asset, src]);

  if (!src) {
    return (
      <div className="proto-image-fallback">
        <Lock size={18} />
        <span>Preview restricted</span>
      </div>
    );
  }

  return <img src={resolvedSrc} alt={asset?.thumbnailAlt || displayTitle(asset)} loading="lazy" onError={() => asset && setResolvedSrc(fallbackPhotoForAsset(asset))} />;
}

function assetMeta(asset: StockMediaAsset) {
  return [assetType(asset), asset.imageDimensions, formatBytes(asset.fileSizeBytes)].filter((item) => item && item !== "Not provided").join("  ·  ");
}

function viewAsset(asset: StockMediaAsset): AssetCardViewModel {
  const status = statusForAsset(asset);
  return {
    id: asset.id,
    title: displayTitle(asset),
    meta: assetMeta(asset) || `${assetType(asset)} · ${asset.collection}`,
    statusLabel: status.label,
    statusTone: status.tone
  };
}

function downloadTextFile(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function roleSafeUrl(path: string, role: DemoRole) {
  if (typeof window === "undefined") return routeWithRole(path, role);
  return new URL(routeWithRole(path, role), window.location.origin).toString();
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

async function copyRoleSafeLink(path: string, role: DemoRole, label = "Role-safe link copied") {
  await copyText(roleSafeUrl(path, role));
  toast.success(label, { description: "Access still follows role, approval, and download gates." });
}

function AssetCard({
  asset,
  selected,
  active,
  onSelect,
  onInspect
}: {
  asset: StockMediaAsset;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  onInspect: () => void;
}) {
  const model = viewAsset(asset);
  return (
    <article className={`proto-asset-card ${active ? "is-active" : ""}`} onClick={onInspect}>
      <div className="proto-asset-image">
        <AssetImage asset={asset} />
        <button
          type="button"
          className={`proto-card-check ${selected ? "is-checked" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          aria-label={`${selected ? "Deselect" : "Select"} ${model.title}`}
        >
          {selected ? <Check size={13} /> : null}
        </button>
        <StatusChip label={model.statusLabel} tone={model.statusTone} />
      </div>
      <div className="proto-asset-copy">
        <strong>{model.title}</strong>
        <span>{model.meta}</span>
      </div>
    </article>
  );
}

function InspectorPanel({ asset, index, total, onClose }: { asset?: StockMediaAsset; index: number; total: number; onClose?: () => void }) {
  const { role } = useDemoRole();
  const [tab, setTab] = useState<ProtoTab>("details");
  const [message, setMessage] = useState("");
  const gate = useDownloadGate(asset?.id || "", role);

  async function download() {
    if (!asset) return;
    const payload = await gate.requestDownload({ reason: `Approved-copy request for ${displayTitle(asset)}` });
    if (payload.allowed && payload.downloadUrl) {
      setMessage("Approved-copy gate passed. Opening derivative.");
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
    } else {
      setMessage(payload.message || payload.reason || "Download blocked by policy gate.");
    }
  }

  if (!asset) {
    return <aside className="proto-inspector"><p className="proto-muted">Select an asset.</p></aside>;
  }

  const tags = [...(asset.tags || []), ...(asset.tjcTerms || [])].slice(0, 6);
  const keywords = (asset.aiVisibleTagSuggestions || asset.suggestedTags || tags).slice(0, 10);

  return (
    <aside className="proto-inspector" aria-label="Asset inspector">
      <div className="proto-inspector-nav">
        <ChevronLeft size={16} />
        <span>{index + 1} of {total.toLocaleString()}</span>
        <ChevronRight size={16} />
        <button type="button" onClick={onClose} aria-label="Close inspector"><X size={16} /></button>
      </div>
      <div className="proto-inspector-head">
        <div className="proto-inspector-thumb"><AssetImage asset={asset} /></div>
        <div>
          <h2>{displayTitle(asset)}</h2>
          <StatusChip asset={asset} />
          <p>{assetMeta(asset) || assetRecordRef(asset)}</p>
          <small>Uploaded {asset.importDate || asset.capturedDate || "May 14, 2024"} by {asset.sourceAccount || asset.reviewer || "Taylor Morgan"}</small>
        </div>
      </div>
      <div className="proto-action-row">
        <button type="button" onClick={download}><Download size={16} /><span>Download</span></button>
        <button type="button" onClick={() => void copyRoleSafeLink(`/assets/${asset.id}`, role, "Asset link copied").then(() => setMessage("Role-safe asset link copied. Approval gates still apply."))}><Share2 size={16} /><span>Share</span></button>
        <Link href={routeWithRole(`/assets/${asset.id}`, role)}><Eye size={16} /><span>Preview</span></Link>
        <button type="button" onClick={() => setMessage("Source/original files remain restricted.")}><MoreHorizontal size={16} /><span>More</span></button>
      </div>
      <SegmentedTabs tabs={["details", "metadata", "activity"]} active={tab} onChange={(value) => setTab(value as ProtoTab)} />
      {tab === "details" ? (
        <div className="proto-detail-stack">
          <section><h3>Description</h3><p>{asset.usageGuidance || asset.rightsNotes || "Review-safe media record with ResourceSpace as source of truth."}</p></section>
          <section><h3>Tags</h3><div className="proto-tag-row">{tags.length ? tags.map((tag) => <span key={tag}>{tag}</span>) : <span>review</span>}<span>+ Add tag</span></div></section>
          <section><h3>Rights & Usage</h3><p>{asset.usageScope}. {asset.rightsExpirationDate ? `Expires ${asset.rightsExpirationDate}` : "Reviewer evidence required before public use."}</p></section>
          <section><h3>Collections</h3><div className="proto-tag-row"><span>{asset.collection}</span>{asset.eventName ? <span>{asset.eventName}</span> : null}</div></section>
          <section><h3>Versions</h3><p>v2 · {asset.importDate || "May 14, 2024"} · Current</p><p>v1 · {asset.capturedDate || "May 10, 2024"} · Prior review copy</p></section>
          <section><h3>Related files</h3><p>{asset.originalFilename || displayTitle(asset)} · source restricted</p></section>
          <section><h3>AI keywords</h3><div className="proto-tag-row">{keywords.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
        </div>
      ) : tab === "metadata" ? (
        <dl className="proto-dl">
          <div><dt>ResourceSpace ID</dt><dd>{asset.resourceSpaceId || assetRecordRef(asset)}</dd></div>
          <div><dt>Source</dt><dd>{asset.sourceSystem || asset.sourcePlatform || "ResourceSpace"}</dd></div>
          <div><dt>People</dt><dd>{asset.peopleRisk || "Unknown"}</dd></div>
          <div><dt>Review</dt><dd>{asset.reviewedDate || "Pending"}</dd></div>
          <div><dt>Source location</dt><dd>{asset.sourceFolder || asset.sourceAlbum || "Restricted"}</dd></div>
        </dl>
      ) : (
        <div className="proto-detail-stack">
          <p><strong>Taylor Morgan</strong> updated tags, collection, and review note.</p>
          <p><strong>Jordan Lee</strong> moved asset to {asset.collection}.</p>
          <p>{asset.pendingReviewWrite ? `Pending sync: ${asset.pendingReviewWrite.syncState}` : "No pending ResourceSpace write."}</p>
          <label className="proto-comment-box"><input placeholder="Add a comment..." /><button type="button" onClick={() => toast.message("Comments are local draft notes until durable workflow comments are connected.")}><Send size={15} /></button></label>
        </div>
      )}
      {message ? <p className="proto-gate-note">{message}</p> : null}
    </aside>
  );
}

function ThumbnailStrip({ assets, limit = 8 }: { assets: StockMediaAsset[]; limit?: number }) {
  return (
    <div className="proto-thumbnail-strip">
      {assets.slice(0, limit).map((asset) => <div key={asset.id}><AssetImage asset={asset} /></div>)}
      <button type="button" aria-label="Next thumbnails"><ChevronRight size={16} /></button>
    </div>
  );
}

function MetricCard({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <article className="proto-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {trend ? <small>{trend}</small> : null}
      <i />
    </article>
  );
}

export function PrototypeLibraryPage() {
  const { role } = useDemoRole();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState("Newest");
  const [view, setView] = useState(searchParams.get("view") || "");
  const [filters, setFilters] = useState<string[]>(searchParams.getAll("filter"));
  const [savedOpen, setSavedOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const results = useAssetsSearch({ role, query, view, filters, sort, limit: 32 });
  const assets = results.data?.assets || [];
  const activeAsset = assets.find((asset) => asset.id === activeId) || assets[1] || assets[0];
  const total = results.data?.total || results.data?.counts?.visibleToRole || assets.length;
  const selectedAssets = useMemo(() => assets.filter((asset) => selected.has(asset.id)), [assets, selected]);
  const selectionSummary = useMemo(() => buildLibrarySelectionSummary(selectedAssets, role), [selectedAssets, role]);
  const suggestedFilters = (results.data?.discovery.suggestedFilters || []).slice(0, 8);
  const savedViews = (results.data?.savedViews || []).filter((item) => item.count > 0).slice(0, 8);
  const downloadGate = useDownloadGate(selectedAssets[0]?.id || activeAsset?.id || "", role);

  useEffect(() => {
    if (!activeId && assets.length) setActiveId(assets[1]?.id || assets[0].id);
  }, [activeId, assets]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("role", role);
    if (query) params.set("q", query);
    if (view) params.set("view", view);
    filters.forEach((filter) => params.append("filter", filter));
    if (sort !== "Newest") params.set("sort", sort);
    const nextUrl = `${pathname}?${params.toString()}`;
    if (typeof window !== "undefined" && `${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [filters, pathname, query, role, sort, view]);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function runDownload() {
    const target = selectedAssets[0] || activeAsset;
    if (!target) {
      toast.message("Select an asset before downloading.");
      return;
    }
    if (selectedAssets.length > 1) {
      const download = selectionSummary.actions.find((action) => action.id === "download-approved");
      toast.message(download?.statusLabel || "Download gate checked.", {
        description: download?.warning || download?.disabledReason || "Bulk source/original download stays blocked."
      });
      return;
    }
    const payload = await downloadGate.requestDownload({ reason: `Approved-copy request for ${displayTitle(target)}` });
    if (payload.allowed && payload.downloadUrl) {
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
      toast.success("Approved copy opened.");
    } else {
      toast.message(payload.message || payload.reason || "Download blocked by policy gate.");
    }
  }

  function exportSelectedMetadata() {
    const exportAssets = selectedAssets.length ? selectedAssets : assets;
    downloadTextFile(`tjc-library-selection-${new Date().toISOString().slice(0, 10)}.csv`, buildLibraryMetadataCsv(exportAssets), "text/csv;charset=utf-8");
    toast.success(`Exported ${exportAssets.length.toLocaleString()} role-safe metadata rows.`);
  }

  async function shareSelection() {
    const target = selectedAssets[0] || activeAsset;
    if (!target) {
      toast.message("Select an asset before sharing.");
      return;
    }
    if (selectedAssets.length > 1) {
      await copyText(roleSafeUrl(`/library`, role));
      toast.message("Library link copied.", {
        description: "Bulk share delivery remains disabled until every asset passes item-level approval gates."
      });
      return;
    }
    await copyRoleSafeLink(`/assets/${target.id}`, role, "Asset link copied");
  }

  async function createCollectionDraft() {
    const draftAssets = selectedAssets.length ? selectedAssets : activeAsset ? [activeAsset] : [];
    if (!draftAssets.length) {
      toast.message("Select assets before creating a collection draft.");
      return;
    }
    const response = await fetch(`/api/collections?role=${encodeURIComponent(role)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        role,
        assetIds: draftAssets.map((asset) => asset.id),
        title: `Beta collection draft ${new Date().toISOString().slice(0, 10)}`,
        audience: "Internal ministry",
        owner: "TJC media team"
      })
    });
    const payload = await response.json().catch(() => ({})) as CollectionDraftPreviewResponse;
    if (!response.ok) {
      toast.message(payload.error || "Collection draft blocked.", {
        description: "Collection writeback remains governed by role and beta storage policy."
      });
      return;
    }
    toast.success(payload.title || "Collection draft preview ready", {
      description: payload.message || `${payload.assetCount || draftAssets.length} assets staged. Sharing still gated per item.`
    });
  }

  function toggleFilter(filter: string) {
    setFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
    setSelected(new Set());
  }

  function applySavedView(id: string) {
    setView(id);
    setQuery("");
    setSelected(new Set());
    setSavedOpen(false);
  }

  return (
    <div className="proto-library-page">
      <section className="proto-library-workspace">
        <PageHeader title="Library" count={`${total.toLocaleString()} assets`} search={query} onSearch={setQuery}>
          <span className="proto-beta-chip">ResourceSpace export snapshot</span>
          <div className="proto-menu-wrap">
            <PillButton className="proto-saved-button" onClick={() => setSavedOpen((value) => !value)}>{view ? savedViews.find((item) => item.id === view)?.label || "Saved views" : "Saved views"} <ChevronDown size={14} /></PillButton>
            {savedOpen ? <div className="proto-popover">{savedViews.map((item) => <button key={item.id} type="button" onClick={() => applySavedView(item.id)}><strong>{item.label}</strong><span>{item.count.toLocaleString()} assets</span></button>)}<button type="button" onClick={() => applySavedView("")}>All assets<span>Clear saved view</span></button></div> : null}
          </div>
          <div className="proto-menu-wrap">
            <PillButton className={`proto-filter-button ${filters.length ? "is-active" : ""}`} aria-label="Filters" title="Filters" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={16} /><span>Filters</span></PillButton>
            {filtersOpen ? <div className="proto-popover is-filter">{suggestedFilters.length ? suggestedFilters.map((item) => <button key={item.filter} type="button" onClick={() => toggleFilter(item.filter)} className={filters.includes(item.filter) ? "is-active" : ""}><strong>{item.label}</strong><span>{item.count.toLocaleString()} matches</span></button>) : <span className="proto-popover-empty">No filters for this result set.</span>}</div> : null}
          </div>
          <LinkButton className="proto-upload-button" href={routeWithRole("/upload", role)} tone="primary">Upload <ChevronDown size={14} /></LinkButton>
        </PageHeader>
        <div className="proto-toolbar">
          <label className="proto-checkbox-label"><input type="checkbox" checked={selected.size > 0 && selected.size === assets.length} onChange={() => setSelected(selected.size === assets.length ? new Set() : new Set(assets.map((asset) => asset.id)))} /> <span>{selected.size} selected</span></label>
          <PillButton onClick={() => void runDownload()}>Download</PillButton>
          <PillButton onClick={() => void shareSelection()}>Share</PillButton>
          <PillButton onClick={() => void createCollectionDraft()}>Add to collection</PillButton>
          <div className="proto-menu-wrap">
            <PillButton onClick={() => setMoreOpen((value) => !value)}>More <ChevronDown size={14} /></PillButton>
            {moreOpen ? <div className="proto-popover is-more"><button type="button" onClick={exportSelectedMetadata}><strong>Export metadata CSV</strong><span>{(selectedAssets.length || assets.length).toLocaleString()} role-safe rows</span></button>{selectionSummary.actions.slice(0, 6).map((action) => <button key={action.id} type="button" disabled={!action.enabled} onClick={() => toast.message(action.label, { description: action.disabledReason || action.warning || action.statusLabel })}><strong>{action.label}</strong><span>{action.statusLabel}</span></button>)}</div> : null}
          </div>
          <div className="proto-toolbar-spacer" />
          <button type="button" className="proto-sort" onClick={() => setSort(sort === "Newest" ? "Approved first" : "Newest")}>Sort by: {sort} <ChevronDown size={14} /></button>
          <IconButton label="Grid view" onClick={() => setViewMode("grid")}><LayoutGrid size={16} /></IconButton>
          <IconButton label="List view" onClick={() => setViewMode("list")}><List size={16} /></IconButton>
        </div>
        {filters.length || view ? <div className="proto-active-filters">{view ? <button type="button" onClick={() => setView("")}>Saved view: {savedViews.find((item) => item.id === view)?.label || view} ×</button> : null}{filters.map((filter) => <button type="button" key={filter} onClick={() => toggleFilter(filter)}>{filter} ×</button>)}</div> : null}
        {results.loading ? <div className="proto-loading">Loading library...</div> : results.error ? <div className="proto-error">{results.error}</div> : (
          <div className={`proto-asset-grid ${viewMode === "list" ? "is-list" : ""}`}>
            {assets.length ? assets.map((asset) => <AssetCard key={asset.id} asset={asset} selected={selected.has(asset.id)} active={activeAsset?.id === asset.id} onSelect={() => toggle(asset.id)} onInspect={() => setActiveId(asset.id)} />) : <div className="proto-empty-state">No matching assets. Clear search or filters to return to ResourceSpace export results.</div>}
          </div>
        )}
      </section>
      <InspectorPanel asset={activeAsset} index={Math.max(0, assets.findIndex((asset) => asset.id === activeAsset?.id))} total={total} onClose={() => setActiveId(null)} />
      {activeAsset ? <MobileAssetSheet asset={activeAsset} /> : null}
    </div>
  );
}

function MobileAssetSheet({ asset }: { asset: StockMediaAsset }) {
  const { role } = useDemoRole();
  const gate = useDownloadGate(asset.id, role);
  const [tab, setTab] = useState("Details");
  const [message, setMessage] = useState("");

  async function download() {
    const payload = await gate.requestDownload({ reason: `Approved-copy request for ${displayTitle(asset)}` });
    if (payload.allowed && payload.downloadUrl) {
      setMessage("Approved-copy gate passed. Opening derivative.");
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
    } else {
      setMessage(payload.message || payload.reason || "Download blocked by policy gate.");
    }
  }

  return (
    <aside className="proto-mobile-sheet">
      <div className="proto-mobile-sheet-head">
        <div className="proto-mobile-thumb"><AssetImage asset={asset} /></div>
        <div><strong>{displayTitle(asset)}</strong><StatusChip asset={asset} /><span>{assetMeta(asset)}</span>{message ? <em className="proto-mobile-sheet-note">{message}</em> : null}</div>
        <button type="button" className="proto-mobile-sheet-icon" onClick={() => void copyRoleSafeLink(`/assets/${asset.id}`, role, "Asset link copied")} aria-label="Share selected asset"><Share2 size={16} /></button>
      </div>
      <SegmentedTabs tabs={["Details", "Activity"]} active={tab} onChange={setTab} />
      {tab === "Activity" ? <p className="proto-mobile-sheet-note">Activity visible in asset detail. Source/original access stays restricted.</p> : null}
      <div className="proto-action-row">
        <button type="button" onClick={() => void download()}><Download size={16} /><span>Download</span></button>
        <button type="button" onClick={() => void copyRoleSafeLink(`/assets/${asset.id}`, role, "Asset link copied")}><Share2 size={16} /><span>Share</span></button>
        <Link href={routeWithRole(`/assets/${asset.id}`, role)}><Eye size={16} /><span>Preview</span></Link>
        <button type="button" onClick={() => setMessage("Original/source files remain restricted.")}><MoreHorizontal size={16} /><span>More</span></button>
      </div>
    </aside>
  );
}

export function PrototypeCollectionsPage({ collectionId, distribution = false }: { collectionId?: string; distribution?: boolean } = {}) {
  return collectionId || distribution ? <PrototypeCollectionDetail collectionId={collectionId} /> : <PrototypeCollectionsIndex />;
}

export function PrototypeCollectionsDistribute({ collectionId, distribution = true }: { collectionId?: string; distribution?: boolean } = {}) {
  return <PrototypeCollectionsPage collectionId={collectionId} distribution={distribution} />;
}

function collectionVm(collection: NonNullable<ReturnType<typeof useAssetsSearch>["data"]>["collections"][number], index: number): CollectionViewModel {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description || "Curated assets for web, social, and print.",
    countLabel: collection.countLabel,
    owner: ["Taylor Morgan", "Jordan Lee", "Alex Rivera"][index % 3],
    updated: ["May 14, 2024", "May 13, 2024", "May 12, 2024", "May 10, 2024"][index % 4],
    status: collection.approvalSummary?.includes("review") ? "In Review" : index % 4 === 3 ? "Draft" : "Approved",
    visibility: index % 3 === 0 ? "Brand" : index % 3 === 1 ? "Team" : "Public"
  };
}

function PrototypeCollectionsIndex() {
  const { role } = useDemoRole();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All collections");
  const [savedOpen, setSavedOpen] = useState(false);
  const search = useAssetsSearch({ role, query, sort: "Approved first", limit: 24 });
  const collections = search.data?.collections || [];
  const visibleCollections = collections.filter((collection, index) => {
    const matchesQuery = collection.name.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (filter === "Favorites") return index % 4 === 0;
    if (filter === "Shared with me") return index % 3 === 0;
    if (filter === "Archived") return /archive|old|past/i.test(collection.name);
    if (filter === "My collections") return index % 2 === 0;
    return true;
  });
  const featured = visibleCollections.slice(0, 5);
  const rows = visibleCollections.slice(0, 8).map(collectionVm);

  return (
    <section className="proto-page proto-collections-index">
      <PageHeader title="Collections" count={`${collections.length || 48} collections`} search={query} onSearch={setQuery}>
        <div className="proto-menu-wrap">
          <PillButton onClick={() => setSavedOpen((value) => !value)}>Saved views <ChevronDown size={14} /></PillButton>
          {savedOpen ? <div className="proto-popover">{["All collections", "LM Photos albums", "Portal ready"].map((item) => <button type="button" key={item} onClick={() => { setFilter(item === "LM Photos albums" ? "All collections" : item); setSavedOpen(false); }}><strong>{item}</strong><span>{item === "LM Photos albums" ? "Imported source albums" : "Local saved view"}</span></button>)}</div> : null}
        </div>
        <PillButton onClick={() => toast.message("Use collection pills below.", { description: "Filters update this collection index locally without changing ResourceSpace truth." })}><SlidersHorizontal size={16} />Filters</PillButton>
        <PillButton tone="primary" onClick={() => toast.message("New collection drafts need selected assets.", { description: "Select assets in Library, then use Add to collection to create a governed local draft." })}><Plus size={16} />New collection <ChevronDown size={14} /></PillButton>
      </PageHeader>
      <div className="proto-filter-pills">
        {["All collections", "My collections", "Favorites", "Shared with me", "Archived"].map((item, index) => <button type="button" className={filter === item ? "is-active" : ""} key={item} onClick={() => setFilter(item)}>{item} <span>{[collections.length || 48, Math.ceil((collections.length || 48) / 2), 8, 16, 4][index]}</span></button>)}
        <div className="proto-filter-spacer" />
        <button type="button" onClick={() => toast.message("Collections are sorted by last updated in local beta.")}>Sort by: Last updated <ChevronDown size={14} /></button>
        <IconButton label="Grid" onClick={() => toast.message("Grid view active.")}><LayoutGrid size={16} /></IconButton>
        <IconButton label="List" onClick={() => toast.message("Collection table is visible below.")}><List size={16} /></IconButton>
      </div>
      <section className="proto-panel">
        <header className="proto-panel-head"><div><h2>Featured collections</h2><p>Curated collections for quick access to important campaigns and assets.</p></div><button type="button" onClick={() => setFilter("All collections")}>View all <ChevronRight size={14} /></button></header>
        <div className="proto-featured-collections">
          {featured.map((collection, index) => {
            const vm = collectionVm(collection, index);
            return (
              <Link href={routeWithRole(`/collections/${encodeURIComponent(collection.id)}`, role)} key={collection.id} className="proto-collection-tile">
                <div><img src={collection.images[0]?.src || fallbackBuckets[index % fallbackBuckets.length]} alt={collection.images[0]?.alt || ""} /><span>{vm.countLabel}</span></div>
                <strong>{vm.name}</strong>
                <p>{vm.description}</p>
                <small><span className="proto-mini-avatar" />{vm.owner} · Updated {vm.updated}</small>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="proto-panel">
        <header className="proto-panel-head"><div><h2>All collections</h2><p>{rows.length} visible collections</p></div><ToolbarSearch value={query} onChange={setQuery} placeholder="Search collections..." /></header>
        <div className="proto-data-table proto-collections-table">
          <div className="proto-table-head"><span><input type="checkbox" /> Collection</span><span>Assets</span><span>Owner</span><span>Last updated</span><span>Status</span><span>Visibility</span><span>Favorites</span><span /></div>
          {rows.map((row, index) => (
            <Link href={routeWithRole(`/collections/${encodeURIComponent(row.id)}`, role)} className="proto-table-row" key={row.id}>
              <span><input type="checkbox" /><img src={collections[index]?.images[0]?.src || fallbackBuckets[index % fallbackBuckets.length]} alt="" /><strong>{row.name}<small>{row.description}</small></strong></span>
              <span>{row.countLabel.replace(" items", "").replace(" assets", "")}</span>
              <span><span className="proto-mini-avatar" />{row.owner}</span>
              <span>{row.updated}</span>
              <span><StatusChip label={row.status} tone={row.status === "Approved" ? "approved" : row.status === "Draft" ? "draft" : "review"} /></span>
              <span>{row.visibility}</span>
              <span><Star size={15} /></span>
              <span><MoreHorizontal size={15} /></span>
            </Link>
          ))}
        </div>
        <footer className="proto-pagination">1–{rows.length} of {collections.length || 48} collections <span>{[1, 2, 3, 4].map((page) => <button type="button" key={page} onClick={() => toast.message(`Page ${page} preview. Collection pagination remains local in this beta.`)}>{page}</button>)}<button type="button" onClick={() => toast.message("Next page preview. No collection membership changed.")}><ChevronRight size={15} /></button></span></footer>
      </section>
    </section>
  );
}

function PrototypeCollectionDetail({ collectionId }: { collectionId?: string }) {
  const { role } = useDemoRole();
  const all = useAssetsSearch({ role, sort: "Approved first", limit: 24 });
  const collections = all.data?.collections || [];
  const decoded = collectionId ? decodeURIComponent(collectionId) : "";
  const selected = collections.find((collection) => collection.id === decoded || collection.id === collectionId || collection.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === decoded) || collections[0];
  const collectionAssets = useAssetsSearch({ role, collection: selected?.id, sort: "Approved first", limit: 18 });
  const assets = collectionAssets.data?.assets || all.data?.assets || [];
  const sharePath = selected?.id ? `/collections/${encodeURIComponent(selected.id)}` : "/collections";
  const shareUrl = roleSafeUrl(sharePath, role);
  const [tab, setTab] = useState("Assets");

  function downloadAll() {
    const total = assets.length;
    const eligible = assets.filter((asset) => statusForAsset(asset).label === "Approved").length;
    toast.message("Download all checked.", {
      description: `${eligible} of ${total} assets appear approved in this role-safe view. Each download still runs its own approved-copy gate; source/original files are excluded.`
    });
  }

  return (
    <section className="proto-page proto-collection-detail-page">
      <div className="proto-collection-detail">
        <main>
          <header className="proto-collection-hero">
            <div className="proto-collection-cover-large"><AssetImage asset={assets[0]} /></div>
            <div>
              <span>Collection</span>
              <h1>{selected?.name || "Spring Campaign 2024"} <Star size={17} /> <MoreHorizontal size={18} /></h1>
              <p>{selected?.countLabel || "12 assets"}</p>
              <p>{selected?.description || "Campaign assets for web, social, and print."}</p>
              <div className="proto-tag-row"><span>Campaign</span><span>Spring</span><span>Outdoor</span><span>+ Add tag</span></div>
            </div>
            <dl>
              <div><dt>Created</dt><dd>May 2, 2024 by Taylor Morgan</dd></div>
              <div><dt>Last updated</dt><dd>May 14, 2024</dd></div>
              <div><dt>Collection ID</dt><dd>{selected?.id || "col_8f7a2c9d"}</dd></div>
            </dl>
            <div className="proto-collection-actions"><PillButton onClick={() => void copyRoleSafeLink(sharePath, role, "Collection link copied")}><Share2 size={16} />Share collection</PillButton><LinkButton href={routeWithRole("/library", role)} tone="primary">Add assets <ChevronDown size={14} /></LinkButton></div>
          </header>
          <SegmentedTabs tabs={["Assets", "Details", "Activity", "Distribution"]} active={tab} onChange={setTab} />
          <div className="proto-collection-toolbar"><label className="proto-checkbox-label"><input type="checkbox" /> <span>{assets.length || selected?.count || 12} assets</span></label><PillButton onClick={() => toast.message("Collection filters use current collection membership in local beta.")}><SlidersHorizontal size={16} />Filters</PillButton><div className="proto-toolbar-spacer" /><button className="proto-sort" type="button" onClick={() => toast.message("Collection assets are sorted newest first in this beta.")}>Sort by: Newest <ChevronDown size={14} /></button><IconButton label="Grid" onClick={() => toast.message("Grid view active.")}><LayoutGrid size={16} /></IconButton><IconButton label="List" onClick={() => toast.message("List view is available in the collection table below.")}><List size={16} /></IconButton></div>
          {tab === "Assets" ? <div className="proto-collection-grid">
            {assets.slice(0, 11).map((asset) => <AssetCard key={asset.id} asset={asset} selected={false} active={false} onSelect={() => undefined} onInspect={() => window.location.assign(routeWithRole(`/assets/${asset.id}`, role))} />)}
            <Link href={routeWithRole("/library", role)} className="proto-add-asset-card"><Plus size={20} />Add assets</Link>
          </div> : <section className="proto-panel proto-tab-summary"><h2>{tab}</h2><p>{tab === "Distribution" ? "Distribution settings are shown in the right panel. Public links are not created in local beta." : tab === "Activity" ? "Activity is based on local audit and exported ResourceSpace state when available." : selected?.description || "Collection detail uses imported album membership and saved-view results."}</p></section>}
        </main>
        <aside className="proto-distribution-panel">
          <section><h2>Distribution</h2><p className="proto-gate-note">ResourceSpace catalog remains authoritative. Source/original files remain restricted; Download all uses per-asset gated checks and creates no public bundle in local beta.</p><label className="proto-toggle-row"><span>Share collection</span><input type="checkbox" defaultChecked /></label><label className="proto-field"><span>Share link</span><input readOnly value={shareUrl} /></label><PillButton onClick={() => void copyRoleSafeLink(sharePath, role, "Collection link copied")}>Copy link</PillButton><label className="proto-field"><span>Who has access</span><select defaultValue="request"><option value="request">Request access required</option><option value="view">Team beta roles can view</option></select></label><p><Users size={14} />Team beta role gates active</p><label className="proto-field"><span>Expiration</span><input type="text" readOnly value="local beta only" /></label><PillButton onClick={downloadAll}><Download size={16} />Download all</PillButton></section>
          <section><h2>Embed collection</h2><label className="proto-field"><span>Code</span><input readOnly value={`<iframe src="${shareUrl}" />`} /></label><PillButton onClick={() => void copyText(`<iframe src="${shareUrl}" />`).then(() => toast.success("Embed code copied", { description: "Local beta embed only. It does not create public storage." }))}>Copy code</PillButton></section>
          <section><h2>Analytics <small>last 30 days</small></h2><div className="proto-mini-metrics"><MetricCard label="Views" value="243" trend="↑ 18%" /><MetricCard label="Downloads" value="67" trend="↑ 12%" /><MetricCard label="Unique viewers" value="48" trend="↑ 20%" /></div><div className="proto-chart" /></section>
          <section><h2>Recent activity</h2><p>Jordan Lee downloaded 3 assets</p><p>Taylor Morgan updated collection details</p><p>Sophie Bennett viewed collection</p></section>
        </aside>
      </div>
    </section>
  );
}

export function PrototypeUploadIntake() {
  const { role } = useDemoRole();
  const assetsSearch = useAssetsSearch({ role, sort: "Approved first", limit: 10 });
  const assets = assetsSearch.data?.assets || [];
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    collection: "Spring Campaign 2024",
    brand: "TJC Media",
    usageRights: "Commercial use",
    credit: "Media team",
    description: "Spring campaign assets featuring new outdoor and lifestyle imagery.",
    sourceLink: "",
    eventDate: new Date().toISOString().slice(0, 10),
    tags: "campaign, spring, outdoor"
  });
  const [message, setMessage] = useState("");
  const canSend = canUpload(role);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const data = new FormData();
    data.set("role", role);
    data.set("collection", form.collection);
    data.set("eventName", form.collection);
    data.set("ministry", form.brand);
    data.set("usageRights", form.usageRights);
    data.set("source", form.credit);
    data.set("sourceLink", form.sourceLink);
    data.set("notes", form.description);
    data.set("eventDate", form.eventDate);
    data.set("tags", form.tags);
    data.set("peopleVisible", "Unknown");
    data.set("minorsVisible", "Unknown");
    data.set("approvalSuggestion", "Needs Review");
    files.forEach((file) => data.append("files", file));
    const response = await fetch("/api/upload", { method: "POST", body: data });
    const payload = await response.json().catch(() => ({}));
    setMessage(payload.message || payload.error || (response.ok ? "Upload intake sent to media team. Not public until review." : "Upload blocked."));
  }

  if (!canSend) {
    return (
      <section className="proto-page proto-access-block">
        <div className="proto-panel">
          <h1>Upload / Intake</h1>
          <p>Sharing photos requires Contributor access.</p>
          <p>Viewer accounts can browse approved media, inspect metadata, and request review-gated downloads. Upload intake stays closed until a Contributor role is active.</p>
          <LinkButton href={routeWithRole("/library", role)}>Back to Library</LinkButton>
        </div>
      </section>
    );
  }

  const queuedPreviewFiles: UploadListItem[] = [
    { name: "Lifestyle-Outdoor-08.jpg", size: 5_200_000 },
    { name: "Portrait-Urban-047.jpg", size: 7_100_000 },
    { name: "Architecture-20.psd", size: 48_600_000 },
    { name: "Canyon-Light-11.jpg", size: 6_300_000 },
    { name: "Still-Life-Branches.jpg", size: 4_700_000 },
    { name: "Product-Set-04.jpg", size: 3_900_000 },
    { name: "Video-Campaign.mov", size: 128_400_000 },
    { name: "Brand-Guide.pdf", size: 12_100_000 }
  ];
  const queueFiles = files.length ? files : queuedPreviewFiles;
  const queueProgress = files.length ? 0 : 67;
  const queueLabel = files.length ? `${files.length} file${files.length === 1 ? "" : "s"} ready to submit` : "Current intake queue preview";
  const queueRows = queueFiles.slice(0, 8).map((file, index) => {
    const status = files.length ? "Queued" : index < 2 ? "Completed" : index < 4 ? "Uploading" : "Queued";
    const progress = files.length ? 0 : index < 2 ? 100 : index === 2 ? 74 : index === 3 ? 48 : 0;
    return { file, status, progress };
  });
  const uploadTags = form.tags.split(/[|,]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 8);

  return (
    <form className="proto-page proto-upload-page" onSubmit={submit}>
      <PageHeader title="Upload / Intake" subtitle="Batch upload assets and assign metadata.">
        <PillButton onClick={() => { const draftMessage = "Draft saved locally in this browser. Nothing was published."; setMessage(draftMessage); toast.message(draftMessage); }}>Save as draft</PillButton>
        <PillButton type="submit" tone="primary" disabled={!canSend}><Upload size={16} />{canSend ? "Start upload" : "Contributor access required"} <ChevronDown size={14} /></PillButton>
      </PageHeader>
      <div className="proto-upload-workspace">
        <main>
          <section className="proto-upload-drop-panel">
            <label
              className="proto-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                setFiles(Array.from(event.dataTransfer.files || []));
              }}
            >
              <Upload size={34} /><span>Drag & drop files or folders<br />or <u>browse</u></span><small>Supports JPG, PNG, TIFF, PSD, MP4, MOV, PDF and more.</small><input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
            </label>
            <div className="proto-upload-settings"><h2>Upload settings</h2><label>Duplicates<select defaultValue="skip"><option value="skip">Skip exact matches</option></select></label><label>Color profile<select defaultValue="srgb"><option value="srgb">Convert to sRGB</option></select></label></div>
            <div className="proto-upload-settings"><h2>Intake options</h2>{["Auto-generate previews", "Extract metadata", "Run AI tagging"].map((item) => <label className="proto-toggle-row" key={item}>{item}<input type="checkbox" defaultChecked /></label>)}</div>
          </section>
          <p className="proto-upload-safety-note"><ShieldCheck size={15} />Every imported asset defaults to Needs Review / Do Not Publish. Source/original files remain restricted.</p>
          <section className="proto-panel proto-upload-queue">
            <header className="proto-panel-head"><div><h2>Upload queue</h2><p>{queueLabel}</p></div><div className="proto-upload-total-progress"><span>{queueProgress}%</span><ProgressMeter value={queueProgress} /></div><PillButton onClick={() => toast.message("Pause applies to active uploads; selected files are only staged locally until Start upload.")}><Pause size={14} />Pause all</PillButton><PillButton onClick={() => setFiles([])}><X size={14} />Cancel all</PillButton></header>
            <div className="proto-upload-table-head"><span>File</span><span>Size</span><span>Status</span><span>Progress</span><span /></div>
            {queueRows.map(({ file, status, progress }, index) => <div className="proto-upload-row" key={`${file.name}-${index}`}><span>{assets[index] ? <AssetImage asset={assets[index]} /> : <FileText size={18} />}</span><strong>{file.name}</strong><small>{formatBytes(file.size)}</small><StatusChip label={status} tone={status === "Completed" ? "approved" : status === "Uploading" ? "review" : "draft"} /><div className="proto-upload-progress"><ProgressMeter value={progress} /><small>{progress}%</small></div><button type="button" onClick={() => files.length ? setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index)) : toast.message("Select real files to edit the intake queue.")}>{files.length || status === "Queued" ? <X size={14} /> : <Pause size={14} />}</button></div>)}
            <footer><span>{queueFiles.length} files in total</span><span>Estimated time remaining: 2 min</span><strong>2.1 GB</strong></footer>
          </section>
          <section className="proto-panel"><header className="proto-panel-head"><h2>Recent submitted media</h2></header><ThumbnailStrip assets={assets} /></section>
          <div className="proto-upload-bottom">
            <section className="proto-panel"><h2>Validation</h2><p><StatusChip label="2 files missing description" tone="review" /></p><p><StatusChip label="1 file color profile will be converted" tone="draft" /></p><p><StatusChip label="No duplicate files detected" tone="approved" /></p><PillButton onClick={() => toast.message("Validation details remain local to the intake packet until submitted.")}>View details</PillButton></section>
            <section className="proto-panel"><h2>AI tagging suggestions</h2><div className="proto-tag-row">{["outdoor", "nature", "mountain", "lake", "travel", "portrait", "architecture", "modern", "minimal"].map((tag) => <span key={tag}>{tag} <CheckCircle2 size={11} /></span>)}</div><footer><PillButton onClick={() => toast.message("Review tag suggestions before submit; no taxonomy write was made.")}>Review all</PillButton><PillButton tone="primary" onClick={() => toast.message("Suggestions copied into intake metadata. ResourceSpace taxonomy remains unchanged.")}>Apply all</PillButton></footer></section>
            <section className="proto-panel"><h2>Batch summary</h2><dl className="proto-dl"><div><dt>Total files</dt><dd>12</dd></div><div><dt>Uploaded</dt><dd>8</dd></div><div><dt>Queued</dt><dd>4</dd></div><div><dt>Failed</dt><dd>0</dd></div><div><dt>Total size</dt><dd>2.1 GB</dd></div></dl></section>
          </div>
        </main>
        <aside className="proto-upload-side">
          <section className="proto-panel proto-upload-meta-card"><header className="proto-panel-head"><h2>Assign metadata</h2><ChevronDown size={14} /></header>{(["collection", "brand", "usageRights", "credit", "description", "sourceLink", "tags"] as const).map((key) => <label key={key} className="proto-field"><span>{key === "usageRights" ? "Usage rights" : key === "sourceLink" ? "Source link" : key[0].toUpperCase() + key.slice(1)}</span><input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<div className="proto-tag-row">{uploadTags.map((tag) => <span key={tag}>{tag}</span>)}</div><h3>Rights & Usage</h3><label className="proto-field"><span>License</span><select defaultValue="standard"><option value="standard">Standard License</option></select></label><label className="proto-field"><span>Restrictions</span><input readOnly value="No public use until review" /></label><label className="proto-field"><span>Expiry date</span><input type="date" value={form.eventDate} onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))} /></label></section>
          <section className="proto-panel"><header className="proto-panel-head"><h2>Recent uploads</h2><button type="button" onClick={() => toast.message("Recent uploads show safe ResourceSpace/export records in this local beta.")}>View all</button></header>{assets.slice(0, 5).map((asset) => <p className="proto-mini-asset" key={asset.id}><span><AssetImage asset={asset} /></span><strong>{displayTitle(asset)}<small>{asset.importDate || "May 14, 2024"}</small></strong></p>)}</section>
        </aside>
      </div>
      {message ? <p className="proto-gate-note">{message}</p> : null}
    </form>
  );
}

function reviewRows(assets: StockMediaAsset[]): ReviewQueueRowViewModel[] {
  return assets.map((asset, index) => ({
    id: asset.id,
    asset,
    due: index % 3 === 0 ? "Today" : `${index + 1} days left`,
    assignee: "Taylor Morgan",
    stage: index % 2 ? "Brand Review" : "Legal Review",
    priority: index % 3 === 0 ? "High" : index % 3 === 1 ? "Medium" : "Low"
  }));
}

export function PrototypeReviewApprove({ requestId }: { requestId?: string } = {}) {
  return requestId ? <PrototypeReviewDetail requestId={requestId} /> : <PrototypeReviewQueue />;
}

function PrototypeReviewQueue() {
  const { role } = useDemoRole();
  const queue = useReviewQueue(role, "pending");
  const fallbackReviewAssets = useAssetsSearch({ role, view: "needs-review", sort: "Approved first", limit: 24 });
  const allReviewAssets = useAssetsSearch({ role, sort: "Newest", limit: 24 });
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"All" | "High" | "Medium" | "Low">("All");
  const reviewAssets = queue.data?.assets?.length
    ? queue.data.assets
    : fallbackReviewAssets.data?.assets?.length
      ? fallbackReviewAssets.data.assets
      : allReviewAssets.data?.assets || [];
  const queueLoading = queue.loading || fallbackReviewAssets.loading || allReviewAssets.loading;
  const rows = reviewRows(reviewAssets)
    .filter((row) => displayTitle(row.asset).toLowerCase().includes(query.toLowerCase()))
    .filter((row) => priority === "All" || row.priority === priority);

  if (!canReview(role)) {
    return <section className="proto-page proto-access-block"><div className="proto-panel"><h1>Review Queue</h1><p>Review inbox requires reviewer access.</p><p>Viewer and Contributor roles cannot approve, restrict, or queue review decisions.</p></div></section>;
  }

  return (
    <section className="proto-page proto-review-queue-page">
      <PageHeader title="Review Queue" count={queueLoading && !rows.length ? "Loading" : `${rows.length}`} subtitle="Assets awaiting your review and approval">
        <PillButton onClick={() => toast.message("Saved review views map to status buckets in this beta.")}>Saved views <ChevronDown size={14} /></PillButton><PillButton onClick={() => toast.message("Filter pills below update the visible queue.")}><SlidersHorizontal size={16} />Filters <span className="proto-count">2</span></PillButton><PillButton onClick={() => toast.message("Queue settings are read-only until reviewer workflow storage is configured.")}><Settings size={16} />Queue settings</PillButton><PillButton tone="primary" onClick={() => toast.message("Bulk actions are disabled until every selected asset has required evidence.")}>Bulk actions <ChevronDown size={14} /></PillButton>
      </PageHeader>
      <div className="proto-review-filters"><ToolbarSearch value={query} onChange={setQuery} /><PillButton onClick={() => toast.message("Status filter uses the pending reviewer queue in this beta.")}>Status: Pending <ChevronDown size={14} /></PillButton><PillButton onClick={() => toast.message("Assignee filter: current reviewer.")}>Assignee: Me <ChevronDown size={14} /></PillButton><PillButton onClick={() => toast.message("Due date sort stays visible in table order.")}>Due: All <ChevronDown size={14} /></PillButton><PillButton onClick={() => toast.message("Use Library collections for album filtering.")}>Collection: All <ChevronDown size={14} /></PillButton><PillButton onClick={() => setPriority(priority === "All" ? "High" : priority === "High" ? "Medium" : priority === "Medium" ? "Low" : "All")}>Priority: {priority} <ChevronDown size={14} /></PillButton><button type="button" onClick={() => { setQuery(""); setPriority("All"); }}>Clear all</button><IconButton label="Grid" onClick={() => toast.message("Grid review cards are not enabled; table is reviewer-safe.")}><LayoutGrid size={16} /></IconButton><IconButton label="List" onClick={() => toast.message("List view active.")}><List size={16} /></IconButton></div>
      <div className="proto-review-workbench">
        <aside className="proto-review-buckets">{[["Needs Review", 14, "Assets submitted and awaiting your approval"], ["Needs Evidence", 6, "Proof or source documentation requested"], ["Approved Internal", 32, "Approved internally, pending next step"], ["Blocked", 3, "Action required before approval can proceed"], ["Expiring Soon", 8, "Assets expiring within 30 days"]].map(([label, count, detail], index) => <button type="button" className={index === 0 ? "is-active" : ""} key={label} onClick={() => toast.message(`${label} bucket selected. Queue data remains role-gated and read-only until a review action is submitted.`)}><span /><strong>{label}<em>{count}</em></strong><small>{detail}</small></button>)}<section><h3>Your review snapshot</h3><div><strong>27</strong><span>Pending</span></div><div><strong>18</strong><span>Approved</span></div><div><strong>4</strong><span>Returned</span></div><footer>Avg. time to review <strong>1.3 days</strong></footer></section></aside>
        <main className="proto-panel proto-review-table"><header className="proto-panel-head"><h2>{queueLoading && !rows.length ? "Loading review queue" : `${rows.length} assets`}</h2><button type="button" onClick={() => toast.message("Review queue sorted by due date in this beta.")}>Sort by: Due date (soonest) <ChevronDown size={14} /></button></header><div className="proto-data-table"><div className="proto-table-head"><span><input type="checkbox" /> Asset</span><span>Status</span><span>Due date</span><span>Assignee</span><span>Review stage</span><span>Priority</span><span /></div>{rows.length ? rows.map((row) => <Link href={routeWithRole(`/review/${row.id}`, role)} className="proto-table-row" key={row.id}><span><input type="checkbox" /><span className="proto-row-thumb"><AssetImage asset={row.asset} /></span><strong>{displayTitle(row.asset)}<small>{assetMeta(row.asset)}</small><small>{(row.asset.tags || []).slice(0, 3).join(" · ")}</small></strong></span><span><StatusChip asset={row.asset} /></span><span>{row.due}</span><span><span className="proto-mini-avatar" />{row.assignee}</span><span>{row.stage}</span><span><StatusChip label={row.priority} tone={row.priority === "High" ? "danger" : row.priority === "Medium" ? "review" : "approved"} /></span><span><MoreHorizontal size={15} /></span></Link>) : queueLoading ? Array.from({ length: 5 }).map((_, index) => <div className="proto-table-row proto-skeleton-row" key={index}><span><span className="proto-row-thumb" /><strong>Loading review asset<small>ResourceSpace/export queue</small></strong></span><span /><span /><span /><span /><span /><span /></div>) : <div className="proto-empty-table">No review assets match current filters. Clear filters or open Library needs-review view.</div>}</div><footer className="proto-pagination">{rows.length ? `1–${rows.length} of ${rows.length} items` : queueLoading ? "Loading items" : "0 items"} <span><button type="button" onClick={() => toast.message("Page 1 active.")}>1</button><button type="button" onClick={() => toast.message("Next review page preview. Queue state did not change.")}><ChevronRight size={15} /></button></span></footer></main>
      </div>
    </section>
  );
}

function PrototypeReviewDetail({ requestId }: { requestId: string }) {
  const { role } = useDemoRole();
  const queue = useReviewQueue(role, "pending");
  const detail = useAssetDetail(requestId, role);
  const selected = queue.data?.assets.find((asset) => asset.id === requestId) || detail.data?.asset || queue.data?.assets[0];
  const gate = useDownloadGate(selected?.id || "", role);
  const [checklist, setChecklist] = useState<ReviewEvidenceChecklist>(emptyReviewChecklist);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setChecklist(initialReviewChecklistForAsset(selected));
    setComment("");
  }, [selected?.id]);

  if (!canReview(role)) return <section className="proto-page proto-access-block"><div className="proto-panel"><h1>Review Detail</h1><p>Review inbox requires reviewer access.</p><p>Reviewer evidence and decision actions fail closed for non-reviewer roles.</p></div></section>;

  async function decide(action: "Approve Public" | "Request More Info" | "Searchable Archive" | "Do Not Use") {
    if (!selected) return;
    const disabled = reviewActionDisabledReason({ asset: selected, action, checklist, note: comment });
    if (disabled) {
      setMessage(`Review blocked. ${disabled}.`);
      return;
    }
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, id: selected.id, action, notes: comment, checklist, reviewerName: "Taylor Morgan", reviewDate: new Date().toISOString().slice(0, 10), approvalScope: "Public" satisfies UsageScope })
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(payload.message || payload.error || "Decision queued for pending ResourceSpace sync.");
  }

  async function downloadReviewAsset() {
    if (!selected) return;
    const payload = await gate.requestDownload({ reason: `Reviewer approved-copy check for ${displayTitle(selected)}` });
    if (payload.allowed && payload.downloadUrl) {
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
      setMessage("Approved-copy gate passed. Source/original remains restricted.");
    } else {
      setMessage(payload.message || payload.reason || "Download blocked by policy gate.");
    }
  }

  if (!selected) return <section className="proto-page"><div className="proto-loading">Loading review item...</div></section>;

  return (
    <section className="proto-page proto-review-detail-page">
      <header className="proto-review-detail-top"><div><p><ChevronLeft size={14} /> Workflow <ChevronRight size={12} /> Review <ChevronRight size={12} /> Review Detail / Approve <StatusChip asset={selected} /></p><h1>{displayTitle(selected)}</h1></div><div><PillButton onClick={() => void copyRoleSafeLink(`/review/${selected.id}`, role, "Review link copied")}><Share2 size={16} />Share</PillButton><PillButton onClick={() => void downloadReviewAsset()}><Download size={16} />Download</PillButton><IconButton label="More" onClick={() => setMessage("More actions stay role-gated. Source/original access is not exposed.")}><MoreHorizontal size={16} /></IconButton><LinkButton href={routeWithRole("/review", role)}><X size={16} />Close</LinkButton></div></header>
      <div className="proto-review-detail-grid">
        <main>
          <div className="proto-version-bar"><Link href={routeWithRole("/library", role)}>Back to Library</Link><StatusChip asset={selected} /><button type="button" onClick={() => setMessage("Current version only. Prior source/original versions remain restricted.")}>Version 2 (Current) <ChevronDown size={14} /></button><span /><IconButton label="Previous" onClick={() => setMessage("Previous asset navigation stays within reviewer queue; no source version opened.")}><ChevronLeft size={16} /></IconButton><IconButton label="Next" onClick={() => setMessage("Next asset navigation stays within reviewer queue; no source version opened.")}><ChevronRight size={16} /></IconButton></div>
          <section className="proto-comparison-panel"><div><header><strong>Version 1</strong><span>Prior preview unavailable when ResourceSpace export has one version.</span></header><AssetImage asset={selected} variant="detail" /></div><div><header><strong>Version 2</strong><span>Current safe preview derivative</span></header><AssetImage asset={selected} variant="detail" /></div><button type="button" className="proto-split-handle" onClick={() => setMessage("Comparison mode stays visual only; source/original versions are not opened.")}><ChevronLeft size={15} /><ChevronRight size={15} /></button><footer><span><Search size={15} /> − + 100%</span><span>Side by side · Overlay · Swipe</span><span>Full screen</span></footer></section>
          <div className="proto-review-detail-lower"><section className="proto-panel"><header className="proto-panel-head"><h2>Comments (4)</h2><button type="button" onClick={() => setMessage("Comments sorted newest first.")}>Newest <ChevronDown size={14} /></button></header><label className="proto-comment-box"><input placeholder="Add a comment..." value={comment} onChange={(event) => setComment(event.target.value)} /><button type="button" onClick={() => setMessage("Reviewer note is held in the form until a decision is queued.")}><Send size={15} /></button></label>{["Love the composition. Can we brighten the shadows slightly?", "Updated the shadows and warmed the tone slightly.", "Much better, approved.", "Please confirm model release is attached."].map((text, index) => <p className="proto-comment-item" key={text}><span className="proto-mini-avatar" /><strong>{index % 2 ? "Jordan Lee" : "Taylor Morgan"}<small>May 14, 2024 · {index + 9}:15 AM</small></strong><span>{text}</span></p>)}</section><section className="proto-panel"><h2>Change requests (1)</h2><p><strong>CR-2024-17</strong> Confirm model release form is attached to this asset.</p><h2>Evidence checklist</h2>{reviewChecklistItems.map((item) => <label key={item.field} className="proto-check-row"><input type="checkbox" checked={Boolean(checklist[item.field])} onChange={() => setChecklist((current) => ({ ...current, [item.field]: !current[item.field] }))} /><span>{item.label}</span></label>)}</section></div>
        </main>
        <aside className="proto-review-side">
          <InspectorPanel asset={selected} index={0} total={1} />
          <section className="proto-panel proto-decision-card"><header className="proto-panel-head"><h2>Review decision</h2><StatusChip label="Required" tone="review" /></header>{[
            { label: "Approve", detail: "Approve only after evidence is complete.", tone: "approved", action: "Approve Public" as const },
            { label: "Request changes", detail: "Return to uploader with evidence gaps.", tone: "review", action: "Request More Info" as const },
            { label: "Restrict", detail: "Keep searchable, but archive/restricted.", tone: "draft", action: "Searchable Archive" as const },
            { label: "Block", detail: "Mark Do Not Use until media admin resolves.", tone: "danger", action: "Do Not Use" as const }
          ].map((item) => <button type="button" key={item.label} onClick={() => void decide(item.action)}><StatusChip label={item.label} tone={item.tone} /><span>{item.detail}</span><ChevronRight size={15} /></button>)}<label className="proto-field"><span>Reviewer notes</span><textarea placeholder="Add notes about your decision..." value={comment} onChange={(event) => setComment(event.target.value)} /></label><p>Decisions queue or sync truthfully. ResourceSpace is not changed unless live writeback is explicitly configured and confirmed.</p></section>
        </aside>
      </div>
      {message ? <p className="proto-gate-note">{message}</p> : null}
    </section>
  );
}

export function PrototypeRequestsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All requests");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState(requestRows[0].id);
  const rows = requestRows
    .filter((row) => row.request.toLowerCase().includes(query.toLowerCase()))
    .filter((row) => tab === "All requests" || tab === "Inbox" && row.status !== "Approved" || tab === "My requests" && row.owner === "Taylor Morgan" || tab === "Flagged" && row.priority === "High");
  const selected = rows.find((row) => row.id === selectedId) || rows[0];

  return (
    <section className="proto-page proto-requests-page">
      <div className="proto-requests-grid">
        <main>
          <PageHeader title="Requests" count="48 total" search={query} onSearch={setQuery}>
            <PillButton onClick={() => setMessage("Request filters are applied through the tab row in local beta.")}><SlidersHorizontal size={16} />Filters</PillButton><PillButton onClick={() => setMessage("Grouping is display-only in local beta; request records are not persisted.")}>Group by: None</PillButton><PillButton tone="primary" onClick={() => setMessage("New request intake is not enabled yet. Use Report Issues for beta feedback or Upload for media intake.")}>New request <Plus size={15} /></PillButton>
          </PageHeader>
          <div className="proto-filter-pills">{["Inbox", "All requests", "My requests", "Flagged"].map((item, index) => <button type="button" className={tab === item ? "is-active" : ""} key={item} onClick={() => setTab(item)}>{item} <span>{[12, 48, 5, 2][index]}</span></button>)}</div>
          <section className="proto-data-table proto-requests-table"><div className="proto-table-head"><span><input type="checkbox" /> Request</span><span>Requester</span><span>Due date</span><span>Status</span><span>Priority</span><span>Owner</span><span>Usage</span><span /></div>{rows.map((row) => <button type="button" className={`proto-table-row ${row.id === selected.id ? "is-active" : ""}`} key={row.id} onClick={() => setSelectedId(row.id)}><span><input type="checkbox" checked={row.id === selected.id} readOnly /><strong>{row.request}<small>· Spring Campaign 2024</small></strong></span><span><span className="proto-mini-avatar" />{row.requester}<small>Marketing</small></span><span>{row.due}</span><span><StatusChip label={row.status === "Pending Approval" ? "Pending" : row.status} tone={row.status === "Approved" ? "approved" : row.status === "New" ? "draft" : "review"} /></span><span><StatusChip label={row.priority} tone={row.priority === "High" ? "danger" : row.priority === "Medium" ? "review" : "approved"} /></span><span><span className="proto-mini-avatar" />{row.owner}</span><span>{row.usage}</span><span><MoreHorizontal size={15} /></span></button>)}</section>
        </main>
        {selected ? <aside className="proto-request-panel"><div className="proto-inspector-nav"><ChevronLeft size={15} /><span>1 of 48</span><ChevronRight size={15} /><X size={15} /></div><header><h2>{selected.request}</h2><StatusChip label={selected.status} tone="review" /><p>Requested by {selected.requester} on May 8, 2024</p></header><SegmentedTabs tabs={["Details", "Comments (3)", "Activity"]} active="Details" onChange={() => setMessage("Request panel tabs are preview-only until request storage is connected.")} /><section><h3>Request overview</h3><dl className="proto-dl"><div><dt>Due date</dt><dd>{selected.due}</dd></div><div><dt>Priority</dt><dd>{selected.priority}</dd></div><div><dt>Requested usage</dt><dd>{selected.usage}</dd></div></dl><p>We need hero images, lifestyle shots, and product close-ups for our spring campaign across web, social, and print.</p></section><section><h3>Approval state</h3><div className="proto-stepper"><span className="is-done">Requested</span><span className="is-active">In Review</span><span>Approved</span><span>Fulfilled</span></div></section><section><h3>Requested files (6)</h3><div className="proto-request-files">{fallbackBuckets.slice(0, 6).map((src) => <img key={src} src={src} alt="" />)}</div><PillButton onClick={() => setMessage("Requested files are request artifacts. Asset request records are not persisted yet.")}>View all files</PillButton></section><section><h3>Fulfillment</h3><label className="proto-field"><span>Owner</span><input readOnly value="Taylor Morgan" /></label><label className="proto-field"><span>Due date</span><input readOnly value={selected.due} /></label><label className="proto-field"><span>Priority</span><input readOnly value={selected.priority} /></label></section><footer><PillButton onClick={() => setMessage("Request status update is disabled until request workflow storage is connected.")}>Update status</PillButton><PillButton tone="primary" onClick={() => setMessage("Fulfillment is disabled in local beta; no fake completion was recorded.")}>Mark as fulfilled</PillButton></footer>{message ? <p className="proto-gate-note">{message}</p> : null}</aside> : <aside className="proto-request-panel"><p>No requests match this filter.</p></aside>}
      </div>
    </section>
  );
}

export function PrototypeAssetDetailPage({ id }: { id: string }) {
  const { role } = useDemoRole();
  const detail = useAssetDetail(id, role);
  const asset = detail.data?.asset;
  const related = detail.data?.related || [];
  const [tab, setTab] = useState("Details");
  const [message, setMessage] = useState("");
  const gate = useDownloadGate(asset?.id || "", role);

  async function download() {
    if (!asset) return;
    const payload = await gate.requestDownload({ reason: `Approved-copy request for ${displayTitle(asset)}` });
    if (payload.allowed && payload.downloadUrl) {
      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
    } else {
      setMessage(payload.message || payload.reason || "Download blocked by policy gate.");
    }
  }

  return (
    <section className="proto-page proto-asset-detail-page">
      {detail.loading ? <div className="proto-loading">Loading asset...</div> : detail.error ? <div className="proto-error">{detail.error}</div> : asset ? (
        <>
          <header className="proto-detail-top"><p><Link href={routeWithRole("/library", role)}>Library</Link> <ChevronRight size={12} /> Asset detail <StatusChip asset={asset} /></p><div><PillButton onClick={() => void copyRoleSafeLink(`/assets/${asset.id}`, role, "Asset link copied")}><Share2 size={16} />Share</PillButton><PillButton tone="primary" onClick={() => void download()}><Download size={16} />Download</PillButton><IconButton label="More" onClick={() => setMessage("More actions stay role-gated. Source/original access is not exposed.")}><MoreHorizontal size={16} /></IconButton><LinkButton href={routeWithRole("/library", role)}><X size={16} />Close</LinkButton></div></header>
          <div className="proto-asset-detail-grid"><main><section className="proto-detail-media-card"><header><div><h1>{displayTitle(asset)}</h1><p>{assetMeta(asset) || assetRecordRef(asset)}</p></div><button type="button" onClick={() => setMessage("Current preview version only. Source/original version history stays restricted.")}>Version 2 (Current) <ChevronDown size={14} /></button></header><div className="proto-detail-preview"><AssetImage asset={asset} variant="detail" /></div><p className="proto-detail-safety-note">Source/original files remain restricted. Downloads use the approved-copy gate and review policy.</p></section><section className="proto-panel"><SegmentedTabs tabs={["Details", "Metadata", "Activity", "History"]} active={tab} onChange={setTab} /><div className="proto-detail-stack">{tab === "Details" ? <><section><h3>Tags</h3><div className="proto-tag-row">{(asset.tags || asset.tjcTerms || []).slice(0, 8).map((tag) => <span key={tag}>{tag}</span>)}</div></section><section><h3>Collection</h3><p>{asset.collection || "Unassigned"}</p></section><section><h3>Usage</h3><p>{asset.usageScope}. {asset.usageGuidance || "Reviewer approval required before public use."}</p></section></> : tab === "Metadata" ? <dl className="proto-dl"><div><dt>Record</dt><dd>{assetRecordRef(asset)}</dd></div><div><dt>Type</dt><dd>{assetType(asset)}</dd></div><div><dt>Dimensions</dt><dd>{asset.imageDimensions || "Not exported"}</dd></div><div><dt>Size</dt><dd>{formatBytes(asset.fileSizeBytes)}</dd></div><div><dt>Source</dt><dd>{asset.sourceSystem || asset.sourcePlatform || "ResourceSpace/export snapshot"}</dd></div></dl> : tab === "Activity" ? <><p><strong>Review state</strong> {asset.reviewedDate || "Pending review"}</p><p>{asset.pendingReviewWrite ? `Pending write: ${asset.pendingReviewWrite.syncState}` : "No pending ResourceSpace write."}</p></> : <><p>v2 · current preview derivative</p><p>v1 · prior preview copy</p><p>Original/source history is restricted.</p></>}<section><h3>Related assets</h3><ThumbnailStrip assets={related.length ? related : [asset]} limit={5} /></section><label className="proto-comment-box"><input placeholder="Add a comment..." /><button type="button" onClick={() => setMessage("Comment captured locally for demo. Durable comments need workflow storage.")}><Send size={15} /></button></label></div></section></main><InspectorPanel asset={asset} index={0} total={1} /></div>
          {message ? <p className="proto-gate-note">{message}</p> : null}
        </>
      ) : <div className="proto-error">Asset not found.</div>}
    </section>
  );
}

export function PrototypeUsersGroupsPage() {
  const { role } = useDemoRole();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Users");
  const [panelTab, setPanelTab] = useState("Permissions");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(userRows[0]);
  const rows = userRows
    .filter((row) => row.name.toLowerCase().includes(query.toLowerCase()) || row.email.toLowerCase().includes(query.toLowerCase()))
    .filter((row) => roleFilter === "All roles" || row.role === roleFilter);
  if (!canAdmin(role)) return <section className="proto-page proto-access-block"><div className="proto-panel"><h1>Users & Groups</h1><p>Governance requires DAM Admin role.</p><p>Identity, role, and access changes are disabled for non-admin roles.</p></div></section>;

  return (
    <section className="proto-page proto-users-page">
      <div className="proto-users-grid">
        <main>
          <PageHeader title="Users & Groups" subtitle="Manage users, groups, roles, and access." search={query} onSearch={setQuery}>
            <PillButton onClick={() => setRoleFilter(roleFilter === "All roles" ? "DAM Admin" : roleFilter === "DAM Admin" ? "Reviewer" : roleFilter === "Reviewer" ? "Contributor" : "All roles")}><SlidersHorizontal size={16} />{roleFilter}</PillButton>
            <PillButton tone="secondary" onClick={() => setMessage("Invites are disabled for local beta until identity provider is configured.")}><UserPlus size={16} />Invite user</PillButton>
          </PageHeader>
          <SegmentedTabs tabs={["Users", "Groups", "Roles", "Access Policies"]} active={activeTab} onChange={setActiveTab} />
          <div className="proto-filter-pills"><button type="button" onClick={() => setRoleFilter("All roles")}>All users ({userRows.length}) <ChevronDown size={14} /></button><button type="button" onClick={() => setRoleFilter(roleFilter === "All roles" ? "DAM Admin" : "All roles")}>{roleFilter} <ChevronDown size={14} /></button><button type="button" onClick={() => setMessage("Status filter shows active/inactive states from local beta rows.")}>All status <ChevronDown size={14} /></button><div className="proto-filter-spacer" /><IconButton label="Grid" onClick={() => setMessage("User grid view disabled; table keeps permissions scannable.")}><LayoutGrid size={16} /></IconButton><IconButton label="List" onClick={() => setMessage("List view active.")}><List size={16} /></IconButton></div>
          {activeTab === "Users" ? <section className="proto-data-table proto-users-table"><div className="proto-table-head"><span><input type="checkbox" /> User</span><span>Role</span><span>Groups</span><span>Status</span><span>Last active</span><span /></div>{rows.map((row) => <button type="button" className={`proto-table-row ${row.email === selected.email ? "is-active" : ""}`} key={row.email} onClick={() => setSelected(row)}><span><input type="checkbox" /><span className="proto-user-avatar"><img alt="" src={`https://i.pravatar.cc/96?u=${row.email}`} /></span><strong>{row.name}<small>{row.email}</small></strong></span><span><StatusChip label={row.role} tone={row.role === "DAM Admin" ? "danger" : row.role === "Reviewer" ? "review" : row.role === "Contributor" ? "draft" : "approved"} /></span><span>{row.groups}</span><span><StatusChip label={row.status} tone={row.status === "Active" ? "approved" : "draft"} /></span><span>{row.lastActive}</span><span><MoreHorizontal size={15} /></span></button>)}</section> : <section className="proto-panel proto-tab-summary"><h2>{activeTab}</h2><p>{activeTab === "Groups" ? "Groups mirror local beta role examples. Real group sync waits for SSO configuration." : activeTab === "Roles" ? "RBAC roles are enforced by route and API gates." : "Access policies preserve ResourceSpace truth, source restrictions, and safe-download gates."}</p></section>}
        </main>
        <aside className="proto-user-permissions">
          <header><span className="proto-user-avatar is-large"><img alt="" src={`https://i.pravatar.cc/160?u=${selected.email}`} /></span><div><h2>{selected.name}</h2><p>{selected.email}</p></div><StatusChip label={selected.status} tone={selected.status === "Active" ? "approved" : "draft"} /><button type="button" onClick={() => setMessage("User menu actions are disabled until identity provider sync is connected.")}><MoreHorizontal size={16} /></button><button type="button" onClick={() => setMessage("Close keeps selected user visible for admin demo.")}><X size={16} /></button></header>
          <SegmentedTabs tabs={["Overview", "Groups", "Permissions", "Activity"]} active={panelTab} onChange={setPanelTab} />
          <section><h3>{panelTab}</h3><p className="proto-effective-role"><strong>Effective role</strong> <StatusChip label={selected.role} tone={selected.role === "DAM Admin" ? "danger" : "review"} /></p><h4>Permission summary</h4>{["Manage users & groups", "Manage roles & policies", "Manage library content", "Manage workflow", "Manage settings & integrations", "View reports & analytics"].map((item) => <p className="proto-permission-row" key={item}><span>{item}</span><strong>{selected.role === "Viewer" ? "Scoped" : "Full access"} <CheckCircle2 size={14} /></strong></p>)}<PillButton onClick={() => setMessage("Role permissions are read-only in beta; RBAC enforcement remains active.")}>View role permissions</PillButton><h4>Access scope</h4><div className="proto-scope-card"><Folder size={18} /><strong><span>All collections</span><small>Global access</small></strong><PillButton onClick={() => setMessage("Scope edits disabled until SSO/group sync is connected.")}>Change scope</PillButton></div><dl className="proto-dl"><div><dt>Joined</dt><dd>Jan 12, 2024</dd></div><div><dt>Last active</dt><dd>{selected.lastActive}</dd></div></dl><PillButton tone="danger" disabled title="Disabled for local beta until identity provider is configured.">Deactivate user</PillButton><p className="proto-disabled-note">Identity changes are disabled for local beta until identity provider sync is configured.</p>{message ? <p className="proto-gate-note">{message}</p> : null}</section>
        </aside>
      </div>
    </section>
  );
}

export function PrototypeAdminPage({ initialModule, adminOnly: _adminOnly }: { initialModule?: string; adminOnly?: boolean } = {}) {
  if (initialModule === "users") return <PrototypeUsersGroupsPage />;
  return <PrototypeAdminMetadataBrand initialModule={initialModule} />;
}

function PrototypeAdminMetadataBrand({ initialModule }: { initialModule?: string }) {
  const { role } = useDemoRole();
  const readiness = useAdminReadiness(role);
  const brandAssets = useAssetsSearch({ role, query: "brand", limit: 5 });
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState(initialModule === "settings" ? "Settings" : initialModule === "reports" ? "Reports" : initialModule === "brand" ? "Brand Kits" : "Metadata");
  if (!canAdmin(role)) return <section className="proto-page proto-access-block"><div className="proto-panel"><h1>Admin / Metadata & Brand</h1><p>Governance requires DAM Admin role.</p><p>Metadata, readiness, and settings remain admin-only.</p></div></section>;
  const source = readiness.data?.source;
  const metrics = readiness.data?.metrics;
  const integrations = readiness.data?.integrationReadiness || [];
  const pendingWrites = integrations.find((item) => item.id === "pending-review-writes");
  const runtimeStore = integrations.find((item) => item.id === "runtime-state-store");
  const blockers = readiness.data?.betaReadiness?.facts
    ?.filter((fact) => !fact.ready)
    .map((fact) => `${fact.label}: ${fact.detail}`)
    || readiness.data?.actionBacklog?.map((item) => `${item.label}: ${item.action}`).slice(0, 5)
    || [];
  const betaReady = readiness.data?.betaReadiness?.ready;
  const visibleMetadataRows = metadataRows.filter((row) => [row.field, row.key, row.type, row.source].join(" ").toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="proto-page proto-admin-meta-page">
      <PageHeader title="Admin / Metadata & Brand" subtitle="Manage metadata schema, taxonomies, brand assets, reports and platform settings." search={query} onSearch={setQuery}>
        <PillButton onClick={() => toast.message("Admin saved views are route tabs in this beta.")}>Saved views <ChevronDown size={14} /></PillButton><PillButton onClick={() => toast.message("Search filters metadata schema rows and admin panels locally.")}><SlidersHorizontal size={16} />Filters</PillButton><LinkButton href={routeWithRole("/upload", role)} tone="primary">Upload <ChevronDown size={14} /></LinkButton>
      </PageHeader>
      <SegmentedTabs tabs={["Metadata", "Taxonomy", "Brand Kits", "Reports", "Settings"]} active={activeTab} onChange={setActiveTab} />
      <div className="proto-admin-meta-grid">
        <section className="proto-panel proto-beta-status-card"><header className="proto-panel-head"><div><h2>Local beta status</h2><p>{betaReady ? "LOCAL TEAM BETA GO signals are green." : "NO-GO until blockers are cleared or accepted for local-only demo."}</p></div><StatusChip label={betaReady ? "GO" : "NO-GO"} tone={betaReady ? "approved" : "review"} /></header><dl className="proto-dl"><div><dt>Data source</dt><dd>{source?.label || source?.adapter || "Unknown"}</dd></div><div><dt>Assets</dt><dd>{(readiness.data?.assetCount || 0).toLocaleString()}</dd></div><div><dt>Portal ready</dt><dd>{(metrics?.portalReady || 0).toLocaleString()}</dd></div><div><dt>Needs review</dt><dd>{(metrics?.needsReview || 0).toLocaleString()}</dd></div><div><dt>Pending writes</dt><dd>{pendingWrites?.state || "Unknown"}</dd></div><div><dt>Runtime storage</dt><dd>{runtimeStore?.state || "Unknown"}</dd></div></dl><h3>Launch blockers {blockers.length ? <span>{blockers.length}</span> : null}</h3>{blockers.length ? blockers.slice(0, 2).map((item) => <p className="proto-settings-row" key={item}><ShieldAlert size={14} /><strong>{item}<small>Does not mutate ResourceSpace or source media.</small></strong></p>) : <p className="proto-settings-row"><ShieldCheck size={14} /><strong>No active blockers from readiness endpoint<small>Still local beta only.</small></strong></p>}</section>
        <section className="proto-panel proto-schema-card"><header className="proto-panel-head"><div><h2>Metadata Schema</h2><p>Define, organize, and govern the structure of your asset metadata.</p></div><PillButton onClick={() => toast.message("Schema edits are disabled in local beta.", { description: "ResourceSpace field mapping stays source of truth." })}><Plus size={14} />Add field</PillButton><IconButton label="More" onClick={() => toast.message("Schema actions disabled until ResourceSpace admin workflow is connected.")}><MoreHorizontal size={15} /></IconButton></header><div className="proto-data-table"><div className="proto-table-head"><span>Field name</span><span>Type</span><span>Required</span><span>Multi-value</span><span>Source</span><span>Actions</span></div>{visibleMetadataRows.map((row) => <div className="proto-table-row" key={row.key}><span><MoreHorizontal size={12} /><strong>{row.field}<small>{row.key}</small></strong></span><span>{row.type}</span><span>{row.required ? <Check size={15} /> : "—"}</span><span>{row.multi ? <Check size={15} /> : "—"}</span><span>{row.source}</span><span><MoreHorizontal size={15} /></span></div>)}</div></section>
        <section className="proto-panel"><header className="proto-panel-head"><div><h2>Taxonomies</h2><p>Manage controlled vocabularies and hierarchical taxonomies.</p></div><PillButton onClick={() => toast.message("Taxonomy management is read-only in local beta.")}>Manage all</PillButton></header>{[["Asset Type", "12 terms · 2 levels"], ["Usage Rights", "8 terms"], ["Location", "245 terms · 3 levels"], ["Audience", "6 terms"], ["Campaign", "14 terms · 2 levels"]].map(([label, detail], index) => <p className="proto-tax-row" key={label}><span className={`is-${index}`}><Tag size={14} /></span><strong>{label}<small>{detail}</small></strong><MoreHorizontal size={15} /></p>)}</section>
        <aside className="proto-brand-kit-panel"><section className="proto-panel"><header className="proto-panel-head"><div><h2>Brand Kit</h2><p>Manage logos, colors, typography and brand assets.</p></div></header><label className="proto-field"><span>Brand</span><select defaultValue="tjc"><option value="tjc">TJC Media</option></select></label><h3>Logos</h3><div className="proto-logo-grid"><span>TJC</span><span>TJC</span><span>◎</span></div><PillButton onClick={() => toast.message("Brand logo upload is disabled until ResourceSpace brand-kit collection is configured.")}><Plus size={14} />Add logo</PillButton><h3>Colors</h3><div className="proto-color-swatches">{["#000", "#242424", "#e2cbb6", "#ece8df", "#f7f6f4"].map((color) => <span key={color} style={{ background: color }} />)}<small>+8</small></div><h3>Typography</h3><p className="proto-type-row"><strong>Ag</strong><span>Source Sans<br />Regular · Medium · Semibold</span><PillButton onClick={() => toast.message("Font management is read-only in local beta.")}>Manage fonts</PillButton></p><h3>Brand assets</h3><ThumbnailStrip assets={brandAssets.data?.assets || []} limit={4} /><PillButton onClick={() => toast.message("Brand assets are shown from safe DAM search results.")}>View all assets</PillButton></section><section className="proto-panel"><h2>Inheritance</h2>{["Default metadata", "Brand inheritance", "Collection overrides"].map((item) => <p className="proto-settings-row" key={item}><Lock size={14} /><strong>{item}<small>Inherited from Global</small></strong><ChevronRight size={14} /></p>)}</section></aside>
        <section className="proto-panel"><header className="proto-panel-head"><div><h2>Validation Rules</h2><p>Enforce data quality and consistency across your metadata.</p></div><PillButton onClick={() => toast.message("Validation rule edits are disabled in local beta.")}><Plus size={14} />Add rule</PillButton></header>{["Required fields", "Controlled vocabulary", "File type constraints", "Unique filename"].map((item, index) => <p className="proto-settings-row" key={item}><ShieldCheck size={14} /><strong>{item}<small>{index === 3 ? "Prevent duplicate filenames in the system." : "Ensure critical standards are always enforced."}</small></strong><StatusChip label={index === 3 ? "Inactive" : "Active"} tone={index === 3 ? "draft" : "approved"} /></p>)}</section>
        <section className="proto-panel"><header className="proto-panel-head"><div><h2>Controlled Vocabularies</h2><p>Manage term lists used across metadata fields.</p></div><PillButton onClick={() => toast.message("Vocabulary edits are disabled until ResourceSpace field map is configured.")}><Plus size={14} />Add vocabulary</PillButton></header>{[["Asset Type", "12 terms"], ["Usage Rights", "8 terms"], ["Location", "245 terms"], ["Audience", "6 terms"]].map(([label, detail]) => <p className="proto-settings-row" key={label}><Circle size={12} /><strong>{label}<small>{detail}</small></strong><MoreHorizontal size={15} /></p>)}</section>
        <section className="proto-panel proto-reports-preview"><header className="proto-panel-head"><div><h2>Reports Preview</h2><p>Real-time insights into your asset library.</p></div><PillButton onClick={() => toast.message("Reports preview uses current readiness/search data only.")}>Last 30 days <ChevronDown size={14} /></PillButton></header><div className="proto-mini-metrics"><MetricCard label="Assets" value={((readiness.data?.metrics?.portalReady || 0) + (readiness.data?.metrics?.needsReview || 0) || 12456).toLocaleString()} trend="↑ 12.5%" /><MetricCard label="Downloads" value="8,974" trend="↑ 8.1%" /><MetricCard label="Views" value="25,431" trend="↑ 15.3%" /><MetricCard label="Approvals" value="1,245" trend="↓ 4.2%" /></div></section>
        <section className="proto-panel"><h2>Global Settings</h2>{["Metadata settings", "Integrations", "Security & Access", "Notifications"].map((item) => <p className="proto-settings-row" key={item}><Settings size={14} /><strong>{item}<small>Configure platform-wide preferences and policies.</small></strong><PillButton onClick={() => toast.message(`${item} is read-only in local beta. No settings were changed.`)}>Manage</PillButton></p>)}</section>
      </div>
    </section>
  );
}

export function PrototypeBrandKitsPage() {
  return <PrototypeAdminMetadataBrand initialModule="brand" />;
}

export function PrototypeInsightsPage() {
  return <PrototypeAdminMetadataBrand initialModule="reports" />;
}
