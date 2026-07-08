import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { Role, ROLE_LABELS, USER_STATUS_LABELS, UserStatus } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { listSessionsForUser } from "@/services/users/session.service";
import { getUserTimeline } from "@/services/users/activity-timeline.service";
import { getCustomerActivitySummary } from "@/services/users/customer-insights.service";
import { listAddresses } from "@/services/users/address.service";
import { listOrdersForBuyer } from "@/services/orders/order.service";
import { listDisputesForBuyer } from "@/services/disputes/dispute.service";
import { getProductStatusCounts } from "@/services/products/product.service";
import { getSellerBalances } from "@/services/payments/payment.service";
import { getAdminActivity } from "@/services/admin/admin-management.service";
import { ADMIN_PERMISSION_LABELS } from "@/lib/constants/permissions";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { History, ShieldAlert } from "lucide-react";
import { changeUserRoleAction, changeUserStatusAction, terminateSessionAction, forceLogoutAllAction } from "../actions";
import { ForcePasswordResetForm } from "./force-password-reset-form";

const ALL_ROLES = Object.values(Role);
const ALL_STATUSES = Object.values(UserStatus);

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-secondary-foreground">{value}</p>
    </div>
  );
}

const formatDate = (date: Date | null | undefined) => (date ? new Date(date).toLocaleString("en-NG") : "—");
const formatMoney = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePermission("users.manage");
  const { id } = await params;

  const target = await db.user.findUnique({ where: { id }, include: { sellerProfile: true } });
  if (!target) notFound();

  const isSelf = viewer.id === target.id;
  const canManageRoles = viewer.role === Role.SUPER_ADMIN;
  // ADMIN can operate on BUYER/SELLER/AGENT accounts but never on ADMIN or
  // SUPER_ADMIN ones — mirrors assertActorMayManageTarget in the service
  // layer; checked again here purely to decide what to render.
  const canManageTarget =
    !isSelf && (viewer.role === Role.SUPER_ADMIN || (target.role !== Role.ADMIN && target.role !== Role.SUPER_ADMIN));

  const [sessions, timeline, adminActivity] = await Promise.all([
    listSessionsForUser(target.id),
    getUserTimeline(target.id),
    target.role === Role.ADMIN ? getAdminActivity(target.id) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.admin.root },
          { label: "Users", href: ROUTES.admin.users },
          { label: `${target.firstName} ${target.lastName}` },
        ]}
        title={`${target.firstName} ${target.lastName}`}
        description={`${target.email}${target.phone ? ` · ${target.phone}` : ""}`}
        actions={
          <>
            <Badge tone="accent">{ROLE_LABELS[target.role]}</Badge>
            <Badge tone={STATUS_TONE[target.status]}>{USER_STATUS_LABELS[target.status]}</Badge>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Identity &amp; account</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Field label="User ID" value={target.id} />
          <Field label="Joined" value={formatDate(target.createdAt)} />
          <Field label="Last profile update" value={formatDate(target.updatedAt)} />
          <Field label="Email verified" value={target.emailVerifiedAt ? formatDate(target.emailVerifiedAt) : "Not verified"} />
          <Field
            label="Login provider"
            value={target.googleId ? (target.passwordHash ? "Email + Google" : "Google only") : "Email + password"}
          />
          <Field label="Location" value={target.city ? `${target.city}, ${target.state ?? ""}` : "—"} />
          {target.role === Role.ADMIN && (
            <div className="col-span-full">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Permissions</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {target.permissions.length === 0 ? (
                  <Badge tone="neutral">No permissions granted</Badge>
                ) : (
                  target.permissions.map((permission) => (
                    <Badge key={permission} tone="accent">
                      {ADMIN_PERMISSION_LABELS[permission as keyof typeof ADMIN_PERMISSION_LABELS] ?? permission}
                    </Badge>
                  ))
                )}
                <Link href={ROUTES.admin.adminDetail(target.id)} className="text-xs font-medium text-accent hover:underline">
                  Manage permissions →
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {canManageRoles && !isSelf && (
        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
            <CardDescription>Changing this can grant or remove Super Admin itself — see the Users list for the full rules.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={changeUserRoleAction} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={target.id} />
              <select
                name="role"
                defaultValue={target.role}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                {ALL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                Save role
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {canManageTarget && (
        <Card>
          <CardHeader>
            <CardTitle>Account status</CardTitle>
            <CardDescription>
              Suspending, banning, or deactivating immediately logs this account out everywhere and notifies the user.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form action={changeUserStatusAction} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={target.id} />
              <select
                name="status"
                defaultValue={target.status}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {USER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                Save status
              </Button>
            </form>

            {target.passwordHash && (
              <div className="border-t border-border pt-4">
                <ForcePasswordResetForm userId={target.id} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canManageTarget && (
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Devices this account is currently signed in from.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sessions.length === 0 && <EmptyState icon={ShieldAlert} title="No tracked sessions" description="This account hasn't signed in since session tracking was added." />}
            {sessions.map((s) => {
              const isActive = !s.revokedAt && s.expiresAt > new Date();
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                  <div>
                    <p className="text-secondary-foreground">{s.userAgent ?? "Unknown device"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.ipAddress ?? "Unknown IP"} · Signed in {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={isActive ? "success" : "neutral"}>{s.revokedAt ? "Revoked" : isActive ? "Active" : "Expired"}</Badge>
                    {isActive && (
                      <form action={terminateSessionAction}>
                        <input type="hidden" name="userId" value={target.id} />
                        <input type="hidden" name="sessionId" value={s.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Terminate
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
            {sessions.some((s) => !s.revokedAt) && (
              <form action={forceLogoutAllAction} className="self-start">
                <input type="hidden" name="userId" value={target.id} />
                <Button type="submit" size="sm" variant="outline">
                  Force logout everywhere
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {target.role === Role.BUYER && <CustomerSection userId={target.id} />}
      {target.role === Role.SELLER && target.sellerProfile && <SellerSection sellerId={target.sellerProfile.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Activity timeline</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {timeline.length === 0 && <EmptyState icon={History} title="No activity yet" description="Nothing recorded for this account." />}
          {timeline.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-sm text-secondary-foreground">
                  {entry.actorName ? <span className="font-medium">{entry.actorName}</span> : null}
                  {entry.actorName ? " — " : ""}
                  {entry.description}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {target.role === Role.ADMIN && adminActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Actions this admin has taken</CardTitle>
            <CardDescription>
              <Link href={ROUTES.admin.adminDetail(target.id)} className="text-accent hover:underline">
                Manage this admin&apos;s permissions →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {adminActivity.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <span className="text-secondary-foreground">
                  {entry.action} · {entry.entityType} {entry.entityId}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function CustomerSection({ userId }: { userId: string }) {
  const [summary, orders, addresses, disputes] = await Promise.all([
    getCustomerActivitySummary(userId),
    listOrdersForBuyer(userId),
    listAddresses(userId),
    listDisputesForBuyer(userId),
  ]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total orders" value={String(summary.totalOrders)} />
        <StatCard label="Completed orders" value={String(summary.completedOrders)} />
        <StatCard label="Cancelled orders" value={String(summary.cancelledOrders)} />
        <StatCard label="Refunded orders" value={String(summary.refundedOrders)} />
        <StatCard label="Total spending" value={formatMoney(summary.totalSpending)} />
        <StatCard label="Reviews submitted" value={String(summary.reviewsSubmitted)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {orders.length === 0 && <EmptyState icon={History} title="No orders yet" description="This customer hasn't placed an order." />}
          {orders.slice(0, 10).map((order) => (
            <Link
              key={order.id}
              href={ROUTES.admin.order(order.id)}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted"
            >
              <span className="text-secondary-foreground">
                {order.id} · {formatMoney(Number(order.totalAmount))}
              </span>
              <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      {disputes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Disputes filed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {disputes.map((dispute) => (
              <Link
                key={dispute.id}
                href={ROUTES.admin.dispute(dispute.id)}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted"
              >
                <span className="text-secondary-foreground">{dispute.type}</span>
                <Badge tone={STATUS_TONE[dispute.status]}>{dispute.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {addresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved addresses</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {addresses.map((address) => (
              <div key={address.id} className="rounded-lg border border-border px-4 py-2.5 text-sm text-secondary-foreground">
                {address.line1}, {address.city}, {address.state}
                {address.isDefault && <Badge tone="accent" className="ml-2">Default</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

async function SellerSection({ sellerId }: { sellerId: string }) {
  const [statusCounts, balances] = await Promise.all([getProductStatusCounts(sellerId), getSellerBalances(sellerId)]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seller summary</CardTitle>
        <CardDescription>
          <Link href={ROUTES.admin.seller(sellerId)} className="text-accent hover:underline">
            Open full seller console (store, products, orders, finance, disputes) →
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active listings" value={String(statusCounts.active)} />
        <StatCard label="Available balance" value={formatMoney(balances.available)} />
        <StatCard label="Held in escrow" value={formatMoney(balances.held)} />
        <StatCard label="Lifetime earned" value={formatMoney(balances.lifetime)} />
      </CardContent>
    </Card>
  );
}
