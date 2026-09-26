/**
 * buildRenderState
 *
 * Maps a list of domain Plant objects (from garden-engine / API) into the
 * renderer's GardenRenderState.  This is the only place that knows about
 * both the domain Plant shape and the renderer's RenderPlant shape.
 *
 * The renderer itself never imports from @commit-garden/garden-engine.
 * Instead, callers (web app, desktop app, mobile app) import both and wire
 * them together here.
 */

import type {
  GardenRenderState,
  RenderPlant,
  TerrainTile,
  RenderGrowthStage,
  RenderHealthState,
  TileVariant,
} from "./types.js";
import { TILE_SIZE } from "./types.js";

// ─── Configuration ────────────────────────────────────────────────────────────

export type RenderConfig = {
  gridWidth: number;
  gridHeight: number;
  /**
   * Override the tile variant for specific cells.
   * Cells not listed default to GRASS.
   */
  tileOverrides?: ReadonlyArray<{ col: number; row: number; variant: TileVariant }>;
};

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  gridWidth: 10,
  gridHeight: 6,
  tileOverrides: [],
};

// ─── Domain plant shape (minimal — only fields the renderer needs) ────────────

/**
 * The renderer accepts any object that looks like a domain Plant.
 * Using a structural type here means garden-renderer does not need to
 * import @commit-garden/garden-engine.
 */
export type PlantLike = {
  id: string;
  speciesId: string;
  growthStage: string;
  health: string;
  position: { x: number; y: number };
};

// ─── Core implementation ──────────────────────────────────────────────────────

/**
 * Convert an array of domain plants into a complete GardenRenderState.
 *
 * @param plants  Domain plants (must have grid positions already assigned).
 * @param config  Grid dimensions and optional tile overrides.
 * @param effects Optional pre-built effects to include.
 */
export function buildRenderState(
  plants: readonly PlantLike[],
  config: RenderConfig = DEFAULT_RENDER_CONFIG,
  effects: GardenRenderState["effects"] = [],
): GardenRenderState {
  const { gridWidth, gridHeight, tileOverrides = [] } = config;

  // Build override lookup: "col,row" → variant
  const overrideMap = new Map<string, TileVariant>(
    tileOverrides.map((o) => [`${o.col},${o.row}`, o.variant]),
  );

  // ── Terrain ────────────────────────────────────────────────────────────────
  const terrain: TerrainTile[] = [];
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const variant: TileVariant =
        overrideMap.get(`${col},${row}`) ?? "GRASS";
      terrain.push({
        col,
        row,
        variant,
        worldX: col * TILE_SIZE,
        worldY: row * TILE_SIZE,
      });
    }
  }

  // ── Plants ─────────────────────────────────────────────────────────────────
  const renderPlants: RenderPlant[] = plants
    .filter((p) => p.position.x >= 0 && p.position.y >= 0) // exclude sentinel
    .map((p) => {
      const col = p.position.x;
      const row = p.position.y;
      const growthStage = toRenderGrowthStage(p.growthStage);
      const health = toRenderHealthState(p.health);
      return {
        id: p.id,
        speciesId: p.speciesId,
        growthStage,
        health,
        col,
        row,
        // Centre of the tile
        worldX: col * TILE_SIZE + TILE_SIZE / 2,
        worldY: row * TILE_SIZE + TILE_SIZE / 2,
        assetKey: `${p.speciesId}.${growthStage}`,
      };
    })
    // Painter's order: top rows first, left-to-right within each row
    .sort((a, b) => a.row - b.row || a.col - b.col);

  return {
    gridWidth,
    gridHeight,
    terrain,
    plants: renderPlants,
    effects,
  };
}

// ─── Stage / health coercions ─────────────────────────────────────────────────

const VALID_GROWTH_STAGES = new Set<string>([
  "SEED", "SPROUT", "YOUNG", "MATURE", "FLOWERING", "SPECIAL",
]);

const VALID_HEALTH_STATES = new Set<string>([
  "HEALTHY", "WILTED", "DORMANT", "RECOVERING",
]);

function toRenderGrowthStage(raw: string): RenderGrowthStage {
  if (VALID_GROWTH_STAGES.has(raw)) return raw as RenderGrowthStage;
  return "SEED"; // safe fallback
}

function toRenderHealthState(raw: string): RenderHealthState {
  if (VALID_HEALTH_STATES.has(raw)) return raw as RenderHealthState;
  return "HEALTHY"; // safe fallback
}
