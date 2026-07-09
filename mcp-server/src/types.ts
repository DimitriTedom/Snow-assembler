export type ImageNaming = "auto" | "timestamp" | "sequential";
export type MotionMode = "none" | "ken_burns";
export type MediaType = "images" | "videos";
export type TransitionMode = "none" | "crossfade" | "fade_black" | "wipe_left" | "slide_left";
export type QualityPreset = "draft" | "standard" | "high";
export type SceneSource = "snow_transcriber" | "timeline" | "generic";

export type SceneMatchSummary = {
  id: number;
  start: number;
  end: number;
  duration: number;
  match_key: string;
  image: string | null;
  text: string;
};

export type ValidationResult = {
  sceneSource: SceneSource;
  sceneCount: number;
  totalDuration: number;
  matchedCount: number;
  missingCount: number;
  unusedImageCount: number;
  imageNaming: ImageNaming;
  scenes: SceneMatchSummary[];
  missingScenes: SceneMatchSummary[];
  unusedImages: string[];
};

export type AssemblyResult = {
  sceneSource: SceneSource;
  sceneCount: number;
  totalDuration: number;
  outputPath: string;
  captionsPath?: string | null;
};

export type ProjectAssemblyRequest = {
  project_dir: string;
  scenes_json_path?: string;
  images_dir?: string;
  videos_dir?: string;
  audio_path?: string;
  output_filename?: string;
  media_type?: MediaType;
  image_naming?: ImageNaming;
  width?: number;
  height?: number;
  fps?: number;
  motion?: MotionMode;
  transition?: TransitionMode;
  transition_duration?: number;
  quality?: QualityPreset;
  export_captions?: boolean;
  scene_range_start?: number;
  scene_range_end?: number;
  preset_id?: string;
};