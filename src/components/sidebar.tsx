"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Youtube,
  ScanSearch,
  ListChecks,
  Menu,
  Bot,
  CalendarCheck,
  ChevronLeft,
} from "lucide-react";

type Me = { full_name?: string; email?: string };

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Study Planner", href: "/study-plan", icon: CalendarCheck },
  { label: "Notes Summarizer", href: "/summarizer", icon: FileText },
  { label: "AI Tutor", href: "/tutor", icon: Bot },
  { label: "YouTube Transcript Generator", href: "/youtube", icon: Youtube },
  { label: "OCR Doubt Solver", href: "/doubt", icon: ScanSearch },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  // persist collapse
  useEffect(() => {
    const saved = localStorage.getItem("bb_sidebar_collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("bb_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // load user for the card
  useEffect(() => {
    const token = Cookies.get("bb_token");
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => {});
  }, []);

  const logout = () => {
    Cookies.remove("bb_token");
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        // below Topbar (h-14), sticky, glassy card bg
        "sticky top-14 h-[calc(100vh-3.5rem)] border-r bg-card/60 backdrop-blur",
        "transition-all duration-300",
        collapsed ? "w-[80px]" : "w-[280px]"
      )}
    >
      {/* Minimal header: only collapse control (no logo, no theme toggle) */}
      <div className="flex items-center justify-end px-4 py-3">
        <Button
          variant="outline"
          size="icon"
          className={cn(collapsed && "mx-auto")}
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="mt-2 px-3">
        <ul className="space-y-2">
          {items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                    "hover:bg-muted",
                    collapsed && "justify-center",
                    active &&
                      "text-white shadow-sm bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-600"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-white")} />
                  {!collapsed && (
                    <span className={cn("text-sm font-medium", active ? "text-white" : "text-foreground")}>
                      {label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile card */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div
          className={cn(
            "rounded-2xl border p-3 bg-background shadow-sm flex items-center gap-3",
            collapsed && "justify-center"
          )}
        >
          <Image
            src="/avatar-placeholder.png" // replace with your user photo if available
            alt="Avatar"
            width={36}
            height={36}
            className="rounded-full"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-semibold">{me?.full_name || "Your Name"}</div>
              <div className="text-xs text-muted-foreground truncate">{me?.email || "Instructor"}</div>
            </div>
          )}
          {!collapsed && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={logout}>
              Logout
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
