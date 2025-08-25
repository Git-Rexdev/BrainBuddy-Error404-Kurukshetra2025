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

/** Zod schema with safe coercion string -> number (works on all Zod 3.x) */
const Schema = z.object({
  email: z.string().email("Enter a valid email"),
  class_std: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z.number().int().min(1, "Min 1").max(12, "Max 12")
  ),
});

/** Minimal custom resolver to avoid @hookform/resolvers version clashes */
const zodRHFResolver: Resolver<Values> = async (values) => {
  const parsed = Schema.safeParse(values);
  if (parsed.success) {
    return { values: parsed.data, errors: {} };
  }
  const errors: Record<string, any> = {};
  for (const issue of parsed.error.issues) {
    const name = issue.path.join(".");
    errors[name] = { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};

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
    resolver: zodRHFResolver, // 👈 use our custom resolver
    defaultValues: { email: "", class_std: 1 },
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
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
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
            <Label htmlFor="class_std">Class (1–12)</Label>
            <Input
              id="class_std"
              type="number"
              min={1}
              max={12}
              {...register("class_std", { valueAsNumber: true })}
            />
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
