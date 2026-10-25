// Database functions raise a stable code as the error message
// (supabase/migrations/*_event_operations.sql). Map them to text people read.

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Please log in to continue.",
  ACCOUNT_SUSPENDED: "Your account is suspended. Contact support.",
  FORBIDDEN: "You don't have access to do that.",
  NOT_FOUND: "We couldn't find that.",
  REGISTRATION_CLOSED: "Registrations are closed for this event.",
  EVENT_FULL: "This event is full.",
  PAYMENT_REQUIRED: "Paid tickets are coming soon.",
  CANNOT_CANCEL: "This ticket can't be cancelled.",
  REFUND_REQUIRED: "Paid tickets are refunded by the Kootam team. Contact support.",
  CANCEL_WINDOW_CLOSED: "It's too close to the start to cancel. Message the organiser instead.",
  INVALID_STATE: "This event can't be changed any more.",
  EVENT_NOT_STARTED: "You can complete an event once it has started.",
  "Paid events need a verified payout account": "Paid events need a verified payout account first.",
  "Price cannot change once people have registered": "The price can't change once people have registered.",
};

export function friendlyError(raw: string | undefined | null): string {
  if (!raw) return "Something went wrong. Please try again.";
  for (const [code, message] of Object.entries(MESSAGES)) {
    if (raw === code || raw.startsWith(code)) return message;
  }
  if (raw.startsWith("Capacity cannot go below")) return `${raw}.`;
  if (raw.startsWith("Event is ")) return MESSAGES.INVALID_STATE;
  if (raw.includes("duplicate key") && raw.includes("slug")) return "That link is already taken. Try another.";
  return "Something went wrong. Please try again.";
}
