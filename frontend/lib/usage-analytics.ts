import fs from "node:fs";
import path from "node:path";
import { repoRoot, usageAnalyticsDbPath, usageAnalyticsEnabled } from "@/lib/env";
import { assertRuntimeWriteAllowed } from "@/lib/runtime-file-store";
import { safeEnumValue, safeFiniteNumber, safeNonNegativeInt } from "@/lib/persisted-record-safety";
import { normalizeRoleWithFallback } from "@/lib/permissions";
import { normalizeAssetId, normalizePersistedDisplayText, normalizeResourceSpaceRef, normalizeSafeRoutePath } from "@/lib/request-validation";
import type { DemoRole } from "@/lib/types";

export type UsageEventType =
  | "search"
  | "search_query"
  | "search_zero_result"
  | "filter_click"
  | "asset_view"
  | "asset_open"
  | "download_gate"
  | "blocked_download_intent"
  | "review_action"
  | "brand_kit_view"
  | "package_action";

export type UsageEventInput = {
  type: UsageEventType;
  role: DemoRole;
  actor?: string;
  assetId?: string;
  resourceSpaceId?: string;
  route?: string;
  query?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

type UsageMetricRow = {
  label: string;
  value: number;
};

type DailyUsageMetricRow = {
  date: string;
  value: number;
};

type SqliteStatement = {
  run: (...params: Array<string | number | null>) => unknown;
  all: (...params: Array<string | number | null>) => unknown[];
  get: (...params: Array<string | number | null>) => unknown;
};

type UsageDatabase = {
  exec: (sql: string) => unknown;
  prepare: (sql: string) => SqliteStatement;
};

type DatabaseSyncConstructor = new (file: string) => UsageDatabase;

const usageEventTypes: UsageEventType[] = [
  "search",
  "search_query",
  "search_zero_result",
  "filter_click",
  "asset_view",
  "asset_open",
  "download_gate",
  "blocked_download_intent",
  "review_action",
  "brand_kit_view",
  "package_action"
];

let db: UsageDatabase | null = null;
let sqliteUnavailable = false;

function dbFile() {
  return usageAnalyticsDbPath() || path.join(repoRoot(), ".runtime", "analytics", "portal-usage.sqlite");
}

function databaseConstructor(): DatabaseSyncConstructor | null {
  if (sqliteUnavailable) return null;
  try {
    const nativeRequire = eval("require") as (id: string) => { DatabaseSync?: DatabaseSyncConstructor };
    const sqlite = nativeRequire("node:sqlite");
    if (!sqlite.DatabaseSync) throw new Error("node:sqlite DatabaseSync unavailable");
    return sqlite.DatabaseSync;
  } catch {
    sqliteUnavailable = true;
    return null;
  }
}

function database() {
  if (db) return db;
  const DatabaseSync = databaseConstructor();
  if (!DatabaseSync) return null;
  const file = dbFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 2500;
    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      type TEXT NOT NULL,
      role TEXT NOT NULL,
      actor TEXT,
      asset_id TEXT,
      resource_space_id TEXT,
      route TEXT,
      query TEXT,
      metadata_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_usage_events_type_created ON usage_events(type, created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_events_asset ON usage_events(asset_id, resource_space_id);
  `);
  return db;
}

function safeRoute(value: unknown) {
  return normalizeSafeRoutePath(value);
}

function safeAssetId(value: unknown) {
  return normalizeAssetId(value);
}

function safeResourceSpaceId(value: unknown) {
  return normalizeResourceSpaceRef(value);
}

function safeType(value: unknown): UsageEventType {
  return safeEnumValue(value, usageEventTypes, "search");
}

function safeMetadata(value: UsageEventInput["metadata"]) {
  if (!value) return null;
  const entries = Object.entries(value)
    .slice(0, 24)
    .map(([key, item]) => {
      const safeKey = normalizePersistedDisplayText(key, 80);
      if (!safeKey || item === undefined) return null;
      if (typeof item === "number") return [safeKey, safeFiniteNumber(item)] as const;
      if (typeof item === "boolean" || item === null) return [safeKey, item] as const;
      return [safeKey, normalizePersistedDisplayText(item, 240)] as const;
    })
    .filter((entry): entry is readonly [string, string | number | boolean | null] => Boolean(entry));
  return entries.length ? JSON.stringify(Object.fromEntries(entries)) : null;
}

function safeUsageFailureReason() {
  return "usage-analytics-write-failed";
}

function usageActorLabel(role: DemoRole) {
  return role === "DAM Admin" ? "DAM Admin" : role === "Reviewer" ? "Reviewer" : role === "Contributor" ? "Contributor" : "Viewer";
}

function safeActor(value: unknown, role: DemoRole) {
  return normalizePersistedDisplayText(value, 160) || usageActorLabel(role);
}

function usageAnalyticsStorageMode() {
  return usageAnalyticsDbPath() ? "configured-sqlite" : "local-sqlite";
}

export function recordUsageEvent(event: UsageEventInput) {
  if (!usageAnalyticsEnabled()) return { recorded: false, reason: "usage-analytics-disabled" };
  try {
    assertRuntimeWriteAllowed("usage-events");
    const connection = database();
    if (!connection) return { recorded: false, reason: safeUsageFailureReason() };
    const stmt = connection.prepare(`
      INSERT INTO usage_events (created_at, type, role, actor, asset_id, resource_space_id, route, query, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      new Date().toISOString(),
      safeType(event.type),
      normalizeRoleWithFallback(event.role),
      safeActor(event.actor, normalizeRoleWithFallback(event.role)),
      event.assetId ? safeAssetId(event.assetId) || null : null,
      event.resourceSpaceId ? safeResourceSpaceId(event.resourceSpaceId) || null : null,
      event.route ? safeRoute(event.route) || null : null,
      event.query ? normalizePersistedDisplayText(event.query, 200) || null : null,
      safeMetadata(event.metadata)
    );
    return { recorded: true };
  } catch {
    return { recorded: false, reason: safeUsageFailureReason() };
  }
}

function metricRows(types: UsageEventType | UsageEventType[], column: "query" | "asset_id", limit = 5): UsageMetricRow[] {
  if (!usageAnalyticsEnabled()) return [];
  try {
    const connection = database();
    if (!connection) return [];
    const requestedTypes = Array.isArray(types) ? types : [types];
    const placeholders = requestedTypes.map(() => "?").join(", ");
    const rows = connection
      .prepare(`
        SELECT ${column} AS label, COUNT(*) AS value
        FROM usage_events
        WHERE type IN (${placeholders}) AND ${column} IS NOT NULL AND ${column} <> ''
        GROUP BY ${column}
        ORDER BY value DESC, label ASC
        LIMIT ?
      `)
      .all(...requestedTypes, limit) as Array<{ label?: string; value?: number }>;
    return rows
      .filter((row): row is { label: string; value: number } => Boolean(row.label))
      .map((row) => ({
        label: column === "asset_id" ? safeAssetId(row.label) : normalizePersistedDisplayText(row.label, 200),
        value: safeNonNegativeInt(row.value)
      }))
      .filter((row) => Boolean(row.label));
  } catch {
    return [];
  }
}

function dailyEventRows(limit = 14): DailyUsageMetricRow[] {
  if (!usageAnalyticsEnabled()) return [];
  try {
    const connection = database();
    if (!connection) return [];
    const rows = connection
      .prepare(`
        SELECT substr(created_at, 1, 10) AS label, COUNT(*) AS value
        FROM usage_events
        GROUP BY substr(created_at, 1, 10)
        ORDER BY label DESC
        LIMIT ?
      `)
      .all(limit) as Array<{ label?: string; value?: number }>;
    return rows
      .filter((row): row is { label: string; value: number } => Boolean(row.label))
      .map((row) => ({ date: /^\d{4}-\d{2}-\d{2}$/.test(row.label) ? row.label : "1970-01-01", value: safeNonNegativeInt(row.value) }))
      .reverse();
  } catch {
    return [];
  }
}

export function usageAnalyticsDiagnostics() {
  if (!usageAnalyticsEnabled()) {
    return {
      enabled: false,
      storageMode: usageAnalyticsStorageMode(),
      totalEvents: 0,
      topSearches: [] as UsageMetricRow[],
      topAssets: [] as UsageMetricRow[],
      dailyEvents: [] as DailyUsageMetricRow[]
    };
  }
  try {
    const connection = database();
    if (!connection) {
      return {
        enabled: true,
        storageMode: usageAnalyticsStorageMode(),
        totalEvents: 0,
        topSearches: [] as UsageMetricRow[],
        topAssets: [] as UsageMetricRow[],
        dailyEvents: [] as DailyUsageMetricRow[]
      };
    }
    const total = connection.prepare("SELECT COUNT(*) AS count FROM usage_events").get() as { count?: number };
    return {
      enabled: true,
      storageMode: usageAnalyticsStorageMode(),
      totalEvents: safeNonNegativeInt(total.count),
      topSearches: metricRows(["search_query", "search"], "query"),
      topAssets: metricRows(["asset_open", "asset_view"], "asset_id"),
      dailyEvents: dailyEventRows()
    };
  } catch {
    return {
      enabled: true,
      storageMode: usageAnalyticsStorageMode(),
      totalEvents: 0,
      topSearches: [] as UsageMetricRow[],
      topAssets: [] as UsageMetricRow[],
      dailyEvents: [] as DailyUsageMetricRow[]
    };
  }
}
