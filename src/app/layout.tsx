// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Topbar from "@/components/topbar";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/footer";
import EduChatWidget from "@/components/edu-chat-widget";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "BrainBuddy",
  description: "Enhancing learning with AI",
};

// ✅ make sure server doesn’t cache around cookie changes
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const authed = !!cookieStore.get("bb_token")?.value;

  const headerH = 56; // px
  const footerH = 48; // px

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {/* Fixed sidebar (controlled by global CSS var --bb-sidebar-w) */}
          {authed && (
            <div
              className="fixed inset-y-0 left-0 z-40 border-r bg-background"
              style={{ width: "var(--bb-sidebar-w, 288px)" }}
            >
              <Sidebar />
            </div>
          )}

          {/* Fixed topbar */}
          <div
            className="fixed top-0 right-0 z-40 border-b bg-background/70 backdrop-blur"
            style={{ left: authed ? "var(--bb-sidebar-w, 288px)" : 0, height: headerH }}
          >
            <Topbar />
          </div>

          {/* Fixed footer */}
          <div
            className="fixed bottom-0 right-0 z-40 border-t bg-background/70 backdrop-blur"
            style={{ left: authed ? "var(--bb-sidebar-w, 288px)" : 0, height: footerH }}
          >
            <Footer />
          </div>

          {/* Only content scrolls */}
          <div
            className="h-screen overflow-hidden"
            style={{ paddingLeft: authed ? "var(--bb-sidebar-w, 288px)" : 0 }}
          >
            <main
              className="relative overflow-y-auto p-4 md:p-6"
              // header + 24px extra space so section headers never hide under it
              style={{
                paddingTop: headerH + 24,
                paddingBottom: footerH,
                height: `calc(100vh - ${headerH}px - ${footerH}px)`,
              }}
            >
              {children}
            </main>
          </div>

          {/* EduChat bubble above footer */}
          {authed && (
            <div
              className="fixed z-50"
              style={{ left: "var(--bb-sidebar-w, 288px)", right: 16, bottom: footerH + 16 }}
            >
              <EduChatWidget />
            </div>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
