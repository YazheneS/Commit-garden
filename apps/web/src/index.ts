import { MOCK_GARDEN_STATE } from "@commit-garden/garden-renderer";
import type { GardenRenderState } from "@commit-garden/garden-renderer";

export type OnboardingStep = "welcome" | "connect" | "importing" | "garden";

export type OnboardingState = {
  readonly step: OnboardingStep;
  readonly githubConnected: boolean;
  readonly isImporting: boolean;
  readonly githubUsername: string | null;
  readonly garden: GardenRenderState;
};

export type GardenSettings = {
  readonly account: {
    readonly displayName: string;
    readonly githubUsername: string;
  };
  readonly notifications: {
    readonly milestones: boolean;
    readonly weeklyDigest: boolean;
  };
  readonly privacy: {
    readonly showGardenToOthers: boolean;
    readonly shareProgress: boolean;
  };
};

export function createOnboardingState(
  username: string | null = null,
): OnboardingState {
  return {
    step: "welcome",
    githubConnected: false,
    isImporting: false,
    githubUsername: username,
    garden: MOCK_GARDEN_STATE,
  };
}

export function connectGitHub(
  current: OnboardingState,
  username: string,
): OnboardingState {
  return {
    ...current,
    step: "importing",
    githubConnected: true,
    githubUsername: username,
    isImporting: true,
  };
}

export function finishImport(current: OnboardingState): OnboardingState {
  return {
    ...current,
    step: "garden",
    isImporting: false,
  };
}

export function createConnectedGardenView(
  currentStreak: number,
  activeWeeks: number,
  recentEvent: string,
  garden: GardenRenderState = MOCK_GARDEN_STATE,
) {
  const nextMilestone = Math.max(1, 12 - activeWeeks);

  return {
    currentStreak,
    activeWeeks,
    streakText: `${currentStreak}-week streak`,
    nextMilestone: {
      label: `Next milestone in ${nextMilestone} weeks`,
      progressRatio: Math.min(1, activeWeeks / 12),
      current: activeWeeks,
      target: 12,
    },
    recentEvent,
    garden,
  };
}

export function createWebSettings(
  username: string,
  displayName: string,
): GardenSettings {
  return {
    account: {
      displayName,
      githubUsername: username,
    },
    notifications: {
      milestones: true,
      weeklyDigest: true,
    },
    privacy: {
      showGardenToOthers: false,
      shareProgress: false,
    },
  };
}

export default {
  createOnboardingState,
  connectGitHub,
  finishImport,
  createConnectedGardenView,
  createWebSettings,
};
