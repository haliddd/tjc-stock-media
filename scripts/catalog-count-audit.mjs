#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const runtimeDir = path.join(root, ".runtime");
const exportDir = path.join(runtimeDir, "exports");
const reportDir = path.join(runtimeDir, "reports");
const meetingDir = path.join(root, "docs", "runs", `beta-meeting-${new Date().toISOString().slice(0, 10)}`);
const approvedDir = process.env.IMPORT_DIR || "/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Imported/MVP 2024";
const portalUrl = process.env.PORTAL_BASE_URL || "http://localhost:4871";

const photoExtensions = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".gif", ".webp", ".tif", ".tiff"]);

function safeListFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function latestExportPath() {
  const files = safeListFiles(exportDir)
    .filter((entry) => entry.isFile() && /^resourcespace-metadata-\d{8}-\d{6}\.csv$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const latest = files.at(-1);
  return latest ? path.join(exportDir, latest) : null;
}

function countApprovedSourcePhotos() {
  return safeListFiles(approvedDir)
    .filter((entry) => entry.isFile() && photoExtensions.has(path.extname(entry.name).toLowerCase()))
    .length;
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.length > 1);
}

function exportCounts(csvPath) {
  if (!csvPath) {
    return {
      path: null,
      totalRecords: 0,
      approvedRecords: 0,
      needsReviewRecords: 0,
      status: "blocked",
      detail: "No .runtime/exports/resourcespace-metadata-*.csv export found."
    };
  }
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const [header, ...data] = rows;
  const index = new Map(header.map((key, position) => [key.toLowerCase(), position]));
  const statusIndex = index.get("publish_status");
  const usageIndex = index.get("usage_scope");
  let approvedRecords = 0;
  for (const row of data) {
    const status = String(row[statusIndex] || "").toLowerCase();
    const usage = String(row[usageIndex] || "").toLowerCase();
    if (status.includes("approved") || usage === "public" || usage === "internal") approvedRecords += 1;
  }
  return {
    path: csvPath,
    totalRecords: data.length,
    approvedRecords,
    needsReviewRecords: Math.max(data.length - approvedRecords, 0),
    status: data.length ? "ok" : "blocked",
    detail: data.length ? "ResourceSpace metadata export present." : "ResourceSpace metadata export has no data rows."
  };
}

async function portalCounts() {
  try {
    const response = await fetch(`${portalUrl}/api/assets/search?limit=1`, {
      headers: { "x-tjc-local-beta-role": "Reviewer", Accept: "application/json" },
      signal: AbortSignal.timeout(5000)
    });
    const payload = await response.json();
    return {
      reachable: response.ok,
      status: response.status,
      total: payload.total ?? payload.counts?.matching ?? null,
      rawTotal: payload.counts?.rawTotal ?? null,
      source: payload.sourceStatus || payload.source || null
    };
  } catch (error) {
    return {
      reachable: false,
      status: 0,
      total: null,
      rawTotal: null,
      source: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function writeReports(report) {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.mkdirSync(meetingDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const jsonPath = path.join(reportDir, `catalog-count-audit-${stamp}.json`);
  const mdPath = path.join(meetingDir, "resource-count-report.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, `# Resource Count Report

- Generated: ${report.generatedAt}
- ResourceSpace export: ${report.export.path || "missing"}
- Export status: ${report.export.status}
- Export detail: ${report.export.detail}
- Export total records: ${report.export.totalRecords}
- Export approved records: ${report.export.approvedRecords}
- Export needs-review records: ${report.export.needsReviewRecords}
- Approved source folder: ${report.approvedSource.dir}
- Approved source photo count: ${report.approvedSource.photoCount}
- Portal reachable: ${report.portal.reachable}
- Portal total: ${report.portal.total ?? "unknown"}
- Portal raw total: ${report.portal.rawTotal ?? "unknown"}
- Portal source: ${report.portal.source?.label || report.portal.source?.adapter || "unknown"}

## Decision

${report.export.status === "ok"
    ? "ResourceSpace export exists. Portal can be validated against export counts."
    : "ResourceSpace export is blocked. Do not claim the 2000+ ResourceSpace catalog is visible until export/API is restored."}

## Safety

This audit reads metadata, API responses, and file names only. It does not rename, move, delete, copy, approve, or publish source media.
`);
  return { jsonPath, mdPath };
}

const report = {
  generatedAt: new Date().toISOString(),
  export: exportCounts(latestExportPath()),
  approvedSource: {
    dir: approvedDir,
    photoCount: countApprovedSourcePhotos()
  },
  portal: await portalCounts()
};

const outputs = writeReports(report);
console.log(JSON.stringify({ ...report, outputs }, null, 2));
