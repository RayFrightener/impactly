"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getUserMetrics } from "@/app/actions/analytics";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

interface UserMetrics {
  id: string;
  userId: string;
  totalProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalTimeSpent: number;
  averageSessionTime: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  featuresUsed: unknown;
  npsScore: number | null;
  updatedAt: Date;
}

export default function InsightsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const data = await getUserMetrics();
        setMetrics(data);
      } catch (error) {
        console.error("Failed to load metrics:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  if (loading) {
    return <LoadingScreen message="Loading your insights..." />;
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Start Your Journey!
          </h2>
          <p className="text-gray-600 mb-6">
            Create your first project to start tracking your productivity
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const projectCompletionRate = Math.min(
    metrics.totalProjects > 0
      ? Math.round((metrics.completedProjects / metrics.totalProjects) * 100)
      : 0,
    100
  );
  const taskCompletionRate = Math.min(
    metrics.totalTasks > 0
      ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
      : 0,
    100
  );
  const totalHoursSpent = (metrics.totalTimeSpent / 3600).toFixed(1);
  const avgSessionMinutes = (metrics.averageSessionTime / 60).toFixed(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Your Insights, {firstName}
          </h1>
          <p className="text-gray-600">
            Track your productivity and celebrate your progress
          </p>
        </div>

        {/* Streak Section */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-3xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">🔥 Your Streak</h2>
              <p className="text-white/90 mb-4">
                Keep the momentum going!
              </p>
              <div className="flex items-end gap-6">
                <div>
                  <p className="text-sm opacity-90">Current Streak</p>
                  <p className="text-5xl font-bold">{metrics.currentStreak}</p>
                  <p className="text-sm opacity-90">days</p>
                </div>
                <div>
                  <p className="text-sm opacity-90">Longest Streak</p>
                  <p className="text-4xl font-bold">{metrics.longestStreak}</p>
                  <p className="text-sm opacity-90">days</p>
                </div>
              </div>
            </div>
            <div className="text-8xl">🏆</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon="📁"
            title="Projects"
            value={metrics.totalProjects}
            subtitle={`${metrics.completedProjects} completed`}
            progress={projectCompletionRate}
            color="blue"
          />
          <StatCard
            icon="✅"
            title="Tasks"
            value={metrics.totalTasks}
            subtitle={`${metrics.completedTasks} completed`}
            progress={taskCompletionRate}
            color="green"
          />
          <StatCard
            icon="⏱️"
            title="Time Spent"
            value={`${totalHoursSpent}h`}
            subtitle={`~${avgSessionMinutes} min per session`}
            color="purple"
          />
          <StatCard
            icon="🎯"
            title="Features Used"
            value={Array.isArray(metrics.featuresUsed) ? (metrics.featuresUsed as string[]).length : 0}
            subtitle="Different tools"
            color="amber"
          />
        </div>

        {/* Productivity Impact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              📈 Your Productivity
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">
                    Project Completion
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {projectCompletionRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(projectCompletionRate, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">
                    Task Completion
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    {taskCompletionRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(taskCompletionRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              🌟 Achievements
            </h3>
            <div className="space-y-4">
              {metrics.totalProjects >= 1 && (
                <Achievement
                  icon="🎉"
                  title="First Project"
                  description="Created your first project"
                />
              )}
              {metrics.completedProjects >= 1 && (
                <Achievement
                  icon="✨"
                  title="Project Finisher"
                  description="Completed your first project"
                />
              )}
              {metrics.currentStreak >= 3 && (
                <Achievement
                  icon="🔥"
                  title="On Fire"
                  description={`${metrics.currentStreak} day streak!`}
                />
              )}
              {metrics.completedTasks >= 10 && (
                <Achievement
                  icon="💪"
                  title="Task Master"
                  description="Completed 10+ tasks"
                />
              )}
              {metrics.totalProjects >= 5 && (
                <Achievement
                  icon="🚀"
                  title="Project Pro"
                  description="Created 5+ projects"
                />
              )}
              {metrics.currentStreak >= 7 && (
                <Achievement
                  icon="⭐"
                  title="Week Warrior"
                  description="7 day streak achieved!"
                />
              )}
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-xl p-8 text-white text-center">
          <div className="text-5xl mb-4">💫</div>
          <h2 className="text-2xl font-bold mb-2">Keep Going!</h2>
          <p className="text-lg opacity-90">
            {metrics.completedTasks >= 50
              ? "You're a productivity powerhouse! Keep crushing those goals!"
              : metrics.completedTasks >= 20
              ? "Amazing progress! You're building great habits."
              : metrics.completedTasks >= 10
              ? "You're on your way! Every task completed is progress."
              : "Every journey starts with a single step. You've got this!"}
          </p>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  title: string;
  value: number | string;
  subtitle: string;
  progress?: number;
  color: "blue" | "green" | "purple" | "amber";
}

function StatCard({ icon, title, value, subtitle, progress, color }: StatCardProps) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{subtitle}</p>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`bg-gradient-to-r ${colorClasses[color]} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface AchievementProps {
  icon: string;
  title: string;
  description: string;
}

function Achievement({ icon, title, description }: AchievementProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

