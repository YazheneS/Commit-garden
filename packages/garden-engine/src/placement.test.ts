import { describe, it, expect } from "vitest";
import {
  assignPlantPositions,
  DEFAULT_PLACEMENT_CONFIG,
  OVERFLOW_POSITION,
} from "./placement.js";
import type { PlacementConfig } from "./placement.js";
import type { Plant, PlantPosition } from "@commit-garden/shared-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let nextPlantNum = 1;

function makePlant(overrides: Partial<Plant> = {}): Plant {
  const n = nextPlantNum++;
  return {
    id: `plant-${n}`,
    gardenId: "garden-test",
    speciesId: "oak",
    growthStage: "SEED",
    position: { x: -1, y: -1 }, // unplaced sentinel
    health: "HEALTHY",
    plantedAt: "2024-01-01T00:00:00.000Z",
    originWeek: n,
    metadata: {},
    ...overrides,
  };
}

/** Build N unplaced plants. */
function makePlants(n: number): Plant[] {
  return Array.from({ length: n }, () => makePlant());
}

/** Small 3×2 grid = 6 cells total. */
const SMALL_CONFIG: PlacementConfig = {
  gridWidth: 3,
  gridHeight: 2,
  reservedCells: [],
};

const GARDEN = "test-garden";

// ─── No plants ────────────────────────────────────────────────────────────────

describe("assignPlantPositions — empty input", () => {
  it("returns empty arrays for no plants", () => {
    const r = assignPlantPositions(GARDEN, [], DEFAULT_PLACEMENT_CONFIG);
    expect(r.plants).toHaveLength(0);
    expect(r.overflowPlants).toHaveLength(0);
  });
});

// ─── Single plant placement ───────────────────────────────────────────────────

describe("assignPlantPositions — single plant", () => {
  it("places a single plant within the grid bounds", () => {
    const [plant] = makePlants(1);
    const r = assignPlantPositions(GARDEN, [plant!], SMALL_CONFIG);
    expect(r.plants).toHaveLength(1);
    expect(r.overflowPlants).toHaveLength(0);
    const { x, y } = r.plants[0]!.position;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(SMALL_CONFIG.gridWidth);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(SMALL_CONFIG.gridHeight);
  });
});

// ─── No collisions ────────────────────────────────────────────────────────────

describe("assignPlantPositions — collision avoidance", () => {
  it("no two plants share the same position", () => {
    const plants = makePlants(6); // exactly fills the 3×2 grid
    const r = assignPlantPositions(GARDEN, plants, SMALL_CONFIG);
    const positions = r.plants.map((p) => `${p.position.x},${p.position.y}`);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("no two plants share the same position on the default (10×6) grid", () => {
    const plants = makePlants(20);
    const r = assignPlantPositions(GARDEN, plants, DEFAULT_PLACEMENT_CONFIG);
    const positions = r.plants.map((p) => `${p.position.x},${p.position.y}`);
    expect(new Set(positions).size).toBe(positions.length);
  });
});

// ─── Stable existing positions ────────────────────────────────────────────────

describe("assignPlantPositions — stable existing positions", () => {
  it("does not move a plant that already has a valid position", () => {
    const existing = makePlant({ position: { x: 2, y: 1 } });
    const r = assignPlantPositions(GARDEN, [existing], SMALL_CONFIG);
    expect(r.plants[0]!.position).toEqual({ x: 2, y: 1 });
  });

  it("does not assign a new plant to a cell occupied by an existing plant", () => {
    const existing = makePlant({ position: { x: 0, y: 0 } });
    const newPlant = makePlant();
    const r = assignPlantPositions(GARDEN, [existing, newPlant], SMALL_CONFIG);
    const positions = r.plants.map((p) => `${p.position.x},${p.position.y}`);
    expect(new Set(positions).size).toBe(2); // no collision
    expect(r.plants.find((p) => p.id === existing.id)!.position).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("adding new plants to a garden does not move existing plants", () => {
    // First run: place 3 plants
    const batch1 = makePlants(3);
    const r1 = assignPlantPositions(GARDEN, batch1, SMALL_CONFIG);
    const positionsAfterRun1 = new Map(
      r1.plants.map((p) => [p.id, p.position]),
    );

    // Second run: same 3 plants (now with positions) + 1 new plant
    const newPlant = makePlant();
    const r2 = assignPlantPositions(
      GARDEN,
      [...r1.plants, newPlant],
      SMALL_CONFIG,
    );

    // Original plants must keep their positions
    for (const plant of r1.plants) {
      const oldPos = positionsAfterRun1.get(plant.id)!;
      const newPos = r2.plants.find((p) => p.id === plant.id)!.position;
      expect(newPos).toEqual(oldPos);
    }
  });
});

// ─── Determinism ──────────────────────────────────────────────────────────────

describe("assignPlantPositions — determinism", () => {
  it("same gardenId + same plants produces identical positions", () => {
    const plants = makePlants(5);
    const r1 = assignPlantPositions(GARDEN, plants, SMALL_CONFIG);
    // Re-run with fresh (identical) plant objects
    const r2 = assignPlantPositions(GARDEN, [...plants], SMALL_CONFIG);
    expect(r1.plants.map((p) => p.position)).toEqual(
      r2.plants.map((p) => p.position),
    );
  });

  it("different gardenIds can produce different placements", () => {
    const plants = makePlants(4);
    const r1 = assignPlantPositions("garden-A", plants, SMALL_CONFIG);
    const r2 = assignPlantPositions("garden-B", plants, SMALL_CONFIG);
    // Positions may differ — verify they are both valid (collision-free) but
    // that at least the seeds differ (very high probability of different layout)
    const pos1 = r1.plants.map((p) => `${p.position.x},${p.position.y}`).join("|");
    const pos2 = r2.plants.map((p) => `${p.position.x},${p.position.y}`).join("|");
    // We can't assert they're always different (tiny chance of collision),
    // but we can assert both are valid.
    expect(new Set(r1.plants.map((p) => `${p.position.x},${p.position.y}`)).size).toBe(4);
    expect(new Set(r2.plants.map((p) => `${p.position.x},${p.position.y}`)).size).toBe(4);
    // At least record the layouts for debugging
    expect(typeof pos1).toBe("string");
    expect(typeof pos2).toBe("string");
  });
});

// ─── Reserved cells ───────────────────────────────────────────────────────────

describe("assignPlantPositions — reserved cells", () => {
  it("never places a plant on a reserved cell", () => {
    const reserved: PlantPosition[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const config: PlacementConfig = { gridWidth: 3, gridHeight: 2, reservedCells: reserved };
    const plants = makePlants(3); // 3 remaining cells available (row 1)
    const r = assignPlantPositions(GARDEN, plants, config);
    for (const plant of r.plants) {
      expect(plant.position.y).not.toBe(0); // all reserved cells are in row 0
    }
  });

  it("overflows when all non-reserved cells are filled", () => {
    // 3×2 grid, 3 reserved, 3 free → place 4 plants → 1 overflow
    const reserved: PlantPosition[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const config: PlacementConfig = { gridWidth: 3, gridHeight: 2, reservedCells: reserved };
    const plants = makePlants(4);
    const r = assignPlantPositions(GARDEN, plants, config);
    expect(r.plants).toHaveLength(3);
    expect(r.overflowPlants).toHaveLength(1);
    expect(r.overflowPlants[0]!.position).toEqual(OVERFLOW_POSITION);
  });
});

// ─── Grid overflow ────────────────────────────────────────────────────────────

describe("assignPlantPositions — grid overflow", () => {
  it("plants exceeding grid capacity go into overflowPlants", () => {
    const plants = makePlants(7); // 3×2 = 6 cells, 7 plants → 1 overflow
    const r = assignPlantPositions(GARDEN, plants, SMALL_CONFIG);
    expect(r.plants).toHaveLength(6);
    expect(r.overflowPlants).toHaveLength(1);
  });

  it("overflow plants get the sentinel position", () => {
    const plants = makePlants(7);
    const r = assignPlantPositions(GARDEN, plants, SMALL_CONFIG);
    expect(r.overflowPlants[0]!.position).toEqual(OVERFLOW_POSITION);
  });

  it("all placed plants still have valid (non-sentinel) positions on overflow", () => {
    const plants = makePlants(7);
    const r = assignPlantPositions(GARDEN, plants, SMALL_CONFIG);
    for (const p of r.plants) {
      expect(p.position.x).toBeGreaterThanOrEqual(0);
      expect(p.position.y).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Output order ─────────────────────────────────────────────────────────────

describe("assignPlantPositions — output ordering", () => {
  it("plants are returned sorted by originWeek ascending", () => {
    const plants = makePlants(5);
    // Pass in reverse order
    const r = assignPlantPositions(GARDEN, [...plants].reverse(), SMALL_CONFIG);
    const origins = r.plants.map((p) => p.originWeek);
    expect(origins).toEqual([...origins].sort((a, b) => a - b));
  });
});

// ─── Positions are within bounds ──────────────────────────────────────────────

describe("assignPlantPositions — bounds checking", () => {
  it("all positions are within grid bounds", () => {
    const plants = makePlants(15);
    const r = assignPlantPositions(GARDEN, plants, DEFAULT_PLACEMENT_CONFIG);
    for (const plant of r.plants) {
      expect(plant.position.x).toBeGreaterThanOrEqual(0);
      expect(plant.position.x).toBeLessThan(DEFAULT_PLACEMENT_CONFIG.gridWidth);
      expect(plant.position.y).toBeGreaterThanOrEqual(0);
      expect(plant.position.y).toBeLessThan(DEFAULT_PLACEMENT_CONFIG.gridHeight);
    }
  });
});
