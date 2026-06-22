"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
  Grid2X2,
  Inbox,
  LayoutGrid,
  List,
  MoreHorizontal,
  PanelLeftClose,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Upload,
  Users,
  X
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { BetaPrototypeTools } from "@/components/BetaPrototypeTools";
import { useDemoRole } from "@/components/RoleProvider";
import { useAdminReadiness, useAssetDetail, useAssetsSearch, useDownloadGate, useReviewQueue } from "@/components/dam/useDamApi";
import { canAdmin, canReview, canUpload } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";
import { assetRecordRef, assetType, displayTitle, formatBytes, sourceLabel } from "@/lib/enterprise-display";
import { assetEnterpriseStatus } from "@/lib/enterprise-status";
import { emptyReviewChecklist, initialReviewChecklistForAsset, reviewActionDisabledReason, reviewChecklistItems } from "@/lib/review-decision-presenter";
import type { DemoRole, ReviewEvidenceChecklist, StockMediaAsset, UsageScope } from "@/lib/types";

type ProtoTab = "details" | "metadata" | "activity";
type UploadListItem = { name: string; size: number };

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
      { label: "Brand kits", href: "/brand-hub", icon: Grid2X2, guard: canAdmin },
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
  return (
    <button {...props} className={`proto-button is-${tone} ${className}`}>
      {children}
    </button>
  );
}

function LinkButton({ children, href, tone = "secondary" }: { children: ReactNode; href: string; tone?: "primary" | "secondary" }) {
  return <Link className={`proto-button is-${tone}`} href={href}>{children}</Link>;
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return <button type="button" className="proto-icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

const photoPreviewFallbacks = {
  bible: [
    "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=85"
  ],
  nature: [
    "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85"
  ],
  water: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=85"
  ],
  church: [
    "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=85"
  ],
  facility: [
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85"
  ]
};

function localThumbnailRoute(src: string) {
  return src.startsWith("/api/assets/thumbnail/");
}

function fallbackPhotoForAsset(asset: StockMediaAsset) {
  const title = `${asset.title} ${asset.tags?.join(" ") || ""} ${asset.tjcTerms?.join(" ") || ""}`.toLowerCase();
  if (/mvp archive photo|church life photo/.test(title)) {
    return `https://picsum.photos/seed/tjc-dam-${encodeURIComponent(asset.id)}/1200/800`;
  }
  const bucket =
    /bible|study|sermon|scripture/.test(title) ? photoPreviewFallbacks.bible :
    /plant|flower|bee|butterfly|bird|squirrel|spider/.test(title) ? photoPreviewFallbacks.nature :
    /fountain|pond|water|beach|sky/.test(title) ? photoPreviewFallbacks.water :
    /church|archive|mvp monday|fellowship/.test(title) ? photoPreviewFallbacks.church :
    photoPreviewFallbacks.facility;
  const numericId = Number.parseInt(asset.id, 10);
  const index = Number.isFinite(numericId) ? numericId % bucket.length : displayTitle(asset).length % bucket.length;
  return bucket[index];
}

function assetImage(asset?: StockMediaAsset, variant: "card" | "detail" = "card") {
  if (!asset) return "";
  const src = variant === "detail"
    ? asset.imageUrls?.detail || asset.preview || asset.imageUrls?.card || asset.thumbnail || ""
    : asset.imageUrls?.card || asset.imageUrls?.small || asset.thumbnail || asset.preview || "";
  if (src && !localThumbnailRoute(src)) return src;
  if (src) return fallbackPhotoForAsset(asset);
  return "";
}

function protoStatus(asset?: StockMediaAsset) {
  const status = assetEnterpriseStatus(asset);
  if (status === "Approved") return { label: "Approved", tone: "approved" };
  if (status === "Restricted" || status === "Missing Consent") return { label: status === "Restricted" ? "Restricted" : "In Review", tone: status === "Restricted" ? "danger" : "review" };
  if (status === "Draft") return { label: "Draft", tone: "draft" };
  return { label: "In Review", tone: "review" };
}

function StatusPill({ asset, label, tone }: { asset?: StockMediaAsset; label?: string; tone?: string }) {
  const mapped = asset ? protoStatus(asset) : { label: label || "Draft", tone: tone || "draft" };
  return <span className={`proto-status is-${mapped.tone}`}>{mapped.label}</span>;
}

function AssetImage({ asset, variant = "card" }: { asset?: StockMediaAsset; variant?: "card" | "detail" }) {
  const src = assetImage(asset, variant);
  if (!src) {
    return (
      <div className="proto-image-fallback">
        <Eye size={18} />
        <span>Preview restricted</span>
      </div>
    );
  }
  return <img src={src} alt={asset?.thumbnailAlt || displayTitle(asset)} loading="lazy" />;
}

function assetMeta(asset: StockMediaAsset) {
  return [assetType(asset), asset.imageDimensions, formatBytes(asset.fileSizeBytes)].filter((item) => item && item !== "Not provided").join("  ·  ");
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
  return (
    <>
      <header className="proto-mobile-top">
        <strong>{pathname.startsWith("/upload") ? "Uploads" : pathname.startsWith("/review") ? "Review" : pathname.startsWith("/collections") ? "Collections" : "Library"}</strong>
        <IconButton label="Notifications"><Bell size={17} /></IconButton>
      </header>
      <nav className="proto-mobile-bottom" aria-label="Mobile navigation">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = pathActive(pathname, item.href);
          const disabled =
            (item.href === "/upload" && !canUpload(role)) ||
            (item.href === "/review" && !canReview(role)) ||
            (item.href === "/admin" && !canAdmin(role));
          return (
            <Link
              key={item.href}
              href={disabled ? routeWithRole("/library", role) : routeWithRole(item.href, role)}
              className={`${active ? "is-active" : ""}${disabled ? " is-disabled" : ""}`}
              aria-disabled={disabled}
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
  onInspect
}: {
  asset: StockMediaAsset;
  selected: boolean;
  onSelect: () => void;
  active: boolean;
  onInspect: () => void;
}) {
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
          aria-label={`${selected ? "Deselect" : "Select"} ${displayTitle(asset)}`}
        >
          {selected ? <Check size={13} /> : null}
        </button>
        <StatusPill asset={asset} />
      </div>
      <div className="proto-asset-copy">
        <strong>{displayTitle(asset)}</strong>
        <span>{assetMeta(asset) || `${assetType(asset)} · ${asset.collection}`}</span>
      </div>
    </article>
  );
}

function PrototypeAssetInspector({ asset, index, total, onClose }: { asset?: StockMediaAsset; index: number; total: number; onClose?: () => void }) {
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

  return (
    <aside className="proto-inspector" aria-label="Asset inspector">
      <div className="proto-inspector-nav">
        <ChevronLeft size={15} />
        <span>{index + 1} of {total.toLocaleString()}</span>
        <ChevronRight size={15} />
        <button type="button" onClick={onClose} aria-label="Close inspector"><X size={15} /></button>
      </div>
      <div className="proto-inspector-head">
        <div className="proto-inspector-thumb"><AssetImage asset={asset} /></div>
        <div>
          <h2>{displayTitle(asset)}</h2>
          <StatusPill asset={asset} />
          <p>{assetMeta(asset) || assetRecordRef(asset)}</p>
          <small>Uploaded {asset.importDate || asset.capturedDate || "date pending"} by {asset.sourceAccount || asset.reviewer || "media team"}</small>
        </div>
      </div>
      <div className="proto-action-row">
        <button type="button" onClick={download}><Download size={16} /><span>Download</span></button>
        <button type="button" onClick={() => setMessage("Share stays gated by item approval and role.")}><Share2 size={16} /><span>Share</span></button>
        <Link href={routeWithRole(`/assets/${asset.id}`, role)}><Eye size={16} /><span>Preview</span></Link>
        <button type="button" onClick={() => setMessage("Original/source files remain restricted.")}><MoreHorizontal size={16} /><span>More</span></button>
      </div>
      <div className="proto-tabs">
        {(["details", "metadata", "activity"] as ProtoTab[]).map((item) => (
          <button key={item} className={tab === item ? "is-active" : ""} type="button" onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}</button>
        ))}
      </div>
      {tab === "details" ? (
        <div className="proto-detail-stack">
          <section><h3>Description</h3><p>{asset.usageGuidance || asset.rightsNotes || "Review-safe media record with ResourceSpace as source of truth."}</p></section>
          <section><h3>Tags</h3><div className="proto-tag-row">{(asset.tags || asset.tjcTerms || ["review", "media"]).slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}<span>+ Add tag</span></div></section>
          <section><h3>Rights & Usage</h3><p>{asset.usageScope}. {asset.rightsExpirationDate ? `Expires ${asset.rightsExpirationDate}` : "Reviewer evidence required before public use."}</p></section>
          <section><h3>Collections</h3><div className="proto-tag-row"><span>{asset.collection}</span>{asset.eventName ? <span>{asset.eventName}</span> : null}</div></section>
          <section><h3>Versions</h3><p>v2 · Current approved derivative</p><p>v1 · Prior review copy</p></section>
          <section><h3>Related files</h3><p>{asset.originalFilename || displayTitle(asset)} · source restricted</p></section>
        </div>
      ) : tab === "metadata" ? (
        <dl className="proto-dl">
          <div><dt>ResourceSpace ID</dt><dd>{asset.resourceSpaceId || assetRecordRef(asset)}</dd></div>
          <div><dt>Source</dt><dd>{asset.sourceSystem || asset.sourcePlatform || "ResourceSpace"}</dd></div>
          <div><dt>People</dt><dd>{asset.peopleRisk || "Unknown"}</dd></div>
          <div><dt>Review</dt><dd>{asset.reviewedDate || "Pending"}</dd></div>
        </dl>
      ) : (
        <div className="proto-detail-stack">
          <p>Import recorded. Review evidence and writeback state remain governed by ResourceSpace policy.</p>
          <p>{asset.pendingReviewWrite ? `Pending sync: ${asset.pendingReviewWrite.syncState}` : "No pending ResourceSpace write."}</p>
        </div>
      )}
      {message ? <p className="proto-gate-note">{message}</p> : null}
    </aside>
  );
}

export function PrototypeLibraryPage() {
  const { role } = useDemoRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState("Newest");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const results = useAssetsSearch({ role, query, sort, limit: 24 });
  const assets = results.data?.assets || [];
  const activeAsset = assets.find((asset) => asset.id === activeId) || assets[1] || assets[0];
  const total = results.data?.total || results.data?.counts?.visibleToRole || assets.length;

  useEffect(() => {
    if (!activeId && assets.length) setActiveId(assets[1]?.id || assets[0].id);
  }, [activeId, assets]);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="proto-library-page">
      <section className="proto-library-workspace">
        <header className="proto-library-header">
          <div className="proto-title-row">
            <h1>Library</h1>
            <span>{total.toLocaleString()} assets</span>
          </div>
          <ToolbarSearch value={query} onChange={setQuery} />
          <div className="proto-header-actions">
            <Button onClick={() => toast.message("Saved view stays local to current query.")}>Saved views <ChevronDown size={14} /></Button>
            <Button onClick={() => toast.message("Filters use current ResourceSpace search facets.")}><SlidersHorizontal size={15} />Filters</Button>
            <LinkButton href={routeWithRole("/upload", role)} tone="primary">Upload <ChevronDown size={14} /></LinkButton>
          </div>
        </header>
        <div className="proto-toolbar">
          <label className="proto-checkbox-label"><input type="checkbox" checked={selected.size > 0 && selected.size === assets.length} onChange={() => setSelected(selected.size === assets.length ? new Set() : new Set(assets.map((asset) => asset.id)))} /> <span>{selected.size} selected</span></label>
          <Button onClick={() => toast.message("Download checks each selected asset gate.")}>Download</Button>
          <Button onClick={() => toast.message("Share links require item approval.")}>Share</Button>
          <Button onClick={() => toast.message("Collection add queued for selected assets.")}>Add to collection</Button>
          <Button>More <ChevronDown size={14} /></Button>
          <div className="proto-toolbar-spacer" />
          <button type="button" className="proto-sort" onClick={() => setSort(sort === "Newest" ? "Approved first" : "Newest")}>Sort by: {sort} <ChevronDown size={14} /></button>
          <IconButton label="Grid view"><LayoutGrid size={16} /></IconButton>
          <IconButton label="List view"><List size={16} /></IconButton>
        </div>
        {results.loading ? <div className="proto-loading">Loading library...</div> : results.error ? <div className="proto-error">{results.error}</div> : (
          <div className="proto-asset-grid">
            {assets.map((asset) => (
              <PrototypeAssetCard
                key={asset.id}
                asset={asset}
                selected={selected.has(asset.id)}
                active={activeAsset?.id === asset.id}
                onSelect={() => toggle(asset.id)}
                onInspect={() => setActiveId(asset.id)}
              />
            ))}
          </div>
        )}
      </section>
      <PrototypeAssetInspector asset={activeAsset} index={Math.max(0, assets.findIndex((asset) => asset.id === activeAsset?.id))} total={total} onClose={() => setActiveId(null)} />
      {activeAsset ? <MobileAssetSheet asset={activeAsset} /> : null}
    </div>
  );
}

function MobileAssetSheet({ asset }: { asset: StockMediaAsset }) {
  const { role } = useDemoRole();
  return (
    <aside className="proto-mobile-sheet">
      <div className="proto-mobile-sheet-head">
        <div className="proto-mobile-thumb"><AssetImage asset={asset} /></div>
        <div><strong>{displayTitle(asset)}</strong><StatusPill asset={asset} /><span>{assetMeta(asset)}</span></div>
        <Share2 size={16} />
      </div>
      <div className="proto-tabs"><button className="is-active">Details</button><button>Activity</button></div>
      <div className="proto-action-row">
        <button><Download size={16} /><span>Download</span></button>
        <button><Share2 size={16} /><span>Share</span></button>
        <Link href={routeWithRole(`/assets/${asset.id}`, role)}><Eye size={16} /><span>Preview</span></Link>
        <button><MoreHorizontal size={16} /><span>More</span></button>
      </div>
    </aside>
  );
}

export function PrototypeUploadIntake() {
  const { role } = useDemoRole();
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    collection: "Spring Campaign 2024",
    brand: "Acme Home",
    usageRights: "Commercial use",
    credit: "Media team",
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

  return (
    <form className="proto-flow-page" onSubmit={submit}>
      <section className="proto-flow-card proto-upload-card">
        <header><h1>Upload / Intake</h1></header>
        <div className="proto-upload-layout">
          <div>
            <label className="proto-dropzone">
              <Upload size={24} />
              <span>Drag & drop files or folders or browse</span>
              <input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
            </label>
            <div className="proto-file-list">
              <p>{files.length || 23} files selected · {files.length ? formatBytes(files.reduce((sum, file) => sum + file.size, 0)) : "1.2 GB"}</p>
              {((files.length ? files : [
                { name: "Product-Set-016.jpg", size: 4_100_000 },
                { name: "Lifestyle-Outdoor-07.jpg", size: 5_100_000 },
                { name: "Architecture-15.jpg", size: 6_800_000 },
                { name: "Portrait-Urban-046.jpg", size: 2_700_000 }
              ]) as UploadListItem[]).slice(0, 5).map((file, index) => (
                <div key={`${file.name}-${index}`}><span>{file.name}</span><small>{file.size ? formatBytes(file.size) : ["4.2 MB", "5.1 MB", "6.8 MB", "3.7 MB"][index]}</small><Check size={14} /></div>
              ))}
            </div>
          </div>
          <div className="proto-field-panel">
            <h2>Assign metadata</h2>
            {[
              ["collection", "Collection"],
              ["brand", "Brand"],
              ["usageRights", "Usage rights"],
              ["credit", "Credit"],
              ["eventDate", "Review date"],
              ["tags", "Tags"]
            ].map(([key, label]) => (
              <label key={key} className="proto-field">
                <span>{label}</span>
                <input type={key === "eventDate" ? "date" : "text"} value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
              </label>
            ))}
            <Button type="submit" tone="primary" disabled={!canSend}>{canSend ? "Start upload" : "Contributor access required"}</Button>
            <p className="proto-muted">Every imported asset defaults to Needs Review / Do Not Publish.</p>
          </div>
        </div>
        {message ? <p className="proto-gate-note">{message}</p> : null}
      </section>
    </form>
  );
}

export function PrototypeReviewApprove() {
  const { role } = useDemoRole();
  const queue = useReviewQueue(role, "pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [checklist, setChecklist] = useState<ReviewEvidenceChecklist>(emptyReviewChecklist);
  const [message, setMessage] = useState("");
  const assets = queue.data?.assets || [];
  const selected = assets.find((asset) => asset.id === selectedId) || assets[0];
  const selectedIndex = Math.max(0, assets.findIndex((asset) => asset.id === selected?.id));

  useEffect(() => {
    if (!selectedId && assets[0]) setSelectedId(assets[0].id);
  }, [assets, selectedId]);

  useEffect(() => {
    setChecklist(initialReviewChecklistForAsset(selected));
    setComment("");
  }, [selected?.id]);

  if (!canReview(role)) {
    return <section className="proto-flow-page"><div className="proto-flow-card"><h1>Review & Approve</h1><p>Reviewer access required.</p></div></section>;
  }

  async function decide(action: "Approve Public" | "Request More Info") {
    if (!selected) return;
    const disabled = reviewActionDisabledReason({ asset: selected, action, checklist, note: comment });
    if (disabled) {
      setMessage(`Review blocked. ${disabled}.`);
      return;
    }
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        id: selected.id,
        action,
        notes: comment,
        checklist,
        reviewerName: "Taylor Morgan",
        reviewDate: new Date().toISOString().slice(0, 10),
        approvalScope: "Public" satisfies UsageScope
      })
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(payload.message || payload.error || "Decision queued for pending ResourceSpace sync.");
  }

  return (
    <section className="proto-flow-page">
      <div className="proto-flow-card proto-review-card">
        <header className="proto-review-head">
          <div><h1>Review & Approve</h1><p>{selected ? displayTitle(selected) : "Loading queue..."}</p></div>
          <StatusPill asset={selected} />
          <span>{selectedIndex + 1} of {assets.length || 1}</span>
          <Button onClick={() => void decide("Request More Info")}>Request changes</Button>
          <Button tone="primary" onClick={() => void decide("Approve Public")}>Approve</Button>
        </header>
        {queue.loading ? <div className="proto-loading">Loading review queue...</div> : (
          <div className="proto-review-layout">
            <div className="proto-review-preview"><AssetImage asset={selected} variant="detail" /></div>
            <aside className="proto-comments-panel">
              <div className="proto-tabs"><button className="is-active">Comments</button><button>Details</button></div>
              <div className="proto-comment-list">
                <p><strong>Taylor Morgan</strong><small>9:15 AM</small><span>Can we brighten the shadow slightly?</span></p>
                <p><strong>Jordan Lee</strong><small>10:02 AM</small><span>Updated the shadows.</span></p>
                <p><strong>Taylor Morgan</strong><small>10:15 AM</small><span>Much better, approved?</span></p>
              </div>
              <details className="proto-evidence">
                <summary>Evidence checklist</summary>
                {reviewChecklistItems.map((item) => (
                  <label key={item.field}><input type="checkbox" checked={Boolean(checklist[item.field])} onChange={() => setChecklist((current) => ({ ...current, [item.field]: !current[item.field] }))} />{item.label}</label>
                ))}
              </details>
              <label className="proto-comment-box">
                <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." />
                <button type="button" onClick={() => setMessage("Comment staged with review decision.")}><Send size={16} /></button>
              </label>
            </aside>
          </div>
        )}
        {message ? <p className="proto-gate-note">{message}</p> : null}
      </div>
    </section>
  );
}

export function PrototypeCollectionsDistribute({ distribution = false }: { distribution?: boolean }) {
  const { role } = useDemoRole();
  const search = useAssetsSearch({ role, sort: "Approved first", limit: 12 });
  const collections = search.data?.collections || [];
  const assets = search.data?.assets || [];
  const selected = collections[0];
  return (
    <section className="proto-flow-page proto-collections-page">
      <div className="proto-flow-card proto-collection-card">
        <div className="proto-collection-main">
          <header className="proto-collection-head">
            <div className="proto-collection-cover"><AssetImage asset={assets[0]} /></div>
            <div>
              <h1>{distribution ? "Distribution Sets" : "Collections / Distribute"}</h1>
              <h2>{selected?.name || "Spring Campaign 2024"}</h2>
              <span>{selected?.countLabel || "12 assets"}</span>
              <p>{selected?.description || "Campaign assets for web, social, and print."}</p>
            </div>
          </header>
          <div className="proto-tabs"><button className="is-active">Assets</button><button>Details</button><button>Activity</button><button>Distribution</button></div>
          <div className="proto-collection-assets">
            {assets.slice(0, 7).map((asset) => <div key={asset.id}><AssetImage asset={asset} /></div>)}
            <button type="button">+ Add assets</button>
          </div>
        </div>
        <aside className="proto-share-panel">
          <h2>Share collection</h2>
          <label className="proto-toggle-row"><span>Share link</span><input type="checkbox" defaultChecked /></label>
          <label className="proto-field"><span>URL</span><input readOnly value="https://dam.local/c/campaign2024" /></label>
          <Button onClick={() => toast.message("Share link copied. Asset gates still apply.")}>Copy link</Button>
          <label className="proto-field"><span>Permission</span><select defaultValue="view"><option value="view">People with the link can view</option><option value="request">Request access required</option></select></label>
          <Button onClick={() => toast.message("Download all checks each item approval before packaging.")}>Download all</Button>
          <p className="proto-muted">Source/original files stay restricted. Per-asset approval is never bypassed.</p>
        </aside>
      </div>
    </section>
  );
}

export function PrototypeAssetDetailPage({ id }: { id: string }) {
  const { role } = useDemoRole();
  const detail = useAssetDetail(id, role);
  const asset = detail.data?.asset;
  return (
    <section className="proto-detail-page">
      {detail.loading ? <div className="proto-loading">Loading asset...</div> : detail.error ? <div className="proto-error">{detail.error}</div> : asset ? (
        <div className="proto-detail-card">
          <section className="proto-detail-media-panel">
            <header>
              <div>
                <h1>{displayTitle(asset)}</h1>
                <p>{assetMeta(asset) || assetRecordRef(asset)}</p>
              </div>
              <StatusPill asset={asset} />
            </header>
            <div className="proto-detail-preview"><AssetImage asset={asset} variant="detail" /></div>
            <p className="proto-detail-safety-note">Source/original files remain restricted. Downloads use the approved-copy gate and review policy.</p>
          </section>
          <PrototypeAssetInspector asset={asset} index={0} total={1} />
          <div className="proto-related">
            <h2>Related files</h2>
            {(detail.data?.related || []).slice(0, 4).map((related) => <Link key={related.id} href={routeWithRole(`/assets/${related.id}`, role)}>{displayTitle(related)}</Link>)}
          </div>
        </div>
      ) : <div className="proto-error">Asset not found.</div>}
    </section>
  );
}

export function PrototypeAdminPage({ initialModule, adminOnly: _adminOnly }: { initialModule?: string; adminOnly?: boolean } = {}) {
  const { role } = useDemoRole();
  const readiness = useAdminReadiness(role);
  const review = useReviewQueue(role, "pending");
  if (!canAdmin(role)) return <section className="proto-flow-page"><div className="proto-flow-card"><h1>Admin</h1><p>DAM Admin access required.</p></div></section>;
  const metrics = readiness.data?.metrics;
  const pendingWrites = Object.values(review.data?.pendingWrites || {});
  const sourceState = readiness.source?.detail || "ResourceSpace connection status unavailable in this environment.";
  const adminRows = [
    { label: "Source health", value: sourceLabel(readiness.source), detail: sourceState, tone: readiness.live ? "approved" : "review" },
    { label: "Review queues", value: `${review.data?.assets?.length ?? metrics?.needsReview ?? 0} active`, detail: "Reviewer and DAM Admin queues preserve required evidence checks.", tone: (review.data?.assets?.length || metrics?.needsReview) ? "review" : "approved" },
    { label: "Pending writes", value: `${pendingWrites.length} queued`, detail: "ResourceSpace remains unchanged until live writeback or media team sync completes.", tone: pendingWrites.length ? "review" : "draft" },
    { label: "Users / Roles", value: "4 roles", detail: "Viewer, Contributor, Reviewer, and DAM Admin gates stay enforced.", tone: "approved" },
    { label: "Metadata health", value: `${metrics?.rightsReview ?? 0} rights`, detail: `${metrics?.renditionGaps ?? 0} rendition gaps, ${metrics?.missingSource ?? 0} missing source records.`, tone: (metrics?.rightsReview || metrics?.renditionGaps || metrics?.missingSource) ? "review" : "approved" },
    { label: "Launch blockers", value: `${readiness.data?.readiness?.filter((item) => item.tone !== "ok" || item.score < 80).length ?? 0} open`, detail: "Launch readiness tracks integrations, audit evidence, metadata, and safe delivery gates.", tone: (readiness.data?.score ?? 0) >= 80 ? "approved" : "review" }
  ];
  const integrationRows = readiness.data?.integrationReadiness?.length
    ? readiness.data.integrationReadiness
    : [
      { id: "resourcespace", owner: "ResourceSpace", label: "Source connection", ready: Boolean(readiness.live), detail: sourceState, state: readiness.live ? "Operational" as const : "Read-only" as const },
      { id: "writeback", owner: "Portal", label: "Pending write semantics", ready: pendingWrites.length === 0, detail: "Review decisions queue safely when ResourceSpace writeback is unavailable.", state: pendingWrites.length ? "Pending setup" as const : "Operational" as const },
      { id: "delivery", owner: "Portal", label: "Safe downloads", ready: true, detail: "Approved-copy gates protect source/original files and audit every request.", state: "Operational" as const }
    ];
  return (
    <section className="proto-admin-page">
      <div className="proto-admin-header">
        <h1>{initialModule ? "Admin" : "Admin"}</h1>
        <p>{sourceLabel(readiness.source)}. ResourceSpace remains source of truth.</p>
      </div>
      <div className="proto-admin-ops-grid">
        {adminRows.map((row) => (
          <article key={row.label}>
            <div>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
            <StatusPill label={row.tone === "approved" ? "Operational" : row.tone === "draft" ? "Draft" : "In Review"} tone={row.tone} />
            <p>{row.detail}</p>
          </article>
        ))}
      </div>
      <div className="proto-admin-table">
        <header><h2>Operations modules</h2><span>Compact status</span></header>
        {integrationRows.slice(0, 8).map((item) => (
          <div key={item.id}>
            <span>{item.owner}</span>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
            <StatusPill label={item.state || (item.ready ? "Operational" : "Not configured")} tone={item.ready ? "approved" : "review"} />
          </div>
        ))}
      </div>
    </section>
  );
}
