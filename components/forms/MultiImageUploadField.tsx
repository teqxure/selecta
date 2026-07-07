"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { getUploadUrlAction } from "@/services/storage/storage.actions";
import { IMAGE_KIND_LABELS } from "@/lib/validators/product";
import { ALLOWED_IMAGE_CONTENT_TYPES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from "@/lib/constants/storage";
import type { ProductImageKind } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

interface Slot {
  key: string;
  url: string | null;
  kind: ProductImageKind;
  uploading: boolean;
  error: string | null;
}

export interface MultiImageUploadFieldProps {
  name: string;
  folder: string;
  min?: number;
  max?: number;
  defaultImages?: { url: string; kind: ProductImageKind }[];
}

const IMAGE_KINDS = Object.keys(IMAGE_KIND_LABELS) as ProductImageKind[];

/**
 * Serializes the current slot state into a hidden JSON input named `name`
 * on every change, so this composes with a plain Server Action the same
 * way a single <input> would — the action just JSON.parses one field.
 */
export function MultiImageUploadField({ name, folder, min = 2, max = 10, defaultImages = [] }: MultiImageUploadFieldProps) {
  const [slots, setSlots] = useState<Slot[]>(
    defaultImages.map((image, index) => ({ key: `existing-${index}`, url: image.url, kind: image.kind, uploading: false, error: null })),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadedCount = slots.filter((slot) => slot.url).length;
  const canAddMore = slots.length < max;

  function updateSlot(key: string, patch: Partial<Slot>) {
    setSlots((current) => current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)));
  }

  function validateFile(file: File): string | null {
    if (!ALLOWED_IMAGE_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number])) {
      return "Unsupported file type";
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return `Too large (max ${MAX_UPLOAD_SIZE_LABEL})`;
    }
    return null;
  }

  async function uploadFile(key: string, file: File) {
    try {
      const { uploadUrl, publicUrl } = await getUploadUrlAction(folder, file.type);
      const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("Upload failed");
      updateSlot(key, { url: publicUrl, uploading: false });
    } catch {
      updateSlot(key, { uploading: false, error: "Upload failed" });
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const room = max - slots.length;
    const toAdd = files.slice(0, room);

    const newSlots: Slot[] = toAdd.map((file, index) => {
      const validationError = validateFile(file);
      return {
        key: `upload-${Date.now()}-${index}`,
        url: null,
        kind: "OTHER",
        uploading: validationError === null,
        error: validationError,
      };
    });
    setSlots((current) => [...current, ...newSlots]);
    toAdd.forEach((file, index) => {
      if (newSlots[index].error === null) uploadFile(newSlots[index].key, file);
    });
  }

  function removeSlot(key: string) {
    setSlots((current) => current.filter((slot) => slot.key !== key));
  }

  const serialized = JSON.stringify(
    slots.filter((slot) => slot.url).map((slot) => ({ url: slot.url, kind: slot.kind })),
  );

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={serialized} />

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {slots.map((slot) => (
          <div key={slot.key} className="flex flex-col gap-1">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              {slot.url && <Image src={slot.url} alt="" fill className="object-cover" />}
              {slot.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs text-muted-foreground">
                  Uploading…
                </div>
              )}
              {slot.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-1 text-center text-xs text-red-600">
                  {slot.error}
                </div>
              )}
              <button
                type="button"
                onClick={() => removeSlot(slot.key)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-midnight/70 text-xs text-cream"
              >
                ✕
              </button>
            </div>
            {slot.url && (
              <select
                value={slot.kind}
                onChange={(event) => updateSlot(slot.key, { kind: event.target.value as ProductImageKind })}
                className="rounded-md border border-border bg-background px-1.5 py-1 text-xs text-foreground"
              >
                {IMAGE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {IMAGE_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-xs">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />

      <p className={cn("text-sm", uploadedCount < min ? "text-muted-foreground" : "text-muted-foreground")}>
        {uploadedCount}/{max} photos added — minimum {min} required.
      </p>
    </div>
  );
}
