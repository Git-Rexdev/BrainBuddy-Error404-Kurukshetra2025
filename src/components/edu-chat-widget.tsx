// src/components/edu-chat-widget.tsx
"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, X } from "lucide-react";

// --- Backend contract ---
const EDUCHAT_ENDPOINT = "/api/educhat/chat";
const QUESTION_FIELD  = "question";    // <-- was "message", must be "question"
const SESSION_FIELD   = "session_id";  // keep if your backend uses session_id
// -------------------------

type EduResp = {
  reply?: string;
  answer?: string;
  text?: string;
  content?: string;
  session_id?: string;
  chat_id?: string;
  [k: string]: any;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

function extractReply(r: EduResp): string {
  return (
    r.reply ||
    r.answer ||
    r.text ||
    r.content ||
    (() => {
      try { return JSON.stringify(r, null, 2); } catch { return String(r); }
    })()
  );
}

export default function EduChatWidget() {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const send = async () => {
    const msg = input.trim();
    if (!msg || busy) return;

    setChat((c) => [...c, { role: "user", content: msg }]);
    setInput("");
    setError(null);
    setBusy(true);

    try {
      const token = Cookies.get("bb_token") || "";
      const body: Record<string, any> = { [QUESTION_FIELD]: msg };
      if (sessionId) body[SESSION_FIELD] = sessionId;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${EDUCHAT_ENDPOINT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // surface validation messages (422) nicely
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

      const json: EduResp = await res.json();

      // persist session continuity (use returned session_id/chat_id if present)
      const sid = json.session_id || json.chat_id;
      if (sid && !sessionId) setSessionId(String(sid));

      setChat((c) => [...c, { role: "assistant", content: extractReply(json) }]);
    } catch (e: any) {
      setError(e?.message || "Failed to send message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* FAB button */}
      <Button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
        aria-label="Open Edu Chat"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>

      {/* Chat panel */}
      {open && (
        <Card className="fixed bottom-20 right-4 w-[360px] max-h-[70vh] flex flex-col shadow-xl border">
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Edu Chat</CardTitle>
            <div className="flex items-center gap-2">
              {sessionId && (
                <span className="text-xs text-muted-foreground">Session: {sessionId}</span>
              )}
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-3 pb-3">
            <div className="flex-1 overflow-auto space-y-3 pr-1">
              {chat.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ask anything about your course material or doubts.
                </p>
              )}
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "rounded-lg border p-2 text-sm"
                      : "rounded-lg border p-2 text-sm bg-muted"
                  }
                >
                  <div className="text-[10px] uppercase text-muted-foreground mb-1">
                    {m.role === "user" ? "You" : "Edu Chat"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
              {error && <p className="text-xs text-red-500 whitespace-pre-wrap">{error}</p>}
            </div>

            {/* Composer */}
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question…"
                className="min-h-[44px] max-h-[120px] resize-y"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button onClick={send} disabled={busy || input.trim().length === 0} aria-label="Send">
                {busy ? "…" : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
