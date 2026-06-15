"use client";

import { useMemo, useState } from "react";
import { Clock3, FileImage, FileVideo, ShieldAlert, UploadCloud } from "lucide-react";
import { PageHeader } from "./EnterpriseShared";
import { cn } from "@/lib/utils";

type UploadRow = {
  id: string;
  title: string;
  mediaType: "Photo" | "Video" | "Graphic";
  contributor: string;
  intakeStatus: string;
  reviewState: string;
  cleanup: string;
  submitted: string;
  nextAction: string;
};

const uploads: UploadRow[] = [
  {
    id: "UP-887",
    title: "Spring Outreach Upload Set",
    mediaType: "Photo",
    contributor: "Contributor desk",
    intakeStatus: "Submitted",
    reviewState: "Needs Review / Do Not Publish",
    cleanup: "Event context missing",
    submitted: "Today 9:18 AM",
    nextAction: "Add ministry, event date, and people visibility."
  },
  {
    id: "UP-891",
    title: "Bible Study Slide Background",
    mediaType: "Graphic",
    contributor: "Education team",
    intakeStatus: "Draft",
    reviewState: "Needs Review / Do Not Publish",
    cleanup: "Derivative request pending",
    submitted: "Yesterday 3:44 PM",
    nextAction: "Finish usage scope and submit for review."
  },
  {
    id: "UP-894",
    title: "Choir Practice Wide Shot",
    mediaType: "Video",
    contributor: "Music ministry",
    intakeStatus: "Submitted",
    reviewState: "Needs Review / Do Not Publish",
    cleanup: "Music rights check",
    submitted: "Mon 2:10 PM",
    nextAction: "Confirm music and public-use restrictions."
  },
  {
    id: "UP-899",
    title: "Fellowship Lunch Photos",
    mediaType: "Photo",
    contributor: "Fellowship team",
    intakeStatus: "Needs info",
    reviewState: "Needs Review / Do Not Publish",
    cleanup: "People/minors status",
    submitted: "Mon 11:02 AM",
    nextAction: "Request people visibility evidence."
  }
];

function uploadIcon(type: UploadRow["mediaType"]) {
  if (type === "Video") return FileVideo;
  return FileImage;
}

export function RecentUploadsPage() {
  const [selectedId, setSelectedId] = useState(uploads[0].id);
  const selected = useMemo(() => uploads.find((item) => item.id === selectedId) || uploads[0], [selectedId]);

  return (
    <div className="enterprise-page enterprise-recent-uploads route-identity-page" data-route-identity="recent-uploads">
      <PageHeader
        title="Recent Uploads"
        subtitle="Review recent intake items without approving or moving source files."
      />

      <section className="ed-approved-banner">
        <ShieldAlert size={24} aria-hidden="true" />
        <div>
          <strong>Uploads are intake, not approval</strong>
          <span>Every recent upload stays Needs Review / Do Not Publish until a reviewer records evidence and scope.</span>
        </div>
      </section>

      <div className="ed-route-workspace">
        <main className="ed-route-main" data-primary-section="recent-uploads-ledger">
          <header className="ed-section-heading">
            <div>
              <h2>Recent intake ledger</h2>
              <p>Use this page to clean upload packets before review. It is not a media Library shortcut.</p>
            </div>
            <span>{uploads.length} uploads</span>
          </header>
          <div className="ed-upload-ledger">
            {uploads.map((upload) => {
              const Icon = uploadIcon(upload.mediaType);
              return (
                <article key={upload.id} className={cn(upload.id === selected.id && "is-active")}>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <strong>{upload.title}</strong>
                    <span>{upload.id} · {upload.mediaType} · {upload.submitted}</span>
                  </div>
                  <em>{upload.reviewState}</em>
                  <button type="button" className="ed-row-open" onClick={() => setSelectedId(upload.id)}>Inspect</button>
                </article>
              );
            })}
          </div>
        </main>

        <aside className="ed-route-inspector" aria-label="Recent upload inspector">
          <header>
            <UploadCloud size={18} aria-hidden="true" />
            <div>
              <h2>Intake context</h2>
              <p>{selected.id} · {selected.intakeStatus}</p>
            </div>
          </header>
          <dl className="ed-route-facts">
            <div><dt>Contributor</dt><dd>{selected.contributor}</dd></div>
            <div><dt>Review state</dt><dd>{selected.reviewState}</dd></div>
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
        </aside>
      </div>
    </div>
  );
}
