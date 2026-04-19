"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { Mail, Phone, Home, Clock, ChevronDown, Sparkles, GripVertical } from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import HotLeadBadge from "@/components/HotLeadBadge";
import { calculateHotScore } from "@/lib/hotScore";
import ContactButtons from "@/components/ContactButtons";
import { firstName } from "@/lib/contactLinks";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";

const PIPELINE_STAGES = [
  { value: "new", label: "New", color: "border-blue-400", bg: "bg-blue-50", dot: "bg-blue-400" },
  { value: "contacted", label: "Contacted", color: "border-purple-400", bg: "bg-purple-50", dot: "bg-purple-400" },
  { value: "showing_scheduled", label: "Showing", color: "border-orange-400", bg: "bg-orange-50", dot: "bg-orange-400" },
  { value: "offer_made", label: "Offer", color: "border-amber-400", bg: "bg-amber-50", dot: "bg-amber-400" },
  { value: "under_contract", label: "Contract", color: "border-teal-400", bg: "bg-teal-50", dot: "bg-teal-400" },
  { value: "closed", label: "Closed", color: "border-emerald-400", bg: "bg-emerald-50", dot: "bg-emerald-400" },
] as const;

interface Props {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

function formatTimeAgo(date: string) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LeadCardContent({ lead, dragging }: { lead: Lead; dragging?: boolean }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {!lead.is_read && (
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
            )}
            <p className="truncate text-sm font-semibold text-gray-900">
              {lead.name}
            </p>
            <HotLeadBadge tier={calculateHotScore({ lead }).tier} compact showLabel={false} />
            {lead.auto_reply_draft && (
              <Sparkles className="h-3 w-3 flex-shrink-0 text-brand-500" />
            )}
          </div>
          {lead.listing && (
            <p
              title={`${lead.listing.street}, ${lead.listing.city}, ${lead.listing.state}`}
              className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500"
            >
              <Home className="h-3 w-3 flex-shrink-0" />
              {lead.listing.street}
            </p>
          )}
        </div>
        {!dragging && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(lead.created_at)}
          </span>
        )}
      </div>

      {lead.message && (
        <p className="mt-2 line-clamp-2 text-xs text-gray-500">{lead.message}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {lead.email && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <Mail className="h-3 w-3" />
          </span>
        )}
        {lead.phone && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <Phone className="h-3 w-3" />
            {formatPhone(lead.phone)}
          </span>
        )}
      </div>
      <div className="mt-2">
        <ContactButtons
          phone={lead.phone}
          email={lead.email}
          size="sm"
          stopPropagation
          smsBody={`Hi ${firstName(lead.name)}, following up on your interest. Got a minute?`}
          emailSubject="Following up"
        />
      </div>
    </>
  );
}

function DraggableCard({
  lead,
  onSelect,
  onUpdateStatus,
}: {
  lead: Lead;
  onSelect: (l: Lead) => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  // Entire card is draggable. A simple tap (no movement) fires onSelect.
  // Movement > 6px = drag (handled by PointerSensor activationConstraint on parent).
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(lead)}
      className={`group relative cursor-grab touch-none rounded-lg border bg-white shadow-sm transition-all active:cursor-grabbing ${
        isDragging ? "opacity-30" : "hover:border-brand-200 hover:shadow-md"
      } ${
        !lead.is_read
          ? "border-l-4 border-l-brand-400 border-t border-r border-b border-gray-200"
          : "border-gray-200"
      }`}
    >
      {/* Subtle grip indicator (top-right, decorative only) */}
      <div className="absolute right-2 top-2 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <div className="p-4">
        <LeadCardContent lead={lead} />

        {/* Status dropdown - not draggable; stops propagation */}
        <div
          className="mt-2 flex justify-end"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <select
              value={lead.status}
              onChange={(e) => onUpdateStatus(lead.id, e.target.value)}
              aria-label="Change lead status"
              className="appearance-none rounded-md border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-6 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
              <option value="lost">Lost</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({
  stage,
  leads,
  children,
  isDraggingLead,
}: {
  stage: typeof PIPELINE_STAGES[number];
  leads: Lead[];
  children: React.ReactNode;
  isDraggingLead: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.value });

  return (
    <div className="min-w-[260px] flex-shrink-0 md:min-w-[280px]">
      <div
        className={`mb-3 flex items-center justify-between rounded-lg border-l-4 ${stage.color} bg-white px-4 py-3`}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
          <span className="text-sm font-semibold text-gray-900">{stage.label}</span>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[120px] space-y-2 rounded-lg p-1 transition-colors ${
          isOver && isDraggingLead
            ? "bg-brand-50/80 ring-2 ring-brand-300 ring-offset-1"
            : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function LeadPipeline({ leads, onSelectLead, onUpdateStatus }: Props) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    // MouseSensor (not PointerSensor) so mobile touches don't get
    // double-intercepted. PointerSensor was firing at 6px movement
    // before TouchSensor's 450ms delay could activate, making every
    // mobile tap feel like a drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 12 } }),
    useSensor(KeyboardSensor)
  );

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of PIPELINE_STAGES) map[stage.value] = [];
    for (const lead of leads) {
      if (map[lead.status]) map[lead.status].push(lead);
    }
    return map;
  }, [leads]);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const targetStatus = over.id as string;
    const draggedLead = leads.find((l) => l.id === active.id);
    if (!draggedLead || draggedLead.status === targetStatus) return;
    onUpdateStatus(draggedLead.id, targetStatus);
  };

  return (
    <div>
      <p className="mt-4 mb-3 text-xs text-gray-500">
        Drag cards between columns to update status, or use the dropdown on each card.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLead(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage.value] || [];
            return (
              <DroppableColumn
                key={stage.value}
                stage={stage}
                leads={stageLeads}
                isDraggingLead={!!activeLead}
              >
                {stageLeads.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                    <p className="text-xs text-gray-400">
                      {activeLead ? "Drop here" : "No leads"}
                    </p>
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <DraggableCard
                      key={lead.id}
                      lead={lead}
                      onSelect={onSelectLead}
                      onUpdateStatus={onUpdateStatus}
                    />
                  ))
                )}
              </DroppableColumn>
            );
          })}
        </div>

        {/* Overlay follows cursor during drag */}
        <DragOverlay>
          {activeLead ? (
            <div className="rounded-lg border border-brand-300 bg-white p-4 shadow-2xl cursor-grabbing rotate-2">
              <LeadCardContent lead={activeLead} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
