"use client";

import { CheckCircle2, ClipboardCheck, Download, FileWarning, Info, Save, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";

type ToastAction = {
  label: string;
  onClick?: () => void;
};

function actionConfig(action?: ToastAction) {
  if (!action) return undefined;
  return {
    label: action.label,
    onClick: action.onClick || (() => undefined)
  };
}

export function toastUploadStarted(detail = "Preparing contributor intake for review.") {
  return toast.info("Upload intake started", {
    id: "upload-intake-started",
    description: detail,
    duration: 6000,
    icon: <UploadCloud size={16} strokeWidth={1.8} aria-hidden="true" />
  });
}

export function toastUploadComplete(action?: ToastAction) {
  toast.dismiss("upload-intake-started");
  return toast.success("Intake received", {
    id: "upload-intake-complete",
    description: "Media remains submitted, unpublished, and gated until reviewer approval.",
    action: actionConfig(action),
    icon: <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" />
  });
}

export function toastUploadFailed(detail = "No files were approved or published.", action?: ToastAction) {
  toast.dismiss("upload-intake-started");
  return toast.error("Intake failed", {
    id: "upload-intake-failed",
    description: detail,
    action: actionConfig(action),
    icon: <XCircle size={16} strokeWidth={1.8} aria-hidden="true" />
  });
}

export function toastDraftSaved(detail = "Draft stays local until Submit for review.", action?: ToastAction) {
  return toast.success("Draft saved locally", {
    id: "draft-saved",
    description: detail,
    action: actionConfig(action),
    icon: <Save size={16} strokeWidth={1.8} aria-hidden="true" />
  });
}

export function toastShareCopied(label = "Link copied") {
  return toast.success(label, {
    description: "Copied to clipboard.",
    icon: <ClipboardCheck size={16} strokeWidth={1.8} aria-hidden="true" />
  });
}

export function toastReviewQueued(action?: ToastAction) {
  return toast.success("Review action queued", {
    description: "Decision waits for media-team follow-up before the record changes.",
    action: actionConfig(action),
    icon: <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" />
  });
}

export function toastDownloadBlocked(detail: string, action?: ToastAction) {
  return toast.warning("Download unavailable", {
    description: detail,
    action: actionConfig(action),
    icon: <Download size={16} strokeWidth={1.8} aria-hidden="true" />
  });
}

export function toastPendingWriteQueued(action?: ToastAction) {
  return toast.info("Review follow-up queued", {
    description: "Record status stays unchanged until the media team completes review.",
    action: actionConfig(action),
    icon: <Info size={16} strokeWidth={1.8} aria-hidden="true" />
  });
}

export function toastSaveFailed(detail = "Save failed. No review queue update was attempted.", action?: ToastAction) {
  return toast.error("Save failed", {
    description: detail,
    action: actionConfig(action),
    icon: <FileWarning size={16} strokeWidth={1.8} aria-hidden="true" />
  });
}
