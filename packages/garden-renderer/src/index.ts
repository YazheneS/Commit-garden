/**
 * garden-renderer — public API
 *
 * Receives garden state and produces render state.
 * Has no dependency on garden-engine, database clients, or GitHub SDKs.
 */

// Types
export type {
  GardenRenderState,
  RenderPlant,
  TerrainTile,
  RenderEffect,
  RenderGrowthStage,
  RenderHealthState,
  RenderEffectKind,
  TileVariant,
  Viewport,
  TimeOfDay,
  DayNightState,
  CreatureKind,
  RenderCreature,
} from "./types.js";
export { TILE_SIZE } from "./types.js";

// Render state builder
export { buildRenderState, DEFAULT_RENDER_CONFIG } from "./render-state.js";
export type { RenderConfig, RenderOptions, PlantLike } from "./render-state.js";

// Animation & Environmental systems
export {
  getDayNightState,
  samplePlantSway,
  createGrowthAnimation,
  sampleGrowthAnimation,
  createButterfly,
  createFirefly,
  sampleCreature,
  updateCreatures,
} from "./animation.js";
export type {
  PlantSway,
  GrowthAnimation,
  GrowthSample,
  CreaturePath,
} from "./animation.js";

// Camera
export { createCamera, DEFAULT_CAMERA_CONFIG } from "./camera.js";
export type { Camera, CameraState, CameraConfig, Point2D } from "./camera.js";

// Mock fixture (for tests and UI scaffolding)
export { MOCK_GARDEN_STATE } from "./mock.js";

// Sprite metadata resolution
export {
  getPlantSprite,
  getTileSprite,
  getSpriteForAssetKey,
} from "./sprites.js";
export type { PlantSpriteQuery } from "./sprites.js";
export { renderPixelGardenHtml, selectSpriteFrame } from "./pixel-scene.js";
export type { SpriteFrameSelection } from "./pixel-scene.js";
export type { PixelSceneOptions } from "./pixel-scene.js";
export type {
  SpriteMetadata,
  SpriteType,
  SpriteAnimation,
  AnimationFrame,
} from "@commit-garden/pixel-assets";
