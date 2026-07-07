import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { getSellerDashboardStats, getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";

export default async function SellerDashboardPage() {
  const session = await requireAuth();
  if (session.role !== Role.SELLER) redirect(ROUTES.admin.sellers);

  const profile = await getSellerProfileByUserId(session.userId);
  const stats = await getSellerDashboardStats(profile.id, session.userId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{profile.storeName ?? "Seller dashboard"}</h1>
          <p className="text-sm text-muted-foreground">{profile.marketLocation}</p>
        </div>
        <Badge tone={STATUS_TONE[profile.verificationStatus]}>{profile.verificationStatus}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active listings" value={String(stats.activeListings)} />
        <StatCard label="Total orders" value={String(stats.totalOrders)} />
        <StatCard
          label="Wallet balance"
          value={new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(
            Number(stats.walletBalance),
          )}
        />
      </div>
    </div>
  );
}
