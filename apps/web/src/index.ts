import {
  MOCK_GARDEN_STATE,
  renderPixelGardenHtml,
} from "@commit-garden/garden-renderer";
import type { GardenRenderState } from "@commit-garden/garden-renderer";

export type WebRuntimeConfig = {
  readonly apiBaseUrl?: string;
  readonly initialGarden?: GardenRenderState;
};

export type WebRuntime = {
  readonly appName: string;
  readonly status: "ready" | "loading" | "error";
  readonly apiBaseUrl: string;
  readonly initialGarden: GardenRenderState;
};

export type WebGardenPageInput = {
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly nextMilestone: number;
  readonly recentEvent?: string | null;
  readonly garden: GardenRenderState;
};

export function createWebRuntime(config: WebRuntimeConfig = {}): WebRuntime {
  const apiBaseUrl = config.apiBaseUrl ?? "http://localhost:4000";

  return {
    appName: "GitHub Garden",
    status: "ready",
    apiBaseUrl,
    initialGarden: config.initialGarden ?? MOCK_GARDEN_STATE,
  };
}

export function createWebGardenScreen(garden: GardenRenderState): string {
  return `<div class="garden-screen" data-testid="garden-screen"><header class="hud-bar"><div class="stat-badge">GITHUB GARDEN</div></header>${renderPixelGardenHtml(garden, { className: "web-garden" })}</div>`;
}

export function resolveGardenPage(input: WebGardenPageInput): string {
  const displayActiveWeeks = Math.max(0, input.currentStreak);
  const countdown = Math.max(1, input.nextMilestone - input.activeWeeks);
  return `<!DOCTYPE html><html><body><div class="garden-page"><h1>GITHUB GARDEN</h1><div class="garden-screen">${createWebGardenScreen(input.garden)}</div><div class="stat-summary"><p>${displayActiveWeeks} active weeks</p><p>Next growth: ${countdown} week${countdown === 1 ? "" : "s"}</p><p>${input.recentEvent ?? "No recent updates"}</p></div></div></body></html>`;
}

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

export type CrossDeviceGardenSnapshot = {
  readonly gardenId: string;
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly nextMilestone: number;
  readonly recentEvent: string;
};

export type CrossDeviceGardenState = {
  readonly web: CrossDeviceGardenSnapshot;
  readonly desktop: CrossDeviceGardenSnapshot;
  readonly mobile: CrossDeviceGardenSnapshot;
  readonly widget: CrossDeviceGardenSnapshot;
  readonly isConsistent: boolean;
};

export type OfflineGardenCache = {
  readonly gardenId: string;
  readonly lastSyncedAt: string;
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly mode: "offline";
  readonly canRender: boolean;
};

export type SeasonalProfile = {
  readonly season: "spring" | "summer" | "autumn" | "winter";
  readonly skyTint: string;
  readonly palette: readonly string[];
};

export type WeatherSnapshot = {
  readonly condition: "sun" | "rain" | "cloud" | "mist";
  readonly effect: string;
  readonly intensity: number;
};

export type CreatureEntry = {
  readonly id: string;
  readonly kind: "BUTTERFLY" | "FIREFLY" | "BIRD";
  readonly visible: boolean;
};

export type DeveloperObject = {
  readonly id: string;
  readonly label: string;
  readonly variant: "terminal" | "keyboard" | "server" | "branch" | "coffee";
};

export type GardenHistoryEntry = {
  readonly week: number;
  readonly title: string;
  readonly description: string;
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
): {
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly streakText: string;
  readonly nextMilestone: {
    readonly label: string;
    readonly progressRatio: number;
    readonly current: number;
    readonly target: number;
  };
  readonly recentEvent: string;
  readonly garden: GardenRenderState;
} {
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

export function createCrossDeviceGardenSnapshot(input: {
  readonly gardenId: string;
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly nextMilestone: number;
  readonly recentEvent: string;
}): CrossDeviceGardenState {
  const common: CrossDeviceGardenSnapshot = {
    gardenId: input.gardenId,
    currentStreak: input.currentStreak,
    activeWeeks: input.activeWeeks,
    nextMilestone: input.nextMilestone,
    recentEvent: input.recentEvent,
  };

  return {
    web: common,
    desktop: common,
    mobile: common,
    widget: common,
    isConsistent: true,
  };
}

export function createOfflineGardenCache(input: {
  readonly gardenId: string;
  readonly lastSyncedAt: string;
  readonly currentStreak: number;
  readonly activeWeeks: number;
}): OfflineGardenCache {
  return {
    gardenId: input.gardenId,
    lastSyncedAt: input.lastSyncedAt,
    currentStreak: input.currentStreak,
    activeWeeks: input.activeWeeks,
    mode: "offline",
    canRender: true,
  };
}

export function createSeasonalGardenProfile(
  season: SeasonalProfile["season"],
): SeasonalProfile {
  const paletteMap: Record<SeasonalProfile["season"], readonly string[]> = {
    spring: ["#D9F5C9", "#A8E6A3", "#F7F7C9"],
    summer: ["#96E6A1", "#F7D59C", "#E7F7BD"],
    autumn: ["#E4B36F", "#C76A42", "#F5D8A8"],
    winter: ["#C9D9F5", "#DCEBFF", "#F1F7FF"],
  };

  const skyMap: Record<SeasonalProfile["season"], string> = {
    spring: "#DFF2FF",
    summer: "#CFEAFB",
    autumn: "#F9D3A8",
    winter: "#DDE8FA",
  };

  return {
    season,
    skyTint: skyMap[season],
    palette: [...paletteMap[season]],
  };
}

export function createWeatherSnapshot(
  condition: WeatherSnapshot["condition"],
): WeatherSnapshot {
  const weatherMap: Record<WeatherSnapshot["condition"], WeatherSnapshot> = {
    sun: { condition: "sun", effect: "sunlight glow", intensity: 0.7 },
    rain: { condition: "rain", effect: "soft rain drift", intensity: 0.8 },
    cloud: { condition: "cloud", effect: "gentle cloud cover", intensity: 0.5 },
    mist: { condition: "mist", effect: "misty haze", intensity: 0.45 },
  };

  return weatherMap[condition];
}

export function createCreatureRoster(
  activeWeeks: number,
): readonly CreatureEntry[] {
  const base: CreatureEntry[] = [
    { id: "butterfly-1", kind: "BUTTERFLY", visible: activeWeeks >= 4 },
    { id: "firefly-1", kind: "FIREFLY", visible: activeWeeks >= 8 },
    { id: "bird-1", kind: "BIRD", visible: activeWeeks >= 12 },
  ];

  return base.filter((entry) => entry.visible);
}

export function createDeveloperObjects(
  activeWeeks: number,
): readonly DeveloperObject[] {
  const items: DeveloperObject[] = [
    { id: "terminal", label: "Terminal", variant: "terminal" },
    { id: "keyboard", label: "Keyboard", variant: "keyboard" },
    { id: "server", label: "Server", variant: "server" },
    { id: "branch", label: "Branch", variant: "branch" },
    { id: "coffee", label: "Coffee", variant: "coffee" },
  ];

  return activeWeeks >= 10 ? items : items.slice(0, 2);
}

export function createGardenHistoryTimeline(
  events: readonly GardenHistoryEntry[],
): readonly GardenHistoryEntry[] {
  return [...events].sort((left, right) => left.week - right.week);
}

export default {
  createOnboardingState,
  connectGitHub,
  finishImport,
  createConnectedGardenView,
  createWebSettings,
  createCrossDeviceGardenSnapshot,
  createOfflineGardenCache,
  createSeasonalGardenProfile,
  createWeatherSnapshot,
  createCreatureRoster,
  createDeveloperObjects,
  createGardenHistoryTimeline,
};
