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
  PanelLeftClose,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  MoreHorizontal,
  X
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { BetaPrototypeTools } from "@/components/BetaPrototypeTools";
import { useDemoRole } from "@/components/RoleProvider";
import { useAssetDetail, useAssetsSearch, useDownloadGate, useReviewQueue } from "@/components/dam/useDamApi";
import { canReview, canUpload } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";
import { assetRecordRef, assetType, displayTitle, formatBytes } from "@/lib/enterprise-display";
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
      { label: "Open albums", href: "/collections", icon: Folder },
      { label: "Upload / Intake", href: "/upload", icon: FileUp, guard: canUpload }
    ]
  },
  {
    label: "WORKFLOW",
    items: [
      { label: "Review", href: "/review", icon: ShieldCheck, guard: canReview },
      { label: "Requests", href: "/requests", icon: Inbox }
    ]
  }
] satisfies Array<{
  label: string;
  items: Array<{ label: string; href: string; icon: typeof LayoutGrid; guard?: (role: DemoRole) => boolean }>;
}>;

const mobileNav = [
  { label: "Library", href: "/library", icon: LayoutGrid },
  { label: "Albums", href: "/collections", icon: Folder },
  { label: "Upload", href: "/upload", icon: Upload },
  { label: "Review", href: "/review", icon: ShieldCheck },
  { label: "Requests", href: "/requests", icon: Inbox }
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
  return src;
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
  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    let cancelled = false;
    setResolvedSrc(src);
    if (!asset || !src || !localThumbnailRoute(src)) return;

    fetch(src, { headers: { Accept: "image/*" } })
      .then((response) => {
        if (cancelled) return;
        const previewMode = response.headers.get("X-TJC-Preview-Mode");
        if (!response.ok || previewMode === "generated-local-beta") {
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
        <Eye size={18} />
        <span>Preview restricted</span>
      </div>
    );
  }
  return <img src={resolvedSrc} alt={asset?.thumbnailAlt || displayTitle(asset)} loading="lazy" onError={() => asset && setResolvedSrc(fallbackPhotoForAsset(asset))} />;
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
        <strong>{pathname.startsWith("/upload") ? "Upload" : pathname.startsWith("/review") ? "Review" : pathname.startsWith("/requests") ? "Requests" : pathname.startsWith("/collections") ? "Open albums" : "Library"}</strong>
        <IconButton label="Notifications"><Bell size={17} /></IconButton>
      </header>
      <nav className="proto-mobile-bottom" aria-label="Mobile navigation">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = pathActive(pathname, item.href);
          const disabled =
            (item.href === "/upload" && !canUpload(role)) ||
            (item.href === "/review" && !canReview(role));
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
            {assets.length ? assets.map((asset) => (
              <PrototypeAssetCard
                key={asset.id}
                asset={asset}
                selected={selected.has(asset.id)}
                active={activeAsset?.id === asset.id}
                onSelect={() => toggle(asset.id)}
                onInspect={() => setActiveId(asset.id)}
              />
            )) : <div className="proto-empty-state is-quiet">No matching assets. ResourceSpace search returned no records for this query.</div>}
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
  const gate = useDownloadGate(asset.id, role);
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
        <div><strong>{displayTitle(asset)}</strong><StatusPill asset={asset} /><span>{assetMeta(asset)}</span>{message ? <em className="proto-mobile-sheet-note">{message}</em> : null}</div>
        <button type="button" className="proto-mobile-sheet-icon" onClick={() => setMessage("Share stays gated by item approval and role.")} aria-label="Share selected asset"><Share2 size={16} /></button>
      </div>
      <div className="proto-tabs"><button className="is-active">Details</button><button>Activity</button></div>
      <div className="proto-action-row">
        <button type="button" onClick={() => void download()}><Download size={16} /><span>Download</span></button>
        <button type="button" onClick={() => setMessage("Share stays gated by item approval and role.")}><Share2 size={16} /><span>Share</span></button>
        <Link href={routeWithRole(`/assets/${asset.id}`, role)}><Eye size={16} /><span>Preview</span></Link>
        <button type="button" onClick={() => setMessage("Original/source files remain restricted.")}><MoreHorizontal size={16} /><span>More</span></button>
      </div>
    </aside>
  );
}

export function PrototypeUploadIntake() {
  const { role } = useDemoRole();
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    eventName: "Youth Service Open Album",
    sourceLink: "",
    ministry: "Youth Ministry",
    source: "Media team",
    location: "TJC local church",
    usageRights: "Needs reviewer decision",
    eventDate: new Date().toISOString().slice(0, 10),
    tags: "youth, service, fellowship",
    notes: ""
  });
  const [message, setMessage] = useState("");
  const canSend = canUpload(role);
  const hasMedia = files.length > 0 || Boolean(form.sourceLink.trim());
  const canSubmit = canSend && hasMedia;

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
    data.set("peopleVisible", "Unknown");
    data.set("minorsVisible", "Unknown");
    data.set("approvalSuggestion", "Needs Review");
    files.forEach((file) => data.append("files", file));
    const response = await fetch("/api/upload", { method: "POST", body: data });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok
      ? "Thank you — your photos were sent to the media team. We'll review rights, people/youth visibility, and usage before anything is published."
      : payload.message || payload.error || "Upload blocked.");
  }

  return (
    <form className="proto-flow-page" onSubmit={submit}>
      <section className="proto-flow-card proto-upload-card">
        <header>
          <h1>Upload / Intake</h1>
          <h2>Share photos with the media team</h2>
          <p>Share photos with the media team. Media team reviews photos before anything becomes public.</p>
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
              <p>{files.length || 23} files selected · {files.length ? formatBytes(files.reduce((sum, file) => sum + file.size, 0)) : "1.2 GB"}</p>
              {files.length ? <button type="button" className="proto-inline-action" onClick={() => setFiles([])}>Remove all</button> : null}
              {((files.length ? files : [
                { name: "Youth-Service-Opening-Prayer.jpg", size: 4_100_000 },
                { name: "Fellowship-Hall-Volunteer-Team.jpg", size: 5_100_000 },
                { name: "Bible-Study-Classroom-Wide.jpg", size: 6_800_000 },
                { name: "Media-Team-Intake-Note.pdf", size: 2_700_000 }
              ]) as UploadListItem[]).slice(0, 5).map((file, index) => (
                <div key={`${file.name}-${index}`}><span>{file.name}</span><small>{file.size ? formatBytes(file.size) : ["4.2 MB", "5.1 MB", "6.8 MB", "3.7 MB"][index]}</small><Check size={14} /></div>
              ))}
            </div>
          </div>
          <div className="proto-field-panel" aria-label="Photo details">
            <h2>Assign metadata</h2>
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
            <div className="proto-action-row">
              <Button type="button" onClick={() => setMessage("Saved for later in this browser.")}>Save for later</Button>
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

export function PrototypeRequestsPage() {
  const { role } = useDemoRole();
  const search = useAssetsSearch({ role, sort: "Newest", limit: 8 });
  const assets = search.data?.assets || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = assets.find((asset) => asset.id === selectedId) || assets[0];
  const selectedIndex = Math.max(0, assets.findIndex((asset) => asset.id === selected?.id));
  const requests = useMemo(() => {
    const visible = assets.slice(0, 5);
    return visible.map((asset, index) => ({
      asset,
      title: index % 2 === 0 ? "Usage review request" : "Approved-copy request",
      requester: index % 2 === 0 ? "Ministry Team" : "Media Team",
      scope: index % 3 === 0 ? "Public web" : index % 3 === 1 ? "Internal slides" : "Open album cleanup",
      note: asset.usageGuidance || asset.rightsNotes || "Needs reviewer evidence before reuse."
    }));
  }, [assets]);

  useEffect(() => {
    if (!selectedId && assets[0]) setSelectedId(assets[0].id);
  }, [assets, selectedId]);

  return (
    <section className="proto-flow-page">
      <div className="proto-flow-card proto-review-card" data-primary-section="requests-table">
        <header className="proto-review-head">
          <div>
            <h1>Requests</h1>
            <p>{selected ? displayTitle(selected) : "Loading ResourceSpace request context..."}</p>
          </div>
          <StatusPill asset={selected} />
          <span>{selected ? selectedIndex + 1 : 0} of {requests.length || 1}</span>
          <LinkButton href={routeWithRole("/upload", role)}>New intake</LinkButton>
          <LinkButton href={routeWithRole("/review", role)} tone="primary">Open review</LinkButton>
        </header>
        {search.loading ? <div className="proto-loading">Loading requests...</div> : search.error ? <div className="proto-error">{search.error}</div> : (
          <div className="proto-review-layout">
            <div className="proto-comments-panel">
              <div className="proto-tabs"><button className="is-active">Open</button><button>Waiting</button><button>Closed</button></div>
              <div className="proto-comment-list">
                {requests.map((request) => (
                  <button
                    key={request.asset.id}
                    type="button"
                    className={`proto-request-row${selected?.id === request.asset.id ? " is-active" : ""}`}
                    onClick={() => setSelectedId(request.asset.id)}
                  >
                    <strong>{request.title}</strong>
                    <small>{request.requester} · {request.scope}</small>
                    <span>{displayTitle(request.asset)}</span>
                  </button>
                ))}
              </div>
            </div>
            <aside className="proto-inspector" aria-label="Request detail">
              {selected ? (
                <>
                  <div className="proto-inspector-head">
                    <div className="proto-inspector-thumb"><AssetImage asset={selected} /></div>
                    <div>
                      <h2>{displayTitle(selected)}</h2>
                      <StatusPill asset={selected} />
                      <p>{assetMeta(selected) || assetRecordRef(selected)}</p>
                      <small>Portal record ready for reviewer follow-up</small>
                    </div>
                  </div>
                  <div className="proto-detail-stack">
                    <section><h3>Request</h3><p>{requests.find((request) => request.asset.id === selected.id)?.note || "Review usage before any public reuse."}</p></section>
                    <section><h3>Usage scope</h3><p>{selected.usageScope}. Reviewer, review date, notes, and usage scope required before public use.</p></section>
                    <section><h3>Album context</h3><div className="proto-tag-row"><span>{selected.collection}</span>{selected.eventName ? <span>{selected.eventName}</span> : null}</div></section>
                  </div>
                  <div className="proto-action-row">
                    <Link href={routeWithRole(`/assets/${selected.id}`, role)}><Eye size={16} /><span>Asset</span></Link>
                    <Link href={routeWithRole("/review", role)}><ShieldCheck size={16} /><span>Review</span></Link>
                    <button type="button" onClick={() => toast.message("Requester info note staged.")}><Send size={16} /><span>Ask info</span></button>
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
    return <section className="proto-flow-page"><div className="proto-flow-card"><h1>Review & Approve</h1><p>Review inbox requires reviewer access.</p></div></section>;
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

export function PrototypeCollectionsDistribute({ distribution: _distribution = false }: { distribution?: boolean }) {
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
              <h1>Collections / Open albums</h1>
              <h2>{selected?.name || "Youth Service Open Album"}</h2>
              <span>{selected?.countLabel || "12 assets"}</span>
              <p>{selected?.description || "ResourceSpace album view for ministry search, review context, and approved-copy requests."}</p>
            </div>
          </header>
          <div className="proto-tabs"><button className="is-active">Assets</button><button>Album details</button><button>Activity</button><button>Usage review</button></div>
          <div className="proto-collection-assets">
            {assets.slice(0, 7).map((asset) => <div key={asset.id}><AssetImage asset={asset} /></div>)}
            <button type="button">+ Link assets</button>
          </div>
        </div>
        <aside className="proto-share-panel">
          <h2>Open album access</h2>
          <label className="proto-toggle-row"><span>Open album</span><input type="checkbox" defaultChecked /></label>
          <label className="proto-field"><span>Portal album link</span><input readOnly value="Available after reviewer confirms album access" /></label>
          <Button onClick={() => toast.message("Album link copied. Asset gates still apply.")}>Copy link</Button>
          <label className="proto-field"><span>Access</span><select defaultValue="view"><option value="view">Church team can view</option><option value="request">Request access required</option></select></label>
          <Button onClick={() => toast.message("Request queued. Approved-copy gates still check each asset.")}>Request approved copies</Button>
          <p className="proto-muted">Source/original files stay restricted. Album membership never bypasses per-asset review.</p>
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
