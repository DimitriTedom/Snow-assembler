#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolve } from "node:path";
import { z } from "zod";

import {
  assembleImagesProject,
  checkEngineHealth,
  getEngineUrl,
  toDockerProjectPath,
  validateProject,
} from "./client.js";
import { previewMatchedScenes, summarizeAssembly, summarizeValidation } from "./format.js";
import { SNOW_ASSEMBLER_WORKFLOW } from "./workflow.js";

function textResult(text: string, structured?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text }],
    ...(structured ? { structuredContent: structured } : {}),
  };
}

function resolveProjectDir(projectDir: string, useDockerPaths: boolean): string {
  const absolute = resolve(projectDir);
  return useDockerPaths ? toDockerProjectPath(absolute) : absolute.replace(/\\/g, "/");
}

const server = new McpServer({
  name: "snow-assembler-mcp-server",
  version: "0.2.0",
});

server.registerResource(
  "workflow-guide",
  "snow://assembler/workflow/guide",
  {
    title: "Snow Assembler Agent Workflow",
    description: "Step-by-step guide for AI agents assembling timestamp-synced episodes",
    mimeType: "text/markdown",
  },
  async () => ({
    contents: [
      {
        uri: "snow://assembler/workflow/guide",
        mimeType: "text/markdown",
        text: SNOW_ASSEMBLER_WORKFLOW,
      },
    ],
  }),
);

server.registerTool(
  "snow_assembler_engine_health",
  {
    title: "Check Assembler Engine Health",
    description:
      "Check if the local Snow Assembler FFmpeg engine is running. Call this before validate or assemble.",
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  async () => {
    const health = await checkEngineHealth();
    const markdown =
      health.status === "online"
        ? `Engine **online** at ${health.engineUrl} (${health.service ?? "snow-assembler-engine"}, ffmpeg: ${health.ffmpeg ?? "unknown"})`
        : `Engine **offline** at ${health.engineUrl}. Run \`npm run engine:up\` in Snow Assembler. Error: ${health.error ?? "unknown"}`;

    return textResult(markdown, health);
  },
);

const projectSchema = z
  .object({
    project_dir: z
      .string()
      .min(1)
      .describe(
        "Absolute path to episode folder. Use /data/projects/... when engine runs in Docker.",
      ),
    use_docker_paths: z
      .boolean()
      .default(true)
      .describe(
        "Convert Windows host paths under PROJECT_DATA_DIR to Docker mount /data/projects/... (default true)",
      ),
    scenes_json_path: z.string().optional().describe("Optional override path to scenes JSON"),
    images_dir: z.string().optional().describe("Optional override path to images directory"),
    videos_dir: z.string().optional().describe("Optional override path to video clips directory"),
    audio_path: z.string().optional().describe("Optional override path to narration audio"),
    output_filename: z.string().default("assembled.mp4").describe("Output MP4 filename"),
    media_type: z.enum(["images", "videos"]).default("images").describe("Image slideshow or video clips"),
    image_naming: z
      .enum(["auto", "timestamp", "sequential"])
      .default("auto")
      .describe("How to match images to scenes"),
    width: z.number().int().min(640).max(3840).default(1920),
    height: z.number().int().min(360).max(2160).default(1080),
    fps: z.number().int().min(24).max(60).default(30),
    motion: z.enum(["none", "ken_burns"]).default("none").describe("Static or subtle Ken Burns zoom"),
    transition: z
      .enum(["none", "crossfade", "fade_black", "wipe_left", "slide_left"])
      .default("none")
      .describe("Scene transition style"),
    transition_duration: z.number().min(0.1).max(2).default(0.4).describe("Transition length in seconds"),
    quality: z.enum(["draft", "standard", "high"]).default("standard"),
    export_captions: z.boolean().default(false).describe("Write .srt captions alongside MP4"),
    scene_range_start: z.number().int().min(1).optional(),
    scene_range_end: z.number().int().min(1).optional(),
    preset_id: z
      .string()
      .optional()
      .describe("slideshow-static, slideshow-ken-burns, video-clips-smooth, etc."),
  })
  .strict();

server.registerTool(
  "snow_assembler_validate_project",
  {
    title: "Validate Episode Asset Matching",
    description:
      "Validate that batch images or video clips match scene timestamps in a timeline or transcriber JSON.",
    inputSchema: projectSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  async (input) => {
    const projectDir = resolveProjectDir(input.project_dir, input.use_docker_paths);
    const result = await validateProject({
      project_dir: projectDir,
      scenes_json_path: input.scenes_json_path,
      images_dir: input.images_dir,
      videos_dir: input.videos_dir,
      audio_path: input.audio_path,
      output_filename: input.output_filename,
      media_type: input.media_type,
      image_naming: input.image_naming,
      width: input.width,
      height: input.height,
      fps: input.fps,
      motion: input.motion,
      transition: input.transition,
      transition_duration: input.transition_duration,
      quality: input.quality,
      export_captions: input.export_captions,
      scene_range_start: input.scene_range_start,
      scene_range_end: input.scene_range_end,
      preset_id: input.preset_id,
    });

    const summary = summarizeValidation(result, projectDir);
    const preview = previewMatchedScenes(result.scenes);

    return textResult(`${summary}\n\n### Matched preview\n${preview}`, {
      projectDir,
      ...result,
    });
  },
);

server.registerTool(
  "snow_assembler_assemble_images",
  {
    title: "Assemble Image Episode to MP4",
    description:
      "Render a full slideshow MP4 from timestamped stills + narration audio. Requires all scenes matched.",
    inputSchema: projectSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  async (input) => {
    const projectDir = resolveProjectDir(input.project_dir, input.use_docker_paths);

    const validation = await validateProject({
      project_dir: projectDir,
      scenes_json_path: input.scenes_json_path,
      images_dir: input.images_dir,
      audio_path: input.audio_path,
      media_type: "images",
      image_naming: input.image_naming,
    });

    if (validation.missingCount > 0) {
      throw new Error(
        `Cannot assemble: ${validation.missingCount}/${validation.sceneCount} scenes are missing images. Run snow_assembler_validate_project first.`,
      );
    }

    const result = await assembleImagesProject({
      project_dir: projectDir,
      scenes_json_path: input.scenes_json_path,
      images_dir: input.images_dir,
      audio_path: input.audio_path,
      output_filename: input.output_filename,
      media_type: "images",
      image_naming: input.image_naming,
      width: input.width,
      height: input.height,
      fps: input.fps,
      motion: input.motion,
      transition: input.transition,
      transition_duration: input.transition_duration,
      quality: input.quality,
      export_captions: input.export_captions,
      scene_range_start: input.scene_range_start,
      scene_range_end: input.scene_range_end,
      preset_id: input.preset_id,
    });

    const summary = summarizeAssembly(result, projectDir);
    return textResult(summary, { projectDir, ...result });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`snow-assembler-mcp-server running (engine: ${getEngineUrl()})`);
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});