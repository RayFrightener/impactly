"use client";

import { useState, useEffect } from "react";
import type { Task } from "@/types";

interface TaskItemProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}

export default function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(
    task.description || ""
  );

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
  }, [task.title, task.description]);

  const priorityColors = {
    LOW: "bg-emerald-100 text-emerald-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    HIGH: "bg-rose-100 text-rose-700",
  };

  const handleToggle = () => {
    const newStatus = task.status === "DONE" ? "TODO" : "DONE";
    onUpdate({
      status: newStatus,
      completedAt: newStatus === "DONE" ? new Date() : null,
    });
    // Don't reload on checkbox toggle - just update state
  };

  const handleSave = () => {
    onUpdate({
      title: editTitle,
      description: editDescription.trim() || null,
    });
    setIsEditing(false);
    // Data will be refreshed via onUpdate callback - no need for page reload
  };

  return (
    <div className="bg-card rounded-lg p-4 border border-border hover:border-accent transition group shadow-sm">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === "DONE"}
          onChange={handleToggle}
          style={{ colorScheme: "light" }}
          className="mt-1 w-5 h-5 accent-accent border-2 border-border rounded focus:ring-accent bg-card cursor-pointer"
        />
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg focus:outline-none focus:border-accent text-text-primary font-medium text-base"
                autoFocus
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description..."
                className="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg focus:outline-none focus:border-accent text-text-primary text-base resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-button text-button-text rounded-lg hover:opacity-90 transition text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 border border-border text-text-primary rounded-lg hover:bg-surface-alt transition text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`font-medium ${
                  task.status === "DONE"
                    ? "line-through text-accent"
                    : "text-text-primary"
                }`}
              >
                {task.title}
              </div>
              {task.description && (
                <div className="text-text-primary text-sm mt-1">
                  {task.description}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    priorityColors[task.priority]
                  }`}
                >
                  {task.priority}
                </span>
                {task.dueDate && (
                  <span className="text-accent text-xs">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        {!isEditing && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => setIsEditing(true)}
              className="text-text-primary hover:text-accent px-2 py-1 rounded hover:bg-surface-alt transition text-sm"
            >
              ✎
            </button>
            <button
              onClick={onDelete}
              className="text-text-primary hover:text-accent px-2 py-1 rounded hover:bg-surface-alt transition"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

