// Mirrors the state machines enforced by the database triggers
// `enforce_event_rules` and `enforce_registration_rules`. The DB is
// authoritative; this lets the UI and API reject bad transitions early with a
// friendly message.

export const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

const EVENT_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["CANCELLED", "COMPLETED"],
  CANCELLED: [],
  COMPLETED: [],
};

export function canTransitionEvent(from: EventStatus, to: EventStatus): boolean {
  return EVENT_TRANSITIONS[from].includes(to);
}

export const REGISTRATION_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "WAITLISTED",
  "CANCELLED",
  "CHECKED_IN",
  "NO_SHOW",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

const REGISTRATION_TRANSITIONS: Record<RegistrationStatus, readonly RegistrationStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  WAITLISTED: ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CANCELLED: [],
  CHECKED_IN: [],
  NO_SHOW: [],
};

export function canTransitionRegistration(from: RegistrationStatus, to: RegistrationStatus): boolean {
  return REGISTRATION_TRANSITIONS[from].includes(to);
}

export function isTerminalRegistrationStatus(status: RegistrationStatus): boolean {
  return REGISTRATION_TRANSITIONS[status].length === 0;
}
