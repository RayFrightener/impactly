"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ProjectWithRelations } from "@/types";

type PlanningNodeType = "page" | "feature";
type PlanningNodeStatus = "idea" | "planning" | "in-progress" | "completed";

interface PlanningNode {
  id: string;
  title: string;
  description?: string;
  type: PlanningNodeType;
  status?: PlanningNodeStatus;
  children: PlanningNode[];
}

interface PlanningFormState {
  title: string;
  description: string;
  parentId: string | null;
  type: PlanningNodeType;
}

interface PlanningWorkspaceProps {
  projectId: string;
  projectName: string;
  features: ProjectWithRelations["features"];
  className?: string;
}

interface PlanningParentOption {
  id: string;
  title: string;
}

const mapFeatureStatusToPlanningStatus = (
  status: ProjectWithRelations["features"][number]["status"]
): PlanningNodeStatus => {
  switch (status) {
    case "PLANNING":
      return "planning";
    case "IN_PROGRESS":
      return "in-progress";
    case "COMPLETED":
      return "completed";
    case "IDEA":
    default:
      return "idea";
  }
};

const buildDefaultNodes = (
  features: ProjectWithRelations["features"]
): PlanningNode[] => {
  if (!features || features.length === 0) {
    return [];
  }

  return [
    {
      id: "default-root",
      title: "Feature Roadmap",
      description: "Auto-generated from current project features.",
      type: "page",
      children: features.map((feature) => ({
        id: feature.id,
        title: feature.name,
        description: feature.description ?? undefined,
        type: "feature",
        status: mapFeatureStatusToPlanningStatus(feature.status),
        children: [],
      })),
    },
  ];
};

const flattenPlanningNodes = (nodes: PlanningNode[]): PlanningNode[] => {
  const allNodes: PlanningNode[] = [];
  const traverse = (current: PlanningNode[]) => {
    current.forEach((node) => {
      allNodes.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  traverse(nodes);
  return allNodes;
};

const addChildNode = (
  nodes: PlanningNode[],
  parentId: string,
  child: PlanningNode
): PlanningNode[] =>
  nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...node.children, child],
      };
    }
    if (node.children.length > 0) {
      return {
        ...node,
        children: addChildNode(node.children, parentId, child),
      };
    }
    return node;
  });

const updateNodeById = (
  nodes: PlanningNode[],
  nodeId: string,
  updater: (node: PlanningNode) => PlanningNode
): PlanningNode[] =>
  nodes.map((node) => {
    if (node.id === nodeId) {
      return updater(node);
    }
    if (node.children.length > 0) {
      return {
        ...node,
        children: updateNodeById(node.children, nodeId, updater),
      };
    }
    return node;
  });

const removeNodeById = (nodes: PlanningNode[], nodeId: string): PlanningNode[] =>
  nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => ({
      ...node,
      children: removeNodeById(node.children, nodeId),
    }));

const statusBadgeClass = (status: PlanningNodeStatus | undefined): string => {
  switch (status) {
    case "planning":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "in-progress":
      return "bg-sky-100 text-sky-700 border border-sky-200";
    case "completed":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "idea":
    default:
      return "bg-surface-alt text-text-secondary border border-border/60";
  }
};

const statusLabel = (status: PlanningNodeStatus | undefined): string => {
  switch (status) {
    case "planning":
      return "Planning";
    case "in-progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "idea":
    default:
      return "Idea";
  }
};

export default function PlanningWorkspace({
  projectId,
  projectName,
  features,
  className,
}: PlanningWorkspaceProps) {
  const [nodes, setNodes] = useState<PlanningNode[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set()
  );
  const [formState, setFormState] = useState<PlanningFormState>({
    title: "",
    description: "",
    parentId: null,
    type: "page",
  });
  const storageKey = useMemo(
    () => `planning-workspace-${projectId}`,
    [projectId]
  );
  const hasLoadedFromStorageRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PlanningNode[];
        if (Array.isArray(parsed)) {
          setNodes(parsed);
          hasLoadedFromStorageRef.current = true;
          return;
        }
      }
      setNodes(buildDefaultNodes(features));
    } catch (error) {
      console.error("Failed to load planning hierarchy:", error);
      setNodes(buildDefaultNodes(features));
    } finally {
      hasLoadedFromStorageRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (
      !hasLoadedFromStorageRef.current &&
      (nodes.length > 0 || features.length === 0)
    ) {
      return;
    }
    if (nodes.length === 0 && features.length > 0) {
      setNodes(buildDefaultNodes(features));
    }
  }, [features, nodes.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!hasLoadedFromStorageRef.current) {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nodes));
    } catch (error) {
      console.error("Failed to persist planning hierarchy:", error);
    }
  }, [nodes, storageKey]);

  useEffect(() => {
    if (nodes.length === 0) {
      setExpandedNodeIds(new Set());
      return;
    }
    setExpandedNodeIds((previous) => {
      if (previous.size > 0) {
        return previous;
      }
      const next = new Set<string>();
      flattenPlanningNodes(nodes).forEach((node) => {
        next.add(node.id);
      });
      return next;
    });
  }, [nodes]);

  const parentOptions = useMemo<PlanningParentOption[]>(() => {
    return flattenPlanningNodes(nodes)
      .filter((node) => node.type === "page")
      .map((node) => ({ id: node.id, title: node.title }));
  }, [nodes]);

  const toggleExpansion = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleRename = useCallback((nodeId: string, currentTitle: string) => {
    const nextTitle = window.prompt("Rename item", currentTitle);
    if (!nextTitle) {
      return;
    }
    setNodes((prev) =>
      updateNodeById(prev, nodeId, (node) => ({
        ...node,
        title: nextTitle.trim(),
      }))
    );
  }, []);

  const handleDelete = useCallback((nodeId: string) => {
    setNodes((prev) => removeNodeById(prev, nodeId));
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const handleStatusChange = useCallback(
    (nodeId: string, status: PlanningNodeStatus) => {
      setNodes((prev) =>
        updateNodeById(prev, nodeId, (node) => ({
          ...node,
          status,
        }))
      );
    },
    []
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedTitle = formState.title.trim();
      const trimmedDescription = formState.description.trim();
      if (!trimmedTitle) {
        return;
      }
      const newNode: PlanningNode = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `node-${Date.now()}`,
        title: trimmedTitle,
        description: trimmedDescription || undefined,
        type: formState.type,
        status: formState.type === "feature" ? "idea" : undefined,
        children: [],
      };
      setNodes((prev) => {
        if (formState.parentId) {
          return addChildNode(prev, formState.parentId, newNode);
        }
        return [...prev, newNode];
      });
      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        next.add(newNode.id);
        if (formState.parentId) {
          next.add(formState.parentId);
        }
        return next;
      });
      setFormState((prev) => ({
        title: "",
        description: "",
        parentId: prev.type === "feature" ? prev.parentId : null,
        type: prev.parentId ? "feature" : "page",
      }));
    },
    [formState]
  );

  const renderList = useCallback(
    (list: PlanningNode[], depth = 0): ReactNode => {
      if (list.length === 0) {
        return (
          <div className="text-sm text-text-secondary">
            Add areas or features to visualize your plan.
          </div>
        );
      }

      return (
        <ul className="space-y-4">
          {list.map((node) => {
            const isExpanded =
              node.children.length === 0 || expandedNodeIds.has(node.id);
            return (
              <li
                key={node.id}
                className="rounded-xl border border-border/60 bg-card/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {node.children.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpansion(node.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-alt text-text-secondary hover:text-text-primary transition"
                          aria-label={
                            isExpanded ? "Collapse children" : "Expand children"
                          }
                        >
                          {isExpanded ? "−" : "+"}
                        </button>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-medium text-text-primary">
                            {node.title}
                          </span>
                          <span className="text-[11px] uppercase tracking-wide text-text-secondary">
                            {node.type}
                          </span>
                        </div>
                        {node.description && (
                          <p className="text-sm text-text-secondary/80">
                            {node.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {node.type === "feature" && (
                      <select
                        value={node.status ?? "idea"}
                        onChange={(event) =>
                          handleStatusChange(
                            node.id,
                            event.target.value as PlanningNodeStatus
                          )
                        }
                        className="px-2 py-1.5 bg-surface border border-border/80 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
                      >
                        <option value="idea">Idea</option>
                        <option value="planning">Planning</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setFormState({
                          title: "",
                          description: "",
                          parentId: node.id,
                          type: "feature",
                        })
                      }
                      className="px-2 py-1.5 text-xs rounded-lg bg-surface-alt hover:bg-surface text-text-secondary hover:text-text-primary transition"
                    >
                      + Child
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRename(node.id, node.title)}
                      className="px-2 py-1.5 text-xs rounded-lg border border-border/70 text-text-secondary hover:text-text-primary hover:bg-surface transition"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(node.id)}
                      className="px-2 py-1.5 text-xs rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {isExpanded && node.children.length > 0 && (
                  <div className="mt-4 ml-5 border-l border-border/40 pl-4">
                    {renderList(node.children, depth + 1)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      );
    },
    [expandedNodeIds, handleDelete, handleRename, handleStatusChange, toggleExpansion]
  );

  const renderDiagram = useCallback(
    (list: PlanningNode[]): ReactNode => {
      if (list.length === 0) {
        return (
          <div className="text-sm text-text-secondary">
            Diagram populates as you add structure on the left.
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {list.map((node) => (
            <div key={node.id}>
              <div className="rounded-xl border border-border/60 bg-card/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-medium text-text-primary">
                    {node.title}
                  </span>
                  <span className={`px-2 py-1 text-[11px] rounded-lg ${statusBadgeClass(node.status)}`}>
                    {statusLabel(node.status)}
                  </span>
                </div>
                {node.description && (
                  <p className="text-sm text-text-secondary/80 mt-2">
                    {node.description}
                  </p>
                )}
              </div>
              {node.children.length > 0 && (
                <div className="ml-6 mt-3 border-l border-border/40 pl-4">
                  {renderDiagram(node.children)}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    },
    []
  );

  return (
    <section
      className={`bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6 ${className ?? ""}`}
    >
      <header className="space-y-2">
        <h2 className="text-2xl font-light text-text-primary">
          Planning Workspace
        </h2>
        <p className="text-sm text-text-secondary">
          Structure the plan for {projectName}, map features, and capture their
          status.
        </p>
      </header>

      <form
        className="grid grid-cols-1 lg:grid-cols-4 gap-3"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          value={formState.title}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              title: event.target.value,
            }))
          }
          placeholder="Node title"
          className="px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent"
          required
        />
        <textarea
          value={formState.description}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
          placeholder="Optional description"
          rows={1}
          className="px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
        />
        <select
          value={formState.parentId ?? ""}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              parentId: event.target.value || null,
              type:
                event.target.value && prev.type === "page"
                  ? "feature"
                  : prev.type,
            }))
          }
          className="px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">Top level</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={formState.type}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                type: event.target.value as PlanningNodeType,
              }))
            }
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="page">Area</option>
            <option value="feature">Feature</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-button text-button-text rounded-xl hover:opacity-90 transition text-sm font-medium"
          >
            Add
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/60 bg-surface p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Planning Hierarchy
          </h3>
          <div className="max-h-[400px] overflow-y-auto pr-2">
            {renderList(nodes)}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-surface p-4">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Planning Diagram
          </h3>
          <div className="max-h-[400px] overflow-y-auto pr-2">
            {renderDiagram(nodes)}
          </div>
        </div>
      </div>
    </section>
  );
}

