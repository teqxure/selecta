import { requirePermission } from "@/lib/auth/rbac";
import { listCoupons } from "@/services/marketing/coupon.service";
import { listAllCategoriesFlat } from "@/services/categories/category.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tag } from "lucide-react";
import { setCouponActiveAction } from "./actions";
import { CreateCouponForm } from "./create-coupon-form";

export default async function AdminCouponsPage() {
  await requirePermission("CREATE_PROMOTIONS");
  const [coupons, categories] = await Promise.all([listCoupons(), listAllCategoriesFlat()]);

  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Coupons" }]}
        title="Coupons"
        description="Buyer-facing discount codes — validated and priced server-side at checkout, never trusted from the client."
      />

      <Card>
        <CardHeader>
          <CardTitle>Active & past coupons</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {coupons.length === 0 && <EmptyState icon={Tag} title="No coupons yet" description="Create one below." />}
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-foreground">{coupon.code}</span>
                  <Badge tone="accent">
                    {coupon.discountType === "PERCENTAGE" ? `${Number(coupon.discountValue)}%` : format(Number(coupon.discountValue))}
                  </Badge>
                  <Badge tone={coupon.isActive ? "success" : "neutral"}>{coupon.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                {coupon.description && <p className="text-xs text-muted-foreground">{coupon.description}</p>}
                <p className="text-xs text-muted-foreground">
                  Used {coupon.usedCount}
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""} times
                  {coupon.applicableCategory ? ` · ${coupon.applicableCategory.name} only` : ""}
                </p>
              </div>
              <form action={setCouponActiveAction}>
                <input type="hidden" name="id" value={coupon.id} />
                <input type="hidden" name="isActive" value={String(!coupon.isActive)} />
                <Button type="submit" size="sm" variant={coupon.isActive ? "outline" : "secondary"}>
                  {coupon.isActive ? "Deactivate" : "Activate"}
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New coupon</CardTitle>
          <CardDescription>Codes are stored uppercase; buyers can enter them in any case.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCouponForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
