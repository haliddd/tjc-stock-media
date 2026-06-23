#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-}"
RESOURCESPACE_URL="${RESOURCESPACE_URL:-${RESOURCESPACE_BASE_URL:-}}"

if [ -z "$BASE_URL" ]; then
  echo "FAIL: BASE_URL is required, e.g. https://<vercel-preview-url>" >&2
  exit 1
fi

if [ -z "$RESOURCESPACE_URL" ]; then
  echo "FAIL: RESOURCESPACE_URL or RESOURCESPACE_BASE_URL is required" >&2
  exit 1
fi

if printf '%s' "$BASE_URL" | grep -qi 'vercel.app$'; then
  :
fi

echo "Checking ResourceSpace staging..."
curl -fsSI "$RESOURCESPACE_URL" >/dev/null
echo "PASS: ResourceSpace reachable"

echo "Checking Vercel preview..."
curl -fsSI "$BASE_URL" >/dev/null
echo "PASS: Vercel preview reachable"

echo "Checking portal admin readiness..."
curl -fsS "$BASE_URL/api/admin/readiness?role=DAM%20Admin" | node -e '
let s=""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => {
  const data = JSON.parse(s);
  const text = JSON.stringify(data);
  if (/fallback demo/i.test(text)) throw new Error("Admin readiness appears to reference fallback demo data.");
  console.log("PASS: admin readiness JSON returned");
});
'

echo "Checking asset search..."
curl -fsS "$BASE_URL/api/assets/search?role=Viewer&limit=12" | node -e '
let s=""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => {
  const data = JSON.parse(s);
  const assets = data.assets || data.results || [];
  if (!Array.isArray(assets) || !assets.length) throw new Error("No assets returned.");
  const text = JSON.stringify(assets[0]);
  if (/sourcePath|masterDrivePath|originalUrl|signedUrl|privateUrl|checksumSha256/i.test(text)) {
    throw new Error("Viewer payload leaked source/original/private fields.");
  }
  console.log(`PASS: asset search returned ${assets.length} assets`);
});
'

echo "PASS: cloud beta smoke basic checks"
