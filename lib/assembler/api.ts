import type { ProjectAssemblySettings } from "@/lib/assembler/types";

type EngineProjectBody = {
  project_dir?: string;
  projectDir?: string;
  scenes_json_path?: string;
  scenesJsonPath?: string;
  images_dir?: string;
  imagesDir?: string;
  videos_dir?: string;
  videosDir?: string;
  media_type?: ProjectAssemblySettings["mediaType"];
  mediaType?: ProjectAssemblySettings["mediaType"];
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
const CRAVE_VIDEO_MARKERS = ["/CRAVE & CONQUER/Videos/", "/crave & conquer/videos/"] as const;
const CRAVE_ROOT_MARKERS = ["/CRAVE & CONQUER/", "/crave & conquer/"] as const;

/** Convert a Windows project path to the matching Docker volume mount. */
export function toDockerZennPath(hostPath: string): string {
  const normalized = hostPath.replace(/\\/g, "/");

  if (
    normalized.startsWith("/data/zenn/") ||
    normalized.startsWith("/data/crave-videos/") ||
    normalized.startsWith("/data/crave-root/")
  ) {
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

  for (const marker of CRAVE_VIDEO_MARKERS) {
    const index = lower.indexOf(marker.toLowerCase());
    if (index !== -1) {
      const suffix = normalized.slice(index + marker.length);
      return `/data/crave-videos/${suffix}`;
    }
  }

  for (const marker of CRAVE_ROOT_MARKERS) {
    const index = lower.indexOf(marker.toLowerCase());
    if (index !== -1) {
      const suffix = normalized.slice(index + marker.length);
      return `/data/crave-root/${suffix}`;
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
    videos_dir: resolveEnginePath(settings.videos_dir ?? settings.videosDir),
    media_type: settings.media_type ?? settings.mediaType ?? "images",
    audio_path: resolveEnginePath(settings.audio_path ?? settings.audioPath),
    output_filename: settings.output_filename ?? settings.outputFilename ?? "assembled.mp4",
    image_naming: settings.image_naming ?? settings.imageNaming ?? "sequential",
    width: settings.width ?? 1920,
    height: settings.height ?? 1080,
    fps: settings.fps ?? 30,
    motion: settings.motion ?? "none",
  };
}