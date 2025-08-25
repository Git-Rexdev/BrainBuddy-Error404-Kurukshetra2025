// src/components/profile-link-modal.tsx
"use client";

import * as React from "react";
import Cookies from "js-cookie";
import { useForm, SubmitHandler, type Resolver } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Final form values shape */
type Values = { email: string; class_std: number };

/** Zod schema with safe coercion string -> number, and range 5–10 */
const Schema = z.object({
  email: z.string().email("Enter a valid email"),
  class_std: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z.number().int().min(5, "Minimum class is 5").max(10, "Maximum class is 10")
  ),
});

/** Minimal custom resolver to avoid @hookform/resolvers version clashes */
const zodRHFResolver: Resolver<Values> = async (values) => {
  const parsed = Schema.safeParse(values);
  if (parsed.success) return { values: parsed.data, errors: {} };

  const errors: Record<string, { type: string; message: string }> = {};
  for (const issue of parsed.error.issues) {
    const name = issue.path.join(".");
    errors[name] = { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};

/** Parse common FastAPI validation errors to human messages */
async function parseApiError(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const j = await res.json();
      if (Array.isArray(j?.detail)) {
        const msgs = j.detail.map((d: any) => {
          const path = Array.isArray(d?.loc) ? d.loc.join(".") : "";
          if (path.includes("class_std")) {
            if (d?.type?.includes("less_than_equal") && d?.ctx?.le) return `Class must be ≤ ${d.ctx.le}.`;
            if (d?.type?.includes("greater_than_equal") && d?.ctx?.ge) return `Class must be ≥ ${d.ctx.ge}.`;
          }
          return d?.msg ? String(d.msg) : "Invalid input.";
        });
        return msgs.join("\n");
      }
      if (typeof j?.detail === "string") return j.detail;
    } catch {
      /* fall through */
    }
  }
  return (await res.text().catch(() => res.statusText)) || "Request failed.";
}

export default function ProfileLinkModal({
  open,
  onOpenChange,
  onLinked, // optional callback after success
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLinked?: (payload: Values) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Values>({
    resolver: zodRHFResolver,
    defaultValues: { email: "", class_std: 5 },
  });

  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const onSubmit: SubmitHandler<Values> = async (values) => {
    setErr(null);
    setOk(null);
    const token = Cookies.get("bb_token") || "";

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/students/link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(values),
        }
      );

      if (!res.ok) {
        const msg = await parseApiError(res);
        throw new Error(msg);
      }

      // Write-through cache so other pages (Study Plan) see it instantly
      try {
        window.localStorage.setItem("bb_class_std", String(values.class_std));
        window.localStorage.setItem("bb_profile_email", values.email);
      } catch {}

      setOk("Profile linked successfully.");
      onLinked?.(values);

      // brief success then close
      setTimeout(() => {
        onOpenChange(false);
        setOk(null);
      }, 800);
    } catch (e: any) {
      setErr(e?.message || "Failed to link profile.");
    }
  };

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setErr(null);
      setOk(null);
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link your student profile</DialogTitle>
          <DialogDescription>
            Add your email and class to personalize your AI tutor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Student email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{String(errors.email.message || "")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="class_std">Class (5–10)</Label>
            <Input
              id="class_std"
              type="number"
              min={5}
              max={10}
              {...register("class_std", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">Supported classes: 5–10.</p>
            {errors.class_std && (
              <p className="text-sm text-red-500">{String(errors.class_std.message || "")}</p>
            )}
          </div>

          {err && <p className="text-sm text-red-500 whitespace-pre-wrap">{err}</p>}
          {ok && <p className="text-sm text-green-600">{ok}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
