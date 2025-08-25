"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Markdown from "@/components/markdown";

// --- backend contract ---
const ENDPOINT = "/api/notes/summarize";
const FILE_FIELD = "file";      // required by backend
const PROMPT_FIELD = "prompt";  // optional prompt
// ------------------------

type SummarizeResponse = {
  title?: string;
  summary?: string;
  summarized_text?: string;
  answer?: string;
  bullets?: string[];
  points?: string[];
  chunks?: string[];
  [k: string]: any;
};

function extractSummary(res: SummarizeResponse): string {
  if (typeof res.summary === "string") return res.summary;
  if (typeof res.summarized_text === "string") return res.summarized_text;
  if (typeof res.answer === "string") return res.answer;
  if (Array.isArray(res.bullets)) return res.bullets.map((b) => `- ${b}`).join("\n");
  if (Array.isArray(res.points)) return res.points.map((b) => `- ${b}`).join("\n");
  if (Array.isArray(res.chunks)) return res.chunks.join("\n\n");
  try { return JSON.stringify(res, null, 2); } catch { return String(res); }
}

export default function SummarizerPage() {
  const [tab, setTab] = useState<"text" | "file">("text");

  // text mode
  const [text, setText] = useState("");
  // file mode
  const [file, setFile] = useState<File | null>(null);

  const [prompt, setPrompt] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ title?: string } | null>(null);

  const token = Cookies.get("bb_token") || "";

  const summarize = async (fd: FormData) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${ENDPOINT}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // do NOT set Content-Type with FormData
      body: fd,
    });

    if (!res.ok) {
      const txt = await res.text();
      try {
        const j = JSON.parse(txt);
        if (Array.isArray(j?.detail)) {
          const msg = j.detail.map((d: any) => d.msg || JSON.stringify(d)).join("\n");
          throw new Error(msg);
        }
        throw new Error(j.message || txt);
      } catch {
        throw new Error(txt || `HTTP ${res.status}`);
      }
    }

    const json: SummarizeResponse = await res.json();
    setMeta({ title: json.title });
    setResult(extractSummary(json));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setMeta(null);

    try {
      setLoading(true);

      const fd = new FormData();

      if (tab === "text") {
        if (!text.trim()) throw new Error("Please paste some notes.");
        // Create a virtual text file so backend receives `file`
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        fd.append(FILE_FIELD, new File([blob], "notes.txt", { type: "text/plain" }));
      } else {
        if (!file) throw new Error("Please choose a file.");
        fd.append(FILE_FIELD, file);
      }

      if (prompt.trim()) fd.append(PROMPT_FIELD, prompt.trim());

      await summarize(fd);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl pt-6 grid gap-6 md:grid-cols-2">
      {/* LEFT: input */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Notes Summarizer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "text" | "file")}>
              <TabsList>
                <TabsTrigger value="text">Paste Text</TabsTrigger>
                <TabsTrigger value="file">Upload File</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-3">
                <label className="text-sm font-medium">Your notes</label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste notes, lecture text, or transcription…"
                  className="min-h-[220px] resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  We’ll send this as a small <code>.txt</code> file to match the backend.
                </p>
              </TabsContent>

              <TabsContent value="file" className="space-y-3">
                <label htmlFor="file" className="text-sm font-medium">Upload file</label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.txt,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Supports PDF / TXT / images (if OCR is enabled).
                </p>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium">Optional style / instructions</label>
              <Input
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., bullet points with key formulas; max 150 words"
              />
            </div>

            <Button type="submit" disabled={loading || (tab === "text" ? text.trim().length === 0 : !file)}>
              {loading ? "Summarizing…" : "Summarize"}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Request failed</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* RIGHT: output */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Summary</CardTitle>
          {meta?.title && <Badge variant="secondary" className="truncate max-w-[60%]">{meta.title}</Badge>}
        </CardHeader>
        <CardContent>
          {!result && !loading && (
            <p className="text-sm text-muted-foreground">No summary yet. Paste notes or upload a file to begin.</p>
          )}
          {loading && <p className="text-sm text-muted-foreground">Working…</p>}
          {result && <Markdown content={result} />}
        </CardContent>
      </Card>
    </div>
  );
}
