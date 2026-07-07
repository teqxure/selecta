"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import Image from "next/image";
import { getUploadUrlAction } from "@/services/storage/storage.actions";

export interface ImageUploadFieldProps {
  name: string;
  label: string;
  folder: string;
  required?: boolean;
  helperText?: string;
  defaultUrl?: string;
}

/**
 * Uploads directly from the browser to Scaleway Object Storage via a
 * presigned URL — the file bytes never pass through our server. The
 * resulting public URL is carried into the surrounding <form> as a hidden
 * input named `name`, so this composes with a plain Server Action the same
 * way any other form field does.
 */
export function ImageUploadField({ name, label, folder, required, helperText, defaultUrl }: ImageUploadFieldProps) {
  const [publicUrl, setPublicUrl] = useState<string | null>(defaultUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

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

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input type="hidden" name={name} value={publicUrl ?? ""} required={required} />
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={isPending}
        className="text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium"
      />
      {isPending && <p className="text-sm text-muted-foreground">Uploading…</p>}
      {publicUrl && (
        <Image src={publicUrl} alt="" width={96} height={96} className="h-24 w-24 rounded-lg object-cover" />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  );
}
