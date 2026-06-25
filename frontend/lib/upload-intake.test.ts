import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildUploadIntakeResponse, normalizeUploadIntake, submitUploadIntakeBatch, uploadIntakeValidationError } from "@/lib/upload-intake";

const originalEnv = { ...process.env };
const tempRoots: string[] = [];

afterEach(() => {
  process.env = { ...originalEnv };
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function useTempRuntimeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-upload-intake-"));
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
    expect(response.portalStoresOriginals).toBe(false);
    expect(response.originalsStoredByPortal).toBe(false);
    expect(response.resourceSpaceWritePolicy).toBe("no-upload-writeback");
    expect(response.betaBoundaries.forbidden).toContain("Public approval, download enablement, or ResourceSpace approval writeback from upload");
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
    expect(response.portalStoresOriginals).toBe(false);
    expect(response.status).toBe("large-media-intake");
    expect(response.message).toContain("large-media/admin intake path");
    expect(response.reviewWarnings).toEqual(expect.arrayContaining([
      "Large media/admin intake required",
      "Video/audio and large files route to admin intake"
    ]));
  });

  it("persists intake manifest metadata without storing original bytes in the portal", async () => {
    const root = useTempRuntimeRoot();
    const intake = normalizeUploadIntake(form([
      ["files", photo("sabbath.jpg")],
      ["eventName", "Sabbath Service"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "Media Team"]
    ]));

    const result = await submitUploadIntakeBatch(intake, "Contributor", "local-beta:contributor");
    const batchId = result.body.batchId;

    expect(result.status).toBe(200);
    expect(batchId).toBeTruthy();
    expect(result.body).toMatchObject({
      custodyMode: "portal-intake-metadata-only",
      portalStoresOriginals: false,
      originalsStoredByPortal: false,
      resourceSpaceWritten: false
    });
    expect(fs.existsSync(path.join(root, ".runtime", "intake-batches", batchId || "", "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, ".runtime", "intake-batches", batchId || "", "originals"))).toBe(false);
  });
});
