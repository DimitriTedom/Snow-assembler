# Snow Assembler

Open-source FFmpeg assembler for **timestamp-synced video episodes** — batch stills or per-scene video clips, matched to any timeline JSON.

**Workflows:** image slideshow (still images + narration) and video clips (trim + concat + mux). Supports crossfades, Ken Burns, quality presets, async jobs with progress, and optional SRT captions.

## Quick start

```bash
npm install --ignore-scripts   # use if your path contains special chars like &
npm run db:generate            # only if you skipped postinstall
cp .env.example .env
npm run engine:up              # FFmpeg engine on :8001
npm run dev                    # UI on :3000 (or :3001 if transcriber uses :3000)
```

Open [http://localhost:3000/assembler](http://localhost:3000/assembler) (or `:3001`).

## Environment

```env
ASSEMBLER_ENGINE_URL=http://localhost:8001
PROJECT_DATA_DIR=D:/Videos                    # mounted as /data/projects in Docker
NEXT_PUBLIC_PROJECT_DATA_ROOT=D:/Videos       # UI path mapping hint
ASSEMBLER_OUTPUT_HOST_DIR=./output            # writable fallback when project dir is read-only
```

## Episode folder layout

### Image slideshow

```
my-episode/
├── timeline.json          # timeline[] or scenes[] with start/end per scene
├── images/
│   ├── SCENE_01.png
│   └── ...
└── narration.m4a
```

### Video clips

```
my-episode/
├── scenes.json            # Snow-transcriber export or custom timeline
├── clips/                 # also: videos/, scenes/, episode/
│   ├── SCENE_01.mp4
│   └── ...
└── narration.m4a
```

## What the engine does

1. Parses timeline JSON (`timeline[]` or Snow-transcriber `scenes[]`)
2. Matches assets by sequential (`SCENE_01`) or timestamp prefix (`0000_`)
3. Renders each scene clip (still → video, or trim existing clip)
4. Concatenates with optional transitions (crossfade, fade-to-black, wipe, slide)
5. Muxes narration audio; optionally exports `.srt` captions

Docker path mapping:

```
D:/Videos/my-channel/episode-01  →  /data/projects/my-channel/episode-01
```

## Transitions & presets

| Preset | Motion | Transition | Quality |
|--------|--------|------------|---------|
| slideshow-static | none | hard cut | standard |
| slideshow-ken-burns | Ken Burns | crossfade | standard |
| slideshow-cinematic | Ken Burns | fade to black | high |
| video-clips-standard | — | hard cut | standard |
| video-clips-smooth | — | crossfade | standard |
| draft-preview | none | hard cut | draft (fast) |

## Scene JSON formats

| Source | Example file | Key fields |
|--------|--------------|------------|
| **Timeline** | `timeline.json` | `timeline[].start_time`, `end_time` |
| **Snow-transcriber** | `snow-transcriber-agent.json` | `scenes[].start`, `end`, `id` |

## MCP (AI agents)

```bash
npm run mcp:install && npm run mcp:build
```

Tools: `snow_assembler_engine_health`, `snow_assembler_validate_project`, `snow_assembler_assemble_images`

See [mcp-server/MCP_SETUP.md](mcp-server/MCP_SETUP.md).

## Roadmap

- [x] Image assembly with transitions
- [x] Video clip trimming with transitions
- [x] Async jobs + progress polling
- [x] Quality presets (draft / standard / high)
- [x] SRT caption export
- [x] Scene range (partial renders)
- [ ] Upload-mode job polling
- [ ] Preset import/export

## License

MIT — clone it, fork it, use it for any channel.