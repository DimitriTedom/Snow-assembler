# Snow Assembler MCP Server

MCP server so **Cursor, Antigravity, Claude Desktop, Grok**, and any MCP-compatible agent can validate and assemble timestamp-synced episodes.

## Setup

```bash
npm run mcp:install
npm run mcp:build
npm run engine:up
```

Configure your MCP client to run `mcp-server/dist/index.js` with `ASSEMBLER_ENGINE_URL=http://localhost:8001`.

See [MCP_SETUP.md](./MCP_SETUP.md) for per-client config blocks.

## Tools

| Tool | Purpose |
|------|---------|
| `snow_assembler_engine_health` | Check FFmpeg engine is online |
| `snow_assembler_validate_project` | Match images/clips to timeline JSON |
| `snow_assembler_assemble_images` | Render MP4 with transitions |

## Resource

- `snow://assembler/workflow/guide` — Agent workflow for episode assembly

## Example

```
Validate my episode at D:/Videos/my-episode with snow_assembler_validate_project
(use_docker_paths: true, image_naming: sequential, transition: crossfade),
then assemble if all scenes match.
```

Docker path when `PROJECT_DATA_DIR=D:/Videos`:

```
D:/Videos/my-episode  →  /data/projects/my-episode
```