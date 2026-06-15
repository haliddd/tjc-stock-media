#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.env.PUBLIC_ENV_GUARD_ROOT || process.cwd();
const allowedPublicEnv = new Set([
  "NEXT_PUBLIC_BETA_TASK_MODE_ENABLED",
  "NEXT_PUBLIC_BETA_FEEDBACK_ENABLED",
  "NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH",
  "NEXT_PUBLIC_PORTAL_URL"
]);
const sensitiveNamePattern = /(KEY|TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL|RESOURCESPACE|RS_|S3_|AWS_|GOOGLE_|KV_|BLOB_|MYSQL|SSO_)/i;
const sourceExtensions = /\.(ts|tsx|js|jsx|mjs)$/;
const skipDirs = new Set([".next", "node_modules"]);

function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) return [];
      return walk(relativePath);
    }
    return sourceExtensions.test(entry.name) ? [relativePath] : [];
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const failures = [];

for (const envPath of [".env.production.example", ".env.example", ".env"]) {
  const fullPath = path.join(root, envPath);
  if (!fs.existsSync(fullPath)) continue;
  read(envPath).split("\n").forEach((line, index) => {
    const match = line.match(/^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=/);
    if (!match) return;
    const key = match[1];
    if (!allowedPublicEnv.has(key)) failures.push(`${envPath}:${index + 1} exposes unapproved public env ${key}`);
    if (sensitiveNamePattern.test(key)) failures.push(`${envPath}:${index + 1} public env name looks sensitive: ${key}`);
  });
}

const clientRoots = ["frontend/components", "frontend/app"];
for (const file of clientRoots.flatMap((dir) => walk(dir))) {
  if (file.startsWith("frontend/app/api/")) continue;
  const source = read(file);
  const matches = source.matchAll(/process\.env\.([A-Z0-9_]+)/g);
  for (const match of matches) {
    const key = match[1];
    if (!key.startsWith("NEXT_PUBLIC_")) failures.push(`${file} reads server env ${key} from client-rendered code`);
    if (key.startsWith("NEXT_PUBLIC_") && !allowedPublicEnv.has(key)) failures.push(`${file} reads unapproved public env ${key}`);
    if (key.startsWith("NEXT_PUBLIC_") && sensitiveNamePattern.test(key)) failures.push(`${file} public env name looks sensitive: ${key}`);
  }
}

if (failures.length) {
  console.error("Public env guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Public env guard passed.");
