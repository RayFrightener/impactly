"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  ProjectWithRelations,
  FeatureWithTasks,
  Task,
  FeatureTodoItem,
} from "@/types";
import {
  createTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
} from "@/app/actions/timeline";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmationModal from "@/components/ConfirmationModal";
import { parseFeatureActionItems } from "@/utils/featureTodos";
import HorizontalTimeline from "@/components/HorizontalTimeline";
import TimelineEventModal from "@/components/TimelineEventModal";
import type { TimelineEvent as PrismaTimelineEvent } from "@/types";
import { EVENT_TYPE_LABELS, EVENT_TYPE_DESCRIPTIONS, getEventImpactLevel, type EventType } from "@/utils/timeline";

interface TrackingTabProps {
  project: ProjectWithRelations;
  onUpdate: () => void;
}

type ViewType = "overview" | "timeline";

export default function TrackingTab({ project, onUpdate }: TrackingTabProps) {
  // Restore saved view from localStorage on mount
  const getSavedView = (): ViewType => {
    if (typeof window === "undefined") return "overview";
    const saved = localStorage.getItem(`tracking-view-${project.id}`);
    if (saved && ["overview", "timeline"].includes(saved)) {
      return saved as ViewType;
    }
    return "overview";
  };

  const [activeView, setActiveView] = useState<ViewType>(getSavedView);
  const { isOpen, options, showConfirm, handleConfirm, handleCancel } =
    useConfirm();

  // Save view to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`tracking-view-${project.id}`, activeView);
    }
  }, [activeView, project.id]);

  const allTasks: Task[] = [
    ...project.tasks,
    ...(project.features || []).flatMap((f) => f.tasks),
  ];
  const features = project.features || [];

  const featureTodosById = useMemo((): Record<string, FeatureTodoItem[]> => {
    return features.reduce<Record<string, FeatureTodoItem[]>>(
      (accumulator, feature) => {
        accumulator[feature.id] = parseFeatureActionItems(feature.actionItems);
        return accumulator;
      },
      {}
    );
  }, [features]);

  const totalFeatureTodos = useMemo(
    () =>
      Object.values(featureTodosById).reduce(
        (count, todos) => count + todos.length,
        0
      ),
    [featureTodosById]
  );

  const completedFeatureTodos = useMemo(
    () =>
      Object.values(featureTodosById).reduce(
        (count, todos) => count + todos.filter((todo) => todo.completed).length,
        0
      ),
    [featureTodosById]
  );

  const upcomingFeatureTodos = useMemo(
    () =>
      features
        .flatMap((feature) => {
          const todos = featureTodosById[feature.id] || [];
          return todos
            .filter((todo) => !todo.completed)
            .map((todo) => ({
              featureId: feature.id,
              featureName: feature.name,
              todo,
            }));
        })
        .slice(0, 5),
    [features, featureTodosById]
  );

  const completedTasks = useMemo(
    () => allTasks.filter((t) => t.status === "DONE").length,
    [allTasks]
  );
  const inProgressTasks = useMemo(
    () => allTasks.filter((t) => t.status === "IN_PROGRESS").length,
    [allTasks]
  );
  const todoTasks = useMemo(
    () => allTasks.filter((t) => t.status === "TODO").length,
    [allTasks]
  );

  const completedFeatures = useMemo(
    () => features.filter((f) => f.status === "COMPLETED"),
    [features]
  );
  const inProgressFeatures = useMemo(
    () => features.filter((f) => f.status === "IN_PROGRESS"),
    [features]
  );
  const futureFeatures = useMemo(
    () => features.filter((f) => f.status === "IDEA" || f.status === "PLANNING"),
    [features]
  );

  // Calculate progress - reactive to optimistic state changes
  const progress = useMemo(() => {
    const taskProgress =
      allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : null;
    const featureProgress =
      features.length > 0
        ? (completedFeatures.length / features.length) * 100
        : null;

    if (taskProgress !== null && featureProgress !== null) {
      return Math.round(taskProgress * 0.6 + featureProgress * 0.4);
    }
    if (taskProgress !== null) return Math.round(taskProgress);
    if (featureProgress !== null) return Math.round(featureProgress);
    return 0;
  }, [allTasks, completedTasks, features, completedFeatures]);

  const getWorkflowInsights = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stuckFeatures = features.filter((f) => {
      if (!f.updatedAt) return false;
      const lastUpdate = new Date(f.updatedAt);
      return lastUpdate < sevenDaysAgo && f.status !== "COMPLETED";
    });

    const readyToStart = features.filter((f) => {
      if (f.status !== "IDEA" && f.status !== "PLANNING") return false;
      const featureTasks = f.tasks || [];
      if (featureTasks.length === 0) return true;
      const allDone = featureTasks.every((t) => t.status === "DONE");
      return allDone;
    });

    const nextTasks = allTasks
      .filter((t) => t.status === "TODO")
      .sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 5);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const tasksThisWeek = allTasks.filter(
      (t) =>
        t.status === "DONE" &&
        t.completedAt &&
        new Date(t.completedAt) >= oneWeekAgo
    ).length;

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const tasksLastWeek = allTasks.filter(
      (t) =>
        t.status === "DONE" &&
        t.completedAt &&
        new Date(t.completedAt) >= twoWeeksAgo &&
        new Date(t.completedAt) < oneWeekAgo
    ).length;

    const momentum =
      tasksThisWeek > tasksLastWeek
        ? "accelerating"
        : tasksThisWeek < tasksLastWeek
        ? "slowing"
        : "steady";

    return {
      stuckFeatures,
      readyToStart,
      nextTasks,
      tasksThisWeek,
      momentum,
      previousWeekTasks: tasksLastWeek,
    };
  };

  const handleAddTimelineEvent = async (
    title: string,
    type: "PROJECT_START" | "MVP_COMPLETE" | "BETA_LAUNCH" | "PUBLIC_RELEASE" | "MAJOR_PIVOT" | "KEY_DECISION" | "MILESTONE" | "FEATURE_COMPLETE" | "RELEASE" | "STAKEHOLDER_REVIEW" | "INTEGRATION_COMPLETE" | "PERFORMANCE_MILESTONE",
    featureId?: string
  ) => {
    try {
      await createTimelineEvent({
        title,
        date: new Date(),
        type,
        projectId: project.id,
        featureId,
      });
      onUpdate();
    } catch (err) {
      console.error("Error creating timeline event:", err);
      alert("Failed to create timeline event");
    }
  };


  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex justify-center gap-4 border-b border-border">
        {[
          { id: "overview" as ViewType, label: "Overview" },
          { id: "timeline" as ViewType, label: "Timeline" },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`px-8 py-4 text-sm font-medium transition ${
              activeView === view.id
                ? "text-text-primary border-b-2 border-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Overview View */}
      {activeView === "overview" && (
        <OverviewView
          project={project}
          progress={progress}
          allTasks={allTasks}
          completedTasks={completedTasks}
          inProgressTasks={inProgressTasks}
          todoTasks={todoTasks}
          features={features}
          completedFeatures={completedFeatures}
          inProgressFeatures={inProgressFeatures}
          getWorkflowInsights={getWorkflowInsights}
          onViewChange={setActiveView}
          totalFeatureTodos={totalFeatureTodos}
          completedFeatureTodos={completedFeatureTodos}
          upcomingFeatureTodos={upcomingFeatureTodos}
        />
      )}

      {/* Timeline View */}
      {activeView === "timeline" && (
        <TimelineView
          project={project}
          onAddTimelineEvent={handleAddTimelineEvent}
          onUpdate={onUpdate}
        />
      )}

      <ConfirmationModal
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

// Overview View Component
function OverviewView({
  project,
  progress,
  allTasks,
  completedTasks,
  inProgressTasks,
  todoTasks,
  features,
  completedFeatures,
  inProgressFeatures,
  getWorkflowInsights,
  onViewChange,
  totalFeatureTodos,
  completedFeatureTodos,
  upcomingFeatureTodos,
}: {
  project: ProjectWithRelations;
  progress: number;
  allTasks: Task[];
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  features: FeatureWithTasks[];
  completedFeatures: FeatureWithTasks[];
  inProgressFeatures: FeatureWithTasks[];
  getWorkflowInsights: () => {
    stuckFeatures: FeatureWithTasks[];
    readyToStart: FeatureWithTasks[];
    nextTasks: Task[];
    tasksThisWeek: number;
    momentum: string;
    previousWeekTasks: number;
  };
  onViewChange: (view: "overview" | "timeline") => void;
  totalFeatureTodos: number;
  completedFeatureTodos: number;
  upcomingFeatureTodos: Array<{
    featureId: string;
    featureName: string;
    todo: FeatureTodoItem;
  }>;
}) {
  const insights = getWorkflowInsights();
  const activeFeatureTodos = totalFeatureTodos - completedFeatureTodos;

  return (
    <div className="space-y-6">
      {/* Progress Stats Section */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <h2 className="text-2xl font-light text-text-primary mb-6">
          Progress Overview
        </h2>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm text-text-primary mb-2">
              <span>Overall Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-surface-alt rounded-full h-4">
              <div
                className="bg-progress h-4 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-alt rounded-xl p-4">
              <div className="text-3xl font-light text-text-primary">
                {allTasks.length}
              </div>
              <div className="text-text-secondary text-sm">Total Tasks</div>
            </div>
            <div className="bg-surface-alt rounded-xl p-4">
              <div className="text-3xl font-light text-text-primary">
                {completedTasks}
              </div>
              <div className="text-text-secondary text-sm">Completed</div>
            </div>
            <div className="bg-surface-alt rounded-xl p-4">
              <div className="text-3xl font-light text-text-primary">
                {inProgressTasks}
              </div>
              <div className="text-text-secondary text-sm">In Progress</div>
            </div>
            <div className="bg-surface-alt rounded-xl p-4">
              <div className="text-3xl font-light text-text-primary">
                {todoTasks}
              </div>
              <div className="text-text-secondary text-sm">To Do</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-alt rounded-xl p-4">
              <div className="text-3xl font-light text-text-primary">
                {activeFeatureTodos}
              </div>
              <div className="text-text-secondary text-sm">
                Active Feature To-Dos
              </div>
            </div>
            <div className="bg-surface-alt rounded-xl p-4">
              <div className="text-3xl font-light text-text-primary">
                {completedFeatureTodos}
              </div>
              <div className="text-text-secondary text-sm">
                Completed Feature To-Dos
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-surface-alt rounded-xl p-4">
              <div className="text-2xl font-light text-text-primary">
                {features.length}
              </div>
              <div className="text-text-secondary text-sm">Total Features</div>
            </div>
            <div className="bg-surface-alt rounded-xl p-4">
              <div className="text-2xl font-light text-text-primary">
                {completedFeatures.length}
              </div>
              <div className="text-text-secondary text-sm">Completed</div>
            </div>
            <div className="bg-surface-alt rounded-xl p-4">
              <div className="text-2xl font-light text-text-primary">
                {inProgressFeatures.length}
              </div>
              <div className="text-text-secondary text-sm">In Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* What Should I Work On Next? */}
        {insights.nextTasks.length > 0 && (
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-xl font-light text-text-primary mb-4 flex items-center gap-2">
              <span>🎯</span>
              What Should I Work On Next?
            </h2>
            <div className="space-y-2">
              {insights.nextTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-surface-alt rounded-lg p-3 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">
                      {task.title}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        task.priority === "HIGH"
                          ? "bg-red-200 text-red-800"
                          : task.priority === "MEDIUM"
                          ? "bg-amber-200 text-amber-800"
                          : "bg-surface-alt text-accent"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* This Week's Progress */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h2 className="text-xl font-light text-text-primary mb-4">
            This Week&apos;s Progress
          </h2>
          <div className="space-y-4">
            <div>
              <div className="text-3xl font-light text-text-primary">
                {insights.tasksThisWeek}
              </div>
              <div className="text-text-secondary text-sm">Tasks completed</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-primary">Momentum:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  insights.momentum === "accelerating"
                    ? "bg-green-100 text-green-700"
                    : insights.momentum === "slowing"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-surface-alt text-accent"
                }`}
              >
                {insights.momentum === "accelerating" && "🚀 Accelerating"}
                {insights.momentum === "slowing" && "⚠️ Slowing"}
                {insights.momentum === "steady" && "➡️ Steady"}
              </span>
            </div>
            {insights.previousWeekTasks > 0 && (
              <div className="text-xs text-text-primary/60">
                Previous week: {insights.previousWeekTasks} tasks
              </div>
            )}
          </div>
        </div>

        {/* Feature To-Dos */}
        {upcomingFeatureTodos.length > 0 && (
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-xl font-light text-text-primary mb-4 flex items-center gap-2">
              <span>🧩</span>
              Feature To-Dos
            </h2>
            <div className="space-y-2">
              {upcomingFeatureTodos.map(({ featureId, featureName, todo }) => (
                <div
                  key={`${featureId}-${todo.id}`}
                  className="bg-surface-alt rounded-lg p-3 border border-border"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-text-primary">
                      {todo.text}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-surface-alt text-accent">
                      {featureName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stuck Features */}
        {insights.stuckFeatures.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 shadow-sm">
            <h2 className="text-xl font-light text-text-primary mb-4 flex items-center gap-2">
              <span>⚠️</span>
              Needs Attention ({insights.stuckFeatures.length})
            </h2>
            <div className="space-y-2">
              {insights.stuckFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="bg-amber-100 rounded-lg p-3 border border-amber-200"
                >
                  <div className="text-sm font-medium text-text-primary">
                    {feature.name}
                  </div>
                  <div className="text-xs text-text-primary/60 mt-1">
                    No activity for 7+ days
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ready to Start */}
        {insights.readyToStart.length > 0 && (
          <div className="bg-green-50 rounded-2xl p-6 border border-green-200 shadow-sm">
            <h2 className="text-xl font-light text-text-primary mb-4 flex items-center gap-2">
              <span>✅</span>
              Ready to Start ({insights.readyToStart.length})
            </h2>
            <div className="space-y-2">
              {insights.readyToStart.map((feature) => (
                <div
                  key={feature.id}
                  className="bg-green-100 rounded-lg p-3 border border-green-200"
                >
                  <div className="text-sm font-medium text-text-primary">
                    {feature.name}
                  </div>
                  <div className="text-xs text-text-primary/60 mt-1">
                    All dependencies complete
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity Timeline */}
      {project.timeline.length > 0 && (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-light text-text-primary">
              Recent Activity
            </h2>
            <button
              onClick={() => onViewChange("timeline")}
              className="text-sm text-accent hover:text-accent font-medium"
            >
              View Full Timeline →
            </button>
          </div>
          <div className="space-y-3">
            {[...project.timeline]
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )
              .slice(0, 5)
              .map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-surface-alt rounded-lg border border-border"
                >
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">
                      {event.title}
                    </div>
                    {event.description && (
                      <div className="text-xs text-text-primary/60 mt-1">
                        {event.description}
                      </div>
                    )}
                    <div className="text-xs text-text-primary/50 mt-1">
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-surface-alt text-text-primary text-xs rounded">
                    {event.type}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Timeline View Component
function TimelineView({
  project,
  onAddTimelineEvent,
  onUpdate,
}: {
  project: ProjectWithRelations;
  onAddTimelineEvent: (
    title: string,
    type: "PROJECT_START" | "MVP_COMPLETE" | "BETA_LAUNCH" | "PUBLIC_RELEASE" | "MAJOR_PIVOT" | "KEY_DECISION" | "MILESTONE" | "FEATURE_COMPLETE" | "RELEASE" | "STAKEHOLDER_REVIEW" | "INTEGRATION_COMPLETE" | "PERFORMANCE_MILESTONE",
    featureId?: string
  ) => Promise<void>;
  onUpdate: () => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState<PrismaTimelineEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventType, setNewEventType] = useState<"PROJECT_START" | "MVP_COMPLETE" | "BETA_LAUNCH" | "PUBLIC_RELEASE" | "MAJOR_PIVOT" | "KEY_DECISION" | "MILESTONE" | "FEATURE_COMPLETE" | "RELEASE" | "STAKEHOLDER_REVIEW" | "INTEGRATION_COMPLETE" | "PERFORMANCE_MILESTONE">("MILESTONE");
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [newEventFeatureId, setNewEventFeatureId] = useState<string | undefined>(undefined);

  const handleEventClick = (event: PrismaTimelineEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) return;

    try {
      await createTimelineEvent({
        title: newEventTitle,
        description: newEventDescription || undefined,
        date: new Date(newEventDate),
        type: newEventType,
        projectId: project.id,
        featureId: newEventFeatureId,
      });
      onUpdate();
      setIsAddModalOpen(false);
      setNewEventTitle("");
      setNewEventDescription("");
      setNewEventType("MILESTONE");
      setNewEventDate(new Date().toISOString().split("T")[0]);
      setNewEventFeatureId(undefined);
    } catch (err) {
      console.error("Error creating timeline event:", err);
      alert("Failed to create timeline event");
    }
  };

  const projectFeatures = project.features.map((f) => ({
    id: f.id,
    name: f.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-light text-text-primary">Timeline</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-button text-button-text rounded-lg hover:opacity-90 transition font-medium text-sm"
        >
          + Add Event
        </button>
      </div>
      <HorizontalTimeline
        project={project}
        events={project.timeline}
        onEventClick={handleEventClick}
        projectFeatures={projectFeatures}
      />
      <TimelineEventModal
        isOpen={isModalOpen}
        event={selectedEvent}
        onClose={handleModalClose}
        onUpdate={onUpdate}
        projectFeatures={projectFeatures}
      />

      {/* Add Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-xl max-w-md w-full">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-text-primary">
                Add Timeline Event
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-2xl leading-none text-text-secondary transition hover:text-text-primary"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                  placeholder="Event title"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Description
                </label>
                <textarea
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent resize-none"
                  rows={3}
                  placeholder="Event description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Event Type *
                </label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as typeof newEventType)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                >
                  {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => {
                    const impactLevel = getEventImpactLevel(type as EventType);
                    return (
                      <option key={type} value={type}>
                        {label} (Impact: {impactLevel}/5)
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-text-secondary mt-1">
                  {EVENT_TYPE_DESCRIPTIONS[newEventType]}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              {projectFeatures.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Related Feature (optional)
                  </label>
                  <select
                    value={newEventFeatureId || ""}
                    onChange={(e) => setNewEventFeatureId(e.target.value || undefined)}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">None</option>
                    {projectFeatures.map((feature) => (
                      <option key={feature.id} value={feature.id}>
                        {feature.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-border text-text-primary rounded-lg hover:bg-surface-alt transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={!newEventTitle.trim()}
                  className="flex-1 px-6 py-3 bg-button text-button-text rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Removed TasksView - moved to PlanningTab
