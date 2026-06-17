import { describe, expect, it } from "vitest";
import { buildDuplicateHints, buildMediaInventory, buildRiskFlags, parseIntakeSourceName, type IntakeFileLike } from "@/lib/upload-intake-detection";

function file(name: string, size: number, type: string, extras: Partial<IntakeFileLike> = {}): IntakeFileLike {
  return { name, size, type, lastModified: extras.lastModified || 1_718_496_000_000, webkitRelativePath: extras.webkitRelativePath };
}

describe("upload intake detection", () => {
  it("parses structured folder names into batch metadata", () => {
    const parsed = parseIntakeSourceName("2026-06-16 - Youth Service - Elizabeth NJ - John");
    expect(parsed).toMatchObject({
      eventDate: "2026-06-16",
      eventName: "Youth Service",
      location: "Elizabeth NJ",
      photographer: "John",
      ministry: "Youth / RE",
      confidence: "high"
    });
    expect(parsed.confirmationNeeded).toEqual([]);
  });

  it("returns partial metadata for messy names without hiding uncertainty", () => {
    const parsed = parseIntakeSourceName("youth service john june");
    expect(parsed.eventName).toBe("Youth Service John June");
    expect(parsed.eventDate).toBeUndefined();
    expect(parsed.confidence).toBe("low");
    expect(parsed.confirmationNeeded).toContain("date");
  });

  it("rejects impossible dates and asks for confirmation", () => {
    const parsed = parseIntakeSourceName("2026-02-30 - Choir - Elizabeth - John");
    expect(parsed.eventDate).toBeUndefined();
    expect(parsed.confirmationNeeded).toContain("date");
  });

  it("builds media inventory including folder name, HEIC, video, audio, and large media", () => {
    const inventory = buildMediaInventory([
      file("IMG_001.jpg", 10, "image/jpeg", { webkitRelativePath: "2026 Youth/IMG_001.jpg" }),
      file("IMG_002.HEIC", 20, "image/heic", { webkitRelativePath: "2026 Youth/IMG_002.HEIC" }),
      file("clip.mp4", 101 * 1024 * 1024, "video/mp4", { webkitRelativePath: "2026 Youth/clip.mp4" }),
      file("audio.m4a", 1, "audio/mp4", { webkitRelativePath: "2026 Youth/audio.m4a" })
    ]);
    expect(inventory).toMatchObject({
      fileCount: 4,
      photoCount: 2,
      videoCount: 1,
      audioCount: 1,
      heicCount: 1,
      folderName: "2026 Youth",
      largeMediaCount: 2
    });
    expect(inventory.extensions).toEqual(["heic", "jpg", "m4a", "mp4"]);
  });

  it("flags ministry-sensitive terms for reviewer routing only", () => {
    expect(buildRiskFlags({
      folderName: "Youth baptism choir testimony",
      filenames: ["livestream.mp4"],
      tags: "hymn"
    })).toEqual([
      "Possible youth/minors",
      "Possible doctrine/sacrament review",
      "Possible music/hymn rights review",
      "Possible pastoral sensitivity"
    ]);
  });

  it("creates duplicate hints without making them blockers", () => {
    const hints = buildDuplicateHints([
      file("same.jpg", 10, "image/jpeg", { lastModified: 1000 }),
      file("same.jpg", 10, "image/jpeg", { lastModified: 1200 }),
      file("other.jpg", 10, "image/jpeg", { lastModified: 1300 })
    ]);
    expect(hints.map((hint) => hint.reason)).toEqual(expect.arrayContaining(["same-filename", "same-size", "similar-timestamp"]));
  });
});
