"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_THEME_ID, THEME_PRESETS } from "./theme-presets";
import type { ThemePreset, StoredTheme, ThemeTokens } from "./types";
import {
  clearStoredTheme,
  loadStoredTheme,
  saveStoredTheme,
} from "./theme-storage";

interface ThemeContextValue {
  presetId: string;
  presets: ThemePreset[];
  tokens: ThemeTokens;
  customTokens: ThemeTokens | null;
  setPreset: (id: string) => void;
  updateCustomToken: (token: keyof ThemeTokens, value: string) => void;
  resetTheme: () => void;
  previewPreset: (id: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Apply theme tokens to CSS variables synchronously for instant updates
 * CSS variables set on html cascade to all children, so we only need to set them once
 */
const applyTokens = (tokens: ThemeTokens, base?: "light" | "dark") => {
  const root = document.documentElement;
  const body = document.body;

  // Set CSS variables on root (html) element - these cascade to all children
  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(`--theme-${token}`, value || "");
  });

  // Explicitly update body background to ensure it updates behind modals
  // This is necessary because modals may have overlays that block CSS variable inheritance
  if (tokens.background) {
    body.style.setProperty("background-color", tokens.background);
  }

  if (base) {
    root.style.setProperty("color-scheme", base);
  }
};

/**
 * Dispatch theme change event for instant component reactivity
 */
const dispatchThemeChange = (
  presetId: string,
  tokens: ThemeTokens,
  base?: "light" | "dark"
) => {
  const event = new CustomEvent("themechange", {
    detail: { presetId, tokens, base },
    bubbles: true,
  });
  document.documentElement.dispatchEvent(event);
};

/**
 * Apply theme and save to storage
 */
const applyAndSaveTheme = (
  presetId: string,
  tokens: ThemeTokens,
  base?: "light" | "dark"
) => {
  applyTokens(tokens, base);
  document.documentElement.dataset.theme = presetId;
  const storedTheme: StoredTheme = {
    id: presetId,
    custom: presetId === "custom" ? tokens : undefined,
  };
  saveStoredTheme(storedTheme);
  dispatchThemeChange(presetId, tokens, base);
};

const sanitizeTokens = (tokens: ThemeTokens): ThemeTokens => {
  const entries = Object.entries(tokens).map(([key, value]) => [
    key,
    value || "",
  ]);
  return Object.fromEntries(entries) as ThemeTokens;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [presetId, setPresetId] = useState<string>(DEFAULT_THEME_ID);
  const [customTokens, setCustomTokens] = useState<ThemeTokens | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  // Store committed theme for preview revert functionality
  const committedThemeRef = useRef<{
    tokens: ThemeTokens;
    base?: "light" | "dark";
    presetId: string;
  } | null>(null);

  const activePreset = useMemo<ThemePreset>(() => {
    return (
      THEME_PRESETS.find((preset) => preset.id === presetId) ?? THEME_PRESETS[0]
    );
  }, [presetId]);

  const tokens = useMemo<ThemeTokens>(() => {
    if (presetId === "custom" && customTokens) {
      return sanitizeTokens(customTokens);
    }
    return sanitizeTokens(activePreset.tokens);
  }, [activePreset.tokens, customTokens, presetId]);

  // Initialize theme from storage on mount
  useEffect(() => {
    const stored = loadStoredTheme();
    if (stored) {
      const storedPreset =
        stored.id === "custom"
          ? null
          : THEME_PRESETS.find((preset) => preset.id === stored.id);

      const storedTokens =
        stored.id === "custom" ? stored.custom : storedPreset?.tokens;

      if (storedTokens) {
        const base = storedPreset?.base;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPresetId(stored.id);
        if (stored.id === "custom" && stored.custom) {
          setCustomTokens(stored.custom);
        }
        applyAndSaveTheme(stored.id, storedTokens, base);
        committedThemeRef.current = {
          tokens: storedTokens,
          base,
          presetId: stored.id,
        };
        setIsHydrated(true);
        return;
      }
      clearStoredTheme();
    }
    // Fallback to default theme
    const defaultPreset =
      THEME_PRESETS.find((p) => p.id === DEFAULT_THEME_ID) ?? THEME_PRESETS[0];
    applyAndSaveTheme(
      DEFAULT_THEME_ID,
      defaultPreset.tokens,
      defaultPreset.base
    );
    committedThemeRef.current = {
      tokens: defaultPreset.tokens,
      base: defaultPreset.base,
      presetId: DEFAULT_THEME_ID,
    };
    setIsHydrated(true);
  }, []);

  // Apply theme changes after hydration
  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    applyAndSaveTheme(presetId, tokens, activePreset.base);
    committedThemeRef.current = {
      tokens,
      base: activePreset.base,
      presetId,
    };
  }, [isHydrated, presetId, tokens, activePreset.base]);

  const handleSetPreset = (id: string) => {
    const presetExists =
      id === "custom" || THEME_PRESETS.some((preset) => preset.id === id);
    if (!presetExists) {
      return;
    }

    // Apply theme immediately for instant visual feedback
    if (id !== "custom") {
      const preset = THEME_PRESETS.find((p) => p.id === id);
      if (preset) {
        applyAndSaveTheme(id, preset.tokens, preset.base);
        committedThemeRef.current = {
          tokens: preset.tokens,
          base: preset.base,
          presetId: id,
        };
      }
    } else if (customTokens) {
      // For custom theme, use existing custom tokens
      applyAndSaveTheme(id, customTokens, activePreset.base);
      committedThemeRef.current = {
        tokens: customTokens,
        base: activePreset.base,
        presetId: id,
      };
    }

    // Update state
    setPresetId(id);
    if (id !== "custom") {
      setCustomTokens(null);
    } else if (!customTokens) {
      setCustomTokens(tokens);
    }
  };

  const handleUpdateCustomToken = (token: keyof ThemeTokens, value: string) => {
    setPresetId("custom");
    setCustomTokens((previous) => {
      const base = previous ?? tokens;
      const updated = {
        ...base,
        [token]: value,
      };
      // Apply immediately for instant visual feedback
      applyAndSaveTheme("custom", updated, activePreset.base);
      committedThemeRef.current = {
        tokens: updated,
        base: activePreset.base,
        presetId: "custom",
      };
      return updated;
    });
  };

  const resetTheme = () => {
    const defaultPreset =
      THEME_PRESETS.find((p) => p.id === DEFAULT_THEME_ID) ?? THEME_PRESETS[0];
    applyAndSaveTheme(
      DEFAULT_THEME_ID,
      defaultPreset.tokens,
      defaultPreset.base
    );
    committedThemeRef.current = {
      tokens: defaultPreset.tokens,
      base: defaultPreset.base,
      presetId: DEFAULT_THEME_ID,
    };
    setPresetId(DEFAULT_THEME_ID);
    setCustomTokens(null);
    clearStoredTheme();
  };

  const handlePreviewPreset = (id: string | null) => {
    if (id === null) {
      // Revert to committed theme
      if (committedThemeRef.current) {
        applyTokens(
          committedThemeRef.current.tokens,
          committedThemeRef.current.base
        );
        document.documentElement.dataset.theme =
          committedThemeRef.current.presetId;
        dispatchThemeChange(
          committedThemeRef.current.presetId,
          committedThemeRef.current.tokens,
          committedThemeRef.current.base
        );
      }
      return;
    }

    // Preview the specified preset (without saving)
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (preset) {
      applyTokens(preset.tokens, preset.base);
      document.documentElement.dataset.theme = id;
      dispatchThemeChange(id, preset.tokens, preset.base);
    }
  };

  const value: ThemeContextValue = {
    presetId,
    presets: THEME_PRESETS,
    tokens,
    customTokens,
    setPreset: handleSetPreset,
    updateCustomToken: handleUpdateCustomToken,
    resetTheme,
    previewPreset: handlePreviewPreset,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
