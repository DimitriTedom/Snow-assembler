import type { AssemblyResult, ProjectAssemblyRequest, ValidationResult } from "./types.js";

const ENGINE_URL =
  process.env.SNOW_ASSEMBLER_ENGINE_URL ??
  process.env.ASSEMBLER_ENGINE_URL ??
  "http://localhost:8001";

const PROJECT_ROOT = (process.env.PROJECT_DATA_ROOT ?? "").replace(/\\/g, "/");

export async function checkEngineHealth(): Promise<{
  status: "online" | "offline";
  service?: string;
  ffmpeg?: string;
  engineUrl: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${ENGINE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      return {
        status: "offline",
        engineUrl: ENGINE_URL,
        error: `Engine returned HTTP ${response.status}`,
      };
    }
    const payload = (await response.json()) as { service?: string; ffmpeg?: string };
    return {
      status: "online",
      service: payload.service,
      ffmpeg: payload.ffmpeg,
      engineUrl: ENGINE_URL,
    };
  } catch (error) {
    return {
      status: "offline",
      engineUrl: ENGINE_URL,
      error: error instanceof Error ? error.message : "Engine unreachable",
    };
  }
}

export async function validateProject(request: ProjectAssemblyRequest): Promise<ValidationResult> {
  const health = await checkEngineHealth();
  if (health.status !== "online") {
    throw new Error(
      `Assembler engine is offline at ${ENGINE_URL}. Start it with: npm run engine:up. ${health.error ?? ""}`.trim(),
    );
  }

  const response = await fetch(`${ENGINE_URL}/validate/project`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "images",
      output_filename: "assembled.mp4",
      image_naming: "auto",
      width: 1920,
      height: 1080,
      fps: 30,
      motion: "none",
      transition: "none",
      transition_duration: 0.4,
      quality: "standard",
      export_captions: false,
      ...request,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const payload = await response.json();
  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : JSON.stringify(payload);
    throw new Error(`Validation failed (HTTP ${response.status}): ${detail}`);
  }

  return payload as ValidationResult;
}

export async function assembleImagesProject(request: ProjectAssemblyRequest): Promise<AssemblyResult> {
  const health = await checkEngineHealth();
  if (health.status !== "online") {
    throw new Error(
      `Assembler engine is offline at ${ENGINE_URL}. Start it with: npm run engine:up. ${health.error ?? ""}`.trim(),
    );
  }

  const response = await fetch(`${ENGINE_URL}/assemble/images/project`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "images",
      output_filename: "assembled.mp4",
      image_naming: "auto",
      width: 1920,
      height: 1080,
      fps: 30,
      motion: "none",
      transition: "none",
      transition_duration: 0.4,
      quality: "standard",
      export_captions: false,
      ...request,
    }),
    signal: AbortSignal.timeout(1_800_000),
  });

  const payload = await response.json();
  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : JSON.stringify(payload);
    throw new Error(`Assembly failed (HTTP ${response.status}): ${detail}`);
  }

  return payload as AssemblyResult;
}

export function getEngineUrl(): string {
  return ENGINE_URL;
}

/** Map a host project path to the Docker volume mount (/data/projects/...). */
export function toDockerProjectPath(hostPath: string): string {
  const normalized = hostPath.replace(/\\/g, "/");

  if (normalized.startsWith("/data/projects/")) {
    return normalized;
  }

  if (PROJECT_ROOT) {
    const root = PROJECT_ROOT.replace(/\/$/, "");
    const rootLower = root.toLowerCase();
    const lower = normalized.toLowerCase();
    if (lower.startsWith(rootLower)) {
      const suffix = normalized.slice(root.length).replace(/^\//, "");
      return `/data/projects/${suffix}`;
    }
  }

  return normalized;
}

/** @deprecated Use toDockerProjectPath */
export const toDockerZennPath = toDockerProjectPath;