/**
 * Camera
 *
 * A lightweight camera that maps between world space (pixel coordinates
 * relative to the garden origin) and screen space (pixel coordinates
 * relative to the viewport's top-left corner).
 *
 * World space:  origin at garden top-left; x increases right, y increases down.
 * Screen space: origin at viewport top-left; same axes.
 *
 * Transform:
 *   screenX = (worldX - offsetX) * zoom
 *   screenY = (worldY - offsetY) * zoom
 *
 *   worldX  = screenX / zoom + offsetX
 *   worldY  = screenY / zoom + offsetY
 */

import type { Viewport } from "./types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Point2D = { x: number; y: number };

export type CameraState = {
  /** World-space x coordinate of the viewport's top-left corner. */
  offsetX: number;
  /** World-space y coordinate of the viewport's top-left corner. */
  offsetY: number;
  /**
   * Zoom level.  1.0 = 1 world pixel : 1 screen pixel.
   * Values > 1 zoom in; values < 1 zoom out.
   */
  zoom: number;
};

export type Camera = {
  readonly state: CameraState;

  /** Convert a world-space point to screen-space. */
  worldToScreen: (world: Point2D) => Point2D;

  /** Convert a screen-space point to world-space. */
  screenToWorld: (screen: Point2D) => Point2D;

  /**
   * Return a new Camera panned by (dx, dy) world pixels.
   * Does not mutate; returns a new Camera instance.
   */
  pan: (dx: number, dy: number) => Camera;

  /**
   * Return a new Camera zoomed to `newZoom`, keeping the given screen-space
   * anchor point stationary.  Does not mutate.
   *
   * @param newZoom  Target zoom level (clamped to [minZoom, maxZoom]).
   * @param anchor   Screen-space point that should not move (default: {0,0}).
   */
  zoomTo: (newZoom: number, anchor?: Point2D) => Camera;

  /**
   * Return a new Camera centred on a world-space point within the viewport.
   * Does not mutate.
   */
  centreOn: (world: Point2D, viewport: Viewport) => Camera;
};

// ─── Configuration ────────────────────────────────────────────────────────────

export type CameraConfig = {
  minZoom: number;
  maxZoom: number;
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  minZoom: 0.5,
  maxZoom: 4.0,
};

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a Camera with the given initial state.
 */
export function createCamera(
  initial: Partial<CameraState> = {},
  config: CameraConfig = DEFAULT_CAMERA_CONFIG,
): Camera {
  const state: CameraState = {
    offsetX: initial.offsetX ?? 0,
    offsetY: initial.offsetY ?? 0,
    zoom: clampZoom(initial.zoom ?? 1, config),
  };

  function worldToScreen(world: Point2D): Point2D {
    return {
      x: (world.x - state.offsetX) * state.zoom,
      y: (world.y - state.offsetY) * state.zoom,
    };
  }

  function screenToWorld(screen: Point2D): Point2D {
    return {
      x: screen.x / state.zoom + state.offsetX,
      y: screen.y / state.zoom + state.offsetY,
    };
  }

  function pan(dx: number, dy: number): Camera {
    return createCamera(
      { ...state, offsetX: state.offsetX + dx, offsetY: state.offsetY + dy },
      config,
    );
  }

  function zoomTo(newZoom: number, anchor: Point2D = { x: 0, y: 0 }): Camera {
    const clamped = clampZoom(newZoom, config);

    // Keep the anchor world position fixed:
    //   worldAnchor = anchor / oldZoom + offset
    //   newOffset   = worldAnchor - anchor / newZoom
    const worldAnchorX = anchor.x / state.zoom + state.offsetX;
    const worldAnchorY = anchor.y / state.zoom + state.offsetY;

    return createCamera(
      {
        offsetX: worldAnchorX - anchor.x / clamped,
        offsetY: worldAnchorY - anchor.y / clamped,
        zoom: clamped,
      },
      config,
    );
  }

  function centreOn(world: Point2D, viewport: Viewport): Camera {
    return createCamera(
      {
        offsetX: world.x - viewport.width / (2 * state.zoom),
        offsetY: world.y - viewport.height / (2 * state.zoom),
        zoom: state.zoom,
      },
      config,
    );
  }

  return { state, worldToScreen, screenToWorld, pan, zoomTo, centreOn };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clampZoom(zoom: number, config: CameraConfig): number {
  return Math.min(config.maxZoom, Math.max(config.minZoom, zoom));
}
