"use client";

import { useState, useEffect, useRef } from "react";
import { getProjects } from "@/app/actions/projects";
import { createTask } from "@/app/actions/tasks";
import {
  createFeature,
  getFeatures,
  updateFeature,
} from "@/app/actions/features";
import { createThought } from "@/app/actions/thoughts";
import type { ProjectWithRelations, FeatureWithTasks } from "@/types";
import JournalTypingArea from "./JournalTypingArea";
import {
  createFeatureTodo,
  parseFeatureActionItems,
} from "@/utils/featureTodos";

interface Thought {
  id: string;
  content: string;
}

export default function JournalShowcase() {
  const [currentThoughtContent, setCurrentThoughtContent] = useState("");
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [editingThoughtText, setEditingThoughtText] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [projectFeatures, setProjectFeatures] = useState<
    Array<FeatureWithTasks & { actionItems?: unknown }>
  >([]);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionPosition, setSelectionPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractType, setExtractType] = useState<
    "action-item" | "requirement" | "feature" | "improvement"
  >("action-item");

  // Extraction form fields
  const [featureDescription, setFeatureDescription] = useState<string>("");
  const [featureImpact, setFeatureImpact] = useState<string>("");
  const [improvementMode, setImprovementMode] = useState<"existing" | "new">(
    "existing"
  );
  const [improvementFeatureId, setImprovementFeatureId] = useState<string>("");
  const [improvementFeatureName, setImprovementFeatureName] =
    useState<string>("");
  const [improvementNotes, setImprovementNotes] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const thoughtsContainerRef = useRef<HTMLDivElement>(null);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await getProjects();
        setProjects(data.filter((p) => p.status === "ACTIVE"));
      } catch (err) {
        console.error("Error loading projects:", err);
      }
    }
    loadProjects();
  }, []);

  // Load project features when project is selected
  useEffect(() => {
    async function loadFeatures() {
      if (!selectedProjectId) {
        setProjectFeatures([]);
        return;
      }

      try {
        const features = await getFeatures(selectedProjectId);
        setProjectFeatures(
          features as Array<FeatureWithTasks & { actionItems?: unknown }>
        );

        // Set default improvement mode and feature
        if (features.length > 0) {
          setImprovementMode("existing");
          setImprovementFeatureId(features[0].id);
        } else {
          setImprovementMode("new");
          setImprovementFeatureId("");
        }
      } catch (err) {
        console.error("Error loading features:", err);
        setProjectFeatures([]);
      }
    }
    loadFeatures();
  }, [selectedProjectId]);

  // Handle text selection - works with both thoughts and textarea
  useEffect(() => {
    if (!containerRef.current) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setSelectedText("");
        setSelectionPosition(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedTextContent = selection.toString().trim();

      if (selectedTextContent.length === 0) {
        setSelectedText("");
        setSelectionPosition(null);
        return;
      }

      const startContainer = range.startContainer;
      const container = containerRef.current;

      if (!container) return;

      // Check if selection is in a thought content div
      const thoughtContentDivs = Array.from(
        container.querySelectorAll(".select-text.font-mono.whitespace-pre-wrap")
      );
      let isInThought = false;
      for (const thoughtDiv of thoughtContentDivs) {
        if (
          thoughtDiv.contains(startContainer) ||
          thoughtDiv === startContainer
        ) {
          isInThought = true;
          break;
        }
      }

      // Check if selection is within textarea
      let isInTextarea = false;
      const textarea = container.querySelector("textarea");
      if (textarea) {
        if (textarea.contains(startContainer) || textarea === startContainer) {
          isInTextarea = true;
        }
      }

      // Only proceed if selection is in allowed areas (thought divs or textarea)
      if (!isInTextarea && !isInThought) {
        setSelectedText("");
        setSelectionPosition(null);
        return;
      }

      setSelectedText(selectedTextContent);

      // Get position for quick actions menu (using viewport coordinates for fixed positioning)
      const rect = range.getBoundingClientRect();
      setSelectionPosition({
        top: rect.bottom + 10,
        left: rect.left,
      });
    };

    const element = containerRef.current;
    element.addEventListener("mouseup", handleSelection);
    element.addEventListener("keyup", handleSelection);

    return () => {
      element.removeEventListener("mouseup", handleSelection);
      element.removeEventListener("keyup", handleSelection);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const content = currentThoughtContent.trim();

    // Shift+Enter: Commit thought (add to thoughts array)
    if (e.key === "Enter" && e.shiftKey && content.length > 0) {
      e.preventDefault();
      const newThought: Thought = {
        id: `thought-${Date.now()}`,
        content: content,
      };
      setThoughts((prev) => [...prev, newThought]);
      setCurrentThoughtContent("");

      // Auto-scroll thoughts container to bottom when new thought is added
      // This ensures the input area stays visible at the bottom
      // Only auto-scroll if we're already near the bottom (within 100px)
      requestAnimationFrame(() => {
        if (thoughtsContainerRef.current) {
          const container = thoughtsContainerRef.current;
          const isNearBottom =
            container.scrollHeight -
              container.scrollTop -
              container.clientHeight <
            100;

          // Only auto-scroll if user is already near the bottom
          if (isNearBottom) {
            // Scroll to the very bottom to show the input area
            container.scrollTop = container.scrollHeight;
          }
        }
      });
    }
    // Regular Enter: allow default behavior (newline)
  };

  const handleEditThought = (thoughtId: string) => {
    const thought = thoughts.find((t) => t.id === thoughtId);
    if (thought) {
      setEditingThoughtId(thoughtId);
      setEditingThoughtText(thought.content);
    }
  };

  const handleSaveEditedThought = (thoughtId: string) => {
    setThoughts((prev) =>
      prev.map((t) =>
        t.id === thoughtId ? { ...t, content: editingThoughtText } : t
      )
    );
    setEditingThoughtId(null);
    setEditingThoughtText("");
  };

  const handleDeleteThought = (thoughtId: string) => {
    setThoughts((prev) => prev.filter((t) => t.id !== thoughtId));
  };

  const handleExtractClick = (
    type: "action-item" | "requirement" | "feature" | "improvement"
  ) => {
    if (!selectedProjectId) {
      setExtractError("Please select a project first");
      setTimeout(() => setExtractError(null), 3000);
      return;
    }

    if (selectedText) {
      setExtractedText(selectedText);
      setExtractType(type);

      // Set improvement mode based on available features
      if (type === "improvement") {
        if (projectFeatures.length > 0) {
          setImprovementMode("existing");
          setImprovementFeatureId(projectFeatures[0].id);
        } else {
          setImprovementMode("new");
          setImprovementFeatureId("");
        }
      }

      setShowExtractModal(true);
      window.getSelection()?.removeAllRanges();
      setSelectedText("");
      setSelectionPosition(null);
    }
  };

  const handleExtract = async () => {
    if (!selectedProjectId || !extractedText.trim()) {
      setExtractError("Project selection and text are required");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      if (extractType === "action-item") {
        await createTask({
          title: extractedText,
          status: "TODO",
          priority: "MEDIUM",
          projectId: selectedProjectId,
        });
      } else if (extractType === "requirement") {
        await createThought({
          text: extractedText,
          projectId: selectedProjectId,
        });
      } else if (extractType === "feature") {
        await createFeature({
          name: extractedText,
          description: featureDescription.trim() || "",
          impact: featureImpact.trim() || "",
          status: "IDEA",
          priority: projectFeatures.length,
          projectId: selectedProjectId,
        });
      } else if (extractType === "improvement") {
        if (improvementMode === "existing" && improvementFeatureId) {
          // Add improvement to existing feature
          const feature = projectFeatures.find(
            (f) => f.id === improvementFeatureId
          );
          if (feature) {
            const currentActionItems = parseFeatureActionItems(
              (feature.actionItems as unknown as
                | Array<string | import("@/types").FeatureTodoItem>
                | null
                | undefined) ?? []
            );
            const improvementText = extractedText.trim();
            const notes = improvementNotes.trim();
            const combinedText = notes
              ? `${improvementText} — ${notes}`
              : improvementText;
            const newTodo = createFeatureTodo(combinedText);

            await updateFeature(improvementFeatureId, {
              actionItems: [...currentActionItems, newTodo],
            });
          }
        } else {
          // Create new feature with improvement
          const improvementText = extractedText.trim();
          const notes = improvementNotes.trim();
          const featureName = improvementFeatureName.trim() || improvementText;
          const description =
            notes || `Improvement captured: ${improvementText}`;
          const newTodo = createFeatureTodo(
            notes ? `${improvementText} — ${notes}` : improvementText
          );

          await createFeature({
            name: featureName,
            description,
            impact: "Improvement captured via journal",
            status: "IDEA",
            priority: projectFeatures.length,
            projectId: selectedProjectId,
            actionItems: [newTodo],
          });
        }
      }

      // Reset extraction state
      setShowExtractModal(false);
      setExtractedText("");
      setFeatureDescription("");
      setFeatureImpact("");
      setImprovementFeatureName("");
      setImprovementNotes("");
      setImprovementMode(projectFeatures.length > 0 ? "existing" : "new");
      setImprovementFeatureId(
        projectFeatures.length > 0 ? projectFeatures[0]?.id || "" : ""
      );

      // Reload features to update the list
      if (selectedProjectId) {
        const features = await getFeatures(selectedProjectId);
        setProjectFeatures(
          features as Array<FeatureWithTasks & { actionItems?: unknown }>
        );
      }
    } catch (err) {
      console.error("Error extracting:", err);
      setExtractError(
        err instanceof Error ? err.message : "Failed to extract item"
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const placeholder =
    thoughts.length === 0 && currentThoughtContent === ""
      ? "Start typing your thoughts... Press Shift+Enter to commit a thought"
      : "";

  return (
    <div
      ref={containerRef}
      className="journal-showcase bg-[#171717] rounded-2xl border border-[#D0CCCC]/30 shadow-sm overflow-hidden relative"
    >
      {/* Project Selector - Tabs */}
      {projects.length > 0 && (
        <div className="px-8 pt-6 pb-4 border-b border-[#D0CCCC]/30">
          <div className="flex gap-2 overflow-x-auto">
            {/* Home Tab */}
            <button
              onClick={() => setSelectedProjectId(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                selectedProjectId === null
                  ? "bg-[#D0CCCC] text-[#171717] font-semibold border-2 border-[#D0CCCC] shadow-md"
                  : "bg-[#867979]/40 text-[#D0CCCC] hover:bg-[#867979]/50 border border-[#D0CCCC]/50"
              }`}
            >
              Home
            </button>
            {/* Project Tabs */}
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  selectedProjectId === project.id
                    ? "bg-[#D0CCCC] text-[#171717] font-semibold border-2 border-[#D0CCCC] shadow-md"
                    : "bg-[#867979]/40 text-[#D0CCCC] hover:bg-[#867979]/50 border border-[#D0CCCC]/50"
                }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area - Scrollable thoughts with input at bottom */}
      <div
        className="px-8 py-12 flex flex-col overflow-hidden relative"
        style={{
          minHeight: "400px",
          maxHeight: "600px",
        }}
      >
        {/* Selection Quick Actions - Positioned relative to selection */}
        {selectedText && selectionPosition && (
          <div
            className="fixed z-50 rounded-lg p-2 flex gap-2 shadow-lg"
            style={{
              backgroundColor: "#867979",
              top: `${selectionPosition.top}px`,
              left: `${selectionPosition.left}px`,
            }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExtractClick("action-item");
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition text-white"
            >
              Extract as Action
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExtractClick("requirement");
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition text-white"
            >
              Extract as Requirement
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExtractClick("feature");
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition text-white"
            >
              Extract as Feature
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExtractClick("improvement");
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition text-white"
            >
              Extract as Improvement
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedText("");
                setSelectionPosition(null);
                window.getSelection()?.removeAllRanges();
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="px-2 py-1 text-white/70 hover:text-white transition"
            >
              ×
            </button>
          </div>
        )}

        {/* Error message */}
        {extractError && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">
            {extractError}
          </div>
        )}

        <div className="max-w-4xl mx-auto w-full flex flex-col h-full min-h-0">
          {/* Scrollable Thoughts Container - Scrolls internally when content overflows */}
          <div
            ref={thoughtsContainerRef}
            className="flex-1 flex flex-col overflow-y-auto min-h-0 pr-2 mb-4"
            style={{
              scrollBehavior: "smooth",
            }}
          >
            {/* Spacer to push content to bottom when there are few thoughts */}
            {thoughts.length < 5 && <div className="flex-1 min-h-[100px]" />}

            <div className="space-y-3">
              {/* Committed Thoughts */}
              {thoughts.map((thought) => (
                <div
                  key={thought.id}
                  className="group relative p-4 rounded-lg transition-all duration-300 overflow-hidden"
                  style={{
                    backgroundColor: "rgba(134, 121, 121, 0.1)",
                    border: "1px solid rgba(134, 121, 121, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(134, 121, 121, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(134, 121, 121, 0.1)";
                  }}
                >
                  {editingThoughtId === thought.id ? (
                    <div className="space-y-2">
                      <textarea
                        ref={editingTextareaRef}
                        value={editingThoughtText}
                        onChange={(e) => setEditingThoughtText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.shiftKey) {
                            e.preventDefault();
                            handleSaveEditedThought(thought.id);
                          } else if (e.key === "Escape") {
                            setEditingThoughtId(null);
                            setEditingThoughtText("");
                          }
                        }}
                        className="w-full rounded p-2 font-mono text-lg leading-relaxed resize-none focus:outline-none"
                        style={{
                          backgroundColor: "#171717",
                          border: "1px solid #867979",
                          color: "#D0CCCC",
                        }}
                        rows={Math.max(
                          3,
                          editingThoughtText.split("\n").length
                        )}
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <div className="text-xs" style={{ color: "#867979" }}>
                          Shift+Enter to save, Escape to cancel
                        </div>
                        <button
                          onClick={() => handleSaveEditedThought(thought.id)}
                          className="px-3 py-1 text-xs rounded text-white transition"
                          style={{
                            backgroundColor: "#867979",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#756868";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#867979";
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        {/* Thought content */}
                        <div
                          className="flex-1 font-mono leading-relaxed whitespace-pre-wrap select-text"
                          style={{
                            color: "#D0CCCC",
                            fontSize: "18px",
                            userSelect: "text",
                            cursor: "text",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {thought.content}
                        </div>
                      </div>
                      {/* Edit/Delete buttons - appear on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditThought(thought.id);
                          }}
                          className="p-1 text-xs rounded-full transition"
                          style={{
                            backgroundColor: "rgba(134, 121, 121, 0.3)",
                            color: "#D0CCCC",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(134, 121, 121, 0.5)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(134, 121, 121, 0.3)";
                          }}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteThought(thought.id);
                          }}
                          className="p-1 text-xs rounded-full transition"
                          style={{
                            backgroundColor: "rgba(239, 68, 68, 0.2)",
                            color: "#f87171",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(239, 68, 68, 0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(239, 68, 68, 0.2)";
                          }}
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active Thought Input - Fixed at bottom */}
          <div className="relative shrink-0">
            <JournalTypingArea
              value={currentThoughtContent}
              onChange={setCurrentThoughtContent}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus={false}
            />
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="px-8 py-4 border-t border-[#D0CCCC]/30">
        <p className="text-sm text-[#D0CCCC] text-center">
          Enter to wrap text · Shift+Enter to commit thought · Select text to
          extract
        </p>
      </div>

      {/* Extraction Modal */}
      {showExtractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="rounded-lg p-6 max-w-lg w-full mx-4"
            style={{
              backgroundColor: "#171717",
              border: "1px solid #867979",
            }}
          >
            <h3
              className="text-xl font-semibold mb-4"
              style={{ color: "#D0CCCC" }}
            >
              Extract as{" "}
              {extractType === "feature"
                ? "Feature"
                : extractType === "improvement"
                ? "Improvement"
                : extractType === "requirement"
                ? "Requirement"
                : extractType === "action-item"
                ? "Action Item"
                : "Text"}
            </h3>

            <div className="mb-4">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#D0CCCC" }}
              >
                Selected Text
              </label>
              <p
                className="p-3 rounded"
                style={{
                  color: "#D0CCCC",
                  backgroundColor: "rgba(134, 121, 121, 0.1)",
                }}
              >
                {extractedText}
              </p>
            </div>

            {extractType === "feature" && (
              <div className="space-y-4 mb-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#D0CCCC" }}
                  >
                    Description (optional)
                  </label>
                  <textarea
                    value={featureDescription}
                    onChange={(e) => setFeatureDescription(e.target.value)}
                    placeholder="Add more details about this feature..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg resize-none focus:outline-none"
                    style={{
                      backgroundColor: "#171717",
                      border: "1px solid #867979",
                      color: "#D0CCCC",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#D0CCCC" }}
                  >
                    Impact (optional)
                  </label>
                  <textarea
                    value={featureImpact}
                    onChange={(e) => setFeatureImpact(e.target.value)}
                    placeholder="How does this create impact?"
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg resize-none focus:outline-none"
                    style={{
                      backgroundColor: "#171717",
                      border: "1px solid #867979",
                      color: "#D0CCCC",
                    }}
                  />
                </div>
              </div>
            )}

            {extractType === "improvement" && (
              <div className="space-y-4 mb-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#D0CCCC" }}
                  >
                    Link to Feature
                  </label>
                  <select
                    value={
                      improvementMode === "existing"
                        ? improvementFeatureId
                        : "__new"
                    }
                    onChange={(e) => {
                      if (e.target.value === "__new") {
                        setImprovementMode("new");
                        setImprovementFeatureId("");
                      } else {
                        setImprovementMode("existing");
                        setImprovementFeatureId(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none"
                    style={{
                      backgroundColor: "#171717",
                      border: "1px solid #867979",
                      color: "#D0CCCC",
                    }}
                  >
                    <option value="__new">Create new feature</option>
                    {projectFeatures.map((feature) => (
                      <option key={feature.id} value={feature.id}>
                        {feature.name}
                      </option>
                    ))}
                  </select>
                </div>
                {improvementMode === "new" && (
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#D0CCCC" }}
                    >
                      Feature Name
                    </label>
                    <input
                      type="text"
                      value={improvementFeatureName}
                      onChange={(e) =>
                        setImprovementFeatureName(e.target.value)
                      }
                      placeholder="Name for the new feature..."
                      className="w-full px-4 py-3 rounded-lg focus:outline-none"
                      style={{
                        backgroundColor: "#171717",
                        border: "1px solid #867979",
                        color: "#D0CCCC",
                      }}
                    />
                  </div>
                )}
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#D0CCCC" }}
                  >
                    Improvement Notes (optional)
                  </label>
                  <textarea
                    value={improvementNotes}
                    onChange={(e) => setImprovementNotes(e.target.value)}
                    placeholder="Add context or acceptance criteria for this improvement..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg resize-none focus:outline-none"
                    style={{
                      backgroundColor: "#171717",
                      border: "1px solid #867979",
                      color: "#D0CCCC",
                    }}
                  />
                </div>
              </div>
            )}

            {extractError && (
              <div
                className="mb-4 p-3 rounded text-sm"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                }}
              >
                {extractError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleExtract}
                disabled={isExtracting || !selectedProjectId}
                className="flex-1 px-4 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#867979",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#756868";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "#867979";
                  }
                }}
              >
                {isExtracting ? "Extracting..." : "Extract"}
              </button>
              <button
                onClick={() => {
                  setShowExtractModal(false);
                  setExtractedText("");
                  setFeatureDescription("");
                  setFeatureImpact("");
                  setImprovementFeatureName("");
                  setImprovementNotes("");
                  setExtractError(null);
                }}
                disabled={isExtracting}
                className="flex-1 px-4 py-2 border rounded transition disabled:opacity-50"
                style={{
                  borderColor: "#867979",
                  color: "#D0CCCC",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(134, 121, 121, 0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
