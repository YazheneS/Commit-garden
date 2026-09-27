import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { GardenWidgetSnapshot } from "./widgetData";

export function GardenWidget({ snapshot }: { readonly snapshot: GardenWidgetSnapshot }): React.JSX.Element {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 12,
        backgroundColor: "#12241e",
        borderRadius: 16,
      }}
      accessibilityLabel="GitHub Garden home-screen widget"
    >
      <TextWidget text="MY GARDEN" style={{ color: "#c1e58f", fontSize: 12, fontWeight: "bold", letterSpacing: 1.5 }} />
      <FlexWidget style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
        {snapshot.gardenRows.slice(0, 3).map((row, index) => (
          <TextWidget key={index} text={row} style={{ color: "#9ccf81", fontSize: 17, fontFamily: "monospace", textAlign: "center" }} />
        ))}
      </FlexWidget>
      <TextWidget
        text={snapshot.hasGarden
          ? `${snapshot.activeWeeks} active weeks · ${snapshot.currentStreak} week streak`
          : "Connect GitHub to grow"}
        style={{ color: "#edf5e9", fontSize: 12, textAlign: "center" }}
      />
      {snapshot.hasGarden && snapshot.nextMilestone !== null
        ? <TextWidget text={`Next growth: ${Math.max(0, snapshot.nextMilestone - snapshot.activeWeeks)} weeks`} style={{ color: "#a9bca7", fontSize: 10, textAlign: "center" }} />
        : null}
    </FlexWidget>
  );
}
