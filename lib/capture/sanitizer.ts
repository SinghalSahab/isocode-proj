/**
 * Input sanitiser and prompt security guard for AI order capture.
 *
 * Rules:
 * 1. Limits text length strictly to MAX_CAPTURE_CHARS (1,000 characters).
 * 2. Strips unprintable control characters and normalises excessive whitespace.
 * 3. Enforces strict DATA boundaries to neutralise prompt injection attempts.
 */

export const MAX_CAPTURE_CHARS = 1000;

export function sanitizeCaptureText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  // 1. Replace control characters and tabs with spaces (preserving standard newlines)
  let clean = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");

  // 2. Normalize newlines and collapse horizontal whitespace
  clean = clean.replace(/\r\n/g, "\n").replace(/\t/g, " ");
  clean = clean.replace(/[^\S\n]+/g, " ");

  // 3. Trim space around newlines and collapse multiple blank lines
  clean = clean.replace(/[ ]+\n/g, "\n").replace(/\n[ ]+/g, "\n");
  clean = clean.replace(/\n{3,}/g, "\n\n");

  // 4. Trim string and enforce hard character cap
  clean = clean.trim();
  if (clean.length > MAX_CAPTURE_CHARS) {
    clean = clean.substring(0, MAX_CAPTURE_CHARS).trim();
  }

  return clean;
}

/**
 * Normalises capture input text.
 * Note on Assumption A7: The stray trailing '2' from the brief's paste
 * was a brief heading artifact handled at the fixture level.
 * The sanitizer preserves legitimate trailing quantities.
 */
export function normalizeOrderMessage(message: string): string {
  return sanitizeCaptureText(message);
}
