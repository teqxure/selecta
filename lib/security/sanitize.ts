/**
 * Strips control characters and collapses whitespace in free-text fields
 * (store bio, review comments, address lines) before they ever reach the
 * database. This is not HTML-escaping — React already escapes on render —
 * it exists to stop null bytes / control characters and to normalize
 * whitespace-only "empty" submissions.
 */
function isPrintable(charCode: number) {
  const DELETE = 127;
  const SPACE = 32;
  return charCode >= SPACE && charCode !== DELETE;
}

export function sanitizeText(input: string) {
  let result = "";
  for (const char of input) {
    const code = char.charCodeAt(0);
    // Preserve newlines/tabs (they get collapsed by the whitespace pass below).
    result += isPrintable(code) || code === 9 || code === 10 || code === 13 ? char : "";
  }
  return result.trim().replace(/\s+/g, " ");
}

export function sanitizeOptionalText(input: string | undefined | null) {
  if (!input) return undefined;
  const cleaned = sanitizeText(input);
  return cleaned.length > 0 ? cleaned : undefined;
}
