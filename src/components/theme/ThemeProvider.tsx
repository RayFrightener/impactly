'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  previewPreset: (id: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const applyTokens = (tokens: ThemeTokens, base?: "light" | "dark") => {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(`--theme-${token}`, value);
  });
  // Set color-scheme to override browser preferences
  if (base) {
    root.style.setProperty("color-scheme", base);
  }
};

// Dispatch theme change event for instant component reactivity
const dispatchThemeChange = (presetId: string, tokens: ThemeTokens, base?: "light" | "dark") => {
  const event = new CustomEvent("themechange", {
    detail: { presetId, tokens, base },
    bubbles: true,
  });
  document.documentElement.dispatchEvent(event);
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
  const lastAppliedPresetRef = useRef<string | null>(null);
  // Store committed theme tokens for preview revert functionality
  const committedTokensRef = useRef<{ tokens: ThemeTokens; base?: "light" | "dark"; presetId: string } | null>(null);

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
      const storedPresetObj = stored.id === "custom" 
        ? null 
        : THEME_PRESETS.find((preset) => preset.id === stored.id);
      const storedPreset =
        stored.id === "custom"
          ? stored.custom ?? activePreset.tokens
          : storedPresetObj?.tokens;

      if (storedPreset) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPresetId((prev) => (prev !== stored.id ? stored.id : prev));
        if (stored.id === "custom") {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCustomTokens((prev) => {
            const newTokens = stored.custom ?? storedPreset;
            // Only update if actually different
            return JSON.stringify(prev) !== JSON.stringify(newTokens) ? newTokens : prev;
          });
        }
        window.requestAnimationFrame(() => {
          applyTokens(storedPreset, storedPresetObj?.base);
          document.documentElement.dataset.theme = stored.id;
          // Initialize committed tokens reference
          committedTokensRef.current = {
            tokens: storedPreset,
            base: storedPresetObj?.base,
            presetId: stored.id,
          };
        });
        setHasHydrated(true);
        return;
      }
      clearStoredTheme();
    }
    // fallback to default theme
    applyTokens(activePreset.tokens, activePreset.base);
    document.documentElement.dataset.theme = DEFAULT_THEME_ID;
    // Initialize committed tokens reference
    committedTokensRef.current = {
      tokens: activePreset.tokens,
      base: activePreset.base,
      presetId: DEFAULT_THEME_ID,
    };
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    // Skip if this preset was already applied immediately (to avoid overriding instant changes)
    if (lastAppliedPresetRef.current === presetId) {
      lastAppliedPresetRef.current = null;
      // Still save to storage and update dataset
      document.documentElement.dataset.theme = presetId;
      const storedTheme: StoredTheme = {
        id: presetId,
        custom: presetId === "custom" ? tokens : undefined,
      };
      saveStoredTheme(storedTheme);
      // Update committed tokens reference when theme is committed
      committedTokensRef.current = {
        tokens,
        base: activePreset.base,
        presetId,
      };
      // Dispatch event for components that might have missed the immediate one
      dispatchThemeChange(presetId, tokens, activePreset.base);
      return;
    }
    // Only apply if not already applied immediately
    applyTokens(tokens, activePreset.base);
    document.documentElement.dataset.theme = presetId;
    const storedTheme: StoredTheme = {
      id: presetId,
      custom: presetId === "custom" ? tokens : undefined,
    };
    saveStoredTheme(storedTheme);
    // Update committed tokens reference when theme is committed
    committedTokensRef.current = {
      tokens,
      base: activePreset.base,
      presetId,
    };
    // Dispatch event for component reactivity
    dispatchThemeChange(presetId, tokens, activePreset.base);
  }, [hasHydrated, presetId, tokens, activePreset.base]);

  const handleSetPreset = (id: string) => {
    const presetExists =
      id === "custom" || THEME_PRESETS.some((preset) => preset.id === id);
    if (!presetExists) {
      return;
    }
    
    // Immediately apply the new preset tokens for instant visual feedback
    // Apply synchronously before any state updates for maximum responsiveness
    if (id !== "custom") {
      const preset = THEME_PRESETS.find((p) => p.id === id);
      if (preset) {
        // Apply tokens immediately and synchronously
        applyTokens(preset.tokens, preset.base);
        document.documentElement.dataset.theme = id;
        // Mark this preset as immediately applied to prevent useEffect from overriding
        lastAppliedPresetRef.current = id;
        
        // Dispatch theme change event immediately for component reactivity
        dispatchThemeChange(id, preset.tokens, preset.base);
        
        // Force a synchronous style recalculation to ensure browser paints immediately
        // This ensures the theme change is visible instantly
        void document.documentElement.offsetHeight;
        
        // Update committed tokens reference immediately
        committedTokensRef.current = {
          tokens: preset.tokens,
          base: preset.base,
          presetId: id,
        };
      }
    } else {
      // For custom theme, mark it as applied if we have custom tokens
      if (customTokens) {
        applyTokens(customTokens, activePreset.base);
        document.documentElement.dataset.theme = id;
        lastAppliedPresetRef.current = id;
        
        // Dispatch theme change event immediately
        dispatchThemeChange(id, customTokens, activePreset.base);
        
        void document.documentElement.offsetHeight;
      }
    }
    
    // Update state after visual changes are applied
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
    // Update state first to ensure we have the latest tokens
    setPresetId("custom");
    setCustomTokens((previous) => {
      const base = previous ?? tokens;
      const updated = {
        ...base,
        [token]: value,
      };
      // Immediately apply the updated token for instant visual feedback
      // Use the active preset's base for custom themes
      applyTokens(updated, activePreset.base);
      document.documentElement.dataset.theme = "custom";
      // Mark custom theme as immediately applied
      lastAppliedPresetRef.current = "custom";
      
      // Dispatch theme change event immediately
      dispatchThemeChange("custom", updated, activePreset.base);
      
      // Force a synchronous style recalculation to ensure browser paints immediately
      void document.documentElement.offsetHeight;
      
      return updated;
    });
  };

  const resetTheme = () => {
    const defaultPreset = THEME_PRESETS.find((p) => p.id === DEFAULT_THEME_ID) ?? THEME_PRESETS[0];
    // Apply theme immediately before state updates
    applyTokens(defaultPreset.tokens, defaultPreset.base);
    document.documentElement.dataset.theme = DEFAULT_THEME_ID;
    // Mark default theme as immediately applied
    lastAppliedPresetRef.current = DEFAULT_THEME_ID;
    
    // Dispatch theme change event immediately
    dispatchThemeChange(DEFAULT_THEME_ID, defaultPreset.tokens, defaultPreset.base);
    
    // Force a synchronous style recalculation to ensure browser paints immediately
    void document.documentElement.offsetHeight;
    
    // Update state after visual changes are applied
    setPresetId(DEFAULT_THEME_ID);
    setCustomTokens(null);
    clearStoredTheme();
    
    // Update committed tokens reference
    committedTokensRef.current = {
      tokens: defaultPreset.tokens,
      base: defaultPreset.base,
      presetId: DEFAULT_THEME_ID,
    };
  };

  const handlePreviewPreset = (id: string | null) => {
    if (id === null) {
      // Revert to committed theme
      if (committedTokensRef.current) {
        applyTokens(
          committedTokensRef.current.tokens,
          committedTokensRef.current.base
        );
        document.documentElement.dataset.theme = committedTokensRef.current.presetId;
        void document.documentElement.offsetHeight;
      }
      return;
    }

    // Preview the specified preset
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (preset) {
      // Apply preview tokens without saving or updating state
      applyTokens(preset.tokens, preset.base);
      document.documentElement.dataset.theme = id;
      void document.documentElement.offsetHeight;
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

