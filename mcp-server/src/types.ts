export type ImageNaming = "auto" | "timestamp" | "sequential";
export type MotionMode = "none" | "ken_burns";
export type SceneSource = "snow_transcriber" | "zenn_timeline" | "generic";

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
};

export type ProjectAssemblyRequest = {
  project_dir: string;
  scenes_json_path?: string;
  images_dir?: string;
  audio_path?: string;
  output_filename?: string;
  image_naming?: ImageNaming;
  width?: number;
  height?: number;
  fps?: number;
  motion?: MotionMode;
};