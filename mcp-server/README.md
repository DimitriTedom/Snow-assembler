# Snow Assembler MCP Server

MCP server so **Cursor, Antigravity, Claude Desktop, Grok**, and any MCP-compatible agent can validate and assemble Zenn image episodes.

Uses **stdio** transport → talks to the FFmpeg engine at `http://localhost:8001`.

## Prerequisites

1. **Assembler engine running:**
   ```bash
   npm run engine:up
   ```
2. **Build the MCP server:**
   ```bash
   npm run mcp:install
   npm run mcp:build
   ```

## Tools

| Tool | Description |
|------|-------------|
| `snow_assembler_engine_health` | Check if FFmpeg engine is online |
| `snow_assembler_validate_project` | Match images to scene timestamps |
| `snow_assembler_assemble_images` | Render `assembled.mp4` from episode folder |

## Resource

- `snow://assembler/workflow/guide` — Agent workflow for Zenn pipelines

## Configure Cursor

`.cursor/mcp.json` is preconfigured in this repo. Enable MCP in Cursor settings, ensure `npm run engine:up` is running.

## Example agent flow

```
1. snow_assembler_engine_health()

2. snow_assembler_validate_project({
     project_dir: "C:/Users/Dimitri SnowDev/Documents/Zenn/episodes/why_you_cant_stop_scrolling",
     use_docker_paths: true
   })
   → matchedCount: 229 / sceneCount: 229

3. snow_assembler_assemble_images({
     project_dir: "C:/Users/Dimitri SnowDev/Documents/Zenn/episodes/why_you_cant_stop_scrolling",
     use_docker_paths: true
   })
   → outputPath: /data/zenn/episodes/why_you_cant_stop_scrolling/assembled.mp4
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `SNOW_ASSEMBLER_ENGINE_URL` | `http://localhost:8001` | FFmpeg engine base URL |
| `ASSEMBLER_ENGINE_URL` | (fallback) | Same as above |