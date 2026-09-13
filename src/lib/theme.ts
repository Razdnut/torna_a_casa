export const APP_THEMES = ["light", "dim", "emerald"] as const;

export type AppTheme = (typeof APP_THEMES)[number];
