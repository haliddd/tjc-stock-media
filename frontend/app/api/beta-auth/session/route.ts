import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { BETA_SESSION_COOKIE, betaAuthEnabled, verifyBetaSessionCookieValue } from "@/lib/beta-auth";
import { publicBuildInfo } from "@/lib/build-info";
import { createDamRouteSession } from "@/lib/dam-route-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  createDamRouteSession(request);
  const build = publicBuildInfo();
  if (!betaAuthEnabled()) return NextResponse.json({ enabled: false, role: null, build });
  const cookieStore = await cookies();
  const session = await verifyBetaSessionCookieValue(cookieStore.get(BETA_SESSION_COOKIE)?.value);
  return NextResponse.json({
    enabled: true,
    role: session?.role || null,
    expiresAt: session?.expiresAt || null,
    build
  }, { status: session ? 200 : 401 });
}
