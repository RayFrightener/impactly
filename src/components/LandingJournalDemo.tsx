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
        "I need to improve the user onboarding flow. The current process is too complex and users are dropping off.",
    },
    {
      id: "demo-2",
      content:
        "Consider adding a tutorial or interactive guide for first-time users.",
    },
  ]);
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [editingThoughtText, setEditingThoughtText] = useState<string>("");
  const [selectedText, setSelectedText] = useState<string>("");
  const [extractedText, setExtractedText] = useState<string>(""); // Store text for modal
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractType, setExtractType] = useState<
    "action-item" | "requirement" | "feature" | "improvement"
  >("action-item");
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

    // Helper function to check if a node is within a thought content div
    const isInThoughtDiv = (node: Node | null): boolean => {
      if (!node) return false;

      // Get the element (either the node itself or its parent if it's a text node)
      let element: Element | null = null;
      if (node.nodeType === Node.ELEMENT_NODE) {
        element = node as Element;
      } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        element = node.parentElement;
      }

      if (!element) return false;

      // Traverse up the DOM tree to find a thought content div
      // Thought content divs have the class "select-text" along with "font-mono" and "whitespace-pre-wrap"
      let current: Element | null = element;
      while (current) {
        // Check for the key identifying classes of thought content divs
        if (
          current.classList.contains("select-text") &&
          current.classList.contains("font-mono") &&
          current.classList.contains("whitespace-pre-wrap")
        ) {
          return true;
        }
        current = current.parentElement;
      }

      return false;
    };

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

      // Check if selection is within a thought content div
      const isInThought =
        isInThoughtDiv(range.startContainer) ||
        isInThoughtDiv(range.endContainer) ||
        isInThoughtDiv(selection.anchorNode) ||
        isInThoughtDiv(selection.focusNode);

      // Check if selection is within textarea
      // For textarea, check if the active element is the textarea
      // or if any selection nodes are within the textarea
      let isInTextarea = false;
      if (textareaRef.current) {
        // Check if textarea is focused (most reliable for textarea selections)
        if (document.activeElement === textareaRef.current) {
          isInTextarea = true;
        }
        // Also check if selection nodes are within textarea
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;

        if (
          textareaRef.current.contains(startContainer) ||
          textareaRef.current.contains(endContainer) ||
          (selection.anchorNode &&
            textareaRef.current.contains(selection.anchorNode)) ||
          (selection.focusNode &&
            textareaRef.current.contains(selection.focusNode))
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
        top: rect.bottom + window.scrollY + 10,
        left: rect.left + window.scrollX,
      });
    };

    document.addEventListener("selectionchange", handleSelection);
    return () =>
      document.removeEventListener("selectionchange", handleSelection);
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

  const handleSaveEditedThought = (thoughtId: string) => {
    // Demo only - just exit edit mode
    setEditingThoughtId(null);
    setEditingThoughtText("");
  };

  const handleDeleteThought = (thoughtId: string) => {
    setThoughts((prev) => prev.filter((t) => t.id !== thoughtId));
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
      setSelectionPosition(null);
    }
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
                  <p
                    className="text-xs mt-2 italic"
                    style={{ color: "#867979" }}
                  >
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
                    setShowExtractModal(false);
                    setExtractedText("");
                    setSelectedText("");
                    setSelectionPosition(null);
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
                    setSelectionPosition(null);
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
    </div>
  );
}
