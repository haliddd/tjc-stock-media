import { describe, expect, it } from "vitest";
import { isLocalRequestReceiptOpen, requestHelpHref } from "@/components/GuidePage";

describe("request and help safety helpers", () => {
  it("routes Help Center request tasks into typed Requests wizard paths", () => {
    expect(requestHelpHref("Request permission")).toBe("/requests?type=Request%20permission");
    expect(requestHelpHref("Report privacy or rights issue")).toBe("/requests?type=Report%20privacy%20or%20rights%20issue");
    expect(requestHelpHref("Request original or high-resolution help")).toBe("/requests?type=Request%20original%20or%20high-resolution%20help");
    expect(requestHelpHref("General media help")).toBe("/requests?type=General%20media%20help");
  });

  it("does not count claimed completion outcomes as local open request receipts", () => {
    for (const status of ["Approved", "Cancelled", "Closed", "Complete", "Done", "Downloaded", "Published", "Resolved", "Synced"]) {
      expect(isLocalRequestReceiptOpen(status)).toBe(false);
    }

    expect(isLocalRequestReceiptOpen("Draft")).toBe(true);
    expect(isLocalRequestReceiptOpen("Local receipt")).toBe(true);
    expect(isLocalRequestReceiptOpen(undefined)).toBe(true);
  });
});
