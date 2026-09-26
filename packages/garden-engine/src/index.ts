/**
 * garden-engine — public API
 *
 * The source of truth for all garden progression logic.
 * No React, React Native, browser APIs, or database clients may be imported
 * here; this package must remain a pure domain library.
 */

export { normalizeActivity } from "./normalizer.js";
export type { NormalizerConfig } from "./normalizer.js";

export { calculateStreak } from "./streak.js";
export type { StreakResult, StreakOptions } from "./streak.js";

export {
  getSpecies,
  registerSpecies,
  getAllSpecies,
  getNextStage,
  canAdvance,
  advancePlantStage,
  getStageIndex,
  isAtFinalStage,
  applyStreakBreak,
  applyRecovery,
} from "./progression.js";

export { createRng, seedFromString } from "./prng.js";
export type { Rng } from "./prng.js";

export { generatePlants, DEFAULT_GENERATION_CONFIG } from "./generation.js";
export type {
  MilestoneConfig,
  GenerationConfig,
  GenerationResult,
} from "./generation.js";

export {
  assignPlantPositions,
  DEFAULT_PLACEMENT_CONFIG,
  OVERFLOW_POSITION,
} from "./placement.js";
export type { PlacementConfig, PlacementResult } from "./placement.js";

export {
  makePlantPlantedEvent,
  makePlantGrewEvent,
  makePlantFloweredEvent,
  makeCreatureUnlockedEvent,
  makeDecorationUnlockedEvent,
  makeStreakMilestoneReachedEvent,
  makeGardenRecoveredEvent,
  makeNewWeekStartedEvent,
  deriveEvents,
  DEFAULT_STREAK_MILESTONES,
} from "./events.js";
export type {
  EventContext,
  GardenSnapshot,
  DeriveEventsOptions,
} from "./events.js";

export {
  getAchievementDefinition,
  registerAchievementDefinition,
  getAllAchievementDefinitions,
  evaluateAchievements,
} from "./achievements.js";
export type { EvaluationContext, EvaluationResult } from "./achievements.js";
