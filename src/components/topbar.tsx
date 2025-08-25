// src/components/topbar.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import SiteLogo from "./site-logo";
import { Button } from "@/components/ui/button";
import UserProfile from "@/components/user-profile";
import ThemeToggle from "@/components/theme-toggle";
import ApiHealth from "@/components/api-health";
import { LogIn, Menu } from "lucide-react";

type Me = { full_name?: string; email?: string };

export default function Topbar() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

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

  // Load user data for profile indicator
  useEffect(() => {
    if (!authed) return;
    
    const token = Cookies.get("bb_token");
    if (!token) return;
    
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => {});
  }, [authed]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-3 sm:px-4">
        <SiteLogo />
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hide API health on very small screens */}
          {authed && <div className="hidden sm:block"><ApiHealth /></div>}
          <ThemeToggle />
          
          {authed ? (
            <div className="flex items-center gap-2">
              {/* Hide user profile on small screens */}
              <div className="hidden md:block">
                <UserProfile
                  user={me}
                  variant="compact"
                  className="px-3 py-1.5 rounded-lg bg-muted/50"
                />
              </div>
              {/* Show dashboard button on all screen sizes */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push("/dashboard")}
                className="text-muted-foreground hover:text-foreground text-xs sm:text-sm"
              >
                Dashboard
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => router.push("/login")} 
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
              size="sm"
            >
              <LogIn className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
