import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { rolesForArea } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "My tickets", robots: { index: false } };

export default async function MeLayout({ children }: LayoutProps<"/me">) {
  await requireRole(rolesForArea("me"), "/me");
  return (
    <DashboardShell
      title="My account"
      nav={[
        { href: "/me", label: "Tickets" },
        { href: "/me/communities", label: "My communities" },
        { href: "/me/history", label: "History" },
        { href: "/me/profile", label: "Profile" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
