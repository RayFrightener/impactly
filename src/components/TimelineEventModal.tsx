"use client";

import { useState, useEffect } from "react";
import { updateTimelineEvent, deleteTimelineEvent } from "@/app/actions/timeline";
import { EVENT_TYPE_LABELS } from "@/utils/timeline";
import type { TimelineEvent as PrismaTimelineEvent } from "@/types";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmationModal from "@/components/ConfirmationModal";

interface TimelineEventModalProps {
  isOpen: boolean;
  event: PrismaTimelineEvent | null;
  onClose: () => void;
  onUpdate: () => void;
  projectFeatures?: Array<{ id: string; name: string }>;
}

export default function TimelineEventModal({
  isOpen,
  event,
  onClose,
  onUpdate,
  projectFeatures = [],
}: TimelineEventModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const { isOpen: isConfirmOpen, options, showConfirm, handleConfirm, handleCancel } = useConfirm();

  // Reset edit state when modal opens with a new event
  // This is necessary to sync edit state with event props when modal opens
  useEffect(() => {
    if (event && isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditTitle((prev) => (prev !== event.title ? event.title : prev));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditDescription((prev) => (prev !== (event.description || "") ? (event.description || "") : prev));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditDate((prev) => {
        const newDate = new Date(event.date).toISOString().split("T")[0];
        return prev !== newDate ? newDate : prev;
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(false);
    }
  }, [event, isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isConfirmOpen) {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isEditing, isConfirmOpen, onClose]);

  if (!isOpen || !event) return null;

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    try {
      await updateTimelineEvent(event.id, {
        title: editTitle,
        description: editDescription || null,
        date: new Date(editDate),
      });
      onUpdate();
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating timeline event:", err);
      alert("Failed to update timeline event");
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: "Delete Timeline Event",
      message: "Are you sure you want to delete this timeline event? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (confirmed) {
      try {
        await deleteTimelineEvent(event.id);
        onUpdate();
        onClose();
      } catch (err) {
        console.error("Error deleting timeline event:", err);
        alert("Failed to delete timeline event");
      }
    }
  };

  const relatedFeature = event.featureId
    ? projectFeatures.find((f) => f.id === event.featureId)
    : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => {
          if (!isEditing) {
            onClose();
          }
        }}
      >
        <div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-text-primary">
              Timeline Event Details
            </h3>
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  onClose();
                }
              }}
              className="text-2xl leading-none text-text-secondary transition hover:text-text-primary"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
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
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent resize-none"
                  rows={4}
                  placeholder="Event description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-6 py-3 border border-border text-text-primary rounded-lg hover:bg-surface-alt transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editTitle.trim()}
                  className="flex-1 px-6 py-3 bg-button text-button-text rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-text-primary mb-2">
                  {event.title}
                </h4>
                {event.description && (
                  <p className="text-text-secondary mb-4">{event.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-text-secondary mb-1">Type</div>
                  <div className="text-sm font-medium text-text-primary">
                    {EVENT_TYPE_LABELS[event.type as keyof typeof EVENT_TYPE_LABELS] || event.type}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary mb-1">Date</div>
                  <div className="text-sm font-medium text-text-primary">
                    {new Date(event.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>

              {relatedFeature && (
                <div>
                  <div className="text-xs text-text-secondary mb-1">Related Feature</div>
                  <div className="text-sm font-medium text-text-primary">
                    {relatedFeature.name}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 px-6 py-3 border border-border text-text-primary rounded-lg hover:bg-surface-alt transition font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}

