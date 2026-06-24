import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { intakeBatchDiagnostics, listIntakeBatches } from "@/lib/intake-batch-store";
import { isRuntimeJsonReadError } from "@/lib/runtime-file-store";
import { buildUploadIntakeResponse, normalizeUploadIntake, submitUploadIntakeBatch, uploadIntakeValidationError } from "@/lib/upload-intake";

const originalEnv = { ...process.env };
const tempRoots: string[] = [];

afterEach(async () => {
  process.env = { ...originalEnv };
  await Promise.all(tempRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function useTempRuntimeRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "tjc-upload-intake-test-"));
  tempRoots.push(root);
  process.env.TJC_STOCK_MEDIA_ROOT = root;
  return root;
}

function form(entries: Array<[string, string | File]>) {
  const data = new FormData();
  entries.forEach(([key, value]) => data.append(key, value));
  return data;
}

function photo(name = "photo.jpg") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg", lastModified: 1_718_496_000_000 });
}

describe("upload intake batch validation", () => {
  it("allows minimal contributor packet with files and batch identity", () => {
    const intake = normalizeUploadIntake(form([
      ["files", photo()],
      ["eventName", "Youth Service"],
      ["eventDate", "2026-06-16"],
      ["ministry", "Youth / RE"],
      ["source", "John"]
    ]));
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.reviewerTasks).toEqual(expect.arrayContaining([
      "Rights reviewer verifies ownership/license before public use",
      "People visibility reviewer confirmation",
      "Children/youth visibility reviewer confirmation"
    ]));
  });

  it("allows source-link-only batch with required identity", () => {
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["batchName", "Sabbath Service"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "Media Team"]
    ]));
    const response = buildUploadIntakeResponse(intake);
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.files).toHaveLength(0);
    expect(response.intakeState).toEqual({
      received: true,
      review: "Needs Review",
      usage: "Do Not Publish",
      publishable: false
    });
    expect(response.resourceSpaceWritten).toBe(false);
    expect(response.betaBoundaries.forbidden).toContain("Public approval, download enablement, or ResourceSpace approval writeback from upload");
  });

  it("does not claim source-link success when durable metadata is blocked", () => {
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["batchName", "Sabbath Service"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "Media Team"]
    ]));
    const response = buildUploadIntakeResponse(intake, {
      batchId: "blocked-batch",
      storageMode: "blocked-no-durable-store",
      blockedReason: "Runtime store write failed."
    });

    expect(response.ok).toBe(false);
    expect(response.storageMode).toBe("blocked-no-durable-store");
    expect(response.message).toBe("Runtime store write failed.");
  });

  it("blocks no files/link and missing batch identity only", () => {
    const intake = normalizeUploadIntake(form([["role", "Contributor"]]));
    const error = uploadIntakeValidationError(intake);
    expect(error?.status).toBe(400);
    expect(error?.body.missingRequired).toEqual(expect.arrayContaining(["files or source link", "batch/event name", "event date", "ministry/team", "source/photographer"]));
  });

  it("turns noncanonical tags into taxonomy reviewer task, not contributor blocker", () => {
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["eventName", "Tag Test"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "QA Reviewer"],
      ["tags", "qa-only"]
    ]));
    expect(intake.invalidTags).toEqual(["qa-only"]);
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.reviewerTasks).toContain("Taxonomy reviewer maps or rejects noncanonical suggested tags");
  });

  it("routes large video/audio to admin tasks and keeps ResourceSpace write false", () => {
    const video = new File([new Uint8Array([1])], "choir.mp4", { type: "video/mp4" });
    const intake = normalizeUploadIntake(form([
      ["files", video],
      ["eventName", "Choir Livestream"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Music / Choir"],
      ["source", "Media Team"]
    ]));
    const response = buildUploadIntakeResponse(intake);
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.adminTasks).toContain("Large media/admin intake required");
    expect(response.resourceSpaceWritten).toBe(false);
    expect(response.defaultReviewState).toBe("Needs Review");
    expect(response.defaultUsageScope).toBe("Do Not Publish");
    expect(response.status).toBe("large-media-intake");
    expect(response.message).toContain("large-media/admin intake path");
    expect(response.reviewWarnings).toEqual(expect.arrayContaining([
      "Large media/admin intake required",
      "Video/audio and large files route to admin intake"
    ]));
  });

  it("creates audited request record before persisting intake batch", async () => {
    const root = await useTempRuntimeRoot();
    await writeFile(path.join(root, "data"), "blocks request-record directory creation");
    const intake = normalizeUploadIntake(form([
      ["files", photo()],
      ["eventName", "Request Record Failure"],
      ["eventDate", "2026-06-16"],
      ["ministry", "Youth / RE"],
      ["source", "John"]
    ]));

    await expect(submitUploadIntakeBatch(intake, "Contributor", "local-beta:contributor"))
      .rejects.toThrow();

    expect(listIntakeBatches()).toHaveLength(0);
  });

  it("returns partial failure details when intake persistence fails after request record save", async () => {
    const root = await useTempRuntimeRoot();
    await mkdir(path.join(root, ".runtime"), { recursive: true });
    await writeFile(path.join(root, ".runtime", "intake-batches"), "blocks intake batch directory creation");
    const intake = normalizeUploadIntake(form([
      ["files", photo()],
      ["eventName", "Intake Persistence Failure"],
      ["eventDate", "2026-06-16"],
      ["ministry", "Youth / RE"],
      ["source", "John"]
    ]));

    const result = await submitUploadIntakeBatch(intake, "Reviewer", "local-beta:reviewer");

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({
      ok: false,
      partialFailure: true,
      reasonCode: "intake-persistence-failed",
      intakePersisted: false,
      storageMode: "blocked-no-durable-store"
    });
    expect("requestRecord" in result.body ? result.body.requestRecord?.type : undefined).toBe("Upload intake");
    expect("linkedIntakeBatchId" in result.body ? result.body.linkedIntakeBatchId : undefined).toBeTruthy();
    expect("blocker" in result.body ? result.body.blocker : "").toMatch(/intake-batches|Runtime store write failed|not a directory/i);
  });

  it("fails closed and reports diagnostics when intake batch JSON is corrupt", async () => {
    const root = await useTempRuntimeRoot();
    const batchDir = path.join(root, ".runtime", "intake-batches", "corrupt-batch");
    await mkdir(batchDir, { recursive: true });
    await writeFile(path.join(batchDir, "batch.json"), "{not-json");

    expect(() => listIntakeBatches()).toThrow();
    try {
      listIntakeBatches();
    } catch (error) {
      expect(isRuntimeJsonReadError(error)).toBe(true);
    }
    expect(intakeBatchDiagnostics()).toMatchObject({
      count: 0,
      corrupted: true,
      corruption: { reasonCode: "runtime-json-invalid" }
    });
  });

  it("links successful intake batch to request record", async () => {
    await useTempRuntimeRoot();
    const intake = normalizeUploadIntake(form([
      ["files", photo()],
      ["eventName", "Linked Batch"],
      ["eventDate", "2026-06-16"],
      ["ministry", "Youth / RE"],
      ["source", "John"]
    ]));

    const result = await submitUploadIntakeBatch(intake, "Reviewer", "local-beta:reviewer");

    expect(result.status).toBe(200);
    expect(result.body.batchId).toBeTruthy();
    expect("requestRecord" in result.body ? result.body.requestRecord?.linkedIntakeBatchId : undefined)
      .toBe(result.body.batchId);
    expect(listIntakeBatches()).toHaveLength(1);
  });
});
