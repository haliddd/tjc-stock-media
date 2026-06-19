"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileLock2,
  MessageSquareText,
  Search,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  type LucideIcon
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { PageHeader } from "./EnterpriseShared";
import { routeWithRole } from "@/lib/role-routes";
import { cn } from "@/lib/utils";
import type { DemoRole } from "@/lib/types";

type RequestType =
  | "Find photos"
  | "Request permission"
  | "Report privacy or rights issue"
  | "Request original or high-resolution help"
  | "General media help";

type RequestStatus = "New" | "In progress" | "Waiting for info" | "Resolved" | "Closed";
type RequestPriority = "Urgent" | "High" | "Normal";

type LocalRequestReceipt = {
  id: string;
  type: RequestType;
  subject: string;
  status: "Saved" | "Draft";
  createdAt: string;
  updatedAt: string;
};

type WorkbenchRequest = {
  id: string;
  type: RequestType;
  subject: string;
  requestedBy: string;
  status: RequestStatus;
  reason: string;
  assignedTo: string;
  updated: string;
  priority: RequestPriority;
  nextAction: string;
  evidence: string[];
  timeline: string[];
  roleFit: DemoRole[];
};

type RequestStep = {
  id: RequestType;
  title: string;
  detail: string;
  action: string;
  icon: LucideIcon;
};

const localRequestsKey = "tjc-media-request-receipts-v1";
const requestDraftKey = "tjc-media-request-draft-v1";

const requestSteps: RequestStep[] = [
  { id: "Find photos", title: "Find photos", detail: "Tell us the event, date, ministry, or album.", action: "Choose", icon: Search },
  { id: "Request permission", title: "Request permission", detail: "Ask before using restricted or unclear media.", action: "Choose", icon: ShieldCheck },
  { id: "Report privacy or rights issue", title: "Report an issue", detail: "Flag privacy, consent, rights, or takedown concerns.", action: "Choose", icon: ShieldAlert },
  { id: "Request original or high-resolution help", title: "Original/high-resolution help", detail: "Ask the media team to review whether a larger file is appropriate.", action: "Choose", icon: FileLock2 },
  { id: "General media help", title: "Contact media team", detail: "Ask a question or route a media follow-up.", action: "Choose", icon: MessageSquareText }
];

const workbenchRequests: WorkbenchRequest[] = [
  {
    id: "REQ-1024",
    type: "Request original or high-resolution help",
    subject: "Bible Study slide background",
    requestedBy: "Communications",
    status: "Waiting for info",
    reason: "Use scope and contact details still needed.",
    assignedTo: "Media reviewer",
    updated: "Today",
    priority: "High",
    nextAction: "Ask requester for use scope before review continues.",
    evidence: ["Use scope", "Deadline", "Contact person"],
    timeline: ["Request opened", "Assigned to reviewer", "Waiting for requester"],
    roleFit: ["Reviewer", "DAM Admin"]
  },
  {
    id: "REQ-1027",
    type: "Report privacy or rights issue",
    subject: "Fellowship Lunch photos",
    requestedBy: "Youth ministry",
    status: "New",
    reason: "People/minors status needs review.",
    assignedTo: "Rights reviewer",
    updated: "Today",
    priority: "Urgent",
    nextAction: "Review privacy concern before any reuse guidance changes.",
    evidence: ["Visible people review", "Organizer confirmation", "Usage scope"],
    timeline: ["Issue reported", "Distribution paused for review"],
    roleFit: ["Reviewer", "DAM Admin"]
  },
  {
    id: "REQ-1031",
    type: "Request permission",
    subject: "Choir Practice wide shot",
    requestedBy: "Internet ministry",
    status: "In progress",
    reason: "Permission request needs reviewer note.",
    assignedTo: "Reviewer team",
    updated: "Yesterday",
    priority: "High",
    nextAction: "Open Review Uploads and record next reviewer note.",
    evidence: ["Requested use", "Audience", "Related album"],
    timeline: ["Permission requested", "Reviewer check started"],
    roleFit: ["Reviewer", "DAM Admin"]
  },
  {
    id: "REQ-1034",
    type: "Find photos",
    subject: "Spring Outreach event",
    requestedBy: "Media desk",
    status: "Waiting for info",
    reason: "Event date range is missing.",
    assignedTo: "Media search helper",
    updated: "Yesterday",
    priority: "Normal",
    nextAction: "Ask requester for date range and ministry context.",
    evidence: ["Event date", "Ministry", "Desired use"],
    timeline: ["Find request opened", "Search terms added"],
    roleFit: ["Reviewer", "DAM Admin"]
  },
  {
    id: "REQ-1038",
    type: "General media help",
    subject: "Spring Outreach upload set",
    requestedBy: "Contributor desk",
    status: "Resolved",
    reason: "Event context added and follow-up closed.",
    assignedTo: "Intake reviewer",
    updated: "Mon",
    priority: "Normal",
    nextAction: "No action needed.",
    evidence: ["Uploader note", "Event context", "People visibility"],
    timeline: ["Help requested", "Context added", "Follow-up closed"],
    roleFit: ["Reviewer", "DAM Admin"]
  }
];

function nowLabel() {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date());
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeRequestType(value: unknown, fallback: RequestType = "General media help"): RequestType {
  return requestSteps.some((item) => item.id === value) ? value as RequestType : fallback;
}

function normalizeReceipt(value: unknown): LocalRequestReceipt | null {
  const raw = (value || {}) as Partial<LocalRequestReceipt>;
  const id = safeText(raw.id);
  const subject = safeText(raw.subject);
  if (!id || !subject) return null;
  return {
    id,
    type: safeRequestType(raw.type),
    subject,
    status: raw.status === "Draft" ? "Draft" : "Saved",
    createdAt: safeText(raw.createdAt, "Recent"),
    updatedAt: safeText(raw.updatedAt, "Recent")
  };
}

function readLocalRequests() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(localRequestsKey) || "[]") as unknown[];
    return Array.isArray(parsed) ? parsed.map(normalizeReceipt).filter((item): item is LocalRequestReceipt => Boolean(item)) : [];
  } catch {
    return [];
  }
}

function saveLocalRequest(receipt: LocalRequestReceipt) {
  const current = readLocalRequests();
  window.localStorage.setItem(localRequestsKey, JSON.stringify([receipt, ...current.filter((item) => item.id !== receipt.id)].slice(0, 20)));
}

function readRequestDraft() {
  try {
    const stored = window.localStorage.getItem(requestDraftKey);
    if (!stored) return null;
    const raw = JSON.parse(stored) as Record<string, unknown>;
    return {
      requestType: safeRequestType(raw.requestType, "Find photos"),
      eventContext: safeText(raw.eventContext),
      message: safeText(raw.message),
      relatedMedia: safeText(raw.relatedMedia),
      urgency: safeText(raw.urgency, "Routine"),
      contactInfo: safeText(raw.contactInfo)
    };
  } catch {
    return null;
  }
}

function statusClass(status: RequestStatus | LocalRequestReceipt["status"]) {
  if (status === "Resolved" || status === "Closed") return "is-ready";
  if (status === "New" || status === "Waiting for info" || status === "Draft" || status === "Saved") return "is-waiting";
  return "is-assigned";
}

function priorityClass(priority: RequestPriority) {
  if (priority === "Urgent") return "is-critical";
  if (priority === "High") return "is-high";
  return "is-normal";
}

function requestSubtitle(role: DemoRole) {
  if (role === "Reviewer") return "Triage media questions, permission requests, and issue reports.";
  if (role === "DAM Admin") return "Monitor support requests and admin follow-ups.";
  return "Ask for media help, request permission, or report an issue.";
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return <span>{children}{required ? " *" : ""}</span>;
}

export function RequestsPage() {
  return (
    <Suspense fallback={<div className="enterprise-page enterprise-requests request-launch route-identity-page" data-route-identity="requests"><PageHeader title="Requests" /></div>}>
      <RequestsPageContent />
    </Suspense>
  );
}

function RequestsPageContent() {
  const { role } = useDemoRole();
  const searchParams = useSearchParams();
  const prefillQuery = searchParams.toString();
  const [requestType, setRequestType] = useState<RequestType>("Find photos");
  const [eventContext, setEventContext] = useState("");
  const [message, setMessage] = useState("");
  const [relatedMedia, setRelatedMedia] = useState("");
  const [urgency, setUrgency] = useState("Routine");
  const [contactInfo, setContactInfo] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [localReceipts, setLocalReceipts] = useState<LocalRequestReceipt[]>([]);
  const [activeStatus, setActiveStatus] = useState<RequestStatus | "All">("All");
  const [selectedId, setSelectedId] = useState("");
  const canSeeWorkbench = role === "Reviewer" || role === "DAM Admin";

  useEffect(() => {
    setLocalReceipts(readLocalRequests());
    const saved = readRequestDraft();
    if (!saved) return;
    setRequestType(saved.requestType);
    setEventContext(saved.eventContext);
    setMessage(saved.message);
    setRelatedMedia(saved.relatedMedia);
    setUrgency(saved.urgency);
    setContactInfo(saved.contactInfo);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(prefillQuery);
    const typeParam = params.get("type");
    const titleParam = params.get("title");
    const mediaParam = params.get("media");
    if (typeParam && requestSteps.some((step) => step.id === typeParam)) {
      setRequestType(typeParam as RequestType);
    }
    if (titleParam || mediaParam) {
      setRelatedMedia([titleParam, mediaParam ? `Reference ${mediaParam}` : ""].filter(Boolean).join(" - "));
    }
  }, [prefillQuery]);

  const workbenchRows = useMemo(() => {
    if (!canSeeWorkbench) return [];
    const rows = workbenchRequests.filter((item) => item.roleFit.includes(role));
    return activeStatus === "All" ? rows : rows.filter((item) => item.status === activeStatus);
  }, [activeStatus, canSeeWorkbench, role]);
  const selected = workbenchRows.find((item) => item.id === selectedId) || workbenchRows[0];
  const hasLocalReceipts = localReceipts.length > 0;
  const contextValue = eventContext.trim() || relatedMedia.trim();
  const requestSummary = [
    { label: "Type", value: requestType },
    { label: "Context", value: contextValue || "Needed" },
    { label: "Related media", value: relatedMedia.trim() || "Optional" },
    { label: "Urgency", value: urgency },
    { label: "Contact", value: contactInfo.trim() || "Optional" }
  ];
  const hasRequestContext = Boolean(contextValue);

  const persistRequest = (status: "Saved" | "Draft") => {
    const subject = eventContext.trim() || relatedMedia.trim() || requestType;
    const receipt: LocalRequestReceipt = {
      id: `request-${Date.now()}`,
      type: requestType,
      subject,
      status,
      createdAt: nowLabel(),
      updatedAt: nowLabel()
    };
    try {
      saveLocalRequest(receipt);
      setLocalReceipts(readLocalRequests());
      window.localStorage.setItem(requestDraftKey, JSON.stringify({ requestType, eventContext, message, relatedMedia, urgency, contactInfo }));
      setNotice(status === "Saved" ? "Request receipt saved in this browser. Media team handoff is not connected yet." : "Saved on this device.");
      setError("");
    } catch {
      setError("We could not save this request in this browser.");
      setNotice("");
    }
  };

  const requiredMissing = !hasRequestContext || !message.trim();

  const saveRequestReceipt = () => {
    if (requiredMissing) {
      setError("Add context and a message before saving.");
      setNotice("");
      return;
    }
    persistRequest("Saved");
  };

  return (
    <div className="enterprise-page enterprise-requests request-launch route-identity-page" data-route-identity="requests">
      <PageHeader title="Requests" subtitle={requestSubtitle(role)} />

      {notice ? <p className="ed-inline-success" role="status">{notice}</p> : null}
      {error ? <p className="ed-route-safety-note" role="alert"><AlertTriangle size={14} aria-hidden="true" />{error}</p> : null}

      <main className="request-launch-grid" data-primary-section="request-workflow">
        <section className="request-workflow" aria-labelledby="request-workflow-title">
          <header>
            <span>Step 1</span>
            <h2 id="request-workflow-title">What do you need?</h2>
            <p>Choose one path. The media team will review the request before any permission or file handoff.</p>
          </header>

          <div className="request-type-grid">
            {requestSteps.map((step) => {
              const Icon = step.icon;
              const active = requestType === step.id;
              return (
                <button type="button" className={cn(active && "is-active")} key={step.id} onClick={() => { setRequestType(step.id); setError(""); }}>
                  <Icon size={19} aria-hidden="true" />
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </button>
              );
            })}
          </div>

          <section className="request-form-panel" aria-label="Describe your request">
            <header>
              <span>Step 2</span>
              <h2>Describe the need</h2>
            </header>
            <div className="request-form-grid">
              <label>
                <FieldLabel required>Context</FieldLabel>
                <input value={eventContext} onChange={(event) => setEventContext(event.target.value)} placeholder="Event, date, ministry, album, or media reference" />
              </label>
              <label>
                <FieldLabel>Related media</FieldLabel>
                <input value={relatedMedia} onChange={(event) => setRelatedMedia(event.target.value)} placeholder="Photo title, album, link, or upload name" />
              </label>
              <label className="is-wide">
                <FieldLabel required>Message</FieldLabel>
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What are you looking for, what permission do you need, or what should be reviewed?" />
              </label>
              <label>
                <FieldLabel>Timing</FieldLabel>
                <select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
                  <option>Routine</option>
                  <option>This week</option>
                  <option>Urgent privacy or rights issue</option>
                </select>
              </label>
              <label>
                <FieldLabel>Contact</FieldLabel>
                <input value={contactInfo} onChange={(event) => setContactInfo(event.target.value)} placeholder="Name or ministry contact" />
              </label>
            </div>
          </section>

          <section className="request-review-panel" aria-label="Review request before sending">
            <header>
              <span>Step 3</span>
              <h2>Review and save</h2>
            </header>
            <dl>
              {requestSummary.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
            </dl>
            <p><ShieldCheck size={14} aria-hidden="true" />Requests do not approve media for use. A reviewer may ask for more information.</p>
            <div className="request-actions">
              <button type="button" className="is-primary" onClick={saveRequestReceipt}>Save request receipt</button>
              <button type="button" onClick={() => persistRequest("Draft")}>Save for later</button>
            </div>
          </section>
        </section>

        <aside className="request-side-panel" aria-label="Request status">
          <section>
            <h2>What happens next</h2>
            <ul>
              <li><CheckCircle2 size={14} aria-hidden="true" />Media team reviews the request.</li>
              <li><Clock3 size={14} aria-hidden="true" />Permission and file handoff stay gated.</li>
              <li><MessageSquareText size={14} aria-hidden="true" />You may be asked for details.</li>
            </ul>
          </section>

          <section>
            <h2>Saved in this browser</h2>
            {hasLocalReceipts ? (
              <div className="request-local-list">
                {localReceipts.slice(0, 4).map((receipt) => (
                  <article key={receipt.id}>
                    <strong>{receipt.subject}</strong>
                    <span>{receipt.type}</span>
                    <small className={cn("ed-route-status", statusClass(receipt.status))}>{receipt.status}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p>No requests saved in this browser.</p>
            )}
          </section>

          <section>
            <h2>Quick links</h2>
            <div className="request-quick-links">
              <Link href={routeWithRole("/library", role)}>Find media</Link>
              {role !== "Viewer" ? <Link href={routeWithRole("/upload", role)}>Upload Photos</Link> : null}
              <Link href={routeWithRole("/help", role)}>Help Center</Link>
            </div>
          </section>
        </aside>
      </main>

      {canSeeWorkbench ? (
        <section className="request-workbench" aria-labelledby="request-workbench-title">
          <header>
            <div>
              <span>Reviewer/admin workbench</span>
              <h2 id="request-workbench-title">Request follow-ups</h2>
              <p>Example workbench rows route reviewers to real workflows. They do not create approval, delivery, publishing, or sync outcomes.</p>
            </div>
            <nav aria-label="Request status filter">
              {(["All", "New", "In progress", "Waiting for info", "Resolved", "Closed"] as const).map((status) => (
                <button type="button" className={activeStatus === status ? "is-active" : undefined} key={status} onClick={() => setActiveStatus(status)}>
                  {status}
                </button>
              ))}
            </nav>
          </header>
          <div className="request-workbench-grid">
            <div className="request-workbench-list" role="list">
              {workbenchRows.length ? workbenchRows.map((row) => (
                <button type="button" className={cn(selected?.id === row.id && "is-active")} key={row.id} onClick={() => setSelectedId(row.id)}>
                  <span className={cn("ed-priority-pill", priorityClass(row.priority))}>{row.priority}</span>
                  <strong>{row.subject}</strong>
                  <small>{row.id} · {row.type}</small>
                  <em className={cn("ed-route-status", statusClass(row.status))}>{row.status}</em>
                </button>
              )) : (
                <section className="ed-empty-state is-quiet">
                  <MessageSquareText size={22} aria-hidden="true" />
                  <h3>No requests in this status</h3>
                  <p>Change the filter or wait for new requests.</p>
                </section>
              )}
            </div>
            {selected ? (
              <aside className="request-inspector" aria-label="Selected request details">
                <h3>{selected.subject}</h3>
                <p>{selected.reason}</p>
                <dl>
                  <div><dt>Requested by</dt><dd>{selected.requestedBy}</dd></div>
                  <div><dt>Assigned to</dt><dd>{selected.assignedTo}</dd></div>
                  <div><dt>Updated</dt><dd>{selected.updated}</dd></div>
                </dl>
                <section>
                  <h4>Needed next</h4>
                  <p>{selected.nextAction}</p>
                </section>
                <section>
                  <h4>Evidence</h4>
                  <ul>{selected.evidence.map((item) => <li key={item}><FileCheck2 size={14} aria-hidden="true" />{item}</li>)}</ul>
                </section>
                <section>
                  <h4>Timeline</h4>
                  <ol>{selected.timeline.map((item) => <li key={item}><Clock3 size={14} aria-hidden="true" />{item}</li>)}</ol>
                </section>
              </aside>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
