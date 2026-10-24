import "server-only";
import { z } from "zod";

// Secrets. Importing this file from a Client Component fails the build.
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export function serverEnv(): z.infer<typeof serverSchema> {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. See .env.example.");
  }
  return parsed.data;
}
