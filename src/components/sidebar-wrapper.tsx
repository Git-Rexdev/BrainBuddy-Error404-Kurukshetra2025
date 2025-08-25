"use client";

import dynamic from "next/dynamic";

// Dynamically import the sidebar to avoid server-side issues
const Sidebar = dynamic(() => import("./sidebar"), {
  ssr: false,
  loading: () => <div className="w-0 lg:w-[280px]" />
});

export default function SidebarWrapper() {
  return <Sidebar />;
}
