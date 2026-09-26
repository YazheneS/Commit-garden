import { describe, expect, it } from "vitest";
import {
  buildRenderState,
  createButterfly,
  createFirefly,
  createGrowthAnimation,
  getDayNightState,
  sampleCreature,
  sampleGrowthAnimation,
  samplePlantSway,
  updateCreatures,
  type PlantLike,
  type RenderPlant,
} from "./index.js";

describe("Garden Animation System", () => {
  describe("Day / Night Cycle (getDayNightState)", () => {
    it("returns DAWN state between 05:00 and 08:00", () => {
      const state = getDayNightState(6.5);
      expect(state.timeOfDay).toBe("DAWN");
      expect(state.ambientColor).toBe("#E8D0D8");
      expect(state.ambientIntensity).toBe(0.7);
      expect(state.overlayOpacity).toBe(0.2);
    });

    it("returns DAY state between 08:00 and 18:00", () => {
      const state = getDayNightState(12.0);
      expect(state.timeOfDay).toBe("DAY");
      expect(state.ambientColor).toBe("#FFFFFF");
      expect(state.ambientIntensity).toBe(1.0);
      expect(state.overlayOpacity).toBe(0.0);
    });

    it("returns DUSK state between 18:00 and 21:00", () => {
      const state = getDayNightState(19.0);
      expect(state.timeOfDay).toBe("DUSK");
      expect(state.ambientColor).toBe("#FFAE66");
      expect(state.ambientIntensity).toBe(0.75);
      expect(state.overlayOpacity).toBe(0.25);
    });

    it("returns NIGHT state between 21:00 and 05:00", () => {
      const lateNight = getDayNightState(23.5);
      expect(lateNight.timeOfDay).toBe("NIGHT");
      expect(lateNight.ambientColor).toBe("#1B2040");
      expect(lateNight.ambientIntensity).toBe(0.35);
      expect(lateNight.overlayOpacity).toBe(0.5);

      const earlyMorning = getDayNightState(2.0);
      expect(earlyMorning.timeOfDay).toBe("NIGHT");
    });

    it("accepts a standard Date instance", () => {
      const noon = new Date("2026-06-15T12:00:00Z");
      // Use local hours check
      const state = getDayNightState(noon);
      expect(["DAWN", "DAY", "DUSK", "NIGHT"]).toContain(state.timeOfDay);
      expect(state.progress).toBeGreaterThanOrEqual(0);
      expect(state.progress).toBeLessThanOrEqual(1);
    });
  });

  describe("Plant Idle Sway (samplePlantSway)", () => {
    const makePlant = (
      growthStage: RenderPlant["growthStage"],
      health: RenderPlant["health"] = "HEALTHY",
      col = 0,
      row = 0,
    ): RenderPlant => ({
      id: "p1",
      speciesId: "oak",
      growthStage,
      health,
      col,
      row,
      worldX: 16,
      worldY: 16,
      assetKey: `oak.${growthStage}`,
    });

    it("keeps SEED and SPROUT completely motionless", () => {
      const seed = makePlant("SEED");
      const sprout = makePlant("SPROUT");

      expect(samplePlantSway(seed, 1000)).toEqual({
        offsetX: 0,
        offsetY: 0,
        rotationRad: 0,
      });
      expect(samplePlantSway(sprout, 2000)).toEqual({
        offsetX: 0,
        offsetY: 0,
        rotationRad: 0,
      });
    });

    it("produces downward droop for WILTED plants without swaying", () => {
      const wilted = makePlant("MATURE", "WILTED");
      const sway1 = samplePlantSway(wilted, 500);
      const sway2 = samplePlantSway(wilted, 1500);

      expect(sway1.offsetY).toBe(1);
      expect(sway2.offsetY).toBe(1);
      expect(sway1.offsetX).toBe(0);
    });

    it("produces gentle horizontal sway for MATURE plants", () => {
      const mature = makePlant("MATURE", "HEALTHY");
      const samples = [
        samplePlantSway(mature, 0),
        samplePlantSway(mature, 500),
        samplePlantSway(mature, 1000),
        samplePlantSway(mature, 1500),
      ];

      // At least some horizontal deviation occurs
      expect(samples.some((s) => s.offsetX !== 0)).toBe(true);
      for (const s of samples) {
        expect(Math.abs(s.offsetX)).toBeLessThanOrEqual(1.5);
      }
    });

    it("calculates different phase offsets for different plant coordinates", () => {
      const plantA = makePlant("MATURE", "HEALTHY", 1, 2);
      const plantB = makePlant("MATURE", "HEALTHY", 5, 4);

      const swayA = samplePlantSway(plantA, 800);
      const swayB = samplePlantSway(plantB, 800);

      expect(swayA.offsetX !== swayB.offsetX || swayA.rotationRad !== swayB.rotationRad).toBe(
        true,
      );
    });
  });

  describe("Plant Growth Animation", () => {
    it("tracks progression from start to finish", () => {
      const anim = createGrowthAnimation("p1", "SPROUT", "YOUNG", 1000, 500);

      const start = sampleGrowthAnimation(anim, 1000);
      expect(start.progress).toBe(0);
      expect(start.isComplete).toBe(false);

      const mid = sampleGrowthAnimation(anim, 1250);
      expect(mid.progress).toBe(0.5);
      expect(mid.isComplete).toBe(false);
      // Demonstrates pop bounce: scaleY > 1 and upward offset
      expect(mid.scaleY).toBeGreaterThan(1.0);
      expect(mid.offsetY).toBeLessThan(0);

      const done = sampleGrowthAnimation(anim, 1500);
      expect(done.progress).toBe(1.0);
      expect(done.isComplete).toBe(true);
      expect(done.scaleX).toBe(1.0);
      expect(done.scaleY).toBe(1.0);
      expect(done.offsetY).toBe(0);
    });

    it("clamps times before start and after end", () => {
      const anim = createGrowthAnimation("p2", "SEED", "SPROUT", 100, 400);

      const before = sampleGrowthAnimation(anim, 50);
      expect(before.progress).toBe(0);

      const after = sampleGrowthAnimation(anim, 900);
      expect(after.progress).toBe(1);
      expect(after.isComplete).toBe(true);
    });
  });

  describe("Ambient Creatures (Butterflies & Fireflies)", () => {
    it("samples smooth butterfly flutter motion and alternating flap frames", () => {
      const butterfly = createButterfly("b1", 100, 80);
      const sample1 = sampleCreature(butterfly, 0);
      expect(sample1.kind).toBe("BUTTERFLY");
      expect(sample1.frame).toBe(0);
      expect(sample1.assetKey).toBe("creature.butterfly");

      const sample2 = sampleCreature(butterfly, 160);
      expect(sample2.frame).toBe(1); // wings alternate
    });

    it("samples firefly hovering drift and pulsing alpha glow", () => {
      const firefly = createFirefly("f1", 50, 50);
      const sample = sampleCreature(firefly, 500);

      expect(sample.kind).toBe("FIREFLY");
      expect(sample.assetKey).toBe("creature.firefly");
      expect([2, 3]).toContain(sample.frame);
      expect(sample.alpha).toBeGreaterThanOrEqual(0.3);
      expect(sample.alpha).toBeLessThanOrEqual(1.0);
    });

    it("updateCreatures filters visibility according to timeOfDay", () => {
      const creatures = [
        createButterfly("b1", 50, 50),
        createFirefly("f1", 80, 80),
      ];

      // DAY: only butterflies
      const dayActive = updateCreatures(creatures, 1000, "DAY");
      expect(dayActive.length).toBe(1);
      expect(dayActive[0]?.kind).toBe("BUTTERFLY");

      // NIGHT: only fireflies
      const nightActive = updateCreatures(creatures, 1000, "NIGHT");
      expect(nightActive.length).toBe(1);
      expect(nightActive[0]?.kind).toBe("FIREFLY");

      // DUSK: both active
      const duskActive = updateCreatures(creatures, 1000, "DUSK");
      expect(duskActive.length).toBe(2);
    });
  });

  describe("Integration with buildRenderState", () => {
    it("includes creatures and dayNight state in GardenRenderState when provided", () => {
      const plants: PlantLike[] = [
        {
          id: "p1",
          speciesId: "oak",
          growthStage: "MATURE",
          health: "HEALTHY",
          position: { x: 0, y: 0 },
        },
      ];

      const dayNight = getDayNightState(14.0);
      const creatures = updateCreatures([createButterfly("b1", 10, 10)], 500, "DAY");

      const state = buildRenderState(plants, undefined, {
        creatures,
        dayNight,
      });

      expect(state.creatures).toHaveLength(1);
      expect(state.creatures?.[0]?.kind).toBe("BUTTERFLY");
      expect(state.dayNight?.timeOfDay).toBe("DAY");
    });
  });
});
