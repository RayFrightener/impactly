import { prisma } from "@/lib/prisma";

export type AnalyticsEventType =
  | "session_start"
  | "session_end"
  | "project_created"
  | "project_completed"
  | "task_created"
  | "task_completed"
  | "feature_created"
  | "thought_created"
  | "journal_entry_created"
  | "feedback_submitted"
  | "page_view"
  | "page_load"
  | "web_vital"
  | "component_render"
  | "api_request";

interface TrackEventParams {
  userId: string;
  eventType: AnalyticsEventType;
  eventData?: Record<string, unknown>;
  sessionId?: string;
  duration?: number;
  platform?: string;
  userAgent?: string;
}

/**
 * Track an analytics event
 */
export async function trackEvent(params: TrackEventParams) {
  try {
    await prisma.analytics.create({
      data: {
        userId: params.userId,
        eventType: params.eventType,
        eventData: params.eventData as unknown as undefined,
        sessionId: params.sessionId,
        duration: params.duration,
        platform: params.platform || "web",
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to track analytics event:", error);
    // Don't throw - analytics shouldn't break the app
  }
}

/**
 * Initialize or update user metrics
 */
export async function updateUserMetrics(
  userId: string,
  updates: {
    totalProjects?: number;
    completedProjects?: number;
    totalTasks?: number;
    completedTasks?: number;
    totalTimeSpent?: number;
    averageSessionTime?: number;
    currentStreak?: number;
    longestStreak?: number;
    lastActiveDate?: Date;
    featuresUsed?: string[];
    npsScore?: number;
  }
) {
  try {
    await prisma.userMetrics.upsert({
      where: { userId },
      create: {
        userId,
        ...updates,
        featuresUsed: updates.featuresUsed || [],
      },
      update: updates,
    });
  } catch (error) {
    console.error("Failed to update user metrics:", error);
  }
}

/**
 * Increment a user metric
 */
export async function incrementUserMetric(
  userId: string,
  metric: "totalProjects" | "completedProjects" | "totalTasks" | "completedTasks"
) {
  try {
    const existing = await prisma.userMetrics.findUnique({
      where: { userId },
    });

    if (existing) {
      await prisma.userMetrics.update({
        where: { userId },
        data: {
          [metric]: existing[metric] + 1,
        },
      });
    } else {
      // Create initial metrics
      await prisma.userMetrics.create({
        data: {
          userId,
          [metric]: 1,
        },
      });
    }
  } catch (error) {
    console.error("Failed to increment user metric:", error);
  }
}

/**
 * Update user streak
 */
export async function updateUserStreak(userId: string) {
  try {
    const metrics = await prisma.userMetrics.findUnique({
      where: { userId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!metrics) {
      // First time
      await prisma.userMetrics.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: new Date(),
        },
      });
      return;
    }

    const lastActive = metrics.lastActiveDate
      ? new Date(metrics.lastActiveDate)
      : null;

    if (!lastActive) {
      await prisma.userMetrics.update({
        where: { userId },
        data: {
          currentStreak: 1,
          longestStreak: Math.max(1, metrics.longestStreak),
          lastActiveDate: new Date(),
        },
      });
      return;
    }

    lastActive.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, no change
      return;
    } else if (daysDiff === 1) {
      // Consecutive day
      const newStreak = metrics.currentStreak + 1;
      await prisma.userMetrics.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, metrics.longestStreak),
          lastActiveDate: new Date(),
        },
      });
    } else {
      // Streak broken
      await prisma.userMetrics.update({
        where: { userId },
        data: {
          currentStreak: 1,
          lastActiveDate: new Date(),
        },
      });
    }
  } catch (error) {
    console.error("Failed to update user streak:", error);
  }
}

/**
 * Add a feature to user's used features
 */
export async function trackFeatureUsage(userId: string, featureName: string) {
  try {
    const metrics = await prisma.userMetrics.findUnique({
      where: { userId },
    });

    const featuresUsed = (metrics?.featuresUsed as string[]) || [];
    
    if (!featuresUsed.includes(featureName)) {
      await prisma.userMetrics.upsert({
        where: { userId },
        create: {
          userId,
          featuresUsed: [featureName],
        },
        update: {
          featuresUsed: [...featuresUsed, featureName],
        },
      });
    }
  } catch (error) {
    console.error("Failed to track feature usage:", error);
  }
}

