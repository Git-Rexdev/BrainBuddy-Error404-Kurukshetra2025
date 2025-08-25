// src/lib/profile.ts
"use client";

import Cookies from "js-cookie";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

// Optional override: comma-separated list of endpoints to check
// e.g. NEXT_PUBLIC_PROFILE_ENDPOINTS=/api/auth/me,/api/auth/students/me
const EXTRA = (process.env.NEXT_PUBLIC_PROFILE_ENDPOINTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_ENDPOINTS = [
  "/api/auth/me",
  "/api/auth/students/me",
  "/api/auth/student",
  "/api/auth/profile",
  "/api/users/me",
  "/api/auth/user",
];

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
  return undefined;
}

// deep search object/array for class_std, classStd, class, any *class*/*std*
function extractClassStdDeep(anyObj: unknown): number | undefined {
  const seen = new Set<any>();
  const walk = (v: any): number | undefined => {
    if (v == null || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);

    const direct =
      toNum((v as any).class_std) ??
      toNum((v as any).classStd) ??
      toNum((v as any).class);
    if (direct != null && direct >= 1 && direct <= 12) return direct;

    for (const key of Object.keys(v)) {
      const val = (v as any)[key];
      if (/(class|std)/i.test(key)) {
        const n = toNum(val);
        if (n != null && n >= 1 && n <= 12) return n;
      }
    }

    for (const key of Object.keys(v)) {
      const maybe = walk((v as any)[key]);
      if (maybe != null) return maybe;
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        const maybe = walk(item);
        if (maybe != null) return maybe;
      }
    }
  };
  return walk(anyObj);
}

export type LinkedClassResult = { classStd?: number; source?: string; raw?: any };

export async function getLinkedClassStd(opts?: {
  bypassCache?: boolean;
}): Promise<LinkedClassResult> {
  // 1) Fast path: localStorage
  if (!opts?.bypassCache && typeof window !== "undefined") {
    const local = window.localStorage.getItem("bb_class_std");
    const n = toNum(local || undefined);
    if (n) return { classStd: n, source: "localStorage:bb_class_std" };
  }

  // 2) Server endpoints
  const token = Cookies.get("bb_token") || "";
  if (!token || !API) return {};

  const endpoints = [...EXTRA, ...DEFAULT_ENDPOINTS];
  for (const path of endpoints) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const json = await res.json();
      const cls = extractClassStdDeep(json);
      if (typeof cls === "number") {
        // write-through cache for snappy future loads
        try {
          if (typeof window !== "undefined")
            window.localStorage.setItem("bb_class_std", String(cls));
        } catch {}
        return { classStd: cls, source: path, raw: json };
      }
    } catch {
      // try next
    }
  }
  return {};
}
