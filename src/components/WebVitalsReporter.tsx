"use client";

import { useWebVitals } from "@/hooks/useWebVitals";
import { usePageLoadTracking } from "@/hooks/usePageLoadTracking";

/**
 * Client component that initializes performance tracking
 * Should be added to the root layout
 */
export default function WebVitalsReporter() {
  useWebVitals();
  usePageLoadTracking();

  // This component doesn't render anything
  return null;
}

