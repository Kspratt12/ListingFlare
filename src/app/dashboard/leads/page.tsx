"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types";
import { MessageSquare, Mail, Phone, Calendar, Home } from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLeads() {
      const { data } = await supabase
        .from("leads")
        .select(
          `
          *,
          listing:listings(street, city, state)
        `
        )
        .order("created_at", { ascending: false });

      setLeads((data as Lead[]) || []);
      setLoading(false);
    }
    fetchLeads();
  }, [supabase]);

  const markAsRead = async (id: string) => {
    await supabase.from("leads").update({ is_read: true }).eq("id", id);
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, is_read: true } : l))
    );
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div>
      <div>
        <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
          Leads
        </h1>
        <p className="mt-1 text-gray-500">
          Contact form submissions from your listing pages.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white"
            />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-4 font-serif text-xl font-semibold text-gray-900">
            No leads yet
          </h3>
          <p className="mt-2 text-gray-500">
            When visitors submit the contact form on your listings, they&apos;ll
            show up here.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-8 hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Contact
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Listing
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Message
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`transition-colors hover:bg-gray-50 ${
                      !lead.is_read ? "bg-brand-50/30" : ""
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {!lead.is_read && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {lead.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </span>
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {lead.listing && (
                        <span className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Home className="h-3.5 w-3.5 text-gray-400" />
                          {lead.listing.street}, {lead.listing.city}
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs px-5 py-4">
                      <p className="truncate text-sm text-gray-600">
                        {lead.message || "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(lead.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {!lead.is_read && (
                        <button
                          onClick={() => markAsRead(lead.id)}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          Mark read
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-8 space-y-4 md:hidden">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className={`rounded-xl border border-gray-200 bg-white p-5 ${
                  !lead.is_read ? "border-l-4 border-l-brand-400" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{lead.name}</p>
                    {lead.listing && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {lead.listing.street}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(lead.created_at)}
                  </span>
                </div>
                {lead.message && (
                  <p className="mt-3 text-sm text-gray-600">{lead.message}</p>
                )}
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-1 text-brand-600"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-1 text-brand-600"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </a>
                  )}
                  {!lead.is_read && (
                    <button
                      onClick={() => markAsRead(lead.id)}
                      className="ml-auto text-sm text-gray-400 hover:text-gray-600"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
