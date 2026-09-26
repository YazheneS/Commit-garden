/**
 * Renderer Sprite Integration
 *
 * Bridges the renderer data structures (RenderPlant, TerrainTile) to sprite metadata
 * registered in @commit-garden/pixel-assets.
 */

import {
  getSprite,
  resolvePlantSprite,
  type SpriteMetadata,
} from "@commit-garden/pixel-assets";
import type { PlantLike } from "./render-state.js";
import type { RenderPlant, TerrainTile, TileVariant } from "./types.js";

export type PlantSpriteQuery =
  | RenderPlant
  | PlantLike
  | {
      speciesId: string;
      growthStage: string;
      health?: string | undefined;
      assetKey?: string | undefined;
    };

/**
 * Resolves the sprite metadata for a RenderPlant (or PlantLike object).
 *
 * Takes into account the plant's speciesId, growthStage, and health state,
 * falling back to the plant's assetKey if defined.
 */
export function getPlantSprite(
  plant: PlantSpriteQuery,
): SpriteMetadata | undefined {
  const resolved = resolvePlantSprite(
    plant.speciesId,
    plant.growthStage,
    "health" in plant ? plant.health : undefined,
  );
  if (resolved) {
    return resolved;
  }

  if ("assetKey" in plant && typeof plant.assetKey === "string") {
    return getSprite(plant.assetKey);
  }

  return undefined;
}

/**
 * Resolves the sprite metadata for a terrain tile variant or TerrainTile object.
 */
export function getTileSprite(
  tileOrVariant: TerrainTile | TileVariant,
): SpriteMetadata | undefined {
  const variant =
    typeof tileOrVariant === "string" ? tileOrVariant : tileOrVariant.variant;
  return getSprite(`tile.${variant}`);
}

/**
 * Looks up sprite metadata directly by asset key.
 */
export function getSpriteForAssetKey(assetKey: string): SpriteMetadata | undefined {
  return getSprite(assetKey);
}
