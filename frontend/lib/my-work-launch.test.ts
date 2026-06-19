import { describe, expect, it } from "vitest";
import {
  contributorUploadsKey,
  filtersForRole,
  filterMyWorkTasks,
  getMyWorkSummary,
  getMyWorkTasks,
  localRequestReceiptsKey,
  readContributorContextFromStorage,
  safeLabelsForRole,
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
            { id: "reviewed-1", batchName: "Choir Practice", status: "Reviewed", reviewerNote: "Approved by reviewer for internal church use.", date: "Jun 15" }
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
    expect(contributorCopy).not.toMatch(/Approved by reviewer/i);
  });

  it("builds Contributor request tasks from local request receipts", () => {
    const storage = {
      getItem(key: string) {
        if (key === contributorUploadsKey) return "[]";
        if (key === localRequestReceiptsKey) {
          return JSON.stringify([
            { id: "request-1", type: "Request permission", subject: "Choir photo use", status: "Local receipt", updatedAt: "Today" },
            { id: "request-2", type: "General media help", subject: "Potluck photos", status: "Draft", updatedAt: "Yesterday" }
          ]);
        }
        if (key === uploadDraftKey) return null;
        return null;
      }
    };
    const tasks = getMyWorkTasks("Contributor", readContributorContextFromStorage(storage));

    expect(tasks.map((task) => task.title)).toEqual(["Request saved in this browser", "Request draft not sent"]);
    expect(tasks.every((task) => task.category === "requests")).toBe(true);
    expect(tasks.every((task) => task.href === "/requests")).toBe(true);
    expect(getMyWorkSummary(tasks).find((card) => card.label === "Visible tasks")?.value).toBe(2);
  });

  it("sanitizes unsafe Contributor request receipt text and claimed outcomes", () => {
    const storage = {
      getItem(key: string) {
        if (key === contributorUploadsKey) return "[]";
        if (key === localRequestReceiptsKey) {
          return JSON.stringify([
            { id: "request-unsafe", type: "Request permission", subject: "ResourceSpace source writeback approved", status: "Approved", updatedAt: "Source Status today" }
          ]);
        }
        if (key === uploadDraftKey) return null;
        return null;
      }
    };
    const tasks = getMyWorkTasks("Contributor", readContributorContextFromStorage(storage));
    const visibleCopy = textOf(tasks.map(({ title, reason, related, status, age, actionLabel, detail }) => ({
      title,
      reason,
      related,
      status,
      age,
      actionLabel,
      detail
    })));

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ related: "Request permission", status: "Waiting for follow-up" });
    expect(visibleCopy).not.toMatch(/ResourceSpace|Source Status|source|writeback|approved/i);
  });

  it("sanitizes unsafe Contributor upload receipt and draft labels", () => {
    const storage = {
      getItem(key: string) {
        if (key === contributorUploadsKey) {
          return JSON.stringify([
            { id: "unsafe-upload", batchName: "ResourceSpace source writeback approved", status: "Approved Public", reviewStatus: "download ready", date: "synced today" }
          ]);
        }
        if (key === uploadDraftKey) return JSON.stringify({ batchName: "Source Status approved draft", eventName: "Fallback picnic" });
        return null;
      }
    };
    const tasks = getMyWorkTasks("Contributor", readContributorContextFromStorage(storage));
    const visibleCopy = textOf(tasks.map(({ title, reason, related, status, age, detail }) => ({
      title,
      reason,
      related,
      status,
      age,
      detail
    })));

    expect(tasks.map((task) => task.related)).toEqual(["Fallback picnic", "Submitted media"]);
    expect(visibleCopy).not.toMatch(/ResourceSpace|Source Status|source|writeback|approved|download ready|synced/i);
  });

  it("treats waiting reviewer notes as upload status, not contributor questions", () => {
    const tasks = getMyWorkTasks("Contributor", {
      status: "ready",
      receipts: [{ id: "waiting-1", batchName: "Sabbath meal", status: "Submitted", reviewerNote: "Waiting for review." }],
      requestReceipts: [],
      hasDraft: false
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ category: "uploads", title: "Upload waiting for review", status: "Waiting for review" });
  });

  it("uses Contributor reviewStatus to surface reviewer questions", () => {
    const tasks = getMyWorkTasks("Contributor", {
      status: "ready",
      receipts: [{
        id: "info-status-1",
        batchName: "Class photos",
        status: "Submitted",
        reviewStatus: "Needs more info",
        reviewerNote: "Please confirm class name."
      }],
      requestReceipts: [],
      hasDraft: false
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ category: "requests", title: "Reviewer needs more info", reason: "Please confirm class name." });
  });

  it("keeps unsafe ops language out of Contributor reviewer-question copy", () => {
    const tasks = getMyWorkTasks("Contributor", {
      status: "ready",
      receipts: [{
        id: "info-2",
        batchName: "RE Class",
        status: "Needs more info",
        reviewerNote: "ResourceSpace writeback synced and approved."
      }],
      requestReceipts: [],
      hasDraft: false
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].reason).toBe("Reviewer needs more event or rights context before review can continue.");
    expect(textOf(tasks)).not.toMatch(/ResourceSpace|writeback|synced|approved/i);
  });

  it("keeps Contributor draft visible when browser receipts JSON is corrupt", () => {
    const storage = {
      getItem(key: string) {
        if (key === contributorUploadsKey) return "{bad receipts";
        if (key === uploadDraftKey) return JSON.stringify({ eventName: "Saved picnic upload" });
        return null;
      }
    };
    const context = readContributorContextFromStorage(storage);
    const tasks = getMyWorkTasks("Contributor", context);

    expect(context).toMatchObject({ status: "ready", receipts: [], hasDraft: true, draftLabel: "Saved picnic upload" });
    expect(context.requestReceipts).toEqual([]);
    expect(tasks.map((task) => task.title)).toEqual(["Draft not sent yet"]);
  });

  it("keeps Contributor receipts visible when browser draft JSON is corrupt", () => {
    const storage = {
      getItem(key: string) {
        if (key === contributorUploadsKey) return JSON.stringify([{ id: "submitted-2", batchName: "Family Day", status: "Submitted" }]);
        if (key === uploadDraftKey) return "{bad draft";
        return null;
      }
    };
    const context = readContributorContextFromStorage(storage);
    const tasks = getMyWorkTasks("Contributor", context);

    expect(context).toMatchObject({ status: "ready", hasDraft: false });
    expect(context.receipts).toHaveLength(1);
    expect(tasks.map((task) => task.title)).toEqual(["Upload waiting for review"]);
  });

  it("shows Reviewer and Admin workbench routes without fake task records", () => {
    const reviewerTasks = getMyWorkTasks("Reviewer");
    const adminTasks = getMyWorkTasks("DAM Admin");
    const reviewerTitles = reviewerTasks.map((task) => task.title);
    const adminCopy = textOf(adminTasks);

    expect(reviewerTitles).toEqual(expect.arrayContaining([
      "Open Review Uploads",
      "Open rights review queue",
      "Open metadata queue",
      "Open media requests"
    ]));
    expect(reviewerTasks.every((task) => task.status === "Route available")).toBe(true);
    expect(textOf(reviewerTasks)).toMatch(/Navigation only/);
    expect(adminCopy).toMatch(/Source Status/);
    expect(adminCopy).toMatch(/Support Zone/);
    expect(adminCopy).toMatch(/ResourceSpace mapping/);
    expect(reviewerTasks.some((task) => task.category === "source" || task.category === "support")).toBe(false);
    expect(adminTasks.some((task) => task.category === "source")).toBe(true);
    expect(adminTasks.some((task) => task.category === "support")).toBe(true);
    expect(textOf([...reviewerTasks, ...adminTasks])).not.toMatch(/Upload approved|\bPublished\b|\bDownloadable\b|\bSynced\b|\bLive\b|Writeback|Production-ready|Public now/i);
    expect(textOf([...reviewerTasks, ...adminTasks])).not.toMatch(/Fellowship Lunch|Youth fellowship|Choir Practice|Spring Outreach|REQ-\d+/i);
  });

  it("keeps summary counts tied to visible filtered tasks", () => {
    const reviewTasks = filterMyWorkTasks(getMyWorkTasks("DAM Admin"), "review");
    const summary = Object.fromEntries(getMyWorkSummary(reviewTasks).map((card) => [card.label, card.value]));

    expect(summary["Visible tasks"]).toBe(reviewTasks.length);
    expect(summary["Open work"] + summary["Waiting"] + summary["Closed safely"]).toBe(reviewTasks.length);
  });

  it("keeps public and contributor safe-label rail free of admin internals", () => {
    const publicContributorCopy = textOf([
      safeLabelsForRole("Viewer"),
      safeLabelsForRole("Contributor")
    ]);

    expect(publicContributorCopy).not.toMatch(/ResourceSpace|Support Zone|Source Status|source|writeback|backend|sync|approved|published|downloadable/i);
    expect(safeLabelsForRole("DAM Admin")).toContain("Support check needed");
  });
});
