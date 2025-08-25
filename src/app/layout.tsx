// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers"; // async in Next 15
import { ThemeProvider } from "@/components/theme-provider";
import Topbar from "@/components/topbar";
import Sidebar from "@/components/sidebar";
import EduChatWidget from "@/components/edu-chat-widget";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "BrainBuddy",
  description: "Enhancing learning with AI",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Await cookie store (fixes TS2339)
  const cookieStore = await cookies();
  const token = cookieStore.get("bb_token")?.value;
  const isAuthed = Boolean(token);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Topbar />
          <div className="flex flex-col lg:flex-row min-h-screen">
            {isAuthed ? <Sidebar /> : null}
            <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 min-h-screen lg:min-h-0 lg:border-l-0">
              {children}
            </main>
          </div>
          
          <Footer />

          {/* Floating Edu Chat - only show on non-dashboard pages */}
          <EduChatWidget mode="floating" />
        </ThemeProvider>
      </body>
    </html>
  );
}
