import { z } from "zod";

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them
// into the browser bundle.
const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cached: PublicEnv | undefined;

/** Validated public config. Throws a readable error if .env.local is incomplete. */
export function publicEnv(): PublicEnv {
  if (cached) return cached;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${missing}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

/** Canonical site URL — never falls back to localhost in production. */
export function appUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (raw) return new URL(raw);
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL must be set in production.");
  }
  return new URL("http://localhost:3000");
}
