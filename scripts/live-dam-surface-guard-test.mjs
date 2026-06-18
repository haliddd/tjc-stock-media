#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/live-dam-surface-guard.mjs");
const routeSurfacePath = "frontend/lib/dam/enterprise-route-surface.json";
const routeSurface = JSON.parse(fs.readFileSync(path.join(root, routeSurfacePath), "utf8"));
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-live-dam-surface-guard-")));
const failures = [];

const enterpriseRoutes = routeSurface.routes.filter((route) => route.routeFile && route.pageExport);

function cleanup() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function write(targetRoot, relativePath, source) {
  const target = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

function routeSource(exportName, extra = "") {
  return `
import { ${exportName} } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }) {
  ${extra}
  return <${exportName} />;
}
`;
}

function writeValidFixture(targetRoot) {
  write(targetRoot, "frontend/components/dam/EnterpriseDamPages.tsx", "export const marker = true;\n");
  write(targetRoot, routeSurfacePath, `${JSON.stringify(routeSurface, null, 2)}\n`);
  for (const route of enterpriseRoutes) {
    const routePath = route.routeFile;
    const exportName = route.pageExport;
    const extra = routePath.includes("assets/[id]")
      ? "const id = normalizeAssetId((await params).id); if (!id) notFound();"
      : routePath.includes("library/[assetId]")
        ? "const assetId = normalizeAssetId((await params).assetId); if (!assetId) notFound();"
      : "";
    write(targetRoot, routePath, routeSource(exportName, extra));
  }
  write(targetRoot, "frontend/components/dam/enterprise/LegacyQuarantineAllowed.tsx", 'import { AdminPage } from "@/components/AdminPage";\n');
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  writeValidFixture(targetRoot);
  return targetRoot;
}

function runGuard(targetRoot) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: targetRoot,
    encoding: "utf8"
  });
}

function outputFor(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

function expectPass(label, setup) {
  if (label === "current-real-lane") {
    const result = spawnSync(process.execPath, [guardPath], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) failures.push(`${label} should pass:\n${outputFor(result)}`);
    return;
  }
  const targetRoot = fixturePath(label);
  if (setup) setup(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status !== 0) failures.push(`${label} should pass:\n${outputFor(result)}`);
}

function expectFail(label, setup, expectedText) {
  const targetRoot = fixturePath(label);
  setup(targetRoot);
  const result = runGuard(targetRoot);
  const output = outputFor(result);
  if (result.status === 0) {
    failures.push(`${label} should fail but passed:\n${output}`);
    return;
  }
  if (expectedText && !output.includes(expectedText)) {
    failures.push(`${label} failure should mention ${expectedText}:\n${output}`);
  }
}

expectPass("current-real-lane");
expectPass("fixture-valid");

expectFail("missing-enterprise-route-import", (targetRoot) => {
  write(targetRoot, "frontend/app/review/page.tsx", `
import { ReviewPage } from "@/components/dam/enterprise/ReviewPage";

export default function Page() {
  return <ReviewPage />;
}
`);
}, "frontend/app/review/page.tsx must import EnterpriseReviewPage from EnterpriseDamPages");

expectFail("missing-enterprise-route-render", (targetRoot) => {
  write(targetRoot, "frontend/app/packages/page.tsx", `
import { EnterprisePackageBuilderPage } from "@/components/dam/EnterpriseDamPages";

export default function Page() {
  return null;
}
`);
}, "frontend/app/packages/page.tsx must render EnterprisePackageBuilderPage");

expectFail("missing-library-alias-route-import", (targetRoot) => {
  write(targetRoot, "frontend/app/library/page.tsx", `
import { LibraryPage } from "@/components/dam/enterprise/LibraryPage";

export default function Page() {
  return <LibraryPage />;
}
`);
}, "frontend/app/library/page.tsx must import EnterpriseLibraryPage from EnterpriseDamPages");

expectFail("route-surface-page-export-drift", (targetRoot) => {
  const driftedSurface = structuredClone(routeSurface);
  const reviewRoute = driftedSurface.routes.find((route) => route.routeFile === "frontend/app/review/page.tsx");
  reviewRoute.pageExport = "EnterpriseLibraryPage";
  write(targetRoot, routeSurfacePath, `${JSON.stringify(driftedSurface, null, 2)}\n`);
}, "frontend/app/review/page.tsx must import EnterpriseLibraryPage from EnterpriseDamPages");

expectFail("asset-detail-missing-normalization", (targetRoot) => {
  write(targetRoot, "frontend/app/assets/[id]/page.tsx", routeSource("EnterpriseAssetDetailPage", "const id = (await params).id; if (!id) notFound();"));
}, "frontend/app/assets/[id]/page.tsx must normalize path params through normalizeAssetId");

expectFail("library-asset-detail-missing-normalization", (targetRoot) => {
  write(targetRoot, "frontend/app/library/[assetId]/page.tsx", routeSource("EnterpriseAssetDetailPage", "const assetId = (await params).assetId; if (!assetId) notFound();"));
}, "frontend/app/library/[assetId]/page.tsx must normalize path params through normalizeAssetId");

expectFail("asset-detail-missing-not-found", (targetRoot) => {
  write(targetRoot, "frontend/app/assets/[id]/page.tsx", routeSource("EnterpriseAssetDetailPage", "const id = normalizeAssetId((await params).id);"));
}, "frontend/app/assets/[id]/page.tsx must render Next 404 for malformed asset ids");

expectFail("legacy-page-import-leak", (targetRoot) => {
  write(targetRoot, "frontend/components/LegacyLeak.tsx", 'import { AdminPage } from "@/components/AdminPage";\nexport function Leak() { return null; }\n');
}, "frontend/components/LegacyLeak.tsx imports a quarantined legacy page module");

if (failures.length) {
  console.error("Live DAM surface guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  cleanup();
  process.exit(1);
}

cleanup();
console.log("Live DAM surface guard self-test passed.");
