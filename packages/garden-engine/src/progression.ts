/**
 * Plant Progression
 *
 * Data-driven growth stage system.  All progression rules live in species
 * definitions — nothing is hard-coded in UI or API layers.
 *
 * Design rules:
 *   - Species define their own ordered stage path (subset of GrowthStage).
 *   - A plant at its final stage cannot advance further (it is "complete").
 *   - Health state transitions are separate from growth stage transitions.
 *   - All functions are pure; no mutation of input objects.
 */

import type {
  Plant,
  PlantSpecies,
  GrowthStage,
  PlantHealthState,
} from "@commit-garden/shared-types";

// ─── Species registry ─────────────────────────────────────────────────────────

/**
 * The default built-in species.  Populated here so the engine can function
 * without any external configuration.  Additional species can be registered
 * at runtime via the registry API.
 *
 * Species must not be mutated after registration.
 */
const DEFAULT_SPECIES: readonly PlantSpecies[] = [
  {
    id: "oak",
    name: "Oak Tree",
    description: "A sturdy oak that grows slowly but lasts forever.",
    stages: ["SEED", "SPROUT", "YOUNG", "MATURE", "FLOWERING", "SPECIAL"],
  },
  {
    id: "cherry",
    name: "Cherry Blossom",
    description: "Blooms beautifully after sustained effort.",
    stages: ["SEED", "SPROUT", "YOUNG", "MATURE", "FLOWERING"],
  },
  {
    id: "mushroom",
    name: "Mushroom",
    description: "Grows quickly in short bursts.",
    stages: ["SEED", "SPROUT", "MATURE", "SPECIAL"],
  },
  {
    id: "cactus",
    name: "Cactus",
    description: "Resilient. Survives long dry spells.",
    stages: ["SEED", "YOUNG", "MATURE", "FLOWERING"],
  },
  {
    id: "flower",
    name: "Wildflower",
    description: "Small and cheerful.",
    stages: ["SEED", "SPROUT", "FLOWERING"],
  },
];

/** Mutable registry (private to this module). */
const registry = new Map<string, PlantSpecies>(
  DEFAULT_SPECIES.map((s) => [s.id, s]),
);

/**
 * Look up a species by id.  Returns undefined if not found.
 */
export function getSpecies(speciesId: string): PlantSpecies | undefined {
  return registry.get(speciesId);
}

/**
 * Register a custom species.  Overwrites any existing species with the same id.
 * Useful for testing and for future data-driven species loading.
 */
export function registerSpecies(species: PlantSpecies): void {
  registry.set(species.id, species);
}

/**
 * Return all registered species (sorted by id for determinism).
 */
export function getAllSpecies(): PlantSpecies[] {
  return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// ─── Stage progression ────────────────────────────────────────────────────────

/**
 * Return the next growth stage for a plant, or null if it is already at its
 * final stage or if the species is unknown.
 */
export function getNextStage(plant: Plant): GrowthStage | null {
  const species = registry.get(plant.speciesId);
  if (!species) return null;

  const currentIndex = species.stages.indexOf(plant.growthStage);
  if (currentIndex === -1) return null; // stage not in this species' path
  if (currentIndex >= species.stages.length - 1) return null; // already final

  return species.stages[currentIndex + 1] ?? null;
}

/**
 * Whether a plant can advance to the next growth stage.
 */
export function canAdvance(plant: Plant): boolean {
  return getNextStage(plant) !== null;
}

/**
 * Return a new Plant with its growthStage advanced by one step.
 * Throws if the plant cannot advance (caller should check canAdvance first).
 */
export function advancePlantStage(plant: Plant): Plant {
  const next = getNextStage(plant);
  if (next === null) {
    throw new Error(
      `Plant "${plant.id}" (species "${plant.speciesId}", stage "${plant.growthStage}") cannot advance further.`,
    );
  }
  return { ...plant, growthStage: next };
}

/**
 * Return the index of a growth stage within a species' stage path, or -1.
 * Useful for progress calculations (e.g. "2 of 5 stages").
 */
export function getStageIndex(plant: Plant): number {
  const species = registry.get(plant.speciesId);
  if (!species) return -1;
  return species.stages.indexOf(plant.growthStage);
}

/**
 * Whether the plant is at its final growth stage for its species.
 */
export function isAtFinalStage(plant: Plant): boolean {
  const species = registry.get(plant.speciesId);
  if (!species) return false;
  return (
    plant.growthStage === species.stages[species.stages.length - 1]
  );
}

// ─── Health state transitions ─────────────────────────────────────────────────

/**
 * Health transition table.
 *
 * Each entry maps a current health state to the state it transitions to when
 * a streak break is applied.  Plants do not die — they wilt or go dormant.
 */
const STREAK_BREAK_TRANSITIONS: Readonly<Record<PlantHealthState, PlantHealthState>> = {
  HEALTHY: "WILTED",
  WILTED: "DORMANT",
  DORMANT: "DORMANT", // already at floor — stays dormant
  RECOVERING: "WILTED",
};

/**
 * Recovery transition table.
 *
 * Applied when the user resumes coding after a break.
 */
const RECOVERY_TRANSITIONS: Readonly<Record<PlantHealthState, PlantHealthState>> = {
  DORMANT: "RECOVERING",
  WILTED: "RECOVERING",
  RECOVERING: "HEALTHY",
  HEALTHY: "HEALTHY", // no-op: already healthy
};

/**
 * Return a new Plant with health degraded one step due to a streak break.
 * Plants never die — they bottom out at DORMANT.
 */
export function applyStreakBreak(plant: Plant): Plant {
  const nextHealth = STREAK_BREAK_TRANSITIONS[plant.health];
  return { ...plant, health: nextHealth };
}

/**
 * Return a new Plant with health improved one step due to returning activity.
 * Full recovery (DORMANT → RECOVERING → HEALTHY) takes two consecutive
 * active weeks.
 */
export function applyRecovery(plant: Plant): Plant {
  const nextHealth = RECOVERY_TRANSITIONS[plant.health];
  return { ...plant, health: nextHealth };
}
