"use client";

import { useState, useEffect } from "react";
import type { FeatureWithTasks } from "@/types";

interface FeatureCardProps {
  feature: FeatureWithTasks;
  isExpanded: boolean;
  isEditing: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<FeatureWithTasks>) => void;
  onDelete: () => void;
  onStatusChange: (status: "IDEA" | "PLANNING" | "IN_PROGRESS" | "COMPLETED") => void;
}

export default function FeatureCard({
  feature,
  isExpanded,
  isEditing,
  onExpand,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onStatusChange,
}: FeatureCardProps) {
  const [editName, setEditName] = useState(feature.name);
  const [editDescription, setEditDescription] = useState(feature.description);
  const [editImpact, setEditImpact] = useState(feature.impact);
  const [editExpanded, setEditExpanded] = useState(feature.expanded || "");

  useEffect(() => {
    if (isEditing) {
      setEditName(feature.name);
      setEditDescription(feature.description);
      setEditImpact(feature.impact);
      setEditExpanded(feature.expanded || "");
    }
  }, [isEditing, feature]);

  const handleSave = () => {
    onUpdate({
      name: editName,
      description: editDescription,
      impact: editImpact,
      expanded: editExpanded.trim() || null,
    });
    onCancelEdit();
  };

  const statusColors = {
    IDEA: "bg-surface-alt text-text-primary",
    PLANNING: "bg-amber-100 text-amber-700",
    IN_PROGRESS: "bg-accent/15 text-accent",
    COMPLETED: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg focus:outline-none focus:border-accent text-text-primary font-semibold text-lg mb-2"
                autoFocus
              />
            ) : (
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {feature.name}
              </h3>
            )}
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg focus:outline-none focus:border-accent text-text-primary text-base mb-2 resize-none"
                rows={2}
              />
            ) : (
              feature.description && (
                <p className="text-text-primary text-sm mb-2">{feature.description}</p>
              )
            )}
            {isEditing ? (
              <textarea
                value={editImpact}
                onChange={(e) => setEditImpact(e.target.value)}
                placeholder="How does this create impact?"
                className="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg focus:outline-none focus:border-accent text-text-primary text-base mb-2 resize-none"
                rows={2}
              />
            ) : (
              feature.impact && (
                <p className="text-text-primary text-sm italic mb-2">
                  Impact: {feature.impact}
                </p>
              )
            )}
          </div>
          <div className="flex gap-2 ml-4">
            <select
              value={feature.status}
              onChange={(e) =>
                onStatusChange(
                  e.target.value as "IDEA" | "PLANNING" | "IN_PROGRESS" | "COMPLETED"
                )
              }
              className={`px-3 py-1 rounded-lg text-xs font-medium border-2 border-transparent focus:outline-none focus:border-accent bg-white ${
                statusColors[feature.status]
              }`}
            >
              <option value="IDEA">Idea</option>
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
            {!isEditing && (
              <>
                <button
                  onClick={onEdit}
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
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mb-4">
            <label className="block text-text-primary font-medium mb-2 text-sm">
              Detailed Breakdown:
            </label>
            <textarea
              value={editExpanded}
              onChange={(e) => setEditExpanded(e.target.value)}
              placeholder="Add detailed requirements, system design, or breakdown..."
              className="w-full px-3 py-2 bg-surface border-2 border-border rounded-lg focus:outline-none focus:border-accent text-text-primary text-base resize-none"
              rows={6}
            />
          </div>
        )}

        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-button text-button-text rounded-lg hover:opacity-90 transition font-medium text-sm"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-surface-alt transition font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {feature.expanded && (
              <div className="mb-4 pt-4 border-t border-border">
                <p className="text-text-primary text-sm whitespace-pre-wrap">
                  {feature.expanded}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-text-primary">
              <span>{feature.tasks.length} tasks</span>
              <button
                onClick={onExpand}
                className="text-text-primary hover:text-accent font-medium"
              >
                {isExpanded ? "Collapse" : "Expand"} Details
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

