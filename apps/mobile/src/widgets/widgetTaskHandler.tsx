import AsyncStorageModule from "@react-native-async-storage/async-storage";
import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { GardenWidget } from "./GardenWidget";
import type { GardenWidgetSnapshot } from "./widgetData";

const WIDGET_CACHE_KEY = "garden.widget.snapshot.v1";
const asyncStorage = AsyncStorageModule as unknown as {
  getItem(key: string): Promise<string | null>;
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (!["WIDGET_ADDED", "WIDGET_UPDATE", "WIDGET_RESIZED"].includes(props.widgetAction)) return;
  const cached = await asyncStorage.getItem(WIDGET_CACHE_KEY);
  let snapshot: GardenWidgetSnapshot | null = null;
  if (cached) {
    try { snapshot = JSON.parse(cached) as GardenWidgetSnapshot; } catch { snapshot = null; }
  }
  props.renderWidget(
    <GardenWidget snapshot={snapshot ?? {
      hasGarden: false,
      currentStreak: 0,
      activeWeeks: 0,
      nextMilestone: 1,
      gardenRows: ["· · · · ·", "· · · · ·", "· · · · ·"],
    }} />,
  );
}
