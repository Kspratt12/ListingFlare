"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { detectSource } from "@/lib/detectSource";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ListingContext {
  street: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  lotSize: string;
  description: string;
  features: string[];
  agentName: string;
  agentPhone: string;
}

interface Props {
  listing: ListingContext;
  listingId: string;
  // agentId kept optional for backward compat - server derives from listingId
  agentId?: string;
  isDemo?: boolean;
  calendlyUrl?: string;
}

export default function ListingChat({ listing, listingId, isDemo = false, calendlyUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Hide hint after 15 seconds (longer so visitors notice it)
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 15000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setShowHint(false);
      setMessages([{
        role: "assistant",
        text: `Hey! Have any questions about ${listing.street}? I know the property well - ask me anything.`,
      }]);
    }
  }, [open, messages.length, listing.street]);

  // Prompt lead capture after 3 messages
  useEffect(() => {
    if (messageCount >= 3 && !leadCaptured && !showLeadCapture) {
      setShowLeadCapture(true);
    }
  }, [messageCount, leadCaptured, showLeadCapture]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setSending(true);
    setMessageCount((c) => c + 1);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          listing,
          history: messages,
          calendlyUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const { reply } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: "My bad, something glitched. Try asking again?",
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const captureLead = async () => {
    if (!leadName || !leadEmail) return;

    if (isDemo) {
      setLeadCaptured(true);
      setShowLeadCapture(false);
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: `Thanks ${leadName.split(" ")[0]}! This is a demo, but on a real listing the agent would be notified instantly and you'd hear back within minutes. Pretty cool, right?`,
      }]);
      return;
    }

    try {
      const chatSummary = messages
        .filter((m) => m.role === "user")
        .map((m) => m.text)
        .join(" | ");

      const chatMessage = `[Chat] ${chatSummary}`;

      const res = await fetch("/api/leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          message: chatMessage,
          source: detectSource(),
          // Chat widget opens separately from page load, so skip the
          // time-based bot check here - honeypot still catches bots.
          honeypot: "",
        }),
      });

      if (!res.ok) throw new Error("Lead create failed");

      setLeadCaptured(true);
      setShowLeadCapture(false);
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: `Thanks ${leadName.split(" ")[0]}! I've let ${listing.agentName} know you're interested. They'll reach out to you shortly!`,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: "Something went wrong on my end. You can reach the agent directly - their info is on the page.",
      }]);
    }
  };

  return (
    <>
      {/* Chat Bubble */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-3"
          >
            {/* Hint bubble - looks like a chat message */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: 1 }}
                  className="max-w-[220px] rounded-2xl rounded-br-sm bg-gray-950 px-4 py-3 shadow-xl"
                >
                  <p className="text-sm font-medium leading-snug text-white">
                    Have a question about this home? Ask me anything!
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400">AI Property Assistant</p>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setOpen(true)}
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-110 hover:bg-brand-600 md:h-16 md:w-16"
              aria-label="Chat about this property"
            >
              {/* Pulse ring */}
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-20" />
              <MessageCircle className="relative h-6 w-6 md:h-7 md:w-7" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white ring-2 ring-white">
                AI
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 z-50 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:w-[380px] md:bottom-6 md:right-6"
            style={{ maxHeight: "min(600px, calc(100vh - 120px))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gray-950 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Property Assistant</p>
                  <p className="text-[10px] text-gray-400">Ask me anything about this home</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: "280px", maxHeight: "400px" }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
                        <Sparkles className="h-3 w-3 text-brand-600" />
                      </div>
                    )}
                    {msg.role === "user" && (
                      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                        <User className="h-3 w-3 text-gray-600" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gray-950 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
                    <Sparkles className="h-3 w-3 text-brand-600" />
                  </div>
                  <div className="rounded-2xl bg-gray-100 px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                </div>
              )}

              {/* Lead Capture Card */}
              {showLeadCapture && !leadCaptured && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-brand-200 bg-brand-50 p-3.5"
                >
                  <p className="text-xs font-semibold text-brand-800">Want to hear more from the agent?</p>
                  <p className="mt-0.5 text-[11px] text-brand-600">Drop your info and they&apos;ll reach out directly.</p>
                  <div className="mt-2.5 space-y-2">
                    <input
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none"
                    />
                    <input
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="Email address"
                      type="email"
                      className="w-full rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none"
                    />
                    <input
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="Phone (optional)"
                      type="tel"
                      className="w-full rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={captureLead}
                        disabled={!leadName || !leadEmail}
                        className="flex-1 rounded-lg bg-brand-500 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        Connect Me
                      </button>
                      <button
                        onClick={() => setShowLeadCapture(false)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                      >
                        Later
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 px-3 py-3">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about this property..."
                  className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-950 text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="mt-1.5 text-center text-[10px] text-gray-300">
                Powered by ListingFlare AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
