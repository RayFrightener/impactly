"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import LoadingScreen from "@/components/LoadingScreen";
import { getProjects, createProject } from "@/app/actions/projects";
import { trackSessionStart } from "@/app/actions/analytics";
import type { ProjectWithRelations } from "@/types";
import ProjectWorkspace from "./components/ProjectWorkspace";
import SettingsModal from "@/components/SettingsModal";
import JournalShowcase from "@/components/JournalShowcase";
import { useThemeChange } from "@/components/theme/useThemeChange";

// Type aliases for backward compatibility with existing code
type Project = ProjectWithRelations & {
  lastUpdated: string;
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectMoreInfo, setProjectMoreInfo] = useState("");

  // Extract first name from user's name
  const firstName = session?.user?.name?.split(" ")[0] || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, forceUpdate] = useState({});

  // React to theme changes instantly for visual feedback
  useThemeChange(() => {
    // Force a re-render to ensure all components update with new theme
    forceUpdate({});
  });

  // Track session start
  useEffect(() => {
    trackSessionStart();
  }, []);

  // Read projectId from URL query params and set selected project
  useEffect(() => {
    const projectIdFromUrl = searchParams.get("projectId");
    if (projectIdFromUrl && projectIdFromUrl !== selectedProject) {
      setSelectedProject(projectIdFromUrl);
    }
  }, [searchParams, selectedProject]);

  // Load projects from database
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      // Transform to match the old format
      const transformed = data.map((p) => ({
        ...p,
        lastUpdated: p.updatedAt.toISOString(),
      }));
      setProjects(transformed);
    } catch (err) {
      console.error("Error loading projects:", err);
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Reload projects when returning from project workspace
  const prevSelectedProjectRef = useRef<string | null>(null);
  useEffect(() => {
    // Only reload if we're transitioning from a project back to null (user went back)
    if (prevSelectedProjectRef.current !== null && selectedProject === null) {
      loadProjects();
    }
    prevSelectedProjectRef.current = selectedProject;
  }, [selectedProject, loadProjects]);

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    try {
      const newProject = await createProject({
        name: projectName,
        description: projectDescription,
        moreInfo: projectMoreInfo,
        status: "ACTIVE",
      });

      // Transform to match old format and add to state
      const transformed: Project = {
        ...newProject,
        lastUpdated: newProject.updatedAt.toISOString(),
        thoughts: [],
        features: [],
        tasks: [],
        timeline: [],
      };

      setProjects([...projects, transformed]);
      setProjectName("");
      setProjectDescription("");
      setProjectMoreInfo("");
      setShowCreateModal(false);
      setSelectedProject(newProject.id);
    } catch (err) {
      console.error("Error creating project:", err);
      setError("Failed to create project");
    }
  };

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");

  if (selectedProject) {
    return (
      <ProjectWorkspace
        projectId={selectedProject}
        onBack={() => {
          setSelectedProject(null);
          // Clear query param when going back
          router.push("/dashboard");
        }}
      />
    );
  }

  // Calculate progress for project card - Weighted: 60% tasks + 40% features
  const getProjectProgress = (project: Project) => {
    const allTasks = [
      ...(project.tasks || []),
      ...(project.features?.flatMap((f) => f.tasks || []) || []),
    ];
    const features = project.features || [];

    const completedTasks = allTasks.filter((t) => t.status === "DONE").length;
    const completedFeatures = features.filter(
      (f) => f.status === "COMPLETED"
    ).length;

    const taskProgress =
      allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : null;
    const featureProgress =
      features.length > 0 ? (completedFeatures / features.length) * 100 : null;

    if (taskProgress !== null && featureProgress !== null) {
      return Math.round(taskProgress * 0.6 + featureProgress * 0.4);
    }
    if (taskProgress !== null) return Math.round(taskProgress);
    if (featureProgress !== null) return Math.round(featureProgress);
    return 0;
  };

  const getProjectStats = (project: Project) => {
    const allTasks = [
      ...(project.tasks || []),
      ...(project.features?.flatMap((f) => f.tasks || []) || []),
    ];
    const completedTasks = allTasks.filter((t) => t.status === "DONE").length;
    const inProgressTasks = allTasks.filter(
      (t) => t.status === "IN_PROGRESS"
    ).length;
    const todoTasks = allTasks.filter((t) => t.status === "TODO").length;
    const features = project.features || [];
    const completedFeatures = features.filter(
      (f) => f.status === "COMPLETED"
    ).length;
    const inProgressFeatures = features.filter(
      (f) => f.status === "IN_PROGRESS"
    ).length;
    const nextFeature = features.find(
      (f) => f.status === "IDEA" || f.status === "PLANNING"
    );
    const currentFeature = features.find((f) => f.status === "IN_PROGRESS");

    // Calculate days since last update
    const lastUpdate = new Date(project.lastUpdated);
    const now = new Date();
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalTasks: allTasks.length,
      completedTasks,
      inProgressTasks,
      todoTasks,
      totalFeatures: features.length,
      completedFeatures,
      inProgressFeatures,
      nextFeature: nextFeature?.name,
      currentFeature: currentFeature?.name,
      daysSinceUpdate,
      hasActivity: daysSinceUpdate < 7, // Active if updated in last week
    };
  };

  return (
    <>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          {/* Top Navigation Bar */}
          <div className="flex gap-3 items-center mb-8">
            {/* Left Navigation */}
            <button
              onClick={() => router.push("/roadmap")}
              className="px-4 py-2 bg-button rounded-lg hover:opacity-90 transition font-medium shadow-sm"
              style={{ color: "#ffffff" }}
            >
              🗺️ Roadmap
            </button>
            <button
              onClick={() => router.push("/dashboard/insights")}
              className="px-4 py-2 bg-button rounded-lg hover:opacity-90 transition font-medium shadow-sm"
              style={{ color: "#ffffff" }}
            >
              📊 View Insights
            </button>
            <button
              onClick={() => router.push("/journal")}
              className="px-4 py-2 bg-button rounded-lg hover:opacity-90 transition font-medium shadow-sm"
              style={{ color: "#ffffff" }}
            >
              ✍️ Journal
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-4 py-2 bg-button rounded-lg hover:opacity-90 transition font-medium shadow-sm"
              style={{ color: "#ffffff" }}
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-5xl font-light text-text-primary">
                Welcome Back{firstName ? `, ${firstName}` : ""}
              </h1>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-button px-10 py-4 rounded-2xl hover:opacity-90 transition-all duration-200 font-bold text-xl flex items-center gap-4 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-100 transform"
                style={{ color: "#ffffff" }}
              >
                <span
                  className="text-3xl font-light"
                  style={{ color: "#ffffff" }}
                >
                  +
                </span>
                Create New Project
              </button>
            </div>
            <p className="text-text-secondary text-xl leading-relaxed">
              Your projects and thoughts, all in one place
            </p>
          </div>

          {loading ? (
            <LoadingScreen message="Loading your projects..." />
          ) : error ? (
            <div className="text-center py-32">
              <div className="text-6xl mb-6">⚠️</div>
              <p className="text-2xl text-text-primary mb-6 font-light">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeProjects.length === 0 ? (
                <div className="text-center py-32">
                  <div className="text-7xl mb-6">📝</div>
                  <h2 className="text-3xl font-light text-text-primary mb-3">
                    No projects yet
                  </h2>
                  <p className="text-text-secondary mb-6">
                    Create your first project to get started
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-button text-button-text px-6 py-3 rounded-full hover:opacity-90 transition-all shadow-sm"
                  >
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeProjects.map((project) => {
                    const stats = getProjectStats(project);
                    const progress = getProjectProgress(project);
                    return (
                      <div
                        key={project.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", project.id);
                          e.currentTarget.style.opacity = "0.5";
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedId =
                            e.dataTransfer.getData("text/plain");
                          if (draggedId !== project.id) {
                            const draggedIndex = projects.findIndex(
                              (p) => p.id === draggedId
                            );
                            const dropIndex = projects.findIndex(
                              (p) => p.id === project.id
                            );
                            if (draggedIndex !== -1 && dropIndex !== -1) {
                              const newProjects = [...projects];
                              const [removed] = newProjects.splice(
                                draggedIndex,
                                1
                              );
                              newProjects.splice(dropIndex, 0, removed);
                              setProjects(newProjects);
                            }
                          }
                        }}
                        className="cursor-move"
                      >
                        <button
                          onClick={() => setSelectedProject(project.id)}
                          className="w-full rounded-2xl p-6 transition-all shadow-sm hover:shadow-md text-left border group"
                          style={{
                            backgroundColor: "var(--theme-button)",
                            color: "var(--theme-button-text)",
                            borderColor: "var(--theme-border)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.9";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          {/* Header with Status */}
                          <div className="flex justify-between items-start mb-3">
                            <h3
                              className="text-xl font-semibold group-hover:opacity-90 transition flex-1"
                              style={{ color: "var(--theme-button-text)" }}
                            >
                              {project.name}
                            </h3>
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className="text-xs px-2 py-1 rounded-full capitalize transition-colors font-medium"
                                style={{
                                  backgroundColor: "var(--theme-accent)",
                                  color: "var(--theme-accent-contrast)",
                                }}
                              >
                                {project.status}
                              </span>
                              {stats.hasActivity &&
                                project.status !== "ACTIVE" && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full transition-colors"
                                    style={{
                                      backgroundColor:
                                        "var(--theme-surface-alt)",
                                      color: "var(--theme-button-text)",
                                      opacity: 0.8,
                                    }}
                                  >
                                    Recent Activity
                                  </span>
                                )}
                            </div>
                          </div>

                          {/* Description */}
                          {project.description && (
                            <p
                              className="text-sm mb-4 line-clamp-2"
                              style={{
                                color: "var(--theme-button-text)",
                                opacity: 0.9,
                              }}
                            >
                              {project.description}
                            </p>
                          )}

                          {/* Progress Section */}
                          <div className="mb-4 space-y-3">
                            {/* Overall Progress */}
                            <div>
                              <div
                                className="flex justify-between text-xs mb-1"
                                style={{ color: "var(--theme-button-text)" }}
                              >
                                <span className="font-medium">
                                  Overall Progress
                                </span>
                                <span className="font-semibold">
                                  {progress}%
                                </span>
                              </div>
                              <div
                                className="w-full rounded-full h-2.5 transition-colors"
                                style={{
                                  backgroundColor: "var(--theme-surface-alt)",
                                  opacity: 0.3,
                                }}
                              >
                                <div
                                  className="h-2.5 rounded-full transition-all"
                                  style={{
                                    width: `${progress}%`,
                                    backgroundColor: "var(--theme-progress)",
                                  }}
                                />
                              </div>
                            </div>

                            {/* Tasks Breakdown */}
                            {stats.totalTasks > 0 && (
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div
                                  className="rounded-lg p-2 text-center transition-colors"
                                  style={{
                                    backgroundColor: "rgba(0, 0, 0, 0.15)",
                                    border:
                                      "1px solid rgba(255, 255, 255, 0.1)",
                                  }}
                                >
                                  <div
                                    className="font-semibold"
                                    style={{ color: "#ffffff" }}
                                  >
                                    {stats.completedTasks}
                                  </div>
                                  <div
                                    style={{
                                      color: "#ffffff",
                                    }}
                                  >
                                    Done
                                  </div>
                                </div>
                                <div
                                  className="rounded-lg p-2 text-center transition-colors"
                                  style={{
                                    backgroundColor: "rgba(0, 0, 0, 0.15)",
                                    border:
                                      "1px solid rgba(255, 255, 255, 0.1)",
                                  }}
                                >
                                  <div
                                    className="font-semibold"
                                    style={{ color: "#ffffff" }}
                                  >
                                    {stats.inProgressTasks}
                                  </div>
                                  <div
                                    style={{
                                      color: "#ffffff",
                                    }}
                                  >
                                    Active
                                  </div>
                                </div>
                                <div
                                  className="rounded-lg p-2 text-center transition-colors"
                                  style={{
                                    backgroundColor: "rgba(0, 0, 0, 0.15)",
                                    border:
                                      "1px solid rgba(255, 255, 255, 0.1)",
                                  }}
                                >
                                  <div
                                    className="font-semibold"
                                    style={{ color: "#ffffff" }}
                                  >
                                    {stats.todoTasks}
                                  </div>
                                  <div
                                    style={{
                                      color: "#ffffff",
                                    }}
                                  >
                                    Todo
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Features Summary */}
                            {stats.totalFeatures > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span
                                    style={{
                                      color: "var(--theme-button-text)",
                                    }}
                                  >
                                    Features:
                                  </span>
                                  <span
                                    className="font-semibold"
                                    style={{
                                      color: "var(--theme-button-text)",
                                    }}
                                  >
                                    {stats.completedFeatures}/
                                    {stats.totalFeatures} completed
                                  </span>
                                </div>
                                {stats.inProgressFeatures > 0 && (
                                  <span
                                    className="px-2 py-1 rounded-full transition-colors"
                                    style={{
                                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                                      color: "#ffffff",
                                      border:
                                        "1px solid rgba(255, 255, 255, 0.15)",
                                    }}
                                  >
                                    {stats.inProgressFeatures} in progress
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Current Focus / Next Steps */}
                          {(stats.currentFeature || stats.nextFeature) && (
                            <div
                              className="mb-4 pt-4 border-t transition-colors"
                              style={{
                                borderColor: "var(--theme-border)",
                                opacity: 0.5,
                              }}
                            >
                              {stats.currentFeature && (
                                <div className="flex items-start gap-2 mb-2">
                                  <span
                                    className="text-xs mt-0.5"
                                    style={{ color: "var(--theme-accent)" }}
                                  >
                                    ⚡
                                  </span>
                                  <div className="flex-1">
                                    <div
                                      className="text-xs font-medium mb-0.5"
                                      style={{
                                        color: "var(--theme-button-text)",
                                        opacity: 0.9,
                                      }}
                                    >
                                      Currently Working On:
                                    </div>
                                    <div
                                      className="text-sm font-medium"
                                      style={{
                                        color: "var(--theme-button-text)",
                                      }}
                                    >
                                      {stats.currentFeature}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {stats.nextFeature && !stats.currentFeature && (
                                <div className="flex items-start gap-2">
                                  <span
                                    className="text-xs mt-0.5"
                                    style={{ color: "var(--theme-accent)" }}
                                  >
                                    📋
                                  </span>
                                  <div className="flex-1">
                                    <div
                                      className="text-xs font-medium mb-0.5"
                                      style={{
                                        color: "var(--theme-button-text)",
                                        opacity: 0.9,
                                      }}
                                    >
                                      Next Up:
                                    </div>
                                    <div
                                      className="text-sm font-medium"
                                      style={{
                                        color: "var(--theme-button-text)",
                                      }}
                                    >
                                      {stats.nextFeature}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer with Metadata */}
                          <div
                            className="flex items-center justify-between text-xs pt-3 border-t transition-colors"
                            style={{
                              borderColor: "var(--theme-border)",
                              opacity: 0.5,
                            }}
                          >
                            <div
                              className="flex gap-3"
                              style={{
                                color: "var(--theme-button-text)",
                                opacity: 0.9,
                              }}
                            >
                              {stats.totalTasks > 0 && (
                                <span>{stats.totalTasks} tasks</span>
                              )}
                              {stats.totalFeatures > 0 && (
                                <span>{stats.totalFeatures} features</span>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              <span
                                style={{
                                  color: "var(--theme-button-text)",
                                  opacity: 0.9,
                                }}
                              >
                                {stats.daysSinceUpdate === 0
                                  ? "Updated today"
                                  : stats.daysSinceUpdate === 1
                                  ? "Updated yesterday"
                                  : `Updated ${stats.daysSinceUpdate}d ago`}
                              </span>
                              {stats.daysSinceUpdate > 7 && (
                                <span
                                  className="text-[10px] mt-0.5"
                                  style={{ color: "var(--theme-accent)" }}
                                >
                                  Needs attention
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Journal Showcase */}
              <div className="mt-10">
                <JournalShowcase />
              </div>

              {showCreateModal && (
                <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
                  <div className="bg-surface rounded-3xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto border border-border">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-light text-text-primary">
                        Create New Project
                      </h2>
                      <button
                        onClick={() => {
                          setShowCreateModal(false);
                          setProjectName("");
                          setProjectDescription("");
                          setProjectMoreInfo("");
                        }}
                        className="text-accent hover:opacity-80 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-alt transition"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-text-primary font-medium mb-2">
                          Project Name *
                        </label>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="Enter project name..."
                          className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder-placeholder text-base"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateProject();
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-text-primary font-medium mb-2">
                          Description
                        </label>
                        <textarea
                          value={projectDescription}
                          onChange={(e) =>
                            setProjectDescription(e.target.value)
                          }
                          placeholder="What is this project about?"
                          rows={3}
                          className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder-placeholder resize-none text-base"
                        />
                      </div>

                      <div>
                        <label className="block text-text-primary font-medium mb-2">
                          More Info
                        </label>
                        <textarea
                          value={projectMoreInfo}
                          onChange={(e) => setProjectMoreInfo(e.target.value)}
                          placeholder="Additional details, goals, or context..."
                          rows={4}
                          className="w-full px-4 py-3 bg-card border-2 border-border rounded-xl focus:outline-none focus:border-accent transition text-text-primary placeholder-placeholder resize-none text-base"
                        />
                      </div>

                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => {
                            setShowCreateModal(false);
                            setProjectName("");
                            setProjectDescription("");
                            setProjectMoreInfo("");
                          }}
                          className="flex-1 px-6 py-3 border-2 border-border text-text-primary rounded-xl hover:bg-surface-alt transition font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateProject}
                          disabled={!projectName.trim()}
                          className="flex-1 px-6 py-3 bg-button rounded-xl hover:opacity-90 transition shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ color: "#ffffff" }}
                        >
                          Create Project
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
      <DashboardContent />
    </Suspense>
  );
}
