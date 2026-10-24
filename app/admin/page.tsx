import { ComingSoon } from "@/components/dashboard-shell";

export default function AdminDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <ComingSoon phase={5}>Payout verification queue for paid events.</ComingSoon>
      <ComingSoon phase={6}>Communities, events, GMV, platform fees, show-up and repeat rates.</ComingSoon>
    </div>
  );
}
