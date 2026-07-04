export const SNOW_ASSEMBLER_WORKFLOW = `# Snow Assembler — Agent Workflow

Use Snow Assembler to turn batch-generated stills into a timestamp-synced MP4 for Zenn / SnowAgeBrain episodes.

## Prerequisites
1. FFmpeg engine running: \`npm run engine:up\` (Docker, port 8001)
2. MCP server configured in your agent (stdio)
3. Episode folder with JSON timeline, images/, and TTS audio

## Zenn episode folder layout

\`\`\`
episodes/why_you_cant_stop_scrolling/
├── why_you_cant_stop_scrolling.json
├── images/
│   ├── 0000_A stickman....png
│   ├── 0002_A stickman....png
│   └── ...
└── narration.m4a
\`\`\`

## Recommended pipeline (Zenn / SnowAgeBrain)

### Step 1 — Health check
Call \`snow_assembler_engine_health\`. If offline, tell the user to run \`npm run engine:up\`.

### Step 2 — Validate matching
Call \`snow_assembler_validate_project\` with:
- \`project_dir\`: Docker path when engine runs in Docker, e.g. \`/data/zenn/episodes/why_you_cant_stop_scrolling\`
- Or set \`use_docker_paths: true\` with a Windows host path under Documents/Zenn

Confirm \`matchedCount === sceneCount\` before rendering.

### Step 3 — Assemble episode
Call \`snow_assembler_assemble_images\` with the same project path.
Output defaults to \`assembled.mp4\` inside the episode folder.

## Full Snow factory (with Snow Transcriber)

1. Snow Transcriber → timestamp scenes from TTS
2. Batch-generate images (Zapi) named with timestamp prefixes
3. Snow Assembler → final MP4

## Tool reference

| Tool | When to use |
|------|-------------|
| \`snow_assembler_engine_health\` | Before validate/assemble |
| \`snow_assembler_validate_project\` | Check image ↔ scene matching |
| \`snow_assembler_assemble_images\` | Render final MP4 from episode folder |

## Environment variables
- \`SNOW_ASSEMBLER_ENGINE_URL\` or \`ASSEMBLER_ENGINE_URL\` — default \`http://localhost:8001\`

## Docker path note
When the engine runs in Docker, Zenn folders are mounted at \`/data/zenn/\`.
Use \`use_docker_paths: true\` to auto-convert Windows paths under Documents/Zenn.
`;