import type { ThemePreset } from "./types";
import { createPreset } from "./preset-factory";

export const DEFAULT_THEME_ID = "warm-taupe";

/**
 * Minimal, distraction-free theme presets
 * Range from cool to warm tones, all lighter for a clean aesthetic
 */
export const THEME_PRESETS: ThemePreset[] = [
  // Default: Original warm taupe from TemplateColorsApp
  createPreset({
    id: "warm-taupe",
    name: "Warm Taupe",
    description: "Original minimal beige palette for calm, focused work.",
    base: "light",
    baseBackground: "#C7BEBE",
    baseButton: "#867979",
  }),

  // Cool 1: Misty Blue - light blue-gray tones
  createPreset({
    id: "misty-blue",
    name: "Misty Blue",
    description: "Cool blue-gray tones for a serene, focused atmosphere.",
    base: "light",
    baseBackground: "#D4D8DD", // Light blue-gray, lighter than original
    baseButton: "#7A8A9A", // Muted blue-gray
  }),

  // Cool 2: Soft Lavender - light lavender-gray
  createPreset({
    id: "soft-lavender",
    name: "Soft Lavender",
    description: "Gentle lavender-gray for creative tranquility.",
    base: "light",
    baseBackground: "#D8D4DD", // Light lavender-gray
    baseButton: "#8A7A9A", // Muted lavender
  }),

  // Neutral: Stone Gray - light gray-beige
  createPreset({
    id: "stone-gray",
    name: "Stone Gray",
    description: "Neutral gray-beige for balanced, distraction-free clarity.",
    base: "light",
    baseBackground: "#D4D4D4", // Light neutral gray
    baseButton: "#8A8A8A", // Muted gray
  }),

  // Warm 1: Peach Blush - light peach-beige
  createPreset({
    id: "peach-blush",
    name: "Peach Blush",
    description: "Warm peach-beige for gentle, inviting sessions.",
    base: "light",
    baseBackground: "#DDD4C7", // Light peach-beige
    baseButton: "#9A8A7A", // Muted peach-brown
  }),

  // Warm 2: Rose Sand - light rose-beige
  createPreset({
    id: "rose-sand",
    name: "Rose Sand",
    description: "Soft rose-beige for warm, comfortable productivity.",
    base: "light",
    baseBackground: "#DDC7C7", // Light rose-beige
    baseButton: "#9A7A8A", // Muted rose-brown
  }),
];
