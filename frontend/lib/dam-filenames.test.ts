import { describe, expect, it } from "vitest";
import { buildDamFilenames, damFilenameForRendition } from "@/lib/dam-filenames";
import { approvedCopyFileName } from "@/lib/media-delivery";
import { normalizeResourceSpaceRecord } from "@/lib/resourcespace-schema";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Bible Outdoor Detail",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Bible Outdoor Detail",
    mediaType: "photo",
    collection: "MVP 2024",
    status: "Approved Public",
    usageScope: "Public",
    downloadPolicy: "approved-copy-allowed",
    originalFilename: "Copy of Bible 18.JPG",
    fileExtension: "JPG",
    capturedDate: "2024:07:17 10:47:02",
    ...overrides
  };
}

describe("DAM filename policy", () => {
  it("generates default stable names without requiring a subject", () => {
    const filenames = buildDamFilenames(asset());

    expect(filenames).toMatchObject({
      baseName: "20240717-mvp-2024-000001",
      original: "20240717-mvp-2024-000001-orig.jpg",
      web: "20240717-mvp-2024-000001-web.jpg",
      dateSource: "captured_date",
      collectionSlug: "mvp-2024",
      sequence: "000001"
    });
    expect(filenames.subjectSlug).toBeUndefined();
  });

  it("can opt into an enriched subject filename without changing the default sequence", () => {
    const filenames = buildDamFilenames(asset(), { includeSubject: true });

    expect(filenames.baseName).toBe("20240717-mvp-2024-bible-outdoor-detail-000001");
    expect(filenames.original).toBe("20240717-mvp-2024-bible-outdoor-detail-000001-orig.jpg");
  });

  it("falls back to safe triage names when event, subject, and date are absent", () => {
    const filenames = buildDamFilenames(asset({
      id: "upload-abc",
      resourceSpaceId: undefined,
      title: "",
      collection: "ResourceSpace export",
      originalFilename: "",
      fileExtension: "",
      capturedDate: undefined,
      eventDate: undefined,
      importDate: undefined
    }));

    expect(filenames.original).toBe("undated-needs-triage-upload-abc-orig.jpg");
    expect(filenames.dateSource).toBe("undated");
  });

  it("uses file modified date before import date when captured date is missing", () => {
    const filenames = buildDamFilenames(asset({
      capturedDate: undefined,
      eventDate: undefined,
      fileModifiedDate: "2024-07-18T21:04:31Z",
      importDate: "2026-06-15"
    }));

    expect(filenames.original).toBe("20240718-mvp-2024-000001-orig.jpg");
    expect(filenames.dateSource).toBe("file_modified_date");
  });

  it("normalizes ResourceSpace records with DAM filenames while preserving original filename metadata", () => {
    const normalized = normalizeResourceSpaceRecord({
      resource_id: "123",
      title: "Copy of Bible 18.JPG",
      original_filename: "Copy of Bible 18.JPG",
      original_extension: "JPG",
      captured_date: "2024-07-17",
      import_batch: "MVP 2024",
      publish_status: "Needs Review",
      usage_scope: "Do Not Publish"
    });

    expect(normalized.originalFilename).toBe("Copy of Bible 18.JPG");
    expect(normalized.damFilenames?.original).toBe("20240717-mvp-2024-000123-orig.jpg");
    expect(normalized.damFilenames?.web).toBe("20240717-mvp-2024-000123-web.jpg");
  });

  it("uses generated web rendition names for approved copy downloads", () => {
    const approved = asset({ id: "9101", damFilenames: buildDamFilenames(asset({ id: "9101" })) });

    expect(damFilenameForRendition(approved, "web")).toBe("20240717-mvp-2024-009101-web.jpg");
    expect(approvedCopyFileName(approved, approved.id)).toBe("20240717-mvp-2024-009101-web.jpg");
  });
});
