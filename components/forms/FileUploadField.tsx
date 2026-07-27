"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";
import { FileText, X, Loader2, Upload } from "lucide-react";
import { getUploadUrlAction } from "@/services/storage/storage.actions";
import { ALLOWED_DOCUMENT_CONTENT_TYPES, MAX_DOCUMENT_SIZE_BYTES, MAX_DOCUMENT_SIZE_LABEL } from "@/lib/constants/storage";
import { cn } from "@/lib/utils";

export interface FileUploadFieldProps {
  name: string;
  label: string;
  folder: string;
  required?: boolean;
  helperText?: string;
  defaultUrl?: string;
}

/**
 * Generic-file sibling of ImageUploadField — same presigned-URL/PUT-to-R2
 * wiring, but accepts PDFs (compliance documents rarely have a meaningful
 * image preview, and running them through compressImageFile would be
 * wrong), so this renders a filename chip instead of an <Image> preview.
 */
export function FileUploadField({ name, label, folder, required, helperText, defaultUrl }: FileUploadFieldProps) {
  const inputId = useId();
  const [publicUrl, setPublicUrl] = useState<string | null>(defaultUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_DOCUMENT_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_CONTENT_TYPES)[number])) {
      setError("Unsupported file type — please use PDF, JPEG, PNG, or WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setError(`File is too large — maximum size is ${MAX_DOCUMENT_SIZE_LABEL}.`);
      event.target.value = "";
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const { uploadUrl, publicUrl: url } = await getUploadUrlAction(folder, file.type, file.size, "document");
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("Upload failed");
        setPublicUrl(url);
        setFileName(file.name);
      } catch {
        setError("Upload failed — please try again.");
      }
    });
  }

  function handleRemove() {
    setPublicUrl(null);
    setFileName(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input type="hidden" name={name} value={publicUrl ?? ""} required={required} />
      <input id={inputId} type="file" accept="application/pdf,image/*" onChange={handleChange} disabled={isPending} className="sr-only" />

      {publicUrl ? (
        <div className="flex items-center gap-2 rounded-xl border border-border p-3">
          <FileText className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.75} />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm text-foreground hover:underline">
            {fileName ?? "Uploaded document"}
          </a>
          {isPending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" strokeWidth={2} />
          ) : (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove file"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            "flex h-16 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 text-center transition-colors hover:border-accent/50 hover:bg-muted",
            isPending && "pointer-events-none opacity-60",
          )}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={2} />
          ) : (
            <>
              <Upload className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-xs font-medium text-muted-foreground">Click to upload PDF or image</span>
            </>
          )}
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  );
}
