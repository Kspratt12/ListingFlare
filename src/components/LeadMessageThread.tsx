"use client";

import { useEffect, useState, useRef } from "react";
import type { Message, Lead } from "@/lib/types";
import {
  Send,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  X,
  Sparkles,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

interface Props {
  lead: Lead;
  canReply: boolean;
  onSent?: () => void;
}

function formatTimestamp(date: string) {
  const d = new Date(date);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LeadMessageThread({ lead, canReply, onSent }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const attachRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/messages/list?leadId=${lead.id}`);
      if (!active) return;
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [lead.id]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleUseDraft = () => {
    if (lead.auto_reply_draft) {
      setReplyText(lead.auto_reply_draft);
    }
  };

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);

    try {
      const formData = new FormData();
      formData.append("leadId", lead.id);
      formData.append("message", replyText);
      attachments.forEach((file) => formData.append("attachments", file));

      const res = await fetch("/api/messages/send", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed");

      // Optimistically add to thread
      const newMessage: Message = {
        id: `temp-${Date.now()}`,
        lead_id: lead.id,
        agent_id: lead.agent_id,
        direction: "outbound",
        subject: "",
        body: replyText,
        provider_message_id: null,
        in_reply_to: null,
        attachments: attachments.map((f) => ({ filename: f.name })),
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setReplyText("");
      setAttachments([]);
      onSent?.();
    } catch {
      setSendError("Couldn't send your message. Please try again.");
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
    }
  };

  // Build the rendered thread, starting with the initial inquiry as inbound
  const initialMessage: Message = {
    id: `initial-${lead.id}`,
    lead_id: lead.id,
    agent_id: lead.agent_id,
    direction: "inbound",
    subject: "Initial inquiry",
    body: lead.message || "(no message provided)",
    provider_message_id: null,
    in_reply_to: null,
    attachments: [],
    created_at: lead.created_at,
  };

  const displayMessages = [initialMessage, ...messages];

  return (
    <div className="flex flex-col">
      {/* Thread */}
      <div
        ref={threadRef}
        className="max-h-80 overflow-y-auto space-y-3 px-1 py-2"
      >
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Inbox className="h-8 w-8" />
            <p className="mt-2 text-sm">No messages yet</p>
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isOutbound = msg.direction === "outbound";
            return (
              <div
                key={msg.id}
                className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    isOutbound
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${
                      isOutbound ? "text-brand-100" : "text-gray-500"
                    }`}
                  >
                    {isOutbound ? (
                      <>
                        <ArrowUpRight className="h-3 w-3" /> You
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="h-3 w-3" /> {lead.name.split(" ")[0]}
                      </>
                    )}
                    <span
                      className={`ml-auto font-normal normal-case tracking-normal ${
                        isOutbound ? "text-brand-100" : "text-gray-400"
                      }`}
                    >
                      {formatTimestamp(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.body}
                  </p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.attachments.map((att, i) => (
                        <span
                          key={i}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                            isOutbound
                              ? "bg-brand-400/40 text-brand-50"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          <Paperclip className="h-2.5 w-2.5" />
                          {att.filename}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply composer */}
      {canReply && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white">
          {/* Error banner */}
          {sendError && (
            <div className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {sendError}
            </div>
          )}
          {/* AI Draft prompt */}
          {lead.auto_reply_draft && !replyText && (
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-brand-600">
                <Sparkles className="h-3 w-3" />
                AI draft available
              </div>
              <button
                onClick={handleUseDraft}
                className="rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
              >
                Use AI draft
              </button>
            </div>
          )}

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            placeholder={`Reply to ${lead.name.split(" ")[0]}…`}
            className="w-full resize-none rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {attachments.map((file, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="h-3 w-3" />
                  ) : (
                    <Paperclip className="h-3 w-3" />
                  )}
                  {file.name.length > 18 ? file.name.slice(0, 15) + "…" : file.name}
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="ml-0.5 text-gray-400 hover:text-gray-600"
                    aria-label="Remove attachment"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
            <button
              type="button"
              onClick={() => attachRef.current?.click()}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Attach file"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attach
            </button>
            <input
              ref={attachRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files)
                  setAttachments((prev) => [
                    ...prev,
                    ...Array.from(e.target.files!),
                  ]);
                e.target.value = "";
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !replyText.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-gray-950 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
