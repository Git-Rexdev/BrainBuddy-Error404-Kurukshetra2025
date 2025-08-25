// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers"; // async in Next 15
import { ThemeProvider } from "@/components/theme-provider";
import Topbar from "@/components/topbar";
import Sidebar from "@/components/sidebar";
import EduChatWidget from "@/components/edu-chat-widget";

export const metadata: Metadata = {
  title: "BrainBuddy",
  description: "Enhancing learning with AI",
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
          <div className="flex">
            {isAuthed ? <Sidebar /> : null}
            <main className="flex-1 p-4 md:p-6">{children}</main>
          </div>

          {/* Floating Edu Chat (bottom-right) */}
          <EduChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
