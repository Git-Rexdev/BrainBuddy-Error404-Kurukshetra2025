"use client";

import { useMemo } from "react";
import Markdown from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type AnyObj = Record<string, any>;

function safeParse<T = any>(s: unknown): T | null {
  if (typeof s !== "string") return null;
  try { return JSON.parse(s); } catch { return null; }
}

function stringifyMD(obj: any): string {
  try { return "```json\n" + JSON.stringify(obj, null, 2) + "\n```"; } catch { return String(obj); }
}

export default function PlanRenderer({ payload }: { payload: any }) {
  // Normalize: try common fields, then try parse, then fallback
  const normalized = useMemo(() => {
    if (!payload) return { kind: "empty" as const };

    const direct =
      (typeof payload === "string" && payload) ||
      payload.plan ||
      payload.study_plan ||
      payload.answer ||
      payload.text ||
      payload.content ||
      payload.result;

    // If direct string contains JSON, prefer parsed
    const parsedFromDirect = safeParse(direct);
    const parsedPayload = parsedFromDirect ?? (typeof payload === "string" ? null : payload);

    // If we have structured data with weeks or days, use it
    if (parsedPayload && typeof parsedPayload === "object") {
      const weeks =
        parsedPayload.weeks ||
        parsedPayload.week_plan ||
        parsedPayload.plan?.weeks ||
        parsedPayload.study_plan?.weeks;

      const days =
        parsedPayload.days ||
        parsedPayload.schedule ||
        parsedPayload.daily_plan;

      if (Array.isArray(weeks)) return { kind: "weeks" as const, weeks };
      if (Array.isArray(days)) return { kind: "days" as const, days };
    }

    // Otherwise treat as markdown/text
    const text = typeof direct === "string" ? direct : (typeof payload === "string" ? payload : stringifyMD(payload));
    return { kind: "markdown" as const, text };
  }, [payload]);

  const copy = async () => {
    const text =
      normalized.kind === "markdown"
        ? normalized.text
        : normalized.kind === "weeks"
        ? stringifyMD({ weeks: normalized.weeks })
        : normalized.kind === "days"
        ? stringifyMD({ days: normalized.days })
        : "";
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const download = () => {
    const text =
      normalized.kind === "markdown"
        ? normalized.text
        : stringifyMD(
            normalized.kind === "weeks" ? { weeks: normalized.weeks } :
            normalized.kind === "days" ? { days: normalized.days } : {}
          );
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "study-plan.md"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={copy}>Copy</Button>
        <Button size="sm" variant="outline" onClick={download}>Download .md</Button>
      </div>

      {normalized.kind === "markdown" && <Markdown content={normalized.text} />}

      {normalized.kind === "weeks" && (
        <Accordion type="multiple" className="w-full">
          {normalized.weeks.map((w: AnyObj, i: number) => {
            const title = w.title || w.week || `Week ${i + 1}`;
            const topics: string[] =
              Array.isArray(w.topics) ? w.topics : (typeof w.topics === "string" ? [w.topics] : []);
            const schedule: AnyObj[] =
              Array.isArray(w.schedule) ? w.schedule : (Array.isArray(w.days) ? w.days : []);

            return (
              <AccordionItem key={i} value={`w-${i}`}>
                <AccordionTrigger className="text-left">{title}</AccordionTrigger>
                <AccordionContent>
                  {topics.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs uppercase text-muted-foreground mb-1">Topics</div>
                      <ul className="list-disc pl-5 space-y-1">
                        {topics.map((t, j) => <li key={j}>{t}</li>)}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(schedule) && schedule.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs uppercase text-muted-foreground">Schedule</div>
                      <div className="space-y-3">
                        {schedule.map((d: AnyObj, k: number) => {
                          const label = d.title || d.day || `Day ${k + 1}`;
                          const tasks: string[] =
                            Array.isArray(d.tasks) ? d.tasks :
                            Array.isArray(d.items) ? d.items :
                            typeof d.content === "string" ? [d.content] : [];
                          return (
                            <div key={k} className="rounded-lg border p-2">
                              <div className="text-sm font-medium mb-1">{label}</div>
                              {tasks.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1">
                                  {tasks.map((t, m) => <li key={m}>{t}</li>)}
                                </ul>
                              ) : (
                                <div className="text-sm text-muted-foreground">No tasks</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {normalized.kind === "days" && (
        <div className="space-y-3">
          {normalized.days.map((d: AnyObj, i: number) => {
            const title = d.title || d.day || `Day ${i + 1}`;
            const tasks: string[] =
              Array.isArray(d.tasks) ? d.tasks :
              Array.isArray(d.items) ? d.items :
              typeof d.content === "string" ? [d.content] : [];
            return (
              <div key={i} className="rounded-lg border p-3">
                <div className="text-sm font-semibold mb-1">{title}</div>
                {tasks.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {tasks.map((t, j) => <li key={j}>{t}</li>)}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">No tasks</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
