import { beforeEach, describe, expect, it } from "vitest";
import {
  createSpriteRegistry,
  formatPlantAssetKey,
  formatPlantHealthAssetKey,
  getAllSprites,
  getSprite,
  getSpritesByType,
  hasSprite,
  registerSprite,
  resetSpriteRegistry,
  resolvePlantSprite,
  type SpriteMetadata,
} from "./index.js";

describe("Sprite Registry", () => {
  beforeEach(() => {
    resetSpriteRegistry();
  });

  describe("Key formatters", () => {
    it("formats plant asset key as {speciesId}.{growthStage}", () => {
      expect(formatPlantAssetKey("oak", "MATURE")).toBe("oak.MATURE");
      expect(formatPlantAssetKey("flower", "SEED")).toBe("flower.SEED");
    });

    it("formats plant health key as {speciesId}.{growthStage}.{health}", () => {
      expect(formatPlantHealthAssetKey("oak", "MATURE", "WILTED")).toBe(
        "oak.MATURE.WILTED",
      );
      expect(formatPlantHealthAssetKey("cactus", "FLOWERING", "DORMANT")).toBe(
        "cactus.FLOWERING.DORMANT",
      );
    });
  });

  describe("Global Registry Lookup", () => {
    it("retrieves built-in sprites by ID", () => {
      const oak = getSprite("oak.MATURE");
      expect(oak).toBeDefined();
      expect(oak?.id).toBe("oak.MATURE");
      expect(oak?.type).toBe("plant");
      expect(oak?.spriteSheet).toBe("plants.png");
      expect(oak?.width).toBe(24);
      expect(oak?.height).toBe(32);
      expect(oak?.frame).toBe(3);
    });

    it("retrieves terrain tile sprites", () => {
      const grass = getSprite("tile.GRASS");
      expect(grass).toBeDefined();
      expect(grass?.type).toBe("tile");
      expect(grass?.spriteSheet).toBe("terrain.png");
      expect(grass?.width).toBe(16);
      expect(grass?.height).toBe(16);
    });

    it("returns undefined for unknown sprite ID", () => {
      expect(getSprite("nonexistent.sprite")).toBeUndefined();
    });

    it("checks sprite existence with hasSprite", () => {
      expect(hasSprite("oak.SEED")).toBe(true);
      expect(hasSprite("dragon.FIRE")).toBe(false);
    });

    it("returns all registered sprites sorted by ID", () => {
      const all = getAllSprites();
      expect(all.length).toBeGreaterThan(0);
      for (let i = 1; i < all.length; i++) {
        const prev = all[i - 1]?.id ?? "";
        const curr = all[i]?.id ?? "";
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
      }
    });

    it("filters sprites by category with getSpritesByType", () => {
      const plants = getSpritesByType("plant");
      expect(plants.length).toBeGreaterThan(0);
      expect(plants.every((s) => s.type === "plant")).toBe(true);

      const tiles = getSpritesByType("tile");
      expect(tiles.length).toBe(5);
      expect(tiles.every((s) => s.type === "tile")).toBe(true);

      const creatures = getSpritesByType("creature");
      expect(creatures.length).toBe(2);
      expect(creatures.every((s) => s.type === "creature")).toBe(true);
    });
  });

  describe("Plant Sprite Resolution (resolvePlantSprite)", () => {
    it("resolves exact base plant sprites", () => {
      const sprite = resolvePlantSprite("cherry", "MATURE");
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("cherry.MATURE");
      expect(sprite?.frame).toBe(23);
    });

    it("resolves healthy plant to the base stage sprite", () => {
      const sprite = resolvePlantSprite("oak", "MATURE", "HEALTHY");
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("oak.MATURE");
    });

    it("resolves wilted plant to dedicated wilted sprite if available", () => {
      const sprite = resolvePlantSprite("oak", "MATURE", "WILTED");
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("oak.MATURE.WILTED");
      expect(sprite?.frame).toBe(9);
    });

    it("resolves dormant plant to dedicated dormant sprite if available", () => {
      const sprite = resolvePlantSprite("oak", "MATURE", "DORMANT");
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("oak.MATURE.DORMANT");
      expect(sprite?.frame).toBe(10);
    });

    it("falls back to base stage sprite if health variant does not exist (e.g. RECOVERING)", () => {
      const sprite = resolvePlantSprite("oak", "MATURE", "RECOVERING");
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("oak.MATURE");
    });

    it("falls back to SEED stage if requested stage does not exist for the species", () => {
      // Mushroom doesn't have "YOUNG" stage
      const sprite = resolvePlantSprite("mushroom", "YOUNG");
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("mushroom.SEED");
    });

    it("returns undefined when species is entirely unknown", () => {
      expect(resolvePlantSprite("unknown_tree", "MATURE")).toBeUndefined();
    });
  });

  describe("Custom Registration & Isolation", () => {
    it("allows registering custom sprites into the global registry", () => {
      const custom: SpriteMetadata = {
        id: "custom.plant",
        type: "plant",
        spriteSheet: "custom.png",
        frame: 99,
        width: 16,
        height: 16,
      };
      registerSprite(custom);
      expect(getSprite("custom.plant")).toEqual(custom);

      resetSpriteRegistry();
      expect(getSprite("custom.plant")).toBeUndefined();
    });

    it("creates isolated SpriteRegistry instances", () => {
      const isolated = createSpriteRegistry([]);
      expect(isolated.getAll()).toHaveLength(0);

      isolated.register({
        id: "isolated.tile",
        type: "tile",
        spriteSheet: "test.png",
        frame: 0,
        width: 16,
        height: 16,
      });

      expect(isolated.has("isolated.tile")).toBe(true);
      expect(hasSprite("isolated.tile")).toBe(false);
    });
  });
});
