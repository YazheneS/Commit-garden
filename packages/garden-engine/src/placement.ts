/**
 * Garden Placement
 *
 * Assigns grid positions to plants in a deterministic, collision-free,
 * stable manner.
 *
 * Invariants:
 *   - Existing plants keep their positions unchanged (stability).
 *   - Two plants never occupy the same cell (collision avoidance).
 *   - Same gardenId + same plant list → same positions (determinism).
 *   - Seeded PRNG per plant ensures positions look varied, not algorithmic.
 *   - Reserved cells (e.g. for decorations) are never assigned to plants.
 *   - Grid overflow produces a sentinel position {x:-1, y:-1} rather than
 *     throwing, so callers can handle it gracefully.
 */

import type { Plant, PlantPosition } from "@commit-garden/shared-types";
import { createRng, seedFromString } from "./prng.js";

// ─── Configuration ────────────────────────────────────────────────────────────

export type PlacementConfig = {
  /** Number of columns in the garden grid. */
  gridWidth: number;
  /** Number of rows in the garden grid. */
  gridHeight: number;
  /**
   * Cells permanently reserved for non-plant objects (decorations, paths…).
   * Plants will never be placed here.
   */
  reservedCells: readonly PlantPosition[];
};

export const DEFAULT_PLACEMENT_CONFIG: PlacementConfig = {
  gridWidth: 10,
  gridHeight: 6,
  reservedCells: [],
};

/** Sentinel value returned when no free cell is available. */
export const OVERFLOW_POSITION: PlantPosition = { x: -1, y: -1 };

// ─── Result type ──────────────────────────────────────────────────────────────

export type PlacementResult = {
  /** All plants with positions assigned (existing positions preserved). */
  plants: Plant[];
  /** Plants that could not be placed because the grid was full. */
  overflowPlants: Plant[];
};

// ─── Core implementation ──────────────────────────────────────────────────────

/**
 * Assign grid positions to a list of plants.
 *
 * @param gardenId        Used as part of the deterministic seed.
 * @param plants          All plants in the garden (existing + newly generated).
 *                        Plants that already have a valid position (x >= 0)
 *                        are left unchanged.
 * @param config          Grid dimensions and reserved cells.
 */
export function assignPlantPositions(
  gardenId: string,
  plants: readonly Plant[],
  config: PlacementConfig = DEFAULT_PLACEMENT_CONFIG,
): PlacementResult {
  const { gridWidth, gridHeight, reservedCells } = config;

  // Build a set of occupied cells from plants that already have valid positions.
  const occupied = new Set<string>();

  // Build the reserved cell set.
  const reserved = new Set<string>(
    reservedCells.map((c) => cellKey(c.x, c.y)),
  );

  // Separate plants that already have a valid position from those that need one.
  const placed: Plant[] = [];
  const needsPlacement: Plant[] = [];

  for (const plant of plants) {
    if (isValidPosition(plant.position)) {
      placed.push(plant);
      occupied.add(cellKey(plant.position.x, plant.position.y));
    } else {
      needsPlacement.push(plant);
    }
  }

  // Sort plants needing placement by originWeek for deterministic ordering.
  needsPlacement.sort((a, b) => a.originWeek - b.originWeek);

  const overflowPlants: Plant[] = [];

  for (const plant of needsPlacement) {
    const position = findPosition(
      gardenId,
      plant.id,
      gridWidth,
      gridHeight,
      occupied,
      reserved,
    );

    if (position === null) {
      overflowPlants.push({ ...plant, position: OVERFLOW_POSITION });
    } else {
      occupied.add(cellKey(position.x, position.y));
      placed.push({ ...plant, position });
    }
  }

  // Return in originWeek order for stable output.
  placed.sort((a, b) => a.originWeek - b.originWeek);

  return { plants: placed, overflowPlants };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Find a free, non-reserved cell for a plant using seeded candidate shuffling.
 * Returns null if the grid is completely full.
 */
function findPosition(
  gardenId: string,
  plantId: string,
  gridWidth: number,
  gridHeight: number,
  occupied: ReadonlySet<string>,
  reserved: ReadonlySet<string>,
): PlantPosition | null {
  // Build the list of all candidate cells (free and not reserved).
  const candidates: PlantPosition[] = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const key = cellKey(x, y);
      if (!occupied.has(key) && !reserved.has(key)) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Shuffle candidates with a seed derived from garden + plant so the order
  // looks natural but is always the same for the same inputs.
  const seed = seedFromString(`${gardenId}:${plantId}:placement`);
  shuffleInPlace(candidates, seed);

  return candidates[0] ?? null;
}

/**
 * Fisher-Yates in-place shuffle using a seeded PRNG.
 */
function shuffleInPlace<T>(arr: T[], seed: number): void {
  const rng = createRng(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    // Swap arr[i] and arr[j]
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
}

/** Whether a position is a valid (non-sentinel, non-default) grid cell. */
function isValidPosition(pos: PlantPosition): boolean {
  return pos.x >= 0 && pos.y >= 0;
}

/** Stable string key for a grid cell. */
function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}
