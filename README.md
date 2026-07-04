# Snow Assembler

Local image-to-video assembler for **Zenn / SnowAgeBrain** and other batch-image YouTube workflows.

Turn timestamped stills + Google TTS narration into a finished MP4 — no CapCut timeline editing.

**MVP focus:** image episodes (Zapi batch images + Zenn timeline JSON). Video-clip assembly (CRAVE & CONQUER / Veo3) is planned next.

## Quick start

> **Windows note:** If the project path contains `&`, use `scripts/run-next.mjs` (already wired in `package.json`).

### 1) Install frontend deps

```bash
npm install --ignore-scripts
node scripts/run-prisma.mjs generate
```

> Paths with `&` (e.g. `CRAVE & CONQUER`) break some npm postinstall scripts on Windows. Use `--ignore-scripts`, then run Prisma generate manually as above.

### 2) Configure env

```bash
cp .env.example .env
```

```env
ASSEMBLER_ENGINE_URL=http://localhost:8001
ZENN_DATA_DIR=C:/Users/Dimitri SnowDev/Documents/Zenn
```

### 3) Start the FFmpeg engine (Docker)

```bash
npm run engine:up
```

### 4) Run the app

```bash
npm run dev
```

Open http://localhost:3000/assembler

Or both in one command:

```bash
npm run dev:all
```

## Zenn episode folder layout

```
episodes/why_you_cant_stop_scrolling/
├── why_you_cant_stop_scrolling.json   # Zenn timeline (start/end per scene)
├── images/                            # Zapi batch exports
│   ├── 0000_A stickman....png
│   ├── 0002_A stickman....png
│   └── ...
└── Why You Can't Stop Scrolling.m4a   # Google TTS narration
```

Snow-assembler:

1. Parses the Zenn `timeline` array (or Snow-transcriber `scenes` JSON)
2. Matches images by timestamp prefix (`0000_`, `0002_`, …)
3. Renders each still for its exact duration
4. Concatenates clips and muxes narration → `assembled.mp4`

## Docker path mapping

When the engine runs in Docker, use the mounted path inside the container:

```
/data/zenn/episodes/why_you_cant_stop_scrolling
```

The workspace UI includes a one-click switch from the Windows host path to the Docker path.

## Scene JSON formats

| Format | Source | Key fields |
|--------|--------|------------|
| **Zenn timeline** | `why_you_cant_stop_scrolling.json` | `timeline[].start_time`, `end_time` |
| **Snow-transcriber** | Export from Snow-transcriber | `scenes[].start`, `end`, `duration` |

## Image naming modes

| Mode | When to use |
|------|-------------|
| **auto** | Detects timestamp vs sequential naming |
| **timestamp** | Zapi exports: `0000_`, `0002_` prefixes |
| **sequential** | `SCENE_01`, `scene_1`, ordered folder |

## Architecture

```
Browser → Next.js /api/assemble → Python engine :8001 → FFmpeg
```

Docker runs the Python engine only. Next.js runs locally with `npm run dev`.

## Engine API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Engine + FFmpeg status |
| `POST /validate/project` | Check image matching for a folder |
| `POST /assemble/images/project` | Render episode from folder paths |
| `POST /validate/upload` | Validate uploaded JSON + images |
| `POST /assemble/images/upload` | Render from uploaded assets |

## Useful commands

```bash
npm run engine:up      # build + start FFmpeg engine
npm run engine:down    # stop engine
npm run engine:logs    # tail engine logs
npm run dev            # Next.js dev server
npm run dev:all        # engine + Next.js together
```

## MCP server (for AI agents)

Snow Assembler includes an MCP server so **Cursor, Antigravity, Claude Desktop, Grok**, and other MCP clients can validate and assemble episodes programmatically.

```bash
npm run mcp:install
npm run mcp:build
```

**Cursor:** `.cursor/mcp.json` is preconfigured. Enable MCP in settings, ensure `npm run engine:up` is running, then ask your agent to use `snow_assembler_validate_project` or `snow_assembler_assemble_images`.

**Tools:** `snow_assembler_engine_health`, `snow_assembler_validate_project`, `snow_assembler_assemble_images`

See [mcp-server/README.md](mcp-server/README.md) for setup and example flows.

## Roadmap

- [x] Image assembly MVP (Zenn)
- [x] MCP server for agents
- [ ] Video clip trimming (CRAVE & CONQUER / Veo3)
- [ ] Music bed + ducking templates
- [ ] n8n workflow hooks