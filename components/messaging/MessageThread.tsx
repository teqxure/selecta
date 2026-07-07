"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export interface ThreadMessage {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  senderName: string;
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" disabled={pending}>
      {pending ? "Sending…" : "Send"}
    </Button>
  );
}

export function MessageThread({
  messages,
  currentUserId,
  otherPartyName,
  sendAction,
}: {
  messages: ThreadMessage[];
  currentUserId: string;
  otherPartyName: string;
  sendAction: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-foreground">{otherPartyName}</h1>

      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-secondary p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — say hello.</p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            return (
              <div key={message.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isMine ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                  }`}
                >
                  {message.body}
                </div>
                <span className="mt-1 text-xs text-muted-foreground">
                  {isMine ? "You" : message.senderName} ·{" "}
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await sendAction(formData);
          formRef.current?.reset();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          name="body"
          required
          rows={2}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <SendButton />
      </form>
    </div>
  );
}
