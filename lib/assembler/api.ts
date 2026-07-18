import { normalizeOutputFilename } from "@/lib/assembler/filename";
import type { ProjectAssemblySettings } from "@/lib/assembler/types";

type EngineProjectBody = Partial<ProjectAssemblySettings> & {
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
  transition_duration?: number;
  transitionDuration?: number;
  export_captions?: boolean;
  exportCaptions?: boolean;
  scene_range_start?: number;
  sceneRangeStart?: number;
  scene_range_end?: number;
  sceneRangeEnd?: number;
  preset_id?: string;
  presetId?: string;
};

const PROJECT_ROOT = (
  process.env.NEXT_PUBLIC_PROJECT_DATA_ROOT ?? process.env.PROJECT_DATA_ROOT ?? ""
).replace(/\\/g, "/");

const getPathMappings = (): Array<{ marker: string; mount: string }> => {
  const envVal = process.env.PATH_MAPPINGS ?? "";
  if (envVal.trim() && envVal.trim().toLowerCase() !== "none") {
    return envVal.split(",").map(pair => {
      const [marker, mount] = pair.split("=");
      return {
        marker: marker.trim().toLowerCase(),
        mount: mount.trim()
      };
    }).filter(item => item.marker && item.mount);
  }
  
  // Default legacy fallbacks for backward compatibility
  return [
    { marker: "/documents/zenn/", mount: "/data/zenn/" },
    { marker: "/crave & conquer/videos/", mount: "/data/crave-videos/" },
    { marker: "/crave & conquer/", mount: "/data/crave-root/" },
  ];
};

/** Convert a host project path to the matching Docker volume mount. */
export function toDockerProjectPath(hostPath: string): string {
  const normalized = hostPath.replace(/\\/g, "/");
  const mappings = getPathMappings();

  if (
    normalized.startsWith("/data/projects/") ||
    mappings.some(m => normalized.startsWith(m.mount))
  ) {
    return normalized;
  }

  const lower = normalized.toLowerCase();

  if (PROJECT_ROOT) {
    const rootLower = PROJECT_ROOT.toLowerCase().replace(/\/$/, "");
    if (lower.startsWith(rootLower)) {
      const suffix = normalized.slice(PROJECT_ROOT.replace(/\/$/, "").length).replace(/^\//, "");
      return `/data/projects/${suffix}`;
    }
  }

  for (const entry of mappings) {
    const index = lower.indexOf(entry.marker);
    if (index !== -1) {
      const suffix = normalized.slice(index + entry.marker.length);
      return `${entry.mount}${suffix}`;
    }
  }

  return normalized;
}

/** @deprecated Use toDockerProjectPath */
export const toDockerZennPath = toDockerProjectPath;

function resolveEnginePath(raw: string | undefined): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  return toDockerProjectPath(raw.trim());
}

/** Map frontend camelCase settings to Python engine snake_case body. */
export function toEngineProjectPayload(settings: EngineProjectBody) {
  const projectDir = settings.project_dir ?? settings.projectDir ?? "";

  return {
    project_dir: toDockerProjectPath(projectDir),
    scenes_json_path: resolveEnginePath(settings.scenes_json_path ?? settings.scenesJsonPath),
    images_dir: resolveEnginePath(settings.images_dir ?? settings.imagesDir),
    videos_dir: resolveEnginePath(settings.videos_dir ?? settings.videosDir),
    media_type: settings.media_type ?? settings.mediaType ?? "images",
    audio_path: resolveEnginePath(settings.audio_path ?? settings.audioPath),
    output_filename: normalizeOutputFilename(
      settings.output_filename ?? settings.outputFilename,
    ),
    image_naming: settings.image_naming ?? settings.imageNaming ?? "sequential",
    width: settings.width ?? 1920,
    height: settings.height ?? 1080,
    fps: settings.fps ?? 30,
    motion: settings.motion ?? "none",
    transition: settings.transition ?? "none",
    transition_duration: settings.transition_duration ?? settings.transitionDuration ?? 0.4,
    quality: settings.quality ?? "standard",
    export_captions: settings.export_captions ?? settings.exportCaptions ?? false,
    scene_range_start: settings.scene_range_start ?? settings.sceneRangeStart ?? null,
    scene_range_end: settings.scene_range_end ?? settings.sceneRangeEnd ?? null,
    preset_id: settings.preset_id ?? settings.presetId ?? null,
  };
}