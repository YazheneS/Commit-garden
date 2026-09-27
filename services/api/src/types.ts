import type {
  GardenView,
  WeeklyActivity,
} from "@commit-garden/shared-types";

export type { GardenProgress, GardenView } from "@commit-garden/shared-types";

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
  readonly headers?: Readonly<Record<string, string | readonly string[]>>;
};
