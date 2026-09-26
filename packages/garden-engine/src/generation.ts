/**
 * Plant Generation
 *
 * Creates new Plant objects when the user's activity history reaches
 * configured milestone thresholds.
 *
 * Invariants:
 *   - Deterministic: same gardenId + same history → same plants.
 *   - Idempotent: running generation twice never produces duplicate plants.
 *     A plant is keyed by (gardenId, originWeek); if that key already exists
 *     in existingPlants, no new plant is created.
 *   - Configurable: milestone thresholds live in GenerationConfig, not here.
 *   - Seeded: species selection uses a PRNG seeded from (gardenId + originWeek)
 *     so the choice is stable across re-runs.
 */

import type { Plant, WeeklyActivity } from "@commit-garden/shared-types";
import { getAllSpecies } from "./progression.js";
import { createRng, seedFromString } from "./prng.js";

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * A single milestone entry: when `activeWeeks` consecutive active weeks have
 * been reached, generate a new plant.
 *
 * `speciesPool` optionally constrains which species can be generated at this
 * milestone.  When omitted, any registered species may be chosen.
 */
export type MilestoneConfig = {
  /** Total active-week count (not streak) that triggers this milestone. */
  activeWeeks: number;
  /** Optional whitelist of species ids eligible at this milestone. */
  speciesPool?: readonly string[];
};

export type GenerationConfig = {
  milestones: readonly MilestoneConfig[];
};

/**
 * Default progression table from the PRD.
 * These are examples — they live here as config, not hard-coded UI rules.
 */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  milestones: [
    { activeWeeks: 1 },   // first seed
    { activeWeeks: 5 },   // new seed
    { activeWeeks: 8 },   // flower
    { activeWeeks: 12 },  // new species
    { activeWeeks: 16 },  // tree
    { activeWeeks: 20 },  // creature
    { activeWeeks: 26 },  // garden decoration
    { activeWeeks: 52 },  // major ecosystem unlock
  ],
};

// ─── Generation result ────────────────────────────────────────────────────────

export type GenerationResult = {
  /** Newly created plants (not yet in the garden). */
  newPlants: Plant[];
  /** Milestone active-week counts that were triggered this run. */
  triggeredMilestones: number[];
};

// ─── Core implementation ──────────────────────────────────────────────────────

/**
 * Generate new plants based on the user's weekly activity history.
 *
 * @param gardenId       The garden's stable identifier — used as part of the
 *                       deterministic seed so different gardens diverge.
 * @param weeks          Sorted weekly activity (output of normalizeActivity).
 * @param existingPlants Plants already in the garden.
 * @param config         Generation config (milestones).
 *
 * @returns New plants to add and the milestones that fired.
 */
export function generatePlants(
  gardenId: string,
  weeks: readonly WeeklyActivity[],
  existingPlants: readonly Plant[],
  config: GenerationConfig = DEFAULT_GENERATION_CONFIG,
): GenerationResult {
  // Build a set of already-generated originWeeks for O(1) lookup.
  const existingOriginWeeks = new Set(existingPlants.map((p) => p.originWeek));

  // Count total active weeks (index into milestones).
  // We walk the weeks in order and track the cumulative active-week count.
  // For each active week, we check if its cumulative count hits a milestone
  // that has not yet been generated.

  // Build a lookup: milestone activeWeeks → MilestoneConfig
  const milestoneMap = new Map<number, MilestoneConfig>();
  for (const m of config.milestones) {
    milestoneMap.set(m.activeWeeks, m);
  }

  const newPlants: Plant[] = [];
  const triggeredMilestones: number[] = [];

  let cumulativeActiveWeeks = 0;

  for (const week of weeks) {
    if (!week.isActive) continue;

    cumulativeActiveWeeks++;

    const milestone = milestoneMap.get(cumulativeActiveWeeks);
    if (!milestone) continue;

    // This week hits a milestone. Check idempotency guard.
    if (existingOriginWeeks.has(cumulativeActiveWeeks)) continue;

    // Select species deterministically.
    const speciesId = pickSpecies(
      gardenId,
      cumulativeActiveWeeks,
      milestone.speciesPool,
    );

    // Build plant id deterministically.
    const plantId = deterministicId(gardenId, cumulativeActiveWeeks);

    const plant: Plant = {
      id: plantId,
      gardenId,
      speciesId,
      growthStage: "SEED",
      position: { x: 0, y: 0 }, // placement is handled by TASK-007
      health: "HEALTHY",
      plantedAt: week.weekStart + "T00:00:00.000Z",
      originWeek: cumulativeActiveWeeks,
      metadata: {},
    };

    newPlants.push(plant);
    existingOriginWeeks.add(cumulativeActiveWeeks); // prevent double-gen in same run
    triggeredMilestones.push(cumulativeActiveWeeks);
  }

  return { newPlants, triggeredMilestones };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Pick a species id deterministically using the garden+week as seed.
 * If speciesPool is provided, only those species are eligible.
 * Falls back to all registered species if the pool is empty or invalid.
 */
function pickSpecies(
  gardenId: string,
  originWeek: number,
  speciesPool: readonly string[] | undefined,
): string {
  const allSpecies = getAllSpecies();
  const allIds = allSpecies.map((s) => s.id);

  let eligible: string[];
  if (speciesPool && speciesPool.length > 0) {
    eligible = speciesPool.filter((id) => allIds.includes(id));
  } else {
    eligible = allIds;
  }

  if (eligible.length === 0) eligible = allIds;
  if (eligible.length === 0) return "oak"; // ultimate fallback

  const seed = seedFromString(`${gardenId}:${originWeek}`);
  const rng = createRng(seed);
  return rng.pick(eligible);
}

/**
 * Generate a stable, unique plant id from garden + week.
 * Format: "plant-{gardenId}-w{originWeek}"
 * Simple and debuggable.
 */
function deterministicId(gardenId: string, originWeek: number): string {
  return `plant-${gardenId}-w${originWeek}`;
}
