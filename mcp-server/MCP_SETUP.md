# Snow Assembler — MCP Setup

Connect any MCP-compatible AI client to validate and assemble episodes locally.

## Prerequisites

1. Clone Snow Assembler and install dependencies
2. `npm run engine:up` — FFmpeg engine on port **8001**
3. `npm run mcp:install && npm run mcp:build`

Set `PROJECT_DATA_DIR` in `.env` to the parent folder of your episode directories (mounted as `/data/projects` in Docker).

## Repo path

Use your actual clone path, e.g.:

```
D:/Projects/Snow-assembler
```

## Tools

| Tool | Description |
|------|-------------|
| `snow_assembler_engine_health` | Engine + FFmpeg status |
| `snow_assembler_validate_project` | Scene ↔ asset matching |
| `snow_assembler_assemble_images` | Render MP4 (transitions, quality, captions) |

**Resource:** `snow://assembler/workflow/guide` — agent workflow reference.

## Grok (`~/.grok/config.toml`)

```toml
[mcp_servers.snow-assembler]
command = "node"
args = ["D:/Projects/Snow-assembler/mcp-server/dist/index.js"]
env = { ASSEMBLER_ENGINE_URL = "http://localhost:8001", PROJECT_DATA_ROOT = "D:/Videos" }
enabled = true
```

Verify: `grok mcp doctor snow-assembler`

## Cursor / Claude Desktop (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "snow-assembler": {
      "command": "node",
      "args": ["D:/Projects/Snow-assembler/mcp-server/dist/index.js"],
      "env": {
        "ASSEMBLER_ENGINE_URL": "http://localhost:8001",
        "PROJECT_DATA_ROOT": "D:/Videos"
      }
    }
  }
}
```

## Antigravity (`~/.gemini/config/mcp_config.json`)

Merge the same `mcpServers` block as Cursor.

## VS Code

This repo includes `.vscode/mcp.json` — open the folder in VS Code and enable the server when prompted.

## Example agent prompt

```
Validate my episode at D:/Videos/my-episode with snow_assembler_validate_project
(use_docker_paths: true, image_naming: sequential, transition: crossfade),
then assemble with preset_id slideshow-ken-burns if all scenes match.
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tools not listed | `npm run mcp:build` — confirm `mcp-server/dist/index.js` exists |
| Engine offline | `npm run engine:up` then open http://localhost:8001/health |
| Path not found in Docker | Set `PROJECT_DATA_DIR` in `.env` and use `use_docker_paths: true` |
| Windows `&` in path | Use forward slashes in MCP config; engine handles the rest |