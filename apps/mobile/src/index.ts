import { MOCK_GARDEN_STATE } from "@commit-garden/garden-renderer";
import type { GardenRenderState } from "@commit-garden/garden-renderer";

export type MobileTab = "garden" | "progress" | "history" | "settings";

export type MobileGardenSummary = {
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly nextMilestone: number;
  readonly summary: string;
  readonly garden: GardenRenderState;
};

export type WidgetSnapshot = {
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly nextMilestone: number;
  readonly headline: string;
};

export function createMobileTabs(): readonly MobileTab[] {
  return ["garden", "progress", "history", "settings"];
}

export function createMobileGardenSummary(
  currentStreak: number,
  activeWeeks: number,
  garden: GardenRenderState = MOCK_GARDEN_STATE,
): MobileGardenSummary {
  return {
    currentStreak,
    activeWeeks,
    nextMilestone: Math.max(1, 12 - activeWeeks),
    summary: `${activeWeeks} active weeks · ${currentStreak}-week streak`,
    garden,
  };
}

export function createWidgetSnapshot(
  currentStreak: number,
  activeWeeks: number,
): WidgetSnapshot {
  return {
    currentStreak,
    activeWeeks,
    nextMilestone: Math.max(1, 12 - activeWeeks),
    headline: `${activeWeeks} weeks · next plant in ${Math.max(1, 12 - activeWeeks)} week`,
  };
}

export function shouldRefreshWidget(
  previous: WidgetSnapshot,
  next: WidgetSnapshot,
  refreshIntervalMs: number,
  elapsedMs: number,
): boolean {
  if (elapsedMs < refreshIntervalMs) {
    return false;
  }

  return (
    previous.currentStreak !== next.currentStreak ||
    previous.activeWeeks !== next.activeWeeks ||
    previous.nextMilestone !== next.nextMilestone
  );
}

export function createMobileSyncPlan(): {
  readonly backendUrl: string;
  readonly shouldPullFreshData: boolean;
  readonly debounceMs: number;
} {
  return {
    backendUrl: "/garden",
    shouldPullFreshData: true,
    debounceMs: 3000,
  };
}

export default {
  createMobileTabs,
  createMobileGardenSummary,
  createWidgetSnapshot,
  shouldRefreshWidget,
  createMobileSyncPlan,
};
