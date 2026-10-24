// Structured JSON logs (one line per event) so Vercel log search can filter by
// action, user_id, event_id, etc. Never log secrets, tokens or card data.

type LogLevel = "info" | "warn" | "error";

export type LogEvent = {
  action: string; // e.g. REGISTRATION_CREATED, PAYMENT_VERIFIED
  status?: "success" | "failure";
  request_id?: string;
  user_id?: string;
  community_id?: string;
  event_id?: string;
  registration_id?: string;
  error_code?: string;
  [key: string]: unknown;
};

function write(level: LogLevel, event: LogEvent): void {
  const line = JSON.stringify({ level, timestamp: new Date().toISOString(), ...event });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: LogEvent) => write("info", event),
  warn: (event: LogEvent) => write("warn", event),
  error: (event: LogEvent) => write("error", event),
};

export function newRequestId(): string {
  return crypto.randomUUID();
}
