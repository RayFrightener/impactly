"use client";

import { useState, useRef, useEffect } from "react";

interface Thought {
  id: string;
  content: string;
}

/**
 * Authentic journal demo for landing page
 * Matches the real journal component UI/UX exactly
 * All functionality is visual demo only
 */
export default function LandingJournalDemo() {
  const [currentThoughtContent, setCurrentThoughtContent] = useState("");
  const [thoughts, setThoughts] = useState<Thought[]>([
    {
      id: "demo-1",
      content:
        "Idea: Add user authentication so people can save their journals. Right now it's just local storage which is fine but not great for multiple devices.",
    },
    {
      id: "demo-2",
      content:
        "Feature: Let users export their thoughts as markdown files. Would be nice to have everything backed up in a format I can actually read.",
    },
  ]);
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [editingThoughtText, setEditingThoughtText] = useState<string>("");
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionPosition, setSelectionPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle text selection
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
      if (textareaRef.current) {
        if (
          textareaRef.current.contains(startContainer) ||
          textareaRef.current === startContainer
        ) {
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

    // Shift+Enter: Commit thought
    if (e.key === "Enter" && e.shiftKey && content.length > 0) {
      e.preventDefault();
      const newThought: Thought = {
        id: `demo-${Date.now()}`,
        content: content,
      };
      setThoughts((prev) => [...prev, newThought]);
      setCurrentThoughtContent("");
    }
  };

  const handleEditThought = (thoughtId: string) => {
    const thought = thoughts.find((t) => t.id === thoughtId);
    if (thought) {
      setEditingThoughtId(thoughtId);
      setEditingThoughtText(thought.content);
    }
  };

  const handleSaveEditedThought = (_thoughtId: string) => {
    // Demo only - just exit edit mode
    setEditingThoughtId(null);
    setEditingThoughtText("");
  };

  const handleDeleteThought = (thoughtId: string) => {
    setThoughts((prev) => prev.filter((t) => t.id !== thoughtId));
  };

  const handleExtractClick = (
    _type: "action-item" | "requirement" | "feature" | "improvement"
  ) => {
    // Demo only - just close the menu, no functionality
    window.getSelection()?.removeAllRanges();
    setSelectedText("");
    setSelectionPosition(null);
  };

  const placeholder =
    thoughts.length === 0 && currentThoughtContent === ""
      ? "Start typing your thoughts... Press Shift+Enter to commit a thought"
      : "";

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        ref={containerRef}
        className="rounded-2xl border overflow-hidden shadow-lg relative"
        style={{
          backgroundColor: "#171717",
          borderColor: "#867979",
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: "#867979" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#867979" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "#D0CCCC" }}
              >
                Journal mode
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="text-xs px-3 py-1 rounded-lg"
                style={{
                  backgroundColor: "#867979",
                  color: "#ffffff",
                }}
              >
                Stream
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          className="px-8 py-12 flex flex-col overflow-hidden"
          style={{
            backgroundColor: "#171717",
            minHeight: "400px",
            maxHeight: "600px",
          }}
        >
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
                    {editingThoughtId === thought.id ? (
                      <div className="space-y-2">
                        <textarea
                          ref={editingTextareaRef}
                          value={editingThoughtText}
                          onChange={(e) =>
                            setEditingThoughtText(e.target.value)
                          }
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
                            Shift+Enter to save
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
                          {/* Drag handle */}
                          <div
                            className="shrink-0 pt-1 cursor-grab"
                            style={{ color: "#867979" }}
                            title="Drag to reorder"
                          >
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
                                d="M4 8h16M4 16h16"
                              />
                            </svg>
                          </div>
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
              <textarea
                ref={textareaRef}
                value={currentThoughtContent}
                onChange={(e) => setCurrentThoughtContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="text-lg font-mono leading-relaxed w-full outline-none border-none focus:outline-none resize-none min-h-[60px] placeholder:text-[#867979]"
                style={{
                  backgroundColor: "#171717",
                  color: "#D0CCCC",
                }}
                rows={Math.max(3, currentThoughtContent.split("\n").length + 1)}
              />
            </div>
          </div>
        </div>

        {/* Bottom hint */}
        <div
          className="px-8 py-4 border-t text-sm text-center"
          style={{
            borderColor: "rgba(134, 121, 121, 0.3)",
            color: "#867979",
          }}
        >
          Enter to wrap text · Shift+Enter to commit thought · Select text to
          extract
        </div>

        {/* Selection Quick Actions */}
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
              className="px-3 py-1 rounded text-sm transition"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.1)";
              }}
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
              className="px-3 py-1 rounded text-sm transition"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.1)";
              }}
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
              className="px-3 py-1 rounded text-sm transition"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.1)";
              }}
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
              className="px-3 py-1 rounded text-sm transition"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.1)";
              }}
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
              className="px-2 py-1 transition"
              style={{
                color: "#867979",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#867979";
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
