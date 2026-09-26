/**
 * Garden state.
 *
 * The canonical, persisted representation of a user's garden.
 * `progressionVersion` guards against rule-change regressions —
 * existing gardens must not silently change when progression rules evolve.
 */
export type Garden = {
  id: string;
  userId: string;
  currentStreak: number;   // consecutive active weeks right now
  longestStreak: number;   // all-time best consecutive active weeks
  activeWeeks: number;     // total active weeks ever
  progressionVersion: number;
  lastSyncedAt: string | null; // ISO-8601, null before first sync
};

/**
 * Plant growth stages, ordered from earliest to latest.
 * Species-specific paths are expressed via PlantSpecies.stages.
 */
export type GrowthStage =
  | "SEED"
  | "SPROUT"
  | "YOUNG"
  | "MATURE"
  | "FLOWERING"
  | "SPECIAL";

/**
 * Plant health states.
 *
 * A broken streak does not destroy plants — it transitions them toward
 * DORMANT/WILTED; returning activity restores them.
 */
export type PlantHealthState =
  | "HEALTHY"
  | "WILTED"
  | "DORMANT"
  | "RECOVERING";

/**
 * A single plant living in the garden.
 */
export type Plant = {
  id: string;
  gardenId: string;
  speciesId: string;        // references PlantSpecies.id
  growthStage: GrowthStage;
  position: PlantPosition;
  health: PlantHealthState;
  plantedAt: string;        // ISO-8601
  originWeek: number;       // active-week index when the plant was created
  metadata: Record<string, unknown>;
};

/**
 * A grid coordinate within the garden canvas.
 */
export type PlantPosition = {
  x: number;
  y: number;
};

/**
 * Describes a species of plant — its display name and the ordered list of
 * growth stages it passes through.
 */
export type PlantSpecies = {
  id: string;
  name: string;
  stages: readonly GrowthStage[];
  description: string;
};
