export const THEME_PRESETS = {
  classic: {
    name: "Classic",
    description: "Clean white background with blue accents",
    primaryColor: "#3B82F6", // Blue 500
    isDark: false,
  },
  dark: {
    name: "Dark",
    description: "Modern dark theme with purple accents",
    primaryColor: "#8B5CF6", // Purple 500
    isDark: true,
  },
} as const;

export type ThemePreset = keyof typeof THEME_PRESETS;
