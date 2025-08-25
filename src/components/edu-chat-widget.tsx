// src/components/edu-chat-widget.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, X, Minimize2, Maximize2, GripVertical } from "lucide-react";

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

type EduChatWidgetProps = {
  mode?: "floating" | "dashboard";
};

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

export default function EduChatWidget({ mode = "floating" }: EduChatWidgetProps) {
  const [open, setOpen] = useState(mode === "dashboard");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [chatHeight, setChatHeight] = useState(500);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (chatRef.current) {
        const rect = chatRef.current.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        if (newHeight >= 200 && newHeight <= 600) {
          setChatHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const toggleMessageExpansion = (index: number) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

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

  const clearChat = () => {
    setChat([]);
    setError(null);
    setSessionId(undefined);
    setExpandedMessages(new Set());
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      setChatHeight(200);
    } else {
      setChatHeight(500);
    }
  };

  const renderMessageContent = (content: string, index: number) => {
    const isExpanded = expandedMessages.has(index);
    const shouldTruncate = content.length > 300 && !isExpanded;
    
    if (shouldTruncate) {
      return (
        <div>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed overflow-hidden chat-message-text">
            {content.slice(0, 300)}...
          </div>
          <button
            onClick={() => toggleMessageExpansion(index)}
            className="text-xs text-primary hover:text-primary/80 mt-2 font-medium"
          >
            Read More
          </button>
        </div>
      );
    }
    
    return (
      <div>
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed overflow-hidden chat-message-text">
          {content}
        </div>
        {content.length > 300 && isExpanded && (
          <button
            onClick={() => toggleMessageExpansion(index)}
            className="text-xs text-primary hover:text-primary/80 mt-2 font-medium"
          >
            Show Less
          </button>
        )}
      </div>
    );
  };

  // Dashboard mode - always visible, embedded in page
  if (mode === "dashboard") {
    return (
      <Card 
        ref={chatRef}
        className="w-full h-[500px] flex flex-col shadow-none border-0 bg-transparent"
      >
        <CardContent className="flex-1 flex flex-col gap-3 p-0">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {chat.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Ready to help with your studies!
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Ask questions about your course material, get explanations, or request study tips.
                </p>
              </div>
            )}
            {chat.map((m, i) => (
              <div
                key={i}
                className={`
                  rounded-lg border p-3 text-sm w-full
                  ${m.role === "user"
                    ? "bg-primary/5 border-primary/20 ml-8 mr-2"
                    : "bg-muted/30 border-muted ml-2 mr-8"
                  }
                `}
              >
                <div className="text-[10px] uppercase text-muted-foreground mb-2 font-medium">
                  {m.role === "user" ? "You" : "AI Assistant"}
                </div>
                <div 
                  className="whitespace-pre-wrap break-words text-sm leading-relaxed overflow-hidden chat-message-text"
                  style={{ 
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%'
                  }}
                >
                  {renderMessageContent(m.content, i)}
                </div>
              </div>
            ))}
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 ml-2 mr-8">
                <div className="text-[10px] uppercase text-destructive/70 mb-1 font-medium">Error</div>
                <p className="text-xs text-destructive whitespace-pre-wrap break-words overflow-hidden chat-message-text">
                  {error}
                </p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Composer */}
          <div className="flex items-end gap-2 pt-3 border-t border-muted/50">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your studies..."
              className="min-h-[44px] max-h-[120px] resize-none overflow-hidden text-sm flex-1 border-muted/50 focus:border-primary/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <div className="flex flex-col gap-1 flex-shrink-0">
              <Button 
                onClick={send} 
                disabled={busy || input.trim().length === 0} 
                size="sm"
                className="h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                aria-label="Send"
              >
                {busy ? "…" : <Send className="h-4 w-4" />}
              </Button>
              {chat.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearChat}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Floating mode - default behavior
  return (
    <>
      {/* FAB button */}
      <Button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50 lg:bottom-4 lg:right-4"
        aria-label="Open Edu Chat"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>

      {/* Chat panel */}
      {open && (
        <Card 
          ref={chatRef}
          className={`
            fixed z-40 flex flex-col shadow-xl border
            transition-all duration-300 ease-in-out
            ${isMinimized ? 'h-[200px]' : `h-[${chatHeight}px]`}
            ${isMinimized ? 'h-[200px]' : `h-[${chatHeight}px]`}
            /* Mobile positioning and sizing */
            bottom-4 right-4 w-[calc(100vw-2rem)] max-w-[420px]
            /* Desktop positioning */
            lg:bottom-20 lg:right-4 lg:w-[420px]
          `}
          style={{ height: isMinimized ? '200px' : `${chatHeight}px` }}
        >
          <CardHeader className="py-3 flex flex-row items-center justify-between border-b">
            <CardTitle className="text-base">Edu Chat</CardTitle>
            <div className="flex items-center gap-2">
              {sessionId && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Session: {sessionId.slice(0, 8)}...
                </span>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMinimize}
                className="h-7 w-7"
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setOpen(false)} 
                className="h-7 w-7"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-3 p-3">
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {chat.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Ask anything about your course material or doubts.
                  </p>
                </div>
              )}
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`
                    rounded-lg border p-3 text-sm w-full
                    ${m.role === "user"
                      ? "bg-primary/5 border-primary/20 ml-8 mr-2"
                      : "bg-muted/50 border-muted ml-2 mr-8"
                    }
                  `}
                >
                  <div className="text-[10px] uppercase text-muted-foreground mb-2 font-medium">
                    {m.role === "user" ? "You" : "Edu Chat"}
                  </div>
                  <div 
                    className="whitespace-pre-wrap break-words text-sm leading-relaxed overflow-hidden chat-message-text"
                    style={{ 
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%'
                    }}
                  >
                    {renderMessageContent(m.content, i)}
                  </div>
                </div>
              ))}
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 ml-2 mr-8">
                  <div className="text-[10px] uppercase text-destructive/70 mb-1 font-medium">Error</div>
                  <p className="text-xs text-destructive whitespace-pre-wrap break-words overflow-hidden chat-message-text">
                    {error}
                  </p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Composer */}
            <div className="flex items-end gap-2 pt-2 border-t">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question…"
                className="min-h-[44px] max-h-[120px] resize-none overflow-hidden text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="flex flex-col gap-1 flex-shrink-0">
                <Button 
                  onClick={send} 
                  disabled={busy || input.trim().length === 0} 
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="Send"
                >
                  {busy ? "…" : <Send className="h-4 w-4" />}
                </Button>
                {chat.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearChat}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    aria-label="Clear chat"
                    title="Clear chat"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>

          {/* Resize handle */}
          {!isMinimized && (
            <div 
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-muted-foreground hover:text-foreground"
              onMouseDown={() => setIsResizing(true)}
              title="Resize chat"
            >
              <GripVertical className="h-3 w-3" />
            </div>
          )}
        </Card>
      )}
    </>
  );
}
