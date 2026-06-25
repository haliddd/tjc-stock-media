import type { DemoRole, MediaSourceStatus } from "@/lib/types";

export const DAM_API_TIMEOUT_MS = 15_000;
export const DAM_LOCAL_BETA_ROLE_HEADER = "x-tjc-local-beta-role";
export const DAM_LOCAL_TRUSTED_ROLE_HEADER = "x-tjc-role";

export type DamApiPayload = {
  source?: MediaSourceStatus;
  sourceStatus?: MediaSourceStatus;
  error?: string;
};

export class DamApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DamApiError";
    this.status = status;
  }
}

export function sourceFromPayload(payload: DamApiPayload) {
  return payload.sourceStatus || payload.source || null;
}

type FetchDamJsonOptions = {
  timeoutMs?: number;
  role?: DemoRole;
};

function fetchOptions(options: number | FetchDamJsonOptions | undefined): { timeoutMs: number; role?: DemoRole } {
  if (typeof options === "number") return { timeoutMs: options, role: undefined };
  return {
    timeoutMs: options?.timeoutMs ?? DAM_API_TIMEOUT_MS,
    role: options?.role
  };
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

export async function fetchDamJson<T extends DamApiPayload>(url: string, options?: number | FetchDamJsonOptions): Promise<T> {
  const { timeoutMs, role } = fetchOptions(options);
  const { controller, timer } = timeoutSignal(timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(role ? { [DAM_LOCAL_BETA_ROLE_HEADER]: role, [DAM_LOCAL_TRUSTED_ROLE_HEADER]: role } : {})
      },
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new DamApiError(payload?.error || `Request failed with ${response.status}`, response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new DamApiError(`Request timed out after ${timeoutMs}ms`, 408);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
