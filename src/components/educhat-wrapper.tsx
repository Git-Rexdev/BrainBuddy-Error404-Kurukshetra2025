"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import the EduChat widget
const EduChatWidget = dynamic(() => import("./edu-chat-widget"), {
  ssr: false,
});

export default function EduChatWrapper() {
  const pathname = usePathname();
  
  // Don't show floating widget on dashboard page
  if (pathname === "/dashboard") {
    return null;
  }
  
  return <EduChatWidget mode="floating" />;
}
