// Display helpers. Kootam launches in India, so times are shown in IST and
// organisers type local times (datetime-local inputs have no timezone).

export const TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

/** "Sun, 26 Oct · 6:00 am" */
export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TIME_ZONE }).format(d);
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE }).format(d);
  return `${day} · ${time}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE }).format(new Date(iso));
}

/** `2026-10-26T06:00` typed in IST → ISO instant. Returns null for bad input. */
export function istLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00${IST_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO instant → `2026-10-26T06:00` in IST, for datetime-local inputs. */
export function isoToIstLocal(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + (5 * 60 + 30) * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/** URL-safe slug from any text. */
export function slugify(text: string, maxLength = 60): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}
