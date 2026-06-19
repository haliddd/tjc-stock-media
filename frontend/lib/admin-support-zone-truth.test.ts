import { afterEach, describe, expect, it, vi } from "vitest";
import { sourceStateFromPayload, sourceModeLabel } from "@/components/dam/shell/DamSourceStatus";
import { resourceSpaceImportStatus } from "@/components/dam/enterprise/AdminPage";
import { buildIntegrationReadiness } from "@/lib/dam-readiness-integrations";
import { sourceTruthLabel } from "@/lib/enterprise-display";
import { resourceSpaceApiStatus } from "@/lib/media-source/resourcespace-api";
import { roleSourceEnvelope } from "@/lib/media-source/session";
import { fakeOperationalClaimPattern, safeSourceStatusCopy } from "@/lib/source-status-copy";
import type { DamReadinessResult, MediaSourceStatus } from "@/lib/types";

const forbiddenOpsClaim = fakeOperationalClaimPattern;
const contributorBoundaryLeak = /\b(ResourceSpace|source-system|source system|writeback)\b/i;

function fakeAuditEvents() {
  return {
    count: 0,
    latestAt: undefined,
    denied: 0,
    queued: 0,
    storage: {
      durable: false,
      detail: "Local runtime audit files only."
    },
    recent: []
  } as any;
}

function readinessForSource(source: MediaSourceStatus) {
  return {
    source,
    integrationReadiness: [],
    metrics: { missingSource: 0 }
  } as unknown as DamReadinessResult;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Admin Support Zone source truth", () => {
  it("labels ResourceSpace API as a read-only source in admin/status copy", () => {
    const source: MediaSourceStatus = {
      ...resourceSpaceApiStatus,
      live: true
    };
    const adminStatus = resourceSpaceImportStatus(readinessForSource(source));
    const truthLabel = sourceTruthLabel(source);

    expect(resourceSpaceApiStatus.readOnly).toBe(true);
    expect(adminStatus).toBe("Read-only API source");
    expect(truthLabel).toBe("Read-only hosted source API");
    expect(`${adminStatus} ${truthLabel}`).not.toMatch(forbiddenOpsClaim);
  });

  it("keeps shell source status to a read check with no sync/download/publish promise", () => {
    const state = sourceStateFromPayload({
      assets: [{ id: "asset-1" }],
      live: true,
      source: {
        adapter: "resourcespace-api",
        label: "ResourceSpace API",
        detail: "Server read returned one record.",
        readOnly: false
      }
    });

    expect(state.status).toBe("ready");
    expect(state.label).toBe("Read-only ResourceSpace API");
    expect(sourceModeLabel(state)).toBe("Read-only API check");
    expect(`${state.label} ${sourceModeLabel(state)} ${state.detail}`).not.toMatch(forbiddenOpsClaim);
  });

  it("sanitizes unsafe source-status claims before admin copy renders them", () => {
    const copy = safeSourceStatusCopy("Live ResourceSpace record synced, writeback complete, published, downloadable, production-ready.");

    expect(copy).toContain("read-only ResourceSpace");
    expect(copy).toContain("writeback gated");
    expect(copy).not.toMatch(forbiddenOpsClaim);
  });

  it("keeps contributor source envelopes generic even when ResourceSpace read details exist", () => {
    const envelope = roleSourceEnvelope("Contributor", {
      adapter: "resourcespace-api",
      label: "ResourceSpace API",
      detail: "Live source-system writeback complete.",
      readOnly: true,
      live: true
    });

    expect(envelope.source.label).toBe("Media library");
    expect(envelope.source.detail).toMatch(/approved copies/i);
    const visibleCopy = [
      envelope.source.label,
      envelope.source.detail,
      envelope.sourceStatus.label,
      envelope.sourceStatus.detail,
      envelope.sourceKind
    ].join(" ");
    expect(visibleCopy).not.toMatch(contributorBoundaryLeak);
    expect(visibleCopy).not.toMatch(forbiddenOpsClaim);
  });

  it("keeps Support Zone integration rows read-only and writeback gated", () => {
    vi.stubEnv("RESOURCESPACE_BASE_URL", "https://resourcespace.example.test");
    vi.stubEnv("RESOURCESPACE_API_USER", "readonly");
    vi.stubEnv("RESOURCESPACE_API_KEY", "secret");
    vi.stubEnv("RESOURCESPACE_ENABLE_WRITEBACK", "0");
    vi.stubEnv("RESOURCESPACE_WRITEBACK_MODE", "disabled");

    const rows = buildIntegrationReadiness({
      status: { ...resourceSpaceApiStatus, live: true },
      approvedPublic: 0,
      portalReady: 0,
      auditEvents: fakeAuditEvents()
    });
    const metadataSource = rows.find((row) => row.id === "metadata-source");
    const writebackGate = rows.find((row) => row.id === "review-writes");

    expect(metadataSource).toMatchObject({ state: "Read-only", owner: "ResourceSpace" });
    expect(metadataSource?.detail).toMatch(/does not prove ResourceSpace writeback/i);
    expect(writebackGate).toMatchObject({ ready: false, state: "Read-only", owner: "ResourceSpace" });
    expect(writebackGate?.detail).toMatch(/disabled/i);
    expect(JSON.stringify([metadataSource, writebackGate])).not.toMatch(forbiddenOpsClaim);
  });
});
