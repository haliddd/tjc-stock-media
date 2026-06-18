"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import { PageHeader } from "./EnterpriseShared";
import { cn } from "@/lib/utils";

type TaskPriority = "Critical" | "High" | "Normal";

type TaskCard = {
  id: string;
  section: string;
  title: string;
  priority: TaskPriority;
  dueDate: string;
  related: string;
  assignedReason: string;
  nextAction: string;
  safetyState: string;
};

const taskSections = [
  "Due now",
  "Evidence needed",
  "Review decisions",
  "Upload cleanup",
  "Distribution blockers",
  "Policy acknowledgments"
];

const taskCards: TaskCard[] = [
  {
    id: "TASK-211",
    section: "Due now",
    title: "Review owner/license evidence for TJC-IMG-1008",
    priority: "Critical",
    dueDate: "Today 2:00 PM",
    related: "Asset TJC-IMG-1008",
    assignedReason: "You are listed as reviewer for the current rights packet.",
    nextAction: "Confirm license evidence or keep distribution blocked.",
    safetyState: "Download locked until decision"
  },
  {
    id: "TASK-214",
    section: "Evidence needed",
    title: "Resolve people/minors status for Fellowship Lunch Photos",
    priority: "High",
    dueDate: "Today 5:00 PM",
    related: "Collection Fellowship Lunch Photos",
    assignedReason: "You claimed the people/release review step.",
    nextAction: "Record people visibility and request missing consent if needed.",
    safetyState: "Public use blocked"
  },
  {
    id: "TASK-219",
    section: "Review decisions",
    title: "Add approved derivative for Bible Study Slide Background",
    priority: "Normal",
    dueDate: "Tomorrow",
    related: "Asset Bible Study Slide Background",
    assignedReason: "The download unlock request needs an approved copy.",
    nextAction: "Attach derivative details and send for reviewer confirmation.",
    safetyState: "Source files restricted"
  },
  {
    id: "TASK-223",
    section: "Upload cleanup",
    title: "Clean event context on Spring Outreach upload set",
    priority: "Normal",
    dueDate: "Wed 10:00 AM",
    related: "Upload session UP-887",
    assignedReason: "You started the contributor intake draft.",
    nextAction: "Add event date, ministry, people visibility, and usage scope.",
    safetyState: "Submitted, not published"
  },
  {
    id: "TASK-227",
    section: "Distribution blockers",
    title: "Respond to source access request REQ-1024",
    priority: "High",
    dueDate: "Today 4:30 PM",
    related: "Request REQ-1024",
    assignedReason: "Requester reply is waiting on your ministry scope.",
    nextAction: "Add intended use, deadline, and why approved copy is not enough.",
    safetyState: "Access not granted"
  },
  {
    id: "TASK-232",
    section: "Policy acknowledgments",
    title: "Acknowledge download policy for approved derivatives",
    priority: "Normal",
    dueDate: "Fri 9:00 AM",
    related: "Distribution Set Draft",
    assignedReason: "You are preparing a governed distribution set.",
    nextAction: "Confirm no public link, ZIP, or source-file copy is created.",
    safetyState: "Policy confirmation required"
  }
];

function priorityClass(priority: TaskPriority) {
  if (priority === "Critical") return "is-critical";
  if (priority === "High") return "is-high";
  return "is-normal";
}

function sectionIcon(section: string) {
  if (section === "Due now") return CalendarClock;
  if (section === "Evidence needed") return ShieldAlert;
  if (section === "Review decisions") return FileCheck2;
  if (section === "Upload cleanup") return UploadCloud;
  if (section === "Distribution blockers") return AlertCircle;
  return ShieldCheck;
}

export function MyTasksPage() {
  const [activeSection, setActiveSection] = useState("Due now");
  const [selectedId, setSelectedId] = useState(taskCards[0].id);
  const activeTasks = useMemo(() => taskCards.filter((task) => task.section === activeSection), [activeSection]);
  const selected = taskCards.find((task) => task.id === selectedId) || activeTasks[0] || taskCards[0];

  return (
    <div className="enterprise-page enterprise-my-tasks route-identity-page" data-route-identity="my-tasks">
      <PageHeader
        title="My Tasks"
        subtitle="Your assigned DAM work, evidence checks, and review actions."
      />

      <section className="ed-task-section-strip" aria-label="Task sections">
        {taskSections.map((section) => {
          const Icon = sectionIcon(section);
          const count = taskCards.filter((task) => task.section === section).length;
          return (
            <button
              type="button"
              key={section}
              className={section === activeSection ? "is-active" : undefined}
              onClick={() => {
                setActiveSection(section);
                const firstInSection = taskCards.find((task) => task.section === section);
                if (firstInSection) setSelectedId(firstInSection.id);
              }}
              aria-pressed={section === activeSection}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{section}</span>
              <em>{count}</em>
            </button>
          );
        })}
      </section>

      <div className="ed-route-workspace">
        <main className="ed-route-main" data-primary-section="task-work-queue">
          <header className="ed-section-heading">
            <div>
              <h2>{activeSection}</h2>
              <p>Assigned work only. Tasks explain why you own the step and what safe action comes next.</p>
            </div>
            <span>{activeTasks.length} tasks</span>
          </header>
          <div className="ed-task-card-grid">
            {activeTasks.map((task) => (
              <article key={task.id} className={cn("ed-task-card", task.id === selected.id && "is-active")}>
                <header>
                  <span className={cn("ed-priority-pill", priorityClass(task.priority))}>{task.priority}</span>
                  <small>{task.id}</small>
                </header>
                <h3>{task.title}</h3>
                <dl>
                  <div><dt>Due date</dt><dd>{task.dueDate}</dd></div>
                  <div><dt>Related item</dt><dd>{task.related}</dd></div>
                  <div><dt>Why assigned to me</dt><dd>{task.assignedReason}</dd></div>
                  <div><dt>Next action</dt><dd>{task.nextAction}</dd></div>
                  <div><dt>Safety state</dt><dd>{task.safetyState}</dd></div>
                </dl>
                <button type="button" className="ed-row-open" onClick={() => setSelectedId(task.id)}>Open task</button>
              </article>
            ))}
          </div>
        </main>

        <aside className="ed-route-inspector" aria-label="Task inspector">
          <header>
            <ClipboardList size={18} aria-hidden="true" />
            <div>
              <h2>Task context</h2>
              <p>{selected.id} · {selected.section}</p>
            </div>
          </header>
          <dl className="ed-route-facts">
            <div><dt>Priority</dt><dd>{selected.priority}</dd></div>
            <div><dt>Due</dt><dd>{selected.dueDate}</dd></div>
            <div><dt>Related</dt><dd>{selected.related}</dd></div>
          </dl>
          <section>
            <h3>Why assigned to me</h3>
            <p>{selected.assignedReason}</p>
          </section>
          <section>
            <h3>Next action</h3>
            <p>{selected.nextAction}</p>
          </section>
          <section>
            <h3>Safety state</h3>
            <p><CheckCircle2 size={14} aria-hidden="true" />{selected.safetyState}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
