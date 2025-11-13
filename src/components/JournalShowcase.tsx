"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getProjects } from "@/app/actions/projects";
import type { ProjectWithRelations } from "@/types";
import JournalTypingArea from "./JournalTypingArea";

interface Thought {
  id: string;
  content: string;
}

export default function JournalShowcase() {
  const router = useRouter();
  const [currentThoughtContent, setCurrentThoughtContent] = useState("");
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractType, setExtractType] = useState<
    "action-item" | "requirement" | "feature" | "improvement"
  >("action-item");
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Handle text selection - only within journal showcase
  useEffect(() => {
    if (!containerRef.current) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setSelectedText("");
        return;
      }

      const range = selection.getRangeAt(0);
      const container = containerRef.current;

      // Check if selection is within the journal showcase container
      if (!container) {
        setSelectedText("");
        return;
      }

      // Check if the selection's common ancestor is within our container
      const commonAncestor = range.commonAncestorContainer;
      if (!(commonAncestor instanceof Node)) {
        setSelectedText("");
        return;
      }

      // Check if the selection is within the journal showcase container
      if (!container.contains(commonAncestor) && container !== commonAncestor) {
        setSelectedText("");
        return;
      }

      const selectedTextContent = selection.toString().trim();
      if (selectedTextContent.length === 0) {
        setSelectedText("");
        return;
      }

      setSelectedText(selectedTextContent);
    };

    document.addEventListener("selectionchange", handleSelection);
    return () =>
      document.removeEventListener("selectionchange", handleSelection);
  }, []);

  const handleContinueToJournal = () => {
    const content = currentThoughtContent.trim();
    if (!content || isNavigating) return;

    setIsNavigating(true);

    // Store content in localStorage with a unique key
    const timestamp = Date.now();
    const storageKey = `journal-dashboard-${timestamp}`;
    localStorage.setItem(storageKey, content);

    if (selectedProjectId) {
      localStorage.setItem(`${storageKey}-projectId`, selectedProjectId);
    }

    // Navigate to journal page with query params
    const projectParam = selectedProjectId
      ? `&projectId=${encodeURIComponent(selectedProjectId)}`
      : "";
    router.push(
      `/journal?fromDashboard=true&contentKey=${timestamp}${projectParam}`
    );
  };

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
    }
    // Regular Enter: allow default behavior (newline)
  };

  const handleExtractClick = (
    type: "action-item" | "requirement" | "feature" | "improvement"
  ) => {
    if (selectedText) {
      setExtractedText(selectedText);
      setExtractType(type);
      setShowExtractModal(true);
      window.getSelection()?.removeAllRanges();
      setSelectedText("");
    }
  };

  const showContinueButton = currentThoughtContent.trim().length > 0;

  const placeholder =
    currentThoughtContent === "" ? "Start typing your thoughts..." : "";

  return (
    <div
      ref={containerRef}
      className="journal-showcase bg-[#171717] rounded-2xl border border-[#D0CCCC]/30 shadow-sm overflow-hidden relative"
    >
      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="px-8 pt-6 pb-4 border-b border-[#D0CCCC]/30">
          <label className="block text-sm text-[#D0CCCC] mb-2">
            Select Project (optional)
          </label>
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="bg-[#171717] border border-[#D0CCCC]/30 rounded-lg px-4 py-2 text-[#D0CCCC] focus:outline-none focus:border-[#D0CCCC] text-sm"
          >
            <option value="">Home</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Content Area - Scrollable thoughts with input at bottom */}
      <div
        className="px-8 py-12 flex flex-col overflow-hidden relative"
        style={{ minHeight: "400px", maxHeight: "600px" }}
      >
        {/* Selection Quick Actions - Positioned at top center */}
        {selectedText && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-[#867979] rounded-lg p-2 flex gap-2 shadow-lg">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExtractClick("action-item");
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition"
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
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition"
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
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition"
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
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition"
            >
              Extract as Improvement
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedText("");
                window.getSelection()?.removeAllRanges();
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="px-2 py-1 text-[#867979] hover:text-white transition"
            >
              ×
            </button>
          </div>
        )}

        <div className="max-w-4xl mx-auto w-full flex flex-col h-full min-h-0">
          {/* Scrollable Thoughts Container */}
          <div
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

      {/* Hint Text and Continue Button */}
      <div className="px-8 py-4 border-t border-[#D0CCCC]/30">
        {showContinueButton ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleContinueToJournal}
              disabled={isNavigating}
              className="px-8 py-3 bg-[#D0CCCC] hover:bg-white text-[#171717] rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 animate-in fade-in duration-300"
            >
              {isNavigating ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Opening Journal...
                </>
              ) : (
                <>
                  Continue in Journal
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </>
              )}
            </button>
            <p className="text-xs text-[#D0CCCC]">
              Enter to wrap text · Shift+Enter to continue · Your thought will
              be saved as a new journal entry
            </p>
          </div>
        ) : (
          <p className="text-sm text-[#D0CCCC] text-center">
            Enter to wrap text · Type your thoughts, then press Shift+Enter to
            continue to Journal
          </p>
        )}
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
                {extractedText ||
                  "Select a piece of your thought and then add that Extract as action item"}
              </p>
              {!extractedText && (
                <p className="text-xs mt-2 italic" style={{ color: "#867979" }}>
                  Select a piece of your thought and then add that Extract as
                  action item
                </p>
              )}
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
                    className="w-full px-4 py-3 rounded-lg focus:outline-none"
                    style={{
                      backgroundColor: "#171717",
                      border: "1px solid #867979",
                      color: "#D0CCCC",
                    }}
                  >
                    <option value="__new">Create new feature</option>
                    <option value="feature-1">User Onboarding</option>
                    <option value="feature-2">Dashboard</option>
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#D0CCCC" }}
                  >
                    Improvement Notes (optional)
                  </label>
                  <textarea
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

            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Visual demo only - just close the modal
                  setShowExtractModal(false);
                  setExtractedText("");
                  setSelectedText("");
                }}
                className="flex-1 px-4 py-2 rounded transition"
                style={{
                  backgroundColor: "#867979",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#756868";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#867979";
                }}
              >
                Extract
              </button>
              <button
                onClick={() => {
                  setShowExtractModal(false);
                  setExtractedText("");
                  setSelectedText("");
                }}
                className="flex-1 px-4 py-2 border rounded transition"
                style={{
                  borderColor: "#867979",
                  color: "#D0CCCC",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(134, 121, 121, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
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
