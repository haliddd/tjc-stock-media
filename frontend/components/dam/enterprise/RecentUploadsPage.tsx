"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, FileImage, FileVideo, ShieldAlert, UploadCloud } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { PageHeader } from "./EnterpriseShared";
import { cn } from "@/lib/utils";
import type { DemoRole } from "@/lib/types";

type UploadStatus = "Draft" | "Submitted" | "Needs more info" | "Reviewed" | "Restricted" | "Rejected";

type UploadRow = {
  id: string;
  batchName: string;
  eventName?: string;
  mediaType: "Photos" | "Videos" | "Photos and videos" | "Not sure";
  fileCount: number;
  status: UploadStatus;
  date: string;
  eventDate: string;
  locationName?: string;
  ministry: string;
  source?: string;
  peopleMinors: string;
  notes: string;
  submittedAt?: string;
  reviewStatus?: string;
  publishStatus?: string;
  reviewerNote?: string;
  roleFit: DemoRole[];
};

const contributorUploadsKey = "tjc-upload-intake-my-uploads-v1";
const uploadStatuses: UploadStatus[] = ["Draft", "Submitted", "Needs more info", "Reviewed", "Restricted", "Rejected"];
const mediaTypeValues = ["Photos", "Videos", "Photos and videos", "Not sure"] as const;
const unsafeContributorCopy = /\b(ResourceSpace|Support Zone|Source Status|source-system|source system|writeback|backend|live sync|published|downloadable|public now|approved|approval|durable account history)\b/i;

const exampleUploads: UploadRow[] = [
  {
    id: "draft-youth-service",
    batchName: "Youth Service photos",
    mediaType: "Photos",
    fileCount: 18,
    status: "Draft",
    date: "Jun 17, 2026",
    eventDate: "2026-06-17",
    ministry: "Youth / RE",
    source: "Contributor desk",
    peopleMinors: "Not sure",
    notes: "Need exact classroom location before submit.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  },
  {
    id: "submitted-sabbath-lunch",
    batchName: "Sabbath lunch fellowship",
    mediaType: "Photos",
    fileCount: 42,
    status: "Submitted",
    date: "Jun 16, 2026",
    eventDate: "2026-06-16",
    ministry: "Fellowship",
    source: "Contributor desk",
    peopleMinors: "Yes",
    notes: "Several families visible.",
    reviewerNote: "Waiting for reviewer.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  },
  {
    id: "needs-info-re-class",
    batchName: "RE classroom candids",
    mediaType: "Photos",
    fileCount: 9,
    status: "Needs more info",
    date: "Jun 14, 2026",
    eventDate: "2026-06-14",
    ministry: "Religious Education",
    source: "Teacher upload",
    peopleMinors: "Yes",
    notes: "Teacher asked whether class photos can be used.",
    reviewerNote: "Please add class name and whether parents were notified.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  },
  {
    id: "reviewed-vespers",
    batchName: "Spring vespers",
    mediaType: "Photos",
    fileCount: 12,
    status: "Reviewed",
    date: "Jun 12, 2026",
    eventDate: "2026-06-12",
    ministry: "Music / Choir",
    source: "Music ministry",
    peopleMinors: "No",
    notes: "Stage photos only.",
    reviewerNote: "Reviewer note allows limited internal church use.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  },
  {
    id: "restricted-baptism",
    batchName: "Baptism preparation",
    mediaType: "Photos",
    fileCount: 7,
    status: "Restricted",
    date: "Jun 10, 2026",
    eventDate: "2026-06-10",
    ministry: "Pastoral",
    source: "Pastoral team",
    peopleMinors: "Not sure",
    notes: "Sensitive preparation moments.",
    reviewerNote: "Restricted to reviewer-cleared internal context only.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  },
  {
    id: "rejected-blurry",
    batchName: "Outreach setup test shots",
    mediaType: "Photos",
    fileCount: 5,
    status: "Rejected",
    date: "Jun 9, 2026",
    eventDate: "2026-06-09",
    ministry: "Outreach",
    source: "Outreach team",
    peopleMinors: "No",
    notes: "Lighting test photos.",
    reviewerNote: "Rejected by reviewer; do not use.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  }
];

const roleUploadGuidance: Record<DemoRole, string> = {
  Viewer: "Uploads appear here after review starts.",
  Contributor: "This browser shows your recent submissions.",
  Reviewer: "Review batches that need evidence or a decision.",
  "DAM Admin": "Monitor contributor intake and reviewer follow-up."
};

function uploadIcon(type: UploadRow["mediaType"]) {
  if (type === "Videos") return FileVideo;
  return FileImage;
}

function normalizeStoredUpload(value: unknown): UploadRow | null {
  const raw = (value || {}) as Partial<UploadRow>;
  const status = String(raw.status || "") === "Approved" ? "Reviewed" : raw.status;
  if (!raw.id || !raw.batchName || !status || !uploadStatuses.includes(status)) return null;
  const mediaType = raw.mediaType && mediaTypeValues.includes(raw.mediaType) ? raw.mediaType : "Not sure";
  return {
    id: String(raw.id),
    batchName: String(raw.batchName),
    eventName: raw.eventName ? String(raw.eventName) : String(raw.batchName),
    mediaType,
    fileCount: Math.max(0, Math.trunc(Number(raw.fileCount) || 0)),
    status,
    date: String(raw.date || "Today"),
    eventDate: String(raw.eventDate || ""),
    locationName: raw.locationName ? String(raw.locationName) : undefined,
    ministry: String(raw.ministry || ""),
    source: raw.source ? String(raw.source) : undefined,
    peopleMinors: String(raw.peopleMinors || "Not sure"),
    notes: String(raw.notes || ""),
    submittedAt: raw.submittedAt ? String(raw.submittedAt) : undefined,
    reviewStatus: raw.reviewStatus ? String(raw.reviewStatus) : undefined,
    publishStatus: raw.publishStatus ? String(raw.publishStatus) : undefined,
    reviewerNote: raw.reviewerNote ? String(raw.reviewerNote) : undefined,
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  };
}

function contributorSafeText(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return unsafeContributorCopy.test(value) ? fallback : value;
}

function readStoredUploads() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(contributorUploadsKey) || "[]") as unknown[];
    return Array.isArray(parsed) ? parsed.map(normalizeStoredUpload).filter((item): item is UploadRow => Boolean(item)) : [];
  } catch {
    return [];
  }
}

function statusAction(status: UploadStatus) {
  if (status === "Draft") return "Continue draft";
  if (status === "Needs more info") return "Add info";
  if (status === "Submitted") return "View details";
  return "View note";
}

function reviewStatusForUpload(upload: UploadRow) {
  if (upload.reviewStatus) return contributorSafeText(upload.reviewStatus, "Waiting for review");
  if (upload.status === "Submitted") return "Waiting for review";
  if (upload.status === "Draft") return "Draft";
  return upload.status;
}

export function useStatusForUpload(upload: Pick<UploadRow, "publishStatus" | "status">) {
  if (upload.publishStatus) {
    if (/do not use yet/i.test(upload.publishStatus)) return "Do not use yet";
    if (/approved/i.test(upload.publishStatus)) return "Reviewer-limited scope only";
    if (/restricted|rejected|do not use/i.test(upload.publishStatus)) return "Do not use";
    if (/do not publish|not published|not public|pending|submitted|draft|needs/i.test(upload.publishStatus)) return "Do not use yet";
    return "Review required before use";
  }
  if (upload.status === "Submitted" || upload.status === "Draft" || upload.status === "Needs more info") return "Do not use yet";
  if (upload.status === "Reviewed") return "Reviewer-limited scope only";
  return "Do not use";
}

function nextStep(upload: UploadRow) {
  if (upload.status === "Draft") return "Finish event details, add files, then submit for review.";
  if (upload.status === "Submitted") return "Waiting for review. Use remains blocked.";
  if (upload.status === "Needs more info") return "Add reviewer-requested details before this can move forward.";
  if (upload.status === "Reviewed") return "Reviewer cleared limited use. Follow the reviewer note.";
  if (upload.status === "Restricted") return "Use is limited by reviewer note.";
  return "Reviewer rejected this batch. Do not use these files.";
}

function uploadMediaSummary(upload: UploadRow) {
  if (!upload.fileCount) return upload.mediaType === "Not sure" ? "Link provided" : "No files counted";
  return `${upload.fileCount} file${upload.fileCount === 1 ? "" : "s"} - ${upload.mediaType}`;
}

export function RecentUploadsPage() {
  const { role } = useDemoRole();
  const [storedUploads, setStoredUploads] = useState<UploadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visibleUploads = useMemo(() => {
    const rows = role === "Contributor"
      ? storedUploads
      : [...storedUploads, ...exampleUploads.filter((example) => !storedUploads.some((stored) => stored.id === example.id))];
    return rows.filter((item) => item.roleFit.includes(role));
  }, [role, storedUploads]);
  const selected = useMemo(() => visibleUploads.find((item) => item.id === selectedId) || visibleUploads[0], [selectedId, visibleUploads]);
  const openCount = visibleUploads.filter((upload) => ["Draft", "Submitted", "Needs more info"].includes(upload.status)).length;

  useEffect(() => {
    setStoredUploads(readStoredUploads());
  }, []);

  useEffect(() => {
    if (!selectedId && visibleUploads[0]) setSelectedId(visibleUploads[0].id);
  }, [selectedId, visibleUploads]);

  return (
    <div className="enterprise-page enterprise-recent-uploads route-identity-page" data-route-identity="recent-uploads">
      <PageHeader
        title={role === "Contributor" ? "My Uploads" : "Recent Uploads"}
        subtitle={roleUploadGuidance[role]}
      />

      <section className="ed-approved-banner">
        <ShieldAlert size={24} aria-hidden="true" />
        <div>
          <strong>Review required before use</strong>
          <span>New uploads stay out of the Media Library until a reviewer clears them.</span>
        </div>
      </section>

      <div className="ed-route-workspace">
        <main className="ed-route-main" data-primary-section="my-uploads-ledger">
          <header className="ed-section-heading">
            <div>
              <h2>{role === "Contributor" ? "My upload batches" : "Upload batches"}</h2>
              <p>Status and reviewer note.</p>
            </div>
            <span>{openCount} open</span>
          </header>
          {visibleUploads.length ? <div className="ed-upload-ledger">
            {visibleUploads.map((upload) => {
              const Icon = uploadIcon(upload.mediaType);
              return (
                <article key={upload.id} className={cn(upload.id === selected?.id && "is-active")}>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <strong>{upload.batchName}</strong>
                    <span>{upload.date} - {uploadMediaSummary(upload)}</span>
                  </div>
                  <div className="ed-upload-status-stack" aria-label={`${upload.batchName} status`}>
                    <em>{reviewStatusForUpload(upload)}</em>
                    <em>{useStatusForUpload(upload)}</em>
                    {upload.reviewerNote ? <em>{contributorSafeText(upload.reviewerNote, "Reviewer note available in review follow-up.")}</em> : null}
                  </div>
                  <button type="button" className="ed-row-open" onClick={() => setSelectedId(upload.id)}>{statusAction(upload.status)}</button>
                </article>
              );
            })}
          </div> : (
            <section className="ed-empty-state is-quiet">
              <UploadCloud size={24} aria-hidden="true" />
              <h2>No uploads yet</h2>
              <p>This browser shows your recent submissions.</p>
            </section>
          )}
        </main>

        <aside className="ed-route-inspector" aria-label="Upload batch details">
          {selected ? (
            <>
              <header>
                <UploadCloud size={18} aria-hidden="true" />
                <div>
                  <h2>Batch details</h2>
                  <p>{selected.status} - {selected.date}</p>
                </div>
              </header>
              <dl className="ed-route-facts">
                <div><dt>Status</dt><dd>{selected.status}</dd></div>
                <div><dt>Date</dt><dd>{selected.date}</dd></div>
                <div><dt>Event name</dt><dd>{selected.eventName || selected.batchName}</dd></div>
                <div><dt>Event date</dt><dd>{selected.eventDate || "Not provided"}</dd></div>
                <div><dt>Church/location</dt><dd>{selected.locationName || "Not provided"}</dd></div>
                <div><dt>Ministry/group</dt><dd>{selected.ministry || "Not provided"}</dd></div>
                <div><dt>Uploader</dt><dd>{contributorSafeText(selected.source, "Contributor upload")}</dd></div>
                <div><dt>People/minors</dt><dd>{selected.peopleMinors}</dd></div>
                <div><dt>Files</dt><dd>{uploadMediaSummary(selected)}</dd></div>
                <div><dt>Review</dt><dd>{reviewStatusForUpload(selected)}</dd></div>
                <div><dt>Use status</dt><dd>{useStatusForUpload(selected)}</dd></div>
                <div><dt>Notes</dt><dd>{contributorSafeText(selected.notes, "No notes")}</dd></div>
                {selected.reviewerNote ? <div><dt>Reviewer note</dt><dd>{contributorSafeText(selected.reviewerNote, "Reviewer note available in review follow-up.")}</dd></div> : null}
              </dl>
              <section>
                <h3>Next step</h3>
                <p>{nextStep(selected)}</p>
              </section>
              <section>
                <h3>Timeline</h3>
                <p><Clock3 size={14} aria-hidden="true" />Submitted or saved {selected.date}. Use waits for reviewer clearance.</p>
              </section>
            </>
          ) : (
            <>
              <header>
                <UploadCloud size={18} aria-hidden="true" />
                <div>
                  <h2>Batch details</h2>
                  <p>No upload selected</p>
                </div>
              </header>
              <p className="ed-route-safety-note"><ShieldAlert size={14} aria-hidden="true" />No upload batch selected. Review gate remains closed.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
