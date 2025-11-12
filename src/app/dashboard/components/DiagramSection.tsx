"use client";

import type { ProjectWithRelations } from "@/types";

interface DiagramSectionProps {
  project: ProjectWithRelations;
}

export default function DiagramSection({ project }: DiagramSectionProps) {
  const features = project.features || [];
  const allTasks = [
    ...(project.tasks || []),
    ...features.flatMap((f) => f.tasks || []),
  ];

  // Feature status distribution
  const statusCounts = {
    IDEA: features.filter((f) => f.status === "IDEA").length,
    PLANNING: features.filter((f) => f.status === "PLANNING").length,
    IN_PROGRESS: features.filter((f) => f.status === "IN_PROGRESS").length,
    COMPLETED: features.filter((f) => f.status === "COMPLETED").length,
  };

  const totalFeatures = features.length;
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "DONE").length;

  if (totalFeatures === 0 && totalTasks === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <h2 className="text-2xl font-light text-neutral-800 mb-6">Visualizations</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feature Status Overview */}
        {totalFeatures > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">
              Feature Status Overview
            </h3>
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => {
                if (count === 0) return null;
                const percentage = (count / totalFeatures) * 100;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-800/80 capitalize">
                        {status.replace("_", " ")}
                      </span>
                      <span className="text-neutral-800 font-medium">
                        {count} ({Math.round(percentage)}%)
                      </span>
                    </div>
                    <div className="w-full bg-surface-alt rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          status === "IDEA"
                            ? "bg-card0"
                            : status === "PLANNING"
                            ? "bg-yellow-500"
                            : status === "IN_PROGRESS"
                            ? "bg-green-500"
                            : "bg-gray-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Task Progress */}
        {totalTasks > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">
              Task Progress
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-800/80">Overall Progress</span>
                  <span className="text-neutral-800 font-medium">
                    {completedTasks}/{totalTasks} (
                    {Math.round((completedTasks / totalTasks) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-surface-alt rounded-full h-4">
                  <div
                    className="bg-progress h-4 rounded-full transition-all"
                    style={{
                      width: `${(completedTasks / totalTasks) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-surface-alt rounded-lg">
                  <div className="text-2xl font-bold text-accent">
                    {allTasks.filter((t) => t.status === "TODO").length}
                  </div>
                  <div className="text-xs text-accent">Todo</div>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">
                    {allTasks.filter((t) => t.status === "IN_PROGRESS").length}
                  </div>
                  <div className="text-xs text-yellow-600">In Progress</div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {completedTasks}
                  </div>
                  <div className="text-xs text-green-600">Done</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Timeline (Simple) */}
        {features.length > 0 && (
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">
              Feature Timeline
            </h3>
            <div className="space-y-2">
              {features
                .sort((a, b) => a.priority - b.priority)
                .map((feature, index) => (
                  <div
                    key={feature.id}
                    className="flex items-center gap-4 p-3 bg-surface-alt/50 rounded-lg"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-full bg-accent text-accent-contrast flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-neutral-800">
                        {feature.name}
                      </div>
                      <div className="text-sm text-neutral-800/70">
                        {feature.tasks.length} tasks
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded text-xs font-medium ${
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
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

