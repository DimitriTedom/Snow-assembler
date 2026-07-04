"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FolderOpen,
  ImageIcon,
  Loader2,
  Music2,
  Play,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { EngineStatus } from "@/components/assembler/engine-status";
import { SceneMatchTable } from "@/components/assembler/scene-match-table";
import { WorkflowSteps } from "@/components/assembler/workflow-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDockerZennPath } from "@/lib/assembler/api";
import { getPublicEngineUrl } from "@/lib/assembler/engine-url";
import { cn } from "@/lib/utils";
import type {
  AssemblyResult,
  ImageNaming,
  MotionMode,
  ProjectAssemblySettings,
  ValidationResult,
} from "@/lib/assembler/types";

const defaultProjectDir =
  "C:/Users/Dimitri SnowDev/Documents/Zenn/episodes/why_you_cant_stop_scrolling";

const defaultSettings: ProjectAssemblySettings = {
  projectDir: defaultProjectDir,
  outputFilename: "assembled.mp4",
  imageNaming: "sequential",
  width: 1920,
  height: 1080,
  fps: 30,
  motion: "none",
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(1);
  return `${minutes}m ${remainder}s`;
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
  const [mode, setMode] = useState<"project" | "upload">("project");
  const [settings, setSettings] = useState<ProjectAssemblySettings>(defaultSettings);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [assembly, setAssembly] = useState<AssemblyResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);

  const [scenesJson, setScenesJson] = useState<File | null>(null);
  const [narration, setNarration] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);

  const isReadyToAssemble = useMemo(() => {
    if (!validation) return false;
    return validation.missingCount === 0 && validation.matchedCount > 0;
  }, [validation]);

  async function handleValidateProject() {
    setIsValidating(true);
    setValidation(null);
    setAssembly(null);

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
      toast.success(
        `${payload.matchedCount}/${payload.sceneCount} scenes matched (${payload.imageNaming} naming).`,
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

    try {
      const formData = new FormData();
      formData.append("scenes_json", scenesJson);
      formData.append("image_naming", settings.imageNaming);
      images.forEach((file) => formData.append("images", file, file.name));

      const response = await fetch(`${getPublicEngineUrl()}/validate/upload`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        const detail =
          typeof payload?.detail === "string"
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

  async function handleAssembleProject() {
    if (!isReadyToAssemble) {
      toast.error("Validate scene matching first — all scenes need images.");
      return;
    }

    setIsAssembling(true);
    setAssembly(null);

    try {
      const response = await fetch("/api/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Assembly failed.");
      }

      setAssembly(payload as AssemblyResult);
      toast.success(`Rendered ${payload.sceneCount} scenes to ${payload.outputPath}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assembly failed.");
    } finally {
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

    setIsAssembling(true);

    try {
      const formData = new FormData();
      formData.append("scenes_json", scenesJson);
      formData.append("narration", narration);
      formData.append("image_naming", settings.imageNaming);
      formData.append("width", String(settings.width));
      formData.append("height", String(settings.height));
      formData.append("fps", String(settings.fps));
      formData.append("motion", settings.motion);
      images.forEach((file) => formData.append("images", file, file.name));

      const response = await fetch(`${getPublicEngineUrl()}/assemble/images/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Assembly failed.";
        try {
          const payload = await response.json();
          message =
            typeof payload?.detail === "string"
              ? payload.detail
              : Array.isArray(payload?.detail)
                ? payload.detail.map((item: { msg?: string }) => item.msg).join(", ")
                : message;
        } catch {
          message = `Assembly failed (HTTP ${response.status}).`;
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      downloadBlob("assembled.mp4", blob);
      toast.success("Episode assembled — MP4 downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assembly failed.");
    } finally {
      setIsAssembling(false);
    }
  }

  return (
    <div className="space-y-8">
      <EngineStatus />
      <WorkflowSteps />

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
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setMode("upload")}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload assets
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="space-y-5 rounded-2xl border border-white/8 bg-card/60 p-5 backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {mode === "project" ? "Local episode project" : "Upload assembly"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "project"
                ? "Point at a Zenn episode folder with timeline JSON, images/, and TTS audio."
                : "Drop scenes JSON, all batch images, and narration. Uploads go directly to the FFmpeg engine (not through Next.js)."}
            </p>
            {mode === "upload" ? (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                For full episodes (100+ images), prefer <strong>Episode folder</strong> mode — it reads
                files from disk and is much faster. Upload mode is best for quick tests.
              </p>
            ) : null}
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
                  placeholder={defaultProjectDir}
                />
                <p className="text-xs text-muted-foreground">
                  Use your normal Windows folder path above — it auto-maps to{" "}
                  <span className="font-mono text-accent">{toDockerZennPath(settings.projectDir)}</span>{" "}
                  inside Docker. Keep files in Documents\Zenn on Windows; do not copy them anywhere
                  else.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                  <p className="text-xs text-muted-foreground">
                    Leave blank. Do not type <code className="text-accent">images/</code> — the engine
                    auto-discovers the folder inside your project directory.
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Leave blank unless you have multiple audio files in the folder.
                  </p>
                </div>
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="space-y-2">
              <Label>Motion</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={settings.motion}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    motion: event.target.value as MotionMode,
                  }))
                }
              >
                <option value="none">Static (Zenn MS Paint)</option>
                <option value="ken_burns">Ken Burns zoom</option>
              </select>
            </div>
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
              />
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
            <Button
              type="button"
              className="cursor-pointer snow-glow"
              disabled={isAssembling || !isReadyToAssemble}
              onClick={mode === "project" ? handleAssembleProject : handleAssembleUpload}
            >
              {isAssembling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Assemble episode
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          {validation ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Scenes" value={String(validation.sceneCount)} icon={ImageIcon} />
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
                <StatCard label="Naming" value={validation.imageNaming} icon={FolderOpen} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Source: {validation.sceneSource}</Badge>
                {validation.missingCount > 0 ? (
                  <Badge variant="warning">{validation.missingCount} missing images</Badge>
                ) : (
                  <Badge variant="success">All scenes matched</Badge>
                )}
                {validation.unusedImageCount > 0 ? (
                  <Badge variant="outline">{validation.unusedImageCount} unused images</Badge>
                ) : null}
              </div>

              {validation.missingCount > 0 ? (
                <SceneMatchTable scenes={validation.missingScenes} title="Missing scenes" />
              ) : (
                <SceneMatchTable scenes={validation.scenes} title="Matched timeline" />
              )}
            </>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-secondary/20 p-8 text-center">
              <Search className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Validate before you render</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Snow-assembler matches images to scene timestamps, then FFmpeg trims each still and
                muxes your Google TTS narration.
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