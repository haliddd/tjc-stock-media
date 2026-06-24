"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, PanelRightOpen, Send, X } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { normalizeRole } from "@/lib/permissions";
import type { BetaFeedbackSeverity, DemoRole } from "@/lib/types";

const betaTaskModeEnabled = process.env.NEXT_PUBLIC_BETA_TASK_MODE_ENABLED === "1";
const betaFeedbackEnabled = process.env.NEXT_PUBLIC_BETA_FEEDBACK_ENABLED === "1";
const betaRoleSwitchSafetyCopy = "Role switch is simulated QA access for beta testing only: not production auth, not SSO, not real user impersonation, and not permission delegation.";

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
    { label: "Queue reviewer handoff", detail: "Submit complete intake and confirm it stays submitted, unpublished, and gated for reviewer evidence." }
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

const severityOptions: BetaFeedbackSeverity[] = ["low", "medium", "high", "critical"];

export function BetaPrototypeTools({ variant = "floating" }: { variant?: "floating" | "inline" }) {
  const { role, setRole, ready, betaLocked } = useDemoRole();
  const [taskMode, setTaskMode] = useState(false);
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
    setTask(missions[role][0]?.label || "");
  }, [ready, role]);

  function toggleTaskMode() {
    setTaskMode((current) => {
      const next = !current;
      window.localStorage.setItem("tjc-beta-task-mode", next ? "1" : "0");
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

  if (variant === "inline") {
    return (
      <>
        {betaTaskModeEnabled ? (
          <button className={`beta-inline-tool ${taskMode ? "is-active" : ""}`} type="button" onClick={toggleTaskMode} title={taskMode ? "Task mode on" : "Task mode"}>
            <PanelRightOpen size={15} />
            <span>Task</span>
          </button>
        ) : null}
        {betaFeedbackEnabled ? (
          <button className="beta-inline-tool" type="button" onClick={() => setReportOpen(true)} title="Report issue">
            <span>Report Issues</span>
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
                <section className="beta-report-safety"><AlertTriangle size={16} /><span>{betaRoleSwitchSafetyCopy}</span></section>
                {message ? <p className={message.startsWith("Saved") ? "beta-report-success" : "beta-report-error"}>{message.startsWith("Saved") ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{message}</p> : null}
                <footer>
                  <button type="button" onClick={() => setReportOpen(false)}>Close</button>
                  <button type="submit" disabled={submitting}><Send size={15} />{submitting ? "Saving..." : "Submit"}</button>
                </footer>
              </form>
              <Link className="beta-report-guide" href="/help?taskMode=1"><FileText size={15} />Open Help Center <ExternalLink size={13} /></Link>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {betaFeedbackEnabled ? (
        <button className="beta-report-button" type="button" onClick={() => setReportOpen(true)}>
          Report Issues
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
              <section className="beta-report-safety"><AlertTriangle size={16} /><span>{betaRoleSwitchSafetyCopy}</span></section>
              {message ? <p className={message.startsWith("Saved") ? "beta-report-success" : "beta-report-error"}>{message.startsWith("Saved") ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{message}</p> : null}
              <footer>
                <button type="button" onClick={() => setReportOpen(false)}>Close</button>
                <button type="submit" disabled={submitting}><Send size={15} />{submitting ? "Saving..." : "Submit"}</button>
              </footer>
            </form>
            <Link className="beta-report-guide" href="/help?taskMode=1"><FileText size={15} />Open Help Center <ExternalLink size={13} /></Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
