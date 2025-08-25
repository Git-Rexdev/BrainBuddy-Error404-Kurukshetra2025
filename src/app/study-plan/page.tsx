// src/app/study-plan/page.tsx
"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RotateCw } from "lucide-react";

import PlanRenderer from "@/components/plan-renderer";
import { getLinkedClassStd } from "@/lib/profile";

type PlanResponse = Record<string, any>;

// Allowed subjects (server validates on its side)
const SUBJECTS = [
  { label: "English", value: "english" },
  { label: "Maths", value: "maths" },
  { label: "Science", value: "science" },
  { label: "Social Studies", value: "social studies" },
  { label: "Coding", value: "coding" },
  { label: "Other…", value: "__custom__" },
];

export default function StudyPlanPage() {
  const [subject, setSubject] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");

  // UI-only (kept for future backend versions)
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");

  // linked class detection
  const [classStd, setClassStd] = useState<number | undefined>(undefined);
  const [classSource, setClassSource] = useState<string | undefined>(undefined);
  const [checkingClass, setCheckingClass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planPayload, setPlanPayload] = useState<any>(null);

  const resolvedSubject = subject === "__custom__" ? customSubject.trim() : subject;

  const loadClass = async (bypassCache = false) => {
    setCheckingClass(true);
    try {
      const { classStd, source } = await getLinkedClassStd({ bypassCache });
      setClassStd(classStd);
      setClassSource(source);
    } finally {
      setCheckingClass(false);
    }
  };

  useEffect(() => {
    void loadClass(false);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPlanPayload(null);

    if (!resolvedSubject) {
      setError("Please choose or enter a subject.");
      return;
    }

    try {
      setLoading(true);
      const token = Cookies.get("bb_token") || "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/study/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // Backend requires ONLY { subject }
        body: JSON.stringify({ subject: resolvedSubject }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (txt.includes("invalid subject for class_std")) {
          throw new Error(
            "This subject isn’t valid for your class. If you just linked/changed class, hit Refresh and try again."
          );
        }
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const json: PlanResponse = await res.json();
      setPlanPayload(json);
    } catch (err: any) {
      setError(err?.message || "Failed to create study plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl pt-6 grid gap-6 md:grid-cols-2">
      {/* LEFT: inputs */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Study Planner</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subject *</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subject === "__custom__" && (
                <Input
                  className="mt-2"
                  placeholder="Type a subject (e.g., algebra, geometry, biology)"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
              )}

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Linked class:</span>
                <b>{checkingClass ? "checking…" : classStd ?? "not linked"}</b>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  title="Refresh"
                  onClick={() => loadClass(true)}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 10-3 6.7" />
                    <path d="M21 12v7h-7" />
                  </svg>
                </Button>
                {classSource && <Badge variant="outline">from {classSource}</Badge>}
                {!classStd && (
                  <a className="underline text-primary" href="/profile-link">Link now</a>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                The API uses your linked <b>class</b> and this subject only. You can still create a plan even if the class
                display hasn’t updated yet.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="goal">Goal (optional)</label>
              <Input
                id="goal"
                placeholder="e.g., master fractions; prepare for unit test"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="notes">Preferences (optional)</label>
              <Textarea
                id="notes"
                placeholder="e.g., weekends only; include spaced repetition; daily quiz practice"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[120px] resize-y"
              />
            </div>

            <Separator />

            <Button type="submit" disabled={loading || !resolvedSubject}>
              {loading ? "Creating…" : "Create Plan"}
            </Button>

            {error && <p className="text-sm text-red-500 whitespace-pre-wrap">{error}</p>}

            <p className="text-xs text-muted-foreground">
              Backend spec: <code>POST /api/study/plan</code> accepts only <b>{`{ subject: "…" }`}</b>.
              Class comes from your linked profile. Other fields are for your reference.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* RIGHT: output */}
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {!planPayload && !loading && (
            <p className="text-sm text-muted-foreground">
              Choose a subject and click <b>Create Plan</b>.
            </p>
          )}
          {loading && <p className="text-sm text-muted-foreground">Working…</p>}
          {planPayload && <PlanRenderer payload={planPayload} />}
        </CardContent>
      </Card>
    </div>
  );
}
