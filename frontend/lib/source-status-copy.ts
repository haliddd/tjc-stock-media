import type { MediaSourceStatus } from "@/lib/types";

const fakeOperationalClaimReplacements: Array<[RegExp, string]> = [
  [/\blive\b/gi, "read-only"],
  [/\bsynced\b/gi, "pending confirmation re-read"],
  [/\bwriteback complete(?:d)?\b/gi, "writeback gated"],
  [/\bpublished\b/gi, "shared"],
  [/\bdownloadable\b/gi, "copy-gated"],
  [/\bproduction-ready\b/gi, "operator-proof required"]
];

export const fakeOperationalClaimPattern = /\b(live|synced|writeback complete(?:d)?|published|downloadable|production-ready)\b/i;

export function safeSourceStatusCopy(value = "") {
  return fakeOperationalClaimReplacements.reduce((copy, [pattern, replacement]) => copy.replace(pattern, replacement), value);
}

export function sourceStatusDisplayLabel(source?: MediaSourceStatus | null, fallback = "Unknown") {
  return safeSourceStatusCopy(source?.label || fallback);
}

export function sourceStatusDisplayDetail(source?: MediaSourceStatus | null, fallback = "not loaded") {
  return safeSourceStatusCopy(source?.detail || fallback);
}
