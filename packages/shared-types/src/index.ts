/**
 * shared-types — public API
 *
 * All domain contracts are re-exported from here.
 * Consumers import from "@commit-garden/shared-types", never from sub-paths.
 */

export type { User } from "./user.js";

export type {
  Garden,
  GrowthStage,
  PlantHealthState,
  Plant,
  PlantPosition,
  PlantSpecies,
} from "./garden.js";

export type { DailyActivity, WeeklyActivity } from "./activity.js";

export type {
  GardenEvent,
  GardenEventType,
  PlantPlantedEvent,
  PlantGrewEvent,
  PlantFloweredEvent,
  CreatureUnlockedEvent,
  DecorationUnlockedEvent,
  StreakMilestoneReachedEvent,
  GardenRecoveredEvent,
  NewWeekStartedEvent,
} from "./events.js";

export type {
  AchievementReward,
  AchievementDefinition,
  Achievement,
} from "./achievement.js";

// Runtime type guards (not type-only — these are real values)
export {
  isCalendarDate,
  isIsoTimestamp,
  isGrowthStage,
  isPlantHealthState,
  isDailyActivity,
  isWeeklyActivity,
  isGardenEventType,
  isGardenEvent,
} from "./guards.js";
