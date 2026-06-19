import { describe, expect, it } from "vitest";
import {
  contributorUploadsKey,
  filtersForRole,
  filterMyWorkTasks,
  getMyWorkSummary,
  getMyWorkTasks,
  readContributorContextFromStorage,
  uploadDraftKey
} from "@/components/dam/enterprise/MyTasksPage";

function textOf(value: unknown) {
  return JSON.stringify(value);
}

describe("My Work launch role copy", () => {
  it("keeps Contributor view personal to browser receipts and hides workbench examples", () => {
    const tasks = getMyWorkTasks("Contributor", { status: "ready", receipts: [], hasDraft: false });

    expect(tasks).toEqual([]);
    expect(getMyWorkTasks("Viewer")).toEqual([]);
    expect(filtersForRole("Contributor").map((filter) => filter.label)).toEqual(["All work", "Uploads", "Requests", "Drafts"]);
  });

  it("builds Contributor tasks from local receipts without internal source-system copy", () => {
    const storage = {
      getItem(key: string) {
        if (key === contributorUploadsKey) {
          return JSON.stringify([
            { id: "draft-1", batchName: "Youth Service", status: "Draft", date: "Today" },
            { id: "submitted-1", batchName: "Sabbath Lunch", status: "Submitted", date: "Yesterday" },
            { id: "info-1", batchName: "RE Class", status: "Needs more info", reviewerNote: "Please confirm class name.", date: "Jun 16" },
            { id: "reviewed-1", batchName: "Choir Practice", status: "Reviewed", date: "Jun 15" }
          ]);
        }
        if (key === uploadDraftKey) return JSON.stringify({ batchName: "Local upload draft" });
        return null;
      }
    };
    const context = readContributorContextFromStorage(storage);
    const tasks = getMyWorkTasks("Contributor", context);
    const titles = tasks.map((task) => task.title);
    const contributorCopy = textOf({
      filters: filtersForRole("Contributor"),
      summary: getMyWorkSummary(tasks),
      tasks
    });

    expect(titles).toContain("Draft not sent yet");
    expect(titles).toContain("Upload waiting for review");
    expect(titles).toContain("Reviewer needs more info");
    expect(titles).toContain("Upload reviewed");
    expect(tasks.every((task) => task.source === "browser")).toBe(true);
    expect(contributorCopy).not.toMatch(/ResourceSpace|Support Zone|Source Status|writeback|live sync|backend storage|Published|Downloadable|Production-ready|Public now/i);
  });

  it("shows Reviewer and Admin workbench tasks with safe completed labels", () => {
    const reviewerTasks = getMyWorkTasks("Reviewer");
    const adminTasks = getMyWorkTasks("DAM Admin");
    const reviewerTitles = reviewerTasks.map((task) => task.title);
    const adminCopy = textOf(adminTasks);

    expect(reviewerTitles).toEqual(expect.arrayContaining([
      "Review waiting uploads",
      "Check usage rights",
      "Check metadata",
      "Reviewer needs more info",
      "Answer media request",
      "Review completed"
    ]));
    expect(adminCopy).toMatch(/Source Status/);
    expect(adminCopy).toMatch(/Support Zone/);
    expect(adminCopy).toMatch(/ResourceSpace mapping/);
    expect(textOf([...reviewerTasks, ...adminTasks])).not.toMatch(/Upload approved|\bPublished\b|\bDownloadable\b|\bSynced\b|\bLive\b|Writeback|Production-ready|Public now/i);
  });

  it("keeps summary counts tied to visible filtered tasks", () => {
    const reviewTasks = filterMyWorkTasks(getMyWorkTasks("DAM Admin"), "review");
    const summary = Object.fromEntries(getMyWorkSummary(reviewTasks).map((card) => [card.label, card.value]));

    expect(summary["Visible tasks"]).toBe(reviewTasks.length);
    expect(summary["Open work"] + summary["Waiting"] + summary["Closed safely"]).toBe(reviewTasks.length);
  });
});
