#!/usr/bin/env node
import net from "node:net";

const ports = (process.env.DEV_SERVER_BUILD_GUARD_PORTS || "4871")
  .split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isInteger(value) && value > 0 && value < 65536);
const host = process.env.DEV_SERVER_BUILD_GUARD_HOST || "127.0.0.1";
const timeoutMs = Number.parseInt(process.env.DEV_SERVER_BUILD_GUARD_TIMEOUT_MS || "350", 10);
const failures = [];

function portIsListening(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (listening) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(listening);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

if (!ports.length) {
  failures.push("DEV_SERVER_BUILD_GUARD_PORTS must include at least one valid port.");
}

for (const port of ports) {
  if (await portIsListening(port)) {
    failures.push(`Port ${port} is listening on ${host}; stop dev server before production build.`);
  }
}

if (failures.length) {
  console.error("Dev server build guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Dev server build guard passed for ${host}:${ports.join(",")}.`);
