import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { rolesForArea } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole(rolesForArea("admin"), "/admin");
  return (
    <DashboardShell
      title="Admin"
      nav={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/communities", label: "Communities" },
        { href: "/admin/categories", label: "Categories" },
        { href: "/admin/events", label: "Events" },
        { href: "/admin/payouts", label: "Payouts" },
        { href: "/admin/payments", label: "Payments" },
        { href: "/admin/settings", label: "Settings" },
        { href: "/admin/support", label: "Support" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
