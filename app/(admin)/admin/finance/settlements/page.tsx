import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSettlementReport } from "@/services/platform/finance.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptText } from "lucide-react";

const PERIODS: { key: string; label: string; days: number }[] = [
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
];

interface AdminSettlementsPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function AdminSettlementsPage({ searchParams }: AdminSettlementsPageProps) {
  await requireRole(Role.SUPER_ADMIN);
  const params = await searchParams;
  const period = PERIODS.find((p) => p.key === params.period) ?? PERIODS[1];

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - period.days);

  const rows = await getSettlementReport({ from, to });

  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);
  const totals = rows.reduce(
    (acc, row) => ({ gross: acc.gross + row.gross, commission: acc.commission + row.commission, net: acc.net + row.net }),
    { gross: 0, commission: 0, net: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Settlements" }]}
        title="Settlement report"
        description="Released transactions grouped by seller — gross, commission, and net side by side."
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          {PERIODS.map((p) => (
            <Link key={p.key} href={`${ROUTES.admin.financeSettlements}?period=${p.key}`}>
              <Button size="sm" variant={p.key === period.key ? "accent" : "outline"}>
                {p.label}
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Gross settled</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">{format(totals.gross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Commission earned</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">{format(totals.commission)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Net paid to sellers</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">{format(totals.net)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={ReceiptText} title="No settlements in this period" description="Try a wider date range." />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Gross</th>
                  <th className="px-4 py-3 font-medium">Commission</th>
                  <th className="px-4 py-3 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sellerId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={ROUTES.admin.seller(row.sellerId)} className="text-secondary-foreground hover:underline">
                        {row.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{row.orderCount}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{format(row.gross)}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{format(row.commission)}</td>
                    <td className="px-4 py-3 font-medium text-foreground tabular-nums">{format(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
