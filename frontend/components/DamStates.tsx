"use client";

import { AlertTriangle, CheckCircle2, CloudOff, EyeOff, FileLock2, FolderOpen, Image as ImageIcon, Info, Loader2, SearchX, ShieldAlert, UploadCloud, Users } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

type StateProps = {
  title: string;
  detail?: string;
  className?: string;
  children?: ReactNode;
};

type DamStateVariant = "loading" | "empty" | "error" | "restricted" | "blocked" | "pending" | "offline" | "success";
type DamStateTone = "neutral" | "info" | "success" | "warning" | "danger";

type DamStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
};

export type DamStateProps = {
  variant: DamStateVariant;
  tone?: DamStateTone;
  title: string;
  description?: string;
  reasonCode?: string;
  icon?: ReactNode;
  primaryAction?: DamStateAction;
  secondaryAction?: DamStateAction;
  compact?: boolean;
  className?: string;
};

function toneClass(tone: DamStateTone) {
  if (tone === "success") return "border-[#b8d9c6] bg-[#edf8f1] text-[#22563a]";
  if (tone === "warning") return "border-[#ead6a8] bg-[#fff8e8] text-[#725216]";
  if (tone === "danger") return "border-[#e5b7b5] bg-[#fff0ef] text-[#7d2d2a]";
  if (tone === "info") return "border-[#c8d7e6] bg-[#f2f7fb] text-[#27435b]";
  return "border-tjc-line bg-white text-tjc-ink";
}

function variantIcon(variant: DamStateVariant) {
  if (variant === "loading") return <Loader2 className="animate-spin" size={20} strokeWidth={1.8} aria-hidden="true" />;
  if (variant === "success") return <CheckCircle2 size={20} strokeWidth={1.8} aria-hidden="true" />;
  if (variant === "restricted" || variant === "blocked") return <FileLock2 size={20} strokeWidth={1.8} aria-hidden="true" />;
  if (variant === "offline") return <CloudOff size={20} strokeWidth={1.8} aria-hidden="true" />;
  if (variant === "error") return <AlertTriangle size={20} strokeWidth={1.8} aria-hidden="true" />;
  if (variant === "pending") return <Info size={20} strokeWidth={1.8} aria-hidden="true" />;
  return <SearchX size={20} strokeWidth={1.8} aria-hidden="true" />;
}

function actionNode(action: DamStateAction | undefined, kind: "primary" | "secondary") {
  if (!action) return null;
  const className = cn(
    "inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-black transition active:translate-y-px",
    kind === "primary" ? "bg-tjc-evergreen text-white hover:bg-[#062d24]" : "border border-current bg-white hover:bg-[#f8fbf8]"
  );
  if (action.href) {
    return <a className={className} href={action.href}>{action.label}</a>;
  }
  return <button className={className} type="button" onClick={action.onClick}>{action.label}</button>;
}

export function StateCard({
  variant,
  tone = "neutral",
  title,
  description,
  reasonCode,
  icon,
  primaryAction,
  secondaryAction,
  compact,
  className
}: DamStateProps) {
  const role = variant === "error" ? "alert" : "status";
  return (
    <section className={cn("rounded-md border p-4", toneClass(tone), compact && "p-3", className)} role={role}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md border border-current/15 bg-white">
          {icon || variantIcon(variant)}
        </span>
        <div className="min-w-0">
          <h2 className={cn("font-black leading-tight", compact ? "text-sm" : "text-lg")}>{title}</h2>
          {description ? <p className="mt-1 text-sm font-semibold leading-relaxed opacity-85">{description}</p> : null}
          {reasonCode ? <code className="mt-2 inline-block rounded-md bg-white px-2 py-1 text-[11px] font-black">{reasonCode}</code> : null}
          {primaryAction || secondaryAction ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {actionNode(primaryAction, "primary")}
              {actionNode(secondaryAction, "secondary")}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function LoadingState(props: Omit<DamStateProps, "variant" | "tone">) {
  return <StateCard {...props} variant="loading" tone="info" />;
}

export function PendingState(props: Omit<DamStateProps, "variant" | "tone">) {
  return <StateCard {...props} variant="pending" tone="warning" />;
}

export function NoResultsState(props: Omit<DamStateProps, "variant" | "tone">) {
  return <StateCard {...props} variant="empty" tone="neutral" />;
}

export function DownloadBlockedState(props: Omit<DamStateProps, "variant" | "tone">) {
  return <StateCard {...props} variant="blocked" tone="warning" />;
}

export function ResourceSpaceUnavailableState(props: Omit<DamStateProps, "variant" | "tone">) {
  return <StateCard {...props} variant="offline" tone="warning" />;
}

export function UploadEmptyState(props: Partial<Omit<DamStateProps, "variant" | "tone" | "title">>) {
  return <StateCard {...props} variant="empty" tone="info" title="No files selected" icon={<UploadCloud size={20} strokeWidth={1.8} aria-hidden="true" />} />;
}

export function ReviewQueueEmptyState(props: Partial<Omit<DamStateProps, "variant" | "tone" | "title">>) {
  return <StateCard {...props} variant="empty" tone="neutral" title="No uploads need review" />;
}

export function AdminConfigMissingState(props: Omit<DamStateProps, "variant" | "tone">) {
  return <StateCard {...props} variant="blocked" tone="danger" />;
}

function restrictedPreviewCopy(title?: string, detail?: string) {
  const haystack = `${title || ""} ${detail || ""}`.toLowerCase();
  if (/people|minor|children|youth/.test(haystack)) {
    return {
      icon: <Users size={22} strokeWidth={1.8} aria-hidden="true" />,
      title: title || "People/minors review required",
      reason: "People visibility needs reviewer confirmation before preview or download.",
      action: "Open Review Uploads",
      tone: "bg-[#fff8e8] text-[#725216]",
      ring: "bg-[#f3d994]/55"
    };
  }
  if (/right|consent/.test(haystack)) {
    return {
      icon: <ShieldAlert size={22} strokeWidth={1.8} aria-hidden="true" />,
      title: title || "Rights review required",
      reason: "Rights or consent evidence is unclear, so reuse stays blocked.",
      action: "Request review",
      tone: "bg-[#fff0ef] text-[#7d2d2a]",
      ring: "bg-[#e9b6b3]/50"
    };
  }
  if (/original|master|hidden/.test(haystack)) {
    return {
      icon: <FileLock2 size={22} strokeWidth={1.8} aria-hidden="true" />,
      title: title || "Source file hidden",
      reason: "Source-file access remains restricted; use approved copies only.",
      action: "Request source-file access",
      tone: "bg-[#f2f7fb] text-[#27435b]",
      ring: "bg-[#b9cede]/50"
    };
  }
  if (/pending/.test(haystack)) {
    return {
      icon: <ImageIcon size={22} strokeWidth={1.8} aria-hidden="true" />,
      title: title || "Preview pending",
      reason: "Derivative preview is staged for export or review.",
      action: "Check again later",
      tone: "bg-[#edf8f1] text-[#22563a]",
      ring: "bg-[#b8d9c6]/55"
    };
  }
  return {
    icon: <EyeOff size={22} strokeWidth={1.8} aria-hidden="true" />,
    title: title || "No derivative exported",
    reason: detail || "No role-safe display derivative is available.",
    action: "Review needed",
    tone: "bg-[#eef4f0] text-tjc-evergreen",
      ring: "bg-white"
  };
}

export function RestrictedPreviewPanel({ title = "Preview restricted", detail, className }: Partial<StateProps>) {
  const copy = restrictedPreviewCopy(title, detail);
  return (
    <div
      className={cn(
        "relative grid h-full min-h-44 w-full place-items-center overflow-hidden bg-[#edf3ef] p-5 text-center",
        className
      )}
    >
      <div className="absolute inset-4 rounded-md border border-[#d6dfd8]" aria-hidden="true" />
      <div className="relative z-[1] grid max-w-[24rem] justify-items-center gap-3 rounded-md border border-[#d6dfd8] bg-white px-5 py-5">
        <span className={cn("grid h-12 w-12 place-items-center rounded-md border border-[#d6dfd8]", copy.tone)}>
          {copy.icon}
        </span>
        <div>
          <strong className="text-base font-black leading-tight text-tjc-ink">{copy.title}</strong>
          <span className="mt-2 block text-sm font-semibold leading-relaxed text-tjc-muted">{copy.reason}</span>
        </div>
        <span className="rounded-md border border-[#d6dfd8] bg-[#fbfcfa] px-3 py-1 text-xs font-black text-tjc-evergreen">{copy.action}</span>
      </div>
    </div>
  );
}

export function AssetPreviewPlaceholder({ title = "Preview pending", detail, className }: Partial<StateProps>) {
  return (
    <div className={cn("dam-preview-grid relative grid h-full min-h-36 w-full place-items-center overflow-hidden p-4 text-center", className)}>
      <div className="relative z-[1] grid max-w-[20rem] justify-items-center gap-2 rounded-md border border-[#d6dfd8] bg-white px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-md border border-[#d6dfd8] bg-white text-tjc-blue">
          <ImageIcon size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <strong className="text-xs font-black leading-tight text-tjc-ink">{title}</strong>
        {detail ? <span className="text-xs font-semibold leading-snug text-tjc-muted">{detail}</span> : null}
      </div>
    </div>
  );
}

export function CollectionPreviewPlaceholder({ title = "Collection preview pending", detail, className }: Partial<StateProps>) {
  return (
    <div className={cn("relative grid h-full min-h-28 w-full place-items-center overflow-hidden rounded-md bg-[#e6f0eb] p-3 text-center", className)}>
      <div className="absolute inset-2 rounded-md border border-[#c9d8cf]" aria-hidden="true" />
      <span className="relative z-[1] grid justify-items-center gap-1.5 text-tjc-evergreen">
        <FolderOpen size={20} strokeWidth={1.8} aria-hidden="true" />
        <strong className="text-[11px] font-black leading-tight">{title}</strong>
        {detail ? <span className="text-[10px] font-semibold leading-tight text-tjc-muted">{detail}</span> : null}
      </span>
    </div>
  );
}

export function SkeletonGrid({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("dam-contact-grid gap-3", className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton h-72 w-full rounded-md" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("dam-data-table", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="dam-data-row grid-cols-[7rem_1fr_8rem]" key={index}>
          <span className="skeleton h-16 rounded-md" />
          <span className="grid content-center gap-2">
            <span className="skeleton h-4 w-2/3 rounded" />
            <span className="skeleton h-3 w-1/2 rounded" />
          </span>
          <span className="skeleton h-8 self-center rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-[1.1fr_.9fr]", className)} aria-hidden="true">
      <div className="skeleton min-h-[32rem] rounded-md" />
      <div className="grid gap-3">
        <div className="skeleton h-28 rounded-md" />
        <div className="skeleton h-52 rounded-md" />
        <div className="skeleton h-52 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonInspector({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-md border border-tjc-line bg-white p-4", className)} aria-hidden="true">
      <div className="skeleton h-5 w-36 rounded" />
      <div className="mt-4 grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="skeleton h-14 rounded-md" key={index} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, detail, children, className }: StateProps) {
  return (
    <section className={cn("grid place-items-center rounded-md border border-tjc-line bg-white p-8 text-center", className)} aria-live="polite">
      <div className="grid max-w-md justify-items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-md bg-[#e6f0eb] text-tjc-evergreen">
          <SearchX size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-black text-tjc-ink">{title}</h2>
          {detail ? <p className="mt-1 text-sm font-semibold leading-relaxed text-tjc-muted">{detail}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function ErrorState({ title, detail, children, className }: StateProps) {
  return (
    <section className={cn("rounded-md border border-[#e5b7b5] bg-[#fff0ef] p-5 text-[#7d2d2a]", className)} role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle size={21} strokeWidth={1.8} aria-hidden="true" />
        <div>
          <h2 className="font-black">{title}</h2>
          {detail ? <p className="mt-1 text-sm font-semibold leading-relaxed">{detail}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

export function BlockedState({ title, detail, children, className }: StateProps) {
  return (
    <section className={cn("rounded-md border border-[#ead6a8] bg-[#fff8e8] p-5 text-[#725216]", className)} role="status">
      <div className="flex items-start gap-3">
        <FileLock2 size={21} strokeWidth={1.8} aria-hidden="true" />
        <div>
          <h2 className="font-black">{title}</h2>
          {detail ? <p className="mt-1 text-sm font-semibold leading-relaxed">{detail}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}
