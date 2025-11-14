import type { PresetConfig, ThemePreset, ThemeTokens } from "./types";
import { lighten, darken, adjustSaturation } from "./color-utils";

/**
 * Creates a theme preset from a configuration
 * Generates all tokens consistently based on base colors
 */
export function createPreset(config: PresetConfig): ThemePreset {
  const { baseBackground, baseButton, overrides = {} } = config;

  // Generate consistent token values
  const tokens: ThemeTokens = {
    // Background: use provided base, lightened for minimal feel
    background: lighten(baseBackground, 5),

    // Surface: lighter than background for workspace areas
    surface: lighten(baseBackground, 10),

    // Surface Alt: even lighter for hover states
    surfaceAlt: lighten(baseBackground, 15),

    // Card: pure white for maximum contrast and minimal feel
    card: "#ffffff",

    // Border: muted version of button color, lightened
    border: lighten(baseButton, 25),

    // Text Primary: consistent dark gray for readability
    textPrimary: "#171717",

    // Text Secondary: medium gray, slightly lighter
    textSecondary: "#475569",

    // Header: very light tint of background
    header: lighten(baseBackground, 12),

    // Accent: slightly more saturated version of button
    accent: adjustSaturation(baseButton, 10),

    // Accent Contrast: white for good contrast
    accentContrast: "#ffffff",

    // Button: use provided base button color
    button: baseButton,

    // Button Text: white for contrast
    buttonText: "#ffffff",

    // Progress: slightly lighter version of button
    progress: lighten(baseButton, 5),

    // Placeholder: darker, more readable version - use textSecondary as base
    // Darken it slightly to make it more readable while still being distinct from primary text
    // This ensures good readability - darker than before but still lighter than textPrimary
    placeholder: darken("#475569", 5), // Start from textSecondary (#475569) and darken slightly for better readability
  };

  // Apply any overrides
  const finalTokens: ThemeTokens = {
    ...tokens,
    ...overrides,
  };

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    base: config.base,
    tokens: finalTokens,
  };
}
