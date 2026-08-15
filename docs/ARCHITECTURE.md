# Loupe — architecture & phase plan

## The one idea

Record a **project**, not a video: `source.webm` + `events.jsonl` + `project.json`
(edit instructions). The source is never modified. Everything — zooms, backgrounds,
frames, trims, aspect ratios — is data applied at render time. This is what lets one
recording export to four platform cuts without re-editing.

```
project/
├── project.json     # canvas, background, frame, zooms[], cuts[], per-aspect layouts
├── source.webm      # the untouched recording
├── events.jsonl     # one input event per line (move/click/scroll/nav + element bounds)
├── audio/
└── thumbnails/
```

## Decisions (and where they diverge from the source research)

- **Tauri 2 over Electron.** Web UI, Rust owns native, no second Chromium runtime.
- **App-first, extension-second.** The editor is the product and carries none of the
  install risk. The extension (Native Messaging host + localhost WS + registry key) is
  the hardest trust/AV problem in the stack, and its only *unique* payoff is DOM-aware
  zoom. So v1 recorder = global hotkey + Chrome Desktop Capture; the extension is a
  fast-follow. (Source research led with the extension — inverted here.)
- **NVENC, not libx264.** `libx264` forces FFmpeg to GPL. Ship an LGPL FFmpeg build +
  NVENC (RTX-class GPU) for H.264/HEVC and the render layer stays LGPL-clean for
  commercial distribution. Software `libx264` is an optional, separately-downloaded
  no-GPU fallback. Keep render as a sidecar so the license boundary is physical.
- **DOM-aware zoom is the wedge.** `center(element)` (from `getBoundingClientRect()` on
  click) instead of `center(cursor)` makes demos look directed. Cursorful can't easily
  copy it. Pull it forward the moment browser-tab capture exists.

## Auto-zoom engine

Camera operator, not magnifier. Cluster weighted interactions (clicks/nav high, movement
zero), hold `holdAfter` seconds past the last activity, drop segments under `minDuration`,
target the weighted centroid (element center when bounds are known). Every segment is
`auto:true` and editable. See `src/core/zoom.ts`.

## Phase plan

| Phase | Goal | Cut line |
|---|---|---|
| **0 — Skeleton** | Tauri shell + on-disk project model + playback | prove non-destructive model first · **core engine done + tested** |
| **1 — Native recorder (MVP)** | hotkey → Chrome Desktop Capture → save project → open editor | first usable loop |
| **2 — Auto-zoom** | click clustering → editable zoom keyframes on a timeline | metadata-driven, never baked |
| **3 — Marketing editor** | canvas compositor: bg / padding / radius / shadow / frame; trim/split | pure canvas layers |
| **4 — Multi-aspect + render** | per-aspect framing, FFmpeg+NVENC sidecar, batch export | one take → 4 cuts |
| **5 — Extension** | MV3: green/red state, tab + screen capture, Native Messaging + WS | the deferred subsystem |
| **6 — DOM-aware zoom** | element-bounds targeting + interaction scoring | the wedge |
| **7 — Native capture** | Windows.Graphics.Capture / DXGI, global cursor hook, mic/webcam/system audio | replaces Chrome picker |
| **8 — AI / advanced** | webcam bg removal, captions, silence trimming, templates, watermark | each independently optional |

## Prerequisites (Windows)

- Node 24 (type-stripping runs `src/core/` with no build step) ✓
- Rust stable (MSVC host) ✓
- WebView2 runtime ✓
- MSVC C++ build tools — the Tauri gate (installing)
- FFmpeg ✓ (dev build is GPL; distribution build must be LGPL + NVENC)
