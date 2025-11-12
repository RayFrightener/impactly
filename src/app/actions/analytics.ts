"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { trackEvent, updateUserStreak, incrementUserMetric, trackFeatureUsage, type AnalyticsEventType } from "@/lib/analytics";
import { headers } from "next/headers";
import { requireAdmin } from "@/utils/admin";

/**
 * Track a user event
 */
export async function trackUserEvent(
  eventType: AnalyticsEventType,
  eventData?: Record<string, unknown>
) {
  const session = await auth();
  if (!session?.user?.id) return;

  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || undefined;

  await trackEvent({
    userId: session.user.id,
    eventType,
    eventData,
    userAgent,
    platform: "web",
  });
}

/**
 * Track session start and update streak
 */
export async function trackSessionStart() {
  const session = await auth();
  if (!session?.user?.id) return;

  await updateUserStreak(session.user.id);
  await trackUserEvent("session_start");
  await trackFeatureUsage(session.user.id, "dashboard");
}

/**
 * Get user metrics
 */
export async function getUserMetrics() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const metrics = await prisma.userMetrics.findUnique({
    where: { userId: session.user.id },
  });

  return metrics;
}

/**
 * Get admin analytics (protected - only for admin email)
 */
export async function getAdminAnalytics() {
  await requireAdmin();

  // Get all metrics
  const [
    totalUsers,
    totalProjects,
    totalTasks,
    totalJournalEntries,
    totalFeedback,
    feedbackStats,
    userMetrics,
    recentEvents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.task.count(),
    prisma.journalEntry.count(),
    prisma.feedback.count(),
    Promise.all([
      prisma.feedback.count({ where: { status: "PENDING" } }),
      prisma.feedback.count({ where: { status: "COMPLETED" } }),
      prisma.feedback.count({ where: { type: "FEATURE_REQUEST" } }),
      prisma.feedback.count({ where: { type: "BUG" } }),
    ]),
    prisma.userMetrics.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.analytics.findMany({
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const [pendingFeedback, completedFeedback, featureRequests, bugs] = feedbackStats;

  // Calculate aggregate metrics
  const totalCompletedProjects = userMetrics.reduce(
    (sum, m) => sum + m.completedProjects,
    0
  );
  const totalCompletedTasks = userMetrics.reduce(
    (sum, m) => sum + m.completedTasks,
    0
  );
  const totalTimeSpent = userMetrics.reduce(
    (sum, m) => sum + m.totalTimeSpent,
    0
  );
  const avgNpsScore = userMetrics.length > 0
    ? userMetrics.reduce((sum, m) => sum + (m.npsScore || 0), 0) / userMetrics.length
    : 0;

  // Get DAU, WAU, MAU
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dau, wau, mau] = await Promise.all([
    prisma.userMetrics.count({
      where: {
        lastActiveDate: {
          gte: oneDayAgo,
        },
      },
    }),
    prisma.userMetrics.count({
      where: {
        lastActiveDate: {
          gte: oneWeekAgo,
        },
      },
    }),
    prisma.userMetrics.count({
      where: {
        lastActiveDate: {
          gte: oneMonthAgo,
        },
      },
    }),
  ]);

  // User growth over time
  const userGrowth = await prisma.user.groupBy({
    by: ["createdAt"],
    _count: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Event type breakdown
  const eventBreakdown = await prisma.analytics.groupBy({
    by: ["eventType"],
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
  });

  return {
    overview: {
      totalUsers,
      totalProjects,
      totalTasks,
      totalJournalEntries,
      totalCompletedProjects,
      totalCompletedTasks,
      totalTimeSpent,
      avgNpsScore,
      dau,
      wau,
      mau,
    },
    feedback: {
      totalFeedback,
      pendingFeedback,
      completedFeedback,
      featureRequests,
      bugs,
    },
    userMetrics,
    recentEvents,
    userGrowth,
    eventBreakdown,
  };
}

/**
 * Track project creation
 */
export async function trackProjectCreated(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await incrementUserMetric(session.user.id, "totalProjects");
  await trackUserEvent("project_created", { projectId });
}

/**
 * Track project completion
 */
export async function trackProjectCompleted(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await incrementUserMetric(session.user.id, "completedProjects");
  await trackUserEvent("project_completed", { projectId });
}

/**
 * Track task creation
 */
export async function trackTaskCreated(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await incrementUserMetric(session.user.id, "totalTasks");
  await trackUserEvent("task_created", { taskId });
}

/**
 * Track task completion
 */
export async function trackTaskCompleted(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await incrementUserMetric(session.user.id, "completedTasks");
  await trackUserEvent("task_completed", { taskId });
}

