import { createElement, isValidElement, type ElementType, type ReactNode } from "react";
import { AlertTriangle, Archive, CheckCircle2, CircleDashed, Download, Eye, FileCheck2, FileX2, Lock, ShieldAlert } from "lucide-react";
import type { StockMediaAsset } from "@/lib/types";
import { buildReuseDecision } from "@/lib/reuse-policy";
import { cn } from "@/lib/ui";

type TjcStatusDomain = "reuse" | "rights" | "review" | "visibility" | "source" | "download" | "raw";
type TjcStatusTone = "success" | "warning" | "danger" | "info" | "neutral" | "pending";
type TjcStatusSize = "xs" | "sm" | "md";

export type TjcStatusBadgeProps = {
  domain: TjcStatusDomain;
  status: string;
  size?: TjcStatusSize;
  tone?: TjcStatusTone;
  icon?: ElementType | ReactNode;
  label: string;
  tooltip?: string;
};

const statusLabels: Record<StockMediaAsset["status"], string> = {
  "Approved Public": "Library approved public",
  "Approved Internal": "Library approved internal",
  "Needs Review": "Please review before public sharing",
  "Searchable Archive": "Archive only",
  "Do Not Use": "Do not publish externally",
  "Possible Minors": "Contains children/youth"
};

const usageLabels: Record<StockMediaAsset["usageScope"], string> = {
  Public: "Church-wide use",
  Internal: "Internal ministry use",
  "Public and Internal": "Church-wide and internal",
  "Archive Only": "Archive only",
  "Do Not Publish": "Not published",
  "Do Not Use": "Do not use"
};

const toneClasses: Record<TjcStatusTone, string> = {
  success: "border-[#a8d7ba] bg-[#edf8f1] text-[#1f5d3b]",
  warning: "border-[#e6c774] bg-[#fff7df] text-[#704707]",
  danger: "border-[#e1aaa5] bg-[#fff0ee] text-[#8a312d]",
  info: "border-[#b5d7e0] bg-[#eef8fb] text-[#0b5f7a]",
  neutral: "border-[#d6dfd8] bg-[#f8faf8] text-[#405048]",
  pending: "border-[#dcc37c] bg-[#fffaf0] text-[#7a5a19]"
};

const sizeClasses: Record<TjcStatusSize, string> = {
  xs: "h-6 gap-1 rounded-md px-2 text-[10px] max-sm:h-5 max-sm:px-1.5 max-sm:text-[9px]",
  sm: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
  md: "h-8 gap-2 rounded-md px-3 text-sm"
};

const iconSizeClasses: Record<TjcStatusSize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4"
};

const rawStatusTones: Record<StockMediaAsset["status"], TjcStatusTone> = {
  "Approved Public": "success",
  "Approved Internal": "info",
  "Needs Review": "warning",
  "Searchable Archive": "neutral",
  "Do Not Use": "danger",
  "Possible Minors": "warning"
};

const usageTones: Record<StockMediaAsset["usageScope"], TjcStatusTone> = {
  Public: "success",
  Internal: "info",
  "Public and Internal": "success",
  "Archive Only": "neutral",
  "Do Not Publish": "danger",
  "Do Not Use": "danger"
};

export function TjcStatusBadge({
  domain,
  status,
  size = "sm",
  tone = "neutral",
  icon: Icon,
  label,
  tooltip
}: TjcStatusBadgeProps) {
  const iconNode = isValidElement(Icon)
    ? Icon
    : (typeof Icon === "function" || (typeof Icon === "object" && Icon && "$$typeof" in Icon))
      ? createElement(Icon as ElementType, { className: cn(iconSizeClasses[size], "shrink-0"), strokeWidth: 1.9, "aria-hidden": "true" })
      : null;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center border font-black leading-none",
        toneClasses[tone],
        sizeClasses[size]
      )}
      title={tooltip || `${domain}: ${status}`}
      data-domain={domain}
      data-status={status}
      data-tone={tone}
      data-badge-size={size}
    >
      {iconNode ? <span className={cn("inline-flex shrink-0 items-center justify-center", iconSizeClasses[size])} aria-hidden="true">{iconNode}</span> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export function StatusBadge({ status, size }: { status: StockMediaAsset["status"]; size?: TjcStatusSize }) {
  return (
    <RawStatusBadge status={status} size={size} />
  );
}

export function UsageBadge({ scope, size = "sm" }: { scope: StockMediaAsset["usageScope"]; size?: TjcStatusSize }) {
  return (
    <TjcStatusBadge
      domain="visibility"
      status={scope}
      tone={usageTones[scope]}
      icon={scope.includes("Do Not") ? FileX2 : Eye}
      label={usageLabels[scope]}
      tooltip={`Usage scope: ${scope}`}
      size={size}
    />
  );
}

export function RawStatusBadge({ status, size = "sm" }: { status: StockMediaAsset["status"]; size?: TjcStatusSize }) {
  const icon =
    status === "Approved Public" || status === "Approved Internal"
      ? FileCheck2
      : status === "Do Not Use"
        ? FileX2
        : status === "Searchable Archive"
          ? Lock
          : AlertTriangle;
  return (
    <TjcStatusBadge
      domain="raw"
      status={status}
      tone={rawStatusTones[status]}
      icon={icon}
      label={statusLabels[status]}
      tooltip={`Library status: ${status}`}
      size={size}
    />
  );
}

const reuseStateLabels: Record<string, string> = {
  portal_ready: "Reuse approved",
  portalReady: "Reuse approved",
  "portal-ready": "Reuse approved",
  internal_ready: "Reuse approved",
  "internal-ready": "Reuse approved",
  needs_portal_review: "Needs review before reuse",
  preview_only: "Preview only",
  blocked: "Blocked from reuse",
  archive_only: "Blocked from reuse",
  do_not_publish: "Do not publish"
};

function reuseStateTone(status: string): TjcStatusTone {
  if (status === "portal-ready" || status === "portal_ready" || status === "portalReady") return "success";
  if (status === "internal-ready" || status === "internal_ready" || status === "preview-only" || status === "preview_only") return "info";
  if (status === "blocked-do-not-use" || status === "do_not_publish" || status === "blocked-rights" || status === "blocked-people-minors" || status === "blocked-sensitive") return "danger";
  if (status === "blocked-archive" || status === "archive_only") return "neutral";
  if (status === "pending-write" || status === "pending_write") return "pending";
  return "warning";
}

function reuseStateIcon(status: string, downloadable?: boolean) {
  if (downloadable || status === "portal-ready" || status === "portal_ready") return CheckCircle2;
  if (status === "internal-ready" || status === "internal_ready" || status === "preview-only" || status === "preview_only") return Eye;
  if (status === "blocked-archive" || status === "archive_only") return Archive;
  if (status.includes("blocked") || status === "do_not_publish") return ShieldAlert;
  return CircleDashed;
}

export function ReuseStateBadge({ asset, state, size = "sm" }: { asset?: StockMediaAsset; state?: string; size?: TjcStatusSize }) {
  const decision = asset ? buildReuseDecision(asset) : null;
  const status = decision?.state || state || "needs_portal_review";
  const label = decision ? reuseStateLabels[decision.state] || decision.label : reuseStateLabels[status] || status;
  return (
    <TjcStatusBadge
      domain="reuse"
      status={status}
      tone={reuseStateTone(status)}
      icon={reuseStateIcon(status, decision?.downloadable)}
      label={label}
      tooltip={`Reuse/download answer: ${decision?.summary || label}`}
      size={size}
    />
  );
}

export function RightsBadge({ asset, state, size = "sm" }: { asset?: StockMediaAsset; state?: string; size?: TjcStatusSize }) {
  const rights = state || asset?.rightsStatus || asset?.consentStatus || "Unknown";
  const tone: TjcStatusTone = /clear|approved|confirmed/i.test(rights) ? "success" : /missing|consent|concern|blocked/i.test(rights) ? "danger" : /restricted|internal/i.test(rights) ? "warning" : "warning";
  return <TjcStatusBadge domain="rights" status={rights} tone={tone} icon={Lock} label={rights} tooltip={`Rights status: ${rights}`} size={size} />;
}

export function ReviewBadge({ asset, state, size = "sm" }: { asset?: StockMediaAsset; state?: string; size?: TjcStatusSize }) {
  const status = state || (asset?.pendingReviewWrite ? "Pending Write" : asset?.reviewer && asset?.reviewedDate ? "Review Complete" : "Needs Review");
  const tone: TjcStatusTone = status === "Review Complete" ? "success" : status === "Pending Write" ? "pending" : /failed/i.test(status) ? "danger" : "warning";
  return <TjcStatusBadge domain="review" status={status} tone={tone} icon={status === "Review Complete" ? CheckCircle2 : CircleDashed} label={status} size={size} />;
}

export function VisibilityBadge({ asset, state, size = "sm" }: { asset?: StockMediaAsset; state?: string; size?: TjcStatusSize }) {
  const status = state || asset?.peopleRisk || "People Unknown";
  const tone: TjcStatusTone = /children|youth|sensitive/i.test(status) ? "danger" : status === "Possible minors" || status === "Unknown" || /unknown/i.test(status) ? "warning" : "success";
  return <TjcStatusBadge domain="visibility" status={status} tone={tone} icon={Eye} label={status} tooltip={`People/minors visibility: ${status}`} size={size} />;
}

export function DownloadBadge({ asset, state, size = "sm" }: { asset?: StockMediaAsset; state?: string; size?: TjcStatusSize }) {
  const decision = asset ? buildReuseDecision(asset) : null;
  const allowed = decision?.downloadable || state === "allowed";
  return (
    <TjcStatusBadge
      domain="download"
      status={allowed ? "allowed" : "blocked"}
      tone={allowed ? "success" : "danger"}
      icon={allowed ? Download : FileX2}
      label={allowed ? "Download approved copy" : "Download unavailable"}
      tooltip={allowed ? "Approved copy can be downloaded by allowed roles." : decision?.summary || "Download unavailable until reuse checks pass."}
      size={size}
    />
  );
}

export function BlockerBadge({ asset, label, size = "xs" }: { asset?: StockMediaAsset; label?: string; size?: TjcStatusSize }) {
  const decision = asset ? buildReuseDecision(asset) : null;
  const blocker = decision?.blockers[0];
  const shortLabels: Record<string, string> = {
    "blocked-needs-review": "Needs review",
    "blocked-source": "Source missing",
    "blocked-rights": "Rights review",
    "blocked-people-minors": "People review",
    "blocked-reviewer-date": "Review missing",
    "blocked-derivative": "Copy missing",
    "blocked-sensitive": "Sensitive",
    "blocked-archive": "Archive only",
    "blocked-do-not-use": "Do not publish"
  };
  const nextLabel = label || (blocker?.code ? shortLabels[blocker.code] : undefined) || blocker?.label || "Blocked";
  const status = blocker?.code || "blocked";
  const tone: TjcStatusTone = status === "blocked-archive" ? "neutral" : status === "blocked-needs-review" || status === "blocked-derivative" || status === "blocked-reviewer-date" ? "warning" : "danger";
  return (
    <TjcStatusBadge
      domain="download"
      status={status}
      tone={tone}
      icon={tone === "neutral" ? Archive : ShieldAlert}
      label={nextLabel}
      tooltip={decision?.summary || nextLabel}
      size={size}
    />
  );
}
