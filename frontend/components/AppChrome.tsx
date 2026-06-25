"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DamShell } from "@/components/dam/DamShell";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname === "/" || pathname === "/beta-login" || pathname.startsWith("/public-portal/")) return <>{children}</>;

  if (!mounted) {
    return <div className="min-h-dvh bg-tjc-bg" aria-label="Loading DAM workspace" />;
  }

  return <DamShell>{children}</DamShell>;
}
