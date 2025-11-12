"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  ProjectWithRelations,
  FeatureWithTasks,
  Task,
  FeatureTodoItem,
} from "@/types";
import { updateFeatureStatus } from "@/app/actions/features";
import { updateTask, deleteTask } from "@/app/actions/tasks";
import {
  createTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
} from "@/app/actions/timeline";
import TaskItem from "./TaskItem";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmationModal from "@/components/ConfirmationModal";
import { parseFeatureActionItems } from "@/utils/featureTodos";

interface TrackingTabProps {
  project: ProjectWithRelations;
  onUpdate: () => void;
}

type ViewType = "overview" | "kanban" | "tasks" | "timeline";

export default function TrackingTab({ project, onUpdate }: TrackingTabProps) {
  // Restore saved view from localStorage on mount
  const getSavedView = (): ViewType => {
    if (typeof window === "undefined") return "overview";
    const saved = localStorage.getItem(`tracking-view-${project.id}`);
    if (saved && ["overview", "kanban", "tasks", "timeline"].includes(saved)) {
      return saved as ViewType;
    }
    return "overview";
  };

  const [activeView, setActiveView] = useState<ViewType>(getSavedView);
  const [draggedItem, setDraggedItem] = useState<{
    type: "feature" | "task";
    id: string;
  } | null>(null);
  const { isOpen, options, showConfirm, handleConfirm, handleCancel } =
    useConfirm();

  // Save view to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`tracking-view-${project.id}`, activeView);
    }
  }, [activeView, project.id]);

  // Optimistic state for smooth Kanban dragging
  // Use a ref to track the last synced project data to avoid unnecessary resets
  const [optimisticFeatures, setOptimisticFeatures] = useState<
    FeatureWithTasks[]
  >(project.features || []);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(() => [
    ...project.tasks,
    ...(project.features || []).flatMap((f) => f.tasks),
  ]);

  // Sync optimistic state when project data changes from server
  // This ensures we stay in sync but doesn't block UI during drag operations
  useEffect(() => {
    // Only sync if we're not currently dragging (to avoid interrupting smooth drag)
    if (!draggedItem) {
      const nextFeatures = project.features || [];
      setOptimisticFeatures((previous) => {
        if (previous.length !== nextFeatures.length) {
          return nextFeatures;
        }
        const isSame = previous.every(
          (feature, index) => feature.id === nextFeatures[index].id
        );
        return isSame ? previous : nextFeatures;
      });

      const nextTasks = [
        ...project.tasks,
        ...(project.features || []).flatMap((f) => f.tasks),
      ];
      setOptimisticTasks((previous) => {
        if (previous.length !== nextTasks.length) {
          return nextTasks;
        }
        const isSame = previous.every(
          (task, index) => task.id === nextTasks[index].id
        );
        return isSame ? previous : nextTasks;
      });
    }
  }, [project.features, project.tasks, draggedItem]);

  const allTasks: Task[] = optimisticTasks;
  const features = optimisticFeatures;

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
    type: "MILESTONE" | "FEATURE_COMPLETE" | "RELEASE",
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

  const handleUpdateFeatureStatus = async (
    featureId: string,
    status: "IDEA" | "PLANNING" | "IN_PROGRESS" | "COMPLETED"
  ) => {
    try {
      const feature = features.find((f) => f.id === featureId);
      if (status === "COMPLETED" && feature && feature.status !== "COMPLETED") {
        await handleAddTimelineEvent(
          `Completed: ${feature.name}`,
          "FEATURE_COMPLETE",
          featureId
        );
      }
      await updateFeatureStatus(featureId, status);
      onUpdate();
      // Keep on current view instead of reloading
    } catch (err) {
      console.error("Error updating feature status:", err);
      alert("Failed to update feature status");
    }
  };

  const handleUpdateTaskStatus = async (
    taskId: string,
    status: "TODO" | "IN_PROGRESS" | "DONE",
    isStandalone: boolean
  ) => {
    try {
      await updateTask(taskId, {
        status,
        completedAt: status === "DONE" ? new Date() : null,
      });
      onUpdate();
      // Keep on current view instead of reloading
    } catch (err) {
      console.error("Error updating task status:", err);
      alert("Failed to update task status");
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: {
      title?: string;
      description?: string | null;
      status?: "TODO" | "IN_PROGRESS" | "DONE";
      priority?: "LOW" | "MEDIUM" | "HIGH";
    }
  ) => {
    try {
      await updateTask(taskId, {
        ...updates,
        completedAt: updates.status === "DONE" ? new Date() : undefined,
      });
      onUpdate();
      // Keep on tasks view - don't change activeView
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await showConfirm({
      title: "Delete Task",
      message:
        "Are you sure you want to delete this task? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await deleteTask(taskId);
      onUpdate();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task");
    }
  };

  const handleDrop = async (
    targetStatus: "COMPLETED" | "IN_PROGRESS" | "IDEA",
    isFeature: boolean
  ) => {
    if (!draggedItem) return;

    // Optimistic update - update UI immediately
    if (isFeature) {
      setOptimisticFeatures((prev) =>
        prev.map((f) =>
          f.id === draggedItem.id
            ? {
                ...f,
                status: targetStatus as
                  | "IDEA"
                  | "PLANNING"
                  | "IN_PROGRESS"
                  | "COMPLETED",
              }
            : f
        )
      );
    } else {
      const taskStatus =
        targetStatus === "COMPLETED"
          ? "DONE"
          : targetStatus === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : "TODO";
      setOptimisticTasks((prev) =>
        prev.map((t) =>
          t.id === draggedItem.id
            ? {
                ...t,
                status: taskStatus,
                completedAt: taskStatus === "DONE" ? new Date() : null,
              }
            : t
        )
      );
    }

    setDraggedItem(null);

    // Sync with server in background (non-blocking)
    try {
      if (isFeature) {
        await handleUpdateFeatureStatus(draggedItem.id, targetStatus);
      } else {
        const taskStatus =
          targetStatus === "COMPLETED"
            ? "DONE"
            : targetStatus === "IN_PROGRESS"
            ? "IN_PROGRESS"
            : "TODO";
        await handleUpdateTaskStatus(
          draggedItem.id,
          taskStatus,
          project.tasks.some((t) => t.id === draggedItem.id)
        );
      }
      // Refresh data to ensure consistency (but don't block UI)
      onUpdate();
    } catch (err) {
      console.error("Error handling drop:", err);
      // Rollback optimistic update on error
      if (isFeature) {
        setOptimisticFeatures(project.features || []);
      } else {
        setOptimisticTasks([
          ...project.tasks,
          ...(project.features || []).flatMap((f) => f.tasks),
        ]);
      }
      alert("Failed to update status. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex justify-center gap-4 border-b border-border">
        {[
          { id: "overview" as ViewType, label: "Overview" },
          { id: "kanban" as ViewType, label: "Kanban" },
          { id: "tasks" as ViewType, label: "Tasks" },
          { id: "timeline" as ViewType, label: "Timeline" },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`px-8 py-4 text-lg font-medium transition ${
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

      {/* Kanban View */}
      {activeView === "kanban" && (
        <KanbanView
          completedFeatures={completedFeatures}
          inProgressFeatures={inProgressFeatures}
          futureFeatures={futureFeatures}
          allTasks={allTasks}
          project={project}
          draggedItem={draggedItem}
          setDraggedItem={setDraggedItem}
          onDrop={handleDrop}
          featureTodosById={featureTodosById}
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

      {/* Tasks View */}
      {activeView === "tasks" && (
        <TasksView
          allTasks={allTasks}
          project={project}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onViewChange={setActiveView}
          featureTodosById={featureTodosById}
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
  onViewChange: (view: "overview" | "kanban" | "timeline" | "tasks") => void;
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

// Kanban View Component
function KanbanView({
  completedFeatures,
  inProgressFeatures,
  futureFeatures,
  allTasks,
  project,
  draggedItem,
  setDraggedItem,
  onDrop,
  featureTodosById,
}: {
  completedFeatures: FeatureWithTasks[];
  inProgressFeatures: FeatureWithTasks[];
  futureFeatures: FeatureWithTasks[];
  allTasks: Task[];
  project: ProjectWithRelations;
  draggedItem: { type: "feature" | "task"; id: string } | null;
  setDraggedItem: (
    item: { type: "feature" | "task"; id: string } | null
  ) => void;
  onDrop: (
    targetStatus: "COMPLETED" | "IN_PROGRESS" | "IDEA",
    isFeature: boolean
  ) => Promise<void>;
  featureTodosById: Record<string, FeatureTodoItem[]>;
}) {
  const todoTasks = allTasks.filter((t) => t.status === "TODO").length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Delivered Column */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-accent rounded-full" />
            Delivered (
            {completedFeatures.length +
              allTasks.filter((t) => t.status === "DONE").length}
            )
          </h3>
          <div
            className="space-y-3 min-h-[400px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onDrop("COMPLETED", draggedItem?.type === "feature");
            }}
          >
            {completedFeatures.map((feature) => {
              const featureTodos = featureTodosById[feature.id] ?? [];
              const activeTodos = featureTodos.filter(
                (todo) => !todo.completed
              );
              const completedTodosCount =
                featureTodos.length - activeTodos.length;

              return (
                <div
                  key={feature.id}
                  draggable
                  onDragStart={() =>
                    setDraggedItem({ type: "feature", id: feature.id })
                  }
                  className="bg-surface-alt border border-border rounded-lg p-4 cursor-move hover:shadow-md transition"
                >
                  <div className="font-semibold text-text-primary">
                    {feature.name}
                  </div>
                  <div className="text-text-secondary text-sm mt-1">
                    {feature.description}
                  </div>
                  <div className="text-text-primary/60 text-xs mt-2">
                    {feature.tasks.length} tasks
                  </div>
                  {featureTodos.length > 0 && (
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <div className="flex items-center justify-between text-[11px] text-text-primary/60 mb-2">
                        <span>Feature To-Dos</span>
                        <span>
                          {completedTodosCount}/{featureTodos.length} complete
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {featureTodos.slice(0, 3).map((todo) => (
                          <div
                            key={todo.id}
                            className="flex items-start gap-2 text-xs text-text-secondary"
                          >
                            <span
                              className={`mt-1 w-2 h-2 rounded-full ${
                                todo.completed ? "bg-green-400" : "bg-accent"
                              }`}
                            />
                            <span
                              className={
                                todo.completed
                                  ? "line-through text-text-primary/50"
                                  : "text-text-secondary"
                              }
                            >
                              {todo.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {featureTodos.length > 3 && (
                        <div className="text-[11px] text-text-primary/50 mt-2">
                          + {featureTodos.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {allTasks
              .filter((t) => t.status === "DONE")
              .map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() =>
                    setDraggedItem({ type: "task", id: task.id })
                  }
                  className="bg-surface-alt border border-border rounded-lg p-3 cursor-move hover:shadow-md transition"
                >
                  <div className="font-medium text-text-primary/60 line-through">
                    {task.title}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Currently Delivering Column */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-accent rounded-full" />
            In Progress (
            {inProgressFeatures.length +
              allTasks.filter((t) => t.status === "IN_PROGRESS").length}
            )
          </h3>
          <div
            className="space-y-3 min-h-[400px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onDrop("IN_PROGRESS", draggedItem?.type === "feature");
            }}
          >
            {inProgressFeatures.map((feature) => {
              const featureTodos = featureTodosById[feature.id] ?? [];
              const completedTodosCount = featureTodos.filter(
                (todo) => todo.completed
              ).length;

              return (
                <div
                  key={feature.id}
                  draggable
                  onDragStart={() =>
                    setDraggedItem({ type: "feature", id: feature.id })
                  }
                  className="bg-surface-alt border border-border rounded-lg p-4 cursor-move hover:shadow-md transition"
                >
                  <div className="font-semibold text-text-primary">
                    {feature.name}
                  </div>
                  <div className="text-text-secondary text-sm mt-1">
                    {feature.description}
                  </div>
                  <div className="text-text-primary/60 text-xs mt-2">
                    {feature.tasks.length} tasks
                  </div>
                  {featureTodos.length > 0 && (
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <div className="flex items-center justify-between text-[11px] text-text-primary/60 mb-2">
                        <span>Feature To-Dos</span>
                        <span>
                          {completedTodosCount}/{featureTodos.length} complete
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {featureTodos.slice(0, 3).map((todo) => (
                          <div
                            key={todo.id}
                            className="flex items-start gap-2 text-xs text-text-secondary"
                          >
                            <span
                              className={`mt-1 w-2 h-2 rounded-full ${
                                todo.completed ? "bg-green-400" : "bg-accent"
                              }`}
                            />
                            <span
                              className={
                                todo.completed
                                  ? "line-through text-text-primary/50"
                                  : "text-text-secondary"
                              }
                            >
                              {todo.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {featureTodos.length > 3 && (
                        <div className="text-[11px] text-text-primary/50 mt-2">
                          + {featureTodos.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {allTasks
              .filter((t) => t.status === "IN_PROGRESS")
              .map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() =>
                    setDraggedItem({ type: "task", id: task.id })
                  }
                  className="bg-surface-alt border border-border rounded-lg p-3 cursor-move hover:shadow-md transition"
                >
                  <div className="font-medium text-text-primary">
                    {task.title}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Future Features Column */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-accent rounded-full" />
            Future ({futureFeatures.length + todoTasks})
          </h3>
          <div
            className="space-y-3 min-h-[400px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onDrop("IDEA", draggedItem?.type === "feature");
            }}
          >
            {futureFeatures.map((feature) => {
              const featureTodos = featureTodosById[feature.id] ?? [];

              return (
                <div
                  key={feature.id}
                  draggable
                  onDragStart={() =>
                    setDraggedItem({ type: "feature", id: feature.id })
                  }
                  className="bg-surface-alt border border-border rounded-lg p-4 cursor-move hover:shadow-md transition"
                >
                  <div className="font-semibold text-text-primary">
                    {feature.name}
                  </div>
                  <div className="text-text-secondary text-sm mt-1">
                    {feature.description}
                  </div>
                  <div className="text-text-primary/60 text-xs mt-2">
                    {feature.tasks.length} tasks
                  </div>
                  {featureTodos.length > 0 && (
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <div className="flex items-center justify-between text-[11px] text-text-primary/60 mb-2">
                        <span>Feature To-Dos</span>
                        <span>{featureTodos.length} total</span>
                      </div>
                      <div className="space-y-1.5">
                        {featureTodos.slice(0, 3).map((todo) => (
                          <div
                            key={todo.id}
                            className="flex items-start gap-2 text-xs text-text-secondary"
                          >
                            <span
                              className={`mt-1 w-2 h-2 rounded-full ${
                                todo.completed ? "bg-green-400" : "bg-accent"
                              }`}
                            />
                            <span
                              className={
                                todo.completed
                                  ? "line-through text-text-primary/50"
                                  : "text-text-secondary"
                              }
                            >
                              {todo.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {featureTodos.length > 3 && (
                        <div className="text-[11px] text-text-primary/50 mt-2">
                          + {featureTodos.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {allTasks
              .filter((t) => t.status === "TODO")
              .map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() =>
                    setDraggedItem({ type: "task", id: task.id })
                  }
                  className="bg-surface-alt border border-border rounded-lg p-3 cursor-move hover:shadow-md transition"
                >
                  <div className="font-medium text-text-primary">
                    {task.title}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
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
    type: "MILESTONE" | "FEATURE_COMPLETE" | "RELEASE",
    featureId?: string
  ) => Promise<void>;
  onUpdate: () => void;
}) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleStartEdit = (event: {
    id: string;
    title: string;
    description: string | null;
    date: Date;
  }) => {
    setEditingEventId(event.id);
    setEditTitle(event.title);
    setEditDescription(event.description || "");
    setEditDate(new Date(event.date).toISOString().split("T")[0]);
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEditTitle("");
    setEditDescription("");
    setEditDate("");
  };

  const handleSaveEdit = async (eventId: string) => {
    try {
      await updateTimelineEvent(eventId, {
        title: editTitle,
        description: editDescription || null,
        date: new Date(editDate),
      });
      onUpdate();
      handleCancelEdit();
    } catch (err) {
      console.error("Error updating timeline event:", err);
      alert("Failed to update timeline event");
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this timeline event?")) {
      return;
    }
    try {
      await deleteTimelineEvent(eventId);
      onUpdate();
    } catch (err) {
      console.error("Error deleting timeline event:", err);
      alert("Failed to delete timeline event");
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-light text-text-primary">Timeline</h2>
        <button
          onClick={async () => {
            const title = prompt("Milestone title:");
            if (title) {
              await onAddTimelineEvent(title, "MILESTONE");
            }
          }}
          className="px-4 py-2 bg-button text-button-text rounded-lg hover:opacity-90 transition font-medium text-sm"
        >
          + Add Milestone
        </button>
      </div>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-progress" />
        <div className="space-y-6 pl-12">
          {project.timeline.length === 0 ? (
            <div className="text-text-primary text-center py-8">
              No timeline events yet. Complete features or add milestones.
            </div>
          ) : (
            [...project.timeline]
              .sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime()
              )
              .map((event) => (
                <div
                  key={event.id}
                  className="relative group"
                  onMouseEnter={() => {}}
                  onMouseLeave={() => {}}
                >
                  <div className="absolute -left-16 top-2 w-3 h-3 bg-accent rounded-full border-4 border-surface" />
                  {editingEventId === event.id ? (
                    <div className="bg-surface-alt rounded-lg p-4 border border-border">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            Description
                          </label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(event.id)}
                            className="px-3 py-1.5 bg-button text-button-text rounded-lg hover:opacity-90 transition text-sm font-medium"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface-alt rounded-lg p-4 border border-border group-hover:border-accent/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-text-primary">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary">
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={() => handleStartEdit(event)}
                              className="p-1.5 hover:bg-surface rounded text-text-secondary hover:text-text-primary transition"
                              title="Edit"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="p-1.5 hover:bg-surface rounded text-text-secondary hover:text-red-400 transition"
                              title="Delete"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-text-primary text-sm">
                          {event.description}
                        </p>
                      )}
                      <span className="inline-block mt-2 px-2 py-1 bg-surface-alt text-text-primary text-xs rounded">
                        {event.type}
                      </span>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

// Tasks View Component
function TasksView({
  allTasks,
  project,
  onUpdateTask,
  onDeleteTask,
  onViewChange,
  featureTodosById,
}: {
  allTasks: Task[];
  project: ProjectWithRelations;
  onUpdateTask: (
    taskId: string,
    updates: {
      title?: string;
      description?: string | null;
      status?: "TODO" | "IN_PROGRESS" | "DONE";
      priority?: "LOW" | "MEDIUM" | "HIGH";
    }
  ) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onViewChange: (view: "overview" | "kanban" | "timeline" | "tasks") => void;
  featureTodosById: Record<string, FeatureTodoItem[]>;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <h2 className="text-2xl font-light text-text-primary mb-4">
          All Tasks
        </h2>
        <div className="space-y-2">
          {allTasks.length === 0 ? (
            <div className="text-text-primary text-center py-8">
              No tasks yet. Add tasks in the Design Document tab.
            </div>
          ) : (
            allTasks.map((task) => {
              const isStandalone = project.tasks.some((t) => t.id === task.id);
              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={(updates) => {
                    onUpdateTask(task.id, updates);
                  }}
                  onDelete={() => onDeleteTask(task.id)}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-light text-text-primary">
            Feature To-Dos
          </h2>
          <button
            type="button"
            onClick={() => onViewChange("overview")}
            className="text-sm text-accent hover:text-accent font-medium"
          >
            View Overview →
          </button>
        </div>
        <div className="space-y-4">
          {project.features
            .map((feature) => ({
              feature,
              todos: featureTodosById[feature.id] ?? [],
            }))
            .filter(({ todos }) => todos.length > 0)
            .map(({ feature, todos }) => {
              const completed = todos.filter((todo) => todo.completed).length;
              return (
                <div
                  key={feature.id}
                  className="bg-surface-alt rounded-xl p-4 border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {feature.name}
                    </h3>
                    <span className="text-xs text-text-primary/60">
                      {completed}/{todos.length} complete
                    </span>
                  </div>
                  <div className="space-y-1">
                    {todos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-start gap-2 text-xs text-text-secondary"
                      >
                        <span
                          className={`mt-1 w-2 h-2 rounded-full ${
                            todo.completed ? "bg-green-400" : "bg-accent"
                          }`}
                        />
                        <span
                          className={
                            todo.completed
                              ? "line-through text-text-primary/50"
                              : "text-text-secondary"
                          }
                        >
                          {todo.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          {project.features.every(
            (feature) => (featureTodosById[feature.id] ?? []).length === 0
          ) && (
            <div className="text-text-secondary text-center py-8">
              No feature to-dos yet. Capture action items from the Planning tab.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
