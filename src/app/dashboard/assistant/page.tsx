"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, User } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "How are my listings performing?",
  "Write a follow-up for my newest lead",
  "Which listing is getting the most views?",
  "Draft a social media caption for my top listing",
  "What should I focus on this week?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    text: "Hey! I have access to all your listings, leads, and analytics. Ask me anything — performance stats, follow-up messages, marketing copy, strategy advice. What do you need?",
  }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setSending(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { reply } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: "Something glitched. Try again?",
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <div>
        <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">AI Assistant</h1>
        <p className="mt-1 text-gray-500">Your personal business advisor. Knows your listings, leads, and performance.</p>
      </div>

      {/* Chat area */}
      <div className="mt-6 flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gray-950 text-white"
                    : "bg-gray-50 text-gray-800"
                }`}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
                <Sparkles className="h-4 w-4 text-brand-600" />
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}

          {/* Suggestion chips — only show at start */}
          {messages.length <= 1 && !sending && (
            <div className="flex flex-wrap gap-2 pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="mt-4">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your listings, leads, or get marketing help..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-950 text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
