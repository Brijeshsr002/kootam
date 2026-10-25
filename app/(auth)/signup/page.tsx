import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth/auth-panel";
import { getSessionUser } from "@/lib/auth/session";
import { homeForRole, safeNextPath } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Kootam account to join events, or run your community's events.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const user = await getSessionUser();
  if (user && user.status === "ACTIVE") redirect(next ?? homeForRole(user.role));

  return <AuthPanel mode="signup" initialAudience={params.as === "organizer" ? "organizer" : "member"} next={next} />;
}
