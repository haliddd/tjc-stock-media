import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildRequestRecordListResponse,
  buildRequestRecordSaveResponse,
  createAuditedRequestRecord,
  listRequestRecords,
  requestRecordForRolePayload,
  requestRecordsForIdentityPayload,
  type RequestRecord
} from "@/lib/request-record-store";

const originalEnv = { ...process.env };
const tempRoots: string[] = [];

afterEach(async () => {
  process.env = { ...originalEnv };
  await Promise.all(tempRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function useTempRuntimeRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "tjc-request-record-test-"));
  tempRoots.push(root);
  process.env.TJC_STOCK_MEDIA_ROOT = root;
  return root;
}

function record(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: "req-test",
    type: "Source access",
    relatedAssetId: "123",
    relatedAsset: "Sabbath worship",
    resourceSpaceId: "rs-123",
    requestedBy: "sso:viewer@example.test",
    requesterRole: "Viewer",
    status: "Waiting on me",
    blocker: "Usage scope needed",
    assignedTo: "Media reviewer",
    updatedAt: "2026-06-24T00:00:00.000Z",
    createdAt: "2026-06-24T00:00:00.000Z",
    requiredEvidence: ["Intended channel"],
    timeline: ["Request recorded"],
    nextAction: "Add ministry use scope",
    roleFit: ["Viewer", "Contributor", "Reviewer", "DAM Admin"],
    linkedIntakeBatchId: "intake-1",
    linkedPendingWriteId: "pending-1",
    storageMode: "local-json",
    ...overrides
  };
}

describe("request record role payloads", () => {
  it("scopes non-reviewer request lists to the requesting identity", () => {
    const mine = record({ id: "req-mine", requestedBy: "sso:viewer@example.test" });
    const anotherViewer = record({ id: "req-other", requestedBy: "sso:other@example.test" });

    const payload = requestRecordsForIdentityPayload({ id: "sso:viewer@example.test", role: "Viewer" }, [mine, anotherViewer]);

    expect(payload).toHaveLength(1);
    expect(payload[0]?.id).toBe("req-mine");
  });

  it("keeps reviewer queue broad while preserving internal ids for reviewers", () => {
    const mine = record({ id: "req-mine", requestedBy: "sso:viewer@example.test" });
    const anotherViewer = record({ id: "req-other", requestedBy: "sso:other@example.test" });
    const payload = requestRecordsForIdentityPayload({ id: "sso:reviewer@example.test", role: "Reviewer" }, [mine, anotherViewer]);

    expect(payload).toHaveLength(2);
    expect(payload.find((item) => item.id === "req-mine")).toMatchObject({
      resourceSpaceId: "rs-123",
      linkedPendingWriteId: "pending-1",
      storageMode: "local-json"
    });
  });

  it("redacts ResourceSpace, pending-write, intake, and storage internals for normal roles", () => {
    const payload = requestRecordForRolePayload("Viewer", record());

    expect(payload.requestedBy).toBe("Viewer");
    expect(payload.resourceSpaceId).toBeUndefined();
    expect(payload.linkedPendingWriteId).toBeUndefined();
    expect(payload.linkedIntakeBatchId).toBeUndefined();
    expect(payload.storageMode).toBeUndefined();
  });

  it("labels request responses as portal tickets, not approval truth", () => {
    expect(buildRequestRecordListResponse([record()])).toMatchObject({
      storageMode: "local-json",
      truthBoundary: "portal-ticket-queue-only",
      approvalTruth: false,
      resourceSpaceWritten: false
    });
    expect(buildRequestRecordSaveResponse("Reviewer", record())).toMatchObject({
      storageMode: "local-json",
      truthBoundary: "portal-ticket-queue-only",
      approvalTruth: false,
      resourceSpaceWritten: false
    });
  });
});

describe("audited request record persistence", () => {
  it("saves request record before required audit and fails closed when audit write fails", async () => {
    const root = await useTempRuntimeRoot();
    await writeFile(path.join(root, ".runtime"), "blocks audit directory creation");

    await expect(createAuditedRequestRecord({
      type: "Upload intake",
      relatedAsset: "Sabbath Service",
      blocker: "Reviewer handoff pending"
    }, { id: "local-beta:contributor", role: "Contributor" })).rejects.toThrow(/Request record saved but required audit failed; fail closed/);

    const records = await listRequestRecords();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      type: "Upload intake",
      relatedAsset: "Sabbath Service",
      requestedBy: "local-beta:contributor"
    });
  });
});
