import { Badge, STATUS_TONE } from "@/components/ui/Badge";

interface TimelineEntry {
  id: string;
  status: string;
  note: string | null;
  createdAt: Date;
  actor: { firstName: string; lastName: string } | null;
}

export function OrderTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[entry.status]}>{entry.status.replaceAll("_", " ")}</Badge>
              <span className="text-xs text-muted-foreground">
                {entry.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
            {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
            {entry.actor && (
              <p className="text-xs text-muted-foreground">
                by {entry.actor.firstName} {entry.actor.lastName}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
