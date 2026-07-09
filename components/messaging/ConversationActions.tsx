"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ConversationActions({
  isReported,
  archiveAction,
  reportAction,
  listHref,
}: {
  isReported: boolean;
  archiveAction: () => Promise<void>;
  reportAction: (formData: FormData) => Promise<void>;
  listHref: string;
}) {
  const [showReportForm, setShowReportForm] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Link href={listHref} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to messages
        </Link>
        <div className="flex items-center gap-1.5">
          <form action={archiveAction}>
            <Button type="submit" variant="ghost" size="sm">
              <Archive className="h-3.5 w-3.5" strokeWidth={2} />
              Archive
            </Button>
          </form>
          {!isReported && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowReportForm((v) => !v)}>
              <Flag className="h-3.5 w-3.5" strokeWidth={2} />
              Report
            </Button>
          )}
          {isReported && <span className="text-xs text-muted-foreground">Reported</span>}
        </div>
      </div>

      {showReportForm && (
        <form
          action={(formData) => {
            reportAction(formData);
            setShowReportForm(false);
          }}
          className="flex items-end gap-2 rounded-lg border border-border p-3"
        >
          <textarea
            name="reason"
            required
            rows={2}
            placeholder="What's wrong with this conversation?"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <Button type="submit" variant="outline" size="sm">
            Submit
          </Button>
        </form>
      )}
    </div>
  );
}
