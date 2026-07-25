"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";
import { Video, X, Loader2 } from "lucide-react";
import { getUploadUrlAction } from "@/services/storage/storage.actions";
import { ALLOWED_VIDEO_CONTENT_TYPES, MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_SIZE_LABEL } from "@/lib/constants/storage";
import { cn } from "@/lib/utils";

export interface VideoUploadFieldProps {
  name: string;
  label: string;
  folder: string;
  helperText?: string;
  defaultUrl?: string;
}

/**
 * Same dropzone/hidden-input pattern as ImageUploadField, for a single
 * optional video — uploads directly to R2 via a presigned URL, the file
 * never passes through our server. Always optional: no `required` prop.
 */
export function VideoUploadField({ name, label, folder, helperText, defaultUrl }: VideoUploadFieldProps) {
  const inputId = useId();
  const [publicUrl, setPublicUrl] = useState<string | null>(defaultUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_VIDEO_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_CONTENT_TYPES)[number])) {
      setError("Unsupported file type — please use MP4, MOV, or WebM.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`File is too large — maximum size is ${MAX_VIDEO_SIZE_LABEL}.`);
      event.target.value = "";
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const { uploadUrl, publicUrl: url } = await getUploadUrlAction(folder, file.type, file.size, "video");
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("Upload failed");
        setPublicUrl(url);
      } catch {
        setError("Upload failed — please try again.");
      }
    });
  }

  function handleRemove() {
    setPublicUrl(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input type="hidden" name={name} value={publicUrl ?? ""} />
      <input id={inputId} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={handleChange} disabled={isPending} className="sr-only" />

      {publicUrl ? (
        <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border bg-muted">
          <video src={publicUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          {!isPending && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove video"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-midnight/70 text-white transition-colors hover:bg-midnight"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-midnight/50">
              <Loader2 className="h-5 w-5 animate-spin text-white" strokeWidth={2} />
            </div>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            "flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/40 text-center transition-colors hover:border-accent/50 hover:bg-muted",
            isPending && "pointer-events-none opacity-60",
          )}
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={2} />
          ) : (
            <>
              <Video className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="px-2 text-xs font-medium text-muted-foreground">Click to upload</span>
            </>
          )}
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  );
}
