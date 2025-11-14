"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type JournalFile,
  listSavedJournals,
  loadJournalFromStorage,
  saveJournalToStorage,
  generateJournalFileName,
  type SavedJournalMetadata,
  type JournalSession,
} from "@/lib/journalStorage";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "archived";
}

interface JournalFileSidebarProps {
  selectedProjectId: string | null;
  currentFileId: string | null;
  onFileSelect: (file: JournalFile) => void;
  projects: Project[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function JournalFileSidebar({
  selectedProjectId,
  currentFileId,
  onFileSelect,
  projects,
  isCollapsed = false,
  onToggleCollapse,
}: JournalFileSidebarProps) {
  const router = useRouter();
  const [files, setFiles] = useState<SavedJournalMetadata[]>([]);

  useEffect(() => {
    const loadFiles = () => {
      const allFiles = listSavedJournals();
      
      // Filter files by selected project
      const filteredFiles = selectedProjectId
        ? allFiles.filter((f) => f.projectId === selectedProjectId)
        : allFiles.filter((f) => !f.projectId); // Home files (no project)
      
      // Sort by updated date (most recent first)
      const sorted = filteredFiles.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setFiles(sorted);
    };

    loadFiles();
    
    // Reload when saved journals might change
    const interval = setInterval(loadFiles, 2000);
    return () => clearInterval(interval);
  }, [selectedProjectId]);

  const projectName = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)?.name || "Project"
    : "Home";

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-[#867979]/30 bg-[#171717] flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-[#867979] hover:text-white transition"
          title="Expand sidebar"
        >
          <svg
            className="w-5 h-5"
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
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 border-r border-[#867979]/30 bg-[#171717] flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-[#867979]/30 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {selectedProjectId ? (
            <button
              onClick={() => router.push(`/dashboard?projectId=${selectedProjectId}`)}
              className="text-left w-full cursor-pointer hover:opacity-80 transition-opacity"
            >
              <h3 className="text-sm font-semibold text-white truncate">
                {projectName}
              </h3>
              <p className="text-xs text-[#867979] mt-1">
                {files.length} {files.length === 1 ? "file" : "files"}
              </p>
            </button>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-white truncate">
                {projectName}
              </h3>
              <p className="text-xs text-[#867979] mt-1">
                {files.length} {files.length === 1 ? "file" : "files"}
              </p>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-[#867979] hover:text-white transition ml-2"
            title="Collapse sidebar"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Create New File Button */}
      <div className="p-2 border-b border-[#867979]/30">
        <button
          onClick={() => {
            const now = new Date();
            const projectName = selectedProjectId
              ? projects.find((p) => p.id === selectedProjectId)?.name
              : undefined;
            const defaultName = generateJournalFileName(
              projectName,
              selectedProjectId || undefined
            );
            
            // Create empty journal session
            const newSession: JournalSession = {
              id: Date.now().toString(),
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              rawThoughts: [],
              organizedThoughts: [],
              metadata: {
                duration: 0,
                wordCount: 0,
                lineCount: 0,
              },
              projectId: selectedProjectId || undefined,
            };

            // Save to storage
            const fileId = saveJournalToStorage(
              defaultName,
              newSession,
              undefined,
              selectedProjectId || undefined
            );

            // Load and open the new file
            const newFile = loadJournalFromStorage(fileId);
            if (newFile) {
              onFileSelect({
                ...newFile,
                type: "file",
                path: newFile.path || "/",
              } as JournalFile);
            }
          }}
          className="w-full px-3 py-2 bg-[#867979]/20 hover:bg-[#867979]/30 border border-[#867979]/30 rounded-lg text-[#D0CCCC] text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create New File
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-center text-sm text-[#867979]">
            <p>No files yet</p>
            <p className="text-xs mt-1">Create a new file to get started</p>
          </div>
        ) : (
          <div className="p-2">
            {files.map((file) => {
              const isCurrent = file.id === currentFileId;
              return (
                <button
                  key={file.id}
                  onClick={() => {
                    const journalFile = loadJournalFromStorage(file.id);
                    if (journalFile) {
                      onFileSelect({
                        ...journalFile,
                        type: "file",
                        path: journalFile.path || "/",
                      } as JournalFile);
                    }
                  }}
                  className={`
                    w-full text-left p-3 rounded-lg mb-1 transition-all
                    ${
                      isCurrent
                        ? "bg-[#867979]/30 border border-[#867979] text-white"
                        : "bg-[#867979]/10 hover:bg-[#867979]/20 border border-transparent text-[#D0CCCC]"
                    }
                  `}
                >
                  <div className="font-medium text-sm truncate">{file.name}</div>
                  <div className="text-xs text-[#867979] mt-1">
                    {new Date(file.updatedAt).toLocaleDateString()}
                  </div>
                  {file.wordCount > 0 && (
                    <div className="text-xs text-[#867979] mt-0.5">
                      {file.wordCount} words
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

