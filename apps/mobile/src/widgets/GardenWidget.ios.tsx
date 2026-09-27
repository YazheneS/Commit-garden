import { Text, VStack } from "@expo/ui/swift-ui";
import { createWidget } from "expo-widgets";
import type { GardenWidgetSnapshot } from "./widgetData";

const GardenWidgetLayout = (snapshot: GardenWidgetSnapshot) => {
  "widget";
  return (
    <VStack spacing={5}>
      <Text>MY GARDEN</Text>
      <Text>{snapshot.gardenRows.slice(0, 3).join("\n")}</Text>
      <Text>{snapshot.hasGarden
        ? `${snapshot.activeWeeks} active weeks · ${snapshot.currentStreak} week streak`
        : "Connect GitHub to grow"}</Text>
      {snapshot.hasGarden && snapshot.nextMilestone !== null
        ? <Text>Next growth: {Math.max(0, snapshot.nextMilestone - snapshot.activeWeeks)} weeks</Text>
        : null}
    </VStack>
  );
};

export const GardenWidget = createWidget("GardenWidget", GardenWidgetLayout);
