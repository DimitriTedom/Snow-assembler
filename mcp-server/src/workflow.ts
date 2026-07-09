export const SNOW_ASSEMBLER_WORKFLOW = `# Snow Assembler — Agent Workflow

Use Snow Assembler to turn batch-generated stills or video clips into a timestamp-synced MP4.

## Prerequisites
1. FFmpeg engine running: \`npm run engine:up\` (Docker, port 8001)
2. MCP server configured in your agent (stdio)
3. Episode folder with timeline JSON, media assets, and narration audio

## Episode folder layout (image slideshow)

\`\`\`
my-episode/
├── timeline.json              # scenes or timeline array with start/end per scene
├── images/
│   ├── SCENE_01.png
│   ├── SCENE_02.png
│   └── ...
└── narration.m4a
\`\`\`

## Episode folder layout (video clips)

\`\`\`
my-episode/
├── scenes.json                # Snow-transcriber export or custom timeline
├── clips/
│   ├── SCENE_01.mp4
│   ├── SCENE_02.mp4
│   └── ...
└── narration.m4a
\`\`\`

## Recommended pipeline

### Step 1 — Health check
Call \`snow_assembler_engine_health\`. If offline, tell the user to run \`npm run engine:up\`.

### Step 2 — Validate matching
Call \`snow_assembler_validate_project\` with:
- \`project_dir\`: Docker path when engine runs in Docker, e.g. \`/data/projects/my-channel/my-episode\`
- Or set \`use_docker_paths: true\` with a Windows host path under your PROJECT_DATA_DIR mount

Confirm \`matchedCount === sceneCount\` before rendering.

### Step 3 — Assemble episode
Call \`snow_assembler_assemble_images\` (or \`snow_assembler_assemble_project\` for video clips) with the same project path.
Output defaults to \`assembled.mp4\` inside the episode folder.

## Transitions & presets
- \`transition\`: \`none\`, \`crossfade\`, \`fade_black\`, \`wipe_left\`, \`slide_left\`
- \`preset_id\`: \`slideshow-static\`, \`slideshow-ken-burns\`, \`slideshow-cinematic\`, \`video-clips-standard\`, \`video-clips-smooth\`, \`draft-preview\`
- \`quality\`: \`draft\`, \`standard\`, \`high\`

## Tool reference

| Tool | When to use |
|------|-------------|
| \`snow_assembler_engine_health\` | Before validate/assemble |
| \`snow_assembler_validate_project\` | Check asset ↔ scene matching |
| \`snow_assembler_assemble_images\` | Render image slideshow MP4 |
| \`snow_assembler_assemble_project\` | Render video clip MP4 (async job) |

## Environment variables
- \`SNOW_ASSEMBLER_ENGINE_URL\` or \`ASSEMBLER_ENGINE_URL\` — default \`http://localhost:8001\`
- \`PROJECT_DATA_ROOT\` — host root mapped to \`/data/projects\` in Docker

## Docker path note
When the engine runs in Docker, episode folders under PROJECT_DATA_DIR are mounted at \`/data/projects/\`.
Use \`use_docker_paths: true\` to auto-convert Windows host paths.
`;