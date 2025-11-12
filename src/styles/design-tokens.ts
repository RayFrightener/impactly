/**
 * Design Tokens for Impactly
 * A calming, focus-promoting design system
 */

export const colors = {
  // Primary: Soft blues for calmness and focus
  primary: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },

  // Accent: Muted purple for highlights
  accent: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#8B5CF6",
    600: "#7C3AED",
    700: "#6D28D9",
    800: "#5B21B6",
    900: "#4C1D95",
  },

  // Neutral: Warm off-white backgrounds with soft blacks
  neutral: {
    50: "#F8F7F4", // Warm off-white
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937", // Soft black for text
    900: "#111827",
  },

  // Success: Soft green for positive actions
  success: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
  },

  // Warning: Gentle amber for alerts
  warning: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
  },

  // Error: Soft red for errors
  error: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
};

// Spacing scale for consistent breathing room
export const spacing = {
  xs: "8px",
  sm: "12px",
  md: "20px",
  lg: "32px",
  xl: "48px",
  "2xl": "64px",
  "3xl": "96px",
};

// Typography scale for readability
export const typography = {
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "18px", // Increased from standard 16px
    lg: "22px",
    xl: "28px",
    "2xl": "32px",
    "3xl": "40px",
    "4xl": "48px",
    "5xl": "56px",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.7", // Increased from 1.5
    relaxed: "2",
  },
  fontWeight: {
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
};

// Border radius for softness
export const borderRadius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  full: "9999px",
};

// Shadows for depth
export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
};

// Transitions for smooth animations
export const transitions = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  slowest: "500ms cubic-bezier(0.4, 0, 0.2, 1)",
};

// Z-index scale for layering
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
};

// Utility functions for design tokens
export const getColor = (path: string): string => {
  const keys = path.split(".");
  let value: unknown = colors;

  for (const key of keys) {
    value = (value as Record<string, unknown>)[key];
  }

  return value as string;
};

export const getSpacing = (size: keyof typeof spacing): string => {
  return spacing[size];
};

export const getFontSize = (size: keyof typeof typography.fontSize): string => {
  return typography.fontSize[size];
};

// Component-specific design tokens
export const components = {
  button: {
    padding: {
      sm: `${spacing.sm} ${spacing.md}`,
      md: `${spacing.md} ${spacing.lg}`,
      lg: `${spacing.lg} ${spacing.xl}`,
    },
    borderRadius: borderRadius.lg,
    transition: transitions.base,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    shadow: shadows.lg,
    hoverShadow: shadows.xl,
    transition: transitions.base,
  },
  input: {
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.md,
    transition: transitions.fast,
  },
};

// Export all as a single object for convenience
export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  components,
};

export type Theme = typeof theme;

