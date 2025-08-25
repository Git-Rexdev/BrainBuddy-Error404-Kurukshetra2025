// src/app/youtube/page.tsx
"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LOAD_ENDPOINT = "/api/ytchat/load";
const ASK_ENDPOINT  = "/api/ytchat/ask";

// Backend expects these keys:
const URL_FIELD = "video_url";   // <-- IMPORTANT: was "url"
const ID_FIELD  = "video_id";

type LoadResp = {
  title?: string;
  video_id?: string;
  session_id?: string;
  transcript?: string;
  chunks?: string[];
  [k: string]: any;
};
type AskResp = {
  answer?: string;
  text?: string;
  content?: string;
  [k: string]: any;
};

function extractTranscript(r: LoadResp) {
  if (typeof r.transcript === "string") return r.transcript;
  if (Array.isArray(r.chunks)) return r.chunks.join("\n\n");
  try { return JSON.stringify(r, null, 2); } catch { return String(r); }
}
function extractAnswer(r: AskResp) {
  return r.answer || r.text || r.content || (() => {
    try { return JSON.stringify(r, null, 2); } catch { return String(r); }
  })();
}

export default function YouTubePage() {
  const [input, setInput] = useState("");           // URL or ID
  const [title, setTitle] = useState<string>();
  const [videoId, setVideoId] = useState<string>();
  const [sessionId, setSessionId] = useState<string>();
  const [transcript, setTranscript] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<{role:"user"|"assistant"; content:string}[]>([]);
  const [asking, setAsking] = useState(false);
  const token = Cookies.get("bb_token") || "";

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setTranscript(undefined);
    setTitle(undefined);
    setVideoId(undefined);
    setSessionId(undefined);
    setChat([]);

    if (!input.trim()) {
      setErr("Paste a YouTube URL or enter a Video ID.");
      return;
    }

    // Build JSON body: if it looks like a URL, send { video_url }, else { video_id }
    const looksLikeUrl = /youtu\.be|youtube\.com/i.test(input);
    const body = looksLikeUrl ? { [URL_FIELD]: input.trim() } : { [ID_FIELD]: input.trim() };

    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${LOAD_ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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
          throw new Error(txt || `Request failed (${res.status})`);
        }
      }

      const json: LoadResp = await res.json();
      setTitle(json.title);
      if (json.video_id) setVideoId(String(json.video_id));
      if (json.session_id) setSessionId(String(json.session_id));
      setTranscript(extractTranscript(json));
    } catch (e: any) {
      setErr(e?.message || "Failed to load transcript.");
    } finally {
      setLoading(false);
    }
  };

const handleAsk = async (e: React.FormEvent) => {
  e.preventDefault();
  setErr(null);
  if (!question.trim()) return;
  if (!sessionId && !videoId) {
    setErr("Load a video first.");
    return;
  }

  const userMsg = question.trim();
  setChat((c) => [...c, { role: "user", content: userMsg }]);
  setQuestion("");

  const body: Record<string, any> = { question: userMsg };
  if (sessionId) body.session_id = sessionId;
  else if (videoId) body.video_id = videoId;

  try {
    setAsking(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${ASK_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
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
        throw new Error(txt || `Request failed (${res.status})`);
      }
    }
    // Changed: Expect plain text response
    const answerText = await res.text();
    setChat((c) => [...c, { role: "assistant", content: answerText }]);
  } catch (e: any) {
    setErr(e?.message || "Failed to get an answer.");
  } finally {
    setAsking(false);
  }
};
  return (
    <div className="mx-auto max-w-6xl pt-6 grid gap-6 md:grid-cols-2">
      {/* LEFT: Loader + Transcript */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>YouTube Transcript Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoad} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="yt" className="text-sm font-medium">YouTube URL or Video ID</label>
              <Input
                id="yt"
                placeholder="https://www.youtube.com/watch?v=…  or  dQw4w9WgXcQ"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Loading…" : "Load Video"}
            </Button>
            {err && (
              <Alert variant="destructive">
                <AlertTitle>Oops</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{err}</AlertDescription>
              </Alert>
            )}
          </form>

          <Separator className="my-4" />

          {!transcript && !loading && (
            <p className="text-sm text-muted-foreground">No transcript loaded yet.</p>
          )}
          {title && <Badge variant="secondary" className="mb-2">{title}</Badge>}
          {transcript && (
            <div className="rounded-lg border p-3 text-sm max-h-[360px] overflow-auto whitespace-pre-wrap">
              {transcript}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RIGHT: Q&A */}
      <Card>
        <CardHeader>
          <CardTitle>Ask Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAsk} className="space-y-3">
            <Textarea
              placeholder="Ask about the video (e.g., 'Summarize section on backpropagation')"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[110px] resize-y"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={asking || (!sessionId && !videoId)}>
                {asking ? "Thinking…" : "Ask"}
              </Button>
              {(sessionId || videoId) && (
                <Badge variant="outline" className="ml-auto">
                  {sessionId ? `Session: ${sessionId}` : `Video: ${videoId}`}
                </Badge>
              )}
            </div>
          </form>

          <Separator />

          {chat.length === 0 && (
            <p className="text-sm text-muted-foreground">No questions yet.</p>
          )}
          {chat.length > 0 && (
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user"
                    ? "rounded-lg border p-3 text-sm"
                    : "rounded-lg border p-3 text-sm bg-muted"}
                >
                  <div className="text-xs uppercase text-muted-foreground mb-1">
                    {m.role === "user" ? "You" : "Assistant"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
