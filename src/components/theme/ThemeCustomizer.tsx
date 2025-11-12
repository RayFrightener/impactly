/* eslint-disable jsx-a11y/label-has-associated-control */
"use client";

import { useMemo } from "react";
import { useTheme } from "./ThemeProvider";
import type { ThemeTokens } from "./types";

const colorFields: Array<{
  token: keyof ThemeTokens;
  label: string;
  helper?: string;
}> = [
  { token: "background", label: "Background", helper: "App canvas color" },
  { token: "surface", label: "Surface", helper: "Workspace surface fill" },
  { token: "surfaceAlt", label: "Surface Accent", helper: "Secondary surface" },
  { token: "card", label: "Card Background" },
  { token: "border", label: "Borders & Outlines" },
  { token: "header", label: "Header" },
  { token: "textPrimary", label: "Primary Text" },
  { token: "textSecondary", label: "Secondary Text" },
  { token: "accent", label: "Accent" },
  { token: "accentContrast", label: "Accent Contrast" },
  { token: "button", label: "Primary Button" },
  { token: "buttonText", label: "Button Text" },
  { token: "progress", label: "Progress Bar" },
  { token: "placeholder", label: "Placeholder Text" },
];

const toColorInputValue = (value: string): string => {
  if (value.startsWith("#")) {
    return value;
  }
  // fallback: attempt to parse rgb/rgba
  const match =
    /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(value) ??
    /rgba?\((\d+).(\d+).(\d+)/i.exec(value);
  if (!match) {
    return "#000000";
  }
  const [, r, g, b] = match;
  const hex = [r, g, b]
    .map((component) => {
      const parsed = Number(component);
      const clamped = Math.max(0, Math.min(255, parsed));
      return clamped.toString(16).padStart(2, "0");
    })
    .join("");
  return `#${hex}`;
};

export const ThemeCustomizer = () => {
  const {
    presetId,
    presets,
    tokens,
    updateCustomToken,
    setPreset,
    resetTheme,
  } = useTheme();

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === presetId),
    [presetId, presets]
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">
            Theme Presets
          </h3>
          <button
            type="button"
            onClick={resetTheme}
            className="text-sm text-accent hover:opacity-80 transition"
          >
            Reset to Default
          </button>
        </div>
        <p className="text-sm text-text-secondary mt-1">
          Choose a curated palette as a starting point or craft your own.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset) => {
            const isActive = preset.id === presetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPreset(preset.id)}
                className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive
                    ? "border-accent ring-2 ring-accent/40"
                    : "border-border hover:border-accent/40"
                }`}
              >
                <div className="h-20 rounded-lg overflow-hidden border border-border shadow-sm">
                  <div
                    className="h-1/2"
                    style={{ background: preset.tokens.background }}
                  />
                  <div
                    className="h-1/2 flex"
                    style={{ background: preset.tokens.header }}
                  >
                    <div
                      className="flex-1"
                      style={{ background: preset.tokens.card }}
                    />
                    <div
                      className="w-12"
                      style={{ background: preset.tokens.accent }}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {preset.name}
                    </span>
                    {preset.base === "dark" && (
                      <span className="text-[10px] uppercase bg-text-secondary/10 text-text-secondary px-2 py-0.5 rounded-full">
                        Dark
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {preset.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-text-primary">
          Custom Palette
        </h3>
        <p className="text-sm text-text-secondary">
          Adjust individual tokens. Changes automatically create a custom theme
          saved to this device.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {colorFields.map(({ token, label, helper }) => (
            <label
              key={token}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/70 px-3 py-2 shadow-sm"
            >
              <input
                type="color"
                value={toColorInputValue(tokens[token])}
                onChange={(event) =>
                  updateCustomToken(token, event.target.value)
                }
                className="h-10 w-10 cursor-pointer rounded-md border border-border bg-surface"
                aria-label={label}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-text-primary">
                  {label}
                </div>
                {helper && (
                  <div className="text-xs text-text-secondary">{helper}</div>
                )}
              </div>
            </label>
          ))}
        </div>

        {selectedPreset && presetId !== "custom" && (
          <p className="text-xs text-text-secondary/80">
            Editing colors switches to a custom theme based on the{" "}
            <span className="font-medium">{selectedPreset.name}</span> preset.
          </p>
        )}
      </div>
    </div>
  );
};

export default ThemeCustomizer;

