#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const wrapperPath = path.join(root, "scripts/portal-browser-qa-with-server.mjs");
const failures = [];
const wrapperSource = fs.readFileSync(wrapperPath, "utf8");

function outputFor(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

function listenOnRandomPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate TCP port.")));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

for (const [text, label] of [
  ["process.kill(-server.pid", "process-group cleanup"],
  ["latest.log", "current log pointer"],
  ["detached: true", "owned server process group"],
  ["Refusing to run browser QA", "pre-existing listener refusal"],
  ["owns the isolated server lifecycle", "isolated lifecycle refusal copy"],
  ["PORTAL_QA_TRUSTED_HEADERS", "trusted local QA headers"],
  ['SSO_PROVIDER: "cloudflare-access"', "production trusted-header provider"],
  ['SSO_TRUSTED_HEADERS: "1"', "trusted-header server role hydration"],
  ['PORTAL_ALLOW_BETA_ROLE_OVERRIDE: "0"', "server role override disabled"],
  ['NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH: "0"', "public beta role switch disabled"],
  ['DOWNLOAD_GATE_ALLOW_DEMO_ROLES: "0"', "demo role download gate disabled"],
  ["TJC_STOCK_MEDIA_ROOT: root", "isolated root env"],
  ["scripts/safe-lane-headroom-guard.mjs", "direct safe-lane headroom guard"],
  ["SAFE_LANE_HEADROOM_CONTEXT: \"browser-qa-owned-server\"", "owned-server headroom context"],
  ['fetch(new URL("/api/beta-auth/session", baseUrl)', "readiness probe against owned server"],
  ["Browser QA server cleanup failed", "post-run cleanup check"]
]) {
  if (!wrapperSource.includes(text)) failures.push(`wrapper source missing ${label}: ${text}`);
}

const { server, port } = await listenOnRandomPort();
try {
  const result = spawnSync(process.execPath, [wrapperPath], {
    cwd: root,
    env: {
      ...process.env,
      BASE_URL: `http://localhost:${port}`,
      PORTAL_BROWSER_QA_PORT: String(port)
    },
    encoding: "utf8"
  });
  const output = outputFor(result);
  if (result.status === 0) {
    failures.push(`occupied-port fixture should fail but passed:\n${output}`);
  }
  if (!output.includes("Refusing to run browser QA")) {
    failures.push("occupied-port fixture should explain browser QA refused pre-existing listener");
  }
  if (!output.includes("owns the isolated server lifecycle")) {
    failures.push("occupied-port fixture should preserve isolated lifecycle wording");
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const invalidPortResult = spawnSync(process.execPath, [wrapperPath], {
  cwd: root,
  env: {
    ...process.env,
    PORTAL_BROWSER_QA_PORT: "not-a-port"
  },
  encoding: "utf8"
});
if (invalidPortResult.status === 0) {
  failures.push(`invalid-port fixture should fail but passed:\n${outputFor(invalidPortResult)}`);
} else if (!outputFor(invalidPortResult).includes("Invalid PORTAL_BROWSER_QA_PORT")) {
  failures.push("invalid-port fixture should name PORTAL_BROWSER_QA_PORT remediation");
}

const directHeadroomResult = spawnSync(process.execPath, [wrapperPath], {
  cwd: root,
  env: {
    ...process.env,
    SAFE_LANE_MIN_FREE_GIB: "999999",
    PORTAL_BROWSER_QA_PORT: "4871"
  },
  encoding: "utf8"
});
const directHeadroomOutput = outputFor(directHeadroomResult);
if (directHeadroomResult.status === 0) {
  failures.push(`direct-headroom fixture should fail but passed:\n${directHeadroomOutput}`);
} else {
  if (!directHeadroomOutput.includes("Safe lane headroom guard failed")) {
    failures.push("direct-headroom fixture should fail through safe-lane headroom guard");
  }
  if (!directHeadroomOutput.includes("browser-qa-owned-server")) {
    failures.push("direct-headroom fixture should preserve owned-server context");
  }
  if (directHeadroomOutput.includes("Browser QA server ready")) {
    failures.push("direct-headroom fixture must fail before starting browser QA server");
  }
}

if (failures.length) {
  console.error("Portal browser QA owned-server wrapper self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Portal browser QA owned-server wrapper self-test passed.");
