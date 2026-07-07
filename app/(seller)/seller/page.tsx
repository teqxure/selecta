import { StatCard } from "@/components/dashboard/StatCard";

export default function SellerDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Seller dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active listings" value="0" />
        <StatCard label="Orders this month" value="0" />
        <StatCard label="Wallet balance" value="₦0.00" />
      </div>
    </div>
  );
}
