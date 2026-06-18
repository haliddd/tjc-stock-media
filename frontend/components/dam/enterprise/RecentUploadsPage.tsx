"use client";

import { useMemo, useState } from "react";
import { Clock3, FileImage, FileVideo, ShieldAlert, UploadCloud } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { PageHeader } from "./EnterpriseShared";
import { cn } from "@/lib/utils";
import type { DemoRole } from "@/lib/types";

type UploadRow = {
  id: string;
  title: string;
  mediaType: "Photo" | "Video" | "Graphic";
  contributor: string;
  intakeStatus: string;
  distributionGate: string;
  evidenceState: string;
  sourceState: string;
  cleanup: string;
  submitted: string;
  nextAction: string;
  roleFit: DemoRole[];
};

const uploads: UploadRow[] = [
  {
    id: "UP-887",
    title: "Spring Outreach Upload Set",
    mediaType: "Photo",
    contributor: "Contributor desk",
    intakeStatus: "Submitted",
    distributionGate: "Not published",
    evidenceState: "Needs Evidence",
    sourceState: "Source restricted",
    cleanup: "Event context missing",
    submitted: "Today 9:18 AM",
    nextAction: "Add ministry, event date, and people visibility.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  },
  {
    id: "UP-891",
    title: "Bible Study Slide Background",
    mediaType: "Graphic",
    contributor: "Education team",
    intakeStatus: "Draft",
    distributionGate: "Not published",
    evidenceState: "Draft Evidence",
    sourceState: "Source restricted",
    cleanup: "Derivative request pending",
    submitted: "Yesterday 3:44 PM",
    nextAction: "Finish usage scope and submit for review.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  },
  {
    id: "UP-894",
    title: "Choir Practice Wide Shot",
    mediaType: "Video",
    contributor: "Music ministry",
    intakeStatus: "Submitted",
    distributionGate: "Not published",
    evidenceState: "Rights Check",
    sourceState: "Source restricted",
    cleanup: "Music rights check",
    submitted: "Mon 2:10 PM",
    nextAction: "Confirm music and public-use restrictions.",
    roleFit: ["Reviewer", "DAM Admin"]
  },
  {
    id: "UP-899",
    title: "Fellowship Lunch Photos",
    mediaType: "Photo",
    contributor: "Fellowship team",
    intakeStatus: "Needs info",
    distributionGate: "Not published",
    evidenceState: "Needs People/Minors Evidence",
    sourceState: "Source restricted",
    cleanup: "People/minors status",
    submitted: "Mon 11:02 AM",
    nextAction: "Request people visibility evidence.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  }
];

const roleUploadGuidance: Record<DemoRole, string> = {
  Viewer: "Uploads are hidden from viewer workflow until media team publishes approved records.",
  Contributor: "Clean intake packets before reviewer handoff. Uploads remain unpublished.",
  Reviewer: "Review intake evidence and rights risk before any reuse decision.",
  "DAM Admin": "Monitor intake custody and cleanup across contributor and reviewer lanes."
};

function uploadIcon(type: UploadRow["mediaType"]) {
  if (type === "Video") return FileVideo;
  return FileImage;
}

export function RecentUploadsPage() {
  const { role } = useDemoRole();
  const [selectedId, setSelectedId] = useState(uploads[0].id);
  const visibleUploads = useMemo(() => uploads.filter((item) => item.roleFit.includes(role)), [role]);
  const selected = useMemo(() => visibleUploads.find((item) => item.id === selectedId) || visibleUploads[0] || uploads[0], [selectedId, visibleUploads]);

  return (
    <div className="enterprise-page enterprise-recent-uploads route-identity-page" data-route-identity="recent-uploads">
      <PageHeader
        title="Recent Uploads"
        subtitle={roleUploadGuidance[role]}
      />

      <section className="ed-approved-banner">
        <ShieldAlert size={24} aria-hidden="true" />
        <div>
          <strong>Uploads are intake, not approval</strong>
          <span>Recent uploads stay in intake, remain unpublished, and wait for reviewer evidence before reuse.</span>
        </div>
      </section>

      <div className="ed-route-workspace">
        <main className="ed-route-main" data-primary-section="recent-uploads-ledger">
          <header className="ed-section-heading">
            <div>
              <h2>Recent intake ledger</h2>
              <p>Use this page to clean upload packets before review. It is not a media Library shortcut.</p>
            </div>
            <span>{visibleUploads.length} uploads</span>
          </header>
          {visibleUploads.length ? <div className="ed-upload-ledger">
            {visibleUploads.map((upload) => {
              const Icon = uploadIcon(upload.mediaType);
              return (
                <article key={upload.id} className={cn(upload.id === selected.id && "is-active")}>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <strong>{upload.title}</strong>
                    <span>{upload.id} · {upload.mediaType} · {upload.submitted}</span>
                  </div>
                  <div className="ed-upload-status-stack" aria-label={`${upload.id} status lanes`}>
                    <em>Status: {upload.intakeStatus}</em>
                    <em>Gate: {upload.distributionGate}</em>
                    <em>Evidence: {upload.evidenceState}</em>
                    <em>Source: {upload.sourceState}</em>
                  </div>
                  <button type="button" className="ed-row-open" onClick={() => setSelectedId(upload.id)}>Inspect</button>
                </article>
              );
            })}
          </div> : (
            <section className="ed-empty-state is-quiet">
              <UploadCloud size={24} aria-hidden="true" />
              <h2>No upload intake for {role}</h2>
              <p>Viewer role does not manage incoming files. Ask media team for review instead; no source access or approval is implied.</p>
            </section>
          )}
        </main>

        <aside className="ed-route-inspector" aria-label="Recent upload inspector">
          {visibleUploads.length ? (
            <>
              <header>
                <UploadCloud size={18} aria-hidden="true" />
                <div>
                  <h2>Intake context</h2>
                  <p>{selected.id} · {selected.intakeStatus}</p>
                </div>
              </header>
              <dl className="ed-route-facts">
                <div><dt>Contributor</dt><dd>{selected.contributor}</dd></div>
                <div><dt>Workflow status</dt><dd>{selected.intakeStatus}</dd></div>
                <div><dt>Distribution gate</dt><dd>{selected.distributionGate}</dd></div>
                <div><dt>Evidence state</dt><dd>{selected.evidenceState}</dd></div>
                <div><dt>Source state</dt><dd>{selected.sourceState}</dd></div>
                <div><dt>Cleanup needed</dt><dd>{selected.cleanup}</dd></div>
              </dl>
              <section>
                <h3>Next safe action</h3>
                <p>{selected.nextAction}</p>
              </section>
              <section>
                <h3>Timeline</h3>
                <p><Clock3 size={14} aria-hidden="true" />Submitted {selected.submitted}. Review waits on cleanup evidence.</p>
              </section>
            </>
          ) : (
            <>
              <header>
                <UploadCloud size={18} aria-hidden="true" />
                <div>
                  <h2>Intake context</h2>
                  <p>Viewer workflow</p>
                </div>
              </header>
              <p className="ed-route-safety-note"><ShieldAlert size={14} aria-hidden="true" />No upload packet details in this role. Request review through media team.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
