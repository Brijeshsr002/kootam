import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

// Minimal stand-in for what Supabase provisions before our migrations run:
// the auth schema, auth.uid(), and the anon/authenticated/service_role roles.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    phone text,
    raw_user_meta_data jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

/** Create an auth user (as the platform would) and return its id. */
export async function createAuthUser(
  db: PGlite,
  opts: { email?: string; phone?: string; meta?: Record<string, unknown> } = {},
): Promise<string> {
  await db.exec("reset role");
  const res = await db.query<{ id: string }>(
    "insert into auth.users (email, phone, raw_user_meta_data) values ($1, $2, $3) returning id",
    [opts.email ?? null, opts.phone ?? null, JSON.stringify(opts.meta ?? {})],
  );
  return res.rows[0].id;
}

/** Run as a Supabase role; pass userId to simulate a logged-in JWT. */
export async function asRole(
  db: PGlite,
  role: "anon" | "authenticated" | "service_role",
  userId?: string,
): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(`set role ${role}`);
}

export async function asSuperuser(db: PGlite): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
}
