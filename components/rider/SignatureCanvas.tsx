"use client";

import { useRef, useState, type PointerEvent } from "react";
import { getUploadUrlAction } from "@/services/storage/storage.actions";
import { Button } from "@/components/ui/Button";
import { Loader2, RotateCcw } from "lucide-react";

/**
 * A minimal draw-to-sign pad — no external signature-pad library. Captures
 * pointer strokes onto a canvas, then uploads the rendered PNG through the
 * same presigned-URL path as any other image, so `proofSignatureUrl` is
 * just a public R2 URL like every other proof/document field.
 */
export function SignatureCanvas({ onSaved }: { onSaved: (url: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  function getContext() {
    const canvas = canvasRef.current;
    return canvas?.getContext("2d") ?? null;
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const ctx = getContext();
    if (!ctx) return;
    drawingRef.current = true;
    const rect = event.currentTarget.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const rect = event.currentTarget.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
    hasDrawnRef.current = true;
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    setSavedUrl(null);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnRef.current) return;

    setIsUploading(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not render signature");

      const { uploadUrl, publicUrl } = await getUploadUrlAction("proof-of-delivery", "image/png", blob.size, "image");
      const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: blob });
      if (!response.ok) throw new Error("Upload failed");

      setSavedUrl(publicUrl);
      onSaved(publicUrl);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={140}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="touch-none rounded-lg border border-border bg-white"
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleClear}>
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          Clear
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={handleSave} disabled={isUploading}>
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : null}
          {savedUrl ? "Saved ✓" : "Save signature"}
        </Button>
      </div>
    </div>
  );
}
