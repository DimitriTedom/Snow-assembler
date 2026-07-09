const OUTPUT_HINT =
  "Snow-assembler/output (or your project folder if writable).";

export function formatEngineUnreachableError(context: "assemble" | "validate" = "assemble") {
  if (context === "validate") {
    return "Cannot reach assembler engine. Start it with `npm run engine:up`.";
  }

  return (
    "Lost connection while waiting for FFmpeg — the engine may still be rendering. " +
    "Check CPU usage and `npm run engine:logs`. When it finishes, look for assembled.mp4 in " +
    OUTPUT_HINT
  );
}

export function formatEngineFetchError(error: unknown, context: "assemble" | "validate" = "assemble") {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Cancelled.";
  }

  if (
    error instanceof TypeError &&
    /fetch|network|failed/i.test(error.message)
  ) {
    return formatEngineUnreachableError(context);
  }

  if (error instanceof Error && error.message.includes("fetch failed")) {
    return formatEngineUnreachableError(context);
  }

  return error instanceof Error ? error.message : "Request failed.";
}

export function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error &&
      (error.name === "AbortError" || error.message.toLowerCase().includes("aborted")))
  );
}