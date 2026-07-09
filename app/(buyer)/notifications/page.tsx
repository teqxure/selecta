import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { listNotifications } from "@/services/notifications/notification.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { NotificationType } from "@/generated/prisma/enums";
import { markNotificationReadAction, markAllNotificationsReadAction, deleteNotificationAction } from "./actions";

const CATEGORY_LABELS: Record<NotificationType, string> = {
  ORDER: "Orders",
  PAYMENT: "Payments",
  DELIVERY: "Delivery",
  SYSTEM: "Account",
  PROMOTION: "Promotions",
  MESSAGE: "Messages",
};
const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as NotificationType[];

interface NotificationsPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const { type } = await searchParams;
  const activeType = ALL_CATEGORIES.includes(type as NotificationType) ? (type as NotificationType) : undefined;

  const notifications = await listNotifications(user.id, activeType);
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="ghost" size="sm">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={ROUTES.notifications}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!activeType ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        >
          All
        </Link>
        {ALL_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`${ROUTES.notifications}?type=${category}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${activeType === category ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
          >
            {CATEGORY_LABELS[category]}
          </Link>
        ))}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing here yet." description="We'll let you know when something happens." />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => {
            const metadata = notification.metadata as { actionUrl?: string } | null;
            const actionUrl = metadata?.actionUrl;

            return (
              <Card key={notification.id} className={notification.isRead ? "opacity-60" : undefined}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    {actionUrl ? (
                      <Link href={actionUrl} className="text-sm font-medium text-secondary-foreground hover:underline">
                        {notification.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-secondary-foreground">{notification.title}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{notification.createdAt.toLocaleString()}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!notification.isRead && (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Mark read
                        </Button>
                      </form>
                    )}
                    <form action={deleteNotificationAction}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Delete
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
