"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProject, deleteProject } from "@/app/actions/projects";
import type { ProjectWithRelations } from "@/types";
import TrackingTab from "./TrackingTab";
import PlanningTab from "./PlanningTab";
import LoadingScreen from "@/components/LoadingScreen";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmationModal from "@/components/ConfirmationModal";

interface ProjectWorkspaceProps {
  projectId: string;
  onBack: () => void;
}

type TabType = "tracking" | "planning";

export default function ProjectWorkspace({
  projectId,
  onBack,
}: ProjectWorkspaceProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("tracking");
  const { isOpen, options, showConfirm, handleConfirm, handleCancel } =
    useConfirm();

  const loadProject = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }
        setError(null);
        const data = await getProject(projectId);
        if (!data) {
          setError("Project not found");
          return;
        }
        setProject(data);
      } catch (err) {
        console.error("Error loading project:", err);
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [projectId]
  );

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleUpdate = useCallback(() => {
    // Refresh project data after mutations without showing loading screen
    // This preserves the current view and tab state
    loadProject(false);
  }, [loadProject]);

  const handleDeleteProject = async () => {
    if (!project) return;

    const confirmed = await showConfirm({
      title: "Delete Project",
      message:
        "Are you sure you want to delete this project? This action cannot be undone and will delete all associated features, tasks, and data.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await deleteProject(project.id);
      onBack();
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project");
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading project..." />;
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="mb-6 text-text-primary hover:text-accent flex items-center gap-2 font-medium"
          >
            ← Back to Projects
          </button>
          <div className="bg-surface rounded-2xl p-8 border border-border shadow-sm">
            <div className="text-red-600">{error || "Project not found"}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-header border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-text-primary hover:text-accent hover:bg-surface-alt px-4 py-2 rounded-lg transition font-medium"
            >
              ← Back to Projects
            </button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-light text-text-primary">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-text-secondary text-sm mt-1">
                    {project.description}
                  </p>
                )}
              </div>
              <button
                onClick={handleDeleteProject}
                className="text-text-primary hover:text-red-400 hover:bg-red-50 px-3 py-2 rounded-lg transition font-medium text-sm"
                title="Delete project"
              >
                Delete
              </button>
            </div>
          </div>
          <button
            onClick={() => router.push(`/journal?projectId=${project.id}`)}
            className="bg-button text-button-text px-6 py-2 rounded-full hover:opacity-90 transition-all shadow-sm font-medium"
          >
            Start Journaling
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex justify-center gap-4 border-b border-border overflow-x-auto">
          {[
            { id: "tracking" as TabType, label: "Tracking" },
            { id: "planning" as TabType, label: "Planning" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-4 text-lg font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-text-primary border-b-2 border-accent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "tracking" && (
          <TrackingTab project={project} onUpdate={handleUpdate} />
        )}
        {activeTab === "planning" && (
          <PlanningTab project={project} onUpdate={handleUpdate} />
        )}
      </div>

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
