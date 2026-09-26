import type { GardenRenderState } from "@commit-garden/garden-renderer";
import type { GardenEvent } from "@commit-garden/shared-types";
import {
  calculateNextMilestone,
  formatActiveWeeks,
  formatGardenEvent,
  formatStreak,
} from "./formatters.js";
import { THEME_COLORS } from "./tokens.js";
import type { FormattedEventInfo, NextMilestoneInfo } from "./formatters.js";

export type GardenScreenProps = {
  readonly gardenState: GardenRenderState;
  readonly currentStreak: number;
  readonly activeWeeks: number;
  readonly longestStreak?: number;
  readonly recentEvent?: GardenEvent | string | null;
  readonly milestones?: readonly number[];
};

export type GardenScreenViewModel = {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly streakText: string;
  readonly isStreakActive: boolean;
  readonly activeWeeks: number;
  readonly activeWeeksText: string;
  readonly nextMilestone: NextMilestoneInfo;
  readonly recentEvent: FormattedEventInfo | null;
  readonly garden: GardenRenderState;
};

export function createGardenScreenViewModel(
  props: GardenScreenProps,
): GardenScreenViewModel {
  const currentStreak = Math.max(0, props.currentStreak);
  const longestStreak = Math.max(
    currentStreak,
    props.longestStreak ?? currentStreak,
  );
  const activeWeeks = Math.max(0, props.activeWeeks);
  return {
    currentStreak,
    longestStreak,
    streakText: formatStreak(currentStreak, longestStreak),
    isStreakActive: currentStreak > 0,
    activeWeeks,
    activeWeeksText: formatActiveWeeks(activeWeeks),
    nextMilestone: calculateNextMilestone(activeWeeks, props.milestones),
    recentEvent: formatGardenEvent(props.recentEvent),
    garden: props.gardenState,
  };
}

export function renderGardenScreenHtml(model: GardenScreenViewModel): string {
  const eventHtml = model.recentEvent
    ? `<div class="event-banner"><span class="event-icon">${escapeHtml(model.recentEvent.icon)}</span><div class="event-content"><div class="event-title">${escapeHtml(model.recentEvent.title)}</div><div class="event-desc">${escapeHtml(model.recentEvent.description)}</div></div></div>`
    : "";
  const plantsHtml = model.garden.plants
    .map(
      (plant) =>
        `<div class="plant-entity" style="left:${plant.col * 16}px;top:${plant.row * 16}px" data-asset="${escapeHtml(plant.assetKey)}" data-health="${escapeHtml(plant.health)}" title="${escapeHtml(`${plant.speciesId} (${plant.growthStage})`)}"></div>`,
    )
    .join("\n");
  const progressPercent = Math.round(model.nextMilestone.progressRatio * 100);

  return `<div class="garden-screen" style="background:${THEME_COLORS.bgDeep};color:${THEME_COLORS.textPrimary}"><header class="hud-bar" style="background:${THEME_COLORS.bgCard};border-color:${THEME_COLORS.border}"><div class="stat-badge streak-badge" style="color:${THEME_COLORS.streakWarm}">${escapeHtml(model.streakText)}</div><div class="stat-badge weeks-badge" style="color:${THEME_COLORS.greenLight}">${escapeHtml(model.activeWeeksText)}</div><div class="milestone-tracker"><div class="milestone-label">${escapeHtml(model.nextMilestone.label)}</div><div class="progress-bar-bg" style="background:${THEME_COLORS.bgHover}"><div class="progress-bar-fill" style="width:${progressPercent}%;background:${THEME_COLORS.milestoneGold}"></div></div></div></header>${eventHtml}<main class="garden-viewport" style="width:${model.garden.gridWidth * 16}px;height:${model.garden.gridHeight * 16}px"><div class="terrain-layer"></div><div class="plants-layer">${plantsHtml}</div></main></div>`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
}
