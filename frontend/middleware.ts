import { NextRequest, NextResponse } from "next/server";
import {
  BETA_SESSION_COOKIE,
  betaAuthEnabled,
  betaLoginPathForReturn,
  verifyBetaSessionCookieValue
} from "@/lib/beta-auth";

const PUBLIC_FILE = /\.(?:ico|png|jpg|jpeg|gif|webp|svg|css|js|txt|xml|json|map)$/i;

function isPublicPath(pathname: string) {
  return pathname.startsWith("/_next/")
    || pathname.startsWith("/brand/")
    || pathname === "/favicon.ico"
    || PUBLIC_FILE.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/brand-hub" || pathname.startsWith("/brand-hub/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/guide";
    url.searchParams.set("section", "policies");
    url.hash = "policies";
    return NextResponse.redirect(url);
  }
  if (!betaAuthEnabled()) return NextResponse.next();

  if (isPublicPath(pathname)) return NextResponse.next();
  if (pathname === "/beta-login" || pathname.startsWith("/api/beta-auth/")) {
    return NextResponse.next();
  }

  const session = await verifyBetaSessionCookieValue(request.cookies.get(BETA_SESSION_COOKIE)?.value);
  if (session) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tjc-beta-role", session.role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.redirect(new URL(betaLoginPathForReturn(pathname, search), request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
