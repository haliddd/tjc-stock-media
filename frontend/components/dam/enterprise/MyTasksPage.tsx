"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  HardDrive,
  MessageSquareText,
  ShieldCheck,
  UploadCloud,
  Wrench
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { PageHeader } from "./EnterpriseShared";
import { routeWithRole } from "@/lib/role-routes";
import { contributorVisibleText, safeReviewWorkbenchText } from "@/lib/review-workbench";
import { cn } from "@/lib/utils";
import type { DemoRole } from "@/lib/types";

export type MyWorkStatus = "open" | "waiting" | "completed";
export type MyWorkCategory = "uploads" | "requests" | "drafts" | "review" | "rights" | "metadata" | "source" | "support";
export type MyWorkPriority = "Urgent" | "High" | "Normal";
export type MyWorkFilter = "all" | MyWorkCategory;

export type MyWorkTask = {
  id: string;
  roleFit: DemoRole[];
  category: MyWorkCategory;
  statusGroup: MyWorkStatus;
  title: string;
  reason: string;
  related: string;
  status: string;
  age: string;
  priority: MyWorkPriority;
  owner: string;
  actionLabel: string;
  href: string;
  detailLabel: string;
  detail: string;
  source: "browser" | "workbench";
};

type BrowserUploadReceipt = {
  id: string;
  batchName: string;
  mediaType?: string;
  fileCount?: number;
  status?: string;
  date?: string;
  reviewStatus?: string;
  reviewerNote?: string;
};

type LocalRequestReceipt = {
  id: string;
  type: RequestReceiptType;
  subject: string;
  status: "Local receipt" | "Draft";
  createdAt?: string;
  updatedAt: string;
};

type LocalContributorContext = {
  status: "loading" | "ready" | "blocked";
  receipts: BrowserUploadReceipt[];
  requestReceipts?: LocalRequestReceipt[];
  hasDraft: boolean;
  draftLabel?: string;
};

type StorageReader = Pick<Storage, "getItem">;

export const contributorUploadsKey = "tjc-upload-intake-my-uploads-v1";
export const uploadDraftKey = "tjc-upload-intake-batch-draft-v1";
export const localRequestReceiptsKey = "tjc-media-request-receipts-v1";

const requestReceiptTypes = [
  "Find photos",
  "Request permission",
  "Report privacy or rights issue",
  "Request original or high-resolution help",
  "General media help"
] as const;
type RequestReceiptType = typeof requestReceiptTypes[number];

const roleIntro: Record<DemoRole, { title: string; subtitle: string; emptyTitle: string; emptyBody: string }> = {
  Viewer: {
    title: "My Work",
    subtitle: "Requests and media follow-ups appear where your role can act.",
    emptyTitle: "No work waiting",
    emptyBody: "Use Requests when you need help finding church media or need to report a media issue."
  },
  Contributor: {
    title: "My Work",
    subtitle: "Recent submissions from this browser, saved drafts, local request receipts, and reviewer questions.",
    emptyTitle: "No work waiting",
    emptyBody: "Uploads, saved request receipts, and reviewer questions from this browser will appear here."
  },
  Reviewer: {
    title: "My Work",
    subtitle: "Review waiting uploads, rights checks, metadata checks, contributor follow-ups, and media requests.",
    emptyTitle: "No review tasks waiting",
    emptyBody: "New review tasks, rights checks, metadata checks, and requests will appear here."
  },
  "DAM Admin": {
    title: "My Work",
    subtitle: "Source status, intake issues, Support Zone checks, integration readiness, and reviewer bottlenecks.",
    emptyTitle: "No admin tasks waiting",
    emptyBody: "Source status, integration readiness, and reviewer bottlenecks will appear here when attention is needed."
  }
};

const filters: { id: MyWorkFilter; label: string }[] = [
  { id: "all", label: "All work" },
  { id: "uploads", label: "Uploads" },
  { id: "requests", label: "Requests" },
  { id: "drafts", label: "Drafts" },
  { id: "review", label: "Review" },
  { id: "rights", label: "Rights" },
  { id: "metadata", label: "Metadata" },
  { id: "source", label: "Source Status" },
  { id: "support", label: "Support Zone" }
];

const filterIdsByRole: Record<DemoRole, MyWorkFilter[]> = {
  Viewer: ["all", "requests"],
  Contributor: ["all", "uploads", "requests", "drafts"],
  Reviewer: ["all", "review", "rights", "metadata", "requests"],
  "DAM Admin": ["all", "uploads", "requests", "drafts", "review", "rights", "metadata", "source", "support"]
};

const workbenchTasks: MyWorkTask[] = [
  {
    id: "review-upload-route",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "review",
    statusGroup: "open",
    title: "Open Review Uploads",
    reason: "Use Review Uploads for queue records, counts, evidence, and decisions.",
    related: "Review Uploads",
    status: "Route available",
    age: "Current session",
    priority: "Normal",
    owner: "Reviewer",
    actionLabel: "Open Review Uploads",
    href: "/review?queue=pending",
    detailLabel: "Route details",
    detail: "Navigation only. My Work does not mirror review records or create approval outcomes.",
    source: "workbench"
  },
  {
    id: "rights-review-route",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "rights",
    statusGroup: "open",
    title: "Open rights review queue",
    reason: "Rights, consent, attribution, and proof questions stay in the source-backed review queue.",
    related: "Rights review",
    status: "Route available",
    age: "Current session",
    priority: "Normal",
    owner: "Reviewer",
    actionLabel: "Check rights",
    href: "/review?queue=rights-review",
    detailLabel: "Rights route",
    detail: "Navigation only. Open Review Uploads to see actual rights records and blockers.",
    source: "workbench"
  },
  {
    id: "metadata-review-route",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "metadata",
    statusGroup: "open",
    title: "Open metadata queue",
    reason: "Event, ministry, people/minors, and origin fields are checked inside Review Uploads.",
    related: "Metadata review",
    status: "Route available",
    age: "Current session",
    priority: "Normal",
    owner: "Reviewer",
    actionLabel: "Open metadata queue",
    href: "/review?queue=metadata",
    detailLabel: "Metadata route",
    detail: "Navigation only. Metadata checks do not publish or create delivery files.",
    source: "workbench"
  },
  {
    id: "request-follow-up-route",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "requests",
    statusGroup: "open",
    title: "Open media requests",
    reason: "Contributor questions and media-team replies stay in Requests, not in local My Work fixtures.",
    related: "Requests",
    status: "Route available",
    age: "Current session",
    priority: "Normal",
    owner: "Media team",
    actionLabel: "Open Requests",
    href: "/requests",
    detailLabel: "Request route",
    detail: "Navigation only. Replies do not grant file access, public use, or delivery.",
    source: "workbench"
  },
  {
    id: "admin-source-status-route",
    roleFit: ["DAM Admin"],
    category: "source",
    statusGroup: "open",
    title: "Open Source Status",
    reason: "Admin diagnostics show source readiness and ResourceSpace mapping without creating review records.",
    related: "Source Status",
    status: "Diagnostic route",
    age: "Current session",
    priority: "Normal",
    owner: "DAM Admin",
    actionLabel: "Open Admin",
    href: "/admin#launch-readiness-section",
    detailLabel: "Source route",
    detail: "Admin-only diagnostics can mention Source Status and ResourceSpace mapping; no source media is mutated here.",
    source: "workbench"
  },
  {
    id: "admin-support-zone-route",
    roleFit: ["DAM Admin"],
    category: "support",
    statusGroup: "open",
    title: "Open Support Zone",
    reason: "Support Zone readiness and launch checks stay admin-only.",
    related: "Support Zone",
    status: "Diagnostic route",
    age: "Current session",
    priority: "Normal",
    owner: "DAM Admin",
    actionLabel: "Open Admin",
    href: "/admin#system-health-section",
    detailLabel: "Support route",
    detail: "Support Zone is admin-only operational context, hidden from contributor and public views.",
    source: "workbench"
  }
];

const loadingContributorContext: LocalContributorContext = {
  status: "loading",
  receipts: [],
  requestReceipts: [],
  hasDraft: false
};

function safeText(value: unknown, fallback = "") {
  return safeReviewWorkbenchText(value, fallback);
}

function normalizeBrowserReceipt(value: unknown): BrowserUploadReceipt | null {
  const raw = (value || {}) as Partial<BrowserUploadReceipt>;
  const id = safeText(raw.id);
  const batchName = safeText(raw.batchName);
  if (!id || !batchName) return null;
  return {
    id,
    batchName: contributorVisibleText(batchName, "Submitted media"),
    mediaType: contributorVisibleText(raw.mediaType, "Media"),
    fileCount: Math.max(0, Math.trunc(Number(raw.fileCount) || 0)),
    status: contributorVisibleText(raw.status, "Submitted"),
    date: contributorVisibleText(raw.date, "Recently"),
    reviewStatus: contributorVisibleText(raw.reviewStatus, ""),
    reviewerNote: safeText(raw.reviewerNote)
  };
}

function safeContributorVisibleText(value: unknown, fallback: string) {
  return contributorVisibleText(value, fallback);
}

function safeRequestReceiptType(value: unknown): RequestReceiptType {
  return requestReceiptTypes.includes(value as RequestReceiptType) ? value as RequestReceiptType : "General media help";
}

function normalizeLocalRequestReceipt(value: unknown): LocalRequestReceipt | null {
  const raw = (value || {}) as Partial<LocalRequestReceipt>;
  const id = safeText(raw.id);
  if (!id) return null;
  const type = safeRequestReceiptType(raw.type);
  return {
    id,
    type,
    subject: safeContributorVisibleText(raw.subject, type),
    status: raw.status === "Draft" ? "Draft" : "Local receipt",
    updatedAt: safeContributorVisibleText(raw.updatedAt || raw.createdAt, "Recently")
  };
}

function parseJsonOrFallback(value: string | null, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

export function readContributorContextFromStorage(storage: StorageReader): LocalContributorContext {
  const receiptValue = storage.getItem(contributorUploadsKey);
  const requestReceiptValue = storage.getItem(localRequestReceiptsKey);
  const draftValue = storage.getItem(uploadDraftKey);
  const rawReceipts = parseJsonOrFallback(receiptValue, []);
  const receipts = Array.isArray(rawReceipts) ? rawReceipts.map(normalizeBrowserReceipt).filter((item): item is BrowserUploadReceipt => Boolean(item)) : [];
  const rawRequestReceipts = parseJsonOrFallback(requestReceiptValue, []);
  const requestReceipts = Array.isArray(rawRequestReceipts) ? rawRequestReceipts.map(normalizeLocalRequestReceipt).filter((item): item is LocalRequestReceipt => Boolean(item)) : [];
  const parsedDraft = parseJsonOrFallback(draftValue, {});
  const rawDraft = parsedDraft && typeof parsedDraft === "object" && !Array.isArray(parsedDraft) ? parsedDraft as Record<string, unknown> : {};
  const draftLabel = contributorVisibleText(rawDraft.batchName, "") || contributorVisibleText(rawDraft.eventName, "") || "Upload draft";
  const hasDraft = Object.values(rawDraft).some((value) => typeof value === "string" && value.trim().length > 0);
  return {
    status: "ready",
    receipts,
    requestReceipts,
    hasDraft,
    draftLabel: hasDraft ? draftLabel : undefined
  };
}

function readContributorContext(): LocalContributorContext {
  try {
    return readContributorContextFromStorage(window.localStorage);
  } catch {
    return { status: "blocked", receipts: [], requestReceipts: [], hasDraft: false };
  }
}

function safeContributorQuestionDetail(note: string | undefined) {
  return contributorVisibleText(note, "Reviewer needs more event or rights context before review can continue.");
}

function browserTaskFromReceipt(receipt: BrowserUploadReceipt): MyWorkTask {
  const status = receipt.status || "Submitted";
  const taskState = `${status} ${receipt.reviewStatus || ""}`;
  const batchName = receipt.batchName;
  const base = {
    id: `browser-${receipt.id}`,
    roleFit: ["Contributor"] as DemoRole[],
    related: batchName,
    source: "browser" as const,
    age: receipt.date || "Recently",
    owner: "Contributor",
    href: "/recent-uploads",
    detailLabel: "Submission details",
    detail: "Recent submission from this browser."
  };

  if (/draft/i.test(taskState)) {
    return {
      ...base,
      category: "drafts",
      statusGroup: "open",
      title: "Draft not sent yet",
      reason: "This upload draft is saved in this browser and has not been submitted for review.",
      status: "Draft not sent yet",
      priority: "High",
      actionLabel: "Continue upload",
      href: "/upload"
    };
  }

  if (/needs more info|more info|question/i.test(taskState)) {
    return {
      ...base,
      category: "requests",
      statusGroup: "open",
      title: "Reviewer needs more info",
      reason: safeContributorQuestionDetail(receipt.reviewerNote),
      status: "Needs response",
      priority: "High",
      actionLabel: "View My Uploads"
    };
  }

  if (/submitted|waiting|needs review/i.test(taskState)) {
    return {
      ...base,
      category: "uploads",
      statusGroup: "waiting",
      title: "Upload waiting for review",
      reason: "Recent submission from this browser is waiting for reviewer attention.",
      status: "Waiting for review",
      priority: "Normal",
      actionLabel: "View My Uploads"
    };
  }

  return {
    ...base,
    category: "uploads",
    statusGroup: "completed",
    title: "Upload reviewed",
    reason: "Reviewer work on this browser submission has a closed status.",
    status: "Upload reviewed",
    priority: "Normal",
    actionLabel: "View My Uploads",
    detail: "Reviewed label is limited to this receipt status. It does not mean public use, delivery, or download access."
  };
}

function browserTaskFromRequestReceipt(receipt: LocalRequestReceipt): MyWorkTask {
  const isDraft = receipt.status === "Draft";
  return {
    id: `request-${receipt.id}`,
    roleFit: ["Contributor"],
    category: "requests",
    statusGroup: isDraft ? "open" : "waiting",
    title: isDraft ? "Request draft not sent" : "Request saved in this browser",
    reason: isDraft
      ? "Request draft is saved in this browser and has not been sent from Requests."
      : "Request receipt is waiting for media-team follow-up in Requests.",
    related: receipt.subject,
    status: isDraft ? "Draft not sent" : "Waiting for follow-up",
    age: receipt.updatedAt,
    priority: isDraft ? "High" : "Normal",
    owner: "Contributor",
    actionLabel: isDraft ? "Continue request" : "Open Requests",
    href: "/requests",
    detailLabel: "Request details",
    detail: `Request type: ${receipt.type}. Requests page owns the details; use or file-access questions still need reviewer follow-up.`,
    source: "browser"
  };
}

export function buildContributorBrowserTasks(context: LocalContributorContext): MyWorkTask[] {
  if (context.status !== "ready") return [];
  const receiptTasks = context.receipts.map(browserTaskFromReceipt);
  const requestTasks = (context.requestReceipts || []).map(browserTaskFromRequestReceipt);
  const draftTask: MyWorkTask[] = context.hasDraft
    ? [{
        id: "browser-current-draft",
        roleFit: ["Contributor"],
        category: "drafts",
        statusGroup: "open",
        title: "Draft not sent yet",
        reason: "A local upload draft exists in this browser.",
        related: context.draftLabel || "Upload draft",
        status: "Draft not sent yet",
        age: "Saved locally",
        priority: "High",
        owner: "Contributor",
        actionLabel: "Continue upload",
        href: "/upload",
        detailLabel: "Draft details",
        detail: "Local draft is browser-only. Submit it before reviewers can see it.",
        source: "browser"
      }]
    : [];
  return [...draftTask, ...receiptTasks, ...requestTasks];
}

export function getMyWorkTasks(role: DemoRole, context: LocalContributorContext = { status: "ready", receipts: [], requestReceipts: [], hasDraft: false }) {
  if (role === "Contributor") return buildContributorBrowserTasks(context);
  if (role === "Viewer") return [];
  return workbenchTasks.filter((task) => task.roleFit.includes(role));
}

export function filterMyWorkTasks(tasks: MyWorkTask[], filter: MyWorkFilter) {
  return filter === "all" ? tasks : tasks.filter((task) => task.category === filter);
}

export function getMyWorkSummary(tasks: MyWorkTask[]) {
  return [
    { label: "Visible tasks", value: tasks.length, icon: ClipboardCheck },
    { label: "Open work", value: tasks.filter((task) => task.statusGroup === "open").length, icon: AlertCircle },
    { label: "Waiting", value: tasks.filter((task) => task.statusGroup === "waiting").length, icon: Clock3 },
    { label: "Closed safely", value: tasks.filter((task) => task.statusGroup === "completed").length, icon: CheckCircle2 }
  ];
}

function taskIcon(task: MyWorkTask) {
  if (task.category === "uploads" || task.category === "drafts") return UploadCloud;
  if (task.category === "rights") return ShieldCheck;
  if (task.category === "metadata" || task.category === "review") return ClipboardCheck;
  if (task.category === "source") return HardDrive;
  if (task.category === "support") return Wrench;
  if (task.category === "requests") return MessageSquareText;
  return AlertCircle;
}

function priorityClass(priority: MyWorkPriority) {
  if (priority === "Urgent") return "is-urgent";
  if (priority === "High") return "is-high";
  return "is-normal";
}

function statusClass(status: MyWorkStatus) {
  if (status === "open") return "is-open";
  if (status === "waiting") return "is-waiting";
  return "is-completed";
}

function roleActionLinks(role: DemoRole) {
  if (role === "Viewer") {
    return [
      { label: "Browse Media", href: "/library" },
      { label: "Open Requests", href: "/requests" },
      { label: "Help Center", href: "/help" }
    ];
  }
  if (role === "Contributor") {
    return [
      { label: "Upload Photos", href: "/upload" },
      { label: "View My Uploads", href: "/recent-uploads" },
      { label: "Open Requests", href: "/requests" }
    ];
  }
  if (role === "DAM Admin") {
    return [
      { label: "Open Admin", href: "/admin" },
      { label: "Review Uploads", href: "/review?queue=pending" },
      { label: "Open Requests", href: "/requests" }
    ];
  }
  return [
    { label: "Review Uploads", href: "/review?queue=pending" },
    { label: "Check usage rights", href: "/review?queue=rights-review" },
    { label: "Open Requests", href: "/requests" }
  ];
}

export function safeLabelsForRole(role: DemoRole) {
  if (role === "Viewer") {
    return ["Request receipt saved", "Waiting on media team", "Needs details", "Follow-up closed"];
  }
  if (role === "Contributor") {
    return ["Draft not sent", "Waiting for review", "Needs response", "Upload reviewed"];
  }
  if (role === "Reviewer") {
    return ["Review route open", "Rights check needed", "Contributor follow-up route", "Request response route"];
  }
  return ["Review route open", "Request route open", "Admin check needed", "Support check needed"];
}

export function filtersForRole(role: DemoRole) {
  const allowed = new Set(filterIdsByRole[role]);
  return filters.filter((filter) => allowed.has(filter.id));
}

function categoryCount(tasks: MyWorkTask[], filter: MyWorkFilter) {
  return filter === "all" ? tasks.length : tasks.filter((task) => task.category === filter).length;
}

function sourceUnavailable(searchValue: string | null, role: DemoRole) {
  return (role === "Reviewer" || role === "DAM Admin") && searchValue === "source-unavailable";
}

export function MyTasksPage() {
  const { role } = useDemoRole();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<MyWorkFilter>("all");
  const [localContext, setLocalContext] = useState<LocalContributorContext>(loadingContributorContext);
  const emptyMode = searchParams?.get("state") === "empty";
  const sourceStatusUnavailable = sourceUnavailable(searchParams?.get("state"), role);
  const copy = roleIntro[role];

  useEffect(() => {
    setLocalContext(readContributorContext());
  }, []);

  useEffect(() => {
    if (!filterIdsByRole[role].includes(activeFilter)) setActiveFilter("all");
  }, [activeFilter, role]);

  const allTasks = useMemo(() => emptyMode || sourceStatusUnavailable ? [] : getMyWorkTasks(role, localContext), [emptyMode, localContext, role, sourceStatusUnavailable]);
  const visibleTasks = useMemo(() => filterMyWorkTasks(allTasks, activeFilter), [activeFilter, allTasks]);
  const summary = getMyWorkSummary(visibleTasks);
  const actionLinks = roleActionLinks(role);
  const visibleFilters = filtersForRole(role);
  const loading = role === "Contributor" && localContext.status === "loading" && !emptyMode;
  const browserStorageBlocked = role === "Contributor" && localContext.status === "blocked";
  const hasTasks = visibleTasks.length > 0;

  return (
    <div className="enterprise-page enterprise-my-tasks enterprise-my-work-launch route-identity-page" data-route-identity="my-tasks">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <section className="mw-launch" data-primary-section="my-work-dashboard">
        <section className="mw-launch-toolbar" aria-label="My Work filters and actions">
          <div className="mw-filter-row" aria-label="Filter work by type">
            <span><Filter size={15} aria-hidden="true" />Filter</span>
            {visibleFilters.map((filter) => {
              const count = categoryCount(allTasks, filter.id);
              const unavailable = count === 0 && filter.id !== "all";
              return (
                <button
                  key={filter.id}
                  type="button"
                  className={cn(activeFilter === filter.id && "is-active")}
                  onClick={() => setActiveFilter(filter.id)}
                  aria-pressed={activeFilter === filter.id}
                  disabled={unavailable}
                >
                  {filter.label}<em>{count}</em>
                </button>
              );
            })}
          </div>

          <nav className="mw-action-row" aria-label="My Work destinations">
            {actionLinks.map((link) => (
              <Link key={link.href} href={routeWithRole(link.href, role)}>{link.label}</Link>
            ))}
          </nav>
        </section>

        <section className="mw-summary-grid" aria-label="Visible work summary">
          {summary.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label}>
                <Icon size={18} aria-hidden="true" />
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            );
          })}
        </section>

        <div className="mw-workspace">
          <section className="mw-task-panel" aria-labelledby="my-work-list-title">
            <header className="mw-section-header">
              <div>
                <h2 id="my-work-list-title">{activeFilter === "all" ? "Work waiting" : `${visibleFilters.find((filter) => filter.id === activeFilter)?.label || "Work"} waiting`}</h2>
                <p>{visibleTasks.length} visible task{visibleTasks.length === 1 ? "" : "s"}. Counts match current filter.</p>
              </div>
              <span>{visibleTasks.length}</span>
            </header>

            {loading ? (
              <section className="mw-state-card" role="status" aria-live="polite" aria-busy="true">
                <Clock3 size={22} aria-hidden="true" />
                <h3>Loading recent submissions from this browser</h3>
                <p>Browser receipts are local only.</p>
              </section>
            ) : browserStorageBlocked ? (
              <section className="mw-state-card is-warning" role="status">
                <AlertCircle size={22} aria-hidden="true" />
                <h3>Local receipts unavailable in this browser</h3>
                <p>Use My Uploads or Upload Photos. This page cannot read browser-only submissions right now.</p>
                <div className="mw-rail-links">
                  {actionLinks.slice(0, 2).map((link) => (
                    <Link key={`blocked-${link.href}`} href={routeWithRole(link.href, role)}>{link.label}</Link>
                  ))}
                </div>
              </section>
            ) : sourceStatusUnavailable ? (
              <section className="mw-state-card is-warning" role="status">
                <AlertCircle size={22} aria-hidden="true" />
                <h3>Source status unavailable</h3>
                <p>Reviewer/admin source diagnostics are unavailable. Work decisions stay inside Review Uploads and Admin.</p>
                <div className="mw-rail-links">
                  {actionLinks.slice(0, 2).map((link) => (
                    <Link key={`unavailable-${link.href}`} href={routeWithRole(link.href, role)}>{link.label}</Link>
                  ))}
                </div>
              </section>
            ) : hasTasks ? (
              <div className="mw-task-list" role="list">
                {visibleTasks.map((task) => {
                  const Icon = taskIcon(task);
                  const expanded = expandedId === task.id;
                  return (
                    <article key={task.id} className={cn("mw-task-card", statusClass(task.statusGroup), expanded && "is-expanded")} role="listitem">
                      <div className="mw-task-icon" aria-hidden="true"><Icon size={19} /></div>
                      <div className="mw-task-body">
                        <div className="mw-task-title-row">
                          <h3>{task.title}</h3>
                          <span className={cn("mw-priority", priorityClass(task.priority))}>{task.priority}</span>
                        </div>
                        <p>{task.reason}</p>
                        <dl>
                          <div><dt>Related</dt><dd>{task.related}</dd></div>
                          <div><dt>Status</dt><dd>{task.status}</dd></div>
                          <div><dt>Age</dt><dd>{task.age}</dd></div>
                          <div><dt>Owner</dt><dd>{task.owner}</dd></div>
                        </dl>
                        {task.source === "browser" ? <small>Recent submission from this browser.</small> : null}
                        {expanded ? (
                          <section className="mw-task-detail" aria-label={task.detailLabel}>
                            <strong>{task.detailLabel}</strong>
                            <p>{task.detail}</p>
                          </section>
                        ) : null}
                      </div>
                      <div className="mw-task-actions">
                        <Link aria-label={`${task.actionLabel}: ${task.title}`} href={routeWithRole(task.href, role)}>{task.actionLabel}</Link>
                        <button type="button" onClick={() => setExpandedId((current) => current === task.id ? null : task.id)} aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "Show"} details for ${task.title}`}>
                          Details
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <section className="mw-state-card" role="status">
                <CheckCircle2 size={22} aria-hidden="true" />
                <h3>{copy.emptyTitle}</h3>
                <p>{copy.emptyBody}</p>
                <div className="mw-rail-links">
                  {actionLinks.slice(0, 2).map((link) => (
                    <Link key={`empty-${link.href}`} href={routeWithRole(link.href, role)}>{link.label}</Link>
                  ))}
                </div>
              </section>
            )}
          </section>

          <aside className="mw-status-rail" aria-label="Role status">
            <section>
              <h2>Role view</h2>
              <p>{role === "Contributor" ? "Personal browser receipts only" : role === "DAM Admin" ? "Admin workbench" : role === "Reviewer" ? "Reviewer workbench" : "Requests only"}</p>
            </section>
            <section>
              <h3>Safe labels</h3>
              <ul>
                {safeLabelsForRole(role).map((label) => (
                  <li key={label}><CheckCircle2 size={14} aria-hidden="true" />{label}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Status note</h3>
              <p>{role === "Contributor" ? "My Work shows uploads, requests, and drafts you can act on from this browser." : "Workbench examples route to real pages and do not create approvals, downloads, sync, or publishing."}</p>
            </section>
            <section>
              <h3>Next places</h3>
              <div className="mw-rail-links">
                {actionLinks.map((link) => (
                  <Link key={`rail-${link.href}`} href={routeWithRole(link.href, role)}>{link.label}</Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
