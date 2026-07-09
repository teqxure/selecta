import { updateNotificationPreferencesAction } from "./actions";
import { Card, CardContent } from "@/components/ui/Card";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { NotificationPreferences } from "@/services/notifications/preferences.service";

const TOGGLES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "orderUpdates", label: "Order updates", description: "Payment confirmations, shipping, delivery, and dispute updates." },
  { key: "sellerUpdates", label: "Seller updates", description: "New orders, withdrawal status, and verification results." },
  { key: "marketing", label: "Marketing", description: "New arrivals, promotions, and Selecta news." },
];

export function NotificationPreferencesForm({ preferences }: { preferences: NotificationPreferences }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <form action={updateNotificationPreferencesAction} className="flex flex-col gap-4">
          {TOGGLES.map((toggle) => (
            <label key={toggle.key} className="flex items-start gap-3">
              <input
                type="checkbox"
                name={toggle.key}
                defaultChecked={preferences[toggle.key]}
                className="mt-0.5 h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{toggle.label}</span>
                <span className="block text-xs text-muted-foreground">{toggle.description}</span>
              </span>
            </label>
          ))}

          <div className="flex items-start gap-3 opacity-60">
            <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4 rounded border-border" />
            <span>
              <span className="block text-sm font-medium text-foreground">Security alerts</span>
              <span className="block text-xs text-muted-foreground">
                Login, password, and account changes. Always on — these can&apos;t be turned off.
              </span>
            </span>
          </div>

          <SubmitButton size="sm" className="self-start">
            Save preferences
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
