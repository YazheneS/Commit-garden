import { describe, it, expect } from "vitest";
import { buildRenderState, DEFAULT_RENDER_CONFIG } from "./render-state.js";
import type { PlantLike } from "./render-state.js";
import { TILE_SIZE } from "./types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function plant(
  id: string,
  col: number,
  row: number,
  overrides: Partial<PlantLike> = {},
): PlantLike {
  return {
    id,
    speciesId: "oak",
    growthStage: "SEED",
    health: "HEALTHY",
    position: { x: col, y: row },
    ...overrides,
  };
}

const SMALL = { gridWidth: 4, gridHeight: 3 };

// ─── Terrain ──────────────────────────────────────────────────────────────────

describe("buildRenderState — terrain", () => {
  it("produces gridWidth × gridHeight tiles", () => {
    const state = buildRenderState([], SMALL);
    expect(state.terrain).toHaveLength(SMALL.gridWidth * SMALL.gridHeight);
  });

  it("defaults all tiles to GRASS when no overrides", () => {
    const state = buildRenderState([], SMALL);
    expect(state.terrain.every((t) => t.variant === "GRASS")).toBe(true);
  });

  it("applies tile overrides correctly", () => {
    const state = buildRenderState([], {
      ...SMALL,
      tileOverrides: [{ col: 1, row: 2, variant: "WATER" }],
    });
    const tile = state.terrain.find((t) => t.col === 1 && t.row === 2)!;
    expect(tile.variant).toBe("WATER");
  });

  it("non-overridden tiles remain GRASS", () => {
    const state = buildRenderState([], {
      ...SMALL,
      tileOverrides: [{ col: 0, row: 0, variant: "STONE" }],
    });
    const grass = state.terrain.filter((t) => t.variant === "GRASS");
    expect(grass).toHaveLength(SMALL.gridWidth * SMALL.gridHeight - 1);
  });

  it("tile worldX = col × TILE_SIZE", () => {
    const state = buildRenderState([], SMALL);
    for (const tile of state.terrain) {
      expect(tile.worldX).toBe(tile.col * TILE_SIZE);
    }
  });

  it("tile worldY = row × TILE_SIZE", () => {
    const state = buildRenderState([], SMALL);
    for (const tile of state.terrain) {
      expect(tile.worldY).toBe(tile.row * TILE_SIZE);
    }
  });

  it("every (col, row) combination appears exactly once", () => {
    const state = buildRenderState([], SMALL);
    const keys = state.terrain.map((t) => `${t.col},${t.row}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ─── Plants ───────────────────────────────────────────────────────────────────

describe("buildRenderState — plants", () => {
  it("maps a plant to a RenderPlant with correct grid coords", () => {
    const state = buildRenderState([plant("p1", 2, 1)], SMALL);
    const rp = state.plants[0]!;
    expect(rp.col).toBe(2);
    expect(rp.row).toBe(1);
  });

  it("computes worldX as col × TILE_SIZE + TILE_SIZE/2 (centre)", () => {
    const state = buildRenderState([plant("p1", 3, 0)], SMALL);
    expect(state.plants[0]!.worldX).toBe(3 * TILE_SIZE + TILE_SIZE / 2);
  });

  it("computes worldY as row × TILE_SIZE + TILE_SIZE/2 (centre)", () => {
    const state = buildRenderState([plant("p1", 0, 2)], SMALL);
    expect(state.plants[0]!.worldY).toBe(2 * TILE_SIZE + TILE_SIZE / 2);
  });

  it("sets assetKey to '{speciesId}.{growthStage}'", () => {
    const state = buildRenderState(
      [plant("p1", 0, 0, { speciesId: "cherry", growthStage: "FLOWERING" })],
      SMALL,
    );
    expect(state.plants[0]!.assetKey).toBe("cherry.FLOWERING");
  });

  it("excludes plants with sentinel position {x:-1, y:-1}", () => {
    const overflow = plant("p-overflow", -1, -1);
    const state = buildRenderState([overflow], SMALL);
    expect(state.plants).toHaveLength(0);
  });

  it("preserves plant id", () => {
    const state = buildRenderState([plant("my-id", 1, 1)], SMALL);
    expect(state.plants[0]!.id).toBe("my-id");
  });

  it("returns an empty plants array when no plants given", () => {
    expect(buildRenderState([], SMALL).plants).toHaveLength(0);
  });

  it("coerces an unknown growthStage to SEED", () => {
    const state = buildRenderState(
      [plant("p1", 0, 0, { growthStage: "ANCIENT" })],
      SMALL,
    );
    expect(state.plants[0]!.growthStage).toBe("SEED");
  });

  it("coerces an unknown health state to HEALTHY", () => {
    const state = buildRenderState(
      [plant("p1", 0, 0, { health: "DEAD" })],
      SMALL,
    );
    expect(state.plants[0]!.health).toBe("HEALTHY");
  });
});

// ─── Painter's order ──────────────────────────────────────────────────────────

describe("buildRenderState — painter's order", () => {
  it("plants are sorted by row ascending, then col ascending", () => {
    const plants = [
      plant("p-c", 3, 2),
      plant("p-a", 1, 0),
      plant("p-b", 0, 2),
      plant("p-d", 2, 1),
    ];
    const state = buildRenderState(plants, SMALL);
    const order = state.plants.map((p) => `${p.row},${p.col}`);
    expect(order).toEqual(["0,1", "1,2", "2,0", "2,3"]);
  });
});

// ─── Effects pass-through ─────────────────────────────────────────────────────

describe("buildRenderState — effects", () => {
  it("passes effects through unchanged", () => {
    const effects = [
      { id: "e1", kind: "SPARKLE" as const, worldX: 10, worldY: 20 },
    ];
    const state = buildRenderState([], SMALL, effects);
    expect(state.effects).toEqual(effects);
  });

  it("defaults to empty effects array", () => {
    expect(buildRenderState([], SMALL).effects).toEqual([]);
  });
});

// ─── Grid dimensions ─────────────────────────────────────────────────────────

describe("buildRenderState — grid dimensions", () => {
  it("exposes correct gridWidth and gridHeight", () => {
    const state = buildRenderState([], SMALL);
    expect(state.gridWidth).toBe(SMALL.gridWidth);
    expect(state.gridHeight).toBe(SMALL.gridHeight);
  });

  it("uses default config when none provided", () => {
    const state = buildRenderState([]);
    expect(state.gridWidth).toBe(DEFAULT_RENDER_CONFIG.gridWidth);
    expect(state.gridHeight).toBe(DEFAULT_RENDER_CONFIG.gridHeight);
    expect(state.terrain).toHaveLength(
      DEFAULT_RENDER_CONFIG.gridWidth * DEFAULT_RENDER_CONFIG.gridHeight,
    );
  });
});
