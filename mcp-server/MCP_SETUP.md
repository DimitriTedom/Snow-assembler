# Snow Assembler MCP Setup

Connect **Grok, Antigravity, VS Code, Cursor, Claude Desktop, Gemini CLI**, and any stdio MCP client to Snow Assembler.

## Prerequisites

1. **FFmpeg engine running** (port `8001`):

   ```bash
   cd Snow-assembler
   npm run engine:up
   ```

2. **MCP server built**:

   ```bash
   npm run mcp:install
   npm run mcp:build
   ```

3. Replace `ABSOLUTE_PATH_TO_REPO` in the templates below with your install path, e.g.:

   ```
   D:/SnowDev/Videos/Youtube/CRAVE & CONQUER/Snow-assembler
   ```

   Use forward slashes on Windows — paths with `&` break npm `.bin` shims; the MCP server uses `node` directly and is unaffected.

## Tools exposed

| Tool | Description |
|------|-------------|
| `snow_assembler_engine_health` | Check FFmpeg engine status |
| `snow_assembler_validate_project` | Match images to scene timestamps |
| `snow_assembler_assemble_images` | Render `assembled.mp4` from episode folder |

**Resource:** `snow://assembler/workflow/guide` — agent workflow for Zenn pipelines.

---

## Grok

**Config file:** `~/.grok/config.toml` (user) or `.grok/config.toml` (project)

Copy the snippet from `config/grok-config.toml`, or run:

```bash
grok mcp add snow-assembler -e ASSEMBLER_ENGINE_URL=http://localhost:8001 -- node ABSOLUTE_PATH_TO_REPO/mcp-server/dist/index.js
```

Verify:

```bash
grok mcp list
grok mcp doctor snow-assembler
```

---

## Antigravity IDE & Gemini CLI

Antigravity shares MCP config across IDE and CLI via:

```
~/.gemini/config/mcp_config.json
```

Merge the entry from `config/antigravity.mcp.json`:

```json
{
  "mcpServers": {
    "snow-assembler": {
      "command": "node",
      "args": ["D:/SnowDev/Videos/Youtube/CRAVE & CONQUER/Snow-assembler/mcp-server/dist/index.js"],
      "env": {
        "ASSEMBLER_ENGINE_URL": "http://localhost:8001"
      }
    }
  }
}
```

Restart Antigravity IDE or Antigravity CLI after editing. Ask the agent: *"What MCP servers do we have?"* to confirm.

**Project-scoped:** some Antigravity versions also read workspace `.gemini/config/mcp_config.json` — copy the same `mcpServers` block there if you want per-repo config.

---

## VS Code

**Workspace config:** `.vscode/mcp.json` is preconfigured in this repo (uses `${workspaceFolder}`).

**User config:** run **MCP: Open User Configuration** and paste from `config/vscode.mcp.json`.

```json
{
  "servers": {
    "snow-assembler": {
      "type": "stdio",
      "command": "node",
      "args": ["D:/SnowDev/Videos/Youtube/CRAVE & CONQUER/Snow-assembler/mcp-server/dist/index.js"],
      "env": {
        "ASSEMBLER_ENGINE_URL": "http://localhost:8001"
      }
    }
  }
}
```

Trust and start the server when prompted. Use **MCP: List Servers** → **Show Output** if tools do not appear.

---

## Cursor

**Project config:** `.cursor/mcp.json` is preconfigured (relative path to `mcp-server/dist/index.js`).

Enable MCP in Cursor settings. Ensure `npm run engine:up` is running.

---

## Claude Desktop

Merge into `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

See `config/claude-desktop.mcp.json`.

Restart Claude Desktop after saving.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SNOW_ASSEMBLER_ENGINE_URL` | `http://localhost:8001` | FFmpeg engine base URL |
| `ASSEMBLER_ENGINE_URL` | (fallback) | Same as above |

---

## Example agent flow

```
1. snow_assembler_engine_health()

2. snow_assembler_validate_project({
     project_dir: "C:/Users/Dimitri SnowDev/Documents/Zenn/episodes/why_you_cant_stop_scrolling",
     use_docker_paths: true,
     image_naming: "sequential"
   })

3. snow_assembler_assemble_images({
     project_dir: "C:/Users/Dimitri SnowDev/Documents/Zenn/episodes/why_you_cant_stop_scrolling",
     use_docker_paths: true,
     image_naming: "sequential"
   })
```

`use_docker_paths: true` converts Windows `Documents/Zenn/...` paths to Docker mount `/data/zenn/...` automatically.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tools not listed | Run `npm run mcp:build`; confirm `mcp-server/dist/index.js` exists |
| Engine offline | `npm run engine:up` then `curl http://localhost:8001/health` |
| Path not found in Docker | Use `use_docker_paths: true` and keep episodes under `Documents/Zenn` |
| Windows `&` in path breaks npm scripts | MCP uses `node` directly — OK. For Next.js use `node scripts/run-next.mjs` |
| VS Code server won't start | Check MCP output log; verify `node` is on PATH |