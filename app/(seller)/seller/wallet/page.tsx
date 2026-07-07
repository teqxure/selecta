import { Wallet as WalletIcon, Clock, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getSellerPendingBalance } from "@/services/payments/payment.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent } from "@/components/ui/Card";

export default async function SellerWalletPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const [wallet, pendingBalance] = await Promise.all([
    db.wallet.findUnique({ where: { userId: session.userId } }),
    getSellerPendingBalance(profile.id),
  ]);

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Wallet</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available balance" icon={WalletIcon} value={format(Number(wallet?.balance ?? 0))} />
        <StatCard label="Pending balance" icon={Clock} value={format(pendingBalance)} />
        <StatCard label="Total earned" icon={TrendingUp} value={format(Number(wallet?.totalEarned ?? 0))} />
      </div>

      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Available funds are released here once a delivered order clears escrow. Pending balance reflects orders
          that have been paid for but are still awaiting delivery confirmation. Withdrawals aren&apos;t available yet
          — that&apos;s coming in a future payments phase.
        </CardContent>
      </Card>
    </div>
  );
}
