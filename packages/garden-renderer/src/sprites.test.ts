import { describe, expect, it } from "vitest";
import {
  buildRenderState,
  getPlantSprite,
  getSpriteForAssetKey,
  getTileSprite,
  MOCK_GARDEN_STATE,
  type PlantLike,
  type TerrainTile,
} from "./index.js";

describe("Renderer Sprite Integration", () => {
  describe("getPlantSprite", () => {
    it("resolves sprite for a RenderPlant produced by buildRenderState", () => {
      const plants: PlantLike[] = [
        {
          id: "p1",
          speciesId: "oak",
          growthStage: "MATURE",
          health: "HEALTHY",
          position: { x: 2, y: 3 },
        },
      ];
      const state = buildRenderState(plants);
      const renderPlant = state.plants[0];
      expect(renderPlant).toBeDefined();

      const sprite = getPlantSprite(renderPlant!);
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("oak.MATURE");
      expect(sprite?.spriteSheet).toBe("plants.png");
      expect(sprite?.frame).toBe(3);
    });

    it("resolves health state variant sprite for a wilted plant", () => {
      const plants: PlantLike[] = [
        {
          id: "p2",
          speciesId: "cherry",
          growthStage: "FLOWERING",
          health: "WILTED",
          position: { x: 1, y: 1 },
        },
      ];
      const state = buildRenderState(plants);
      const renderPlant = state.plants[0]!;

      const sprite = getPlantSprite(renderPlant);
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("cherry.FLOWERING.WILTED");
      expect(sprite?.frame).toBe(29);
    });

    it("falls back to assetKey if direct resolution fails", () => {
      const customPlant = {
        id: "p3",
        speciesId: "custom_tree",
        growthStage: "MATURE",
        health: "HEALTHY",
        col: 0,
        row: 0,
        worldX: 8,
        worldY: 8,
        assetKey: "oak.MATURE",
      };
      const sprite = getPlantSprite(customPlant);
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("oak.MATURE");
    });
  });

  describe("getTileSprite", () => {
    it("resolves tile sprite from a TerrainTile object", () => {
      const tile: TerrainTile = {
        col: 0,
        row: 0,
        variant: "WATER",
        worldX: 0,
        worldY: 0,
      };
      const sprite = getTileSprite(tile);
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("tile.WATER");
      expect(sprite?.spriteSheet).toBe("terrain.png");
    });

    it("resolves tile sprite directly from a TileVariant string", () => {
      const sprite = getTileSprite("GRASS");
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("tile.GRASS");
    });
  });

  describe("getSpriteForAssetKey", () => {
    it("retrieves sprite directly by key", () => {
      const sprite = getSpriteForAssetKey("cactus.FLOWERING");
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe("cactus.FLOWERING");
    });
  });

  describe("MOCK_GARDEN_STATE sprite resolution", () => {
    it("resolves sprite metadata for all plants in MOCK_GARDEN_STATE", () => {
      expect(MOCK_GARDEN_STATE.plants.length).toBeGreaterThan(0);
      for (const plant of MOCK_GARDEN_STATE.plants) {
        const sprite = getPlantSprite(plant);
        expect(
          sprite,
          `Failed to resolve sprite for mock plant ${plant.speciesId}.${plant.growthStage}`,
        ).toBeDefined();
      }
    });

    it("resolves sprite metadata for all tiles in MOCK_GARDEN_STATE", () => {
      expect(MOCK_GARDEN_STATE.terrain.length).toBe(60);
      for (const tile of MOCK_GARDEN_STATE.terrain) {
        const sprite = getTileSprite(tile);
        expect(
          sprite,
          `Failed to resolve sprite for mock tile ${tile.variant}`,
        ).toBeDefined();
      }
    });
  });
});
