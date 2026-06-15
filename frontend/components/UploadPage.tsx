"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, FileCheck2, FileText, Link as LinkIcon, RotateCcw, Save, Search, ShieldCheck, UploadCloud, Users } from "lucide-react";
import { DamFormEmptyState as EmptyState, DamFormEvidenceChecklist as EvidenceChecklist, DamFormPrimaryAction as PrimaryAction, DamFormUseCaseCard as UseCaseCard, DamPacketRequirementPanel as PacketRequirementPanel, DamPacketStepper as PacketStepper, DamPacketSubmitBar as PacketSubmitBar, DamPacketSummary as PacketSummary, DamUploadFileDropzone as UploadDropzone } from "@/components/dam/DamFormFlow";
import { DamTrustSignalStrip as TrustSignalStrip } from "@/components/dam/DamWorkspace";
import { TagInput } from "@/components/InputWithTags";
import { useDemoRole } from "@/components/RoleProvider";
import { canUpload } from "@/lib/permissions";
import { toastDraftSaved, toastUploadComplete, toastUploadFailed, toastUploadStarted } from "@/lib/tjc-toasts";
import { parseUploadTags, uploadTagSuggestions } from "@/lib/upload-tags";
import { cn } from "@/lib/ui";
import { LARGE_MEDIA_BYTES, uploadDefaultState } from "@/lib/workflow-policy";

type UploadReceipt = {
  status?: string;
  defaultReviewState?: string;
  message?: string;
  eventName?: string;
  fileCount?: number;
  sourceLinkCaptured?: boolean;
  reviewWarnings?: string[];
};

const inputClass = "min-h-11 w-full min-w-0 rounded-[12px] border border-[#d8e1da] bg-white px-3 text-sm font-semibold text-tjc-ink placeholder:text-[#68756d]";
const labelClass = "grid gap-2 text-sm font-black text-tjc-ink";
const requiredHint = <span className="text-xs font-black text-[#7a5a19]">Required</span>;

const intakeTypes = [
  { id: "event-photo", label: "Event photos", detail: "Event, people visibility, source, and use case.", icon: UploadCloud },
  { id: "youth", label: "Youth/children", detail: "Consent and visibility evidence required.", icon: Users },
  { id: "sermon", label: "Sermon/teaching photos", detail: "Speaker, context, and usage scope for review.", icon: FileText },
  { id: "graphics", label: "Graphics/flyers", detail: "Design rights, fonts, and channel fit.", icon: FileCheck2 },
  { id: "music", label: "Hymn/music context", detail: "Future audio/video route; beta only flags related photos or graphics.", icon: ShieldCheck },
  { id: "source-link", label: "Source link only", detail: "Media-team link or shared source for reviewer intake.", icon: LinkIcon }
] as const;

const steps = [
  "What are you sending?",
  "Where is this from?",
  "Who appears and what permission is known?",
  "Files, link, and reviewer notes",
  "Reviewer packet"
] as const;

const packetRequirementItems = [
  { label: "Origin", detail: "Where it came from and who can answer follow-up." },
  { label: "People/youth", detail: "Who appears and whether children or youth may be visible." },
  { label: "Rights", detail: "Owner/license, attribution, proof link, restrictions, or internal-only limits." },
  { label: "Use case", detail: "How ministry teams expect to reuse it after review." },
  { label: "Review truth", detail: "Upload submits for review only. Final DAM approval still controls reuse." }
];

export function UploadPage() {
  const { role, ready } = useDemoRole();
  const [step, setStep] = useState(0);
  const [intakeType, setIntakeType] = useState<(typeof intakeTypes)[number]["id"]>("event-photo");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sourceLink, setSourceLink] = useState("");
  const [suggestedTags, setSuggestedTags] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [message, setMessage] = useState("");
  const [largeWarning, setLargeWarning] = useState("");
  const [receipt, setReceipt] = useState<UploadReceipt | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceLinkRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const allowed = ready && canUpload(role);
  const opsView = role === "Reviewer" || role === "DAM Admin";
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const selectedType = intakeTypes.find((item) => item.id === intakeType) || intakeTypes[0];

  const hasValidSourceLink = useMemo(() => {
    if (!sourceLink.trim()) return false;
    try {
      const parsed = new URL(sourceLink.trim());
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }, [sourceLink]);
  const hasFileOrSource = selectedFiles.length > 0 || hasValidSourceLink;
  const tagCount = parseUploadTags(suggestedTags).length;
  const submitReady = hasFileOrSource && tagCount > 0 && intakeNotes.trim().length > 0;
  const packetItems = [
    { id: "type", label: `Media type selected: ${selectedType.label}`, complete: Boolean(intakeType) },
    { id: "file", label: hasFileOrSource ? "File or source link included" : "File or source link needed", complete: hasFileOrSource },
    { id: "tags", label: tagCount ? `${tagCount} suggested tags` : "Suggested tags needed", complete: tagCount > 0 },
    { id: "notes", label: intakeNotes.trim() ? "Reviewer notes included" : "Reviewer notes needed", complete: intakeNotes.trim().length > 0 },
    { id: "evidence", label: "Rights evidence requested for reviewer", complete: true },
    { id: "blocked", label: "Media stays blocked until review", complete: true }
  ];

  function stepContainer(index: number) {
    return formRef.current?.querySelector<HTMLElement>(`[data-send-step="${index}"]`);
  }

  function revealStep(index: number) {
    window.setTimeout(() => {
      const target = stepContainer(index);
      if (!target) return;
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 88);
      window.scrollTo({ top, behavior: "smooth" });
    }, 0);
  }

  function goToStep(index: number) {
    setStep(index);
    revealStep(index);
  }

  function firstMissingControl(index: number) {
    const container = stepContainer(index);
    return Array.from(container?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input[required], select[required], textarea[required]") || [])
      .find((control) => !control.disabled && !String(control.value || "").trim());
  }

  function showIssue(index: number, text: string, control?: HTMLElement | null) {
    setStep(index);
    setMessage(text);
    window.setTimeout(() => {
      control?.focus({ preventScroll: true });
      control?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  }

  function validateStep(index: number) {
    if (index === 3) {
      if (sourceLink.trim() && !hasValidSourceLink) {
        showIssue(index, "Use a full http or https source link.", sourceLinkRef.current);
        return false;
      }
      if (!hasFileOrSource) {
        showIssue(index, "Add a file or source link before continuing.", sourceLinkRef.current);
        return false;
      }
      if (!tagCount) {
        showIssue(index, "Add at least one suggested tag before continuing.");
        return false;
      }
      if (!intakeNotes.trim()) {
        showIssue(index, "Add reviewer notes before continuing.", notesRef.current);
        return false;
      }
      return true;
    }
    const missing = firstMissingControl(index);
    if (missing) {
      showIssue(index, `Complete ${steps[index]} before continuing.`, missing);
      return false;
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setMessage("");
    goToStep(Math.min(steps.length - 1, step + 1));
  }

  function checkFiles(files: FileList | null) {
    const nextFiles = Array.from(files || []);
    setSelectedFiles(nextFiles);
    const hasLarge = nextFiles.some((file) => file.size > LARGE_MEDIA_BYTES);
    setLargeWarning(hasLarge ? uploadDefaultState.largeMediaMessage : "");
    if (nextFiles.length) toastUploadStarted(`${nextFiles.length} selected file${nextFiles.length === 1 ? "" : "s"} staged for review.`);
  }

  function syncFileInput(nextFiles: File[]) {
    if (fileInputRef.current && typeof DataTransfer !== "undefined") {
      try {
        const transfer = new DataTransfer();
        nextFiles.forEach((file) => transfer.items.add(file));
        fileInputRef.current.files = transfer.files;
      } catch {
        fileInputRef.current.value = "";
      }
    }
    setSelectedFiles(nextFiles);
    setLargeWarning(nextFiles.some((file) => file.size > LARGE_MEDIA_BYTES) ? uploadDefaultState.largeMediaMessage : "");
  }

  function addDroppedFiles(files: File[]) {
    syncFileInput([...selectedFiles, ...files]);
    toastUploadStarted(`${files.length} dropped file${files.length === 1 ? "" : "s"} added to reviewer intake.`);
  }

  function removeFile(index: number) {
    const file = selectedFiles[index];
    syncFileInput(selectedFiles.filter((_, fileIndex) => fileIndex !== index));
    toastDraftSaved(`${file?.name || "File"} removed from intake.`);
  }

  function clearFiles() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFiles([]);
    setLargeWarning("");
  }

  function saveDraftNotice() {
    setDraftSaved(true);
    setMessage("Draft saved locally in this browser. Submit for DAM review when ready.");
    toastDraftSaved("Draft saved locally. Submit for DAM review when ready.");
  }

  function resetSendDetails() {
    clearFiles();
    setSourceLink("");
    setSuggestedTags("");
    setIntakeNotes("");
    setReceipt(null);
    setMessage("Files, link, tags, and notes cleared.");
    toastDraftSaved("Files, link, tags, and notes cleared.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setReceipt(null);
    for (let index = 0; index < steps.length - 1; index += 1) {
      if (!validateStep(index)) return;
    }
    if (!submitReady) {
      showIssue(3, "Complete files, tags, and reviewer notes before submitting.", notesRef.current);
      return;
    }
    const form = new FormData(event.currentTarget);
    form.delete("files");
    selectedFiles.forEach((file) => form.append("files", file));
    form.set("role", role);
    form.set("mediaType", intakeType);
    toastUploadStarted(selectedFiles.length ? `${selectedFiles.length} file(s) staged for review.` : "Source-link intake will be reviewed without a browser file.");
    const response = await fetch("/api/upload", { method: "POST", body: form });
    const body = await response.json();
    const safeError = !opsView && body.error?.includes("ResourceSpace")
      ? "Suggested tags must use current media-team vocabulary."
      : body.error;
    setMessage(body.message || safeError || "Upload intake checked.");
    if (response.ok) {
      setReceipt(body);
      toastUploadComplete();
      goToStep(4);
    } else {
      toastUploadFailed(safeError || "No files were approved or published.");
    }
  }

  if (!ready) {
    return <div className="dam-shell"><div className="skeleton h-[70dvh] rounded-[14px]" /></div>;
  }

  if (!allowed) {
    return (
      <div className="dam-shell max-w-5xl">
        <EmptyState
          title="Send media requires Contributor access"
          description="Contributors provide source, people, rights, files, tags, and reviewer notes. New media stays blocked until review."
          primary={<PrimaryAction href="/library" icon={Search}>Find approved media</PrimaryAction>}
        />
      </div>
    );
  }

  return (
    <div className="dam-shell mobile-first-flow grid gap-5">
      <section className="find-hero send-hero p-5 sm:p-7" aria-label="Send media">
        <div className="send-command-main">
          <p className="dam-kicker">Contributor intake</p>
          <h1 className="dam-page-title">Send media for review</h1>
          <p className="mt-3 max-w-[58ch] text-lg font-semibold leading-relaxed text-tjc-muted">
            Build a reviewer packet with source, rights, people, scope, and proof context. Send never publishes media.
          </p>
          <p className="mt-2 max-w-[64ch] text-sm font-black text-[#725216]">
            Source class, owner/license, attribution, proof link, and requested usage scope are captured for reviewer evidence.
          </p>
        </div>
        <dl className="send-command-ledger" aria-label="Send media safety summary">
          {[
            ["Intake", "Review packet"],
            ["Media scope", "Image intake"],
            ["Default", uploadDefaultState.status],
            ["Publish", "Never from Send"],
            ["Truth", "DAM review"]
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <TrustSignalStrip
        signals={[
          { label: "Send behavior", value: "Never publishes", tone: "blocked" },
          { label: "Reviewer packet", value: "Source, people, rights", tone: "info" },
          { label: "Hosted beta", value: "Photos only", tone: "info" },
          { label: "Default state", value: uploadDefaultState.status, tone: "review" },
          { label: "Safe outcome", value: "Approval creates usable copy", tone: "approved" }
        ]}
      />

      <PacketStepper steps={steps} current={step} />

      <div className="dam-packet-workbench grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
      <form ref={formRef} className="grid gap-4" onSubmit={submit} noValidate>
        <input type="hidden" name="intakeType" value={intakeType} />

        <section data-send-step="0" className={cn("grid gap-4", step !== 0 && "hidden")}>
          <div className="dam-packet-categories grid gap-3">
            {intakeTypes.map((item) => (
              <UseCaseCard
                key={item.id}
                label={item.label}
                detail={item.detail}
                icon={item.icon}
                selected={intakeType === item.id}
                onClick={() => setIntakeType(item.id)}
              />
            ))}
          </div>
          <div className="dam-packet-selected rounded-[16px] border border-[#d8e1da] bg-white p-3 text-sm font-semibold text-tjc-muted">
            <span>Selected category</span>
            <strong className="text-tjc-evergreen">{selectedType.label}</strong>
          </div>
          <PacketRequirementPanel typeLabel={selectedType.label} items={packetRequirementItems} />
        </section>

        <section data-send-step="1" className={cn("dam-packet-panel grid gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-4", step !== 1 && "hidden")}>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">Title {requiredHint}</span>
            <input className={inputClass} name="title" placeholder="Bible study fellowship photos" required />
          </label>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">Event {requiredHint}</span>
            <input className={inputClass} name="eventName" placeholder="Youth service, Sabbath lunch, workshop..." required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className="flex items-center justify-between gap-2">Date {requiredHint}</span>
              <input className={inputClass} name="eventDate" type="date" defaultValue={today} required />
            </label>
            <label className={labelClass}>
              <span className="flex items-center justify-between gap-2">Ministry/team {requiredHint}</span>
              <input className={inputClass} name="ministry" placeholder="Internet Ministry" required />
            </label>
          </div>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">Source / photographer {requiredHint}</span>
            <input className={inputClass} name="source" placeholder="Volunteer name, media team, source owner..." required />
          </label>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">Source class {requiredHint}</span>
            <select className={inputClass} name="sourceClass" defaultValue="" required>
              <option value="" disabled>Choose one</option>
              <option>Church photographer / TJC-created</option>
              <option>Existing media archive record</option>
              <option>Existing media library record</option>
              <option>Online/free source</option>
              <option>Third-party stock/license</option>
              <option>Unknown - reviewer must verify</option>
            </select>
            <span className="text-xs font-semibold text-tjc-muted">Church-created media can move faster, but people/youth and sensitive context still require review. Online/free is not proof.</span>
          </label>
        </section>

        <section data-send-step="2" className={cn("dam-packet-panel grid gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-4", step !== 2 && "hidden")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className="flex items-center justify-between gap-2">People visible {requiredHint}</span>
              <select className={inputClass} name="peopleVisible" defaultValue="" required>
                <option value="" disabled>Choose one</option>
                <option>No</option>
                <option>Yes</option>
                <option>Unknown</option>
              </select>
            </label>
            <label className={labelClass}>
              <span className="flex items-center justify-between gap-2">Children/youth visible {requiredHint}</span>
              <select className={inputClass} name="minorsVisible" defaultValue="" required>
                <option value="" disabled>Choose one</option>
                <option>No</option>
                <option>Yes</option>
                <option>Unknown</option>
              </select>
            </label>
          </div>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">Usage rights {requiredHint}</span>
            <select className={inputClass} name="usageRights" defaultValue="" required>
              <option value="" disabled>Choose one</option>
              <option>TJC-owned / permission confirmed</option>
              <option>Internal ministry use only</option>
              <option>Do not publish externally</option>
              <option>Unknown - needs review</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Owner/license
              <input className={inputClass} name="ownerLicense" placeholder="TJC, photographer, license owner, stock provider..." />
            </label>
            <label className={labelClass}>
              Attribution text
              <input className={inputClass} name="attributionText" placeholder="Credit line if required..." />
            </label>
          </div>
          <label className={labelClass}>
            Usage scope requested
            <select className={inputClass} name="requestedUsageScope" defaultValue="Reviewer decides">
              <option>Reviewer decides</option>
              <option>Internal ministry only</option>
              <option>Public web/social</option>
              <option>Slides/newsletter</option>
              <option>Archive only</option>
            </select>
          </label>
          <label className={labelClass}>
            Suggested approval direction
            <select className={inputClass} name="approvalSuggestion" defaultValue="Reviewer decides">
              <option>Reviewer decides</option>
              <option>Likely church-wide use</option>
              <option>Likely internal ministry use only</option>
              <option>Archive only</option>
              <option>Do not publish externally</option>
            </select>
          </label>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">Consent/restrictions {requiredHint}</span>
            <textarea className="min-h-28 rounded-[12px] border border-[#d8e1da] bg-white p-3 text-sm font-semibold text-tjc-ink placeholder:text-[#68756d]" name="notes" placeholder="Known permissions, consent, internal-only limits, or restrictions..." rows={4} required />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              <span className="flex items-center justify-between gap-2">Doctrine/sacrament sensitivity {requiredHint}</span>
              <select className={inputClass} name="doctrineSacramentSensitive" defaultValue="" required>
                <option value="" disabled>Choose one</option>
                <option>No</option>
                <option>Yes</option>
                <option>Unknown - reviewer must check</option>
              </select>
            </label>
            <label className={labelClass}>
              <span className="flex items-center justify-between gap-2">Testimony/pastoral sensitivity {requiredHint}</span>
              <select className={inputClass} name="testimonyPastoralSensitive" defaultValue="" required>
                <option value="" disabled>Choose one</option>
                <option>No</option>
                <option>Yes</option>
                <option>Unknown - reviewer must check</option>
              </select>
            </label>
            <label className={labelClass}>
              <span className="flex items-center justify-between gap-2">Hymn/music present {requiredHint}</span>
              <select className={inputClass} name="hymnMusicPresent" defaultValue="" required>
                <option value="" disabled>Choose one</option>
                <option>No</option>
                <option>Yes - future rights route</option>
                <option>Unknown - reviewer must check</option>
              </select>
            </label>
          </div>
        </section>

        <section data-send-step="3" className={cn("dam-packet-panel grid gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-4", step !== 3 && "hidden")}>
          <UploadDropzone inputRef={fileInputRef} selectedFiles={selectedFiles} onInputFiles={checkFiles} onDropFiles={addDroppedFiles} onRemove={removeFile} onClear={clearFiles} />
          <label className={labelClass}>
            Existing media-team link
            <input ref={sourceLinkRef} className={inputClass} name="sourceLink" placeholder="https://..." value={sourceLink} onChange={(event) => setSourceLink(event.target.value)} />
            {sourceLink.trim() && !hasValidSourceLink ? <span className="text-xs font-black text-[#7a5a19]">Use a full http or https source link.</span> : null}
          </label>
          <label className={labelClass}>
            Proof link / license receipt / consent attachment
            <input className={inputClass} name="proofLink" placeholder="https://... or note where proof is attached" />
            <span className="text-xs font-semibold text-tjc-muted">Required before public/external approval. Missing proof means public download remains blocked.</span>
          </label>
          <TagInput
            name="tags"
            label="Suggested tags"
            value={suggestedTags}
            onChange={setSuggestedTags}
            required
            placeholder="Bible, fellowship, welcome, youth..."
            suggestions={uploadTagSuggestions}
            helperText="Use visible-content or TJC terms. Reviewers approve final tags."
          />
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">Reviewer notes {requiredHint}</span>
            <textarea ref={notesRef} className="min-h-28 rounded-[12px] border border-[#d8e1da] bg-white p-3 text-sm font-semibold text-tjc-ink placeholder:text-[#68756d]" name="intakeNotes" placeholder="What should the reviewer check before reuse?" rows={4} required value={intakeNotes} onChange={(event) => setIntakeNotes(event.target.value)} />
          </label>
          {largeWarning ? <div className="rounded-[14px] border border-[#e5cf93] bg-[#fff8e8] p-3 text-sm font-semibold text-[#71500f]">{largeWarning}</div> : null}
        </section>

        <section data-send-step="4" className={cn("dam-packet-panel grid gap-4 rounded-[14px] border border-[#e5e7eb] bg-white p-4", step !== 4 && "hidden")}>
          <div>
            <h2 className="text-2xl font-black text-tjc-ink">Reviewer packet</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-tjc-muted">Reviewer receives source context, people/youth answers, rights notes, proof fields, file/link, suggested tags, and notes. Media stays blocked.</p>
          </div>
          <EvidenceChecklist items={packetItems} />
          <div className="grid gap-3 rounded-[16px] border border-[#d8e1da] bg-[#fbfcfa] p-3 text-sm font-semibold text-tjc-muted">
            <span><strong className="text-tjc-ink">Selected type:</strong> {selectedType.label}</span>
            <span><strong className="text-tjc-ink">Files:</strong> {selectedFiles.length}</span>
            <span><strong className="text-tjc-ink">Source link:</strong> {hasValidSourceLink ? "included" : "not included"}</span>
            <span><strong className="text-tjc-ink">Tags:</strong> {tagCount}</span>
            <span><strong className="text-tjc-ink">Public use:</strong> blocked until evidence and DAM review clear</span>
          </div>
        </section>

        {message ? <div className="rounded-[16px] border border-[#c8d7e6] bg-[#f2f7fb] p-3 text-sm font-black text-[#27435b]" role="status">{message}</div> : null}

        <PacketSubmitBar>
          <div className="flex flex-wrap gap-2">
            <PrimaryAction tone="secondary" onClick={saveDraftNotice} icon={Save}>Save draft</PrimaryAction>
            <PrimaryAction tone="secondary" onClick={resetSendDetails} icon={RotateCcw}>Clear files</PrimaryAction>
            {step > 0 ? <PrimaryAction tone="secondary" onClick={() => goToStep(Math.max(0, step - 1))}>Back</PrimaryAction> : null}
            {step < steps.length - 1 ? (
              <PrimaryAction onClick={nextStep}>Next</PrimaryAction>
            ) : (
              <PrimaryAction type="submit" icon={UploadCloud} disabled={!submitReady}>Submit for DAM review</PrimaryAction>
            )}
          </div>
          <p className="text-xs font-semibold leading-relaxed text-tjc-muted">
            {draftSaved ? "Draft saved locally. " : ""}Submit creates a review packet. Nothing publishes from this page.
          </p>
        </PacketSubmitBar>

        {receipt ? (
          <section className="grid gap-4 rounded-[14px] border border-[#b9d8c6] bg-[#eef8f2] p-5 text-[#194f34]" aria-label="Final submission summary">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={23} strokeWidth={1.9} aria-hidden="true" />
              <div>
                <h2 className="text-2xl font-black">Intake received</h2>
                <p className="mt-1 text-sm font-semibold">This media is blocked until a reviewer approves reuse.</p>
              </div>
            </div>
            <dl className="grid gap-3 sm:grid-cols-4">
              <div><dt className="text-xs font-black">Status</dt><dd>{receipt.defaultReviewState || uploadDefaultState.status}</dd></div>
              <div><dt className="text-xs font-black">Event</dt><dd>{receipt.eventName || "Not provided"}</dd></div>
              <div><dt className="text-xs font-black">Files</dt><dd>{receipt.fileCount ?? 0}</dd></div>
              <div><dt className="text-xs font-black">Source link</dt><dd>{receipt.sourceLinkCaptured ? "Captured" : "Not provided"}</dd></div>
            </dl>
            {receipt.reviewWarnings?.length ? (
              <div className="flex flex-wrap gap-2">
                {receipt.reviewWarnings.map((warning) => (
                  <span className="rounded-[10px] border border-[#e5cf93] bg-[#fff8e8] px-2.5 py-1 text-xs font-black text-[#71500f]" key={warning}>{warning}</span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </form>
      <PacketSummary
        typeLabel={selectedType.label}
        fileCount={selectedFiles.length}
        hasSourceLink={hasValidSourceLink}
        tagCount={tagCount}
        ready={submitReady}
      >
        <EvidenceChecklist items={packetItems} />
        <div className="rounded-xl border border-[#ead6a8] bg-[#fff8e8] p-3 text-sm font-black leading-relaxed text-[#71500f]">
          New media remains Needs Review / Do Not Publish. Missing proof blocks public/external download.
        </div>
      </PacketSummary>
      </div>
    </div>
  );
}
