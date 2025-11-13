"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProjects } from "@/app/actions/projects";
import type { ProjectWithRelations } from "@/types";
import JournalTypingArea from "./JournalTypingArea";

export default function JournalShowcase() {
  const router = useRouter();
  const [currentThoughtContent, setCurrentThoughtContent] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

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
    router.push(`/journal?fromDashboard=true&contentKey=${timestamp}${projectParam}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const content = currentThoughtContent.trim();
    
    // Shift+Enter: Continue to Journal (if there's content)
    if (e.key === "Enter" && e.shiftKey && content.length > 0 && !isNavigating) {
      e.preventDefault();
      handleContinueToJournal();
    }
    // Regular Enter: allow default behavior (newline)
  };

  const showContinueButton = currentThoughtContent.trim().length > 0;

  const placeholder =
    currentThoughtContent === ""
      ? "Start typing your thoughts..."
      : "";

  return (
    <div className="bg-[#171717] rounded-2xl border border-[#867979]/30 shadow-sm overflow-hidden">
      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="px-8 pt-6 pb-4 border-b border-[#867979]/30">
          <label className="block text-sm text-[#867979] mb-2">
            Select Project (optional)
          </label>
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="bg-[#171717] border border-[#867979]/30 rounded-lg px-4 py-2 text-[#D0CCCC] focus:outline-none focus:border-[#867979] text-sm"
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

      {/* Typing Area Container - Centered like journal */}
      <div className="px-8 py-12">
        <div className="max-w-4xl mx-auto w-full">
          <div className="relative">
            <JournalTypingArea
              value={currentThoughtContent}
              onChange={setCurrentThoughtContent}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus={false}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </div>
        </div>
      </div>

      {/* Hint Text and Continue Button */}
      <div className="px-8 py-4 border-t border-[#867979]/30">
        {showContinueButton ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleContinueToJournal}
              disabled={isNavigating}
              className="px-8 py-3 bg-[#867979] hover:bg-[#756868] text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 animate-in fade-in duration-300"
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
            <p className="text-xs text-[#867979]">
              Enter to wrap text · Shift+Enter to continue · Your thought will be saved as a new journal entry
            </p>
          </div>
        ) : (
          <p className="text-sm text-[#867979] text-center">
            Enter to wrap text · Type your thoughts, then press Shift+Enter to continue to Journal
          </p>
        )}
      </div>
    </div>
  );
}

