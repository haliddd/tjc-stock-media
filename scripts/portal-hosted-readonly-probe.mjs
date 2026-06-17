#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

execFileSync(process.execPath, ["scripts/safe-lane-headroom-guard.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    SAFE_LANE_HEADROOM_CONTEXT: process.env.SAFE_LANE_HEADROOM_CONTEXT || "portal-hosted-readonly-probe"
  }
});

const base = (process.env.BASE_URL || "https://tjc-stock-media.vercel.app").replace(/\/$/, "");
const outputPath = process.env.HOSTED_READONLY_PROBE_OUTPUT
  || path.join("docs", "runs", "evidence", "2026-06-15", "hosted-readonly-probes", "summary.json");
const timeoutMs = Number.parseInt(process.env.HOSTED_READONLY_PROBE_TIMEOUT_MS || "20000", 10);

const probes = [
  { id: "root-head", method: "HEAD", path: "/" },
  { id: "session-get", method: "GET", path: "/api/beta-auth/session" },
  { id: "review-query-role", method: "GET", path: "/api/review?role=Reviewer&queue=pending" },
  { id: "admin-query-role", method: "GET", path: "/api/admin/readiness?role=DAM%20Admin" },
  { id: "asset-admin-query-role", method: "GET", path: "/api/assets/367?role=DAM%20Admin" },
  { id: "blocked-download-viewer", method: "GET", path: "/api/download/368?role=Viewer" }
];

const forbidden = /sourcePath|masterDrivePath|sourceAlbumPath|checksumSha256|originalUrl|signedUrl|privateUrl|BLOB_READ_WRITE_TOKEN|KV_REST_API_TOKEN|RESOURCESPACE_API_KEY|RS_API_KEY|AWS_SECRET|BEGIN PRIVATE KEY/i;

async function probe({ id, method, path: routePath }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${base}${routePath}`;
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "accept": method === "HEAD" ? "*/*" : "application/json,text/html;q=0.9,*/*;q=0.8",
        "user-agent": "tjc-stock-media-readonly-probe/1.0"
      }
    });
    const contentType = response.headers.get("content-type") || "";
    const body = method === "HEAD" ? "" : await response.text();
    let jsonKeys = [];
    let buildContract = null;
    let buildCommitShort = null;
    let routeSurface = null;
    let contentShape = "non-json";
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        jsonKeys = Object.keys(parsed).sort().slice(0, 20);
        contentShape = "json-object";
        if (parsed.build && typeof parsed.build === "object" && !Array.isArray(parsed.build)) {
          buildContract = typeof parsed.build.readinessContract === "string" ? parsed.build.readinessContract.slice(0, 80) : null;
          buildCommitShort = typeof parsed.build.commitShort === "string" ? parsed.build.commitShort.slice(0, 40) : null;
          routeSurface = parsed.build.routeSurface && typeof parsed.build.routeSurface === "object" && !Array.isArray(parsed.build.routeSurface)
            ? {
                routeCount: Number.isFinite(parsed.build.routeSurface.routeCount) ? parsed.build.routeSurface.routeCount : null,
                navItemCount: Number.isFinite(parsed.build.routeSurface.navItemCount) ? parsed.build.routeSurface.navItemCount : null,
                homePage: typeof parsed.build.routeSurface.homePage === "string" ? parsed.build.routeSurface.homePage.slice(0, 80) : null,
                uploadPage: typeof parsed.build.routeSurface.uploadPage === "string" ? parsed.build.routeSurface.uploadPage.slice(0, 80) : null
              }
            : null;
        }
      } else if (Array.isArray(parsed)) {
        contentShape = "json-array";
      }
    } catch {
      contentShape = contentType.includes("json") ? "invalid-json" : "non-json";
    }
    const forbiddenPatternFound = forbidden.test(body);
    const adminShapeFound = /"readiness"\s*:|"betaReadiness"\s*:|"auditLog"\s*:/i.test(body);
    const reviewShapeFound = /"canReview"\s*:|"queues"\s*:|"assets"\s*:/i.test(body);
    const sessionShapeFound = /"authenticated"\s*:|"user"\s*:/i.test(body);
    const privilegedShapeFound = adminShapeFound || reviewShapeFound || (id !== "session-get" && sessionShapeFound);
    return {
      id,
      method,
      path: routePath,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType,
      bodyBytes: Buffer.byteLength(body),
      contentShape,
      jsonKeys,
      buildContract,
      buildCommitShort,
      routeSurface,
      forbiddenPatternFound,
      adminShapeFound,
      reviewShapeFound,
      sessionShapeFound,
      privilegedShapeFound
    };
  } catch (error) {
    return {
      id,
      method,
      path: routePath,
      ok: false,
      status: 0,
      finalUrl: url,
      contentType: "",
      bodyBytes: 0,
      contentShape: "request-error",
      jsonKeys: [],
      forbiddenPatternFound: false,
      adminShapeFound: false,
      reviewShapeFound: false,
      sessionShapeFound: false,
      privilegedShapeFound: false,
      error: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200)
    };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const item of probes) {
  results.push(await probe(item));
}

const summary = {
  checkedAt: new Date().toISOString(),
  base,
  note: "Read-only hosted probes only. No POST, no hosted writeback, no env mutation, no raw bodies or headers stored.",
  results
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

const failedRequest = results.find((result) => result.status === 0);
const failedProbe = results.find((result) => result.status === 0 || result.forbiddenPatternFound || result.privilegedShapeFound);
if (failedRequest || failedProbe) process.exit(1);
