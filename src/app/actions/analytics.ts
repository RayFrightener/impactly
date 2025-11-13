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

interface AnalyticsFilters {
  timeRange?: "hour" | "day" | "week" | "month" | "custom";
  customStartDate?: Date;
  customEndDate?: Date;
  eventTypes?: string[];
  userId?: string;
  userEmail?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get admin analytics (protected - only for admin email)
 */
export async function getAdminAnalytics(filters?: AnalyticsFilters) {
  await requireAdmin();

  // Calculate time range for filters
  const now = new Date();
  let startDate: Date | undefined;
  
  if (filters?.timeRange === "hour") {
    startDate = new Date(now.getTime() - 60 * 60 * 1000);
  } else if (filters?.timeRange === "day") {
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (filters?.timeRange === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (filters?.timeRange === "month") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (filters?.timeRange === "custom" && filters.customStartDate) {
    startDate = filters.customStartDate;
  }

  const endDate = filters?.customEndDate || now;

  // Build event query filters
  const eventWhere: {
    createdAt?: { gte?: Date; lte?: Date };
    eventType?: { in?: string[] };
    userId?: string;
  } = {};

  if (startDate) {
    eventWhere.createdAt = { gte: startDate, lte: endDate };
  }

  if (filters?.eventTypes && filters.eventTypes.length > 0) {
    eventWhere.eventType = { in: filters.eventTypes };
  }

  if (filters?.userId) {
    eventWhere.userId = filters.userId;
  } else if (filters?.userEmail) {
    // Need to find user ID from email first
    const user = await prisma.user.findUnique({
      where: { email: filters.userEmail },
      select: { id: true },
    });
    if (user) {
      eventWhere.userId = user.id;
    } else {
      // User not found, return empty results
      eventWhere.userId = "non-existent-user-id";
    }
  }

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
      where: eventWhere,
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        eventType: true,
        eventData: true,
        createdAt: true,
        duration: true,
        platform: true,
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

  // Get activity trends data (grouped by hour/day)
  // Fetch all events and group them in memory by time bucket
  const allEventsForTrends = await prisma.analytics.findMany({
    where: startDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters?.eventTypes && filters.eventTypes.length > 0
        ? { eventType: { in: filters.eventTypes } }
        : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
    } : {},
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Group events by hour for trends
  const trendsByHour: Record<string, number> = {};
  allEventsForTrends.forEach((event) => {
    const date = new Date(event.createdAt);
    // Round to nearest hour
    date.setMinutes(0, 0, 0);
    const key = date.toISOString();
    trendsByHour[key] = (trendsByHour[key] || 0) + 1;
  });

  const trendsData = Object.entries(trendsByHour).map(([time, count]) => ({
    time: new Date(time),
    count,
  }));

  // Get heatmap data (events by hour of day)
  const allEventsForHeatmap = await prisma.analytics.findMany({
    where: startDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters?.eventTypes && filters.eventTypes.length > 0
        ? { eventType: { in: filters.eventTypes } }
        : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
    } : {},
    select: {
      createdAt: true,
    },
  });

  // Process heatmap data: group by hour of day (0-23)
  const heatmapData: Record<number, number> = {};
  for (let hour = 0; hour < 24; hour++) {
    heatmapData[hour] = 0;
  }
  allEventsForHeatmap.forEach((event) => {
    const hour = new Date(event.createdAt).getHours();
    heatmapData[hour] = (heatmapData[hour] || 0) + 1;
  });

  // Get most active users in the filtered period
  const activeUsersData = await prisma.analytics.groupBy({
    by: ["userId"],
    where: startDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters?.eventTypes && filters.eventTypes.length > 0
        ? { eventType: { in: filters.eventTypes } }
        : {}),
    } : {},
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 10,
  });

  // Get latest action for each active user
  const activeUserIds = activeUsersData.map((u) => u.userId);
  const latestActions = await Promise.all(
    activeUserIds.map(async (userId) => {
      const latest = await prisma.analytics.findFirst({
        where: {
          userId,
          ...(startDate
            ? {
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
              }
            : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          eventType: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
      return latest;
    })
  );

  // Performance metrics aggregation
  const performanceEvents = await prisma.analytics.findMany({
    where: {
      eventType: {
        in: ["web_vital", "page_load", "component_render", "api_request"],
      },
      createdAt: {
        gte: oneWeekAgo,
      },
    },
    select: {
      eventType: true,
      eventData: true,
      duration: true,
      createdAt: true,
    },
  });

  // Calculate Web Vitals statistics
  const webVitals = performanceEvents.filter((e) => e.eventType === "web_vital");
  const lcpValues = webVitals
    .filter((e) => {
      const data = e.eventData as { metricName?: string; value?: number } | null;
      return data?.metricName === "LCP" && typeof data.value === "number";
    })
    .map((e) => {
      const data = e.eventData as { value: number };
      return data.value;
    });
  const fidValues = webVitals
    .filter((e) => {
      const data = e.eventData as { metricName?: string; value?: number } | null;
      return data?.metricName === "FID" && typeof data.value === "number";
    })
    .map((e) => {
      const data = e.eventData as { value: number };
      return data.value;
    });
  const clsValues = webVitals
    .filter((e) => {
      const data = e.eventData as { metricName?: string; value?: number } | null;
      return data?.metricName === "CLS" && typeof data.value === "number";
    })
    .map((e) => {
      const data = e.eventData as { value: number };
      return data.value;
    });

  const calculatePercentile = (values: number[], percentile: number): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  };

  const avgLcp = lcpValues.length > 0 ? lcpValues.reduce((a, b) => a + b, 0) / lcpValues.length : 0;
  const avgFid = fidValues.length > 0 ? fidValues.reduce((a, b) => a + b, 0) / fidValues.length : 0;
  const avgCls = clsValues.length > 0 ? clsValues.reduce((a, b) => a + b, 0) / clsValues.length : 0;

  // Page load times
  const pageLoadEvents = performanceEvents.filter((e) => e.eventType === "page_load");
  const pageLoadTimes = pageLoadEvents
    .filter((e) => e.duration !== null)
    .map((e) => e.duration as number);
  const avgPageLoadTime = pageLoadTimes.length > 0
    ? pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length
    : 0;

  // Slow pages (pages with load time > 3s)
  const slowPages = pageLoadEvents
    .filter((e) => {
      const data = e.eventData as { page?: string; value?: number } | null;
      return (data?.value || e.duration || 0) > 3000;
    })
    .map((e) => {
      const data = e.eventData as { page?: string; value?: number } | null;
      return {
        page: data?.page || "unknown",
        loadTime: data?.value || e.duration || 0,
      };
    })
    .reduce((acc, curr) => {
      const existing = acc.find((p) => p.page === curr.page);
      if (existing) {
        existing.count++;
        existing.avgLoadTime = (existing.avgLoadTime + curr.loadTime) / 2;
      } else {
        acc.push({ ...curr, count: 1, avgLoadTime: curr.loadTime });
      }
      return acc;
    }, [] as Array<{ page: string; loadTime: number; count: number; avgLoadTime: number }>)
    .sort((a, b) => b.avgLoadTime - a.avgLoadTime)
    .slice(0, 10);

  // Calculate event frequency metrics
  const totalEventsInPeriod = recentEvents.length;
  const hoursInPeriod = startDate
    ? Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
    : 24;
  const eventsPerHour = totalEventsInPeriod / hoursInPeriod;
  const eventsPerDay = eventsPerHour * 24;

  // Find most common event type in period
  const eventTypeCounts = recentEvents.reduce(
    (acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const mostCommonEventType = Object.entries(eventTypeCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || "N/A";

  // Find peak activity hour
  const peakHour = Object.entries(heatmapData).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  // Process trends data into time series (already processed above)
  const timeSeriesData = trendsData;

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
    performance: {
      webVitals: {
        lcp: {
          avg: avgLcp,
          p50: calculatePercentile(lcpValues, 50),
          p75: calculatePercentile(lcpValues, 75),
          p95: calculatePercentile(lcpValues, 95),
          count: lcpValues.length,
        },
        fid: {
          avg: avgFid,
          p50: calculatePercentile(fidValues, 50),
          p75: calculatePercentile(fidValues, 75),
          p95: calculatePercentile(fidValues, 95),
          count: fidValues.length,
        },
        cls: {
          avg: avgCls,
          p50: calculatePercentile(clsValues, 50),
          p75: calculatePercentile(clsValues, 75),
          p95: calculatePercentile(clsValues, 95),
          count: clsValues.length,
        },
      },
      pageLoad: {
        avg: avgPageLoadTime,
        p50: calculatePercentile(pageLoadTimes, 50),
        p75: calculatePercentile(pageLoadTimes, 75),
        p95: calculatePercentile(pageLoadTimes, 95),
        count: pageLoadTimes.length,
      },
      slowPages,
    },
    userMetrics,
    recentEvents,
    userGrowth,
    eventBreakdown,
    // New analytics data
    activityTrends: timeSeriesData,
    heatmapData: Object.entries(heatmapData).map(([hour, count]) => ({
      hour: Number.parseInt(hour, 10),
      count,
    })),
    eventFrequency: {
      totalEvents: totalEventsInPeriod,
      eventsPerHour: Math.round(eventsPerHour * 100) / 100,
      eventsPerDay: Math.round(eventsPerDay * 100) / 100,
      mostCommonEventType,
      peakActivityHour: peakHour ? Number.parseInt(peakHour, 10) : null,
    },
    activeUsers: activeUsersData.map((userData, index) => ({
      userId: userData.userId,
      eventCount: userData._count.id,
      latestAction: latestActions[index] || null,
    })),
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

/**
 * Track a performance metric
 */
export async function trackPerformanceMetric(
  eventType: "page_load" | "web_vital" | "component_render" | "api_request",
  metricName: string,
  value: number,
  page?: string,
  metadata?: Record<string, unknown>
) {
  const session = await auth();
  if (!session?.user?.id) return;

  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || undefined;

  await trackEvent({
    userId: session.user.id,
    eventType,
    eventData: {
      metricName,
      value,
      page,
      ...metadata,
    },
    duration: Math.round(value), // Round to integer for duration field
    userAgent,
    platform: "web",
  });
}

