import { Wallet as WalletIcon, Clock, TrendingUp, Banknote } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getSellerBalances } from "@/services/payments/payment.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import Link from "next/link";

export default async function SellerWalletPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const balances = await getSellerBalances(profile.id);

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">Wallet</h1>
        <Link href={ROUTES.seller.withdrawals}>
          <Button variant="accent" size="sm">
            Request withdrawal
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available balance" icon={WalletIcon} value={format(balances.available)} />
        <StatCard label="Held in escrow" icon={Clock} value={format(balances.held)} />
        <StatCard label="Withdrawn" icon={Banknote} value={format(balances.withdrawn)} />
        <StatCard label="Total earned" icon={TrendingUp} value={format(balances.lifetime)} />
      </div>

      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Funds held in escrow release to your available balance once a delivered order clears — either the buyer
          confirms receipt or Selecta releases it manually. Request a withdrawal any time from your available
          balance.
        </CardContent>
      </Card>
    </div>
  );
}
