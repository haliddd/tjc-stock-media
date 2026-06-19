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

type LocalContributorContext = {
  status: "loading" | "ready" | "blocked";
  receipts: BrowserUploadReceipt[];
  hasDraft: boolean;
  draftLabel?: string;
};

type StorageReader = Pick<Storage, "getItem">;

export const contributorUploadsKey = "tjc-upload-intake-my-uploads-v1";
export const uploadDraftKey = "tjc-upload-intake-batch-draft-v1";

const roleIntro: Record<DemoRole, { title: string; subtitle: string; emptyTitle: string; emptyBody: string }> = {
  Viewer: {
    title: "My Work",
    subtitle: "Requests and media follow-ups appear where your role can act.",
    emptyTitle: "No work waiting",
    emptyBody: "Use Requests when you need help finding church media or need to report a media issue."
  },
  Contributor: {
    title: "My Work",
    subtitle: "Recent submissions from this browser, saved drafts, reviewer questions, and request follow-ups.",
    emptyTitle: "No work waiting",
    emptyBody: "Uploads saved or submitted from this browser will appear here."
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
    id: "review-waiting-uploads",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "review",
    statusGroup: "open",
    title: "Review waiting uploads",
    reason: "Fellowship Lunch has 42 photos waiting for reviewer notes and a safe-use decision.",
    related: "Fellowship Lunch upload",
    status: "Waiting for review",
    age: "2 days old",
    priority: "High",
    owner: "Reviewer",
    actionLabel: "Open Review Uploads",
    href: "/review?queue=pending",
    detailLabel: "Review details",
    detail: "Workbench example only. Review page owns decisions; this dashboard only routes work.",
    source: "workbench"
  },
  {
    id: "rights-check-youth",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "rights",
    statusGroup: "open",
    title: "Check usage rights",
    reason: "Youth fellowship photos need consent evidence before broader reuse can be considered.",
    related: "Youth fellowship photos",
    status: "Rights check needed",
    age: "Due today",
    priority: "High",
    owner: "Reviewer",
    actionLabel: "Check rights",
    href: "/review?queue=rights-review",
    detailLabel: "Rights details",
    detail: "Public use stays blocked unless a reviewer records enough rights evidence.",
    source: "workbench"
  },
  {
    id: "metadata-check-choir",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "metadata",
    statusGroup: "open",
    title: "Check metadata",
    reason: "Choir Practice batch needs event date, ministry, and people/minors fields checked.",
    related: "Choir Practice upload",
    status: "Metadata check needed",
    age: "1 day old",
    priority: "Normal",
    owner: "Reviewer",
    actionLabel: "Open metadata queue",
    href: "/review?queue=metadata",
    detailLabel: "Metadata details",
    detail: "Metadata checks prepare review notes; they do not publish or create delivery files.",
    source: "workbench"
  },
  {
    id: "contributor-follow-up",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "requests",
    statusGroup: "waiting",
    title: "Reviewer needs more info",
    reason: "Contributor was asked to confirm event date and whether children are visible.",
    related: "Spring Outreach upload",
    status: "Waiting on contributor",
    age: "Sent yesterday",
    priority: "Normal",
    owner: "Contributor",
    actionLabel: "Open Requests",
    href: "/requests",
    detailLabel: "Follow-up details",
    detail: "Follow-up stays inside Requests until the contributor answers.",
    source: "workbench"
  },
  {
    id: "request-response",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "requests",
    statusGroup: "open",
    title: "Answer media request",
    reason: "Internet Ministry asked for Spring Outreach photos and needs review-safe guidance.",
    related: "Request REQ-1024",
    status: "Response needed",
    age: "Due today",
    priority: "High",
    owner: "Media team",
    actionLabel: "Open request",
    href: "/requests",
    detailLabel: "Request details",
    detail: "Replying to a request does not grant download, public use, or source-file access.",
    source: "workbench"
  },
  {
    id: "review-completed",
    roleFit: ["Reviewer", "DAM Admin"],
    category: "review",
    statusGroup: "completed",
    title: "Review completed",
    reason: "Choir Practice upload has reviewer notes saved for internal follow-up.",
    related: "Choir Practice upload",
    status: "Internal review completed",
    age: "Today",
    priority: "Normal",
    owner: "Reviewer",
    actionLabel: "Open Review Uploads",
    href: "/review?queue=pending",
    detailLabel: "Completion details",
    detail: "Completed label means review work closed here, not public publishing.",
    source: "workbench"
  },
  {
    id: "admin-source-status",
    roleFit: ["DAM Admin"],
    category: "source",
    statusGroup: "open",
    title: "Check intake status",
    reason: "Source Status shows one upload intake issue that needs admin review.",
    related: "Source Status",
    status: "Needs admin check",
    age: "Due today",
    priority: "High",
    owner: "DAM Admin",
    actionLabel: "Open Admin",
    href: "/admin#launch-readiness-section",
    detailLabel: "Source details",
    detail: "Admin diagnostics can mention Source Status and ResourceSpace mapping; no public publishing happens here.",
    source: "workbench"
  },
  {
    id: "admin-support-zone",
    roleFit: ["DAM Admin"],
    category: "support",
    statusGroup: "open",
    title: "Run Support Zone check",
    reason: "Support Zone readiness needs a quick check before launch rehearsal.",
    related: "Support Zone",
    status: "Check needed",
    age: "Today",
    priority: "Normal",
    owner: "DAM Admin",
    actionLabel: "Open Admin",
    href: "/admin#system-health-section",
    detailLabel: "Support details",
    detail: "Support Zone is admin-only operational context, hidden from contributor and public views.",
    source: "workbench"
  },
  {
    id: "admin-integration-readiness",
    roleFit: ["DAM Admin"],
    category: "source",
    statusGroup: "waiting",
    title: "Check integration readiness",
    reason: "Integration readiness is waiting on final operator review.",
    related: "Admin integrations",
    status: "Waiting on admin",
    age: "2 days old",
    priority: "Normal",
    owner: "DAM Admin",
    actionLabel: "Open Admin",
    href: "/admin#integrations",
    detailLabel: "Integration details",
    detail: "Readiness checks are diagnostic only; they do not sync or mutate source media.",
    source: "workbench"
  },
  {
    id: "admin-reviewer-bottleneck",
    roleFit: ["DAM Admin"],
    category: "review",
    statusGroup: "open",
    title: "Check reviewer bottlenecks",
    reason: "Three uploads have waited more than 48 hours for reviewer attention.",
    related: "Review Uploads",
    status: "Bottleneck",
    age: "48+ hours",
    priority: "Urgent",
    owner: "DAM Admin",
    actionLabel: "Open Review Uploads",
    href: "/review?queue=pending",
    detailLabel: "Bottleneck details",
    detail: "Use Review Uploads for review work; this card only highlights queue pressure.",
    source: "workbench"
  },
  {
    id: "admin-request-resolved",
    roleFit: ["DAM Admin"],
    category: "requests",
    statusGroup: "completed",
    title: "Request resolved",
    reason: "Spring Outreach request was answered with review-safe guidance.",
    related: "Request REQ-1018",
    status: "Request resolved",
    age: "Yesterday",
    priority: "Normal",
    owner: "Media team",
    actionLabel: "Open Requests",
    href: "/requests",
    detailLabel: "Resolution details",
    detail: "Resolved means request thread closed, not approval or delivery.",
    source: "workbench"
  }
];

const loadingContributorContext: LocalContributorContext = {
  status: "loading",
  receipts: [],
  hasDraft: false
};

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeBrowserReceipt(value: unknown): BrowserUploadReceipt | null {
  const raw = (value || {}) as Partial<BrowserUploadReceipt>;
  const id = safeText(raw.id);
  const batchName = safeText(raw.batchName);
  if (!id || !batchName) return null;
  return {
    id,
    batchName,
    mediaType: safeText(raw.mediaType, "Media"),
    fileCount: Math.max(0, Math.trunc(Number(raw.fileCount) || 0)),
    status: safeText(raw.status, "Submitted"),
    date: safeText(raw.date, "Recently"),
    reviewStatus: safeText(raw.reviewStatus),
    reviewerNote: safeText(raw.reviewerNote)
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
  const draftValue = storage.getItem(uploadDraftKey);
  const rawReceipts = parseJsonOrFallback(receiptValue, []);
  const receipts = Array.isArray(rawReceipts) ? rawReceipts.map(normalizeBrowserReceipt).filter((item): item is BrowserUploadReceipt => Boolean(item)) : [];
  const parsedDraft = parseJsonOrFallback(draftValue, {});
  const rawDraft = parsedDraft && typeof parsedDraft === "object" && !Array.isArray(parsedDraft) ? parsedDraft as Record<string, unknown> : {};
  const draftLabel = safeText(rawDraft.batchName) || safeText(rawDraft.eventName) || "Upload draft";
  const hasDraft = Object.values(rawDraft).some((value) => typeof value === "string" && value.trim().length > 0);
  return {
    status: "ready",
    receipts,
    hasDraft,
    draftLabel: hasDraft ? draftLabel : undefined
  };
}

function readContributorContext(): LocalContributorContext {
  try {
    return readContributorContextFromStorage(window.localStorage);
  } catch {
    return { status: "blocked", receipts: [], hasDraft: false };
  }
}

function safeContributorQuestionDetail(note: string | undefined) {
  if (!note) return "Reviewer needs more event or rights context before review can continue.";
  if (/(ResourceSpace|Support Zone|Source Status|source|writeback|backend|sync|publish|published|download|downloadable|approved|approval|Production-ready|Public now|durable account history)/i.test(note)) {
    return "Reviewer needs more event or rights context before review can continue.";
  }
  return note;
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

export function buildContributorBrowserTasks(context: LocalContributorContext): MyWorkTask[] {
  if (context.status !== "ready") return [];
  const receiptTasks = context.receipts.map(browserTaskFromReceipt);
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
  return [...draftTask, ...receiptTasks];
}

export function getMyWorkTasks(role: DemoRole, context: LocalContributorContext = { status: "ready", receipts: [], hasDraft: false }) {
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
    return ["Review completed", "Rights check needed", "Waiting on contributor", "Request response needed"];
  }
  return ["Review completed", "Request resolved", "Admin check needed", "Support check needed"];
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
              </section>
            ) : sourceStatusUnavailable ? (
              <section className="mw-state-card is-warning" role="status">
                <AlertCircle size={22} aria-hidden="true" />
                <h3>Source status unavailable</h3>
                <p>Reviewer/admin source diagnostics are unavailable. Work decisions stay inside Review Uploads and Admin.</p>
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
                {role === "Viewer" ? <Link href={routeWithRole("/requests", role)}>Open Requests</Link> : null}
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
