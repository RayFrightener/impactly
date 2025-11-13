"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getAdminAnalytics } from "@/app/actions/analytics";
import LoadingScreen from "@/components/LoadingScreen";

interface AdminAnalyticsData {
  overview: {
    totalUsers: number;
    totalProjects: number;
    totalTasks: number;
    totalJournalEntries: number;
    totalCompletedProjects: number;
    totalCompletedTasks: number;
    totalTimeSpent: number;
    avgNpsScore: number;
    dau: number;
    wau: number;
    mau: number;
  };
  feedback: {
    totalFeedback: number;
    pendingFeedback: number;
    completedFeedback: number;
    featureRequests: number;
    bugs: number;
  };
  userMetrics: Array<{
    id: string;
    userId: string;
    totalProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    currentStreak: number;
    longestStreak: number;
    user: {
      name: string | null;
      email: string;
      createdAt: Date;
    };
  }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    eventData: unknown;
    createdAt: Date;
    duration: number | null;
    platform: string | null;
    user: {
      name: string | null;
      email: string;
    };
  }>;
  eventBreakdown: Array<{
    eventType: string;
    _count: {
      id: number;
    };
  }>;
  activityTrends: Array<{
    time: Date;
    count: number;
  }>;
  heatmapData: Array<{
    hour: number;
    count: number;
  }>;
  eventFrequency: {
    totalEvents: number;
    eventsPerHour: number;
    eventsPerDay: number;
    mostCommonEventType: string;
    peakActivityHour: number | null;
  };
  activeUsers: Array<{
    userId: string;
    eventCount: number;
    latestAction: {
      id: string;
      eventType: string;
      createdAt: Date;
      user: {
        name: string | null;
        email: string;
      };
    } | null;
  }>;
  performance?: {
    webVitals: {
      lcp: {
        avg: number;
        p50: number;
        p75: number;
        p95: number;
        count: number;
      };
      fid: {
        avg: number;
        p50: number;
        p75: number;
        p95: number;
        count: number;
      };
      cls: {
        avg: number;
        p50: number;
        p75: number;
        p95: number;
        count: number;
      };
    };
    pageLoad: {
      avg: number;
      p50: number;
      p75: number;
      p95: number;
      count: number;
    };
    slowPages: Array<{
      page: string;
      loadTime: number;
      count: number;
      avgLoadTime: number;
    }>;
  };
}

type TimeRange = "hour" | "day" | "week" | "month" | "custom" | null;

interface EventFilters {
  timeRange: TimeRange;
  eventTypes: string[];
  userEmail: string;
  customStartDate: string;
  customEndDate: string;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    timeRange: "day",
    eventTypes: [],
    userEmail: "",
    customStartDate: "",
    customEndDate: "",
  });
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check authorization
    if (status === "loading") return;
    
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || !session?.user?.email || session.user.email !== adminEmail) {
      router.push("/dashboard");
      return;
    }

    // Load analytics
    async function loadAnalytics() {
      try {
        setLoading(true);
        const filterParams: {
          timeRange?: "hour" | "day" | "week" | "month" | "custom";
          customStartDate?: Date;
          customEndDate?: Date;
          eventTypes?: string[];
          userEmail?: string;
        } = {};

        if (filters.timeRange) {
          filterParams.timeRange = filters.timeRange;
        }

        if (filters.timeRange === "custom") {
          if (filters.customStartDate) {
            filterParams.customStartDate = new Date(filters.customStartDate);
          }
          if (filters.customEndDate) {
            filterParams.customEndDate = new Date(filters.customEndDate);
          }
        }

        if (filters.eventTypes.length > 0) {
          filterParams.eventTypes = filters.eventTypes;
        }

        if (filters.userEmail) {
          filterParams.userEmail = filters.userEmail;
        }

        const data = await getAdminAnalytics(filterParams);
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [session, status, router, filters]);

  if (status === "loading" || loading) {
    return <LoadingScreen message="Loading analytics..." />;
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-xl text-red-600 mb-4">{error || "Failed to load analytics"}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { overview } = analytics;

  // Calculate derived metrics
  const avgProjectsPerUser = overview.totalUsers > 0 
    ? (overview.totalProjects / overview.totalUsers).toFixed(1)
    : "0";
  const avgTasksPerUser = overview.totalUsers > 0
    ? (overview.totalTasks / overview.totalUsers).toFixed(1)
    : "0";
  const projectCompletionRate = overview.totalProjects > 0
    ? ((overview.totalCompletedProjects / overview.totalProjects) * 100).toFixed(1)
    : "0";
  const taskCompletionRate = overview.totalTasks > 0
    ? ((overview.totalCompletedTasks / overview.totalTasks) * 100).toFixed(1)
    : "0";
  const avgTimePerUserHours = overview.totalUsers > 0
    ? (overview.totalTimeSpent / overview.totalUsers / 3600).toFixed(1)
    : "0";
  const totalHoursSaved = (overview.totalTimeSpent / 3600).toFixed(0);
  
  // Retention rate calculation
  const retentionRate = overview.totalUsers > 0
    ? ((overview.mau / overview.totalUsers) * 100).toFixed(1)
    : "0";

  // Export resume stats
  const generateResumeStats = () => {
    const stats = `
**Impactly - Product Analytics**

Key Metrics:
• ${overview.totalUsers} total users with ${retentionRate}% 30-day retention
• Users completed ${overview.totalCompletedProjects}+ projects and ${overview.totalCompletedTasks}+ tasks
• Saved users an estimated ${totalHoursSaved}+ hours of planning time
• ${taskCompletionRate}% task completion rate
• ${overview.avgNpsScore.toFixed(1)}/10 average user satisfaction score
• ${overview.dau} daily active users, ${overview.wau} weekly, ${overview.mau} monthly

User Engagement:
• Average ${avgProjectsPerUser} projects per user
• Average ${avgTasksPerUser} tasks per user
• ${projectCompletionRate}% project completion rate
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(stats);
    alert("Resume stats copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Admin Analytics Dashboard
            </h1>
            <p className="text-slate-600">
              Resume-worthy metrics for {session?.user?.name}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateResumeStats}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              📋 Export for Resume
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Users"
            value={overview.totalUsers}
            subtitle={`${overview.dau} active today`}
            icon="👥"
            color="blue"
          />
          <MetricCard
            title="Projects Created"
            value={overview.totalProjects}
            subtitle={`${overview.totalCompletedProjects} completed (${projectCompletionRate}%)`}
            icon="📁"
            color="purple"
          />
          <MetricCard
            title="Tasks Completed"
            value={overview.totalCompletedTasks}
            subtitle={`of ${overview.totalTasks} total (${taskCompletionRate}%)`}
            icon="✅"
            color="green"
          />
          <MetricCard
            title="Time Saved"
            value={`${totalHoursSaved}h`}
            subtitle={`${avgTimePerUserHours}h per user`}
            icon="⏱️"
            color="amber"
          />
        </div>

        {/* Feedback Metrics */}
        {analytics.feedback && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Feedback Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {analytics.feedback.totalFeedback}
                </div>
                <div className="text-sm text-slate-600">Total Feedback</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-1">
                  {analytics.feedback.pendingFeedback}
                </div>
                <div className="text-sm text-slate-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {analytics.feedback.completedFeedback}
                </div>
                <div className="text-sm text-slate-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {analytics.feedback.featureRequests}
                </div>
                <div className="text-sm text-slate-600">Feature Requests</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {analytics.feedback.bugs}
                </div>
                <div className="text-sm text-slate-600">Bugs</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => router.push("/admin/feedback")}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Manage Feedback →
              </button>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {analytics.performance && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Performance Metrics (Last 7 Days)
            </h3>

            {/* Web Vitals */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-slate-700 mb-3">Core Web Vitals</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* LCP */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">LCP</span>
                    <span className="text-xs text-slate-500">
                      {analytics.performance.webVitals.lcp.count} samples
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mb-1">
                    {(analytics.performance.webVitals.lcp.avg / 1000).toFixed(2)}s
                  </div>
                  <div className="text-xs text-slate-500">
                    P50: {(analytics.performance.webVitals.lcp.p50 / 1000).toFixed(2)}s | P95:{" "}
                    {(analytics.performance.webVitals.lcp.p95 / 1000).toFixed(2)}s
                  </div>
                  <div className="mt-2">
                    <div
                      className={`text-xs font-medium ${
                        analytics.performance.webVitals.lcp.avg < 2500
                          ? "text-green-600"
                          : analytics.performance.webVitals.lcp.avg < 4000
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {analytics.performance.webVitals.lcp.avg < 2500
                        ? "Good"
                        : analytics.performance.webVitals.lcp.avg < 4000
                          ? "Needs Improvement"
                          : "Poor"}
                    </div>
                  </div>
                </div>

                {/* FID */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">FID</span>
                    <span className="text-xs text-slate-500">
                      {analytics.performance.webVitals.fid.count} samples
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mb-1">
                    {analytics.performance.webVitals.fid.avg.toFixed(0)}ms
                  </div>
                  <div className="text-xs text-slate-500">
                    P50: {analytics.performance.webVitals.fid.p50.toFixed(0)}ms | P95:{" "}
                    {analytics.performance.webVitals.fid.p95.toFixed(0)}ms
                  </div>
                  <div className="mt-2">
                    <div
                      className={`text-xs font-medium ${
                        analytics.performance.webVitals.fid.avg < 100
                          ? "text-green-600"
                          : analytics.performance.webVitals.fid.avg < 300
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {analytics.performance.webVitals.fid.avg < 100
                        ? "Good"
                        : analytics.performance.webVitals.fid.avg < 300
                          ? "Needs Improvement"
                          : "Poor"}
                    </div>
                  </div>
                </div>

                {/* CLS */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">CLS</span>
                    <span className="text-xs text-slate-500">
                      {analytics.performance.webVitals.cls.count} samples
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mb-1">
                    {analytics.performance.webVitals.cls.avg.toFixed(3)}
                  </div>
                  <div className="text-xs text-slate-500">
                    P50: {analytics.performance.webVitals.cls.p50.toFixed(3)} | P95:{" "}
                    {analytics.performance.webVitals.cls.p95.toFixed(3)}
                  </div>
                  <div className="mt-2">
                    <div
                      className={`text-xs font-medium ${
                        analytics.performance.webVitals.cls.avg < 0.1
                          ? "text-green-600"
                          : analytics.performance.webVitals.cls.avg < 0.25
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {analytics.performance.webVitals.cls.avg < 0.1
                        ? "Good"
                        : analytics.performance.webVitals.cls.avg < 0.25
                          ? "Needs Improvement"
                          : "Poor"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Load Times */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-slate-700 mb-3">Page Load Performance</h4>
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Average Load Time</span>
                  <span className="text-xs text-slate-500">
                    {analytics.performance.pageLoad.count} samples
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {(analytics.performance.pageLoad.avg / 1000).toFixed(2)}s
                </div>
                <div className="text-xs text-slate-500">
                  P50: {(analytics.performance.pageLoad.p50 / 1000).toFixed(2)}s | P75:{" "}
                  {(analytics.performance.pageLoad.p75 / 1000).toFixed(2)}s | P95:{" "}
                  {(analytics.performance.pageLoad.p95 / 1000).toFixed(2)}s
                </div>
              </div>
            </div>

            {/* Slow Pages */}
            {analytics.performance.slowPages.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-slate-700 mb-3">Slowest Pages</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-600 px-4 py-2">
                          Page
                        </th>
                        <th className="text-right text-xs font-semibold text-slate-600 px-4 py-2">
                          Avg Load Time
                        </th>
                        <th className="text-right text-xs font-semibold text-slate-600 px-4 py-2">
                          Samples
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.performance.slowPages.map((page, index) => (
                        <tr
                          key={index}
                          className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        >
                          <td className="px-4 py-2 text-sm text-slate-900 font-mono">
                            {page.page}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            <span
                              className={`font-semibold ${
                                page.avgLoadTime > 5000
                                  ? "text-red-600"
                                  : page.avgLoadTime > 3000
                                    ? "text-yellow-600"
                                    : "text-slate-900"
                              }`}
                            >
                              {(page.avgLoadTime / 1000).toFixed(2)}s
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-slate-600">
                            {page.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              User Activity
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Daily Active Users</span>
                <span className="text-2xl font-bold text-blue-600">{overview.dau}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Weekly Active Users</span>
                <span className="text-2xl font-bold text-purple-600">{overview.wau}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Monthly Active Users</span>
                <span className="text-2xl font-bold text-green-600">{overview.mau}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              User Retention
            </h3>
            <div className="text-center py-4">
              <div className="text-5xl font-bold text-green-600 mb-2">
                {retentionRate}%
              </div>
              <p className="text-slate-600">30-day retention rate</p>
              <p className="text-sm text-slate-500 mt-2">
                {overview.mau} of {overview.totalUsers} users active this month
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              User Satisfaction
            </h3>
            <div className="text-center py-4">
              <div className="text-5xl font-bold text-amber-600 mb-2">
                {overview.avgNpsScore.toFixed(1)}
                <span className="text-2xl text-slate-400">/10</span>
              </div>
              <p className="text-slate-600">Average NPS Score</p>
              <div className="flex items-center justify-center gap-1 mt-3">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-8 rounded ${
                      i < Math.round(overview.avgNpsScore)
                        ? "bg-amber-500"
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Event Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Event Breakdown
            </h3>
            <div className="space-y-2">
              {analytics.eventBreakdown.map((event) => (
                <div key={event.eventType} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {event.eventType.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {event._count.id}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (event._count.id /
                              Math.max(...analytics.eventBreakdown.map((e) => e._count.id))) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Top Users
            </h3>
            <div className="space-y-3">
              {analytics.userMetrics.slice(0, 5).map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {metric.user.name || "Anonymous"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {metric.totalProjects} projects, {metric.completedTasks} tasks
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      {metric.currentStreak} day streak
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Visualizations */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Activity Trends Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Activity Trends
              </h3>
              <div className="h-64 flex items-end justify-between gap-1">
                {analytics.activityTrends.length > 0 ? (
                  analytics.activityTrends.map((point, index) => {
                    const maxCount = Math.max(
                      ...analytics.activityTrends.map((p) => p.count),
                      1
                    );
                    const height = (point.count / maxCount) * 100;
                    return (
                      <div
                        key={index}
                        className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                        style={{ height: `${height}%` }}
                        title={`${new Date(point.time).toLocaleString()}: ${point.count} events`}
                      />
                    );
                  })
                ) : (
                  <div className="w-full text-center text-slate-500 py-8">
                    No activity data available
                  </div>
                )}
              </div>
            </div>

            {/* Activity Heatmap */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Activity Heatmap (by Hour)
              </h3>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const data = analytics.heatmapData.find((h) => h.hour === hour);
                  const count = data?.count || 0;
                  const maxCount = Math.max(
                    ...analytics.heatmapData.map((h) => h.count),
                    1
                  );
                  const intensity = (count / maxCount) * 100;
                  const bgIntensity = Math.min(intensity, 100);
                  return (
                    <div
                      key={hour}
                      className="w-[calc(4.166%-0.25rem)] aspect-square rounded min-w-[20px]"
                      style={{
                        backgroundColor: `rgba(59, 130, 246, ${bgIntensity / 100})`,
                      }}
                      title={`${hour}:00 - ${count} events`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-slate-500 text-center">
                0:00 - 23:00 (24 hours)
              </div>
            </div>
          </div>
        )}

        {/* Event Frequency Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-sm text-slate-600 mb-1">Total Events</div>
              <div className="text-3xl font-bold text-slate-900">
                {analytics.eventFrequency.totalEvents}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-sm text-slate-600 mb-1">Events/Hour</div>
              <div className="text-3xl font-bold text-slate-900">
                {analytics.eventFrequency.eventsPerHour.toFixed(1)}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-sm text-slate-600 mb-1">Most Common</div>
              <div className="text-lg font-semibold text-slate-900 truncate">
                {analytics.eventFrequency.mostCommonEventType
                  .replace(/_/g, " ")
                  .toLowerCase()}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-sm text-slate-600 mb-1">Peak Hour</div>
              <div className="text-3xl font-bold text-slate-900">
                {analytics.eventFrequency.peakActivityHour !== null
                  ? `${analytics.eventFrequency.peakActivityHour}:00`
                  : "N/A"}
              </div>
            </div>
          </div>
        )}

        {/* Most Active Users */}
        {analytics && analytics.activeUsers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Most Active Users
            </h3>
            <div className="space-y-3">
              {analytics.activeUsers.map((activeUser) => (
                <div
                  key={activeUser.userId}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {activeUser.latestAction?.user.name ||
                        activeUser.latestAction?.user.email ||
                        "Unknown User"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {activeUser.eventCount} events
                      {activeUser.latestAction && (
                        <span className="ml-2">
                          • Latest:{" "}
                          {activeUser.latestAction.eventType
                            .replace(/_/g, " ")
                            .toLowerCase()}{" "}
                          at{" "}
                          {new Date(
                            activeUser.latestAction.createdAt
                          ).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Filter Events
            </h3>
            <button
              onClick={() => {
                setFilters({
                  timeRange: "day",
                  eventTypes: [],
                  userEmail: "",
                  customStartDate: "",
                  customEndDate: "",
                });
              }}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Time Range Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Time Range
              </label>
              <select
                value={filters.timeRange || ""}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    timeRange: e.target.value as TimeRange,
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hour">Last Hour</option>
                <option value="day">Last 24 Hours</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {filters.timeRange === "custom" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={filters.customStartDate}
                    onChange={(e) => {
                      setFilters({
                        ...filters,
                        customStartDate: e.target.value,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={filters.customEndDate}
                    onChange={(e) => {
                      setFilters({
                        ...filters,
                        customEndDate: e.target.value,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                User Email (optional)
              </label>
              <input
                type="email"
                value={filters.userEmail}
                onChange={(e) => {
                  setFilters({ ...filters, userEmail: e.target.value });
                }}
                placeholder="Filter by user email..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Event Type Filter */}
          {analytics && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Event Types
              </label>
              <div className="flex flex-wrap gap-2">
                {analytics.eventBreakdown.map((eventType) => (
                  <label
                    key={eventType.eventType}
                    className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={filters.eventTypes.includes(eventType.eventType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({
                            ...filters,
                            eventTypes: [...filters.eventTypes, eventType.eventType],
                          });
                        } else {
                          setFilters({
                            ...filters,
                            eventTypes: filters.eventTypes.filter(
                              (t) => t !== eventType.eventType
                            ),
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">
                      {eventType.eventType.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters Badge */}
          {(filters.eventTypes.length > 0 ||
            filters.userEmail ||
            filters.timeRange) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-slate-600">Active filters:</span>
              {filters.timeRange && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {filters.timeRange === "custom"
                    ? "Custom Range"
                    : `Last ${filters.timeRange}`}
                </span>
              )}
              {filters.eventTypes.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {filters.eventTypes.length} event type(s)
                </span>
              )}
              {filters.userEmail && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  User: {filters.userEmail}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Recent Events
            </h3>
            {analytics && (
              <span className="text-sm text-slate-600">
                {analytics.recentEvents.length} events
              </span>
            )}
          </div>
          <div className="space-y-2">
            {analytics.recentEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No events found for the selected filters
              </div>
            ) : (
              analytics.recentEvents.map((event) => {
                const isExpanded = expandedEvents.has(event.id);
                const eventDate = new Date(event.createdAt);
                const now = new Date();
                const diffMs = now.getTime() - eventDate.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                let relativeTime: string;
                if (diffMins < 1) {
                  relativeTime = "Just now";
                } else if (diffMins < 60) {
                  relativeTime = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
                } else if (diffHours < 24) {
                  relativeTime = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
                } else if (diffDays < 7) {
                  relativeTime = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
                } else {
                  relativeTime = eventDate.toLocaleDateString();
                }

                const getEventIcon = (eventType: string): string => {
                  if (eventType.includes("project")) return "📁";
                  if (eventType.includes("task")) return "✅";
                  if (eventType.includes("session")) return "🔥";
                  if (eventType.includes("journal")) return "📔";
                  if (eventType.includes("feedback")) return "💬";
                  if (eventType.includes("page")) return "🌐";
                  return "📝";
                };

                const getEventDataPreview = (eventData: unknown): string => {
                  if (!eventData || typeof eventData !== "object") return "";
                  const data = eventData as Record<string, unknown>;
                  const parts: string[] = [];
                  if (data.projectId) parts.push(`Project: ${data.projectId}`);
                  if (data.taskId) parts.push(`Task: ${data.taskId}`);
                  if (data.page) parts.push(`Page: ${data.page}`);
                  if (data.metricName) parts.push(`Metric: ${data.metricName}`);
                  return parts.join(", ");
                };

                return (
                  <div
                    key={event.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <div
                      className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => {
                        const newExpanded = new Set(expandedEvents);
                        if (isExpanded) {
                          newExpanded.delete(event.id);
                        } else {
                          newExpanded.add(event.id);
                        }
                        setExpandedEvents(newExpanded);
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">{getEventIcon(event.eventType)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">
                              {event.eventType.replace(/_/g, " ").toLowerCase()}
                            </p>
                            {getEventDataPreview(event.eventData) && (
                              <span className="text-xs text-slate-500">
                                ({getEventDataPreview(event.eventData)})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-slate-600">
                              {event.user.name || event.user.email}
                            </p>
                            {event.platform && (
                              <span className="text-xs text-slate-400">
                                • {event.platform}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900">
                            {relativeTime}
                          </p>
                          <p className="text-xs text-slate-500">
                            {eventDate.toLocaleString()}
                          </p>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? "▼" : "▶"}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-3 bg-slate-50 border-t border-slate-100">
                        <div className="pt-3 space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-slate-600">
                              Event ID:
                            </span>{" "}
                            <span className="text-xs text-slate-700 font-mono">
                              {event.id}
                            </span>
                          </div>
                          {event.duration !== null && (
                            <div>
                              <span className="text-xs font-semibold text-slate-600">
                                Duration:
                              </span>{" "}
                              <span className="text-xs text-slate-700">
                                {event.duration}ms
                              </span>
                            </div>
                          )}
                          {event.eventData != null && (
                            <div>
                              <span className="text-xs font-semibold text-slate-600">
                                Event Data:
                              </span>
                              <pre className="text-xs text-slate-700 mt-1 p-2 bg-white rounded border border-slate-200 overflow-x-auto">
                                {JSON.stringify(event.eventData, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: string;
  color: "blue" | "purple" | "green" | "amber";
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl shadow-lg p-6 text-white`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="text-4xl font-bold mb-2">{value}</div>
      <p className="text-sm opacity-90">{subtitle}</p>
    </div>
  );
}

