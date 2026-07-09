"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getUploadUrlAction } from "@/services/storage/storage.actions";
import { ALLOWED_IMAGE_CONTENT_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants/storage";

export interface ThreadMessage {
  id: string;
  body: string;
  imageUrl?: string | null;
  createdAt: Date;
  senderId: string;
  senderName: string;
  readAt?: Date | null;
}

export interface SendMessageState {
  error?: string;
  warning?: string;
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
  uploadFolder,
  hasMobileBottomNav = false,
}: {
  messages: ThreadMessage[];
  currentUserId: string;
  otherPartyName: string;
  sendAction: (prevState: SendMessageState, formData: FormData) => Promise<SendMessageState>;
  uploadFolder: string;
  /** True for the buyer's thread page, which sits above MobileBottomNav — the seller dashboard has no such bar, so its compose bar can sit flush at the bottom. */
  hasMobileBottomNav?: boolean;
}) {
  const [state, formAction] = useActionState(sendAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number]) || file.size > MAX_UPLOAD_SIZE_BYTES) {
      event.target.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const { uploadUrl, publicUrl } = await getUploadUrlAction(uploadFolder, file.type);
      const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (response.ok) setImageUrl(publicUrl);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-foreground">{otherPartyName}</h1>

      {state.warning && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">{state.warning}</div>
      )}
      {state.error && <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-900">{state.error}</div>}

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
                  {message.imageUrl && (
                    <div className="relative mb-1.5 h-40 w-40 overflow-hidden rounded-lg">
                      <Image src={message.imageUrl} alt="Attachment" fill className="object-cover" />
                    </div>
                  )}
                  {message.body}
                </div>
                <span className="mt-1 text-xs text-muted-foreground">
                  {isMine ? "You" : message.senderName} ·{" "}
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {isMine && message.readAt && " · Seen"}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Fixed on mobile so the compose bar is always reachable regardless of how much sits above it (offer panels, warnings) — back to normal in-flow placement from sm: up. */}
      <form
        ref={formRef}
        action={(formData) => {
          if (imageUrl) formData.set("imageUrl", imageUrl);
          formAction(formData);
          formRef.current?.reset();
          setImageUrl(null);
        }}
        className={`fixed inset-x-0 z-30 flex flex-col gap-2 border-t border-border bg-background/95 p-3 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none ${hasMobileBottomNav ? "bottom-16" : "bottom-0"}`}
      >
        {imageUrl && (
          <div className="relative h-16 w-16">
            <Image src={imageUrl} alt="Attachment preview" fill className="rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        )}
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isUploading} />
            <ImageIcon className="h-4 w-4" strokeWidth={2} />
          </label>
          <textarea
            name="body"
            rows={2}
            placeholder="Type a message…"
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <SendButton />
        </div>
      </form>
      <div className={`sm:hidden ${hasMobileBottomNav ? "h-24" : "h-20"}`} aria-hidden />
    </div>
  );
}
