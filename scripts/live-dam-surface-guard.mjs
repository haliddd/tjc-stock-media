#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const routeSurfacePath = "frontend/lib/dam/enterprise-route-surface.json";
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

function readRouteSurface() {
  const surface = JSON.parse(read(routeSurfacePath));
  return surface.routes.filter((route) => route.routeFile && route.pageExport);
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
let enterpriseRoutes = [];

try {
  enterpriseRoutes = readRouteSurface();
} catch (error) {
  failures.push(`missing or invalid Enterprise route surface: ${routeSurfacePath} (${error.message})`);
}

for (const route of enterpriseRoutes) {
  const routePath = route.routeFile;
  const exportName = route.pageExport;
  if (!fs.existsSync(path.join(root, routePath))) {
    failures.push(`missing live route: ${routePath}`);
    continue;
  }
  const content = read(routePath);
  const expectedImport = `import { ${exportName} } from "@/components/dam/EnterpriseDamPages";`;
  if (!content.includes(expectedImport)) {
    failures.push(`${routePath} must import ${exportName} from EnterpriseDamPages`);
  }
  if (!content.includes(`<${exportName}`)) {
    failures.push(`${routePath} must render ${exportName}`);
  }
}

const assetDetailRoutes = enterpriseRoutes.filter((route) => route.pathParam);
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
  console.error("Live DAM surface guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Live DAM surface guard passed.");
