import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import {
  BETA_SESSION_COOKIE,
  BETA_SESSION_MAX_AGE_SECONDS,
  betaAuthEnabled,
  betaChurchInviteCodeMatches,
  betaChurchInviteCodeRequired,
  betaChurchInviteCodesConfigured,
  betaPasswordMatches,
  betaPersonaConfigured,
  betaPersonas,
  betaRoleFromInput,
  betaSessionSecretConfigured,
  createBetaSessionCookieValue,
  safeBetaReturnTo
} from "@/lib/beta-auth";
import { createDamRouteSession } from "@/lib/dam-route-session";
import { readJsonObject } from "@/lib/request-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = createDamRouteSession(request);
  if (!betaAuthEnabled()) {
    appendAuditEvent({
      type: "beta_auth_login",
      role: session.role,
      actor: session.identity.id,
      status: "blocked",
      summary: "Internal beta login blocked because beta auth is disabled.",
      details: { reason: "beta-auth-disabled" }
    });
    return NextResponse.json({ error: "Internal beta access is not enabled." }, { status: 404 });
  }

  const body = await readJsonObject(request);
  const role = betaRoleFromInput(body.role);
  const password = typeof body.password === "string" ? body.password : "";
  const invitationCode = typeof body.invitationCode === "string" ? body.invitationCode : "";
  const returnTo = safeBetaReturnTo(body.returnTo);
  const inviteRequired = betaChurchInviteCodeRequired(role);

  if (!betaPersonaConfigured(role)) {
    appendAuditEvent({
      type: "beta_auth_login",
      role,
      actor: session.identity.id,
      status: "blocked",
      summary: "Internal beta login blocked because persona password is not configured.",
      details: { persona: role }
    });
    return NextResponse.json({ error: `${role} beta password is not configured.` }, { status: 503 });
  }
  if (!betaSessionSecretConfigured()) {
    appendAuditEvent({
      type: "beta_auth_login",
      role,
      actor: session.identity.id,
      status: "blocked",
      summary: "Internal beta login blocked because session signing is not configured.",
      details: { persona: role }
    });
    return NextResponse.json({ error: "Beta session signing secret is not configured." }, { status: 503 });
  }
  if (!betaPasswordMatches(role, password)) {
    appendAuditEvent({
      type: "beta_auth_login",
      role,
      actor: session.identity.id,
      status: "denied",
      summary: "Internal beta login denied for persona.",
      details: { persona: role }
    });
    return NextResponse.json({ error: "Persona password did not match." }, { status: 401 });
  }
  if (inviteRequired && !betaChurchInviteCodesConfigured()) {
    appendAuditEvent({
      type: "beta_auth_login",
      role,
      actor: session.identity.id,
      status: "blocked",
      summary: "Internal beta login blocked because church invite codes are not configured.",
      details: { persona: role, inviteRequired: true }
    });
    return NextResponse.json({ error: "Church-location invite codes are not configured for Contributor and above." }, { status: 503 });
  }

  const inviteMatch = inviteRequired ? betaChurchInviteCodeMatches(invitationCode) : null;
  if (inviteRequired && !inviteMatch) {
    appendAuditEvent({
      type: "beta_auth_login",
      role,
      actor: session.identity.id,
      status: "denied",
      summary: "Internal beta login denied because church invite code did not match.",
      details: { persona: role, inviteRequired: true }
    });
    return NextResponse.json({ error: "Contributor and above need a church-location invite code." }, { status: 401 });
  }

  const value = await createBetaSessionCookieValue(role, Date.now(), inviteMatch?.churchLocation);
  if (!value) {
    appendAuditEvent({
      type: "beta_auth_login",
      role,
      actor: session.identity.id,
      status: "blocked",
      summary: "Internal beta login blocked because session could not be signed.",
      details: { persona: role }
    });
    return NextResponse.json({ error: "Beta session could not be signed." }, { status: 503 });
  }

  appendAuditEvent({
    type: "beta_auth_login",
    role,
    actor: `internal-beta:${role}`,
    status: "allowed",
    summary: "Internal beta persona logged in.",
    details: { persona: role, churchLocation: inviteMatch?.churchLocation || null }
  });

  const response = NextResponse.json({
    ok: true,
    role,
    returnTo,
    personas: betaPersonas.map(({ role: personaRole, label }) => ({ role: personaRole, label }))
  });
  response.cookies.set({
    name: BETA_SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: BETA_SESSION_MAX_AGE_SECONDS
  });
  return response;
}
