import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertRuntimeWriteAllowed, type RuntimeStateCategory } from "@/lib/runtime-file-store";

export type LocalJsonStoreOptions<TRecord> = {
  filePath: () => string;
  maxRecords: number;
  normalize: (input: unknown) => TRecord | null;
  order: (records: TRecord[]) => TRecord[];
  memoryStore?: () => TRecord[];
  localFileEnabled?: () => boolean;
};

function localFilesEnabled<TRecord>(options: LocalJsonStoreOptions<TRecord>) {
  return options.localFileEnabled ? options.localFileEnabled() : true;
}

function categoryForPath(filePath: string): RuntimeStateCategory {
  if (filePath.includes("beta-feedback")) return "beta-feedback";
  if (filePath.includes("package-drafts")) return "package-drafts";
  if (filePath.includes("request-records")) return "request-records";
  if (filePath.includes("saved-searches")) return "saved-searches";
  if (filePath.includes("usage")) return "usage-events";
  return "runtime";
}

function normalizeWindow<TRecord>(records: unknown[], options: LocalJsonStoreOptions<TRecord>) {
  return options.order(records.map(options.normalize).filter(Boolean) as TRecord[]).slice(0, options.maxRecords);
}

function memoryWindow<TRecord>(options: LocalJsonStoreOptions<TRecord>) {
  return options.memoryStore ? normalizeWindow(options.memoryStore(), options) : [];
}

function replaceMemory<TRecord>(records: TRecord[], options: LocalJsonStoreOptions<TRecord>) {
  const store = options.memoryStore?.();
  if (!store) return false;
  store.splice(0, store.length, ...normalizeWindow(records, options));
  return true;
}

function tempFilePath(filePath: string) {
  return `${filePath}.${process.pid}.${Date.now()}.${randomUUID().slice(0, 8)}.tmp`;
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function normalizeParsedArray<TRecord>(parsed: unknown, options: LocalJsonStoreOptions<TRecord>) {
  if (!Array.isArray(parsed)) {
    throw new Error(`Local JSON store must contain an array: ${options.filePath()}`);
  }
  return normalizeWindow(parsed, options);
}

export async function readLocalJsonStore<TRecord>(options: LocalJsonStoreOptions<TRecord>) {
  if (!localFilesEnabled(options)) return memoryWindow(options);
  try {
    const raw = await readFile(options.filePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeParsedArray(parsed, options);
  } catch (error) {
    if (isMissingFileError(error)) return memoryWindow(options);
    throw error;
  }
}

export async function writeLocalJsonStore<TRecord>(records: TRecord[], options: LocalJsonStoreOptions<TRecord>) {
  const windowed = normalizeWindow(records, options);
  if (!localFilesEnabled(options)) {
    replaceMemory(windowed, options);
    return;
  }
  assertRuntimeWriteAllowed(categoryForPath(options.filePath()));
  const filePath = options.filePath();
  let tmpPath = "";
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    tmpPath = tempFilePath(filePath);
    await writeFile(tmpPath, `${JSON.stringify(windowed, null, 2)}\n`);
    await rename(tmpPath, filePath);
  } catch (error) {
    if (tmpPath) await unlink(tmpPath).catch(() => undefined);
    throw error;
  }
}

export function readLocalJsonStoreSync<TRecord>(options: LocalJsonStoreOptions<TRecord>) {
  if (!localFilesEnabled(options)) return memoryWindow(options);
  try {
    const parsed = JSON.parse(fs.readFileSync(options.filePath(), "utf8")) as unknown;
    return normalizeParsedArray(parsed, options);
  } catch (error) {
    if (isMissingFileError(error)) return memoryWindow(options);
    throw error;
  }
}
