"use client";

import { useState, useEffect } from "react";
import type { ProjectWithRelations } from "@/types";
import { updateProject } from "@/app/actions/projects";
import {
  createFeature,
  updateFeature,
  deleteFeature,
} from "@/app/actions/features";
import { createTask, updateTask, deleteTask } from "@/app/actions/tasks";
import {
  createThought,
  updateThought,
  deleteThought,
} from "@/app/actions/thoughts";
import TaskItem from "./TaskItem";
import DiagramSection from "./DiagramSection";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmationModal from "@/components/ConfirmationModal";
import type { FeatureTodoItem } from "@/types";
import { parseFeatureActionItems } from "@/utils/featureTodos";
// TODO: Re-enable when PlanningWorkspace is refined
// import PlanningWorkspace from "@/components/planning/PlanningWorkspace";

interface PlanningTabProps {
  project: ProjectWithRelations;
  onUpdate: () => void;
}

export default function PlanningTab({ project, onUpdate }: PlanningTabProps) {
  const [requirements, setRequirements] = useState(project.moreInfo || "");
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureDescription, setNewFeatureDescription] = useState("");
  const [newFeatureImpact, setNewFeatureImpact] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH"
  >("MEDIUM");
  const [newTaskFeatureId, setNewTaskFeatureId] = useState<string>("");
  const { isOpen, options, showConfirm, handleConfirm, handleCancel } =
    useConfirm();

  const features = project.features || [];

  // Auto-capitalize feature name with article exclusion
  const capitalizeFeatureName = (text: string): string => {
    if (!text || text.trim() === "") return text;

    const articles = [
      "of",
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "this",
      "that",
      "with",
      "by",
    ];

    return text
      .split(" ")
      .map((word, index) => {
        const trimmedWord = word.trim();
        if (trimmedWord === "") return word; // Preserve spacing

        const lowerWord = trimmedWord.toLowerCase();

        // Always capitalize first word
        if (index === 0) {
          return (
            trimmedWord.charAt(0).toUpperCase() +
            trimmedWord.slice(1).toLowerCase()
          );
        }

        // If it's an article, keep it lowercase
        if (articles.includes(lowerWord)) {
          return lowerWord;
        }

        // Otherwise, capitalize it
        return (
          trimmedWord.charAt(0).toUpperCase() +
          trimmedWord.slice(1).toLowerCase()
        );
      })
      .join(" ");
  };

  useEffect(() => {
    const nextRequirements = project.moreInfo || "";
    setRequirements((previous) =>
      previous === nextRequirements ? previous : nextRequirements
    );
  }, [project.moreInfo]);

  const handleSaveRequirements = async () => {
    try {
      await updateProject(project.id, { moreInfo: requirements });
      // Refresh data without full page reload
      onUpdate();
    } catch (err) {
      console.error("Error saving requirements:", err);
      alert("Failed to save requirements");
    }
  };

  const handleAddFeature = async () => {
    if (!newFeatureName.trim()) return;

    try {
      await createFeature({
        name: newFeatureName,
        description: newFeatureDescription,
        impact: newFeatureImpact,
        projectId: project.id,
        status: "IDEA",
        priority: features.length,
      });
      setNewFeatureName("");
      setNewFeatureDescription("");
      setNewFeatureImpact("");
      // Refresh data without full page reload to avoid interrupting network requests
      onUpdate();
    } catch (err) {
      console.error("Error creating feature:", err);
      alert("Failed to create feature");
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    const confirmed = await showConfirm({
      title: "Delete Feature",
      message:
        "Are you sure you want to delete this feature? This action cannot be undone and will also delete all associated tasks.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await deleteFeature(featureId);
      // Refresh data without full page reload
      onUpdate();
    } catch (err) {
      console.error("Error deleting feature:", err);
      alert("Failed to delete feature");
    }
  };

  const handleUpdateFeature = async (
    featureId: string,
    updates: {
      name?: string;
      description?: string | undefined;
      impact?: string | undefined;
      expanded?: string | null;
      status?: "IDEA" | "PLANNING" | "IN_PROGRESS" | "COMPLETED";
      actionItems?: FeatureTodoItem[] | undefined;
    }
  ) => {
    try {
      await updateFeature(featureId, updates);
      // Refresh data without full page reload
      onUpdate();
    } catch (err) {
      console.error("Error updating feature:", err);
      alert("Failed to update feature");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await createTask({
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        priority: newTaskPriority,
        projectId: project.id,
        featureId: newTaskFeatureId || undefined,
        status: "TODO",
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority("MEDIUM");
      setNewTaskFeatureId("");
      // Refresh data without full page reload to avoid interrupting network requests
      onUpdate();
    } catch (err) {
      console.error("Error creating task:", err);
      alert("Failed to create task");
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
      await updateTask(taskId, updates);
      // Refresh data without full page reload
      onUpdate();
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
      // Refresh data without full page reload
      onUpdate();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task");
    }
  };

  const getFeatureTaskStats = (feature: (typeof features)[0]) => {
    const total = feature.tasks.length;
    const completed = feature.tasks.filter((t) => t.status === "DONE").length;
    return {
      total,
      completed,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  };

  return (
    <div className="space-y-8">
      {/* Requirements Section - Full Width */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <h2 className="text-2xl font-light text-text-primary mb-4">
          Project Requirements
        </h2>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          onBlur={handleSaveRequirements}
          placeholder="Define your project requirements, goals, and specifications here..."
          rows={12}
          className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder:text-placeholder resize-y font-mono text-base min-h-[300px]"
        />
        <p className="text-xs text-text-secondary/80 mt-2">
          Changes are saved automatically when you click away
        </p>
      </div>

      {/* TODO: Re-enable when PlanningWorkspace is refined */}
      {/* <PlanningWorkspace
        projectId={project.id}
        projectName={project.name}
        features={project.features ?? []}
      /> */}

      {/* Double Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Add New Feature */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-2xl font-light text-text-primary mb-4">
              Add New Feature
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                onBlur={(e) => {
                  const capitalized = capitalizeFeatureName(e.target.value);
                  if (capitalized !== e.target.value) {
                    setNewFeatureName(capitalized);
                  }
                }}
                placeholder="Feature name..."
                className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder:text-placeholder text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    // Capitalize before submitting
                    const capitalized = capitalizeFeatureName(newFeatureName);
                    if (capitalized !== newFeatureName) {
                      setNewFeatureName(capitalized);
                      // Use a small timeout to ensure state is updated
                      setTimeout(() => {
                        handleAddFeature();
                      }, 0);
                    } else {
                      handleAddFeature();
                    }
                  }
                }}
              />
              <textarea
                value={newFeatureDescription}
                onChange={(e) => setNewFeatureDescription(e.target.value)}
                placeholder="Description..."
                rows={2}
                className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder:text-placeholder resize-none text-base"
              />
              <textarea
                value={newFeatureImpact}
                onChange={(e) => setNewFeatureImpact(e.target.value)}
                placeholder="How does this create impact?"
                rows={2}
                className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder:text-placeholder resize-none text-base"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-6 py-3 bg-button text-button-text rounded-xl hover:opacity-90 transition font-medium"
              >
                Add Feature
              </button>
            </div>
          </div>

          {/* Features List */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-2xl font-light text-text-primary mb-4">
              Features
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {features.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary">
                    No features yet. Add one above.
                  </p>
                </div>
              ) : (
                features
                  .sort((a, b) => {
                    // Move completed features to bottom
                    if (a.status === "COMPLETED" && b.status !== "COMPLETED")
                      return 1;
                    if (a.status !== "COMPLETED" && b.status === "COMPLETED")
                      return -1;
                    // Maintain priority sorting within groups
                    return a.priority - b.priority;
                  })
                  .map((feature) => {
                    const taskStats = getFeatureTaskStats(feature);
                    return (
                      <FeatureCard
                        key={feature.id}
                        feature={feature}
                        taskStats={taskStats}
                        onUpdate={handleUpdateFeature}
                        onDelete={handleDeleteFeature}
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                      />
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Add New Task */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-2xl font-light text-text-primary mb-4">
              Add New Task
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Priority Selection */}
                <div>
                  <label className="block text-text-primary font-medium mb-2 text-sm">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {[
                      {
                        value: "LOW" as const,
                        label: "Low",
                        selectedClass:
                          "border-emerald-400 bg-emerald-100 text-emerald-700",
                      },
                      {
                        value: "MEDIUM" as const,
                        label: "Medium",
                        selectedClass:
                          "border-amber-400 bg-amber-100 text-amber-700",
                      },
                      {
                        value: "HIGH" as const,
                        label: "High",
                        selectedClass:
                          "border-rose-400 bg-rose-100 text-rose-700",
                      },
                    ].map((priority) => (
                      <label
                        key={priority.value}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 cursor-pointer transition text-center ${
                          newTaskPriority === priority.value
                            ? priority.selectedClass
                            : "border-border bg-surface text-text-secondary hover:border-accent"
                        }`}
                      >
                        <input
                          type="radio"
                          name="priority"
                          value={priority.value}
                          checked={newTaskPriority === priority.value}
                          onChange={(e) =>
                            setNewTaskPriority(
                              e.target.value as "LOW" | "MEDIUM" | "HIGH"
                            )
                          }
                          className="sr-only"
                        />
                        <span className="font-medium text-xs text-text-primary">
                          {priority.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Feature Selection */}
                <div>
                  <label className="block text-text-primary font-medium mb-2 text-sm">
                    Assign to Feature
                  </label>
                  <div className="bg-surface border-2 border-border rounded-xl p-2 max-h-48 overflow-y-auto">
                    <div className="space-y-1.5">
                      <label
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                          newTaskFeatureId === ""
                            ? "bg-surface-alt"
                            : "hover:bg-card"
                        }`}
                      >
                        <input
                          type="radio"
                          name="feature"
                          value=""
                          checked={newTaskFeatureId === ""}
                          onChange={(e) => setNewTaskFeatureId(e.target.value)}
                          className="sr-only"
                        />
                        <div
                          className={`w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            newTaskFeatureId === ""
                              ? "border-accent bg-accent"
                              : "border-border bg-surface"
                          }`}
                        >
                          {newTaskFeatureId === "" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-surface" />
                          )}
                        </div>
                        <span className="font-medium text-xs text-text-primary truncate">
                          Standalone
                        </span>
                      </label>
                      {features
                        .filter((f) => f.status !== "COMPLETED")
                        .map((f) => (
                          <label
                            key={f.id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                              newTaskFeatureId === f.id
                                ? "bg-surface-alt"
                                : "hover:bg-card"
                            }`}
                          >
                            <input
                              type="radio"
                              name="feature"
                              value={f.id}
                              checked={newTaskFeatureId === f.id}
                              onChange={(e) =>
                                setNewTaskFeatureId(e.target.value)
                              }
                              className="sr-only"
                            />
                            <div
                              className={`w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                newTaskFeatureId === f.id
                                  ? "border-accent bg-accent"
                                  : "border-border bg-surface"
                              }`}
                            >
                              {newTaskFeatureId === f.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-surface" />
                              )}
                            </div>
                            <span className="font-medium text-xs text-text-primary truncate">
                              {f.name}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder:text-placeholder text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
              />
              <textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Elaborate on the task..."
                rows={2}
                className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder:text-placeholder resize-none text-base"
              />
              <button
                type="button"
                onClick={handleAddTask}
                className="px-6 py-3 bg-button text-button-text rounded-xl hover:opacity-90 transition font-medium"
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Standalone Tasks Section */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="text-xl font-light text-text-primary mb-4">
              Standalone Tasks
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {project.tasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary">
                    No standalone tasks yet.
                  </p>
                </div>
              ) : (
                project.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onUpdate={(updates) => handleUpdateTask(task.id, updates)}
                    onDelete={() => handleDeleteTask(task.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ThoughtsSection project={project} onUpdate={onUpdate} />

      {/* Visualizations */}
      <DiagramSection project={project} />

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

/**
 * Feature Card Component with Edit/Delete functionality
 *
 * EXTENSIBILITY PATTERNS:
 *
 * 1. Adding new feature properties:
 *    - Add the property to the Feature model in Prisma schema
 *    - Update UpdateFeatureInput type in src/types/index.ts
 *    - Add state management in FeatureCard component
 *    - Add UI controls in the editing/viewing sections
 *    - Update handleUpdateFeature to include the new property
 *
 * 2. Adding new feature-related functionality:
 *    - Create new handler functions following the pattern of handleAddTodo, handleToggleTodo, etc.
 *    - Use the onUpdate callback to persist changes via updateFeature action
 *    - Store complex data structures in the actionItems JSON field or add new JSON fields
 *
 * 3. Extending the to-do list:
 *    - The TodoItem interface can be extended with additional properties (e.g., dueDate, priority)
 *    - Update parseTodos to handle migration from old format
 *    - Add UI controls for new properties in the todo rendering section
 *    - Update saveTodos to persist new properties
 *
 * 4. Adding new feature sections:
 *    - Add new sections in the non-editing view (after line 763)
 *    - Add corresponding input fields in the editing view (after line 738)
 *    - Update handleSave to include new fields
 *
 * 5. Database integration:
 *    - All feature updates go through updateFeature action in src/app/actions/features.ts
 *    - The actionItems field is stored as JSON in the database, allowing flexible data structures
 *    - Use Prisma's Json type for new flexible fields
 */
function FeatureCard({
  feature,
  taskStats,
  onUpdate,
  onDelete,
  onUpdateTask,
  onDeleteTask,
}: {
  feature: ProjectWithRelations["features"][0];
  taskStats: { total: number; completed: number; percentage: number };
  onUpdate: (
    featureId: string,
    updates: {
      name?: string;
      description?: string;
      impact?: string;
      expanded?: string | null;
      status?: "IDEA" | "PLANNING" | "IN_PROGRESS" | "COMPLETED";
      actionItems?: FeatureTodoItem[];
    }
  ) => Promise<void>;
  onDelete: (featureId: string) => Promise<void>;
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
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(feature.name);
  const [editDescription, setEditDescription] = useState(
    feature.description || ""
  );
  const [editImpact, setEditImpact] = useState(feature.impact || "");

  // Auto-capitalize feature name with article exclusion
  const capitalizeFeatureName = (text: string): string => {
    if (!text || text.trim() === "") return text;

    const articles = [
      "of",
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "this",
      "that",
      "with",
      "by",
    ];

    return text
      .split(" ")
      .map((word, index) => {
        const trimmedWord = word.trim();
        if (trimmedWord === "") return word; // Preserve spacing

        const lowerWord = trimmedWord.toLowerCase();

        // Always capitalize first word
        if (index === 0) {
          return (
            trimmedWord.charAt(0).toUpperCase() +
            trimmedWord.slice(1).toLowerCase()
          );
        }

        // If it's an article, keep it lowercase
        if (articles.includes(lowerWord)) {
          return lowerWord;
        }

        // Otherwise, capitalize it
        return (
          trimmedWord.charAt(0).toUpperCase() +
          trimmedWord.slice(1).toLowerCase()
        );
      })
      .join(" ");
  };

  // Parse actionItems into TodoItem array
  const [todos, setTodos] = useState<FeatureTodoItem[]>(() =>
    parseFeatureActionItems(feature.actionItems)
  );
  const [newTodoText, setNewTodoText] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState("");

  // Sync todos when feature.actionItems changes
  useEffect(() => {
    const parsedTodos = parseFeatureActionItems(feature.actionItems);
    setTodos((previous) => {
      if (previous.length !== parsedTodos.length) {
        return parsedTodos;
      }
      const isSame = previous.every((todo, index) => {
        const candidate = parsedTodos[index];
        return (
          todo.id === candidate.id &&
          todo.text === candidate.text &&
          todo.completed === candidate.completed
        );
      });
      return isSame ? previous : parsedTodos;
    });
  }, [feature.actionItems]);

  const saveTodos = async (updatedTodos: FeatureTodoItem[]) => {
    await onUpdate(feature.id, {
      actionItems: updatedTodos,
    });
  };

  const handleAddTodo = async () => {
    if (!newTodoText.trim()) return;
    const newTodo: FeatureTodoItem = {
      id: `todo-${Date.now()}-${Math.random()}`,
      text: newTodoText.trim(),
      completed: false,
    };
    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    setNewTodoText("");
    await saveTodos(updatedTodos);
  };

  const handleToggleTodo = async (todoId: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  };

  const handleDeleteTodo = async (todoId: string) => {
    const updatedTodos = todos.filter((todo) => todo.id !== todoId);
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  };

  const handleStartEditTodo = (todo: FeatureTodoItem) => {
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text);
  };

  const handleSaveEditTodo = async () => {
    if (!editingTodoText.trim() || !editingTodoId) return;
    const updatedTodos = todos.map((todo) =>
      todo.id === editingTodoId
        ? { ...todo, text: editingTodoText.trim() }
        : todo
    );
    setTodos(updatedTodos);
    setEditingTodoId(null);
    setEditingTodoText("");
    await saveTodos(updatedTodos);
  };

  const handleCancelEditTodo = () => {
    setEditingTodoId(null);
    setEditingTodoText("");
  };

  const completedTodos = todos.filter((t) => t.completed).length;
  const totalTodos = todos.length;

  useEffect(() => {
    setEditName((previous) =>
      previous === feature.name ? previous : feature.name
    );
    setEditDescription((previous) =>
      previous === (feature.description || "")
        ? previous
        : feature.description || ""
    );
    setEditImpact((previous) =>
      previous === (feature.impact || "") ? previous : feature.impact || ""
    );
  }, [feature.name, feature.description, feature.impact]);

  const handleSave = async () => {
    await onUpdate(feature.id, {
      name: editName,
      description: editDescription.trim() || undefined,
      impact: editImpact.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(feature.name);
    setEditDescription(feature.description || "");
    setEditImpact(feature.impact || "");
    setIsEditing(false);
  };

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm group">
      {/* Feature Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={(e) => {
                    const capitalized = capitalizeFeatureName(e.target.value);
                    if (capitalized !== e.target.value) {
                      setEditName(capitalized);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // Capitalize before saving
                      const capitalized = capitalizeFeatureName(editName);
                      if (capitalized !== editName) {
                        setEditName(capitalized);
                        // Small delay to ensure state update
                        setTimeout(() => {
                          handleSave();
                        }, 0);
                      } else {
                        handleSave();
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg focus:outline-none focus:border-accent text-text-primary font-semibold text-base"
                  placeholder="Feature name..."
                  autoFocus
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg focus:outline-none focus:border-accent text-text-primary text-sm resize-none"
                  placeholder="Description..."
                  rows={2}
                />
                <textarea
                  value={editImpact}
                  onChange={(e) => setEditImpact(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg focus:outline-none focus:border-accent text-text-primary text-sm resize-none"
                  placeholder="How does this create impact?"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-3 py-1 bg-button text-button-text rounded-lg hover:opacity-90 transition text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-3 py-1 border border-border text-text-primary rounded-lg hover:bg-surface-alt transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  {feature.name}
                </h3>
                <p className="text-text-secondary text-sm mb-1">
                  {feature.description}
                </p>
                {feature.impact && (
                  <div className="mt-2">
                    <p className="text-xs text-text-secondary mb-2">
                      Impact: {feature.impact}
                    </p>
                  </div>
                )}
                {/* To-Do List Section - shown for all features */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-text-secondary">
                      To-Do List
                      {totalTodos > 0 && (
                        <span className="ml-2 text-text-secondary/80">
                          ({completedTodos}/{totalTodos})
                        </span>
                      )}
                    </h4>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {todos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center gap-2 group"
                      >
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggleTodo(todo.id)}
                          className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                        />
                        {editingTodoId === todo.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTodoText}
                              onChange={(e) =>
                                setEditingTodoText(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveEditTodo();
                                } else if (e.key === "Escape") {
                                  handleCancelEditTodo();
                                }
                              }}
                              onBlur={handleSaveEditTodo}
                              className="flex-1 px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent text-text-primary"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <>
                            <span
                              onClick={() => handleStartEditTodo(todo)}
                              className={`flex-1 text-xs cursor-pointer ${
                                todo.completed
                                  ? "line-through text-text-secondary/70"
                                  : "text-text-secondary"
                              }`}
                            >
                              {todo.text}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTodo(todo.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition"
                              title="Delete todo"
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTodo();
                          }
                        }}
                        placeholder="Add to-do item..."
                        className="flex-1 px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent text-text-primary placeholder:text-placeholder"
                      />
                      <button
                        type="button"
                        onClick={handleAddTodo}
                        className="px-2 py-1 text-xs bg-surface-alt text-accent rounded hover:opacity-90 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2 ml-2">
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-text-primary hover:text-accent px-2 py-1 rounded hover:bg-surface-alt transition text-sm"
                  title="Edit feature"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(feature.id)}
                  className="text-text-primary hover:text-red-300 px-2 py-1 rounded hover:bg-red-100 transition"
                  title="Delete feature"
                >
                  ×
                </button>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  feature.status === "IDEA"
                    ? "bg-surface-alt text-accent"
                    : feature.status === "PLANNING"
                    ? "bg-yellow-100 text-yellow-700"
                    : feature.status === "IN_PROGRESS"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {feature.status.replace("_", " ")}
              </span>
            </div>
          )}
        </div>
        {taskStats.total > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-text-secondary mb-1">
              <span>
                {taskStats.completed}/{taskStats.total} tasks
              </span>
              <span>{Math.round(taskStats.percentage)}%</span>
            </div>
            <div className="w-full bg-surface-alt rounded-full h-1.5">
              <div
                className="bg-progress h-1.5 rounded-full transition-all"
                style={{ width: `${taskStats.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Feature Tasks */}
      {feature.tasks.length > 0 && (
        <div className="p-4 bg-surface-alt/50">
          <h4 className="text-xs font-medium text-text-secondary mb-2">
            Tasks
          </h4>
          <div className="space-y-1.5">
            {feature.tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={(updates) => onUpdateTask(task.id, updates)}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThoughtsSection({
  project,
  onUpdate,
}: {
  project: ProjectWithRelations;
  onUpdate: () => void;
}) {
  const [newThought, setNewThought] = useState("");
  const [activeThoughtId, setActiveThoughtId] = useState<string | null>(null);
  const [expandedDraft, setExpandedDraft] = useState("");
  const {
    isOpen: isThoughtConfirmOpen,
    options: thoughtConfirmOptions,
    showConfirm: showThoughtConfirm,
    handleConfirm: handleThoughtConfirm,
    handleCancel: handleThoughtCancel,
  } = useConfirm();

  const thoughts = project.thoughts || [];

  const handleAddThought = async () => {
    if (!newThought.trim()) {
      return;
    }

    try {
      await createThought({
        text: newThought.trim(),
        projectId: project.id,
      });
      setNewThought("");
      onUpdate();
    } catch (err) {
      console.error("Error creating thought:", err);
      alert("Failed to create thought");
    }
  };

  const handleDeleteThought = async (thoughtId: string) => {
    const confirmed = await showThoughtConfirm({
      title: "Delete Thought",
      message:
        "Are you sure you want to delete this thought? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteThought(thoughtId);
      onUpdate();
    } catch (err) {
      console.error("Error deleting thought:", err);
      alert("Failed to delete thought");
    }
  };

  const handleStartExpand = (
    thoughtId: string,
    expandedText: string | null
  ) => {
    setActiveThoughtId(thoughtId);
    setExpandedDraft(expandedText ?? "");
  };

  const handleSaveExpanded = async (thoughtId: string) => {
    try {
      await updateThought(thoughtId, {
        expanded: expandedDraft.trim() ? expandedDraft.trim() : null,
      });
      setActiveThoughtId(null);
      setExpandedDraft("");
      onUpdate();
    } catch (err) {
      console.error("Error updating thought:", err);
      alert("Failed to update thought");
    }
  };

  const handleCancelExpand = () => {
    setActiveThoughtId(null);
    setExpandedDraft("");
  };

  return (
    <section className="space-y-6">
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <h2 className="text-2xl font-light text-text-primary mb-4">
          Thought Capture
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Quickly jot ideas, product notes, or user feedback threads. Press
          Shift+Enter to add line breaks.
        </p>
        <div className="flex flex-col md:flex-row gap-3">
          <textarea
            value={newThought}
            onChange={(event) => setNewThought(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleAddThought();
              }
            }}
            placeholder="Capture a quick idea..."
            className="flex-1 px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder:text-placeholder resize-none text-base min-h-[120px]"
          />
          <button
            type="button"
            onClick={handleAddThought}
            className="px-6 py-3 bg-button text-button-text rounded-xl hover:opacity-90 transition font-medium self-stretch md:self-end"
          >
            Add Thought
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-light text-text-primary">
            Collected Thoughts
          </h3>
          <span className="text-sm text-text-secondary/80">
            {thoughts.length} saved
          </span>
        </div>

        {thoughts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-secondary">
              You haven&apos;t captured any thoughts yet. Add one above to keep
              your planning momentum.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {thoughts.map((thought) => (
              <article
                key={thought.id}
                className="group bg-surface/60 rounded-xl border border-border p-4 shadow-sm transition hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="flex-1 text-text-primary whitespace-pre-wrap wrap-break-word">
                    {thought.text}
                  </p>
                  <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() =>
                        handleStartExpand(thought.id, thought.expanded ?? null)
                      }
                      className="text-text-primary hover:text-accent px-2 py-1 rounded hover:bg-surface-alt transition text-sm font-medium"
                    >
                      ✎ Expand
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteThought(thought.id)}
                      className="text-text-primary hover:text-red-300 px-2 py-1 rounded hover:bg-red-100 transition text-sm font-medium"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {thought.expanded && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-text-primary text-sm whitespace-pre-wrap wrap-break-word">
                      {thought.expanded}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleStartExpand(thought.id, thought.expanded ?? null)
                      }
                      className="mt-2 text-accent hover:text-accent text-xs font-medium"
                    >
                      Edit expansion
                    </button>
                  </div>
                )}

                {activeThoughtId === thought.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <label className="block text-text-primary font-medium mb-2 text-sm">
                      Expand on this thought:
                    </label>
                    <textarea
                      value={expandedDraft}
                      onChange={(event) => setExpandedDraft(event.target.value)}
                      placeholder="Add more details, break it down, explore ideas..."
                      className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder:text-placeholder resize-none text-base"
                      rows={4}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleSaveExpanded(thought.id)}
                        className="px-4 py-2 bg-button text-button-text rounded-lg hover:opacity-90 transition font-medium text-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelExpand}
                        className="px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-surface-alt transition font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={isThoughtConfirmOpen}
        title={thoughtConfirmOptions.title}
        message={thoughtConfirmOptions.message}
        confirmText={thoughtConfirmOptions.confirmText}
        cancelText={thoughtConfirmOptions.cancelText}
        onConfirm={handleThoughtConfirm}
        onCancel={handleThoughtCancel}
      />
    </section>
  );
}
