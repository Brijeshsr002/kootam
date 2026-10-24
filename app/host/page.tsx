import { ComingSoon } from "@/components/dashboard-shell";

export default function HostDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Your community</h1>
      <ComingSoon phase={2}>Create your community, then publish events and share the link in your WhatsApp group.</ComingSoon>
      <ComingSoon phase={5}>Guest lists, QR check-in, revenue and payouts.</ComingSoon>
    </div>
  );
}
