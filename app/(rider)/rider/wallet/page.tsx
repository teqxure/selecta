import { Wallet as WalletIcon, Banknote, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getRiderWallet } from "@/services/logistics/rider.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/dashboard/PageHeader";

export default async function RiderWalletPage() {
  const session = await requireRole(Role.RIDER);
  const balances = await getRiderWallet(session.userId);

  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Wallet" description="Your delivery earnings." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available balance" icon={WalletIcon} value={format(balances.available)} />
        <StatCard label="Withdrawn" icon={Banknote} value={format(balances.withdrawn)} />
        <StatCard label="Lifetime earnings" icon={TrendingUp} value={format(balances.lifetime)} />
      </div>
    </div>
  );
}
