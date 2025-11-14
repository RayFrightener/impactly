export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  header: string;
  accent: string;
  accentContrast: string;
  button: string;
  buttonText: string;
  progress: string;
  placeholder: string;
}

export interface StoredTheme {
  id: string;
  custom?: ThemeTokens;
}

/**
 * Configuration for creating a theme preset
 */
export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  base: "light" | "dark";
  // Base colors for the preset
  baseBackground: string;
  baseButton: string;
  // Optional overrides for specific tokens
  overrides?: Partial<ThemeTokens>;
}

/**
 * Color scale from 50 (lightest) to 900 (darkest)
 */
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

/**
 * Theme preset definition
 */
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  base: "light" | "dark";
  tokens: ThemeTokens;
}
