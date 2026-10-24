import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth/auth-panel";
import { getSessionUser } from "@/lib/auth/session";
import { homeForRole, safeNextPath } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Kootam to join events or run your community.",
  alternates: { canonical: "/login" },
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  auth: "We couldn't sign you in. Please try again.",
  suspended: "Your account is suspended. Contact support.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  const user = await getSessionUser();
  if (user && user.status === "ACTIVE") redirect(next ?? homeForRole(user.role));

  return (
    <>
      {error && <p className="mx-auto mt-6 w-full max-w-sm rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <AuthPanel mode="login" initialAudience={params.as === "organizer" ? "organizer" : "member"} next={next} />
    </>
  );
}
