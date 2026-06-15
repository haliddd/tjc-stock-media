#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/dev-server-build-guard.mjs");
const failures = [];

function runGuard(env = {}) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: root,
    env: {
      ...process.env,
      DEV_SERVER_BUILD_GUARD_TIMEOUT_MS: "150",
      ...env
    },
    encoding: "utf8"
  });
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

const passResult = runGuard({ DEV_SERVER_BUILD_GUARD_PORTS: "1" });
if (passResult.status !== 0) failures.push(`free-port fixture should pass:\n${passResult.stderr || passResult.stdout}`);

function outputFor(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

const { server, port } = await listenOnRandomPort();
try {
  const failResult = runGuard({ DEV_SERVER_BUILD_GUARD_PORTS: String(port) });
  if (failResult.status === 0) {
    failures.push(`listening-port fixture should fail but passed:\n${failResult.stdout}`);
  } else if (!outputFor(failResult).includes("stop dev server before production build")) {
    failures.push("listening-port fixture should tell operator to stop dev server before production build");
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const invalidResult = runGuard({ DEV_SERVER_BUILD_GUARD_PORTS: "not-a-port" });
if (invalidResult.status === 0) {
  failures.push(`invalid-port fixture should fail but passed:\n${invalidResult.stdout}`);
} else if (!outputFor(invalidResult).includes("DEV_SERVER_BUILD_GUARD_PORTS must include at least one valid port")) {
  failures.push("invalid-port fixture should name DEV_SERVER_BUILD_GUARD_PORTS remediation");
}

if (failures.length) {
  console.error("Dev server build guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Dev server build guard self-test passed.");
