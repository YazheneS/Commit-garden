import type { GardenWidgetSnapshot } from "./widgetData";

export async function updateGardenWidget(snapshot: GardenWidgetSnapshot): Promise<void> {
  const { GardenWidget } = await import("./GardenWidget");
  await GardenWidget.updateSnapshot(snapshot);
}
