import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { listNotifications } from "@/services/notifications/notification.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./actions";

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const notifications = await listNotifications(user.id);
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

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing here yet." description="We'll let you know when something happens." />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.isRead ? "opacity-60" : undefined}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-secondary-foreground">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{notification.createdAt.toLocaleString()}</p>
                </div>
                {!notification.isRead && (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Mark read
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
