"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import { detectSource } from "@/lib/detectSource";

interface Props {
  listingId: string;
  // agentId kept optional for backward compat - server derives from listingId
  agentId?: string;
}

export default function LiveLeadForm({ listingId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<string>("direct");
  const formStartedAtRef = useRef<number>(0);

  useEffect(() => {
    setSource(detectSource());
    formStartedAtRef.current = Date.now();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const leadName = formData.get("name") as string;
    const leadEmail = formData.get("email") as string;
    const leadPhone = formData.get("phone") as string;
    const leadMessage = formData.get("message") as string;
    const honeypot = formData.get("_hp") as string;

    const res = await fetch("/api/leads/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        name: leadName,
        email: leadEmail,
        phone: leadPhone,
        message: leadMessage,
        source,
        honeypot,
        formStartedAt: formStartedAtRef.current,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
  };

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-gray-950 py-20 md:py-28"
    >
      {/* Background texture */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-2xl px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <h2 className="font-serif text-display-sm font-bold text-white md:text-display">
            Schedule a Showing
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Experience this exceptional property in person. Fill out the form
            below and we&apos;ll be in touch within 24 hours.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {submitted ? (
            <div className="mt-12 rounded-2xl border border-green-800/30 bg-green-900/20 p-10 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-4 font-serif text-2xl font-semibold text-white">
                Thank You
              </h3>
              <p className="mt-2 text-gray-400">
                We&apos;ve received your request and will be in touch shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-12 space-y-5">
              <input
                type="text"
                name="_hp"
                tabIndex={-1}
                autoComplete="off"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                aria-hidden="true"
              />
              {error && (
                <div className="rounded-lg border border-red-800/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="lead-name"
                    className="mb-2 block text-sm font-medium text-gray-400"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="lead-name"
                    name="name"
                    required
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-white placeholder-gray-600 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lead-phone"
                    className="mb-2 block text-sm font-medium text-gray-400"
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="lead-phone"
                    name="phone"
                    required
                    onChange={(e) => { e.target.value = formatPhone(e.target.value); }}
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-white placeholder-gray-600 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="555-000-0000"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="lead-email"
                  className="mb-2 block text-sm font-medium text-gray-400"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="lead-email"
                  name="email"
                  required
                  className="w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-white placeholder-gray-600 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="lead-message"
                  className="mb-2 block text-sm font-medium text-gray-400"
                >
                  Message
                </label>
                <textarea
                  id="lead-message"
                  name="message"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-white placeholder-gray-600 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  placeholder="I'd love to schedule a private showing..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-4 font-medium text-white transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Request Showing
                    <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
