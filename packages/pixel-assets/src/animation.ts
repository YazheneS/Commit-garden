/**
 * Animation frames and helpers
 *
 * Provides pure, deterministic animation utilities for calculating
 * the active frame of an animated sprite based on elapsed time.
 */

import type { AnimationFrame, SpriteAnimation } from "./types.js";

/**
 * Creates an animation definition from frame indices or full frame objects.
 *
 * @param name Unique animation identifier (e.g. "idle", "sway", "fly")
 * @param frames List of 0-based frame indices or AnimationFrame objects
 * @param defaultDurationMs Duration per frame in ms when passing raw frame indices (default: 200ms)
 * @param loop Whether the animation repeats indefinitely (default: true)
 */
export function createAnimation(
  name: string,
  frames: readonly (number | AnimationFrame)[],
  defaultDurationMs = 200,
  loop = true,
): SpriteAnimation {
  if (frames.length === 0) {
    throw new Error(`Animation "${name}" must have at least one frame.`);
  }

  const normalizedFrames: AnimationFrame[] = frames.map((f) => {
    if (typeof f === "number") {
      if (defaultDurationMs <= 0) {
        throw new Error(`Frame duration must be greater than 0 ms (got ${defaultDurationMs}).`);
      }
      return { frame: f, durationMs: defaultDurationMs };
    }
    if (f.durationMs <= 0) {
      throw new Error(`Frame duration must be greater than 0 ms (got ${f.durationMs}).`);
    }
    return f;
  });

  const totalDurationMs = normalizedFrames.reduce((sum, f) => sum + f.durationMs, 0);

  return {
    name,
    frames: normalizedFrames,
    totalDurationMs,
    loop,
  };
}

/**
 * Deterministically computes the active AnimationFrame for an animation at a given elapsed time.
 *
 * @param animation The animation definition
 * @param elapsedMs Elapsed time in milliseconds since the animation began
 */
export function getAnimationFrame(
  animation: SpriteAnimation,
  elapsedMs: number,
): AnimationFrame {
  const { frames, totalDurationMs, loop = true } = animation;
  const firstFrame = frames[0];
  if (!firstFrame) {
    throw new Error(`Animation "${animation.name}" has no frames.`);
  }

  if (frames.length === 1 || totalDurationMs <= 0) {
    return firstFrame;
  }

  const safeElapsed = Math.max(0, elapsedMs);

  // If not looping and elapsed time has exceeded the cycle, clamp to the final frame
  if (!loop && safeElapsed >= totalDurationMs) {
    return frames[frames.length - 1] ?? firstFrame;
  }

  const cycleTime = safeElapsed % totalDurationMs;
  let accumulatedMs = 0;

  for (const frame of frames) {
    accumulatedMs += frame.durationMs;
    if (cycleTime < accumulatedMs) {
      return frame;
    }
  }

  return frames[frames.length - 1] ?? firstFrame;
}

/**
 * Deterministically computes the active frame index (sheet frame number)
 * for an animation at a given elapsed time.
 */
export function getAnimationFrameIndex(
  animation: SpriteAnimation,
  elapsedMs: number,
): number {
  return getAnimationFrame(animation, elapsedMs).frame;
}
