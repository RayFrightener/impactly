'use client';

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME_ID, THEME_PRESETS } from "./theme-presets";
import type { ThemePreset } from "./theme-presets";
import type { StoredTheme, ThemeTokens } from "./types";
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
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const applyTokens = (tokens: ThemeTokens) => {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(`--theme-${token}`, value);
  });
};

const sanitizeTokens = (tokens: ThemeTokens): ThemeTokens => {
  const entries = Object.entries(tokens).map(([key, value]) => [
    key,
    value || "",
  ]);
  return Object.fromEntries(entries) as ThemeTokens;
};

export const ThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [presetId, setPresetId] = useState<string>(DEFAULT_THEME_ID);
  const [customTokens, setCustomTokens] = useState<ThemeTokens | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const activePreset = useMemo<ThemePreset>(() => {
    return (
      THEME_PRESETS.find((preset) => preset.id === presetId) ??
      THEME_PRESETS[0]
    );
  }, [presetId]);

  const tokens = useMemo<ThemeTokens>(() => {
    if (presetId === "custom" && customTokens) {
      return sanitizeTokens(customTokens);
    }
    return sanitizeTokens(activePreset.tokens);
  }, [activePreset.tokens, customTokens, presetId]);

  useEffect(() => {
    const stored = loadStoredTheme();
    if (stored) {
      const storedPreset =
        stored.id === "custom"
          ? stored.custom ?? activePreset.tokens
          : THEME_PRESETS.find((preset) => preset.id === stored.id)?.tokens;

      if (storedPreset) {
        setPresetId(stored.id);
        if (stored.id === "custom") {
          setCustomTokens(stored.custom ?? storedPreset);
        }
        window.requestAnimationFrame(() => {
          applyTokens(storedPreset);
          document.documentElement.dataset.theme = stored.id;
        });
        setHasHydrated(true);
        return;
      }
      clearStoredTheme();
    }
    // fallback to default theme
    applyTokens(activePreset.tokens);
    document.documentElement.dataset.theme = DEFAULT_THEME_ID;
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    applyTokens(tokens);
    document.documentElement.dataset.theme = presetId;
    const storedTheme: StoredTheme = {
      id: presetId,
      custom: presetId === "custom" ? tokens : undefined,
    };
    saveStoredTheme(storedTheme);
  }, [hasHydrated, presetId, tokens]);

  const handleSetPreset = (id: string) => {
    const presetExists =
      id === "custom" || THEME_PRESETS.some((preset) => preset.id === id);
    if (!presetExists) {
      return;
    }
    
    // Immediately apply the new preset tokens for instant visual feedback
    if (id !== "custom") {
      const preset = THEME_PRESETS.find((p) => p.id === id);
      if (preset) {
        applyTokens(preset.tokens);
        document.documentElement.dataset.theme = id;
      }
    }
    
    setPresetId(id);
    if (id !== "custom") {
      setCustomTokens(null);
    } else if (!customTokens) {
      setCustomTokens(tokens);
    }
  };

  const handleUpdateCustomToken = (
    token: keyof ThemeTokens,
    value: string
  ) => {
    setPresetId("custom");
    setCustomTokens((previous) => {
      const base = previous ?? tokens;
      const updated = {
        ...base,
        [token]: value,
      };
      // Immediately apply the updated token for instant visual feedback
      applyTokens(updated);
      document.documentElement.dataset.theme = "custom";
      return updated;
    });
  };

  const resetTheme = () => {
    setPresetId(DEFAULT_THEME_ID);
    setCustomTokens(null);
    clearStoredTheme();
    applyTokens(THEME_PRESETS[0].tokens);
    document.documentElement.dataset.theme = DEFAULT_THEME_ID;
  };

  const value: ThemeContextValue = {
    presetId,
    presets: THEME_PRESETS,
    tokens,
    customTokens,
    setPreset: handleSetPreset,
    updateCustomToken: handleUpdateCustomToken,
    resetTheme,
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

