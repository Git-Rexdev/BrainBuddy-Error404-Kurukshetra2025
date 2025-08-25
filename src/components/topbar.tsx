// src/components/topbar.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import SiteLogo from "./site-logo";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/theme-toggle";

function ApiHealthBadge() {
  type State = "checking" | "up" | "down";
  const [state, setState] = useState<State>("checking");

  const check = useCallback(async () => {
    setState("checking");
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;
      const url = base ? `${base}/api/healthz` : `/api/bb/healthz`;
      const res = await fetch(url, { cache: "no-store" });
      setState(res.ok ? "up" : "down");
    } catch {
      setState("down");
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [check]);

  const dot =
    state === "checking" ? "bg-muted-foreground animate-pulse" :
    state === "up" ? "bg-emerald-500" : "bg-red-500";

  return (
    <Button variant="outline" size="sm" onClick={check} className="h-8 gap-2" title="Click to re-check API health">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
      <span className="text-xs">{state === "checking" ? "Checking…" : state === "up" ? "API: Online" : "API: Offline"}</span>
    </Button>
  );
}

export default function Topbar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  // re-read cookie on route change & on mount
  useEffect(() => { setAuthed(!!Cookies.get("bb_token")); }, [pathname]);

  const logout = () => {
    Cookies.remove("bb_token", { path: "/" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className={`w-full ${className}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <SiteLogo />
        <div className="flex items-center gap-2">
          {authed && <ApiHealthBadge />}
          {authed && <ThemeToggle />}
          {authed ? (
            <Button variant="destructive" onClick={logout}>Logout</Button>
          ) : (
            <Button onClick={() => router.push("/login")}>Login</Button>
          )}
        </div>
      </div>
    </header>
  );
}
