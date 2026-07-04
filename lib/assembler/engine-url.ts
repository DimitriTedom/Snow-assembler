/** Browser-facing FFmpeg engine URL (bypasses Next.js body limits for large uploads). */
export function getPublicEngineUrl() {
  return process.env.NEXT_PUBLIC_ASSEMBLER_ENGINE_URL ?? "http://localhost:8001";
}