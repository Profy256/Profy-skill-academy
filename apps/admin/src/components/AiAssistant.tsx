"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api, type AiAssistantResponse } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actionType?: string | null;
  actionResult?: Record<string, unknown> | null;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  "Create a lesson about HTML forms",
  "Add a new category for Data Science",
  "Generate 5 lessons for JavaScript Essentials",
  "List all courses in the taxonomy",
  "Show me all draft lessons",
  "Search for React lessons",
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant. I can help you manage content, create lessons, organize taxonomy, and more. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response: AiAssistantResponse = await api.aiAssistant.chat(text.trim());
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.content,
        actionType: response.actionType,
        actionResult: response.actionResult,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center gap-3" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold" style={{ background: "var(--accent)", color: "#000" }}>
          AI
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--text)" }}>Admin AI Assistant</div>
          <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
            Create content, manage taxonomy, and more
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 scrollable px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-2xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background: msg.role === "user" ? "var(--accent)" : "var(--panel-3)",
                color: msg.role === "user" ? "#000" : "var(--text)",
                borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.actionType && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: msg.role === "user" ? "rgba(0,0,0,0.1)" : "var(--border)" }}>
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded-sm" style={{
                    background: msg.role === "user" ? "rgba(0,0,0,0.1)" : "var(--accent-soft)",
                    color: msg.role === "user" ? "#000" : "var(--accent)",
                  }}>
                    {msg.actionType.replace(/_/g, " ").toUpperCase()}
                  </span>
                  {msg.actionResult && (
                    <span className="font-mono text-xs ml-2" style={{ color: msg.role === "user" ? "rgba(0,0,0,0.5)" : "var(--text-3)" }}>
                      {JSON.stringify(msg.actionResult).slice(0, 80)}...
                    </span>
                  )}
                </div>
              )}
              <div className="font-mono mt-1" style={{ fontSize: "9px", color: msg.role === "user" ? "rgba(0,0,0,0.4)" : "var(--text-faint)" }}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 text-sm" style={{ background: "var(--panel-3)", borderRadius: "12px 12px 12px 2px", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)", animationDelay: "0.15s" }} />
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)", animationDelay: "0.3s" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && (
        <div className="px-6 pb-3">
          <div className="font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-3)" }}>QUICK ACTIONS</div>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => sendMessage(action)}
                className="font-mono text-xs px-3 py-1.5 transition-colors"
                style={{ border: "1px solid var(--border)", borderRadius: "12px", color: "var(--text-2)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Tell me what to do..."
            className="flex-1 px-4 py-2.5 text-sm outline-none transition-colors"
            style={inputStyle}
            disabled={loading}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 text-xs font-mono font-medium rounded-sm transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
