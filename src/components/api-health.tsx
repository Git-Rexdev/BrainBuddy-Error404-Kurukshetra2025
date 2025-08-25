"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Status = "checking" | "online" | "degraded" | "offline" | "config";

export default function ApiHealth({ intervalMs = 15000 }: { intervalMs?: number }) {
  const [status, setStatus] = useState<Status>("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  async function check() {
    if (!API_BASE) {
      setStatus("config");
      setLatency(null);
      setLastChecked(Date.now());
      return;
    }
    setStatus("checking");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    const t0 = performance.now();
    try {
      const res = await fetch(`${API_BASE}/api/healthz`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const t1 = performance.now();
      setLatency(Math.round(t1 - t0));
      setLastChecked(Date.now());

      if (res.ok) {
        setStatus("online");
      } else {
        setStatus("degraded"); // reachable but non-200
      }
    } catch {
      setStatus("offline");
      setLatency(null);
      setLastChecked(Date.now());
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  useEffect(() => {
    check();
    timerRef.current = window.setInterval(check, intervalMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, intervalMs]);

  const color =
    status === "online"
      ? "bg-emerald-500"
      : status === "degraded"
      ? "bg-amber-500"
      : status === "checking" || status === "config"
      ? "bg-slate-400"
      : "bg-red-500";

  const label =
    status === "online"
      ? "API: Online"
      : status === "degraded"
      ? "API: Degraded"
      : status === "checking"
      ? "API: Checking…"
      : status === "config"
      ? "API: Set base URL"
      : "API: Offline";

  const title =
    lastChecked
      ? `Last checked: ${new Date(lastChecked).toLocaleTimeString()}`
      : "Click to check now";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={check}
      className="gap-2"
      title={title}
      aria-label="API health"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-xs sm:text-sm">
        {label}
        {latency != null && status !== "checking" && status !== "config" ? ` (${latency}ms)` : ""}
      </span>
    </Button>
  );
}
