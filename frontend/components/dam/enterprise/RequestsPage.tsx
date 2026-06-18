"use client";

import { useMemo, useState } from "react";
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
  type: string;
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
};

const requestKpis = [
  { label: "Open requests", value: "18", detail: "Across source access, review, and derivative request work" },
  { label: "Waiting on me", value: "5", detail: "Needs evidence, scope, or requester reply" },
  { label: "Blocked", value: "4", detail: "Rights, people, or reviewed derivative evidence missing" },
  { label: "Resolved this week", value: "11", detail: "Closed with reviewer notes and scope recorded" }
];

const requestTabs = [
  "My requests",
  "Team queue",
  "Source access",
  "Rights issues",
  "Derivative requests",
  "DAM review"
];

const requestRows: RequestRow[] = [
  {
    id: "REQ-1024",
    type: "Source access",
    relatedAsset: "Bible Study Slide Background",
    requestedBy: "Leanne Chu",
    status: "Waiting on me",
    blocker: "Ministry use scope needed",
    assignedTo: "Media reviewer",
    updated: "Today 10:14 AM",
    requiredEvidence: ["Intended channel", "Ministry owner approval", "Deadline"],
    timeline: ["Opened today", "Assigned to media reviewer", "Waiting on requester scope"],
    nextAction: "Add ministry use scope",
    roleFit: ["Viewer", "Contributor", "Reviewer", "DAM Admin"]
  },
  {
    id: "REQ-1027",
    type: "Rights issue",
    relatedAsset: "Fellowship Lunch Photos",
    requestedBy: "Youth ministry",
    status: "Blocked",
    blocker: "People/minors status unresolved",
    assignedTo: "Rights reviewer",
    updated: "Today 9:42 AM",
    requiredEvidence: ["Visible people review", "Guardian or organizer confirmation", "Public use decision"],
    timeline: ["Rights issue reported", "Distribution paused", "Evidence request sent"],
    nextAction: "Resolve people/minors evidence",
    roleFit: ["Reviewer", "DAM Admin"]
  },
  {
    id: "REQ-1031",
    type: "Derivative request",
    relatedAsset: "Choir Practice Wide Shot",
    requestedBy: "Communications",
    status: "Assigned",
    blocker: "Reviewed derivative evidence missing",
    assignedTo: "Derivative queue",
    updated: "Yesterday 4:18 PM",
    requiredEvidence: ["Derivative request", "Usage scope", "Reviewer date"],
    timeline: ["Derivative requested", "Reviewed copy gap found", "Derivative work queued"],
    nextAction: "Create derivative request packet",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  },
  {
    id: "REQ-1034",
    type: "DAM review",
    relatedAsset: "Sermon Series Cover Art",
    requestedBy: "Media desk",
    status: "Assigned",
    blocker: "Teaching rights check",
    assignedTo: "Reviewer team",
    updated: "Yesterday 2:03 PM",
    requiredEvidence: ["Third-party design check", "Teaching series scope", "Reviewer note"],
    timeline: ["Review requested", "Rights queue assigned", "Awaiting reviewer decision"],
    nextAction: "Complete rights review",
    roleFit: ["Reviewer", "DAM Admin"]
  },
  {
    id: "REQ-1038",
    type: "Upload intake",
    relatedAsset: "Spring Outreach Upload Set",
    requestedBy: "Contributor desk",
    status: "Resolved",
    blocker: "None",
    assignedTo: "Intake reviewer",
    updated: "Mon 11:20 AM",
    requiredEvidence: ["Uploader declaration", "Event context", "People visibility"],
    timeline: ["Upload cleanup requested", "Missing event context added", "Closed with review packet"],
    nextAction: "No action needed",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  }
];

const actionButtons = [
  { label: "Request source access", icon: FileLock2, roles: ["Viewer", "Contributor", "Reviewer", "DAM Admin"] satisfies DemoRole[] },
  { label: "Report rights issue", icon: ShieldAlert, roles: ["Viewer", "Contributor", "Reviewer", "DAM Admin"] satisfies DemoRole[] },
  { label: "Request DAM review", icon: FileCheck2, roles: ["Contributor", "Reviewer", "DAM Admin"] satisfies DemoRole[] },
  { label: "Request reviewed derivative", icon: Download, roles: ["Contributor", "Reviewer", "DAM Admin"] satisfies DemoRole[] }
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

export function RequestsPage() {
  const { role } = useDemoRole();
  const [activeTab, setActiveTab] = useState("My requests");
  const [selectedId, setSelectedId] = useState(requestRows[0].id);
  const [message, setMessage] = useState("");
  const visibleTabs = useMemo(() => {
    if (role === "Viewer") return ["My requests", "Source access", "Rights issues"];
    if (role === "Contributor") return ["My requests", "Source access", "Derivative requests", "DAM review"];
    return requestTabs;
  }, [role]);
  const activeVisibleTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0];
  const filteredRows = useMemo(() => {
    const roleRows = requestRows.filter((row) => row.roleFit.includes(role));
    if (activeVisibleTab === "My requests") return roleRows.filter((row) => row.requestedBy === "Leanne Chu" || row.status === "Waiting on me");
    if (activeVisibleTab === "Team queue") return roleRows;
    if (activeVisibleTab === "Source access") return roleRows.filter((row) => row.type === "Source access");
    if (activeVisibleTab === "Rights issues") return roleRows.filter((row) => row.type === "Rights issue");
    if (activeVisibleTab === "Derivative requests") return roleRows.filter((row) => row.type === "Derivative request");
    return roleRows.filter((row) => row.type === "DAM review" || row.type === "Upload intake");
  }, [activeVisibleTab, role]);
  const selected = filteredRows.find((row) => row.id === selectedId) || filteredRows[0] || requestRows.find((row) => row.roleFit.includes(role)) || requestRows[0];
  const visibleActions = actionButtons.filter((action) => action.roles.includes(role));

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
              onClick={() => setMessage(`${action.label} draft opened for ${role}. No email, approval, download, public link, or source access was granted.`)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </section>
      {message ? <p className="ed-inline-success">{message}</p> : null}

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
              <p>Requests are operational records. They do not approve public use, grant source access, or create delivery rights by themselves.</p>
            </div>
            <span>{filteredRows.length} visible</span>
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
              <p>Queue is clear in this role view. Create a draft request to capture need; it still will not approve public use or grant file access.</p>
            </section>
          )}
        </main>

        <aside className="ed-route-inspector" aria-label="Request inspector">
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
        </aside>
      </div>
    </div>
  );
}
