"use client";

import { useEffect, useCallback, useRef } from "react";
import { trackPerformanceMetric } from "@/app/actions/analytics";

interface WebVitalMetric {
  name: string;
  value: number;
  id: string;
  delta: number;
}

/**
 * Hook to track Core Web Vitals
 * Uses browser PerformanceObserver API (no dependencies)
 */
export function useWebVitals() {
  const reportedMetrics = useRef<Set<string>>(new Set());
  const clsValueRef = useRef<number>(0);
  const clsReportedRef = useRef<boolean>(false);
  const clsTimeoutRef = useRef<number | null>(null);

  const reportMetric = useCallback(
    (metric: WebVitalMetric, page: string) => {
      // Only report each metric once per page load
      const metricKey = `${metric.name}-${page}`;
      if (reportedMetrics.current.has(metricKey)) {
        return;
      }
      reportedMetrics.current.add(metricKey);

      // Report to analytics
      trackPerformanceMetric("web_vital", metric.name, metric.value, page, {
        id: metric.id,
        delta: metric.delta,
      }).catch((error) => {
        // Silently fail - analytics shouldn't break the app
        console.error("Failed to track web vital:", error);
      });
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.PerformanceObserver) {
      return;
    }

    const page = window.location.pathname;
    const observers: PerformanceObserver[] = [];
    const cleanupFunctions: Array<() => void> = [];

    // Track Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          renderTime?: number;
          loadTime?: number;
          startTime: number;
        };

        if (lastEntry) {
          const lcpValue = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime;
          reportMetric(
            {
              name: "LCP",
              value: lcpValue,
              id: lastEntry.name || "lcp",
              delta: lcpValue,
            },
            page
          );
        }
      });

      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
      observers.push(lcpObserver);
    } catch (error) {
      // LCP not supported
    }

    // Track First Input Delay (FID) - now called Interaction to Next Paint (INP) in newer APIs
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const fidEntry = entry as PerformanceEventTiming & {
            processingStart: number;
            startTime: number;
          };

          if (fidEntry.processingStart && fidEntry.startTime) {
            const fidValue = fidEntry.processingStart - fidEntry.startTime;
            reportMetric(
              {
                name: "FID",
                value: fidValue,
                id: fidEntry.name || "fid",
                delta: fidValue,
              },
              page
            );
          }
        }
      });

      fidObserver.observe({ entryTypes: ["first-input", "event"] });
      observers.push(fidObserver);
    } catch (error) {
      // FID not supported
    }

    // Track Cumulative Layout Shift (CLS)
    let clsObserver: PerformanceObserver | null = null;
    try {
      clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const layoutShift = entry as LayoutShift & {
            value: number;
            hadRecentInput: boolean;
          };

          if (!layoutShift.hadRecentInput) {
            clsValueRef.current += layoutShift.value;
          }
        }

        // Report CLS once after a delay (debounce)
        if (!clsReportedRef.current && clsTimeoutRef.current === null) {
          clsTimeoutRef.current = window.setTimeout(() => {
            if (!clsReportedRef.current && clsValueRef.current > 0) {
              clsReportedRef.current = true;
              reportMetric(
                {
                  name: "CLS",
                  value: clsValueRef.current,
                  id: "cls-final",
                  delta: clsValueRef.current,
                },
                page
              );
            }
            clsTimeoutRef.current = null;
          }, 5000);
        }
      });

      clsObserver.observe({ entryTypes: ["layout-shift"] });
      observers.push(clsObserver);

      // Also report CLS on page unload
      const handleBeforeUnload = () => {
        if (!clsReportedRef.current && clsValueRef.current > 0) {
          clsReportedRef.current = true;
          reportMetric(
            {
              name: "CLS",
              value: clsValueRef.current,
              id: "cls-final",
              delta: clsValueRef.current,
            },
            page
          );
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      cleanupFunctions.push(() => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      });
    } catch (error) {
      // CLS not supported
    }

    // Cleanup on unmount
    return () => {
      observers.forEach((observer) => observer.disconnect());
      cleanupFunctions.forEach((cleanup) => cleanup());
      reportedMetrics.current.clear();
      clsValueRef.current = 0;
      clsReportedRef.current = false;
      if (clsTimeoutRef.current !== null) {
        clearTimeout(clsTimeoutRef.current);
        clsTimeoutRef.current = null;
      }
    };
  }, [reportMetric]);
}

// Type definitions for Performance API extensions
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  startTime: number;
  name: string;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  name: string;
}

