import imageCompression from "browser-image-compression";

const MAX_WIDTH_OR_HEIGHT = 1600;
const TARGET_MAX_SIZE_MB = 1;

/**
 * Resizes/re-encodes on the client before upload — so what actually
 * reaches R2 is already small, instead of storing whatever bytes the
 * device's camera produced (often 4-8MB per phone photo). Cuts storage/
 * egress cost and gives Next's `/next/image` optimizer a better source to
 * work from. PNG stays lossless (canvas has no quality knob for PNG in
 * the browser) — only dimensions shrink; JPEG/WebP get both dimension and
 * quality reduction. Falls back to the original file untouched if
 * compression throws for any reason — an optimization nicety should never
 * block an upload.
 */
export async function compressImageFile(file: File): Promise<File> {
  try {
    return await imageCompression(file, {
      maxSizeMB: TARGET_MAX_SIZE_MB,
      maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
      useWebWorker: true,
      initialQuality: 0.82,
    });
  } catch {
    return file;
  }
}
