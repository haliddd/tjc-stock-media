#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const frontendDir = path.join(root, "frontend");
const port = Number(process.env.PORTAL_BROWSER_QA_PORT || "4871");
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
const logDir = path.join(root, ".runtime", "browser-qa-server");
const stamp = new Date().toISOString().replace(/[:.]/g, "").replace("T", "T").replace("Z", "Z");
const logPath = path.join(logDir, `${stamp}.log`);
let server;

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`Invalid PORTAL_BROWSER_QA_PORT: ${process.env.PORTAL_BROWSER_QA_PORT || ""}`);
  process.exit(1);
}

execFileSync(process.execPath, ["scripts/safe-lane-headroom-guard.mjs"], {
  stdio: "inherit",
  env: { ...process.env, SAFE_LANE_HEADROOM_CONTEXT: "browser-qa-owned-server" }
});

fs.mkdirSync(logDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function portOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`browser QA server exited early with code ${server.exitCode}; see ${logPath}`);
    }
    try {
      const response = await fetch(new URL("/api/beta-auth/session", baseUrl), {
        headers: { Accept: "application/json" }
      });
      if (response.status < 500) return;
    } catch {
      // Retry until Next is ready.
    }
    await sleep(500);
  }
  throw new Error(`browser QA server did not become ready at ${baseUrl}; see ${logPath}`);
}

function terminateServer() {
  if (!server || server.exitCode !== null) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    try {
      server.kill("SIGTERM");
    } catch {
      // Best effort cleanup; final port check below catches leftovers.
    }
  }
}

function runQa() {
  return new Promise((resolve) => {
    const qa = spawn(process.execPath, ["scripts/portal-browser-qa.mjs"], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        BASE_URL: baseUrl,
        PORTAL_QA_TRUSTED_HEADERS: process.env.PORTAL_QA_TRUSTED_HEADERS || "1"
      }
    });
    qa.on("exit", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    terminateServer();
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}

if (await portOpen()) {
  console.error(`Refusing to run browser QA: ${baseUrl} is already listening. Stop port ${port} first so this harness owns the isolated server lifecycle.`);
  process.exit(1);
}

const log = fs.createWriteStream(logPath, { flags: "a" });
server = spawn("npx", ["next", "dev", "--port", String(port)], {
  cwd: frontendDir,
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    SSO_TRUSTED_HEADERS: "1",
    PORTAL_ALLOW_BETA_ROLE_OVERRIDE: "0",
    NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH: "0",
    DOWNLOAD_GATE_ALLOW_DEMO_ROLES: "0",
    TJC_STOCK_MEDIA_ROOT: root
  }
});

server.stdout.pipe(log);
server.stderr.pipe(log);

let exitCode = 1;
try {
  await waitForServer();
  console.log(`Browser QA server ready at ${baseUrl}; log ${logPath}`);
  const result = await runQa();
  exitCode = result.code;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  terminateServer();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await portOpen())) break;
    await sleep(250);
  }
  log.end();
}

if (await portOpen()) {
  console.error(`Browser QA server cleanup failed: ${baseUrl} is still listening.`);
  process.exit(1);
}

process.exit(exitCode);
