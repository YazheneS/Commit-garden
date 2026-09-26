/**
 * Garden Animation System
 *
 * Provides lightweight, pure mathematical animation calculations for:
 *   - Plant idle sway
 *   - Plant growth transitions
 *   - Ambient creatures (butterflies in day, fireflies at night)
 *   - Day/night lighting and color states
 *
 * Designed to run smoothly with negligible CPU and no DOM/canvas coupling.
 */

import type {
  CreatureKind,
  DayNightState,
  RenderCreature,
  RenderGrowthStage,
  RenderPlant,
  TimeOfDay,
} from "./types.js";

// ─── Day / Night Cycle ────────────────────────────────────────────────────────

/**
 * Computes the DayNightState for a given Date or decimal hour (0.0 to 24.0).
 */
export function getDayNightState(dateOrHour: Date | number): DayNightState {
  let hour: number;
  if (typeof dateOrHour === "number") {
    hour = ((dateOrHour % 24) + 24) % 24;
  } else {
    hour =
      dateOrHour.getHours() +
      dateOrHour.getMinutes() / 60 +
      dateOrHour.getSeconds() / 3600;
  }

  const progress = hour / 24;

  let timeOfDay: TimeOfDay;
  let ambientColor: string;
  let ambientIntensity: number;
  let overlayOpacity: number;

  if (hour >= 5 && hour < 8) {
    timeOfDay = "DAWN";
    ambientColor = "#E8D0D8";
    ambientIntensity = 0.7;
    overlayOpacity = 0.2;
  } else if (hour >= 8 && hour < 18) {
    timeOfDay = "DAY";
    ambientColor = "#FFFFFF";
    ambientIntensity = 1.0;
    overlayOpacity = 0.0;
  } else if (hour >= 18 && hour < 21) {
    timeOfDay = "DUSK";
    ambientColor = "#FFAE66";
    ambientIntensity = 0.75;
    overlayOpacity = 0.25;
  } else {
    timeOfDay = "NIGHT";
    ambientColor = "#1B2040";
    ambientIntensity = 0.35;
    overlayOpacity = 0.5;
  }

  return {
    timeOfDay,
    progress,
    ambientColor,
    ambientIntensity,
    overlayOpacity,
  };
}

// ─── Plant Idle Sway ──────────────────────────────────────────────────────────

export type PlantSway = {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly rotationRad: number;
};

/**
 * Calculates a gentle, deterministic sway offset for plants.
 *
 * Seed and sprout stages do not sway.
 * Mature and tree species have subtle horizontal movement.
 * Phase offset is keyed on plant position so neighboring plants do not move in lockstep.
 */
export function samplePlantSway(
  plant: RenderPlant,
  elapsedMs: number,
  options?: { swayAmount?: number; speed?: number },
): PlantSway {
  // Seeds and sprouts stay firmly still
  if (plant.growthStage === "SEED" || plant.growthStage === "SPROUT") {
    return { offsetX: 0, offsetY: 0, rotationRad: 0 };
  }

  // Wilted and dormant plants droop rather than swaying
  if (plant.health === "WILTED") {
    return { offsetX: 0, offsetY: 1, rotationRad: 0.02 };
  }
  if (plant.health === "DORMANT") {
    return { offsetX: 0, offsetY: 1.5, rotationRad: 0 };
  }

  const baseAmount = options?.swayAmount ?? (plant.growthStage === "YOUNG" ? 0.6 : 1.2);
  const speed = options?.speed ?? 0.8;

  // Position-derived phase offset prevents uniform synchronous swaying
  const phase = (plant.col * 1.7 + plant.row * 2.3) % (Math.PI * 2);
  const t = (Math.max(0, elapsedMs) / 1000) * Math.PI * speed + phase;

  const sway = Math.sin(t);
  const offsetX = Math.round(sway * baseAmount * 10) / 10;
  const offsetY = Math.round(Math.abs(sway) * (baseAmount * 0.25) * 10) / 10;
  const rotationRad = Math.round(sway * 0.03 * 1000) / 1000;

  return { offsetX, offsetY, rotationRad };
}

// ─── Plant Growth Animation ───────────────────────────────────────────────────

export type GrowthAnimation = {
  readonly plantId: string;
  readonly fromStage: RenderGrowthStage;
  readonly toStage: RenderGrowthStage;
  readonly startTimeMs: number;
  readonly durationMs: number;
};

export type GrowthSample = {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetY: number;
  readonly progress: number;
  readonly isComplete: boolean;
};

/**
 * Creates a growth animation tracker for a plant advancing stages.
 */
export function createGrowthAnimation(
  plantId: string,
  fromStage: RenderGrowthStage,
  toStage: RenderGrowthStage,
  startTimeMs = 0,
  durationMs = 800,
): GrowthAnimation {
  return {
    plantId,
    fromStage,
    toStage,
    startTimeMs,
    durationMs: Math.max(1, durationMs),
  };
}

/**
 * Samples a plant growth animation, applying a subtle overshoot "pop" effect.
 */
export function sampleGrowthAnimation(
  anim: GrowthAnimation,
  currentTimeMs: number,
): GrowthSample {
  const elapsed = Math.max(0, currentTimeMs - anim.startTimeMs);
  const rawProgress = Math.min(1, elapsed / anim.durationMs);

  if (rawProgress >= 1) {
    return {
      scaleX: 1.0,
      scaleY: 1.0,
      offsetY: 0.0,
      progress: 1.0,
      isComplete: true,
    };
  }

  // Overshoot ease: rises and bounces gently into place
  const bounce = Math.sin(rawProgress * Math.PI) * (1 - rawProgress);
  const scaleX = Math.round((1.0 - bounce * 0.15) * 100) / 100;
  const scaleY = Math.round((1.0 + bounce * 0.3) * 100) / 100;
  const offsetY = Math.round(-bounce * 3 * 10) / 10;

  return {
    scaleX,
    scaleY,
    offsetY,
    progress: rawProgress,
    isComplete: false,
  };
}

// ─── Ambient Creatures (Butterfly & Firefly) ──────────────────────────────────

export type CreaturePath = {
  readonly id: string;
  readonly kind: CreatureKind;
  readonly originX: number;
  readonly originY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly speed: number;
};

/**
 * Creates a butterfly wandering path around a central anchor.
 */
export function createButterfly(
  id: string,
  originX: number,
  originY: number,
  speed = 1.0,
): CreaturePath {
  return {
    id,
    kind: "BUTTERFLY",
    originX,
    originY,
    radiusX: 24,
    radiusY: 14,
    speed,
  };
}

/**
 * Creates a firefly hovering path around a central anchor.
 */
export function createFirefly(
  id: string,
  originX: number,
  originY: number,
  speed = 0.7,
): CreaturePath {
  return {
    id,
    kind: "FIREFLY",
    originX,
    originY,
    radiusX: 16,
    radiusY: 16,
    speed,
  };
}

/**
 * Samples a creature's world position, animation frame, and opacity at a given time.
 */
export function sampleCreature(
  path: CreaturePath,
  elapsedMs: number,
): RenderCreature {
  const t = (Math.max(0, elapsedMs) / 1000) * path.speed;

  if (path.kind === "BUTTERFLY") {
    // Graceful figure-8 trajectory
    const worldX = Math.round(path.originX + Math.sin(t) * path.radiusX);
    const worldY = Math.round(path.originY + Math.sin(t * 2) * 0.5 * path.radiusY);
    // Rapid wing flap: alternates between frame 0 and 1 every 150ms
    const frame = Math.floor(Math.max(0, elapsedMs) / 150) % 2;

    return {
      id: path.id,
      kind: "BUTTERFLY",
      worldX,
      worldY,
      frame,
      alpha: 1.0,
      assetKey: "creature.butterfly",
    };
  }

  // Firefly: gentle wandering drift with breathing glow
  const worldX = Math.round(path.originX + Math.sin(t * 0.7) * path.radiusX);
  const worldY = Math.round(path.originY + Math.cos(t * 0.5) * path.radiusY);
  // Pulsing glow alpha between 0.3 and 1.0
  const alpha = Math.round((0.65 + Math.sin(t * 3) * 0.35) * 100) / 100;
  // Frame 2 or 3 in creatures.png
  const frame = 2 + (Math.floor(Math.max(0, elapsedMs) / 350) % 2);

  return {
    id: path.id,
    kind: "FIREFLY",
    worldX,
    worldY,
    frame,
    alpha,
    assetKey: "creature.firefly",
  };
}

/**
 * Updates a list of creature paths, filtering them based on time-of-day visibility.
 * Butterflies are active during DAWN, DAY, and DUSK.
 * Fireflies are active during DUSK and NIGHT.
 */
export function updateCreatures(
  paths: readonly CreaturePath[],
  elapsedMs: number,
  timeOfDay: TimeOfDay,
): RenderCreature[] {
  const result: RenderCreature[] = [];

  for (const path of paths) {
    if (path.kind === "BUTTERFLY") {
      if (timeOfDay === "DAY" || timeOfDay === "DAWN" || timeOfDay === "DUSK") {
        result.push(sampleCreature(path, elapsedMs));
      }
    } else if (path.kind === "FIREFLY") {
      if (timeOfDay === "NIGHT" || timeOfDay === "DUSK") {
        result.push(sampleCreature(path, elapsedMs));
      }
    }
  }

  return result;
}
