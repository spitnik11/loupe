# Loupe

A local marketing-video editor whose recording interface lives in the browser toolbar.
Record a product demo once → auto-zoomed camera work, backgrounds, window frames →
export to YouTube (16:9), Reels/TikTok (9:16), Instagram (4:5), square (1:1) from one take.

Not a screen recorder with an editor attached — a **non-destructive editor** whose recorder
happens to be a toolbar click. The recording is a *project* (source video + input events +
edit instructions), never a baked file.

## Status

Phase 0 in progress. The framework-agnostic core (project model + auto-zoom engine) is built
and tested; the Tauri shell lands once the MSVC build tools finish installing.

## Stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri 2 + React/TypeScript |
| Native core | Rust |
| Core engine | TypeScript (framework-agnostic, `src/core/`) |
| Recorder MVP | Global hotkey + Chrome Desktop Capture |
| Recorder v2 | MV3 extension (toolbar UX + DOM-aware zoom) |
| Render | FFmpeg sidecar, **NVENC** (keeps the render layer LGPL — no libx264/GPL) |

## Develop

```bash
npm test        # run the core engine checks (node --test)
```

Core logic (`src/core/`) is pure TypeScript and runs under Node with zero build step
(Node 24 type-stripping). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the phase plan
and the decisions behind the stack.
