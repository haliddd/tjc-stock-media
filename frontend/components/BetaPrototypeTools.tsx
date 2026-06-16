"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bug, CheckCircle2, ChevronDown, ExternalLink, FileText, PanelRightOpen, Send, ShieldAlert, X } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { normalizeRole } from "@/lib/permissions";
import type { BetaFeedbackSeverity, DemoRole } from "@/lib/types";

const betaTaskModeEnabled = process.env.NEXT_PUBLIC_BETA_TASK_MODE_ENABLED === "1";
const betaFeedbackEnabled = process.env.NEXT_PUBLIC_BETA_FEEDBACK_ENABLED === "1";

type BetaMission = {
  label: string;
  detail: string;
};

const missions: Record<DemoRole, BetaMission[]> = {
  Viewer: [
    { label: "Find Bible media", detail: "Search library for Bible or worship media and open one candidate." },
    { label: "Check reuse permission", detail: "Inspect blockers, reviewer/date, rights, and approved-copy state." },
    { label: "Try unsafe download", detail: "Confirm blocked media stays gated and request review instead." }
  ],
  Contributor: [
    { label: "Submit harmless intake", detail: "Use a safe test image/link and complete intake metadata." },
    { label: "Trigger missing context", detail: "Leave one required review field blank and confirm validation explains it." },
    { label: "Queue reviewer handoff", detail: "Submit complete intake and confirm it stays Needs Review / Do Not Publish." }
  ],
  Reviewer: [
    { label: "Try approve without evidence", detail: "Confirm approval stays disabled until evidence and note are complete." },
    { label: "Queue valid decision", detail: "Complete checklist, add note, and queue a pending review write." },
    { label: "Inspect ResourceSpace truth", detail: "Verify copy says queued portal write is not final ResourceSpace success." }
  ],
  "DAM Admin": [
    { label: "Inspect blockers", detail: "Open readiness, rights policies, and review sync status." },
    { label: "Review feedback inbox", detail: "Triage teammate reports into agent-ready backlog." },
    { label: "Export issue JSON", detail: "Download current feedback for next-agent implementation." }
  ]
};

const routeLinks = [
  { href: "/", label: "Library" },
  { href: "/upload", label: "Upload" },
  { href: "/review", label: "Review" },
  { href: "/admin", label: "Admin" },
  { href: "/guide", label: "Guide" }
];

const severityOptions: BetaFeedbackSeverity[] = ["low", "medium", "high", "critical"];

function betaHref(href: string, role: DemoRole, betaLocked: boolean) {
  if (betaLocked) return `${href}?taskMode=1`;
  return `${href}?role=${encodeURIComponent(role)}&taskMode=1`;
}

function storageKey(role: DemoRole) {
  return `tjc-beta-missions:${role}`;
}

export function BetaPrototypeTools() {
  const { role, setRole, ready, betaLocked } = useDemoRole();
  const [taskMode, setTaskMode] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [task, setTask] = useState("");
  const [severity, setSeverity] = useState<BetaFeedbackSeverity>("medium");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [screenshotLink, setScreenshotLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [route, setRoute] = useState("/");
  const activeMissions = missions[role];
  const completedMissionCount = activeMissions.filter((item) => checked[item.label]).length;
  const missionProgress = activeMissions.length ? Math.round((completedMissionCount / activeMissions.length) * 100) : 0;

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    setRoute(`${window.location.pathname}${window.location.search}`);
    const queryRole = params.get("role");
    if (queryRole && !betaLocked) {
      const normalized = normalizeRole(queryRole);
      if (normalized !== role) setRole(normalized);
    }
    const queryTaskMode = params.get("taskMode");
    if (queryTaskMode === "1") {
      window.localStorage.setItem("tjc-beta-task-mode", "1");
      setTaskMode(true);
    } else if (queryTaskMode === "0") {
      window.localStorage.setItem("tjc-beta-task-mode", "0");
      setTaskMode(false);
    } else {
      setTaskMode(window.localStorage.getItem("tjc-beta-task-mode") === "1");
    }
  }, [ready, role, setRole, betaLocked]);

  useEffect(() => {
    if (!ready) return;
    const raw = window.localStorage.getItem(storageKey(role));
    setChecked(raw ? JSON.parse(raw) as Record<string, boolean> : {});
    setTask(missions[role][0]?.label || "");
  }, [ready, role]);

  function toggleTaskMode() {
    setTaskMode((current) => {
      const next = !current;
      window.localStorage.setItem("tjc-beta-task-mode", next ? "1" : "0");
      return next;
    });
  }

  function toggleMission(label: string) {
    setChecked((current) => {
      const next = { ...current, [label]: !current[label] };
      window.localStorage.setItem(storageKey(role), JSON.stringify(next));
      return next;
    });
  }

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData();
    form.set("role", role);
    form.set("route", route);
    form.set("task", task || "Free play");
    form.set("severity", severity);
    form.set("expected", expected);
    form.set("actual", actual);
    form.set("reporterName", reporterName);
    form.set("screenshotLink", screenshotLink);
    form.set("browser", navigator.userAgent);
    form.set("device", navigator.platform || "unknown");
    form.set("viewport", `${window.innerWidth}x${window.innerHeight}`);
    const response = await fetch("/api/beta-feedback", { method: "POST", body: form });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setMessage(payload.error || "Feedback failed.");
      return;
    }
    setMessage(`Saved report ${payload.id}.`);
    setExpected("");
    setActual("");
    setScreenshotLink("");
  }

  if (!betaTaskModeEnabled && !betaFeedbackEnabled) return null;

  return (
    <>
      {betaTaskModeEnabled ? (
        <aside className={`beta-task-panel ${taskMode ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`} aria-label="Beta task mode">
          <button className="beta-task-toggle" type="button" onClick={toggleTaskMode}>
            <PanelRightOpen size={16} />
            {taskMode ? "Task mode on" : "Task mode"}
          </button>
          {taskMode ? (
            <div className="beta-task-body">
              <header>
                <div>
                  <span>Internal beta</span>
                  <h2>{role} missions</h2>
                </div>
                <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand beta tasks" : "Collapse beta tasks"}>
                  <ChevronDown size={16} />
                </button>
              </header>
              {!collapsed ? (
                <>
                  <section className="beta-limit-panel" aria-label="Beta limits">
                    <ShieldAlert size={18} />
                    <p>Beta testing only. No sensitive media. Role switch is simulated QA access; not production auth, not SSO, not real user impersonation, and not permission delegation. No live ResourceSpace writeback. Queued review is not ResourceSpace success. Stop testing for Critical/P0 privacy, source-truth, or download-gate issues.</p>
                  </section>
                  <section className="beta-progress-panel" aria-label="Mission progress">
                    <div>
                      <strong>{completedMissionCount}/{activeMissions.length}</strong>
                      <span>{role} mission progress</span>
                    </div>
                    <progress value={completedMissionCount} max={activeMissions.length} aria-label={`${missionProgress}% complete`} />
                  </section>
                  <div className="beta-mission-list">
                    {activeMissions.map((item) => (
                      <label key={item.label} className={checked[item.label] ? "is-done" : ""}>
                        <input type="checkbox" checked={Boolean(checked[item.label])} onChange={() => toggleMission(item.label)} />
                        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                      </label>
                    ))}
                  </div>
                  <nav className="beta-quick-links" aria-label="Beta quick links">
                    {routeLinks.map((item) => <Link href={betaHref(item.href, role, betaLocked)} key={item.href}>{item.label}</Link>)}
                  </nav>
                </>
              ) : null}
            </div>
          ) : null}
        </aside>
      ) : null}

      {betaFeedbackEnabled ? (
        <button className="beta-report-button" type="button" onClick={() => setReportOpen(true)}>
          <Bug size={16} />
          Report issue
        </button>
      ) : null}

      {reportOpen ? (
        <div className="beta-report-modal" role="dialog" aria-modal="true" aria-labelledby="beta-report-title">
          <div className="beta-report-card">
            <header>
              <div>
                <span>Teammate feedback</span>
                <h2 id="beta-report-title">Report issue</h2>
              </div>
              <button type="button" onClick={() => setReportOpen(false)} aria-label="Close report issue">
                <X size={18} />
              </button>
            </header>
            <form onSubmit={submitFeedback}>
              <div className="beta-report-meta">
                <p><strong>Role</strong>{role}</p>
                <p><strong>Route</strong>{route}</p>
              </div>
              <label>Task<select value={task} onChange={(event) => setTask(event.target.value)}>{missions[role].map((item) => <option key={item.label}>{item.label}</option>)}<option>Free play</option></select></label>
              <label>Severity<select value={severity} onChange={(event) => setSeverity(event.target.value as BetaFeedbackSeverity)}>{severityOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>Expected<textarea required value={expected} onChange={(event) => setExpected(event.target.value)} placeholder="What should have happened?" /></label>
              <label>Actual<textarea required value={actual} onChange={(event) => setActual(event.target.value)} placeholder="What happened instead?" /></label>
              <label>Name optional<input value={reporterName} onChange={(event) => setReporterName(event.target.value)} placeholder="Your name" /></label>
              <label>Redacted screenshot or link optional<input value={screenshotLink} onChange={(event) => setScreenshotLink(event.target.value)} placeholder="Paste a redacted screenshot, Loom, or note link" /></label>
              <section className="beta-report-safety"><AlertTriangle size={16} /><span>No people, minors, source paths, private URLs, or sensitive media in reports. File attachments are disabled for this beta.</span></section>
              {message ? <p className={message.startsWith("Saved") ? "beta-report-success" : "beta-report-error"}>{message.startsWith("Saved") ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{message}</p> : null}
              <footer>
                <button type="button" onClick={() => setReportOpen(false)}>Close</button>
                <button type="submit" disabled={submitting}><Send size={15} />{submitting ? "Saving..." : "Submit"}</button>
              </footer>
            </form>
            <Link className="beta-report-guide" href="/guide?taskMode=1"><FileText size={15} />Open test guide <ExternalLink size={13} /></Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
