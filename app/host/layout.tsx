import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { rolesForArea } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Host dashboard", robots: { index: false } };

export default async function HostLayout({ children }: LayoutProps<"/host">) {
  await requireRole(rolesForArea("host"), "/host");
  return (
    <DashboardShell
      title="Host"
      nav={[
        { href: "/host", label: "Dashboard" },
        { href: "/host/community", label: "Community" },
        { href: "/host/events", label: "Events" },
        { href: "/host/members", label: "Members" },
        { href: "/host/check-in", label: "Check-in" },
        { href: "/host/payouts", label: "Payouts" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
