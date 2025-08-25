"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import UserProfile from "@/components/user-profile";
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
  GraduationCap,
  LogOut,
  X,
} from "lucide-react";

type Me = { full_name?: string; email?: string };

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Study Planner", href: "/study-plan", icon: CalendarCheck },
  { label: "Notes Summarizer", href: "/summarizer", icon: FileText },
  { label: "AI Tutor", href: "/tutor", icon: Bot },
  { label: "Essay Grader", href: "/essay-grader", icon: GraduationCap },
  { label: "YouTube Transcript Generator", href: "/youtube", icon: Youtube },
  { label: "OCR Doubt Solver", href: "/doubt", icon: ScanSearch },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // persist collapse
  useEffect(() => {
    const saved = localStorage.getItem("bb_sidebar_collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("bb_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // load user for the card
  useEffect(() => {
    const token = Cookies.get("bb_token");
    if (!token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    Cookies.remove("bb_token");
    router.push("/login");
  };

  return (
    <>
      {/* Mobile menu button - only visible on small screens */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="h-10 w-10 shadow-lg bg-background/80 backdrop-blur"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Desktop: below Topbar (h-14), sticky, glassy card bg
          "lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:border-r lg:bg-background lg:backdrop-blur",
          // Mobile: full screen overlay
          "lg:relative lg:z-auto",
          "transition-all duration-300",
          // Desktop sizing
          collapsed ? "lg:w-[80px]" : "lg:w-[280px]",
          // Mobile: full width when open
          mobileOpen ? "fixed inset-y-0 left-0 z-50 w-[280px] bg-background border-r shadow-xl" : "hidden lg:block"
        )}
      >
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Desktop header: only collapse control */}
        <div className="hidden lg:flex items-center justify-end px-4 py-3">
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
                      collapsed && "lg:justify-center",
                      active &&
                        "text-white shadow-sm bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-600"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "text-white")} />
                    {(!collapsed || !collapsed) && (
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
              "rounded-2xl border bg-gradient-to-br from-background to-muted/30 p-4 shadow-lg backdrop-blur-sm",
              "transition-all duration-200 hover:shadow-xl",
              collapsed && "lg:justify-center"
            )}
          >
            {collapsed ? (
              <UserProfile
                user={me}
                loading={loading}
                variant="minimal"
                className="mx-auto"
              />
            ) : (
              <UserProfile
                user={me}
                loading={loading}
                showLogout={true}
                onLogout={logout}
              />
            )}
            
            {collapsed && (
              <div className="mt-3 flex justify-center">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="hover:bg-destructive hover:text-destructive-foreground transition-colors" 
                  onClick={logout}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
