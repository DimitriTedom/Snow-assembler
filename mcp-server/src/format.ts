import type { SceneMatchSummary, ValidationResult } from "./types.js";

export function summarizeValidation(result: ValidationResult, projectDir: string): string {
  const lines = [
    `## Scene validation`,
    `- Project: \`${projectDir}\``,
    `- Source: **${result.sceneSource}**`,
    `- Scenes: **${result.sceneCount}**`,
    `- Duration: **${formatDuration(result.totalDuration)}**`,
    `- Matched: **${result.matchedCount}/${result.sceneCount}**`,
    `- Naming mode: **${result.imageNaming}**`,
  ];

  if (result.missingCount > 0) {
    lines.push(`- Missing images: **${result.missingCount}**`);
    const preview = result.missingScenes
      .slice(0, 8)
      .map((scene) => `  - #${pad(scene.id)} key \`${scene.match_key}\` (${scene.duration}s)`)
      .join("\n");
    lines.push(`\n### Missing preview\n${preview}`);
    if (result.missingScenes.length > 8) {
      lines.push(`...and ${result.missingScenes.length - 8} more`);
    }
  }

  if (result.unusedImageCount > 0) {
    lines.push(`- Unused images: **${result.unusedImageCount}**`);
  }

  return lines.join("\n");
}

export function summarizeAssembly(
  result: { sceneCount: number; totalDuration: number; outputPath: string },
  projectDir: string,
): string {
  return [
    `## Episode assembled`,
    `- Project: \`${projectDir}\``,
    `- Scenes rendered: **${result.sceneCount}**`,
    `- Timeline duration: **${formatDuration(result.totalDuration)}**`,
    `- Output: \`${result.outputPath}\``,
  ].join("\n");
}

export function previewMatchedScenes(scenes: SceneMatchSummary[], limit = 5): string {
  const sample = scenes.filter((scene) => scene.image).slice(0, limit);
  if (sample.length === 0) {
    return "No matched scenes yet.";
  }
  return sample
    .map(
      (scene) =>
        `- #${pad(scene.id)} [\`${scene.match_key}\`] ${scene.duration}s → \`${scene.image}\``,
    )
    .join("\n");
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(1);
  return `${minutes}m ${remainder}s`;
}

function pad(id: number): string {
  return String(id).padStart(2, "0");
}