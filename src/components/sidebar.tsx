"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  Youtube,
  ScanSearch,
  Menu,
  Bot,
  CalendarCheck,
  X,
  ChevronLeft,
  GraduationCap,
} from "lucide-react";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Study Planner", href: "/study-plan", icon: CalendarCheck },
  { label: "Notes Summarizer", href: "/summarizer", icon: FileText },
  { label: "AI Tutor", href: "/tutor", icon: Bot },
  { label: "Essay Grader", href: "/essay-grader", icon: GraduationCap },
  { label: "YouTube Transcript Generator", href: "/youtube", icon: Youtube },
  { label: "OCR Doubt Solver", href: "/doubt", icon: ScanSearch },
];

const EXPANDED_W = "288px";
const COLLAPSED_W = "72px";

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // initialize collapse from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bb_sidebar_collapsed");
      const isCollapsed = saved === "1";
      setCollapsed(isCollapsed);
      document.documentElement.style.setProperty(
        "--bb-sidebar-w",
        isCollapsed ? COLLAPSED_W : EXPANDED_W
      );
    } catch {}
  }, []);

  // persist + update CSS var
  useEffect(() => {
    try {
      localStorage.setItem("bb_sidebar_collapsed", collapsed ? "1" : "0");
      document.documentElement.style.setProperty(
        "--bb-sidebar-w",
        collapsed ? COLLAPSED_W : EXPANDED_W
      );
    } catch {}
  }, [collapsed]);

  // close drawer on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="h-10 w-10 shadow-lg bg-background/80 backdrop-blur"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (desktop fixed wrapper width is set by layout via CSS var) */}
      <aside
        className={cn(
          "h-full border-r bg-background hidden lg:block",
          mobileOpen && "lg:hidden fixed inset-y-0 left-0 z-50 w-[288px] shadow-xl"
        )}
        // On desktop, width is from the layout wrapper; we just fill the height.
        style={mobileOpen ? undefined : { width: "100%" }}
      >
        {/* Mobile header */}
        {mobileOpen && (
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Collapse button */}
        <div className="flex items-center justify-end px-3 py-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="px-2 pb-3">
          <ul className="space-y-1">
            {items.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "group flex items-center rounded-2xl px-3 py-2 transition",
                      "hover:bg-muted",
                      collapsed && "justify-center",
                      active &&
                        "text-white shadow-sm bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-600"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "text-white")} />
                    {/* label hides when collapsed */}
                    {!collapsed && (
                      <span className={cn("ml-3 text-sm font-medium", active ? "text-white" : "text-foreground")}>
                        {label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
