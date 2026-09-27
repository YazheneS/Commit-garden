import type { GardenWidgetSnapshot } from "./widgetData";
export { type GardenWidgetSnapshot };
export const GardenWidget = Object.assign(
  (_props: { readonly snapshot: GardenWidgetSnapshot }): null => null,
  {
    // TypeScript checks the platform-neutral source file; the iOS runtime
    // resolves GardenWidget.ios.tsx, whose native widget exposes this method.
    updateSnapshot: async (_snapshot: GardenWidgetSnapshot): Promise<void> => {},
  },
);
