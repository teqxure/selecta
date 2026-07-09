"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { getUploadUrlAction } from "@/services/storage/storage.actions";
import { ALLOWED_IMAGE_CONTENT_TYPES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from "@/lib/constants/storage";
import { cn } from "@/lib/utils";

export interface ImageUploadFieldProps {
  name: string;
  label: string;
  folder: string;
  required?: boolean;
  helperText?: string;
  defaultUrl?: string;
}

/**
 * Uploads directly from the browser to Cloudflare R2 via a presigned URL —
 * the file bytes never pass through our server. The resulting public URL
 * is carried into the surrounding <form> as a hidden input named `name`,
 * so this composes with a plain Server Action the same way any other form
 * field does. The native file input is visually hidden and triggered via a
 * styled dropzone card instead of relying on browser-default file-input
 * chrome (which renders inconsistently, and plainly, across browsers).
 */
export function ImageUploadField({ name, label, folder, required, helperText, defaultUrl }: ImageUploadFieldProps) {
  const inputId = useId();
  const [publicUrl, setPublicUrl] = useState<string | null>(defaultUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number])) {
      setError("Unsupported file type — please use JPEG, PNG, WebP, or AVIF.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError(`File is too large — maximum size is ${MAX_UPLOAD_SIZE_LABEL}.`);
      event.target.value = "";
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const { uploadUrl, publicUrl: url } = await getUploadUrlAction(folder, file.type);
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
      <input type="hidden" name={name} value={publicUrl ?? ""} required={required} />
      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={isPending}
        className="sr-only"
      />

      {publicUrl ? (
        <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border">
          <Image src={publicUrl} alt="" fill sizes="128px" className="object-cover" />
          {!isPending && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove image"
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
              <ImagePlus className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
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
