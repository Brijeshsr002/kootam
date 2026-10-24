import { ComingSoon } from "@/components/dashboard-shell";
import { getSessionUser } from "@/lib/auth/session";

export default async function MyTickets() {
  const user = await getSessionUser();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Hi{user?.name ? `, ${user.name}` : ""} 👋</h1>
      <ComingSoon phase={3}>Your upcoming tickets and QR check-in codes will appear here.</ComingSoon>
    </div>
  );
}
