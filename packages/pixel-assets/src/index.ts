/**
 * pixel-assets — public API
 *
 * Sprite sheets, tiles, animation frames, and asset manifests.
 * Applications reference registered asset keys and sprite metadata rather than file paths.
 */

// Types
export type {
  SpriteType,
  SpriteAnchor,
  AnimationFrame,
  SpriteAnimation,
  SpriteMetadata,
  PlantSpriteMetadata,
  TileSpriteMetadata,
} from "./types.js";

// Animation helpers
export {
  createAnimation,
  getAnimationFrame,
  getAnimationFrameIndex,
} from "./animation.js";

// Manifests
export {
  BUILTIN_SPRITES,
  BUILTIN_PLANT_SPRITES,
  BUILTIN_TILE_SPRITES,
  BUILTIN_OTHER_SPRITES,
} from "./manifest.js";

// Registry
export {
  SpriteRegistry,
  createSpriteRegistry,
  formatPlantAssetKey,
  formatPlantHealthAssetKey,
  registerSprite,
  registerSprites,
  getSprite,
  hasSprite,
  getAllSprites,
  getSpritesByType,
  resolvePlantSprite,
  resetSpriteRegistry,
} from "./registry.js";
