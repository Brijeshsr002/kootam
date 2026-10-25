import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { rolesForArea } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole(rolesForArea("admin"), "/admin");
  return (
    <DashboardShell title="Admin" nav={[{ href: "/admin", label: "Communities" }]}>
      {children}
    </DashboardShell>
  );
}
