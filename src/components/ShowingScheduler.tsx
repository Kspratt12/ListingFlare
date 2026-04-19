"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import { detectSource } from "@/lib/detectSource";

interface Props {
  listingId: string;
  agentId: string;
}

const TIME_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

export default function ShowingScheduler({ listingId, agentId }: Props) {
  const today = new Date();
  const [step, setStep] = useState<"date" | "time" | "info" | "done">("date");
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [preApproved, setPreApproved] = useState<string>("not_specified");
  const [timeline, setTimeline] = useState<string>("not_specified");
  const [hasAgent, setHasAgent] = useState<string>("not_specified");
  const [source, setSource] = useState<string>("direct");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  // Capture source on mount (once)
  useEffect(() => {
    setSource(detectSource());
  }, []);

  const calendarDays = useMemo(
    () => getCalendarDays(calYear, calMonth),
    [calYear, calMonth]
  );

  const isDateSelectable = (day: number) => {
    const date = new Date(calYear, calMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date >= todayStart;
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const canGoPrev =
    calYear > today.getFullYear() ||
    (calYear === today.getFullYear() && calMonth > today.getMonth());

  const formatSelectedDate = () => {
    if (!selectedDate) return "";
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const message = formData.get("message") as string;

    // Format date as YYYY-MM-DD
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    // First, insert as a lead with qualification + source
    const { error: leadErr } = await supabase.from("leads").insert({
      listing_id: listingId,
      agent_id: agentId,
      name,
      email,
      phone,
      message: message || `Showing requested for ${formatSelectedDate()} at ${selectedTime}`,
      status: "showing_scheduled",
      pre_approved: preApproved,
      timeline,
      has_agent: hasAgent,
      source,
    });

    if (leadErr) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    // Get the lead ID
    const { data: found } = await supabase
      .from("leads")
      .select("id")
      .eq("listing_id", listingId)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const leadId = found?.id;

    // Book the showing via API (with qualification + source for lead enrichment)
    const res = await fetch("/api/showings/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: leadId || undefined,
        listingId,
        preApproved,
        timeline,
        hasAgent,
        source,
        agentId,
        showingDate: dateStr,
        showingTime: selectedTime,
        name,
        email,
        phone,
        message,
      }),
    });

    if (!res.ok) {
      setError("Failed to book showing. Please try again.");
      setSubmitting(false);
      return;
    }

    setStep("done");
    setSubmitting(false);
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
            Pick a date and time that works for you. We&apos;ll confirm instantly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {step === "done" ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-12 rounded-2xl border border-green-800/30 bg-green-900/20 p-10 text-center"
              >
                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-4 font-serif text-2xl font-semibold text-white">
                  Showing Confirmed!
                </h3>
                <p className="mt-2 text-gray-400">
                  {formatSelectedDate()} at {selectedTime}
                </p>
                <p className="mt-4 text-sm text-gray-500">
                  Check your email for a confirmation with all the details.
                  We&apos;ll send you a reminder before your showing.
                </p>
              </motion.div>
            ) : (
              <div className="mt-12">
                {/* Progress steps */}
                <div className="mb-8 flex items-center justify-center gap-2">
                  {["date", "time", "info"].map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          step === s
                            ? "bg-brand-500 text-white"
                            : ["date", "time", "info"].indexOf(step) > i
                              ? "bg-brand-500/20 text-brand-400"
                              : "bg-gray-800 text-gray-500"
                        }`}
                      >
                        {["date", "time", "info"].indexOf(step) > i ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      {i < 2 && (
                        <div
                          className={`h-px w-8 ${
                            ["date", "time", "info"].indexOf(step) > i
                              ? "bg-brand-500/40"
                              : "bg-gray-800"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="mb-4 rounded-lg border border-red-800/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {/* Step 1: Date */}
                {step === "date" && (
                  <motion.div
                    key="date"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={prevMonth}
                        disabled={!canGoPrev}
                        aria-label="Previous month"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <h3 className="text-lg font-semibold text-white">
                        {MONTHS[calMonth]} {calYear}
                      </h3>
                      <button
                        type="button"
                        onClick={nextMonth}
                        aria-label="Next month"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {DAYS.map((d) => (
                        <div
                          key={d}
                          className="py-2 text-center text-xs font-medium text-gray-500"
                        >
                          {d}
                        </div>
                      ))}
                      {calendarDays.map((day, i) => (
                        <div key={i} className="flex items-center justify-center">
                          {day === null ? (
                            <div className="h-10 w-10" />
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedDate(new Date(calYear, calMonth, day));
                                setStep("time");
                              }}
                              disabled={!isDateSelectable(day)}
                              className={`h-10 w-10 rounded-lg text-sm font-medium transition-all ${
                                selectedDate &&
                                selectedDate.getDate() === day &&
                                selectedDate.getMonth() === calMonth &&
                                selectedDate.getFullYear() === calYear
                                  ? "bg-brand-500 text-white"
                                  : isDateSelectable(day)
                                    ? "text-white hover:bg-gray-800"
                                    : "text-gray-700 cursor-not-allowed"
                              }`}
                            >
                              {day}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Time */}
                {step === "time" && (
                  <motion.div
                    key="time"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
                  >
                    <button
                      onClick={() => setStep("date")}
                      className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back to calendar
                    </button>

                    <div className="mb-4 flex items-center gap-2 text-white">
                      <CalendarDays className="h-5 w-5 text-brand-400" />
                      <span className="font-medium">{formatSelectedDate()}</span>
                    </div>

                    <p className="mb-4 text-sm text-gray-400">
                      Select a time for your showing:
                    </p>

                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {TIME_SLOTS.map((time) => (
                        <button
                          key={time}
                          onClick={() => {
                            setSelectedTime(time);
                            setStep("info");
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                            selectedTime === time
                              ? "border-brand-500 bg-brand-500/10 text-brand-400"
                              : "border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {time}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Contact Info */}
                {step === "info" && (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
                  >
                    <button
                      onClick={() => setStep("time")}
                      className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Change time
                    </button>

                    <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-white">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-brand-400" />
                        {formatSelectedDate()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-brand-400" />
                        {selectedTime}
                      </span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="showing-name"
                            className="mb-1.5 block text-sm font-medium text-gray-400"
                          >
                            Full Name
                          </label>
                          <input
                            type="text"
                            id="showing-name"
                            name="name"
                            required
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            placeholder="John Smith"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="showing-phone"
                            className="mb-1.5 block text-sm font-medium text-gray-400"
                          >
                            Phone
                          </label>
                          <input
                            type="tel"
                            id="showing-phone"
                            name="phone"
                            required
                            value={phoneValue}
                            onChange={(e) => setPhoneValue(formatPhone(e.target.value))}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            placeholder="555-000-0000"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="showing-email"
                          className="mb-1.5 block text-sm font-medium text-gray-400"
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          id="showing-email"
                          name="email"
                          required
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                          placeholder="john@example.com"
                        />
                      </div>
                      {/* Quick qualifying questions - helps the agent respond faster */}
                      <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          A few quick questions (optional)
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Are you pre-approved for financing?
                            </label>
                            <select
                              value={preApproved}
                              onChange={(e) => setPreApproved(e.target.value)}
                              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            >
                              <option value="not_specified">Prefer not to say</option>
                              <option value="yes">Yes, pre-approved</option>
                              <option value="working_on_it">Working on it</option>
                              <option value="no">Not yet</option>
                              <option value="cash">Cash buyer</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              When are you looking to move?
                            </label>
                            <select
                              value={timeline}
                              onChange={(e) => setTimeline(e.target.value)}
                              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            >
                              <option value="not_specified">Prefer not to say</option>
                              <option value="asap">ASAP (under 30 days)</option>
                              <option value="30_90">30-90 days</option>
                              <option value="3_6_months">3-6 months</option>
                              <option value="just_looking">Just exploring</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Are you already working with another agent?
                            </label>
                            <select
                              value={hasAgent}
                              onChange={(e) => setHasAgent(e.target.value)}
                              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            >
                              <option value="not_specified">Prefer not to say</option>
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="showing-message"
                          className="mb-1.5 block text-sm font-medium text-gray-400"
                        >
                          Notes (optional)
                        </label>
                        <textarea
                          id="showing-message"
                          name="message"
                          rows={2}
                          className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                          placeholder="Any questions or special requests..."
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
                            Booking...
                          </>
                        ) : (
                          <>
                            Confirm Showing
                            <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
