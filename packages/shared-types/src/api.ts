import type { Achievement } from "./achievement.js";
import type { GardenEvent } from "./events.js";
import type { Garden, Plant } from "./garden.js";
import type { User } from "./user.js";

/** Canonical garden response returned by the authenticated GET /garden route. */
export type GardenView = {
  readonly user: User;
  readonly garden: Garden & { readonly gardenVersion: number };
  readonly plants: readonly Plant[];
  readonly events: readonly GardenEvent[];
  readonly achievements: readonly Achievement[];
};

/** Canonical progress response returned by GET /garden/progress. */
export type GardenProgress = {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly activeWeeks: number;
  readonly gardenVersion: number;
  readonly nextMilestone: number | null;
};
