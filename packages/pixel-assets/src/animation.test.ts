import { describe, expect, it } from "vitest";
import {
  createAnimation,
  getAnimationFrame,
  getAnimationFrameIndex,
} from "./animation.js";

describe("Animation System", () => {
  describe("createAnimation", () => {
    it("creates an animation from numeric frame indices with default duration", () => {
      const anim = createAnimation("idle", [0, 1, 2]);
      expect(anim.name).toBe("idle");
      expect(anim.frames).toEqual([
        { frame: 0, durationMs: 200 },
        { frame: 1, durationMs: 200 },
        { frame: 2, durationMs: 200 },
      ]);
      expect(anim.totalDurationMs).toBe(600);
      expect(anim.loop).toBe(true);
    });

    it("creates an animation with custom default duration", () => {
      const anim = createAnimation("sway", [10, 11], 350);
      expect(anim.totalDurationMs).toBe(700);
      expect(anim.frames[0]?.durationMs).toBe(350);
      expect(anim.frames[1]?.durationMs).toBe(350);
    });

    it("accepts full AnimationFrame objects with varying durations", () => {
      const anim = createAnimation(
        "custom",
        [
          { frame: 5, durationMs: 100 },
          { frame: 6, durationMs: 400 },
        ],
        200,
        false,
      );
      expect(anim.totalDurationMs).toBe(500);
      expect(anim.loop).toBe(false);
      expect(anim.frames[0]).toEqual({ frame: 5, durationMs: 100 });
      expect(anim.frames[1]).toEqual({ frame: 6, durationMs: 400 });
    });

    it("throws an error when frame list is empty", () => {
      expect(() => createAnimation("empty", [])).toThrow(
        'Animation "empty" must have at least one frame.',
      );
    });

    it("throws an error when frame duration is 0 or negative", () => {
      expect(() => createAnimation("zero", [1, 2], 0)).toThrow(
        "Frame duration must be greater than 0 ms",
      );
      expect(() =>
        createAnimation("negative", [{ frame: 0, durationMs: -50 }]),
      ).toThrow("Frame duration must be greater than 0 ms");
    });
  });

  describe("getAnimationFrame and getAnimationFrameIndex", () => {
    const twoFrameLoop = createAnimation("walk", [0, 1], 200, true); // 0-199: 0, 200-399: 1, total 400ms
    const threeFrameOnce = createAnimation("slash", [10, 11, 12], 100, false); // total 300ms

    it("returns the first frame at elapsed time 0", () => {
      const frame = getAnimationFrame(twoFrameLoop, 0);
      expect(frame.frame).toBe(0);
      expect(getAnimationFrameIndex(twoFrameLoop, 0)).toBe(0);
    });

    it("returns the first frame during its duration", () => {
      expect(getAnimationFrameIndex(twoFrameLoop, 150)).toBe(0);
    });

    it("advances to the second frame when elapsed exceeds first frame duration", () => {
      expect(getAnimationFrameIndex(twoFrameLoop, 200)).toBe(1);
      expect(getAnimationFrameIndex(twoFrameLoop, 350)).toBe(1);
    });

    it("loops back to the start when loop is true", () => {
      // 400ms total -> 450ms is 50ms into the second cycle (frame 0)
      expect(getAnimationFrameIndex(twoFrameLoop, 400)).toBe(0);
      expect(getAnimationFrameIndex(twoFrameLoop, 450)).toBe(0);
      expect(getAnimationFrameIndex(twoFrameLoop, 650)).toBe(1);
    });

    it("clamps to the final frame when loop is false and elapsed exceeds total duration", () => {
      expect(getAnimationFrameIndex(threeFrameOnce, 50)).toBe(10);
      expect(getAnimationFrameIndex(threeFrameOnce, 150)).toBe(11);
      expect(getAnimationFrameIndex(threeFrameOnce, 250)).toBe(12);
      expect(getAnimationFrameIndex(threeFrameOnce, 300)).toBe(12);
      expect(getAnimationFrameIndex(threeFrameOnce, 1000)).toBe(12);
    });

    it("clamps negative elapsed time to 0", () => {
      expect(getAnimationFrameIndex(twoFrameLoop, -100)).toBe(0);
    });

    it("handles single-frame animations without calculation overhead", () => {
      const single = createAnimation("static", [42], 500);
      expect(getAnimationFrameIndex(single, 0)).toBe(42);
      expect(getAnimationFrameIndex(single, 9999)).toBe(42);
    });
  });
});
