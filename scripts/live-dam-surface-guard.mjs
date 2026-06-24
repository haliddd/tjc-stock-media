#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const routeSurfacePath = "frontend/lib/dam/enterprise-route-surface.json";
const canonicalSlimRoutePaths = new Set([
  "/",
  "/library",
  "/assets/[id]",
  "/collections",
  "/collections/[collectionId]",
  "/requests",
  "/requests/[requestId]",
  "/review",
  "/upload"
]);
const supportedSlimAliasRoutePaths = new Set([
  "/library/[assetId]"
]);
const legacyModules = [
  "AdminPage",
  "ReviewPage",
  "LibraryPage",
  "AssetDetailPage",
  "CollectionsPage",
  "DamExperience"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([".next", "node_modules"].includes(entry.name)) return [];
      return walk(relativePath);
    }
    return /\.(tsx|ts|jsx|js|mjs)$/.test(entry.name) ? [relativePath] : [];
  });
}

const failures = [];
let slimRoutes = [];

try {
  const surface = JSON.parse(read(routeSurfacePath));
  const routePaths = new Set((surface.routes || []).map((route) => route.path));
  for (const routePath of canonicalSlimRoutePaths) {
    if (!routePaths.has(routePath)) failures.push(`missing canonical slim route in ${routeSurfacePath}: ${routePath}`);
  }
  slimRoutes = (surface.routes || []).filter((route) => route.routeFile && route.pageExport && (
    canonicalSlimRoutePaths.has(route.path) || supportedSlimAliasRoutePaths.has(route.path)
  ));
} catch (error) {
  failures.push(`missing or invalid slim route surface: ${routeSurfacePath} (${error.message})`);
}

for (const route of slimRoutes) {
  const routePath = route.routeFile;
  if (!fs.existsSync(path.join(root, routePath))) {
    failures.push(`missing live route: ${routePath}`);
    continue;
  }
  const content = read(routePath);
  if (!content.includes('from "@/components/dam/EnterpriseDamPages"')) {
    failures.push(`${routePath} must import a slim Atlas page from EnterpriseDamPages`);
  }
  if (!/return\s+<([A-Z][A-Za-z0-9]*)\b/.test(content)) {
    failures.push(`${routePath} must render a slim Atlas page`);
  }
}

const assetDetailRoutes = slimRoutes.filter((route) => route.pathParam);
for (const route of assetDetailRoutes) {
  const routePath = route.routeFile;
  const paramName = route.pathParam;
  const assetDetailPage = read(routePath);
  if (!assetDetailPage.includes(`normalizeAssetId((await params).${paramName})`)) {
    failures.push(`${routePath} must normalize path params through normalizeAssetId before rendering the client DAM shell`);
  }
  if (!assetDetailPage.includes("notFound()")) {
    failures.push(`${routePath} must render Next 404 for malformed asset ids`);
  }
}

const legacyImportPattern = new RegExp(`@/components/(${legacyModules.join("|")})(?:\\b|["'])`);
for (const file of walk("frontend")) {
  if (file.startsWith("frontend/components/dam/enterprise/")) continue;
  const content = read(file);
  if (legacyImportPattern.test(content)) {
    failures.push(`${file} imports a quarantined legacy page module`);
  }
}

if (failures.length) {
  console.error("Slim Atlas surface guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Slim Atlas surface guard passed.");
