/**
 * Color utility functions for theme generation
 * Provides functions to manipulate colors in HSL space for better control
 */

/**
 * Convert hex color to HSL
 */
function hexToHsl(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Lighten a hex color by a percentage
 * @param color - Hex color string (e.g., "#C7BEBE")
 * @param amount - Percentage to lighten (0-100)
 * @returns Lightened hex color
 */
export function lighten(color: string, amount: number): string {
  const [h, s, l] = hexToHsl(color);
  const newLightness = Math.min(100, l + amount);
  return hslToHex(h, s, newLightness);
}

/**
 * Darken a hex color by a percentage
 * @param color - Hex color string (e.g., "#867979")
 * @param amount - Percentage to darken (0-100)
 * @returns Darkened hex color
 */
export function darken(color: string, amount: number): string {
  const [h, s, l] = hexToHsl(color);
  const newLightness = Math.max(0, l - amount);
  return hslToHex(h, s, newLightness);
}

/**
 * Adjust the opacity of a hex color
 * @param color - Hex color string
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 */
export function adjustOpacity(color: string, opacity: number): string {
  const cleanHex = color.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Mix two colors together
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @param weight - Weight of color1 (0-1), default 0.5
 * @returns Mixed hex color
 */
export function mix(color1: string, color2: string, weight = 0.5): string {
  const [h1, s1, l1] = hexToHsl(color1);
  const [h2, s2, l2] = hexToHsl(color2);

  const h = h1 + (h2 - h1) * weight;
  const s = s1 + (s2 - s1) * weight;
  const l = l1 + (l2 - l1) * weight;

  return hslToHex(h, s, l);
}

/**
 * Adjust saturation of a color
 * @param color - Hex color string
 * @param amount - Amount to adjust saturation (-100 to 100)
 * @returns Color with adjusted saturation
 */
export function adjustSaturation(color: string, amount: number): string {
  const [h, s, l] = hexToHsl(color);
  const newSaturation = Math.max(0, Math.min(100, s + amount));
  return hslToHex(h, newSaturation, l);
}
