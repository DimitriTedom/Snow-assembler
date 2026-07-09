"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  FolderOpen,
  Film,
  ImageIcon,
  Loader2,
  Music2,
  Play,
  Search,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import { toast } from "react-toastify";

import { EngineStatus } from "@/components/assembler/engine-status";
import { OperationTimer } from "@/components/operation-timer";
import { SystemMonitor } from "@/components/assembler/system-monitor";
import { useOperationTimer } from "@/hooks/use-operation-timer";
import { elapsedSuffix } from "@/lib/format-elapsed";
import { isAbortError } from "@/lib/assembler/engine-errors";
import { SceneMatchTable } from "@/components/assembler/scene-match-table";
import { WorkflowSteps } from "@/components/assembler/workflow-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDockerProjectPath } from "@/lib/assembler/api";
import { normalizeOutputFilename } from "@/lib/assembler/filename";
import { startAssemblyJob, waitForAssemblyJob } from "@/lib/assembler/jobs";
import {
  DEFAULT_PRESETS,
  applyPresetToSettings,
  parseWorkflowParam,
} from "@/lib/assembler/presets";
import { postAssemblerUpload } from "@/lib/assembler/upload-client";
import { cn } from "@/lib/utils";
import type {
  AssemblyJob,
  AssemblyResult,
  ImageNaming,
  MotionMode,
  ProjectAssemblySettings,
  QualityPreset,
  TransitionMode,
  ValidationResult,
  WorkflowMode,
} from "@/lib/assembler/types";

const TRANSITION_OPTIONS: { value: TransitionMode; label: string }[] = [
  { value: "none", label: "Hard cut" },
  { value: "crossfade", label: "Crossfade" },
  { value: "fade_black", label: "Fade to black" },
  { value: "wipe_left", label: "Wipe left" },
  { value: "slide_left", label: "Slide left" },
];

const QUALITY_OPTIONS: { value: QualityPreset; label: string }[] = [
  { value: "draft", label: "Draft (fast)" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
];

function createSettingsForWorkflow(workflow: WorkflowMode): ProjectAssemblySettings {
  const preset =
    workflow === "video-clips"
      ? DEFAULT_PRESETS.find((entry) => entry.id === "video-clips-standard")!
      : DEFAULT_PRESETS.find((entry) => entry.id === "slideshow-static")!;

  return applyPresetToSettings(
    {
      projectDir: "",
      outputFilename: "assembled.mp4",
      width: 1920,
      height: 1080,
      exportCaptions: false,
      mediaType: workflow === "video-clips" ? "videos" : "images",
      imageNaming: "sequential",
      motion: "none",
      transition: "none",
      transitionDuration: 0.4,
      quality: "standard",
      fps: 30,
    },
    preset,
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(1);
  return `${minutes}m ${remainder}s`;
}

function formatPhase(phase: string) {
  switch (phase) {
    case "rendering_clips":
      return "Rendering scenes";
    case "concatenating":
      return "Applying transitions";
    case "muxing_audio":
      return "Muxing narration";
    case "starting":
      return "Starting";
    case "done":
      return "Complete";
    default:
      return phase.replace(/_/g, " ");
  }
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AssemblerWorkspace() {
  const searchParams = useSearchParams();
  const workflowFromUrl = parseWorkflowParam(searchParams.get("workflow"));

  const [workflow, setWorkflow] = useState<WorkflowMode>(workflowFromUrl);
  const [mode, setMode] = useState<"project" | "upload">("project");
  const [settings, setSettings] = useState<ProjectAssemblySettings>(() =>
    createSettingsForWorkflow(workflowFromUrl),
  );
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [assembly, setAssembly] = useState<AssemblyResult | null>(null);
  const [job, setJob] = useState<AssemblyJob | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const assembleTimer = useOperationTimer();

  const [scenesJson, setScenesJson] = useState<File | null>(null);
  const [narration, setNarration] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);

  const isVideoWorkflow = settings.mediaType === "videos";
  const assetLabel = isVideoWorkflow ? "Clip" : "Image";

  const workflowPresets = useMemo(
    () =>
      DEFAULT_PRESETS.filter((preset) =>
        isVideoWorkflow ? preset.mediaType === "videos" : preset.mediaType === "images",
      ),
    [isVideoWorkflow],
  );

  const isReadyToAssemble = useMemo(() => {
    if (!validation) return false;
    return validation.missingCount === 0 && validation.matchedCount > 0;
  }, [validation]);

  function switchWorkflow(next: WorkflowMode) {
    setWorkflow(next);
    setSettings(createSettingsForWorkflow(next));
    setValidation(null);
    setAssembly(null);
    setJob(null);
    if (next === "video-clips") {
      setMode("project");
    }
  }

  function applyPreset(presetId: string) {
    const preset = DEFAULT_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    setSettings((current) => applyPresetToSettings(current, preset));
    setValidation(null);
    setAssembly(null);
    setJob(null);
  }

  async function handleValidateProject() {
    if (!settings.projectDir.trim()) {
      toast.error("Enter your episode folder path first.");
      return;
    }

    setIsValidating(true);
    setValidation(null);
    setAssembly(null);
    setJob(null);

    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Validation failed.");
      }

      setValidation(payload as ValidationResult);
      const assetWord = settings.mediaType === "videos" ? "clips" : "images";
      toast.success(
        `${payload.matchedCount}/${payload.sceneCount} scenes matched (${assetWord}).`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation failed.");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleValidateUpload() {
    if (!scenesJson) {
      toast.error("Upload a scenes JSON file first.");
      return;
    }
    if (images.length === 0) {
      toast.error("Upload at least one image.");
      return;
    }

    setIsValidating(true);
    setValidation(null);
    setAssembly(null);
    setJob(null);

    try {
      const formData = new FormData();
      formData.append("scenes_json", scenesJson);
      formData.append("image_naming", settings.imageNaming);
      images.forEach((file) => formData.append("images", file, file.name));

      const response = await postAssemblerUpload("validate", formData);
      const payload = await response.json();

      if (!response.ok) {
        const detail =
          typeof payload?.error === "string"
            ? payload.error
            : typeof payload?.detail === "string"
              ? payload.detail
              : Array.isArray(payload?.detail)
                ? payload.detail.map((item: { msg?: string }) => item.msg).join(", ")
                : "Validation failed.";
        throw new Error(detail);
      }

      setValidation(payload as ValidationResult);
      toast.success(`${payload.matchedCount}/${payload.sceneCount} scenes matched.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation failed.");
    } finally {
      setIsValidating(false);
    }
  }

  function handleStopAssembly() {
    abortRef.current?.abort();
  }

  async function handleAssembleProject() {
    if (!isReadyToAssemble) {
      toast.error("Validate scene matching first — all scenes need matching assets.");
      return;
    }

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setIsAssembling(true);
    setAssembly(null);
    setJob(null);
    assembleTimer.start();

    const toastId = toast.loading("FFmpeg is rendering your episode…");

    try {
      const started = await startAssemblyJob(settings, abortController.signal);
      setJob(started);

      const completed = await waitForAssemblyJob(started.jobId, {
        signal: abortController.signal,
        onUpdate: (update) => setJob(update),
      });

      const elapsedMs = assembleTimer.stop();

      if (completed.result) {
        setAssembly(completed.result);
        toast.update(toastId, {
          render:
            (isVideoWorkflow
              ? `Rendered ${completed.result.sceneCount} clips → ${completed.result.outputPath}`
              : `Rendered ${completed.result.sceneCount} scenes to ${completed.result.outputPath}`) +
            elapsedSuffix(elapsedMs),
          type: "success",
          autoClose: 8000,
          isLoading: false,
        });
      } else {
        throw new Error(completed.error ?? "Assembly completed without a result.");
      }
    } catch (error) {
      const elapsedMs = assembleTimer.stop();

      if (isAbortError(error)) {
        toast.update(toastId, {
          render: `Assembly stopped${elapsedSuffix(elapsedMs)}`,
          type: "info",
          autoClose: 5000,
          isLoading: false,
        });
        return;
      }

      toast.update(toastId, {
        render: `${error instanceof Error ? error.message : "Assembly failed."}${elapsedSuffix(elapsedMs)}`,
        type: "error",
        autoClose: 15000,
        isLoading: false,
      });
    } finally {
      abortRef.current = null;
      setIsAssembling(false);
    }
  }

  async function handleAssembleUpload() {
    if (!scenesJson || !narration || images.length === 0) {
      toast.error("Upload scenes JSON, narration audio, and images.");
      return;
    }
    if (!isReadyToAssemble) {
      toast.error("Validate scene matching first.");
      return;
    }

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setIsAssembling(true);
    assembleTimer.start();

    const toastId = toast.loading("FFmpeg is rendering your episode…");

    try {
      const formData = new FormData();
      formData.append("scenes_json", scenesJson);
      formData.append("narration", narration);
      formData.append("image_naming", settings.imageNaming);
      formData.append("width", String(settings.width));
      formData.append("height", String(settings.height));
      formData.append("fps", String(settings.fps));
      formData.append("motion", settings.motion);
      formData.append("transition", settings.transition);
      formData.append("transition_duration", String(settings.transitionDuration));
      formData.append("quality", settings.quality);
      formData.append("export_captions", String(settings.exportCaptions));
      formData.append("output_filename", normalizeOutputFilename(settings.outputFilename));
      images.forEach((file) => formData.append("images", file, file.name));

      const response = await postAssemblerUpload("assemble", formData, abortController.signal);

      if (!response.ok) {
        let message = "Assembly failed.";
        try {
          const payload = await response.json();
          message =
            typeof payload?.error === "string"
              ? payload.error
              : typeof payload?.detail === "string"
                ? payload.detail
                : Array.isArray(payload?.detail)
                  ? payload.detail.map((item: { msg?: string }) => item.msg).join(", ")
                  : message;
        } catch {
          message = `Assembly failed (HTTP ${response.status}).`;
        }
        throw new Error(message);
      }

      const outputFilename =
        response.headers.get("X-Snow-Output-Filename") ??
        normalizeOutputFilename(settings.outputFilename);
      const blob = await response.blob();
      downloadBlob(outputFilename, blob);
      const elapsedMs = assembleTimer.stop();
      toast.update(toastId, {
        render: `Episode assembled — MP4 downloaded${elapsedSuffix(elapsedMs)}`,
        type: "success",
        autoClose: 8000,
        isLoading: false,
      });
    } catch (error) {
      const elapsedMs = assembleTimer.stop();

      if (isAbortError(error)) {
        toast.update(toastId, {
          render: `Assembly stopped${elapsedSuffix(elapsedMs)}`,
          type: "info",
          autoClose: 5000,
          isLoading: false,
        });
        return;
      }

      toast.update(toastId, {
        render: `${error instanceof Error ? error.message : "Assembly failed."}${elapsedSuffix(elapsedMs)}`,
        type: "error",
        autoClose: 15000,
        isLoading: false,
      });
    } finally {
      abortRef.current = null;
      setIsAssembling(false);
    }
  }

  const progressPercent = job?.progress ?? 0;
  const showProgress = isAssembling && mode === "project" && job && job.status === "running";

  return (
    <div className="space-y-8">
      <EngineStatus />
      <SystemMonitor active={isAssembling || isValidating} />

      <div
        className={cn(
          "rounded-xl border px-4 py-3",
          isVideoWorkflow
            ? "border-primary/25 bg-primary/5"
            : "border-white/8 bg-secondary/30",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {isVideoWorkflow ? "Video clips workflow" : "Image slideshow workflow"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isVideoWorkflow
                ? "Timeline JSON + narration audio + one clip per scene"
                : "Timeline JSON + batch images + narration audio"}
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {settings.transition === "none" ? "Hard cuts" : settings.transition.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <WorkflowSteps variant={workflow} />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={workflow === "slideshow" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => switchWorkflow("slideshow")}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Image slideshow
        </Button>
        <Button
          type="button"
          variant={workflow === "video-clips" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => switchWorkflow("video-clips")}
        >
          <Film className="mr-2 h-4 w-4" />
          Video clips
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === "project" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setMode("project")}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Episode folder
        </Button>
        {!isVideoWorkflow ? (
          <Button
            type="button"
            variant={mode === "upload" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setMode("upload")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload assets
          </Button>
        ) : null}
      </div>

      {isAssembling ? (
        <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {isVideoWorkflow ? "Rendering video episode…" : "Assembling slideshow…"}
              </p>
              <p className="mt-1 text-xs text-amber-200/90">
                {showProgress && job
                  ? `${formatPhase(job.phase)} — scene ${job.currentScene}/${job.totalScenes}`
                  : "FFmpeg may run for 10+ minutes on long episodes. High CPU is normal."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleStopAssembly}
              className="cursor-pointer shrink-0 border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
            >
              <Square className="mr-2 h-4 w-4 fill-current" />
              Stop
            </Button>
          </div>

          {showProgress ? (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
              <p className="text-xs text-amber-200/80">{Math.round(progressPercent)}% complete</p>
            </div>
          ) : null}

          <OperationTimer
            label="Rendering"
            elapsedMs={assembleTimer.elapsedMs}
            active
            variant="panel"
            className="border-amber-500/20 bg-black/20 text-amber-50"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="space-y-5 rounded-2xl border border-white/8 bg-card/60 p-5 backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {mode === "project" ? "Local episode project" : "Upload assembly"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "project"
                ? isVideoWorkflow
                  ? "Point at a folder with timeline JSON, narration audio, and scene clips."
                  : "Point at a folder with timeline JSON, images/, and narration audio."
                : "Drop scenes JSON, batch images, and narration. Best for quick tests."}
            </p>
            {isVideoWorkflow && mode === "upload" ? (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Video clip assembly uses <strong>Episode folder</strong> mode — local clip files on disk.
              </p>
            ) : null}
            {!isVideoWorkflow && mode === "upload" ? (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                For full episodes (100+ images), prefer <strong>Episode folder</strong> mode — it reads
                files from disk and is much faster.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preset">Assembly preset</Label>
            <select
              id="preset"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={settings.presetId ?? workflowPresets[0]?.id ?? ""}
              onChange={(event) => applyPreset(event.target.value)}
            >
              {workflowPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {workflowPresets.find((p) => p.id === settings.presetId)?.description ??
                "Choose a starting point — you can tweak transitions below."}
            </p>
          </div>

          {mode === "project" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectDir">Project directory</Label>
                <Input
                  id="projectDir"
                  value={settings.projectDir}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, projectDir: event.target.value }))
                  }
                  placeholder="D:/Videos/my-episode"
                />
                {settings.projectDir.trim() ? (
                  <p className="text-xs text-muted-foreground">
                    Docker path:{" "}
                    <span className="font-mono text-accent">
                      {toDockerProjectPath(settings.projectDir)}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Set PROJECT_DATA_DIR in .env so your host folder maps to /data/projects in Docker.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {isVideoWorkflow ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="videosDir">Clips folder (optional)</Label>
                    <Input
                      id="videosDir"
                      value={settings.videosDir ?? ""}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          videosDir: event.target.value || undefined,
                        }))
                      }
                      placeholder="leave empty — auto-discovers clips/"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="imagesDir">Images dir (optional)</Label>
                      <Input
                        id="imagesDir"
                        value={settings.imagesDir ?? ""}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            imagesDir: event.target.value || undefined,
                          }))
                        }
                        placeholder="leave empty — auto-finds images/"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audioPath">Audio path (optional)</Label>
                      <Input
                        id="audioPath"
                        value={settings.audioPath ?? ""}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            audioPath: event.target.value || undefined,
                          }))
                        }
                        placeholder="leave empty — auto-detect .m4a"
                      />
                    </div>
                  </>
                )}
                {isVideoWorkflow ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="audioPathVideo">Audio path (optional)</Label>
                    <Input
                      id="audioPathVideo"
                      value={settings.audioPath ?? ""}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          audioPath: event.target.value || undefined,
                        }))
                      }
                      placeholder="leave empty — auto-detect .m4a"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scenesJson">Scenes JSON</Label>
                <Input
                  id="scenesJson"
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => setScenesJson(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="narration">Narration audio</Label>
                <Input
                  id="narration"
                  type="file"
                  accept="audio/*,.m4a,.mp3,.wav"
                  onChange={(event) => setNarration(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="images">Batch images</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setImages(Array.from(event.target.files ?? []))}
                />
                {images.length > 0 ? (
                  <p className="text-xs text-muted-foreground">{images.length} images selected</p>
                ) : null}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Transition</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={settings.transition}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    transition: event.target.value as TransitionMode,
                    presetId: undefined,
                  }))
                }
              >
                {TRANSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transitionDuration">
                Transition duration ({settings.transitionDuration.toFixed(1)}s)
              </Label>
              <Input
                id="transitionDuration"
                type="range"
                min={0.1}
                max={2}
                step={0.05}
                value={settings.transitionDuration}
                disabled={settings.transition === "none"}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    transitionDuration: Number(event.target.value),
                    presetId: undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Quality</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={settings.quality}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    quality: event.target.value as QualityPreset,
                    presetId: undefined,
                  }))
                }
              >
                {QUALITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {!isVideoWorkflow ? (
              <div className="space-y-2">
                <Label>Image naming</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={settings.imageNaming}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      imageNaming: event.target.value as ImageNaming,
                    }))
                  }
                >
                  <option value="auto">Auto detect</option>
                  <option value="timestamp">Timestamp (0000_, 0002_)</option>
                  <option value="sequential">Sequential (SCENE_01)</option>
                </select>
              </div>
            ) : null}
            {!isVideoWorkflow ? (
              <div className="space-y-2">
                <Label>Motion</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={settings.motion}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      motion: event.target.value as MotionMode,
                      presetId: undefined,
                    }))
                  }
                >
                  <option value="none">Static</option>
                  <option value="ken_burns">Ken Burns zoom</option>
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="fps">FPS</Label>
              <Input
                id="fps"
                type="number"
                min={24}
                max={60}
                value={settings.fps}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, fps: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outputFilename">Output filename</Label>
              <Input
                id="outputFilename"
                value={settings.outputFilename}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, outputFilename: event.target.value }))
                }
                placeholder="my-episode.mp4"
              />
            </div>
            {mode === "project" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sceneRangeStart">Scene range start (optional)</Label>
                  <Input
                    id="sceneRangeStart"
                    type="number"
                    min={1}
                    value={settings.sceneRangeStart ?? ""}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        sceneRangeStart: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sceneRangeEnd">Scene range end (optional)</Label>
                  <Input
                    id="sceneRangeEnd"
                    type="number"
                    min={1}
                    value={settings.sceneRangeEnd ?? ""}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        sceneRangeEnd: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                    placeholder="all"
                  />
                </div>
              </>
            ) : null}
            <div className="flex items-end space-y-2 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.exportCaptions}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      exportCaptions: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-input"
                />
                Export captions (.srt)
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={isValidating}
              onClick={mode === "project" ? handleValidateProject : handleValidateUpload}
            >
              {isValidating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Validate matching
            </Button>
            {isAssembling ? (
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
                onClick={handleStopAssembly}
              >
                <Square className="mr-2 h-4 w-4 fill-current" />
                Stop
              </Button>
            ) : null}
            <Button
              type="button"
              className="cursor-pointer snow-glow"
              disabled={isAssembling || !isReadyToAssemble}
              onClick={mode === "project" ? handleAssembleProject : handleAssembleUpload}
            >
              {isAssembling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rendering… {assembleTimer.elapsedLabel}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {isVideoWorkflow ? "Render video episode" : "Assemble episode"}
                </>
              )}
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          {validation ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="Scenes"
                  value={String(validation.sceneCount)}
                  icon={isVideoWorkflow ? Film : ImageIcon}
                />
                <StatCard
                  label="Matched"
                  value={`${validation.matchedCount}/${validation.sceneCount}`}
                  icon={CheckCircle2}
                  accent={validation.missingCount === 0 ? "success" : "warning"}
                />
                <StatCard
                  label="Duration"
                  value={formatDuration(validation.totalDuration)}
                  icon={Music2}
                />
                <StatCard
                  label={isVideoWorkflow ? "Media" : "Naming"}
                  value={isVideoWorkflow ? "Video clips" : validation.imageNaming}
                  icon={FolderOpen}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Source: {validation.sceneSource}</Badge>
                {validation.missingCount > 0 ? (
                  <Badge variant="warning">
                    {validation.missingCount} missing {isVideoWorkflow ? "clips" : "images"}
                  </Badge>
                ) : (
                  <Badge variant="success">All scenes matched</Badge>
                )}
                {validation.unusedImageCount > 0 ? (
                  <Badge variant="outline">
                    {validation.unusedImageCount} unused {isVideoWorkflow ? "clips" : "images"}
                  </Badge>
                ) : null}
              </div>

              {validation.missingCount > 0 ? (
                <SceneMatchTable
                  scenes={validation.missingScenes}
                  title="Missing scenes"
                  assetLabel={assetLabel}
                />
              ) : (
                <SceneMatchTable
                  scenes={validation.scenes}
                  title="Matched timeline"
                  assetLabel={assetLabel}
                />
              )}
            </>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-secondary/20 p-8 text-center">
              <Search className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Validate before you render</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {isVideoWorkflow
                  ? "Match scene clips to timeline timestamps, then FFmpeg trims each clip and muxes your voiceover."
                  : "Match batch images to scene timestamps, apply transitions, and mux narration."}
              </p>
            </div>
          )}

          {assembly ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-300">Episode rendered</p>
                  <p className="font-mono text-xs text-muted-foreground">{assembly.outputPath}</p>
                  <p className="text-xs text-muted-foreground">
                    {assembly.sceneCount} scenes · {formatDuration(assembly.totalDuration)}
                  </p>
                  {assembly.captionsPath ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      Captions: {assembly.captionsPath}
                    </p>
                  ) : null}
                </div>
                <Download className="ml-auto h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "success" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-secondary/40 p-4",
        accent === "success" && "border-emerald-500/20",
        accent === "warning" && "border-amber-500/20",
        !accent && "border-white/8",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}