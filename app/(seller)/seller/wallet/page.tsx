import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function SellerWalletPage() {
  const session = await requireRole(Role.SELLER);
  const wallet = await db.wallet.findUnique({ where: { userId: session.userId } });
  const balance = new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(
    Number(wallet?.balance ?? 0),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Wallet</h1>
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Available balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-accent">{balance}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Funds are released here once a delivered order clears escrow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
