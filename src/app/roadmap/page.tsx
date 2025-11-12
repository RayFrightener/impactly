"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAllFeedback, toggleFeedbackVote, type FeedbackType, type FeedbackStatus } from "@/app/actions/feedback";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  upvotes: number;
  createdAt: Date;
  user: {
    name: string | null;
    image: string | null;
  } | null;
  votes: Array<{
    userId: string;
  }>;
}

export default function RoadmapPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | FeedbackType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const data = await getAllFeedback();
      setFeedback(data as FeedbackItem[]);
    } catch (error) {
      console.error("Failed to load feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (feedbackId: string) => {
    try {
      await toggleFeedbackVote(feedbackId);
      await loadFeedback(); // Reload to get updated votes
    } catch (error) {
      console.error("Failed to vote:", error);
      alert("Please sign in to vote");
    }
  };

  const filteredFeedback = feedback.filter((item) => {
    if (filter !== "all" && item.type !== filter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return <LoadingScreen message="Loading roadmap..." />;
  }

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
            Product Roadmap
          </h1>
          <p className="text-gray-600">
            See what we&apos;re building and vote on features you&apos;d like to see
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Filter by Type
              </label>
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                  label="All"
                />
                <FilterButton
                  active={filter === "FEATURE_REQUEST"}
                  onClick={() => setFilter("FEATURE_REQUEST")}
                  label="Features"
                />
                <FilterButton
                  active={filter === "BUG"}
                  onClick={() => setFilter("BUG")}
                  label="Bugs"
                />
                <FilterButton
                  active={filter === "IMPROVEMENT"}
                  onClick={() => setFilter("IMPROVEMENT")}
                  label="Improvements"
                />
                <FilterButton
                  active={filter === "PRAISE"}
                  onClick={() => setFilter("PRAISE")}
                  label="Praise"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Filter by Status
              </label>
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                  label="All"
                />
                <FilterButton
                  active={statusFilter === "PENDING"}
                  onClick={() => setStatusFilter("PENDING")}
                  label="Pending"
                />
                <FilterButton
                  active={statusFilter === "PLANNED"}
                  onClick={() => setStatusFilter("PLANNED")}
                  label="Planned"
                />
                <FilterButton
                  active={statusFilter === "IN_PROGRESS"}
                  onClick={() => setStatusFilter("IN_PROGRESS")}
                  label="In Progress"
                />
                <FilterButton
                  active={statusFilter === "COMPLETED"}
                  onClick={() => setStatusFilter("COMPLETED")}
                  label="Completed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        {filteredFeedback.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No feedback yet
            </h2>
            <p className="text-gray-600 mb-6">
              Be the first to submit feedback and shape the future of Impactly!
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((item) => {
              const hasVoted = session?.user?.id
                ? item.votes.some((vote) => vote.userId === session.user!.id)
                : false;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Vote Button */}
                    <button
                      onClick={() => handleVote(item.id)}
                      className={`flex flex-col items-center justify-center min-w-[60px] h-20 rounded-lg border-2 transition-all ${
                        hasVoted
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                      }`}
                    >
                      <span className={`text-2xl ${hasVoted ? "text-blue-600" : "text-gray-400"}`}>
                        ▲
                      </span>
                      <span className={`text-sm font-bold ${hasVoted ? "text-blue-600" : "text-gray-600"}`}>
                        {item.upvotes}
                      </span>
                    </button>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            Submitted by {item.user?.name || "Anonymous"} •{" "}
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <TypeBadge type={item.type} />
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            label="Total Feedback"
            value={feedback.length}
            icon="💬"
          />
          <StatCard
            label="Pending"
            value={feedback.filter((f) => f.status === "PENDING").length}
            icon="⏳"
          />
          <StatCard
            label="In Progress"
            value={feedback.filter((f) => f.status === "IN_PROGRESS").length}
            icon="🚧"
          />
          <StatCard
            label="Completed"
            value={feedback.filter((f) => f.status === "COMPLETED").length}
            icon="✅"
          />
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        active
          ? "bg-blue-600 text-white shadow-md"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function TypeBadge({ type }: { type: FeedbackType }) {
  const config = {
    BUG: { icon: "🐛", label: "Bug", color: "bg-red-100 text-red-700" },
    FEATURE_REQUEST: { icon: "✨", label: "Feature", color: "bg-blue-100 text-blue-700" },
    IMPROVEMENT: { icon: "💡", label: "Improvement", color: "bg-purple-100 text-purple-700" },
    PRAISE: { icon: "❤️", label: "Praise", color: "bg-pink-100 text-pink-700" },
    OTHER: { icon: "📝", label: "Other", color: "bg-gray-100 text-gray-700" },
  };

  const { icon, label, color } = config[type];

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const config = {
    PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
    REVIEWING: { label: "Reviewing", color: "bg-blue-100 text-blue-700" },
    PLANNED: { label: "Planned", color: "bg-purple-100 text-purple-700" },
    IN_PROGRESS: { label: "In Progress", color: "bg-orange-100 text-orange-700" },
    COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700" },
    DECLINED: { label: "Declined", color: "bg-gray-100 text-gray-700" },
  };

  const { label, color } = config[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

