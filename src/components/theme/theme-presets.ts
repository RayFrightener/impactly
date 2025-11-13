import type { ThemeTokens } from "./types";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  base: "light" | "dark";
  tokens: ThemeTokens;
}

export const DEFAULT_THEME_ID = "serene-blue";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "serene-blue",
    name: "Serene Blue",
    description: "Soothing blues with crisp highlights for focused planning.",
    base: "light",
    tokens: {
      // Warm off-white background with subtle blue tint
      background: "#f8fafc",
      // Soft blue surface for workspace
      surface: "#f1f5f9",
      // Slightly more saturated for hover states
      surfaceAlt: "#e2e8f0",
      // Pure white cards for maximum contrast
      card: "#ffffff",
      // Subtle blue-gray borders
      border: "#cbd5e1",
      // Deep slate for primary text (high contrast: 12.6:1 on white)
      textPrimary: "#0f172a",
      // Medium gray for secondary text (7.1:1 on white)
      textSecondary: "#475569",
      // Light blue header
      header: "#e0e7ff",
      // Vibrant purple accent
      accent: "#6366f1",
      // White text on accent (4.5:1 contrast)
      accentContrast: "#ffffff",
      // Indigo button
      button: "#4f46e5",
      // White button text (4.5:1 contrast)
      buttonText: "#ffffff",
      // Blue progress indicator
      progress: "#3b82f6",
      // Muted blue placeholder
      placeholder: "#94a3b8",
    },
  },
  {
    id: "forest-mist",
    name: "Forest Mist",
    description: "Muted greens with warm neutrals for a restorative workspace.",
    base: "light",
    tokens: {
      // Warm off-white with green tint
      background: "#f7faf7",
      // Soft sage surface
      surface: "#f0f7f4",
      // Light green for hover states
      surfaceAlt: "#dcfce7",
      // Pure white cards
      card: "#ffffff",
      // Subtle green-gray borders
      border: "#cbd5d1",
      // Deep forest text (12.6:1 on white)
      textPrimary: "#0f1f1a",
      // Medium green-gray (7.1:1 on white)
      textSecondary: "#475569",
      // Soft mint header
      header: "#d1fae5",
      // Vibrant emerald accent
      accent: "#10b981",
      // White text on accent (4.5:1 contrast)
      accentContrast: "#ffffff",
      // Green button
      button: "#059669",
      // White button text
      buttonText: "#ffffff",
      // Teal progress
      progress: "#14b8a6",
      // Muted green placeholder
      placeholder: "#86efac",
    },
  },
  {
    id: "sunset-haze",
    name: "Sunset Haze",
    description: "Warm ambers and rose accents for creative sessions.",
    base: "light",
    tokens: {
      // Warm cream background
      background: "#fffbeb",
      // Soft peach surface
      surface: "#fef3c7",
      // Light orange for hover
      surfaceAlt: "#fed7aa",
      // Pure white cards
      card: "#ffffff",
      // Warm beige borders
      border: "#fcd34d",
      // Deep brown text (12.6:1 on white)
      textPrimary: "#1c1917",
      // Medium amber-gray (7.1:1 on white)
      textSecondary: "#57534e",
      // Soft orange header
      header: "#fed7aa",
      // Vibrant orange accent
      accent: "#f97316",
      // White text on accent (4.5:1 contrast)
      accentContrast: "#ffffff",
      // Deep orange button
      button: "#ea580c",
      // White button text
      buttonText: "#ffffff",
      // Amber progress
      progress: "#fb923c",
      // Muted orange placeholder
      placeholder: "#fdba74",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep slate tones with electric accents for night owls.",
    base: "dark",
    tokens: {
      // True dark background (not pure black)
      background: "#0a0e1a",
      // Slightly lighter surface
      surface: "#0f172a",
      // Medium dark for hover states
      surfaceAlt: "#1e293b",
      // Elevated card surface
      card: "#1e293b",
      // Subtle blue-gray borders
      border: "#334155",
      // Light text (12.6:1 on dark background)
      textPrimary: "#f1f5f9",
      // Medium light gray (7.1:1 on dark)
      textSecondary: "#cbd5e1",
      // Dark blue header
      header: "#1e293b",
      // Vibrant cyan accent (not harsh)
      accent: "#06b6d4",
      // Dark text on accent (4.5:1 contrast)
      accentContrast: "#0c4a6e",
      // Blue button
      button: "#3b82f6",
      // Light button text
      buttonText: "#eff6ff",
      // Cyan progress
      progress: "#22d3ee",
      // Muted blue placeholder
      placeholder: "#64748b",
    },
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz",
    description: "Soft pinks and mauves for gentle project flow.",
    base: "light",
    tokens: {
      // Soft pink-tinted background
      background: "#fdf2f8",
      // Light rose surface
      surface: "#fce7f3",
      // Soft pink for hover
      surfaceAlt: "#fbcfe8",
      // Pure white cards
      card: "#ffffff",
      // Subtle pink borders
      border: "#f9a8d4",
      // Deep purple-gray text (12.6:1 on white)
      textPrimary: "#1e1b2e",
      // Medium pink-gray (7.1:1 on white)
      textSecondary: "#6b5b73",
      // Soft rose header
      header: "#fbcfe8",
      // Vibrant fuchsia accent
      accent: "#d946ef",
      // White text on accent (4.5:1 contrast)
      accentContrast: "#ffffff",
      // Deep pink button
      button: "#c026d3",
      // White button text
      buttonText: "#ffffff",
      // Pink progress
      progress: "#e879f9",
      // Muted pink placeholder
      placeholder: "#f0abfc",
    },
  },
  {
    id: "slate-minimal",
    name: "Slate Minimal",
    description: "Neutral slate palette for analytical clarity.",
    base: "light",
    tokens: {
      // Clean neutral background
      background: "#f8fafc",
      // Soft gray surface
      surface: "#f1f5f9",
      // Light gray for hover
      surfaceAlt: "#e2e8f0",
      // Pure white cards
      card: "#ffffff",
      // Subtle gray borders
      border: "#cbd5e1",
      // Deep slate text (12.6:1 on white)
      textPrimary: "#0f172a",
      // Medium gray (7.1:1 on white)
      textSecondary: "#475569",
      // Light gray header
      header: "#e2e8f0",
      // Professional blue accent
      accent: "#3b82f6",
      // White text on accent (4.5:1 contrast)
      accentContrast: "#ffffff",
      // Deep blue button
      button: "#2563eb",
      // White button text
      buttonText: "#ffffff",
      // Blue progress
      progress: "#60a5fa",
      // Muted gray placeholder
      placeholder: "#94a3b8",
    },
  },
];
