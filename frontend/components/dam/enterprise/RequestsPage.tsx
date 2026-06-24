"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileLock2,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { PageHeader } from "./EnterpriseShared";
import { cn } from "@/lib/utils";
import type { DemoRole } from "@/lib/types";

type RequestStatus = "Waiting on me" | "Assigned" | "Blocked" | "Resolved";

type RequestRow = {
  id: string;
  type: RequestType;
  relatedAsset: string;
  requestedBy: string;
  status: RequestStatus;
  blocker: string;
  assignedTo: string;
  updated: string;
  requiredEvidence: string[];
  timeline: string[];
  nextAction: string;
  roleFit: DemoRole[];
  resourceSpaceId?: string;
  linkedIntakeBatchId?: string;
  linkedPendingWriteId?: string;
};

type RequestType = "Source access" | "Rights issue" | "Derivative request" | "DAM review" | "Upload intake";

type RequestApiResponse = {
  requests?: Array<Omit<RequestRow, "updated"> & { updatedAt?: string; createdAt?: string }>;
  count?: number;
  error?: string;
};

const requestTabs = [
  "My requests",
  "Team queue",
  "Source access",
  "Rights issues",
  "Derivative requests",
  "DAM review"
];

const actionButtons = [
  { label: "Request source access", type: "Source access", icon: FileLock2, roles: ["Viewer", "Contributor", "Reviewer", "DAM Admin"] satisfies DemoRole[] },
  { label: "Report rights issue", type: "Rights issue", icon: ShieldAlert, roles: ["Viewer", "Contributor", "Reviewer", "DAM Admin"] satisfies DemoRole[] },
  { label: "Request DAM review", type: "DAM review", icon: FileCheck2, roles: ["Contributor", "Reviewer", "DAM Admin"] satisfies DemoRole[] },
  { label: "Request reviewed derivative", type: "Derivative request", icon: Download, roles: ["Contributor", "Reviewer", "DAM Admin"] satisfies DemoRole[] }
];

const roleRequestGuidance: Record<DemoRole, string> = {
  Viewer: "Viewer requests capture need and context only. Media team approval still required.",
  Contributor: "Contributor requests attach upload/context evidence before reviewer decisions.",
  Reviewer: "Reviewer queue emphasizes evidence review, blockers, and pending decisions.",
  "DAM Admin": "Admin view spans all request lanes for triage; source custody still stays in DAM."
};

function statusClass(status: RequestStatus) {
  if (status === "Resolved") return "is-ready";
  if (status === "Blocked") return "is-blocked";
  if (status === "Waiting on me") return "is-waiting";
  return "is-assigned";
}

function displayRequestDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function RequestsPage() {
  const { role } = useDemoRole();
  const [activeTab, setActiveTab] = useState("My requests");
  const [requestRows, setRequestRows] = useState<RequestRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const visibleTabs = useMemo(() => {
    if (role === "Viewer") return ["My requests", "Source access", "Rights issues"];
    if (role === "Contributor") return ["My requests", "Source access", "Derivative requests", "DAM review"];
    return requestTabs;
  }, [role]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/requests?role=${encodeURIComponent(role)}`, {
      headers: { Accept: "application/json", "x-tjc-local-beta-role": role }
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({ error: `Requests failed with ${response.status}` })) as RequestApiResponse;
        if (!response.ok) throw new Error(payload.error || `Requests failed with ${response.status}`);
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        const rows = (payload.requests || []).map((row) => ({
          ...row,
          updated: displayRequestDate(row.updatedAt || row.createdAt)
        }));
        setRequestRows(rows);
        setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id || "");
      })
      .catch((requestError: Error) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, refreshKey]);
  const activeVisibleTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0];
  const filteredRows = useMemo(() => {
    const serverScopedRows = role === "Reviewer" || role === "DAM Admin"
      ? requestRows.filter((row) => row.roleFit.includes(role))
      : requestRows;
    if (activeVisibleTab === "My requests") return serverScopedRows;
    if (activeVisibleTab === "Team queue") return role === "Reviewer" || role === "DAM Admin" ? serverScopedRows : [];
    const roleRows = serverScopedRows;
    if (activeVisibleTab === "Source access") return roleRows.filter((row) => row.type === "Source access");
    if (activeVisibleTab === "Rights issues") return roleRows.filter((row) => row.type === "Rights issue");
    if (activeVisibleTab === "Derivative requests") return roleRows.filter((row) => row.type === "Derivative request");
    return roleRows.filter((row) => row.type === "DAM review" || row.type === "Upload intake");
  }, [activeVisibleTab, requestRows, role]);
  const selected = filteredRows.find((row) => row.id === selectedId) || filteredRows[0] || requestRows.find((row) => role === "Reviewer" || role === "DAM Admin" ? row.roleFit.includes(role) : true);
  const visibleActions = actionButtons.filter((action) => action.roles.includes(role));
  const canSeeInternalIds = role === "Reviewer" || role === "DAM Admin";
  const requestKpis = useMemo(() => {
    const open = requestRows.filter((row) => row.status !== "Resolved");
    const waiting = requestRows.filter((row) => row.status === "Waiting on me");
    const blocked = requestRows.filter((row) => row.status === "Blocked");
    const resolved = requestRows.filter((row) => row.status === "Resolved");
    return [
      { label: "Open requests", value: String(open.length), detail: "Source access, review, derivative, and intake records" },
      { label: "Waiting on me", value: String(waiting.length), detail: "Needs evidence, scope, or requester reply" },
      { label: "Blocked", value: String(blocked.length), detail: "Rights, people, or reviewed derivative evidence missing" },
      { label: "Resolved", value: String(resolved.length), detail: "Closed with reviewer notes and scope recorded" }
    ];
  }, [requestRows]);
  const createDraftRequest = async (type: RequestType, label: string) => {
    setMessage("");
    const response = await fetch(`/api/requests?role=${encodeURIComponent(role)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "x-tjc-local-beta-role": role },
      body: JSON.stringify({
        type,
        relatedAsset: `${type} request`,
        blocker: "Requester context needed",
        nextAction: "Add request context and evidence"
      })
    });
    const payload = await response.json().catch(() => ({ error: `Request failed with ${response.status}` }));
    if (!response.ok) {
      setMessage(payload.error || `${label} could not be recorded.`);
      return;
    }
    setMessage(`${label} recorded for ${role}. No email, approval, download, public link, or source access was granted.`);
    setRefreshKey((key) => key + 1);
  };

  return (
    <div className="enterprise-page enterprise-requests route-identity-page" data-route-identity="requests">
      <PageHeader
        title="Requests"
        subtitle={roleRequestGuidance[role]}
      />

      <section className="ed-route-actions" aria-label="Request actions">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              key={action.label}
              onClick={() => void createDraftRequest(action.type as RequestType, action.label)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </section>
      {message ? <p className="ed-inline-success">{message}</p> : null}
      {error ? <p className="ed-inline-success is-warning">{error}</p> : null}

      <section className="ed-route-kpis" aria-label="Request status summary">
        {requestKpis.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <nav className="ed-route-tabs" aria-label="Request queue tabs">
        {visibleTabs.map((tab) => (
          <button type="button" key={tab} className={tab === activeVisibleTab ? "is-active" : undefined} onClick={() => setActiveTab(tab)} aria-pressed={tab === activeVisibleTab}>
            {tab}
          </button>
        ))}
      </nav>

      <div className="ed-route-workspace">
        <main className="ed-route-main" data-primary-section="requests-table">
          <header className="ed-section-heading">
            <div>
              <h2>{activeVisibleTab}</h2>
              <p>Requests are operational records from local runtime storage. They do not approve public use, grant source access, or create delivery rights by themselves.</p>
            </div>
            <span>{loading ? "Loading" : `${filteredRows.length} visible`}</span>
          </header>
          {filteredRows.length ? <div className="ed-route-table-wrap">
            <table className="ed-table ed-route-table" aria-label="Requests operations table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Related asset</th>
                  <th>Requested by</th>
                  <th>Status</th>
                  <th>Blocker</th>
                  <th>Assigned to</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className={row.id === selected.id ? "is-active" : undefined}>
                    <td data-label="Request ID"><strong>{row.id}</strong></td>
                    <td data-label="Action"><button className="ed-row-open" type="button" onClick={() => setSelectedId(row.id)}>Open</button></td>
                    <td data-label="Type">{row.type}</td>
                    <td data-label="Related asset">{row.relatedAsset}</td>
                    <td data-label="Requested by">{row.requestedBy}</td>
                    <td data-label="Status"><span className={cn("ed-route-status", statusClass(row.status))}>{row.status}</span></td>
                    <td data-label="Blocker">{row.blocker}</td>
                    <td data-label="Assigned to">{row.assignedTo}</td>
                    <td data-label="Updated">{row.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : (
            <section className="ed-empty-state is-quiet">
              <MessageSquareText size={24} aria-hidden="true" />
              <h2>No {activeVisibleTab.toLowerCase()} for {role}</h2>
              <p>{loading ? "Loading request records..." : "Queue is clear in this role view. Create a draft request to capture need; it still will not approve public use or grant file access."}</p>
            </section>
          )}
        </main>

        {selected ? <aside className="ed-route-inspector" aria-label="Request inspector">
          <header>
            <MessageSquareText size={18} aria-hidden="true" />
            <div>
              <h2>Request summary</h2>
              <p>{selected.id} · {selected.type}</p>
            </div>
          </header>
          <dl className="ed-route-facts">
            <div><dt>Related asset</dt><dd>{selected.relatedAsset}</dd></div>
            <div><dt>Assigned to</dt><dd>{selected.assignedTo}</dd></div>
            <div><dt>Updated</dt><dd>{selected.updated}</dd></div>
            {canSeeInternalIds && selected.resourceSpaceId ? <div><dt>ResourceSpace ID</dt><dd>{selected.resourceSpaceId}</dd></div> : null}
            {canSeeInternalIds && selected.linkedPendingWriteId ? <div><dt>Pending handoff ID</dt><dd>{selected.linkedPendingWriteId}</dd></div> : null}
            {canSeeInternalIds && selected.linkedIntakeBatchId ? <div><dt>Intake handoff ID</dt><dd>{selected.linkedIntakeBatchId}</dd></div> : null}
          </dl>
          <section>
            <h3>Required evidence</h3>
            <ul>
              {selected.requiredEvidence.map((item) => <li key={item}><ShieldCheck size={14} aria-hidden="true" />{item}</li>)}
            </ul>
          </section>
          <section>
            <h3>Status timeline</h3>
            <ol>
              {selected.timeline.map((item) => <li key={item}><Clock3 size={14} aria-hidden="true" />{item}</li>)}
            </ol>
          </section>
          <section>
            <h3>Next safe action</h3>
            <p>{selected.nextAction}</p>
          </section>
          <p className="ed-route-safety-note"><AlertTriangle size={14} aria-hidden="true" />Requests queue work. Approval, delivery rights, and source access stay gated until evidence is reviewed.</p>
        </aside> : (
          <aside className="ed-route-inspector" aria-label="Request inspector">
            <header>
              <MessageSquareText size={18} aria-hidden="true" />
              <div>
                <h2>Request summary</h2>
                <p>No request selected</p>
              </div>
            </header>
            <p className="ed-route-safety-note"><AlertTriangle size={14} aria-hidden="true" />Requests queue work. Approval, delivery rights, and source access stay gated until evidence is reviewed.</p>
          </aside>
        )}
      </div>
    </div>
  );
}
