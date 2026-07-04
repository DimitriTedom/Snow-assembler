export type ImageNaming = "auto" | "timestamp" | "sequential";
export type MotionMode = "none" | "ken_burns";
export type MediaType = "images" | "videos";
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
};

export type UploadAssemblySettings = {
  imageNaming: ImageNaming;
  width: number;
  height: number;
  fps: number;
  motion: MotionMode;
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