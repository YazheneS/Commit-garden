import type {
  Achievement,
  Garden,
  GardenEvent,
  Plant,
  User,
  WeeklyActivity,
} from "@commit-garden/shared-types";

export type GardenView = {
  readonly user: User;
  readonly garden: Garden & { readonly gardenVersion: number };
  readonly plants: readonly Plant[];
  readonly events: readonly GardenEvent[];
  readonly achievements: readonly Achievement[];
};

export type GardenProgress = {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly activeWeeks: number;
  readonly gardenVersion: number;
  readonly nextMilestone: number | null;
};

export type SyncInput = {
  readonly activityHistoryHash: string;
  readonly weeks: readonly WeeklyActivity[];
  readonly now: Date;
};

export type SyncResult = {
  readonly garden: GardenView;
  readonly createdPlantIds: readonly string[];
  readonly createdEventIds: readonly string[];
  readonly alreadyApplied: boolean;
};

export type ApiRequest = {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
};

export type ApiResponse = {
  readonly status: number;
  readonly body: unknown;
};
