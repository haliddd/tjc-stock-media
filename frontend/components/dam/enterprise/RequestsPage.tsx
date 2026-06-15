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
import { PageHeader } from "./EnterpriseShared";
import { cn } from "@/lib/utils";

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
};

const requestKpis = [
  { label: "Open requests", value: "18", detail: "Across source access, review, and unlock work" },
  { label: "Waiting on me", value: "5", detail: "Needs evidence, scope, or requester reply" },
  { label: "Blocked", value: "4", detail: "Rights, people, or approved derivative missing" },
  { label: "Resolved this week", value: "11", detail: "Closed with reviewer notes and scope recorded" }
];

const requestTabs = [
  "My requests",
  "Team queue",
  "Source access",
  "Rights issues",
  "Download unlocks",
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
    nextAction: "Add ministry use scope"
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
    nextAction: "Resolve people/minors evidence"
  },
  {
    id: "REQ-1031",
    type: "Download unlock",
    relatedAsset: "Choir Practice Wide Shot",
    requestedBy: "Communications",
    status: "Assigned",
    blocker: "Approved derivative missing",
    assignedTo: "Derivative queue",
    updated: "Yesterday 4:18 PM",
    requiredEvidence: ["Approved copy request", "Usage scope", "Reviewer date"],
    timeline: ["Unlock requested", "Approved copy gap found", "Derivative work queued"],
    nextAction: "Create approved derivative"
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
    nextAction: "Complete rights review"
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
    nextAction: "No action needed"
  }
];

const actionButtons = [
  { label: "Request source access", icon: FileLock2 },
  { label: "Report rights issue", icon: ShieldAlert },
  { label: "Request DAM review", icon: FileCheck2 },
  { label: "Request approved derivative", icon: Download }
];

function statusClass(status: RequestStatus) {
  if (status === "Resolved") return "is-ready";
  if (status === "Blocked") return "is-blocked";
  if (status === "Waiting on me") return "is-waiting";
  return "is-assigned";
}

export function RequestsPage() {
  const [activeTab, setActiveTab] = useState("My requests");
  const [selectedId, setSelectedId] = useState(requestRows[0].id);
  const [message, setMessage] = useState("");
  const filteredRows = useMemo(() => {
    if (activeTab === "My requests") return requestRows.filter((row) => row.requestedBy === "Leanne Chu" || row.status === "Waiting on me");
    if (activeTab === "Team queue") return requestRows;
    if (activeTab === "Source access") return requestRows.filter((row) => row.type === "Source access");
    if (activeTab === "Rights issues") return requestRows.filter((row) => row.type === "Rights issue");
    if (activeTab === "Download unlocks") return requestRows.filter((row) => row.type === "Download unlock");
    return requestRows.filter((row) => row.type === "DAM review" || row.type === "Upload intake");
  }, [activeTab]);
  const selected = requestRows.find((row) => row.id === selectedId) || filteredRows[0] || requestRows[0];

  return (
    <div className="enterprise-page enterprise-requests route-identity-page" data-route-identity="requests">
      <PageHeader
        title="Requests"
        subtitle="Track source access, rights issues, download unlocks, and DAM review requests."
      />

      <section className="ed-route-actions" aria-label="Request actions">
        {actionButtons.map((action) => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              key={action.label}
              onClick={() => setMessage(`${action.label} draft opened. No email, approval, download, or source access was granted.`)}
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
        {requestTabs.map((tab) => (
          <button type="button" key={tab} className={tab === activeTab ? "is-active" : undefined} onClick={() => setActiveTab(tab)} aria-pressed={tab === activeTab}>
            {tab}
          </button>
        ))}
      </nav>

      <div className="ed-route-workspace">
        <main className="ed-route-main" data-primary-section="requests-table">
          <header className="ed-section-heading">
            <div>
              <h2>{activeTab}</h2>
              <p>Requests are operational records. They do not approve public use, grant source access, or unlock downloads by themselves.</p>
            </div>
            <span>{filteredRows.length} visible</span>
          </header>
          <div className="ed-route-table-wrap">
            <table className="ed-table ed-route-table" aria-label="Requests operations table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Type</th>
                  <th>Related asset</th>
                  <th>Requested by</th>
                  <th>Status</th>
                  <th>Blocker</th>
                  <th>Assigned to</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className={row.id === selected.id ? "is-active" : undefined}>
                    <td><strong>{row.id}</strong></td>
                    <td>{row.type}</td>
                    <td>{row.relatedAsset}</td>
                    <td>{row.requestedBy}</td>
                    <td><span className={cn("ed-route-status", statusClass(row.status))}>{row.status}</span></td>
                    <td>{row.blocker}</td>
                    <td>{row.assignedTo}</td>
                    <td>{row.updated}</td>
                    <td><button className="ed-row-open" type="button" onClick={() => setSelectedId(row.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <p className="ed-route-safety-note"><AlertTriangle size={14} aria-hidden="true" />Requests queue work. Approval, download, and source access stay gated until evidence is reviewed.</p>
        </aside>
      </div>
    </div>
  );
}
