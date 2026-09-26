import { describe, expect, it } from "vitest";
import {
  BUILTIN_OTHER_SPRITES,
  BUILTIN_PLANT_SPRITES,
  BUILTIN_SPRITES,
  BUILTIN_TILE_SPRITES,
} from "./manifest.js";

describe("Asset Manifest", () => {
  it("contains unique sprite IDs with no collisions", () => {
    const ids = BUILTIN_SPRITES.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("every sprite has positive dimensions, valid frame, and non-empty spriteSheet", () => {
    for (const sprite of BUILTIN_SPRITES) {
      expect(sprite.id).toBeTruthy();
      expect(sprite.width).toBeGreaterThan(0);
      expect(sprite.height).toBeGreaterThan(0);
      expect(sprite.frame).toBeGreaterThanOrEqual(0);
      expect(sprite.spriteSheet.trim().length).toBeGreaterThan(0);
      expect(["plant", "tile", "creature", "decoration", "effect"]).toContain(
        sprite.type,
      );
    }
  });

  it("every plant sprite defines valid anchor points", () => {
    for (const plant of BUILTIN_PLANT_SPRITES) {
      expect(plant.anchor).toBeDefined();
      expect(plant.anchor?.x).toBe(0.5);
      expect(plant.anchor?.y).toBe(1.0);
    }
  });

  it("covers all built-in plant species and their complete growth stage paths", () => {
    const speciesStages: Record<string, string[]> = {
      oak: ["SEED", "SPROUT", "YOUNG", "MATURE", "FLOWERING", "SPECIAL"],
      cherry: ["SEED", "SPROUT", "YOUNG", "MATURE", "FLOWERING"],
      mushroom: ["SEED", "SPROUT", "MATURE", "SPECIAL"],
      cactus: ["SEED", "YOUNG", "MATURE", "FLOWERING"],
      flower: ["SEED", "SPROUT", "FLOWERING"],
    };

    const plantSpriteMap = new Map(BUILTIN_PLANT_SPRITES.map((p) => [p.id, p]));

    for (const [speciesId, stages] of Object.entries(speciesStages)) {
      for (const stage of stages) {
        const expectedId = `${speciesId}.${stage}`;
        const sprite = plantSpriteMap.get(expectedId);
        expect(
          sprite,
          `Missing sprite for species "${speciesId}" stage "${stage}" (expected ID: "${expectedId}")`,
        ).toBeDefined();
        expect(sprite?.speciesId).toBe(speciesId);
        expect(sprite?.growthStage).toBe(stage);
      }
    }
  });

  it("provides wilted and dormant plant health state sprites for mature/flowering stages", () => {
    const plantSpriteMap = new Map(BUILTIN_PLANT_SPRITES.map((p) => [p.id, p]));

    const healthVariants = [
      "oak.MATURE.WILTED",
      "oak.MATURE.DORMANT",
      "oak.FLOWERING.WILTED",
      "oak.FLOWERING.DORMANT",
      "cherry.MATURE.WILTED",
      "cherry.MATURE.DORMANT",
      "cherry.FLOWERING.WILTED",
      "cherry.FLOWERING.DORMANT",
      "mushroom.MATURE.WILTED",
      "mushroom.MATURE.DORMANT",
      "cactus.MATURE.WILTED",
      "cactus.MATURE.DORMANT",
      "cactus.FLOWERING.WILTED",
      "cactus.FLOWERING.DORMANT",
      "flower.FLOWERING.WILTED",
      "flower.FLOWERING.DORMANT",
    ];

    for (const id of healthVariants) {
      const sprite = plantSpriteMap.get(id);
      expect(sprite, `Missing health variant sprite "${id}"`).toBeDefined();
      expect(sprite?.health).toBeDefined();
    }
  });

  it("covers all 5 terrain tile variants with standard 16x16 dimensions", () => {
    const variants = ["GRASS", "SOIL", "PATH", "WATER", "STONE"];
    const tileMap = new Map(BUILTIN_TILE_SPRITES.map((t) => [t.id, t]));

    for (const variant of variants) {
      const tile = tileMap.get(`tile.${variant}`);
      expect(tile, `Missing tile sprite for "${variant}"`).toBeDefined();
      expect(tile?.width).toBe(16);
      expect(tile?.height).toBe(16);
      expect(tile?.spriteSheet).toBe("terrain.png");
    }
  });

  it("all sprite animations have valid frame structures", () => {
    for (const sprite of [...BUILTIN_PLANT_SPRITES, ...BUILTIN_TILE_SPRITES, ...BUILTIN_OTHER_SPRITES]) {
      if (sprite.animations) {
        for (const [animName, anim] of Object.entries(sprite.animations)) {
          expect(anim.name).toBe(animName);
          expect(anim.frames.length).toBeGreaterThan(0);
          expect(anim.totalDurationMs).toBeGreaterThan(0);
          for (const f of anim.frames) {
            expect(f.frame).toBeGreaterThanOrEqual(0);
            expect(f.durationMs).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
