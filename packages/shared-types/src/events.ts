/**
 * Garden domain events.
 *
 * Events are immutable records of things that already happened.
 * They are used for animations, notifications, activity history,
 * debugging, and future replay functionality.
 *
 * Every event carries:
 *   - `type`        — a discriminant string (SCREAMING_SNAKE_CASE)
 *   - `occurredAt`  — ISO-8601 timestamp of when the event was generated
 */

import type { GrowthStage } from "./garden.js";

export type PlantPlantedEvent = {
  type: "PLANT_PLANTED";
  plantId: string;
  speciesId: string;
  originWeek: number;
  occurredAt: string; // ISO-8601
};

export type PlantGrewEvent = {
  type: "PLANT_GREW";
  plantId: string;
  previousStage: GrowthStage;
  newStage: GrowthStage;
  occurredAt: string;
};

export type PlantFloweredEvent = {
  type: "PLANT_FLOWERED";
  plantId: string;
  occurredAt: string;
};

export type CreatureUnlockedEvent = {
  type: "CREATURE_UNLOCKED";
  creatureId: string;
  occurredAt: string;
};

export type DecorationUnlockedEvent = {
  type: "DECORATION_UNLOCKED";
  decorationId: string;
  occurredAt: string;
};

export type StreakMilestoneReachedEvent = {
  type: "STREAK_MILESTONE_REACHED";
  milestone: number; // consecutive active weeks at the time of the event
  occurredAt: string;
};

export type GardenRecoveredEvent = {
  type: "GARDEN_RECOVERED";
  previousStreak: number;
  occurredAt: string;
};

export type NewWeekStartedEvent = {
  type: "NEW_WEEK_STARTED";
  weekStart: string; // YYYY-MM-DD
  occurredAt: string;
};

/**
 * Discriminated union of all garden events.
 * Consumers should switch/narrow on `event.type`.
 */
export type GardenEvent =
  | PlantPlantedEvent
  | PlantGrewEvent
  | PlantFloweredEvent
  | CreatureUnlockedEvent
  | DecorationUnlockedEvent
  | StreakMilestoneReachedEvent
  | GardenRecoveredEvent
  | NewWeekStartedEvent;

/** All valid event type strings — useful for exhaustiveness checks. */
export type GardenEventType = GardenEvent["type"];
