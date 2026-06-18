import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { durableRuntimeStoreConfigured, hasVercelBlobConfig, hasVercelKvConfig, productionRuntime, runtimeStoreMode } from "@/lib/env";

export type RuntimeStateCategory =
  | "audit-log"
  | "pending-review-writes"
  | "download-tickets"
  | "beta-feedback"
  | "package-drafts"
  | "intake-batches"
  | "saved-searches"
  | "usage-events"
  | "runtime";

export type RuntimeStateTruthState = "local-only" | "durable" | "blocked" | "not-implemented";

export type RuntimeStateTruthRow = {
  id: string;
  label: string;
  category: RuntimeStateCategory;
  state: RuntimeStateTruthState;
  storage: string;
  productionTruth: string;
  blocker: string;
};

function genericRuntimeTruthState(): RuntimeStateTruthState {
  const durable = durableRuntimeStoreConfigured();
  if (productionRuntime() && !durable) return "blocked";
  return durable ? "durable" : "local-only";
}

function feedbackTruthState(): RuntimeStateTruthState {
  if (hasVercelKvConfig() && hasVercelBlobConfig()) return "durable";
  if (productionRuntime()) return "blocked";
  return "local-only";
}

export function runtimeStateTruthMatrix(): RuntimeStateTruthRow[] {
  const genericState = genericRuntimeTruthState();
  const genericProductionTruth = genericState === "durable"
    ? "Durable runtime store configured; still needs backup/restore proof before beta language."
    : genericState === "blocked"
      ? "Production write is blocked until durable runtime storage exists."
      : "Local filesystem/runtime state only. Not hosted durability proof.";

  return [
    {
      id: "audit-logs",
      label: "Audit logs",
      category: "audit-log",
      state: genericState,
      storage: "Runtime JSONL audit files",
      productionTruth: genericProductionTruth,
      blocker: "Needs append-only durable audit store, actor integrity, backup, and restore proof."
    },
    {
      id: "download-tickets",
      label: "Download tickets",
      category: "download-tickets",
      state: genericState,
      storage: "Runtime JSON ticket files",
      productionTruth: genericProductionTruth,
      blocker: "Needs durable expiring ticket store with one-time consume proof."
    },
    {
      id: "review-decisions",
      label: "Review decisions",
      category: "pending-review-writes",
      state: genericState,
      storage: "Portal audit event plus pending review queue",
      productionTruth: genericProductionTruth,
      blocker: "Needs durable reviewer decision store; ResourceSpace remains truth."
    },
    {
      id: "pending-resourcespace-writes",
      label: "Pending ResourceSpace writes",
      category: "pending-review-writes",
      state: genericState,
      storage: "Runtime pending-write JSON files",
      productionTruth: genericProductionTruth,
      blocker: "Live ResourceSpace writeback and durable sync state are not proven."
    },
    {
      id: "package-drafts",
      label: "Package drafts",
      category: "package-drafts",
      state: genericState,
      storage: "Local JSON package draft records",
      productionTruth: genericProductionTruth,
      blocker: "Needs durable package/share draft store with audit, expiry, recipients, and revocation."
    },
    {
      id: "intake-batches",
      label: "Intake batches",
      category: "intake-batches",
      state: genericState,
      storage: "Runtime intake batch JSON and local originals staging",
      productionTruth: genericProductionTruth,
      blocker: "Browser file intake is blocked in production without durable storage or admin/Drive intake."
    },
    {
      id: "saved-searches",
      label: "Saved searches",
      category: "saved-searches",
      state: genericState,
      storage: "Local JSON saved-search records",
      productionTruth: genericProductionTruth,
      blocker: "Needs team/user-scoped durable profile storage before persistent saved views are promised."
    },
    {
      id: "feedback",
      label: "Feedback",
      category: "beta-feedback",
      state: feedbackTruthState(),
      storage: hasVercelKvConfig() ? "Vercel KV feedback records" : "Local JSON feedback records",
      productionTruth: hasVercelKvConfig()
        ? `Feedback KV is configured; attachment Blob storage ${hasVercelBlobConfig() ? "is configured" : "is missing"}. This does not prove other runtime stores.`
        : productionRuntime()
          ? "Hosted feedback writes are blocked until KV is configured."
          : "Local feedback JSON only. Not hosted durability proof.",
      blocker: "Needs durable triage, attachment storage, owner/status audit trail, and export proof."
    },
    {
      id: "usage-events",
      label: "Usage events",
      category: "usage-events",
      state: genericState,
      storage: "Local SQLite usage events when enabled",
      productionTruth: genericProductionTruth,
      blocker: "Needs durable event logging before usage, search, or trend metrics are claimed."
    }
  ];
}

function categoryForPath(filePath: string): RuntimeStateCategory {
  if (filePath.includes("audit-log")) return "audit-log";
  if (filePath.includes("pending-review-writes")) return "pending-review-writes";
  if (filePath.includes("download-tickets")) return "download-tickets";
  if (filePath.includes("beta-feedback")) return "beta-feedback";
  if (filePath.includes("package-drafts")) return "package-drafts";
  if (filePath.includes("intake-batches")) return "intake-batches";
  if (filePath.includes("saved-searches")) return "saved-searches";
  if (filePath.includes("usage")) return "usage-events";
  return "runtime";
}

export function runtimeStoreDiagnostics() {
  const durable = durableRuntimeStoreConfigured();
  const production = productionRuntime();
  const mode = runtimeStoreMode();
  const requestedDurableMode = mode !== "local-filesystem";
  return {
    mode,
    adapter: "local-filesystem",
    durable,
    production,
    statefulWritesAllowed: !production || durable,
    state: production && !durable ? "Blocked" : durable ? "Operational" : "Local beta only",
    stateMatrix: runtimeStateTruthMatrix(),
    detail: production && !durable
      ? requestedDurableMode
        ? "Production stateful features are blocked because generic runtime writes still use the local filesystem adapter. Vercel KV is implemented for beta feedback only, not audit logs, tickets, package drafts, saved searches, or pending write queues."
        : "Production stateful features require a configured durable runtime store. Local filesystem state is blocked."
      : durable
        ? "Durable runtime store is configured for production readiness checks."
        : "Local filesystem runtime state is enabled for local rehearsal only; this is not beta or production durability proof."
  };
}

export function assertRuntimeWriteAllowed(category: RuntimeStateCategory) {
  if (productionRuntime() && !durableRuntimeStoreConfigured()) {
    throw new Error(`Durable runtime store required for production ${category} writes.`);
  }
}

export function isRuntimeWriteBlockedError(error: unknown): error is Error {
  return error instanceof Error && /^Durable runtime store required for production .+ writes\.$/.test(error.message);
}

export function runtimeWriteBlockedRouteError(category: RuntimeStateCategory, error: unknown) {
  const detail = isRuntimeWriteBlockedError(error) ? error.message : "Runtime store write failed.";
  return {
    status: 503 as const,
    body: {
      error: "Durable runtime store is required for this production write.",
      reasonCode: "runtime-store-required",
      category,
      detail
    }
  };
}

export function ensureRuntimeDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readRuntimeJsonFile<TRecord>(filePath: string, normalize: (input: unknown) => TRecord | null) {
  try {
    return normalize(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch {
    return null;
  }
}

function writeRuntimeFileAtomically(filePath: string, contents: string) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    fs.writeFileSync(tmpPath, contents, "utf8");
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // Best-effort temp cleanup; preserve original write failure.
    }
    throw error;
  }
}

export function writeRuntimeJsonFile(filePath: string, record: unknown) {
  assertRuntimeWriteAllowed(categoryForPath(filePath));
  ensureRuntimeDir(path.dirname(filePath));
  writeRuntimeFileAtomically(filePath, `${JSON.stringify(record, null, 2)}\n`);
}

export type RuntimeFileListOptions = {
  maxFilesFromEnd?: number;
};

function fileWindow(files: string[], options?: RuntimeFileListOptions) {
  const maxFiles = Math.trunc(options?.maxFilesFromEnd || 0);
  return maxFiles > 0 ? [...files].sort().slice(-maxFiles) : files;
}

export function listRuntimeFiles(dir: string, extension: string, options?: RuntimeFileListOptions) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(extension));
  return fileWindow(files, options)
    .map((file) => path.join(dir, file));
}

export function appendRuntimeJsonLine(filePath: string, record: unknown) {
  assertRuntimeWriteAllowed(categoryForPath(filePath));
  ensureRuntimeDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf8");
}

export type RuntimeJsonLinesOptions = {
  maxLinesFromEnd?: number;
};

function lineWindow(lines: string[], options?: RuntimeJsonLinesOptions) {
  const maxLines = Math.trunc(options?.maxLinesFromEnd || 0);
  return maxLines > 0 ? lines.slice(-maxLines) : lines;
}

export function readRuntimeJsonLines<TRecord>(
  filePath: string,
  normalize: (input: unknown) => TRecord | null,
  options?: RuntimeJsonLinesOptions
) {
  try {
    const lines = fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .filter(Boolean);
    return lineWindow(lines, options)
      .map((line) => {
        try {
          return normalize(JSON.parse(line));
        } catch {
          return null;
        }
      })
      .filter((record): record is TRecord => Boolean(record));
  } catch {
    return [];
  }
}
