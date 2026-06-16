export const BETA_LOGIN_THROTTLE_MAX_FAILURES = 5;
export const BETA_LOGIN_THROTTLE_WINDOW_MS = 10 * 60 * 1000;
export const BETA_LOGIN_THROTTLE_BLOCK_MS = 15 * 60 * 1000;

type BetaLoginThrottleEntry = {
  failures: number;
  firstFailureAt: number;
  lastFailureAt: number;
  blockedUntil: number;
};

type BetaLoginThrottleStatus = {
  allowed: boolean;
  failures: number;
  remainingFailures: number;
  retryAfterSeconds: number;
};

const attempts = new Map<string, BetaLoginThrottleEntry>();

function cleanClientHint(value: string | null) {
  return (value || "")
    .split(",")[0]
    .trim()
    .replace(/[^\w:.-]/g, "")
    .slice(0, 96);
}

export function betaLoginThrottleKey(headers: Headers) {
  const forwardedFor = cleanClientHint(headers.get("x-forwarded-for"));
  const realIp = cleanClientHint(headers.get("x-real-ip"));
  const userAgent = cleanClientHint(headers.get("user-agent")) || "unknown-agent";
  return `beta-login:${forwardedFor || realIp || "local"}:${userAgent}`;
}

function currentStatus(entry: BetaLoginThrottleEntry | undefined, now: number): BetaLoginThrottleStatus {
  if (!entry || now - entry.firstFailureAt > BETA_LOGIN_THROTTLE_WINDOW_MS) {
    return {
      allowed: true,
      failures: 0,
      remainingFailures: BETA_LOGIN_THROTTLE_MAX_FAILURES,
      retryAfterSeconds: 0
    };
  }

  if (entry.blockedUntil > now) {
    return {
      allowed: false,
      failures: entry.failures,
      remainingFailures: 0,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000)
    };
  }

  return {
    allowed: true,
    failures: entry.failures,
    remainingFailures: Math.max(0, BETA_LOGIN_THROTTLE_MAX_FAILURES - entry.failures),
    retryAfterSeconds: 0
  };
}

function pruneThrottleEntries(now: number) {
  if (attempts.size <= 1_000) return;
  for (const [key, entry] of attempts.entries()) {
    if (entry.blockedUntil <= now && now - entry.lastFailureAt > BETA_LOGIN_THROTTLE_WINDOW_MS) {
      attempts.delete(key);
    }
  }
}

export function betaLoginThrottleStatus(key: string, now = Date.now()) {
  const entry = attempts.get(key);
  const status = currentStatus(entry, now);
  if (status.failures === 0 && entry) {
    attempts.delete(key);
  }
  return status;
}

export function recordBetaLoginFailure(key: string, now = Date.now()) {
  const current = attempts.get(key);
  const expired = !current || now - current.firstFailureAt > BETA_LOGIN_THROTTLE_WINDOW_MS;
  const failures = expired ? 1 : current.failures + 1;
  const entry: BetaLoginThrottleEntry = {
    failures,
    firstFailureAt: expired ? now : current.firstFailureAt,
    lastFailureAt: now,
    blockedUntil: failures >= BETA_LOGIN_THROTTLE_MAX_FAILURES ? now + BETA_LOGIN_THROTTLE_BLOCK_MS : 0
  };
  attempts.set(key, entry);
  pruneThrottleEntries(now);
  return currentStatus(entry, now);
}

export function clearBetaLoginThrottle(key: string) {
  attempts.delete(key);
}

export function resetBetaLoginThrottleForTests() {
  attempts.clear();
}
