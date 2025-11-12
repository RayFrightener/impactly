import type { StoredTheme } from "./types";

const THEME_COOKIE = "impactly-theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

const encode = (value: StoredTheme): string => {
  try {
    const json = JSON.stringify(value);
    return typeof window === "undefined"
      ? json
      : window.btoa(encodeURIComponent(json));
  } catch (error) {
    console.error("Failed to encode theme cookie", error);
    return "";
  }
};

const decode = (raw: string): StoredTheme | null => {
  try {
    let json: string;
    if (typeof window === "undefined") {
      // Server-side: Next.js might return URL-encoded cookie values
      // Try to decode as base64 first, handling URL encoding if needed
      try {
        // Use Buffer for base64 decoding on server-side
        const buffer = Buffer.from(raw, "base64");
        json = decodeURIComponent(buffer.toString("utf-8"));
      } catch {
        // If that fails, try URL-decoding first, then base64 decode
        const urlDecoded = decodeURIComponent(raw);
        const buffer = Buffer.from(urlDecoded, "base64");
        json = decodeURIComponent(buffer.toString("utf-8"));
      }
    } else {
      // Client-side: try to decode base64, handling potential URL encoding
      try {
        // First try direct base64 decode (for values that are already URL-decoded)
        const decoded = window.atob(raw);
        json = decodeURIComponent(decoded);
      } catch {
        // If that fails, try URL-decoding first, then base64 decode
        // This handles cases where the cookie value is URL-encoded
        const urlDecoded = decodeURIComponent(raw);
        const decoded = window.atob(urlDecoded);
        json = decodeURIComponent(decoded);
      }
    }
    return JSON.parse(json) as StoredTheme;
  } catch (error) {
    console.error("Failed to decode theme cookie", error);
    return null;
  }
};

export const decodeStoredThemeValue = (raw: string): StoredTheme | null =>
  decode(raw);

export const loadStoredTheme = (): StoredTheme | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${THEME_COOKIE}=`));
  if (!cookie) {
    return null;
  }
  const [, value] = cookie.split("=");
  return decode(value);
};

export const saveStoredTheme = (theme: StoredTheme) => {
  if (typeof document === "undefined") {
    return;
  }
  const encoded = encode(theme);
  if (!encoded) {
    return;
  }
  document.cookie = `${THEME_COOKIE}=${encoded}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
};

export const clearStoredTheme = () => {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
};

export const parseThemeFromCookieHeader = (
  cookieHeader: string | null
): StoredTheme | null => {
  if (!cookieHeader) {
    return null;
  }
  const entries = cookieHeader.split(";").map((entry) => entry.trim());
  const match = entries.find((entry) => entry.startsWith(`${THEME_COOKIE}=`));
  if (!match) {
    return null;
  }
  const [, value] = match.split("=");
  return decode(value);
};

