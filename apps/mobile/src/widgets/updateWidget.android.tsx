import AsyncStorageModule from "@react-native-async-storage/async-storage";
import React from "react";
import { requestWidgetUpdate } from "react-native-android-widget";
import { GardenWidget } from "./GardenWidget";
import type { GardenWidgetSnapshot } from "./widgetData";

const WIDGET_CACHE_KEY = "garden.widget.snapshot.v1";
const asyncStorage = AsyncStorageModule as unknown as {
  setItem(key: string, value: string): Promise<void>;
};

export async function updateGardenWidget(snapshot: GardenWidgetSnapshot): Promise<void> {
  await asyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(snapshot));
  await requestWidgetUpdate({
    widgetName: "GardenWidget",
    renderWidget: () => <GardenWidget snapshot={snapshot} />,
  });
}
