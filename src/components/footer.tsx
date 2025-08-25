// src/components/footer.tsx
import React from "react";

export default function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`w-full ${className}`} role="contentinfo" aria-label="Site footer">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground">
        {/* left side */}
        <div className="flex items-center gap-2 overflow-hidden">
          <span>© {new Date().getFullYear()} BrainBuddy</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline truncate">Enhancing learning with AI</span>
        </div>

        {/* right side */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Made by</span>
          <strong className="text-foreground font-semibold">Team Error&nbsp;404</strong>
        </div>
      </div>
    </footer>
  );
}
