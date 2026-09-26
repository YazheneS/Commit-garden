import { describe, it, expect } from "vitest";
import { createCamera, DEFAULT_CAMERA_CONFIG } from "./camera.js";
import type { Point2D } from "./camera.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Assert two Point2D values are close enough (floating-point tolerance). */
function expectPoint(actual: Point2D, expected: Point2D, precision = 6): void {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
}

// ─── Default camera ───────────────────────────────────────────────────────────

describe("createCamera — defaults", () => {
  it("defaults to offset (0,0) and zoom 1", () => {
    const cam = createCamera();
    expect(cam.state.offsetX).toBe(0);
    expect(cam.state.offsetY).toBe(0);
    expect(cam.state.zoom).toBe(1);
  });

  it("accepts custom initial state", () => {
    const cam = createCamera({ offsetX: 10, offsetY: 20, zoom: 2 });
    expect(cam.state.offsetX).toBe(10);
    expect(cam.state.offsetY).toBe(20);
    expect(cam.state.zoom).toBe(2);
  });
});

// ─── worldToScreen ────────────────────────────────────────────────────────────

describe("worldToScreen", () => {
  it("at zoom 1, offset 0 — world point equals screen point", () => {
    const cam = createCamera();
    expectPoint(cam.worldToScreen({ x: 50, y: 30 }), { x: 50, y: 30 });
  });

  it("applies zoom correctly", () => {
    const cam = createCamera({ zoom: 2 });
    expectPoint(cam.worldToScreen({ x: 50, y: 30 }), { x: 100, y: 60 });
  });

  it("applies offset correctly", () => {
    const cam = createCamera({ offsetX: 10, offsetY: 5 });
    // screen = (world - offset) * zoom
    expectPoint(cam.worldToScreen({ x: 30, y: 15 }), { x: 20, y: 10 });
  });

  it("combines zoom and offset", () => {
    const cam = createCamera({ offsetX: 5, offsetY: 5, zoom: 2 });
    // screen = (world - offset) * zoom = (10 - 5) * 2 = 10
    expectPoint(cam.worldToScreen({ x: 10, y: 10 }), { x: 10, y: 10 });
  });

  it("world origin maps to negative screen coords when offset > 0", () => {
    const cam = createCamera({ offsetX: 20, offsetY: 20, zoom: 1 });
    expectPoint(cam.worldToScreen({ x: 0, y: 0 }), { x: -20, y: -20 });
  });
});

// ─── screenToWorld ────────────────────────────────────────────────────────────

describe("screenToWorld", () => {
  it("at zoom 1, offset 0 — screen point equals world point", () => {
    const cam = createCamera();
    expectPoint(cam.screenToWorld({ x: 50, y: 30 }), { x: 50, y: 30 });
  });

  it("applies zoom correctly", () => {
    const cam = createCamera({ zoom: 2 });
    expectPoint(cam.screenToWorld({ x: 100, y: 60 }), { x: 50, y: 30 });
  });

  it("applies offset correctly", () => {
    const cam = createCamera({ offsetX: 10, offsetY: 5 });
    expectPoint(cam.screenToWorld({ x: 20, y: 10 }), { x: 30, y: 15 });
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe("worldToScreen / screenToWorld round-trip", () => {
  it("worldToScreen → screenToWorld returns original point", () => {
    const cam = createCamera({ offsetX: 7, offsetY: 3, zoom: 1.5 });
    const world: Point2D = { x: 42, y: 17 };
    const screen = cam.worldToScreen(world);
    const back = cam.screenToWorld(screen);
    expectPoint(back, world);
  });

  it("screenToWorld → worldToScreen returns original point", () => {
    const cam = createCamera({ offsetX: 0, offsetY: 0, zoom: 3 });
    const screen: Point2D = { x: 90, y: 60 };
    const world = cam.screenToWorld(screen);
    const back = cam.worldToScreen(world);
    expectPoint(back, screen);
  });
});

// ─── pan ─────────────────────────────────────────────────────────────────────

describe("pan", () => {
  it("returns a new camera (immutable)", () => {
    const cam = createCamera();
    const panned = cam.pan(10, 20);
    expect(panned).not.toBe(cam);
  });

  it("increases offsetX and offsetY by the given deltas", () => {
    const cam = createCamera({ offsetX: 5, offsetY: 3 });
    const panned = cam.pan(10, 20);
    expect(panned.state.offsetX).toBe(15);
    expect(panned.state.offsetY).toBe(23);
  });

  it("does not mutate the original camera", () => {
    const cam = createCamera({ offsetX: 0, offsetY: 0 });
    cam.pan(100, 100);
    expect(cam.state.offsetX).toBe(0);
    expect(cam.state.offsetY).toBe(0);
  });

  it("panning by (0,0) produces the same state values", () => {
    const cam = createCamera({ offsetX: 5, offsetY: 3, zoom: 2 });
    const panned = cam.pan(0, 0);
    expect(panned.state).toEqual(cam.state);
  });
});

// ─── zoomTo ───────────────────────────────────────────────────────────────────

describe("zoomTo", () => {
  it("returns a new camera (immutable)", () => {
    const cam = createCamera();
    expect(cam.zoomTo(2)).not.toBe(cam);
  });

  it("clamps zoom to minZoom", () => {
    const cam = createCamera({}, { minZoom: 0.5, maxZoom: 4 });
    expect(cam.zoomTo(0.1).state.zoom).toBe(0.5);
  });

  it("clamps zoom to maxZoom", () => {
    const cam = createCamera({}, { minZoom: 0.5, maxZoom: 4 });
    expect(cam.zoomTo(10).state.zoom).toBe(4);
  });

  it("the anchor world position is preserved after zoom", () => {
    const cam = createCamera({ offsetX: 0, offsetY: 0, zoom: 1 });
    const anchor: Point2D = { x: 80, y: 48 }; // screen-space anchor
    const worldBefore = cam.screenToWorld(anchor);

    const zoomed = cam.zoomTo(2, anchor);
    const worldAfter = zoomed.screenToWorld(anchor);

    expectPoint(worldAfter, worldBefore);
  });

  it("does not mutate the original camera", () => {
    const cam = createCamera({ zoom: 1 });
    cam.zoomTo(3);
    expect(cam.state.zoom).toBe(1);
  });
});

// ─── centreOn ─────────────────────────────────────────────────────────────────

describe("centreOn", () => {
  it("returns a new camera (immutable)", () => {
    const cam = createCamera();
    expect(cam.centreOn({ x: 50, y: 50 }, { width: 100, height: 100 })).not.toBe(cam);
  });

  it("the target world point maps to the centre of the viewport", () => {
    const cam = createCamera({ zoom: 1 });
    const viewport = { width: 160, height: 96 };
    const target: Point2D = { x: 80, y: 48 };

    const centred = cam.centreOn(target, viewport);
    const screen = centred.worldToScreen(target);

    expectPoint(screen, { x: viewport.width / 2, y: viewport.height / 2 });
  });

  it("works at zoom 2", () => {
    const cam = createCamera({ zoom: 2 });
    const viewport = { width: 160, height: 96 };
    const target: Point2D = { x: 80, y: 48 };

    const centred = cam.centreOn(target, viewport);
    const screen = centred.worldToScreen(target);

    expectPoint(screen, { x: viewport.width / 2, y: viewport.height / 2 });
  });
});

// ─── Zoom clamping in constructor ─────────────────────────────────────────────

describe("createCamera — zoom clamping", () => {
  it("clamps initial zoom below minZoom to minZoom", () => {
    const cam = createCamera({ zoom: 0.1 }, DEFAULT_CAMERA_CONFIG);
    expect(cam.state.zoom).toBe(DEFAULT_CAMERA_CONFIG.minZoom);
  });

  it("clamps initial zoom above maxZoom to maxZoom", () => {
    const cam = createCamera({ zoom: 99 }, DEFAULT_CAMERA_CONFIG);
    expect(cam.state.zoom).toBe(DEFAULT_CAMERA_CONFIG.maxZoom);
  });
});
