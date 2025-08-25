// src/components/topbar.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import SiteLogo from "./site-logo";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/theme-toggle";
import ApiHealth from "@/components/api-health";

export default function Topbar() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const check = () => setAuthed(!!Cookies.get("bb_token"));
    check();
    // keep it in sync after login/logout navigations
    window.addEventListener("focus", check);
    const id = window.setInterval(check, 5000);
    return () => {
      window.removeEventListener("focus", check);
      clearInterval(id);
    };
  }, []);

  const logout = () => {
    Cookies.remove("bb_token");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <SiteLogo />
        <div className="flex items-center gap-2">
          {authed && <ApiHealth />}        {/* only show when logged in */}
          <ThemeToggle />
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
