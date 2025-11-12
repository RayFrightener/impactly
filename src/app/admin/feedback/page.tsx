"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getAllFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats,
  type FeedbackType,
  type FeedbackStatus,
  type FeedbackPriority,
} from "@/app/actions/feedback";
import LoadingScreen from "@/components/LoadingScreen";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  upvotes: number;
  isAnonymous: boolean;
  page?: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string | null;
    image: string | null;
  } | null;
  adminNotes?: string | null;
}

interface FeedbackStats {
  totalFeedback: number;
  pendingCount: number;
  completedCount: number;
  featureRequestCount: number;
  bugCount: number;
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | FeedbackType>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | FeedbackPriority>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<FeedbackStatus>("PENDING");
  const [editPriority, setEditPriority] = useState<FeedbackPriority>("MEDIUM");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    // Check authorization
    if (status === "loading") return;
    
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!adminEmail || !session?.user?.email || session.user.email !== adminEmail) {
      router.push("/dashboard");
      return;
    }

    // Load feedback
    async function loadFeedback() {
      try {
        setLoading(true);
        const [feedbackData, statsData] = await Promise.all([
          getAllFeedback(),
          getFeedbackStats(),
        ]);
        // Transform feedback data to add isAnonymous field
        const transformedFeedback = feedbackData.map((item) => ({
          ...item,
          isAnonymous: item.userId === null,
        }));
        setFeedback(transformedFeedback as FeedbackItem[]);
        setStats(statsData);
      } catch (err) {
        console.error("Failed to load feedback:", err);
        setError("Failed to load feedback data");
      } finally {
        setLoading(false);
      }
    }

    loadFeedback();
  }, [session, status, router]);

  const handleUpdateStatus = async (feedbackId: string, newStatus: FeedbackStatus) => {
    try {
      await updateFeedback(feedbackId, { status: newStatus });
      setFeedback((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status: newStatus } : f))
      );
      // Reload stats
      const statsData = await getFeedbackStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status");
    }
  };

  const handleUpdatePriority = async (feedbackId: string, newPriority: FeedbackPriority) => {
    try {
      await updateFeedback(feedbackId, { priority: newPriority });
      setFeedback((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, priority: newPriority } : f))
      );
    } catch (err) {
      console.error("Failed to update priority:", err);
      alert("Failed to update priority");
    }
  };

  const handleDelete = async (feedbackId: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;

    try {
      await deleteFeedback(feedbackId);
      setFeedback((prev) => prev.filter((f) => f.id !== feedbackId));
      // Reload stats
      const statsData = await getFeedbackStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to delete feedback:", err);
      alert("Failed to delete feedback");
    }
  };

  const handleSaveNotes = async (feedbackId: string) => {
    try {
      await updateFeedback(feedbackId, { adminNotes: editNotes });
      setFeedback((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, adminNotes: editNotes } : f))
      );
      setEditingId(null);
      setEditNotes("");
    } catch (err) {
      console.error("Failed to save notes:", err);
      alert("Failed to save notes");
    }
  };

  const handleStartEdit = (item: FeedbackItem) => {
    setEditingId(item.id);
    setEditStatus(item.status);
    setEditPriority(item.priority);
    setEditNotes(item.adminNotes || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStatus("PENDING");
    setEditPriority("MEDIUM");
    setEditNotes("");
  };

  if (status === "loading" || loading) {
    return <LoadingScreen message="Loading feedback..." />;
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-xl text-red-600 mb-4">{error || "Failed to load feedback"}</p>
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

  // Filter feedback
  const filteredFeedback = feedback.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusColor = (status: FeedbackStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REVIEWING":
        return "bg-blue-100 text-blue-800";
      case "PLANNED":
        return "bg-purple-100 text-purple-800";
      case "IN_PROGRESS":
        return "bg-indigo-100 text-indigo-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "DECLINED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: FeedbackPriority) => {
    switch (priority) {
      case "LOW":
        return "bg-gray-100 text-gray-800";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "URGENT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case "BUG":
        return "🐛";
      case "FEATURE_REQUEST":
        return "✨";
      case "IMPROVEMENT":
        return "💡";
      case "PRAISE":
        return "❤️";
      default:
        return "📝";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Feedback Management
            </h1>
            <p className="text-slate-600">
              Manage and respond to user feedback
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/admin/analytics")}
              className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              View Analytics
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalFeedback}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Completed</div>
              <div className="text-2xl font-bold text-green-600">{stats.completedCount}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Feature Requests</div>
              <div className="text-2xl font-bold text-blue-600">{stats.featureRequestCount}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Bugs</div>
              <div className="text-2xl font-bold text-red-600">{stats.bugCount}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | FeedbackStatus)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="DECLINED">Declined</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | FeedbackType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Types</option>
                <option value="BUG">Bug</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="IMPROVEMENT">Improvement</option>
                <option value="PRAISE">Praise</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as "all" | FeedbackPriority)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {filteredFeedback.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center shadow-sm">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl text-gray-600">No feedback found</p>
            </div>
          ) : (
            filteredFeedback.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {editingId === item.id ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as FeedbackStatus)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="REVIEWING">Reviewing</option>
                          <option value="PLANNED">Planned</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="DECLINED">Declined</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Priority
                        </label>
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as FeedbackPriority)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Notes
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        placeholder="Add internal notes..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveNotes(item.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getTypeIcon(item.type)}</span>
                          <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status.replace("_", " ")}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{item.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {item.isAnonymous ? (
                            <span>Anonymous</span>
                          ) : (
                            <span>
                              {item.user?.name || "Unknown User"}
                            </span>
                          )}
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          {item.page && (
                            <>
                              <span>•</span>
                              <span>{item.page}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>👍 {item.upvotes}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {item.adminNotes && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-blue-900 mb-1">Admin Notes:</div>
                        <div className="text-sm text-blue-800">{item.adminNotes}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

