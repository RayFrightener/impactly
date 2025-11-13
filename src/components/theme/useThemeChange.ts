'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

interface ThemeChangeEventDetail {
  presetId: string;
  tokens: Record<string, string>;
  base?: 'light' | 'dark';
}

/**
 * Custom hook that triggers a callback immediately when theme changes.
 * Listens to both the themechange custom event and React context changes
 * for maximum reactivity.
 */
export const useThemeChange = (callback: () => void) => {
  const { presetId } = useTheme();
  const callbackRef = useRef(callback);
  const lastPresetIdRef = useRef<string>(presetId);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Listen to custom themechange event for instant reactivity
  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<ThemeChangeEventDetail>;
      // Trigger callback immediately when theme changes
      callbackRef.current();
    };

    document.documentElement.addEventListener('themechange', handleThemeChange);

    return () => {
      document.documentElement.removeEventListener('themechange', handleThemeChange);
    };
  }, []);

  // Also listen to React context changes as a fallback
  useEffect(() => {
    if (lastPresetIdRef.current !== presetId) {
      lastPresetIdRef.current = presetId;
      // Small delay to ensure this doesn't fire before the event
      // but still provides fallback reactivity
      const timeoutId = setTimeout(() => {
        callbackRef.current();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [presetId]);
};

