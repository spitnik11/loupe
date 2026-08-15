// Runnable with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject, sourceTimeAt } from "../src/core/project.ts";
import { generateZooms, DEFAULT_ZOOM } from "../src/core/zoom.ts";
import type { InputEvent } from "../src/core/project.ts";

test("newProject has sane defaults", () => {
  const p = newProject("source.webm", 30);
  assert.equal(p.schemaVersion, 1);
  assert.equal(p.canvas.aspect, "16:9");
  assert.equal(p.zooms.length, 0);
});

test("sourceTimeAt shifts past cuts", () => {
  // cut removes 5s..8s; edited t=6 lands at real 9 (past the removed span)
  assert.equal(sourceTimeAt(6, [{ start: 5, end: 8 }]), 9);
  assert.equal(sourceTimeAt(2, [{ start: 5, end: 8 }]), 2); // before the cut
});

test("two nearby clicks -> one zoom segment", () => {
  const ev: InputEvent[] = [
    { t: 1.0, type: "click", x: 960, y: 540 },
    { t: 1.5, type: "click", x: 970, y: 545 },
  ];
  const z = generateZooms(ev, 10);
  assert.equal(z.length, 1);
  assert.ok(z[0].auto);
  // centroid near frame center -> ~0.5, 0.5
  assert.ok(Math.abs(z[0].x - 0.5) < 0.02);
  assert.equal(z[0].end, 1.5 + DEFAULT_ZOOM.holdAfter);
});

test("clicks past the cluster gap -> two segments", () => {
  const ev: InputEvent[] = [
    { t: 1.0, type: "click", x: 100, y: 100 },
    { t: 9.0, type: "click", x: 800, y: 600 },
  ];
  assert.equal(generateZooms(ev, 20).length, 2);
});

test("element bounds center the zoom on the element, not the cursor", () => {
  // cursor at top-left of a button, but element center is elsewhere
  const ev: InputEvent[] = [
    { t: 1, type: "click", x: 720, y: 388, el: { x: 720, y: 388, w: 180, h: 62 } },
  ];
  const z = generateZooms(ev, 5, { frameW: 1920, frameH: 1080 });
  assert.equal(z.length, 1);
  assert.ok(Math.abs(z[0].x - (720 + 90) / 1920) < 0.001);
  assert.ok(Math.abs(z[0].y - (388 + 31) / 1080) < 0.001);
});

test("pure movement never creates a zoom", () => {
  const ev: InputEvent[] = [
    { t: 1, type: "move", x: 100, y: 100 },
    { t: 2, type: "move", x: 200, y: 200 },
  ];
  assert.equal(generateZooms(ev, 5).length, 0);
});
