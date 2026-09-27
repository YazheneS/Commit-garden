import { MOCK_GARDEN_STATE } from "@commit-garden/garden-renderer";
import type { GardenRenderState } from "@commit-garden/garden-renderer";

export type DesktopTrayAction = {
  readonly id: "open" | "sync" | "quit";
  readonly label: string;
  readonly enabled: boolean;
};

export type DesktopGardenSnapshot = {
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly nextMilestone: number;
  readonly isSyncing: boolean;
  readonly isOffline: boolean;
  readonly garden: GardenRenderState;
};

export type DesktopNotification = {
  readonly title: string;
  readonly body: string;
  readonly severity: "info" | "success" | "warning";
};

export function createDesktopShell(): {
  readonly isOpen: boolean;
  readonly launchOnStartup: boolean;
  readonly hasGitHubConnection: boolean;
  readonly lastSyncAt: string | null;
} {
  return {
    isOpen: true,
    launchOnStartup: false,
    hasGitHubConnection: false,
    lastSyncAt: null,
  };
}

export function createTrayMenu(): readonly DesktopTrayAction[] {
  return [
    { id: "open", label: "Open Garden", enabled: true },
    { id: "sync", label: "Sync now", enabled: true },
    { id: "quit", label: "Quit", enabled: true },
  ];
}

export function createDesktopGardenSnapshot(
  currentStreak: number,
  activeWeeks: number,
  isSyncing: boolean,
  isOffline: boolean,
  garden: GardenRenderState = MOCK_GARDEN_STATE,
): DesktopGardenSnapshot {
  return {
    currentStreak,
    activeWeeks,
    nextMilestone: Math.max(1, 12 - activeWeeks),
    isSyncing,
    isOffline,
    garden,
  };
}

export function createMilestoneNotification(
  milestone: number,
  currentStreak: number,
): DesktopNotification {
  return {
    title: "Garden milestone reached",
    body: `You reached ${milestone} active weeks and your streak is ${currentStreak}.`,
    severity: "success",
  };
}

export function createOfflineCacheMessage(): DesktopNotification {
  return {
    title: "Offline mode",
    body: "Your cached garden is still available while GitHub sync reconnects.",
    severity: "warning",
  };
}

export default {
  createDesktopShell,
  createTrayMenu,
  createDesktopGardenSnapshot,
  createMilestoneNotification,
  createOfflineCacheMessage,
};
