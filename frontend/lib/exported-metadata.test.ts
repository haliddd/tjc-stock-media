import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { latestMetadataExportPath } from "@/lib/media-source/exported-metadata";

const tempRoots: string[] = [];

function tempRuntimeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "exported-metadata-"));
  tempRoots.push(root);
  vi.stubEnv("TJC_STOCK_MEDIA_ROOT", root);
  fs.mkdirSync(path.join(root, ".runtime", "exports"), { recursive: true });
  return root;
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("latestMetadataExportPath", () => {
  it("ignores smoke fixture CSVs when selecting ResourceSpace metadata", () => {
    const root = tempRuntimeRoot();
    const exportDir = path.join(root, ".runtime", "exports");
    const older = path.join(exportDir, "resourcespace-metadata-20260604-171242.csv");
    const latest = path.join(exportDir, "resourcespace-metadata-20260604-193852.csv");
    const smoke = path.join(exportDir, "zzzz-download-ticket-smoke-9272.csv");

    fs.writeFileSync(older, "resource_id,title\n1,Older\n");
    fs.writeFileSync(latest, "resource_id,title\n2,Latest\n");
    fs.writeFileSync(smoke, "resource_id,title\nsmoke,Fixture\n");

    expect(latestMetadataExportPath()).toBe(latest);
  });
});
