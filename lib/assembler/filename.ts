const DEFAULT_OUTPUT_FILENAME = "assembled.mp4";

/** Normalize a user-provided episode filename for MP4 output. */
export function normalizeOutputFilename(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return DEFAULT_OUTPUT_FILENAME;
  }

  const safe = trimmed
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!safe) {
    return DEFAULT_OUTPUT_FILENAME;
  }

  return safe.toLowerCase().endsWith(".mp4") ? safe : `${safe}.mp4`;
}