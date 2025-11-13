"use client";

import { useEffect, useCallback, useRef } from "react";
import { trackPerformanceMetric } from "@/app/actions/analytics";

/**
 * Hook to track page load performance metrics
 */
export function usePageLoadTracking() {
  const hasReported = useRef(false);

  const reportPageLoad = useCallback(() => {
    if (hasReported.current || typeof window === "undefined") {
      return;
    }

    hasReported.current = true;
    const page = window.location.pathname;

    // Use Navigation Timing API
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const navigation = window.performance.navigation as PerformanceNavigation & {
        type: number;
      };

      // Time to First Byte (TTFB)
      const ttfb = timing.responseStart - timing.requestStart;
      if (ttfb > 0) {
        trackPerformanceMetric("page_load", "TTFB", ttfb, page, {
          navigationType: navigation.type,
        }).catch(() => {
          // Silently fail
        });
      }

      // DOM Content Loaded
      const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
      if (domContentLoaded > 0) {
        trackPerformanceMetric("page_load", "DOMContentLoaded", domContentLoaded, page).catch(
          () => {
            // Silently fail
          }
        );
      }

      // Window Load Complete
      const windowLoad = timing.loadEventEnd - timing.navigationStart;
      if (windowLoad > 0) {
        trackPerformanceMetric("page_load", "WindowLoad", windowLoad, page).catch(() => {
          // Silently fail
        });
      }
    }

    // Use Navigation Timing API v2 if available (more accurate)
    if (window.performance && "getEntriesByType" in window.performance) {
      try {
        const navigationEntries = window.performance.getEntriesByType(
          "navigation"
        ) as PerformanceNavigationTiming[];

        if (navigationEntries.length > 0) {
          const navEntry = navigationEntries[0];

          // TTFB (more accurate from Navigation Timing v2)
          const ttfbV2 = navEntry.responseStart - navEntry.requestStart;
          if (ttfbV2 > 0) {
            trackPerformanceMetric("page_load", "TTFB", ttfbV2, page, {
              version: "v2",
            }).catch(() => {
              // Silently fail
            });
          }

          // DOM Content Loaded
          const domContentLoadedV2 =
            navEntry.domContentLoadedEventEnd - navEntry.fetchStart;
          if (domContentLoadedV2 > 0) {
            trackPerformanceMetric("page_load", "DOMContentLoaded", domContentLoadedV2, page, {
              version: "v2",
            }).catch(() => {
              // Silently fail
            });
          }

          // Window Load
          const windowLoadV2 = navEntry.loadEventEnd - navEntry.fetchStart;
          if (windowLoadV2 > 0) {
            trackPerformanceMetric("page_load", "WindowLoad", windowLoadV2, page, {
              version: "v2",
            }).catch(() => {
              // Silently fail
            });
          }
        }
      } catch (error) {
        // Navigation Timing v2 not supported, fallback to v1
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Report when page is fully loaded
    if (document.readyState === "complete") {
      // Page already loaded
      setTimeout(reportPageLoad, 0);
    } else {
      // Wait for load event
      window.addEventListener("load", reportPageLoad, { once: true });
    }

    return () => {
      window.removeEventListener("load", reportPageLoad);
    };
  }, [reportPageLoad]);
}

// Type definitions
interface PerformanceNavigation {
  type: number;
}

interface PerformanceNavigationTiming extends PerformanceEntry {
  fetchStart: number;
  responseStart: number;
  requestStart: number;
  domContentLoadedEventEnd: number;
  loadEventEnd: number;
}

