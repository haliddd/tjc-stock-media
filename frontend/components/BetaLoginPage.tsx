"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import { betaChurchInviteCodeRequired, betaPersonas, safeBetaReturnTo } from "@/lib/beta-auth";
import type { DemoRole } from "@/lib/types";
import { cn } from "@/lib/ui";

export function BetaLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = useMemo(() => safeBetaReturnTo(searchParams?.get("returnTo")), [searchParams]);
  const [role, setRole] = useState<DemoRole>("Viewer");
  const [password, setPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedPersona = betaPersonas.find((persona) => persona.role === role) || betaPersonas[0];
  const inviteRequired = betaChurchInviteCodeRequired(role);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/beta-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ role, password, invitationCode: inviteRequired ? invitationCode : "", returnTo })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error || "Restricted access failed.");
        return;
      }
      router.replace(payload.returnTo || "/");
      router.refresh();
    } catch {
      setMessage("Restricted access failed. Check connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="beta-login-page">
      <section className="beta-login-panel" aria-labelledby="beta-login-title">
        <div className="beta-login-copy">
          <span className="beta-login-eyebrow"><ShieldCheck size={16} aria-hidden="true" /> Restricted media portal access</span>
          <h1 id="beta-login-title">True Jesus Church Media Library</h1>
          <p>Role views are for testing only. Identity setup is still being verified. Keep sensitive media out until access is confirmed.</p>
          <ul>
            <li>Vercel protection remains first gate.</li>
            <li>Original/source files remain restricted.</li>
            <li>Records stay unavailable when the source connection is not verified.</li>
          </ul>
        </div>

        <form className="beta-login-form" onSubmit={submitLogin}>
          <div className="beta-login-form-head">
            <LockKeyhole size={22} aria-hidden="true" />
            <div>
              <h2>Select tester persona</h2>
              <p>Uses Vercel environment passwords. No passwords live in code.</p>
            </div>
          </div>

          <div className="beta-persona-grid" role="radiogroup" aria-label="Restricted access persona">
            {betaPersonas.map((persona) => (
              <button
                className={cn("beta-persona-card", role === persona.role && "is-active")}
                type="button"
                key={persona.role}
                role="radio"
                aria-checked={role === persona.role}
                onClick={() => {
                  setRole(persona.role);
                  setPassword("");
                  setInvitationCode("");
                  setMessage("");
                }}
              >
                <strong>{persona.label}</strong>
                <span>{persona.description}</span>
              </button>
            ))}
          </div>

          <label className="beta-password-field">
            <span>{selectedPersona.label} password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {inviteRequired ? (
            <label className="beta-password-field">
              <span>Church invitation code</span>
              <input
                type="password"
                value={invitationCode}
                onChange={(event) => setInvitationCode(event.target.value)}
                autoComplete="one-time-code"
                required
              />
              <small className="beta-invite-hint">Contributor and above need a church-location invite code from their local church/location.</small>
            </label>
          ) : null}

          {message ? <p className="beta-login-error" role="alert">{message}</p> : null}

          <button className="beta-login-submit" type="submit" disabled={submitting}>
            <LogIn size={17} aria-hidden="true" />
            {submitting ? "Checking..." : `Enter as ${selectedPersona.label}`}
          </button>
        </form>
      </section>
    </main>
  );
}
