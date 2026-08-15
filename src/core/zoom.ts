// Auto-zoom engine — turns raw input events into editable zoom segments.
// The goal is a camera operator following the demo, NOT a magnifier chasing
// the mouse. So: cluster interactions, hold while active, ease out after a
// lull. Every segment it emits is editable downstream (auto:true marks it).

import type { InputEvent, ZoomSegment } from "./project.ts";

export interface ZoomOptions {
  frameW: number; // source frame size, to normalize targets to 0..1
  frameH: number;
  scale: number; // zoom depth, default 2
  clusterGap: number; // s: clicks within this gap join one interaction
  holdAfter: number; // s: keep zoom this long after last activity
  minDuration: number; // s: don't emit blink-and-miss zooms
}

export const DEFAULT_ZOOM: ZoomOptions = {
  frameW: 1920,
  frameH: 1080,
  scale: 2,
  clusterGap: 3, // Cursorful-style ~3s repeat window
  holdAfter: 1.2,
  minDuration: 0.8,
};

// Weight interactions so the zoom target favors intent (clicks) over noise
// (raw movement). Element-aware clicks win — they let us center the button.
const WEIGHT: Record<string, number> = {
  click: 5,
  dblclick: 5,
  nav: 5,
  key: 4,
  scroll: 1,
  move: 0, // movement never *creates* a zoom, only pans within one
};

function focus(ev: InputEvent): { x: number; y: number } | null {
  if (ev.el) return { x: ev.el.x + ev.el.w / 2, y: ev.el.y + ev.el.h / 2 };
  if (ev.x != null && ev.y != null) return { x: ev.x, y: ev.y };
  return null;
}

export function generateZooms(
  events: InputEvent[],
  duration: number,
  opts: Partial<ZoomOptions> = {},
): ZoomSegment[] {
  const o = { ...DEFAULT_ZOOM, ...opts };
  // Only anchor events (weight > 0) start/extend a zoom; sorted by time.
  const anchors = events
    .filter((e) => (WEIGHT[e.type] ?? 0) > 0 && focus(e))
    .sort((a, b) => a.t - b.t);
  if (anchors.length === 0) return [];

  const segments: ZoomSegment[] = [];
  let cluster: InputEvent[] = [anchors[0]];

  const flush = () => {
    const start = cluster[0].t;
    const lastT = cluster[cluster.length - 1].t;
    const end = Math.min(lastT + o.holdAfter, duration);
    if (end - start < o.minDuration) {
      cluster = [];
      return;
    }
    // Weighted centroid of the cluster's focus points -> normalized target.
    let sx = 0, sy = 0, sw = 0;
    for (const ev of cluster) {
      const f = focus(ev)!;
      const w = WEIGHT[ev.type] ?? 1;
      sx += f.x * w;
      sy += f.y * w;
      sw += w;
    }
    segments.push({
      id: `z${segments.length}`,
      start: round(start),
      end: round(end),
      x: clamp01(sx / sw / o.frameW),
      y: clamp01(sy / sw / o.frameH),
      scale: o.scale,
      auto: true,
    });
    cluster = [];
  };

  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i].t - cluster[cluster.length - 1].t <= o.clusterGap) {
      cluster.push(anchors[i]);
    } else {
      flush();
      cluster = [anchors[i]];
    }
  }
  flush();
  return segments;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
