"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Markdown from "@/components/markdown";

type ChatMsg = { role: "user" | "assistant"; content: string };

type AskResp = {
  answer?: string;
  text?: string;
  content?: string;
  message?: string;
  session_id?: string;
  chat_id?: string;
  chat_history?: { role: string; message?: string; content?: string }[];
  [k: string]: any;
};

const ENDPOINT = "/api/aitutor/ask";

function clean(s: string) {
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function extractAnswer(r: AskResp): string {
  // 1) Many backends wrap in { chat_history: [ {role, message}, ... ] }
  if (Array.isArray(r.chat_history)) {
    const lastAi = [...r.chat_history].reverse().find(
      (m) => (m.role === "ai" || m.role === "assistant" || m.role === "system") &&
             typeof (m.message ?? m.content) === "string"
    );
    if (lastAi?.message || lastAi?.content) return clean(String(lastAi.message ?? lastAi.content));
  }
  // 2) Common single-field answers
  const direct = r.answer ?? r.text ?? r.content ?? r.message;
  if (typeof direct === "string") return clean(direct);

  // 3) If the whole thing is a stringified JSON, try to parse it
  try {
    if (typeof (r as any) === "string") {
      const maybe = JSON.parse(r as any);
      return extractAnswer(maybe);
    }
  } catch {}

  // 4) Fallback: pretty JSON
  try { return JSON.stringify(r, null, 2); } catch { return String(r); }
}

export default function TutorPage() {
  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState("");
  const [classStd, setClassStd] = useState<number | "">("");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const token = Cookies.get("bb_token") || "";

  const sendAsk = async (msg: string) => {
    const body: Record<string, any> = { question: msg };
    if (subject.trim()) body.subject = subject.trim();
    if (goal.trim()) body.goal = goal.trim();
    if (classStd) body.class_std = classStd;
    if (sessionId) body.session_id = sessionId;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `HTTP ${res.status}`);
    }

    const json: AskResp = await res.json();
    const sid = json.session_id || json.chat_id;
    if (sid && !sessionId) setSessionId(String(sid));
    return extractAnswer(json);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const q = question.trim();
    if (!q) return;

    setChat((c) => [...c, { role: "user", content: q }]);
    setQuestion("");
    try {
      setAsking(true);
      const a = await sendAsk(q);
      setChat((c) => [...c, { role: "assistant", content: a }]);
    } catch (e: any) {
      setErr(e?.message || "Failed to get tutor response.");
    } finally {
      setAsking(false);
    }
  };

  const handleQuick = async (prompt: string) => {
    setErr(null);
    setChat((c) => [...c, { role: "user", content: prompt }]);
    try {
      setAsking(true);
      const a = await sendAsk(prompt);
      setChat((c) => [...c, { role: "assistant", content: a }]);
    } catch (e: any) {
      setErr(e?.message || "Failed to get tutor response.");
    } finally {
      setAsking(false);
    }
  };

  const resetSession = () => {
    setChat([]);
    setSessionId(undefined);
    setErr(null);
  };

  return (
    <div className="mx-auto max-w-6xl pt-6 grid gap-6 md:grid-cols-2">
      {/* LEFT: Context + Ask */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>AI Powered Adaptive Tutor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAsk} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium" htmlFor="subject">Subject / Topic</label>
                <Input
                  id="subject"
                  placeholder="e.g., Algebra | Trigonometry | World History"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="classStd">Class</label>
                <Input
                  id="classStd"
                  type="number"
                  min={1}
                  max={12}
                  placeholder="1–12"
                  value={classStd}
                  onChange={(e) => setClassStd(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="goal">Goal (optional)</label>
              <Input
                id="goal"
                placeholder="e.g., master quadratic equations; prepare for unit test"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="question">Your question</label>
              <Textarea
                id="question"
                placeholder="Ask anything… (e.g., Explain Pythagoras theorem with an example)"
                className="min-h-[120px] resize-y"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={asking}>{asking ? "Thinking…" : "Ask Tutor"}</Button>
              <Button type="button" variant="outline" onClick={resetSession}>New Session</Button>
              {sessionId && <Badge variant="outline" className="ml-auto">Session: {sessionId}</Badge>}
            </div>

            {err && <p className="text-sm text-red-500 whitespace-pre-wrap">{err}</p>}
          </form>

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2">
            {[
              "Give me a 10-question quiz based on this topic",
              "Explain like I'm 10 years old",
              "List common mistakes and how to avoid them",
              "Create a 7-day practice plan for this",
            ].map((p) => (
              <Button key={p} variant="secondary" size="sm" type="button" onClick={() => handleQuick(p)}>
                {p}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RIGHT: Chat */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[70vh] overflow-auto">
          {chat.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ask a question to get started. Add subject/class for better personalization.
            </p>
          )}
          {chat.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "rounded-lg border p-3 text-sm"
                  : "rounded-lg border p-3 bg-muted"
              }
            >
              <div className="text-xs uppercase text-muted-foreground mb-1">
                {m.role === "user" ? "You" : "Tutor"}
              </div>
              {m.role === "assistant" ? (
                <Markdown content={m.content} />
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
