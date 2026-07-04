import type { ProjectAssemblySettings } from "@/lib/assembler/types";

type EngineProjectBody = {
  project_dir?: string;
  projectDir?: string;
  scenes_json_path?: string;
  scenesJsonPath?: string;
  images_dir?: string;
  imagesDir?: string;
  audio_path?: string;
  audioPath?: string;
  output_filename?: string;
  outputFilename?: string;
  image_naming?: ProjectAssemblySettings["imageNaming"];
  imageNaming?: ProjectAssemblySettings["imageNaming"];
  width?: number;
  height?: number;
  fps?: number;
  motion?: ProjectAssemblySettings["motion"];
};

const ZENN_MARKERS = ["/Documents/Zenn/", "/documents/zenn/"] as const;

/** Convert a Windows Zenn folder path to the Docker mount (/data/zenn/...). */
export function toDockerZennPath(hostPath: string): string {
  const normalized = hostPath.replace(/\\/g, "/");

  if (normalized.startsWith("/data/zenn/")) {
    return normalized;
  }

  const lower = normalized.toLowerCase();
  for (const marker of ZENN_MARKERS) {
    const index = lower.indexOf(marker);
    if (index !== -1) {
      const suffix = normalized.slice(index + marker.length);
      return `/data/zenn/${suffix}`;
    }
  }

  return normalized;
}

function resolveEnginePath(raw: string | undefined): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  return toDockerZennPath(raw.trim());
}

/** Map frontend camelCase settings to Python engine snake_case body. */
export function toEngineProjectPayload(settings: EngineProjectBody) {
  const projectDir = settings.project_dir ?? settings.projectDir ?? "";

  return {
    project_dir: toDockerZennPath(projectDir),
    scenes_json_path: resolveEnginePath(settings.scenes_json_path ?? settings.scenesJsonPath),
    images_dir: resolveEnginePath(settings.images_dir ?? settings.imagesDir),
    audio_path: resolveEnginePath(settings.audio_path ?? settings.audioPath),
    output_filename: settings.output_filename ?? settings.outputFilename ?? "assembled.mp4",
    image_naming: settings.image_naming ?? settings.imageNaming ?? "sequential",
    width: settings.width ?? 1920,
    height: settings.height ?? 1080,
    fps: settings.fps ?? 30,
    motion: settings.motion ?? "none",
  };
}