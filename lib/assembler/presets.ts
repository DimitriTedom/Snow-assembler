import type { AssemblyPreset, ProjectAssemblySettings } from "@/lib/assembler/types";

export const DEFAULT_PRESETS: AssemblyPreset[] = [
  {
    id: "slideshow-static",
    label: "Slideshow — static cuts",
    description: "Still images with hard cuts.",
    mediaType: "images",
    imageNaming: "sequential",
    motion: "none",
    transition: "none",
    transitionDuration: 0.4,
    quality: "standard",
    fps: 30,
  },
  {
    id: "slideshow-ken-burns",
    label: "Slideshow — Ken Burns + crossfade",
    description: "Subtle zoom with smooth crossfades.",
    mediaType: "images",
    imageNaming: "sequential",
    motion: "ken_burns",
    transition: "crossfade",
    transitionDuration: 0.5,
    quality: "standard",
    fps: 30,
  },
  {
    id: "slideshow-cinematic",
    label: "Slideshow — cinematic fades",
    description: "Fade-to-black between scenes.",
    mediaType: "images",
    imageNaming: "auto",
    motion: "ken_burns",
    transition: "fade_black",
    transitionDuration: 0.6,
    quality: "high",
    fps: 30,
  },
  {
    id: "video-clips-standard",
    label: "Video clips — standard",
    description: "Trim clips to scene timestamps and mux narration.",
    mediaType: "videos",
    imageNaming: "sequential",
    motion: "none",
    transition: "none",
    transitionDuration: 0.4,
    quality: "standard",
    fps: 30,
  },
  {
    id: "video-clips-smooth",
    label: "Video clips — crossfade",
    description: "Crossfade between generated clips.",
    mediaType: "videos",
    imageNaming: "sequential",
    motion: "none",
    transition: "crossfade",
    transitionDuration: 0.35,
    quality: "standard",
    fps: 30,
  },
  {
    id: "draft-preview",
    label: "Draft preview (fast)",
    description: "Fast low-quality timing check.",
    mediaType: "images",
    imageNaming: "sequential",
    motion: "none",
    transition: "none",
    transitionDuration: 0.3,
    quality: "draft",
    fps: 24,
  },
];

export function applyPresetToSettings(
  settings: ProjectAssemblySettings,
  preset: AssemblyPreset,
): ProjectAssemblySettings {
  return {
    ...settings,
    mediaType: preset.mediaType,
    imageNaming: preset.imageNaming,
    motion: preset.motion,
    transition: preset.transition,
    transitionDuration: preset.transitionDuration,
    quality: preset.quality,
    fps: preset.fps,
    presetId: preset.id,
  };
}

export function parseWorkflowParam(value: string | null): "slideshow" | "video-clips" {
  if (value === "video-clips" || value === "videos" || value === "crave") {
    return "video-clips";
  }
  if (value === "slideshow" || value === "images" || value === "zenn") {
    return "slideshow";
  }
  return "slideshow";
}