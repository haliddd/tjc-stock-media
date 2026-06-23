import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Crimson_Text, Geist_Mono, Noto_Sans_TC, Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "./dam-v3-final.css";
import "./dam-enterprise.css";
import "./dam-senior-staff.css";
import "./prototype-dam.css";
import { AppChrome } from "@/components/AppChrome";
import { RoleProvider } from "@/components/RoleProvider";
import { BETA_SESSION_COOKIE, betaAuthEnabled, verifyBetaSessionCookieValue } from "@/lib/beta-auth";
import { trustedRoleFromHeaders } from "@/lib/request-identity";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap"
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson-text",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap"
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap"
});

const notoSansTc = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  display: "swap"
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "True Jesus Church Media Library",
  description: "Approved media for ministry teams"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const betaEnabled = betaAuthEnabled();
  const cookieStore = await cookies();
  const headerStore = await headers();
  const betaSession = betaEnabled
    ? await verifyBetaSessionCookieValue(cookieStore.get(BETA_SESSION_COOKIE)?.value)
    : null;
  const role = betaSession?.role || trustedRoleFromHeaders(headerStore) || "Viewer";

  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${crimsonText.variable} ${playfairDisplay.variable} ${notoSansTc.variable} ${geistMono.variable} font-sans`}>
        <RoleProvider initialRole={role} betaLocked={Boolean(betaEnabled && betaSession)}>
          <AppChrome>{children}</AppChrome>
        </RoleProvider>
      </body>
    </html>
  );
}
