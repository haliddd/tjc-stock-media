export const inspectorDrawerTabs = ["Overview", "Metadata", "Rights", "Renditions", "Versions", "Activity"];

export const assetDetailTabs = ["Overview", "Metadata", "Rights", "Renditions", "Versions", "Activity", "Related"];

export function isActivityTab(tab: string) {
  return tab === "Activity" || tab === "Usage History";
}
