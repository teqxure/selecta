import { StatCard } from "@/components/dashboard/StatCard";

export default function AdminCommandCenterPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Command center</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value="0" />
        <StatCard label="Pending seller verifications" value="0" />
        <StatCard label="Gross merchandise value" value="₦0.00" />
      </div>
    </div>
  );
}
