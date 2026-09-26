/**
 * Renderer types
 *
 * These are the data contracts between the garden engine and any rendering
 * surface (canvas, WebGL, React Native canvas, Tauri webview…).
 *
 * Rules:
 *   - No garden-engine imports here.  The renderer must be decoupled from
 *     domain logic; it only receives pre-computed render state.
 *   - All coordinates are in pixel space relative to the garden origin (0,0).
 *   - Grid coordinates (col, row) are integer cell indices.
 *   - Screen coordinates are float pixel values within the viewport.
 */

// ─── Pixel dimensions ─────────────────────────────────────────────────────────

/** Width and height of a single grid cell in pixels (before zoom). */
export const TILE_SIZE = 16;

// ─── Terrain ──────────────────────────────────────────────────────────────────

export type TileVariant =
  | "GRASS"
  | "SOIL"
  | "PATH"
  | "WATER"
  | "STONE";

export type TerrainTile = {
  /** Grid column index (0-based). */
  col: number;
  /** Grid row index (0-based). */
  row: number;
  variant: TileVariant;
  /** Pixel x of the top-left corner of this tile (world space). */
  worldX: number;
  /** Pixel y of the top-left corner of this tile (world space). */
  worldY: number;
};

// ─── Plants ───────────────────────────────────────────────────────────────────

export type RenderGrowthStage =
  | "SEED"
  | "SPROUT"
  | "YOUNG"
  | "MATURE"
  | "FLOWERING"
  | "SPECIAL";

export type RenderHealthState =
  | "HEALTHY"
  | "WILTED"
  | "DORMANT"
  | "RECOVERING";

export type RenderPlant = {
  /** Stable plant id (mirrors Plant.id from the domain). */
  id: string;
  speciesId: string;
  growthStage: RenderGrowthStage;
  health: RenderHealthState;
  /** Grid column. */
  col: number;
  /** Grid row. */
  row: number;
  /** Pixel x of the centre of this plant (world space). */
  worldX: number;
  /** Pixel y of the centre of this plant (world space). */
  worldY: number;
  /**
   * Asset key used by the sprite system to look up the correct frame.
   * Format: "{speciesId}.{growthStage}" — e.g. "oak.MATURE"
   */
  assetKey: string;
};

// ─── Effects ──────────────────────────────────────────────────────────────────

export type RenderEffectKind =
  | "SPARKLE"
  | "LEAF_DRIFT"
  | "BUTTERFLY"
  | "FIREFLY"
  | "WILT_DROOP";

export type RenderEffect = {
  id: string;
  kind: RenderEffectKind;
  /** World-space anchor point for the effect. */
  worldX: number;
  worldY: number;
  /** Optional TTL in milliseconds; undefined = permanent until removed. */
  ttlMs?: number;
};

// ─── Viewport / Camera ────────────────────────────────────────────────────────

export type Viewport = {
  /** Width of the visible rendering area in pixels. */
  width: number;
  /** Height of the visible rendering area in pixels. */
  height: number;
};

// ─── Top-level render state ───────────────────────────────────────────────────

/**
 * Everything the renderer needs to draw a complete garden frame.
 * Produced by `buildRenderState`; consumed by any render surface.
 */
export type GardenRenderState = {
  /** Grid dimensions (columns × rows). */
  gridWidth: number;
  gridHeight: number;
  /** Flat array of terrain tiles, one per grid cell. */
  terrain: TerrainTile[];
  /** All plants to draw, ordered by row then column (painter's order). */
  plants: RenderPlant[];
  /** Active visual effects. */
  effects: RenderEffect[];
};
