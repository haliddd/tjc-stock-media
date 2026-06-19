#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4867}"
CURL_MAX_TIME="${PORTAL_PACKAGE_SMOKE_CURL_MAX_TIME:-30}"
MARKER="package-smoke-$(date -u +%Y%m%dT%H%M%SZ)-$$"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portal-smoke-trusted-identity.sh"
TMP_DIR="$(mktemp -d)"
cleanup() {
  MARKER="$MARKER" node <<'NODE' >/dev/null 2>&1 || true
const fs = require("fs");
const path = require("path");
const marker = process.env.MARKER;
const filePath = path.join(process.cwd(), "data", "runtime", "package-drafts.json");
if (!marker || !fs.existsSync(filePath)) process.exit(0);
const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));
const kept = Array.isArray(rows) ? rows.filter((row) => !JSON.stringify(row).includes(marker)) : rows;
fs.writeFileSync(filePath, `${JSON.stringify(kept, null, 2)}\n`);
NODE
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

http_code() {
  local output="$1"
  shift
  portal_smoke_http_code "$output" "$@"
}

expect_json_status() {
  local expected="$1"
  local label="$2"
  local script="$3"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 3
  local code
  code="$(http_code "$output" "$@")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected $expected got $code"
    cat "$output"
    exit 1
  fi
  node -e "$script" < "$output"
  echo "PASS: $label"
}

package_id="pkg-$MARKER"
stale_package_id="pkg-stale-$MARKER"
local_runtime_probe=0
case "$BASE_URL" in
  http://localhost:*|http://127.0.0.1:*) local_runtime_probe=1 ;;
esac

expect_json_status 403 package-viewer-list-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/Reviewer|DAM Admin/i.test(data.error || "")) {
  console.error(`FAIL: viewer package list denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "$BASE_URL/api/packages?role=Viewer"

expect_json_status 403 package-viewer-save-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/Contributor|Reviewer|DAM Admin/i.test(data.error || "")) {
  console.error(`FAIL: viewer package save denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"id\":\"$package_id\",\"title\":\"Viewer should not save\"}" \
  "$BASE_URL/api/packages"

PACKAGE_ID="$package_id" expect_json_status 200 package-contributor-save-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.PACKAGE_ID;
if (data.ok !== true || data.storageMode !== "local-json" || data.package?.id !== id) {
  console.error(`FAIL: package save shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
if (data.package.createdBy !== "Contributor" || data.package.role !== "Contributor") {
  console.error(`FAIL: package save missing actor/role: ${JSON.stringify(data.package).slice(0, 500)}`);
  process.exit(1);
}
if (/local-beta:|sso:|@/i.test(data.package.createdBy || "")) {
  console.error(`FAIL: package save response leaked creator identity: ${JSON.stringify(data.package).slice(0, 500)}`);
  process.exit(1);
}
const sections = data.package.sections || [];
const refs = sections.flatMap((section) => section.resourceSpaceAssetIds || []);
if (refs.includes("../private") || refs.some((ref) => /^[a-f0-9]{32,}$/i.test(ref)) || refs.length !== new Set(refs).size || refs.length > 2) {
  console.error(`FAIL: package refs were not sanitized/deduped: ${JSON.stringify(refs)}`);
  process.exit(1);
}
if (data.package.collectionId || sections.some((section) => /source path|master drive|checksum|private|[a-f0-9]{32,}/i.test(`${section.id || ""} ${section.title || ""}`))) {
  console.error(`FAIL: package identifiers were not sanitized: ${JSON.stringify(data.package).slice(0, 700)}`);
  process.exit(1);
}
if (!data.package.governance || typeof data.package.governance.totalRefs !== "number") {
  console.error(`FAIL: package governance missing: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
const governanceText = JSON.stringify(data.governance || {});
const forbiddenGovernanceKeys = [
  "checksum",
  "checksum_sha256",
  "sourcePath",
  "source_path",
  "masterDrivePath",
  "sourceAlbum",
  "source_album",
  "sourceAlbumPath",
  "sourceAlbumMemberships",
  "originalFilename",
  "checksumSha256",
  "duplicateGroup",
  "duplicateRole",
  "fileSizeBytes",
  "pendingReviewWrite",
  "resourceSpaceId",
  "reuseDecision",
  "reviewer",
  "sourceAccount",
  "sourcePlatform",
  "sourceSystem",
  "workflowState",
  "sourceFolder",
  "approvalRecheckDate",
  "church",
  "consentExpirationDate",
  "controlledVocabularySource",
  "doctrineSacramentTheme",
  "duplicateSimilarityHint",
  "embargoDate",
  "expirationDate",
  "hymnNumberOrTitle",
  "importBatch",
  "language",
  "masterCustodyPathStatus",
  "publicationTitle",
  "publishDate",
  "region",
  "religiousEducationLevel",
  "resource_space_id",
  "review_status",
  "reviewedBy",
  "reviewed_by",
  "reviewedAt",
  "reviewed_at",
  "rights_status",
  "rightsExpirationDate",
  "sermonTitle",
  "source_album",
  "syncSource",
  "sync_source",
  "approvedForPublic",
  "approved_for_public",
  "approvedForInternal",
  "approved_for_internal",
  "lastSyncedAt",
  "last_synced_at",
  "suggestedTags",
  "testimonyTheme",
  "versionOrEdition",
  "withdrawalStatus"
];
if (!data.governance?.sections?.length || forbiddenGovernanceKeys.some((key) => governanceText.includes(`"${key}"`)) || /"sourcePath"|"masterDrivePath"|"sourceAlbum"|"source_album"|"source_path"|"sourceAlbumPath"|"sourceAlbumMemberships"|"originalFilename"|"checksum"|"checksum_sha256"|"checksumSha256"|"duplicateGroup"|"duplicateRole"|"fileSizeBytes"|"pendingReviewWrite"|"resourceSpaceId"|"resource_space_id"|"review_status"|"reviewedBy"|"reviewed_by"|"reviewedAt"|"reviewed_at"|"reuseDecision"|"reviewer"|"rights_status"|"sourceAccount"|"sourcePlatform"|"sourceSystem"|"syncSource"|"sync_source"|"approvedForPublic"|"approved_for_public"|"approvedForInternal"|"approved_for_internal"|"lastSyncedAt"|"last_synced_at"|"workflowState"/.test(governanceText) || /source path|master drive|checksum|original filename|ResourceSpace ID|\bRS\s+\d+\b|[a-f0-9]{32,}/i.test(governanceText)) {
  console.error(`FAIL: package governance payload leaked private source metadata: ${governanceText.slice(0, 700)}`);
  process.exit(1);
}
const text = JSON.stringify(data.package);
if (text.includes("../private") || /source path|master drive|checksum|[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: package display fields echoed unsafe text: ${text.slice(0, 700)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Contributor\",\"id\":\"$package_id\",\"title\":\"$MARKER ministry toolkit\",\"description\":\"../private source path\",\"collectionId\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"sections\":[{\"id\":\"hero\",\"title\":\"Hero section\",\"resourceSpaceAssetIds\":[\"367\",\"367\",\"../private\",\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"368\"]},{\"id\":\"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\",\"title\":\"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\",\"resourceSpaceAssetIds\":[\"367\"]}]}" \
  "$BASE_URL/api/packages?role=Contributor"

if [ "$local_runtime_probe" = "1" ]; then
  STALE_PACKAGE_ID="$stale_package_id" node <<'NODE'
const fs = require("fs");
const path = require("path");
const filePath = path.join(process.cwd(), "data", "runtime", "package-drafts.json");
fs.mkdirSync(path.dirname(filePath), { recursive: true });
const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
const filler = Array.from({ length: 210 }, (_, index) => ({
  id: `${process.env.STALE_PACKAGE_ID}-filler-${index}`,
  title: `Oversized local-json package filler ${index}`,
  status: "draft",
  sections: [{
    id: "hero",
    title: "Hero",
    resourceSpaceAssetIds: ["367"]
  }],
  createdAt: `2000-01-01T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
  updatedAt: `2000-01-01T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
  createdBy: "package-smoke:filler",
  role: "Reviewer",
  governance: {
    canPreview: true,
    canShare: false,
    canPublish: false,
    totalRefs: 1,
    portalReadyRefs: 0,
    blockedRefs: 1,
    missingRefs: 0,
    reason: "Filler local-json cap probe"
  },
  storageMode: "local-json"
}));
existing.unshift({
  id: process.env.STALE_PACKAGE_ID,
  title: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  description: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  status: "unsafe",
  sections: [{
    id: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    title: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    resourceSpaceAssetIds: ["367", "../private", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "367"]
  }],
  createdAt: "not-a-date",
  updatedAt: "2030-01-01T00:00:00.000Z",
  createdBy: "1111111111111111111111111111111111111111111111111111111111111111",
  role: "Viewer",
  governance: {
    canPreview: "yes",
    canShare: "yes",
    canPublish: "yes",
    totalRefs: -10,
    portalReadyRefs: "bad",
    blockedRefs: -5,
    missingRefs: -2,
    reason: "2222222222222222222222222222222222222222222222222222222222222222"
  },
  storageMode: "local-json"
}, ...filler);
fs.writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`);
NODE
fi

stale_package_probe_id=""
if [ "$local_runtime_probe" = "1" ]; then
  stale_package_probe_id="$stale_package_id"
fi

PACKAGE_ID="$package_id" STALE_PACKAGE_ID="$stale_package_probe_id" expect_json_status 200 package-reviewer-list-visible '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.PACKAGE_ID;
const staleId = process.env.STALE_PACKAGE_ID;
if (!Array.isArray(data.packages) || data.storageMode !== "local-json") {
  console.error(`FAIL: package list shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
if (data.count > 200 || data.packages.length > 200) {
  console.error(`FAIL: package local-json list was not capped: ${JSON.stringify({ count: data.count, length: data.packages.length })}`);
  process.exit(1);
}
const record = data.packages.find((item) => item.id === id);
if (!record || record.storageMode !== "local-json" || !record.governance) {
  console.error(`FAIL: saved package not visible to Reviewer: ${JSON.stringify({ id, count: data.count, record }).slice(0, 500)}`);
  process.exit(1);
}
if (staleId) {
  const stale = data.packages.find((item) => item.id === staleId);
  const refs = (stale?.sections || []).flatMap((section) => section.resourceSpaceAssetIds || []);
  const text = JSON.stringify(stale || {});
  if (!stale || stale.title !== "ResourceSpace Toolkit Draft" || stale.sections?.[0]?.id !== "section-1" || stale.sections?.[0]?.title !== "Section 1" || stale.createdBy !== "local-beta:unknown" || stale.status !== "draft" || stale.role === "Viewer" || refs.includes("../private") || refs.some((ref) => /^[a-f0-9]{32,}$/i.test(ref)) || refs.length !== new Set(refs).size || stale.governance?.canPublish || stale.governance?.totalRefs !== 0 || stale.governance?.reason || text.includes("../private") || /source path|master drive|checksum|[a-f0-9]{32,}/i.test(text)) {
    console.error(`FAIL: persisted unsafe package was not normalized: ${JSON.stringify(stale || null).slice(0, 500)}`);
    process.exit(1);
  }
}
' "$BASE_URL/api/packages?role=Reviewer"

expect_json_status 200 package-readiness-reports-storage '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const item = (data.integrationReadiness || []).find((entry) => entry.id === "package-draft-storage");
if (!item) {
  console.error("FAIL: admin readiness missing package-draft-storage item");
  process.exit(1);
}
if (!/local-json/i.test(item.detail || "") || !/wider rollout/i.test(item.detail || "")) {
  console.error(`FAIL: package draft readiness detail weak: ${JSON.stringify(item)}`);
  process.exit(1);
}
' "$BASE_URL/api/admin/readiness?role=DAM%20Admin"

echo "Portal package draft smoke complete."
