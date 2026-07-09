export type ImageNaming = "auto" | "timestamp" | "sequential";
export type MotionMode = "none" | "ken_burns";
export type MediaType = "images" | "videos";
export type TransitionMode = "none" | "crossfade" | "fade_black" | "wipe_left" | "slide_left";
export type QualityPreset = "draft" | "standard" | "high";
export type WorkflowMode = "slideshow" | "video-clips";
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
  mediaType?: MediaType;
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

export type AssemblyPreset = {
  id: string;
  label: string;
  description: string;
  mediaType: MediaType;
  imageNaming: ImageNaming;
  motion: MotionMode;
  transition: TransitionMode;
  transitionDuration: number;
  quality: QualityPreset;
  fps: number;
};

export type ProjectAssemblySettings = {
  projectDir: string;
  scenesJsonPath?: string;
  imagesDir?: string;
  videosDir?: string;
  mediaType: MediaType;
  audioPath?: string;
  outputFilename: string;
  imageNaming: ImageNaming;
  width: number;
  height: number;
  fps: number;
  motion: MotionMode;
  transition: TransitionMode;
  transitionDuration: number;
  quality: QualityPreset;
  exportCaptions: boolean;
  sceneRangeStart?: number;
  sceneRangeEnd?: number;
  presetId?: string;
};

export type AssemblyJob = {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  phase: string;
  progress: number;
  currentScene: number;
  totalScenes: number;
  message: string;
  result?: AssemblyResult;
  error?: string | null;
};

export type ByteMetric = {
  bytes: number;
  gib: number;
  display: string;
};

export type SystemStats = {
  timestamp: number;
  host: string;
  platform: string;
  context: "docker" | "host";
  cpu: {
    percent: number;
    count: number;
    loadAverage: number[] | null;
  };
  memory: {
    total: ByteMetric;
    used: ByteMetric;
    available: ByteMetric;
    percent: number;
  };
  disk: {
    path: string;
    total: ByteMetric;
    used: ByteMetric;
    free: ByteMetric;
    percent: number;
  };
  process: {
    pid: number;
    memoryPercent: number;
  };
};