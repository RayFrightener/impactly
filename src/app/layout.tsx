import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { decodeStoredThemeValue } from "@/components/theme/theme-storage";
import {
  DEFAULT_THEME_ID,
  THEME_PRESETS,
} from "@/components/theme/theme-presets";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Impactly",
  description:
    "A project planning and tracking dashboard that combines impact-focused planning, stream-of-consciousness journaling, and visual workflow management.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("impactly-theme");
  let initialThemeId = DEFAULT_THEME_ID;
  let inlineThemeVariables: CSSProperties = {};

  if (themeCookie) {
    const storedTheme = decodeStoredThemeValue(themeCookie.value);
    if (storedTheme) {
      initialThemeId = storedTheme.id;
      const presetTokens =
        storedTheme.id === "custom"
          ? storedTheme.custom
          : THEME_PRESETS.find((preset) => preset.id === storedTheme.id)
              ?.tokens;

      if (presetTokens) {
        inlineThemeVariables = Object.fromEntries(
          Object.entries(presetTokens).map(([token, value]) => [
            `--theme-${token}`,
            value,
          ])
        );
      }
    }
  }

  return (
    <html lang="en" data-theme={initialThemeId}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={inlineThemeVariables}
      >
        <ThemeProvider>
          <WebVitalsReporter />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
