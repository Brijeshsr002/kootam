"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge, inputClass } from "@/components/ui";
import { formatTime } from "@/lib/format";
import type { CheckInResult, GuestRow } from "@/lib/data/types";

const STATUS_TONE = {
  CONFIRMED: "neutral",
  CHECKED_IN: "good",
  WAITLISTED: "warn",
  NO_SHOW: "bad",
  PENDING_PAYMENT: "warn",
  CANCELLED: "bad",
} as const;

const STATUS_LABEL = {
  CONFIRMED: "Going",
  CHECKED_IN: "Checked in",
  WAITLISTED: "Waitlist",
  NO_SHOW: "No-show",
  PENDING_PAYMENT: "Paying",
  CANCELLED: "Cancelled",
} as const;

export function GuestList({
  guests,
  canCheckIn,
  checkIn,
}: {
  guests: GuestRow[];
  canCheckIn: boolean;
  checkIn: (registrationId: string) => Promise<CheckInResult | { error: string }>;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(guests);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((g) => g.name.toLowerCase().includes(q) || g.ticket_number.toLowerCase().includes(q)) : rows;
  }, [query, rows]);

  function onCheckIn(id: string) {
    startTransition(async () => {
      const res = await checkIn(id);
      if ("error" in res) return setMessage(res.error);
      if (res.result === "CHECKED_IN" || res.result === "ALREADY_CHECKED_IN") {
        setRows((all) => all.map((g) => (g.registration_id === id ? { ...g, status: "CHECKED_IN", checked_in_at: new Date().toISOString() } : g)));
        setMessage(`${res.name ?? "Guest"} checked in.`);
      } else {
        setMessage("This ticket can't be checked in.");
      }
    });
  }

  if (guests.length === 0) return <p className="text-sm text-muted">No one has registered yet. Share the link in your group.</p>;

  return (
    <div className="space-y-3">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or ticket number" className={inputClass} />
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {shown.map((g) => (
          <li key={g.registration_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{g.name}</p>
              <p className="text-xs text-muted">
                {g.ticket_number}
                {g.checked_in_at ? ` · in at ${formatTime(g.checked_in_at)}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={STATUS_TONE[g.status]}>{STATUS_LABEL[g.status]}</Badge>
              {canCheckIn && g.status === "CONFIRMED" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onCheckIn(g.registration_id)}
                  className="rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground disabled:opacity-60"
                >
                  Check in
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
