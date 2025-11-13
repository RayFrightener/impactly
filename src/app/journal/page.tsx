"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  saveJournalToStorage,
  loadJournalFromStorage,
  listSavedJournals,
  exportJournalToJSON,
  importJournalFromJSON,
  type SavedJournalMetadata,
  getItemMetadata,
  renameItem,
  deleteItem,
  migrateFlatStructureToFileSystem,
  type JournalFile,
  type JournalFileSystemItem,
  type JournalSession,
} from "@/lib/journalStorage";
import JournalFileExplorer from "@/components/JournalFileExplorer";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmationModal from "@/components/ConfirmationModal";
import { getProjects } from "@/app/actions/projects";
import { createTask } from "@/app/actions/tasks";
import {
  createFeature,
  getFeatures,
  updateFeature,
} from "@/app/actions/features";
import { createThought } from "@/app/actions/thoughts";
import type {
  FeatureActionItems,
  FeatureWithTasks,
  FeatureTodoItem,
} from "@/types";
import {
  createFeatureTodo,
  parseFeatureActionItems,
} from "@/utils/featureTodos";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "archived";
}

interface OrganizedThought {
  id: string;
  originalText: string;
  type:
    | "action-item"
    | "requirement"
    | "feature"
    | "improvement"
    | "question"
    | "idea"
    | "note";
  category?: string;
  priority?: "low" | "medium" | "high";
  expanded?: string;
  selected: boolean;
  relatedFeatureId?: string;
  relatedFeatureName?: string;
  improvementMode?: "existing" | "new";
}

interface ExportImprovement {
  text: string;
  relatedFeatureId?: string;
  relatedFeatureName?: string;
  notes?: string;
}

interface ExportItemsState {
  tasks: Array<{ text: string; priority: "low" | "medium" | "high" }>;
  requirements: string[];
  features: Array<{ name: string; description: string; impact: string }>;
  improvements: ExportImprovement[];
}

type ViewMode = "stream" | "organize" | "export";

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

function JournalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    searchParams.get("projectId") || null
  );
  const [viewMode, setViewMode] = useState<ViewMode>("stream");

  // Initialize currentThoughtContent - will be auto-committed if from dashboard
  const [currentThoughtContent, setCurrentThoughtContent] =
    useState<string>("");

  // Stream of consciousness state - Thought-based system
  interface Thought {
    id: string;
    content: string; // Can contain newlines from Enter key
  }

  type PersistedJournalSession = JournalSession & { thoughts?: Thought[] };

  const [thoughts, setThoughts] = useState<Thought[]>([]); // Committed thoughts (editable blocks)
  const [newThoughtIds, setNewThoughtIds] = useState<Set<string>>(new Set()); // Track newly added thoughts for animation
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null); // Which thought is being edited
  const [editingThoughtText, setEditingThoughtText] = useState<string>(""); // Text being edited
  const [draggedThoughtId, setDraggedThoughtId] = useState<string | null>(null); // Thought being dragged

  // Keep lines for backward compatibility with organize view
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [isFocused, setIsFocused] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [wordCount, setWordCount] = useState(0);
  // Session duration timer - commented out per user request
  // const [sessionDuration, setSessionDuration] = useState("0:00");

  // Organize state
  const [organizedThoughts, setOrganizedThoughts] = useState<
    OrganizedThought[]
  >([]);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionContext, setSelectionContext] = useState<
    "stream" | "organize" | null
  >(null);
  const [projectFeatures, setProjectFeatures] = useState<FeatureWithTasks[]>(
    []
  );
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [improvementMode, setImprovementMode] = useState<"existing" | "new">(
    "existing"
  );
  const [improvementFeatureId, setImprovementFeatureId] = useState<string>("");
  const [improvementFeatureName, setImprovementFeatureName] =
    useState<string>("");
  const [improvementNotes, setImprovementNotes] = useState<string>("");
  const [, setHighlightedSpans] = useState<
    Array<{ lineIndex: number; start: number; end: number; id: string }>
  >([]);
  const [highlightedThoughts, setHighlightedThoughts] = useState<
    Array<{ thoughtId: string; start: number; end: number; id: string }>
  >([]);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractType, setExtractType] =
    useState<OrganizedThought["type"]>("note");
  const [featureDescription, setFeatureDescription] = useState<string>("");
  const [featureImpact, setFeatureImpact] = useState<string>("");

  // Export state
  const [exportItems, setExportItems] = useState<ExportItemsState>({
    tasks: [],
    requirements: [],
    features: [],
    improvements: [],
  });

  // Saved journals state
  const [, setSavedJournals] = useState<SavedJournalMetadata[]>([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<JournalSession | null>(
    null
  );

  // File system state
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [currentFileMetadata, setCurrentFileMetadata] =
    useState<JournalFileSystemItem | null>(null);
  const [currentFolderPath, setCurrentFolderPath] = useState<string>("/");
  const [fileExplorerRefreshTrigger, setFileExplorerRefreshTrigger] =
    useState<number>(0);

  // Persistence & autosave state
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [autoFileName, setAutoFileName] = useState<string>("");

  const { isOpen, options, showConfirm, handleConfirm, handleCancel } =
    useConfirm();

  const autosaveTimerRef = useRef<number | undefined>(undefined);
  const preventInitialAutosaveRef = useRef(true);
  const cameFromDashboardRef = useRef<boolean>(false);
  const hasAutoCommittedRef = useRef<boolean>(false);
  const hasCreatedFileRef = useRef<boolean>(false);
  const hasCreatedFileFromDashboardRef = useRef<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamAreaRef = useRef<HTMLDivElement>(null);
  const organizeContainerRef = useRef<HTMLDivElement>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const thoughtsContainerRef = useRef<HTMLDivElement>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const generateDefaultFileName = useCallback(() => {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const projectPrefix = selectedProject
      ? `${selectedProject.name} Journal`
      : "Journal";
    return `${projectPrefix} ${timestamp}`;
  }, [selectedProject]);

  const resolveActiveFileName = useCallback(() => {
    const trimmedAuto = autoFileName.trim();
    if (trimmedAuto.length > 0) {
      return trimmedAuto;
    }
    if (currentFileMetadata?.name) {
      return currentFileMetadata.name;
    }
    const generated = generateDefaultFileName();
    setAutoFileName(generated);
    return generated;
  }, [autoFileName, currentFileMetadata, generateDefaultFileName]);

  const lastSavedDate = useMemo(
    () => (lastSavedAt ? new Date(lastSavedAt) : null),
    [lastSavedAt]
  );

  const autosaveMessage = useMemo(() => {
    if (autosaveStatus === "saving") {
      return "Saving…";
    }
    if (autosaveStatus === "error") {
      return autosaveError ? `Save failed: ${autosaveError}` : "Save failed";
    }
    if (lastSavedDate) {
      return `Saved ${lastSavedDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    return "Auto-save ready";
  }, [autosaveStatus, autosaveError, lastSavedDate]);

  useEffect(() => {
    if (
      currentFileMetadata?.name &&
      currentFileMetadata.name !== autoFileName
    ) {
      setAutoFileName(currentFileMetadata.name);
    } else if (!currentFileMetadata && autoFileName.trim() === "") {
      setAutoFileName(generateDefaultFileName());
    }

    if (currentFileMetadata?.updatedAt) {
      const updatedAtValue = new Date(currentFileMetadata.updatedAt);
      if (!Number.isNaN(updatedAtValue.getTime())) {
        setLastSavedAt(updatedAtValue.getTime());
      }
    }
  }, [autoFileName, currentFileMetadata, generateDefaultFileName]);

  const SelectionQuickActions = ({
    placementClasses,
    context,
  }: {
    placementClasses: string;
    context: "stream" | "organize";
  }) => {
    if (!selectedText || selectionContext !== context) {
      return null;
    }

    return (
      <div
        className={`${placementClasses} z-20 bg-[#867979] rounded-lg p-2 flex gap-2 shadow-lg`}
      >
        <button
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExtractType("action-item");
            setShowExtractModal(true);
          }}
          onMouseDown={(event) => event.preventDefault()}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition"
        >
          Extract as Action
        </button>
        <button
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExtractType("requirement");
            setShowExtractModal(true);
          }}
          onMouseDown={(event) => event.preventDefault()}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition"
        >
          Extract as Requirement
        </button>
        <button
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExtractType("feature");
            setShowExtractModal(true);
          }}
          onMouseDown={(event) => event.preventDefault()}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition"
        >
          Extract as Feature
        </button>
        <button
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const hasExistingFeatures = projectFeatures.length > 0;
            setImprovementMode(hasExistingFeatures ? "existing" : "new");
            setImprovementFeatureId(
              hasExistingFeatures ? projectFeatures[0].id : ""
            );
            setImprovementFeatureName("");
            setImprovementNotes("");
            setExtractType("improvement");
            setShowExtractModal(true);
          }}
          onMouseDown={(event) => event.preventDefault()}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition"
        >
          Extract as Improvement
        </button>
        <button
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedText("");
            setSelectionContext(null);
            setHighlightedSpans([]);
            window.getSelection()?.removeAllRanges();
          }}
          onMouseDown={(event) => event.preventDefault()}
          className="px-2 py-1 text-[#867979] hover:text-white"
        >
          ×
        </button>
      </div>
    );
  };

  // Load projects from database
  useEffect(() => {
    async function loadProjects() {
      try {
        const dbProjects = await getProjects();
        // Transform database projects to match component interface
        const transformed: Project[] = dbProjects
          .filter((p) => p.status === "ACTIVE")
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            status: p.status.toLowerCase() as "active" | "paused" | "archived",
          }));
        setProjects(transformed);
      } catch (e) {
        console.error("Error loading projects:", e);
      }
    }
    loadProjects();
  }, []);

  // Handle query params from dashboard journal showcase - create file with thought or auto-commit
  useEffect(() => {
    // Prevent duplicate processing
    if (
      hasAutoCommittedRef.current ||
      hasCreatedFileRef.current ||
      hasCreatedFileFromDashboardRef.current
    ) {
      return;
    }

    const thoughtParam = searchParams.get("thought");
    const contentKeyParam = searchParams.get("contentKey");
    const projectIdParam = searchParams.get("projectId");
    const createNewParam = searchParams.get("createNew");
    const fromDashboardParam = searchParams.get("fromDashboard");

    let contentToCommit = "";
    let shouldProcess = false;
    const shouldCreateFile =
      createNewParam === "true" || fromDashboardParam === "true";
    let projectIdForFile: string | undefined = undefined; // Store project ID for immediate use

    // Handle new fromDashboard flow (button-based)
    if (fromDashboardParam === "true" && contentKeyParam) {
      // Mark that we came from dashboard
      cameFromDashboardRef.current = true;

      // Retrieve from localStorage - new format uses journal-dashboard- prefix
      const storageKey = `journal-dashboard-${contentKeyParam}`;
      const storedContent = localStorage.getItem(storageKey);
      if (storedContent) {
        contentToCommit = storedContent;
        shouldProcess = true;
        // Get project ID from localStorage before cleanup
        const storedProjectId = localStorage.getItem(`${storageKey}-projectId`);
        // Clean up localStorage after reading
        localStorage.removeItem(storageKey);
        if (storedProjectId) {
          localStorage.removeItem(`${storageKey}-projectId`);
          projectIdForFile = storedProjectId;
          // Update state for UI, but use projectIdForFile for file creation
          if (storedProjectId !== selectedProjectId) {
            setSelectedProjectId(storedProjectId);
          }
        } else if (projectIdParam) {
          // Fallback to URL param if localStorage doesn't have it
          projectIdForFile = projectIdParam;
          if (projectIdParam !== selectedProjectId) {
            setSelectedProjectId(projectIdParam);
          }
        }
      } else {
        console.error("Content not found in localStorage for key:", storageKey);
      }
    } else if (thoughtParam) {
      // Legacy: URL param flow
      cameFromDashboardRef.current = true;

      // Decode thought content
      try {
        contentToCommit = decodeURIComponent(thoughtParam);
        shouldProcess = true;
      } catch (err) {
        console.error("Error decoding thought param:", err);
        // Fallback: try to decode with error recovery
        try {
          contentToCommit = decodeURIComponent(
            thoughtParam.replace(/%[0-9A-F]{0,2}$/i, "")
          );
          shouldProcess = true;
        } catch (fallbackErr) {
          console.error("Error in fallback decode:", fallbackErr);
        }
      }
    } else if (contentKeyParam) {
      // Legacy: sessionStorage flow
      cameFromDashboardRef.current = true;
      const storageKey = `journal-content-${contentKeyParam}`;
      const storedContent = sessionStorage.getItem(storageKey);
      if (storedContent) {
        contentToCommit = storedContent;
        shouldProcess = true;
        // Clean up sessionStorage after reading
        sessionStorage.removeItem(storageKey);
        const storedProjectId = sessionStorage.getItem(
          `${storageKey}-projectId`
        );
        if (storedProjectId) {
          sessionStorage.removeItem(`${storageKey}-projectId`);
          if (storedProjectId !== selectedProjectId) {
            setSelectedProjectId(storedProjectId);
          }
        }
      }
    } else {
      // No thought param - not from dashboard
      cameFromDashboardRef.current = false;
      hasAutoCommittedRef.current = false; // Reset flag when no param
      hasCreatedFileRef.current = false;
      hasCreatedFileFromDashboardRef.current = false;
    }

    if (shouldProcess && contentToCommit.trim()) {
      const trimmedContent = contentToCommit.trim();

      // Calculate word count for metadata
      const words = trimmedContent
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      const wordCount = words.length;
      const lineCount = trimmedContent.split("\n").length;

      if (shouldCreateFile) {
        // Create new file with thought already included
        try {
          hasCreatedFileRef.current = true;
          hasCreatedFileFromDashboardRef.current = true; // Track dashboard-initiated creation
          hasAutoCommittedRef.current = true; // Prevent auto-commit after file creation

          const now = new Date();
          // Use projectIdForFile if set (from dashboard), otherwise fallback to URL param or current state
          const finalProjectId =
            projectIdForFile ||
            projectIdParam ||
            selectedProjectId ||
            undefined;

          // Generate file name - need to get project name if we have a project ID
          let defaultName: string;
          if (finalProjectId) {
            // Find project name from projects list
            const project = projects.find((p) => p.id === finalProjectId);
            const projectName = project?.name || "Project";
            const pad = (value: number) => value.toString().padStart(2, "0");
            const timestamp = `${now.getFullYear()}-${pad(
              now.getMonth() + 1
            )}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(
              now.getMinutes()
            )}`;
            defaultName = `${projectName} Journal ${timestamp}`;
          } else {
            defaultName = generateDefaultFileName();
          }

          // Create thought object
          const newThought: Thought = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: trimmedContent,
          };

          // Create journal session with thought already included
          const newSession: JournalSession = {
            id: Date.now().toString(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            rawThoughts: [trimmedContent], // Thought as line for backward compatibility
            organizedThoughts: [],
            metadata: {
              duration: 0,
              wordCount,
              lineCount,
            },
            projectId: finalProjectId,
            thoughts: [newThought], // Thought as Thought object
            sessionStartTime: now.toISOString(),
          };

          console.log("Creating new journal file with thought:", {
            content: trimmedContent.substring(0, 50) + "...",
            projectId: finalProjectId,
            thoughtId: newThought.id,
            thoughtsInSession:
              (newSession as PersistedJournalSession).thoughts?.length || 0,
          });

          // Save to storage
          const fileId = saveJournalToStorage(
            defaultName,
            newSession,
            currentFolderPath === "/" ? undefined : currentFolderPath,
            finalProjectId
          );

          console.log("File created with ID:", fileId);

          // Load and open the new file immediately
          const newFile = loadJournalFromStorage(fileId);
          if (newFile) {
            // Load the journal directly - set all state to match the file
            const journalWithThoughts = newFile as PersistedJournalSession;

            console.log("Loaded file:", {
              fileId,
              hasThoughts: !!journalWithThoughts.thoughts,
              thoughtsCount: journalWithThoughts.thoughts?.length || 0,
              rawThoughtsCount: journalWithThoughts.rawThoughts?.length || 0,
            });

            // Convert lines to thoughts if loading old format
            const loadedThoughts: Thought[] = journalWithThoughts.thoughts
              ? journalWithThoughts.thoughts
              : (journalWithThoughts.rawThoughts || []).map(
                  (line: string, index: number) => ({
                    id: `thought-${index}-${Date.now()}`,
                    content: line,
                  })
                );

            console.log(
              "Loaded thoughts:",
              loadedThoughts.length,
              loadedThoughts
            );

            // Set all state to match the file
            setThoughts(loadedThoughts);
            setLines(journalWithThoughts.rawThoughts || []);
            setOrganizedThoughts(journalWithThoughts.organizedThoughts || []);
            setCurrentLine("");
            setCurrentThoughtContent("");
            if (journalWithThoughts.sessionStartTime) {
              setSessionStartTime(
                new Date(journalWithThoughts.sessionStartTime)
              );
            }
            setCurrentFileId(fileId);
            const metadata = getItemMetadata(fileId);
            setCurrentFileMetadata(metadata);
            if (metadata?.name) {
              setAutoFileName(metadata.name);
            }
            if (metadata?.updatedAt) {
              const updatedAtValue = new Date(metadata.updatedAt);
              if (!Number.isNaN(updatedAtValue.getTime())) {
                setLastSavedAt(updatedAtValue.getTime());
              }
            } else {
              setLastSavedAt(null);
            }

            // Trigger file explorer refresh
            setFileExplorerRefreshTrigger((prev) => prev + 1);

            preventInitialAutosaveRef.current = true;
            setAutosaveStatus("idle");
            setAutosaveError(null);
            setViewMode("stream");

            // Scroll to show thoughts after file is loaded
            const scrollTimer = setTimeout(() => {
              requestAnimationFrame(() => {
                if (thoughtsContainerRef.current && loadedThoughts.length > 0) {
                  // Scroll to bottom to show the thoughts
                  thoughtsContainerRef.current.scrollTop =
                    thoughtsContainerRef.current.scrollHeight;
                }
                // Focus textarea after scrolling
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              });
            }, 500);

            return () => clearTimeout(scrollTimer);
          } else {
            // Fallback: if file loading fails, just auto-commit
            console.error(
              "Failed to load created file, falling back to auto-commit"
            );
            hasCreatedFileRef.current = false;
            hasCreatedFileFromDashboardRef.current = false;
            // Continue to auto-commit fallback below
          }
        } catch (error) {
          console.error("Error creating new file with thought:", error);
          // Fallback: if file creation fails, just auto-commit
          hasCreatedFileRef.current = false;
          hasCreatedFileFromDashboardRef.current = false;
          // Continue to auto-commit fallback below
        }
      }

      // If we didn't create a file (or creation failed), auto-commit to current state
      if (!hasCreatedFileRef.current) {
        // Mark that we've auto-committed to prevent duplicates
        hasAutoCommittedRef.current = true;

        // Auto-commit the content as a thought (same logic as Shift+Enter)
        const newThought: Thought = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content: trimmedContent,
        };

        // Add new thought to the end so it appears at bottom (near input)
        setThoughts((prev) => [...prev, newThought]);
        // Mark as new for animation
        setNewThoughtIds(() => new Set([newThought.id]));
        // Keep textarea empty so user can continue typing
        setCurrentThoughtContent("");
        // Also update lines for backward compatibility
        setLines((prev) => [...prev, trimmedContent]);

        // Auto-scroll thoughts container to bottom when new thought is added
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
          // Clear animation flag after animation completes
          setTimeout(() => {
            setNewThoughtIds((prev) => {
              const next = new Set(prev);
              next.delete(newThought.id);
              return next;
            });
          }, 500);
        });

        // Focus textarea after a delay so user can continue typing
        const focusTimer = setTimeout(() => {
          requestAnimationFrame(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          });
        }, 300);

        return () => clearTimeout(focusTimer);
      }
    }

    if (projectIdParam && projectIdParam !== selectedProjectId) {
      setSelectedProjectId(projectIdParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams,
    generateDefaultFileName,
    currentFolderPath,
    selectedProjectId,
  ]);

  // Load saved journals list
  useEffect(() => {
    setSavedJournals(listSavedJournals());
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectFeatures([]);
      return;
    }

    let isCancelled = false;

    const loadProjectFeatures = async () => {
      try {
        setFeaturesLoading(true);
        const features = await getFeatures(selectedProjectId);
        if (!isCancelled) {
          const normalizedFeatures = features.map((feature) => ({
            ...feature,
            actionItems: parseFeatureActionItems(
              (feature.actionItems as FeatureActionItems | null) ?? []
            ),
          }));
          setProjectFeatures(normalizedFeatures);
        }
      } catch (error) {
        console.error("Error loading project features:", error);
        if (!isCancelled) {
          setProjectFeatures([]);
        }
      } finally {
        if (!isCancelled) {
          setFeaturesLoading(false);
        }
      }
    };

    loadProjectFeatures();

    return () => {
      isCancelled = true;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!showExtractModal || extractType !== "improvement") {
      return;
    }

    if (projectFeatures.length === 0) {
      setImprovementMode("new");
      setImprovementFeatureId("");
      return;
    }

    if (
      improvementMode === "existing" &&
      improvementFeatureId &&
      projectFeatures.some((feature) => feature.id === improvementFeatureId)
    ) {
      return;
    }

    setImprovementMode("existing");
    setImprovementFeatureId(projectFeatures[0].id);
  }, [
    extractType,
    improvementFeatureId,
    improvementMode,
    projectFeatures,
    showExtractModal,
  ]);

  // Migrate flat structure to file system on first load
  useEffect(() => {
    migrateFlatStructureToFileSystem();
  }, []);

  // Load current file metadata when currentFileId changes
  useEffect(() => {
    if (currentFileId) {
      const metadata = getItemMetadata(currentFileId);
      setCurrentFileMetadata(metadata);
      if (metadata && metadata.path) {
        const pathParts = metadata.path.split("/");
        pathParts.pop();
        setCurrentFolderPath(pathParts.join("/") || "/");
      }
    } else {
      setCurrentFileMetadata(null);
    }
  }, [currentFileId]);

  // Load saved journal session
  useEffect(() => {
    // Don't load from localStorage if we just created a file from dashboard
    // The file loading logic already handles setting the thoughts
    if (hasCreatedFileFromDashboardRef.current || currentFileId) {
      return;
    }

    const saved = localStorage.getItem(
      `journal-session-${selectedProjectId || "home"}`
    );
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Load thoughts if available, otherwise convert lines to thoughts
        if (parsed.thoughts && Array.isArray(parsed.thoughts)) {
          setThoughts(parsed.thoughts);
        } else if (parsed.rawThoughts && Array.isArray(parsed.rawThoughts)) {
          // Convert old format (lines) to thoughts
          const convertedThoughts: Thought[] = parsed.rawThoughts.map(
            (line: string, index: number) => ({
              id: `thought-${index}-${Date.now()}`,
              content: line,
            })
          );
          setThoughts(convertedThoughts);
        }
        setLines(parsed.rawThoughts || []);
        setOrganizedThoughts(parsed.organizedThoughts || []);
        setCurrentLine(parsed.currentLine || "");
        setCurrentThoughtContent(parsed.currentLine || "");
        if (parsed.sessionStartTime) {
          setSessionStartTime(new Date(parsed.sessionStartTime));
        }
      } catch (e) {
        console.error("Error loading journal session:", e);
      }
    }
  }, [selectedProjectId, currentFileId]);

  // Auto-save
  useEffect(() => {
    const data = {
      thoughts, // Save thoughts
      rawThoughts: lines, // Keep for backward compatibility
      organizedThoughts,
      currentLine,
      currentThoughtContent, // Save current thought content
      sessionStartTime: sessionStartTime.toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(
      `journal-session-${selectedProjectId || "home"}`,
      JSON.stringify(data)
    );
  }, [
    thoughts,
    lines,
    organizedThoughts,
    currentLine,
    currentThoughtContent,
    selectedProjectId,
    sessionStartTime,
  ]);

  // Calculate word count
  useEffect(() => {
    const allThoughtsText = thoughts.map((t) => t.content).join(" ");
    const allText = [allThoughtsText, currentThoughtContent].join(" ");
    const words = allText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    setWordCount(words.length);
  }, [thoughts, currentThoughtContent]);

  // Update session duration timer every second - commented out per user request
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     const now = new Date();
  //     const diff = now.getTime() - sessionStartTime.getTime();
  //     const minutes = Math.floor(diff / 60000);
  //     const seconds = Math.floor((diff % 60000) / 1000);
  //     setSessionDuration(`${minutes}:${seconds.toString().padStart(2, "0")}`);
  //   }, 1000); // Update every second

  //   return () => clearInterval(interval);
  // }, [sessionStartTime]);

  // Keep focus on input
  useEffect(() => {
    if (isFocused && inputRef.current && viewMode === "stream") {
      inputRef.current.focus();
    }
  }, [isFocused, lines, viewMode]);

  // No auto-scroll - user stays in place, new thoughts appear at top

  // Handle text selection in stream view - works with both thoughts and current input
  useEffect(() => {
    if (viewMode === "stream" && streamAreaRef.current) {
      const handleSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          return;
        }

        const selectedTextContent = selection.toString().trim();

        if (selectedTextContent.length > 0) {
          setSelectedText(selectedTextContent);
          setSelectionContext("stream");

          const container = streamAreaRef.current;
          if (!container) return;

          const range = selection.getRangeAt(0);
          const startContainer = range.startContainer;

          // Check if selection is in a thought block
          const thoughtDivs = Array.from(
            container.querySelectorAll("div[data-thought-id]")
          );
          for (const thoughtDiv of thoughtDivs) {
            const thoughtElement = thoughtDiv as HTMLElement;
            const thoughtId = thoughtElement.getAttribute("data-thought-id");
            // Check if the selection is within this thought (but not in the drag handle)
            const thoughtContent = thoughtElement.querySelector(".select-text");
            if (
              thoughtContent &&
              thoughtId &&
              (thoughtContent.contains(startContainer) ||
                thoughtContent === startContainer)
            ) {
              // Selection is in a thought - track highlight and allow extraction
              const thought = thoughts.find((t) => t.id === thoughtId);
              if (thought) {
                const thoughtText = thought.content;
                // Find the position of selected text in the thought
                const textIndex = thoughtText.indexOf(selectedTextContent);
                if (textIndex !== -1) {
                  const highlightId = `thought-highlight-${Date.now()}-${Math.random()}`;
                  // Clear ALL previous highlights and only keep the latest one
                  setHighlightedThoughts([
                    {
                      thoughtId,
                      start: textIndex,
                      end: textIndex + selectedTextContent.length,
                      id: highlightId,
                    },
                  ]);
                }
              }
              return;
            }
          }

          // Check if selection is in current thought input (textarea)
          const textarea = container.querySelector("textarea");
          if (
            textarea &&
            (textarea.contains(startContainer) || textarea === startContainer)
          ) {
            // Selection is in current thought input - allow extraction
            return;
          }

          // Legacy: Check for line-based selection (for backward compatibility)
          const lineDivs = Array.from(
            container.querySelectorAll("div[data-line-index]")
          );
          for (const lineDiv of lineDivs) {
            const lineElement = lineDiv as HTMLElement;
            if (
              lineElement.contains(startContainer) ||
              lineElement === startContainer.parentElement
            ) {
              const lineIndex = parseInt(
                lineElement.getAttribute("data-line-index") || "-1"
              );
              if (lineIndex >= 0 && lineIndex < lines.length) {
                const lineText = lines[lineIndex];
                const textIndex = lineText.indexOf(selectedTextContent);
                if (textIndex !== -1) {
                  const highlightId = `highlight-${Date.now()}-${Math.random()}`;
                  setHighlightedSpans((prev) => {
                    const filtered = prev.filter(
                      (h) => h.lineIndex !== lineIndex
                    );
                    return [
                      ...filtered,
                      {
                        lineIndex,
                        start: textIndex,
                        end: textIndex + selectedTextContent.length,
                        id: highlightId,
                      },
                    ];
                  });
                }
              }
              break;
            }
          }
        } else {
          // Clear selection if empty
          if (!selection.toString().trim()) {
            setSelectedText("");
            setSelectionContext(null);
          }
        }
      };

      const element = streamAreaRef.current;
      element.addEventListener("mouseup", handleSelection);
      element.addEventListener("keyup", handleSelection);

      return () => {
        element.removeEventListener("mouseup", handleSelection);
        element.removeEventListener("keyup", handleSelection);
      };
    }
  }, [viewMode, lines, thoughts]);

  useEffect(() => {
    if (viewMode !== "organize" || !organizeContainerRef.current) {
      return;
    }

    const container = organizeContainerRef.current;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;
      const endNode = range.endContainer;

      if (!container.contains(startNode) || !container.contains(endNode)) {
        return;
      }

      const selected = selection.toString().trim();
      if (selected) {
        setSelectedText(selected);
        setSelectionContext("organize");
      } else {
        setSelectedText("");
        setSelectionContext(null);
      }
    };

    container.addEventListener("mouseup", handleSelection);
    container.addEventListener("keyup", handleSelection);

    return () => {
      container.removeEventListener("mouseup", handleSelection);
      container.removeEventListener("keyup", handleSelection);
    };
  }, [viewMode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift+Enter: Commit thought and create new one
        e.preventDefault();
        if (currentThoughtContent.trim()) {
          // Clear the "came from dashboard" flag once user commits a thought
          // This allows file creation after first commit
          cameFromDashboardRef.current = false;
          // Reset auto-commit flag to allow future auto-commits
          hasAutoCommittedRef.current = false;
          // Reset file creation flags
          hasCreatedFileRef.current = false;
          hasCreatedFileFromDashboardRef.current = false;

          const newThought: Thought = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: currentThoughtContent.trim(),
          };
          // Add new thought to the end so it appears at bottom (near input)
          setThoughts([...thoughts, newThought]);
          // Mark as new for animation
          setNewThoughtIds(() => new Set([newThought.id]));
          setCurrentThoughtContent("");
          // Also update lines for backward compatibility
          setLines([...lines, currentThoughtContent.trim()]);

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
            // Clear animation flag after animation completes
            setTimeout(() => {
              setNewThoughtIds((prev) => {
                const next = new Set(prev);
                next.delete(newThought.id);
                return next;
              });
            }, 500);
          });
        }
      }
      // Regular Enter: Just adds newline (default behavior, no preventDefault)
      // This allows text wrapping within the current thought
    } else if (e.key === "Escape") {
      if (viewMode === "stream") {
        router.push("/dashboard");
      } else {
        setViewMode("stream");
      }
    }
  };

  // Handle thought editing
  const handleEditThought = (thoughtId: string) => {
    const thought = thoughts.find((t) => t.id === thoughtId);
    if (thought) {
      setEditingThoughtId(thoughtId);
      setEditingThoughtText(thought.content);
      // Focus the textarea after a brief delay to ensure it's rendered
      setTimeout(() => {
        if (editingTextareaRef.current) {
          editingTextareaRef.current.focus();
          // Position cursor at end
          editingTextareaRef.current.setSelectionRange(
            editingTextareaRef.current.value.length,
            editingTextareaRef.current.value.length
          );
        }
      }, 0);
    }
  };

  const handleSaveEditedThought = (thoughtId: string) => {
    setThoughts(
      thoughts.map((t) =>
        t.id === thoughtId ? { ...t, content: editingThoughtText.trim() } : t
      )
    );
    setEditingThoughtId(null);
    setEditingThoughtText("");
  };

  const handleDeleteThought = (thoughtId: string) => {
    setThoughts(thoughts.filter((t) => t.id !== thoughtId));
  };

  const handleDragStart = (thoughtId: string) => {
    setDraggedThoughtId(thoughtId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetThoughtId: string) => {
    e.preventDefault();
    if (!draggedThoughtId || draggedThoughtId === targetThoughtId) {
      setDraggedThoughtId(null);
      return;
    }

    const draggedIndex = thoughts.findIndex((t) => t.id === draggedThoughtId);
    const targetIndex = thoughts.findIndex((t) => t.id === targetThoughtId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedThoughtId(null);
      return;
    }

    const newThoughts = [...thoughts];
    const [moved] = newThoughts.splice(draggedIndex, 1);
    newThoughts.splice(targetIndex, 0, moved);
    setThoughts(newThoughts);
    setDraggedThoughtId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentThoughtContent(e.target.value);
    // Keep currentLine for backward compatibility
    setCurrentLine(e.target.value);
  };

  const handlePaste = () => {
    // Allow default paste behavior - textarea will handle it automatically
    // Don't prevent default or stop propagation - let the browser handle paste normally
    // This handler is here to ensure paste events work correctly
  };

  // Helper function to render line with highlights
  // Helper function to render thought content with highlights
  const renderThoughtWithHighlights = (thoughtId: string, content: string) => {
    const thoughtHighlights = highlightedThoughts.filter(
      (h) => h.thoughtId === thoughtId
    );

    if (thoughtHighlights.length === 0) {
      return <>{content}</>;
    }

    // Sort highlights by start position
    const sortedHighlights = [...thoughtHighlights].sort(
      (a, b) => a.start - b.start
    );

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        parts.push(content.substring(lastIndex, highlight.start));
      }

      // Add highlighted text
      parts.push(
        <mark
          key={highlight.id}
          className="bg-yellow-500/30 text-yellow-200 rounded px-1"
        >
          {content.substring(highlight.start, highlight.end)}
        </mark>
      );

      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  const extractThought = (text: string, type: OrganizedThought["type"]) => {
    const newThought: OrganizedThought = {
      id: Date.now().toString() + Math.random(),
      originalText: text,
      type,
      selected: false,
      priority: type === "action-item" ? "medium" : undefined,
      // For features, use description and impact fields
      expanded:
        type === "feature"
          ? featureDescription
          : type === "improvement"
          ? improvementNotes || undefined
          : undefined,
      category: type === "feature" ? featureImpact : undefined,
      relatedFeatureId:
        type === "improvement" && improvementMode === "existing"
          ? improvementFeatureId || undefined
          : undefined,
      relatedFeatureName:
        type === "improvement" && improvementMode === "new"
          ? improvementFeatureName.trim() || undefined
          : undefined,
      improvementMode: type === "improvement" ? improvementMode : undefined,
    };
    setOrganizedThoughts([...organizedThoughts, newThought]);
    setSelectedText("");
    setSelectionContext(null);
    setFeatureDescription("");
    setFeatureImpact("");
    setImprovementFeatureName("");
    setImprovementNotes("");
    setImprovementMode(projectFeatures.length > 0 ? "existing" : "new");
    setImprovementFeatureId(
      projectFeatures.length > 0 ? projectFeatures[0].id : ""
    );
    // Keep highlights visible - don't clear them
    // Only clear selection
    window.getSelection()?.removeAllRanges();
    setShowExtractModal(false);
    // Note: We keep highlightedThoughts visible for better UX
  };

  const updateOrganizedThought = (
    id: string,
    updates: Partial<OrganizedThought>
  ) => {
    setOrganizedThoughts(
      organizedThoughts.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteOrganizedThought = (id: string) => {
    setOrganizedThoughts(organizedThoughts.filter((t) => t.id !== id));
  };

  const prepareExport = () => {
    const tasks = organizedThoughts
      .filter((t) => t.type === "action-item")
      .map((t) => ({
        text: t.originalText,
        priority: t.priority || "medium",
      }));

    const requirements = organizedThoughts
      .filter((t) => t.type === "requirement")
      .map((t) => t.originalText + (t.expanded ? `\n${t.expanded}` : ""));

    const features = organizedThoughts
      .filter((t) => t.type === "feature")
      .map((t) => ({
        name: t.originalText,
        description: t.expanded || "",
        impact: t.category || "",
      }));

    const improvements = organizedThoughts
      .filter((t) => t.type === "improvement")
      .map((t) => ({
        text: t.originalText,
        relatedFeatureId: t.relatedFeatureId,
        relatedFeatureName: t.relatedFeatureName,
        notes: t.expanded || "",
      }));

    setExportItems({ tasks, requirements, features, improvements });
    setViewMode("export");
  };

  const exportToProject = async () => {
    if (!selectedProjectId) return;

    try {
      // Create tasks in database
      if (exportItems.tasks.length > 0) {
        await Promise.all(
          exportItems.tasks.map((task) =>
            createTask({
              title: task.text,
              description: undefined,
              status: "TODO",
              priority: task.priority.toUpperCase() as
                | "LOW"
                | "MEDIUM"
                | "HIGH",
              projectId: selectedProjectId,
            })
          )
        );
      }

      // Store requirements as thoughts
      if (exportItems.requirements.length > 0) {
        await Promise.all(
          exportItems.requirements.map((requirement) =>
            createThought({
              text: requirement,
              projectId: selectedProjectId,
            })
          )
        );
      }

      const existingFeatures = await getFeatures(selectedProjectId);
      const existingFeatureMap = new Map(
        existingFeatures.map((feature) => [feature.id, feature])
      );
      let currentPriority = existingFeatures.length;

      const improvementsForExisting = exportItems.improvements.filter(
        (improvement) => improvement.relatedFeatureId
      );
      const improvementsForNew = exportItems.improvements.filter(
        (improvement) => !improvement.relatedFeatureId
      );

      const improvementsByNewFeature = improvementsForNew.reduce<
        Map<string, { name: string; items: ExportImprovement[] }>
      >((accumulator, improvement) => {
        const displayName =
          (improvement.relatedFeatureName || improvement.text).trim() ||
          `Improvement Feature ${accumulator.size + 1}`;
        const key = displayName.toLowerCase();
        const existingGroup = accumulator.get(key);

        if (existingGroup) {
          existingGroup.items.push(improvement);
        } else {
          accumulator.set(key, {
            name: displayName,
            items: [improvement],
          });
        }

        return accumulator;
      }, new Map());

      const formatImprovementTodo = (
        improvement: ExportImprovement
      ): FeatureTodoItem => {
        const improvementText = improvement.text.trim();
        const notes = (improvement.notes || "").trim();
        const combinedText = notes
          ? `${improvementText} — ${notes}`
          : improvementText;
        return createFeatureTodo(combinedText);
      };

      if (exportItems.features.length > 0) {
        await Promise.all(
          exportItems.features.map(async (feature, index) => {
            const key = feature.name.trim().toLowerCase();
            const improvementGroup = improvementsByNewFeature.get(key);
            const actionItems =
              improvementGroup?.items.map((improvement) =>
                formatImprovementTodo(improvement)
              ) || [];

            if (improvementGroup) {
              improvementsByNewFeature.delete(key);
            }

            await createFeature({
              name: feature.name,
              description: feature.description,
              impact: feature.impact,
              status: "IDEA",
              priority: currentPriority + index,
              projectId: selectedProjectId,
              actionItems,
            });
          })
        );
        currentPriority += exportItems.features.length;
      }

      if (improvementsByNewFeature.size > 0) {
        await Promise.all(
          Array.from(improvementsByNewFeature.values()).map(
            async ({ name, items }) => {
              const todos = items.map((improvement) =>
                formatImprovementTodo(improvement)
              );
              const primaryImprovement = items[0];
              await createFeature({
                name,
                description:
                  primaryImprovement.notes ||
                  `Improvement captured: ${primaryImprovement.text}`,
                impact: "Improvement captured via journal",
                status: "IDEA",
                priority: currentPriority++,
                projectId: selectedProjectId,
                actionItems: todos,
              });
            }
          )
        );
      }

      if (improvementsForExisting.length > 0) {
        const groupedImprovements = improvementsForExisting.reduce<
          Map<string, ExportImprovement[]>
        >((accumulator, improvement) => {
          if (!improvement.relatedFeatureId) {
            return accumulator;
          }
          const existingGroup = accumulator.get(improvement.relatedFeatureId);
          if (existingGroup) {
            existingGroup.push(improvement);
          } else {
            accumulator.set(improvement.relatedFeatureId, [improvement]);
          }
          return accumulator;
        }, new Map());

        await Promise.all(
          Array.from(groupedImprovements.entries()).map(
            async ([featureId, improvements]) => {
              const feature = existingFeatureMap.get(featureId);
              if (!feature) {
                return;
              }

              const currentActionItems = parseFeatureActionItems(
                (feature.actionItems as FeatureActionItems | null) ?? []
              );
              const appendedTodos = improvements.map((improvement) =>
                formatImprovementTodo(improvement)
              );

              await updateFeature(featureId, {
                actionItems: [...currentActionItems, ...appendedTodos],
              });
            }
          )
        );
      }

      // Clear journal session
      localStorage.removeItem(`journal-session-${selectedProjectId || "home"}`);
      setThoughts([]);
      setLines([]);
      setOrganizedThoughts([]);
      setCurrentLine("");
      setCurrentThoughtContent("");

      router.push(`/dashboard`);
    } catch (e) {
      console.error("Error exporting to project:", e);
      alert("Failed to export to project. Please try again.");
    }
  };

  const canExtractImprovement =
    extractType !== "improvement"
      ? true
      : improvementMode === "existing"
      ? Boolean(improvementFeatureId)
      : improvementFeatureName.trim().length > 0;

  const handleLoadJournal = (id: string, asTemplate: boolean = false) => {
    const journal = loadJournalFromStorage(id);
    if (!journal) return;

    const journalWithThoughts = journal as PersistedJournalSession;

    // Convert lines to thoughts if loading old format
    const loadedThoughts: Thought[] = journalWithThoughts.thoughts
      ? journalWithThoughts.thoughts
      : (journal.rawThoughts || []).map((line: string, index: number) => ({
          id: `thought-${index}-${Date.now()}`,
          content: line,
        }));

    const applyJournalState = () => {
      setThoughts(loadedThoughts);
      setLines(journal.rawThoughts || []);
      setOrganizedThoughts(journal.organizedThoughts || []);
      setCurrentLine(journal.currentLine || "");
      setCurrentThoughtContent(journal.currentLine || "");
    };

    if (asTemplate) {
      applyJournalState();
      setSessionStartTime(new Date());
      setCurrentFileId(null);
      setCurrentFileMetadata(null);
      setCurrentFolderPath("/");
      setAutoFileName(generateDefaultFileName());
      setLastSavedAt(null);
    } else {
      applyJournalState();
      if (journal.sessionStartTime) {
        setSessionStartTime(new Date(journal.sessionStartTime));
      }
      setCurrentFileId(id);
      const metadata = getItemMetadata(id);
      setCurrentFileMetadata(metadata);
      if (metadata?.name) {
        setAutoFileName(metadata.name);
      }
      if (metadata?.updatedAt) {
        const updatedAtValue = new Date(metadata.updatedAt);
        if (!Number.isNaN(updatedAtValue.getTime())) {
          setLastSavedAt(updatedAtValue.getTime());
        }
      } else {
        setLastSavedAt(null);
      }
    }

    preventInitialAutosaveRef.current = true;
    setAutosaveStatus("idle");
    setAutosaveError(null);
    setViewMode("stream");
  };

  const handleOpenFile = (file: JournalFile) => {
    handleLoadJournal(file.id, false);
  };

  const handleExportJournal = () => {
    try {
      const sessionData: JournalSession = {
        id: Date.now().toString(),
        projectId: selectedProjectId || undefined,
        createdAt: sessionStartTime.toISOString(),
        updatedAt: new Date().toISOString(),
        rawThoughts: lines,
        organizedThoughts,
        metadata: {
          duration: new Date().getTime() - sessionStartTime.getTime(),
          wordCount,
          lineCount: lines.length,
        },
        currentLine,
        sessionStartTime: sessionStartTime.toISOString(),
      };

      const json = exportJournalToJSON(sessionData);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to export journal";
      alert(`Export failed: ${errorMessage}`);
      console.error("Export error:", error);
    }
  };

  const handleImportJournal = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".json")) {
      alert("Please select a valid JSON file.");
      event.target.value = "";
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("File is too large. Maximum size is 10MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      alert("Failed to read file. Please try again.");
      event.target.value = "";
    };
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.trim()) {
          alert("File is empty or could not be read.");
          event.target.value = "";
          return;
        }

        const journal = importJournalFromJSON(text);
        if (journal) {
          setPendingImport(journal);
          setShowImportConfirm(true);
        } else {
          alert(
            "Failed to import journal. The file format is invalid or corrupted. Please check the console for details."
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        alert(`Import failed: ${errorMessage}`);
        console.error("Import error:", error);
      } finally {
        event.target.value = ""; // Reset input
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!pendingImport) return;

    const confirmed = await showConfirm({
      title: "Import File",
      message:
        "This will overwrite your current journal session. Are you sure you want to continue?",
      confirmText: "Import",
      cancelText: "Cancel",
    });

    if (confirmed) {
      setLines(pendingImport.rawThoughts || []);
      setOrganizedThoughts(pendingImport.organizedThoughts || []);
      setCurrentLine(pendingImport.currentLine || "");
      if (pendingImport.sessionStartTime) {
        setSessionStartTime(new Date(pendingImport.sessionStartTime));
      } else {
        setSessionStartTime(new Date());
      }
      setViewMode("stream");
    }

    setShowImportConfirm(false);
    setPendingImport(null);
  };

  const persistSession = useCallback(
    (reason: "manual" | "auto" = "auto") => {
      const resolvedName = resolveActiveFileName();
      const trimmedName = resolvedName.trim();

      const trimmedCurrent = currentThoughtContent.trim();
      const thoughtsAsLines = thoughts.map((thought) => thought.content);
      const allLines = [...thoughtsAsLines, trimmedCurrent].filter(Boolean);
      const hasMeaningfulContent =
        allLines.length > 0 || organizedThoughts.length > 0;

      // Don't auto-create files if we came from dashboard and have no committed thoughts yet
      // This allows user to continue typing without creating a file until they commit a thought
      if (
        cameFromDashboardRef.current &&
        thoughts.length === 0 &&
        !currentFileId &&
        reason === "auto"
      ) {
        setAutosaveStatus("idle");
        return;
      }

      if (!hasMeaningfulContent && !currentFileId && reason === "auto") {
        setAutosaveStatus("idle");
        return;
      }

      const sessionId = currentFileId ?? Date.now().toString();
      const existingFile = currentFileId
        ? (loadJournalFromStorage(
            currentFileId
          ) as PersistedJournalSession | null)
        : null;

      const sessionData: PersistedJournalSession = {
        id: sessionId,
        projectId: selectedProjectId || undefined,
        createdAt:
          existingFile?.createdAt ||
          (currentFileMetadata as JournalFile)?.createdAt ||
          sessionStartTime.toISOString(),
        updatedAt: new Date().toISOString(),
        rawThoughts: allLines,
        organizedThoughts,
        metadata: {
          duration: new Date().getTime() - sessionStartTime.getTime(),
          wordCount,
          lineCount: allLines.length,
        },
        currentLine: currentThoughtContent,
        sessionStartTime:
          existingFile?.sessionStartTime || sessionStartTime.toISOString(),
        thoughts,
      };

      try {
        setAutosaveStatus("saving");
        const savedId = saveJournalToStorage(
          trimmedName,
          sessionData,
          currentFolderPath,
          selectedProjectId || undefined
        );
        setCurrentFileId(savedId);
        setSavedJournals(listSavedJournals());
        const updatedMetadata = getItemMetadata(savedId);
        setCurrentFileMetadata(updatedMetadata);
        setAutosaveStatus("saved");
        setAutosaveError(null);
        setLastSavedAt(Date.now());
      } catch (error) {
        console.error("Failed to persist journal session:", error);
        setAutosaveStatus("error");
        setAutosaveError(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    },
    [
      currentFileId,
      currentFileMetadata,
      currentFolderPath,
      currentThoughtContent,
      organizedThoughts,
      resolveActiveFileName,
      selectedProjectId,
      sessionStartTime,
      thoughts,
      wordCount,
    ]
  );

  const handleManualSave = useCallback(() => {
    persistSession("manual");
  }, [persistSession]);

  const handleCreateNewJournal = useCallback(() => {
    try {
      const now = new Date();
      const defaultName = generateDefaultFileName();

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

      // Save to storage - use the ID returned to ensure consistency
      const fileId = saveJournalToStorage(
        defaultName,
        newSession,
        currentFolderPath === "/" ? undefined : currentFolderPath,
        selectedProjectId || undefined
      );

      // Update the session ID to match what was saved
      newSession.id = fileId;

      // Load and open the new file
      const newFile = loadJournalFromStorage(fileId);
      if (newFile) {
        // Convert to JournalFile format for handleOpenFile
        const journalFile: JournalFile = {
          ...newFile,
          type: "file",
          path: newFile.path || currentFolderPath,
        } as JournalFile;

        // Trigger file explorer refresh
        setFileExplorerRefreshTrigger((prev) => prev + 1);

        handleOpenFile(journalFile);
      } else {
        // Fallback: just clear state if file creation fails
        setThoughts([]);
        setNewThoughtIds(new Set());
        setLines([]);
        setOrganizedThoughts([]);
        setCurrentLine("");
        setCurrentThoughtContent("");
        setEditingThoughtId(null);
        setEditingThoughtText("");
        setHighlightedSpans([]);
        setHighlightedThoughts([]);
        setSelectedText("");
        setSelectionContext(null);
        setShowExtractModal(false);
        setSessionStartTime(new Date());
        setCurrentFileId(null);
        setCurrentFileMetadata(null);
        setAutoFileName(defaultName);
        setLastSavedAt(null);
        setAutosaveStatus("idle");
        setAutosaveError(null);
        preventInitialAutosaveRef.current = true;
      }
    } catch (error) {
      console.error("Error creating new journal file:", error);
      // Fallback to old behavior on error
      setThoughts([]);
      setNewThoughtIds(new Set());
      setLines([]);
      setOrganizedThoughts([]);
      setCurrentLine("");
      setCurrentThoughtContent("");
      setEditingThoughtId(null);
      setEditingThoughtText("");
      setHighlightedSpans([]);
      setHighlightedThoughts([]);
      setSelectedText("");
      setSelectionContext(null);
      setShowExtractModal(false);
      setSessionStartTime(new Date());
      setCurrentFileId(null);
      setCurrentFileMetadata(null);
      setCurrentFolderPath("/");
      setAutoFileName(generateDefaultFileName());
      setLastSavedAt(null);
      setAutosaveStatus("idle");
      setAutosaveError(null);
      preventInitialAutosaveRef.current = true;
      localStorage.removeItem(`journal-session-${selectedProjectId || "home"}`);
    }
  }, [
    generateDefaultFileName,
    selectedProjectId,
    currentFolderPath,
    handleOpenFile,
    setHighlightedSpans,
    setHighlightedThoughts,
  ]);

  useEffect(() => {
    if (preventInitialAutosaveRef.current) {
      preventInitialAutosaveRef.current = false;
      return;
    }

    if (autosaveTimerRef.current !== undefined) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      persistSession("auto");
    }, 1500);

    return () => {
      if (autosaveTimerRef.current !== undefined) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    persistSession,
    thoughts,
    currentThoughtContent,
    organizedThoughts,
    selectedProjectId,
    currentFolderPath,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        persistSession("manual");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [persistSession]);

  const thoughtCount = thoughts.length + (currentThoughtContent.trim() ? 1 : 0);

  return (
    <div className="h-screen overflow-hidden bg-[#171717] text-[#D0CCCC] flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 max-w-sm border-r border-[#867979]/30 bg-[#151111] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#867979]/30">
            <h2 className="text-sm font-semibold text-white">
              {selectedProject ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard?projectId=${selectedProject.id}`)
                  }
                  className="text-left w-full hover:text-white/80 transition"
                >
                  {selectedProject.name}
                </button>
              ) : (
                "Personal Workspace"
              )}
            </h2>
            <p className="text-xs text-[#867979] mt-1">
              Manage files without breaking your flow.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={handleManualSave}
                className="w-full px-3 py-2 border border-[#867979]/50 rounded-lg text-sm text-[#D0CCCC] hover:bg-[#867979]/10 transition"
              >
                Save Now · Ctrl+S
              </button>
            </div>
          </div>
          <JournalFileExplorer
            currentPath={currentFolderPath}
            onPathChange={setCurrentFolderPath}
            onOpenFile={handleOpenFile}
            onRename={(id, name, type) => {
              renameItem(id, name, type);
              setSavedJournals(listSavedJournals());
              if (id === currentFileId) {
                const metadata = getItemMetadata(id);
                setCurrentFileMetadata(metadata);
              }
            }}
            onDelete={async (id, type) => {
              try {
                if (id === currentFileId) {
                  handleCreateNewJournal();
                }

                // Wrap deleteItem in Promise for async handling
                await new Promise<void>((resolve, reject) => {
                  try {
                    deleteItem(id, type);
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                });

                setSavedJournals(listSavedJournals());
                // Update refresh trigger to ensure file explorer updates
                setFileExplorerRefreshTrigger((prev) => prev + 1);
              } catch (error) {
                console.error("Delete failed:", error);
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";
                alert(
                  `Failed to delete ${type}: ${errorMessage}. Please try again.`
                );
                // Refresh to restore state
                setSavedJournals(listSavedJournals());
                setFileExplorerRefreshTrigger((prev) => prev + 1);
                throw error; // Re-throw to let optimistic UI handle it
              }
            }}
            onCreateFile={handleCreateNewJournal}
            onExportCurrent={handleExportJournal}
            onImportCurrent={handleImportJournal}
            selectedProjectFilter={selectedProjectId}
            projects={projects}
            currentFileId={currentFileId}
            autosaveStatus={autosaveStatus}
            lastSavedAt={lastSavedDate}
            variant="compact"
            className="flex-1 overflow-hidden px-3 pb-3"
            refreshTrigger={fileExplorerRefreshTrigger}
          />
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-[#867979]/30 px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-[#D0CCCC] hover:text-white transition"
              >
                ← Back to Dashboard
              </button>
              <div className="h-6 w-px bg-[#867979]/30" />
              <select
                value={selectedProjectId || ""}
                onChange={(event) =>
                  setSelectedProjectId(event.target.value || null)
                }
                className="bg-[#171717] border border-[#867979]/30 rounded-lg px-4 py-2 text-[#D0CCCC] focus:outline-none focus:border-[#867979]"
              >
                <option value="">Home</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {currentFileMetadata && (
                <div className="flex items-center gap-2 text-xs text-[#867979]">
                  <span className="text-sm text-[#D0CCCC]">
                    {currentFileMetadata.name}
                  </span>
                  {currentFileMetadata.path && (
                    <span>{currentFileMetadata.path}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <div className="text-sm text-[#867979]">
                {wordCount} words · {thoughtCount} thoughts
              </div>
              <div
                className={`text-xs ${
                  autosaveStatus === "error" ? "text-red-400" : "text-[#867979]"
                }`}
              >
                {autosaveMessage}
              </div>
              <div className="flex items-center gap-2">
                {(["stream", "organize", "export"] as ViewMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        if (mode === "export") {
                          prepareExport();
                        } else {
                          setViewMode(mode);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg transition ${
                        viewMode === mode
                          ? "bg-[#867979] text-white"
                          : "text-[#D0CCCC] hover:bg-[#867979]/20"
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Stream of Consciousness View */}
            {viewMode === "stream" && (
              <div className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
                <SelectionQuickActions
                  placementClasses="absolute top-4 left-1/2 transform -translate-x-1/2"
                  context="stream"
                />

                <div
                  ref={containerRef}
                  className="flex-1 px-8 py-12 flex flex-col overflow-hidden min-h-0"
                  onClick={(e) => {
                    // Only set focus if clicking on the container itself, not on child elements
                    // This prevents interference with textarea clicks
                    if (e.target === e.currentTarget) {
                      setIsFocused(true);
                    }
                  }}
                >
                  <div
                    ref={streamAreaRef}
                    className="max-w-4xl mx-auto w-full flex flex-col h-full min-h-0"
                  >
                    {/* Scrollable Thoughts Container - Scrolls internally when content overflows */}
                    <div
                      ref={thoughtsContainerRef}
                      className="flex-1 flex flex-col overflow-y-auto min-h-0 pr-2"
                      style={{
                        scrollBehavior: "smooth",
                      }}
                    >
                      {/* Spacer to push content to bottom when there are few thoughts - only show when < 10 thoughts */}
                      {thoughts.length < 10 && (
                        <div className="flex-1 min-h-[100px]" />
                      )}

                      <div className="space-y-3">
                        {/* Committed Thoughts (Editable Blocks) - Newest at bottom */}
                        {thoughts.map((thought) => (
                          <div
                            key={thought.id}
                            data-thought-id={thought.id}
                            onDragOver={(e) => {
                              // Only handle drag over if not in edit mode
                              if (editingThoughtId !== thought.id) {
                                handleDragOver(e);
                              }
                            }}
                            onDrop={(e) => {
                              // Only handle drop if not in edit mode
                              if (editingThoughtId !== thought.id) {
                                handleDrop(e, thought.id);
                              }
                            }}
                            className={`group relative p-4 bg-[#867979]/10 border border-[#867979]/30 rounded-lg hover:bg-[#867979]/20 transition-all duration-300 overflow-hidden ${
                              draggedThoughtId === thought.id
                                ? "opacity-50"
                                : ""
                            } ${
                              newThoughtIds.has(thought.id)
                                ? "thought-enter-animation"
                                : ""
                            }`}
                          >
                            {editingThoughtId === thought.id ? (
                              <div
                                className="space-y-2"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <textarea
                                  ref={editingTextareaRef}
                                  value={editingThoughtText}
                                  onChange={(e) =>
                                    setEditingThoughtText(e.target.value)
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Ensure textarea gets focus
                                    if (editingTextareaRef.current) {
                                      editingTextareaRef.current.focus();
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    // Allow normal text selection and cursor positioning
                                  }}
                                  onFocus={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === "Enter" && e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEditedThought(thought.id);
                                    } else if (e.key === "Escape") {
                                      setEditingThoughtId(null);
                                      setEditingThoughtText("");
                                    }
                                  }}
                                  className="w-full bg-[#171717] border border-[#867979] rounded p-2 text-[#D0CCCC] font-mono text-lg leading-relaxed resize-none focus:outline-none focus:border-[#867979]"
                                  rows={Math.max(
                                    3,
                                    editingThoughtText.split("\n").length
                                  )}
                                  autoFocus
                                />
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-[#867979]">
                                    Shift+Enter to save
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleSaveEditedThought(thought.id)
                                    }
                                    className="px-3 py-1 text-xs bg-[#867979] hover:bg-[#756868] rounded text-white transition"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start gap-2">
                                  {/* Drag handle - only this area is draggable */}
                                  <div
                                    draggable
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      handleDragStart(thought.id);
                                    }}
                                    className={`shrink-0 pt-1 text-[#867979] ${
                                      draggedThoughtId === thought.id
                                        ? "cursor-grabbing"
                                        : "cursor-grab"
                                    } hover:text-[#D0CCCC] transition-colors`}
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
                                  {/* Thought content - double click to edit, normal text selection */}
                                  <div
                                    onDoubleClick={() =>
                                      handleEditThought(thought.id)
                                    }
                                    className="flex-1 text-[#D0CCCC] text-lg font-mono leading-relaxed whitespace-pre-wrap select-text"
                                    style={{
                                      userSelect: "text",
                                      cursor: "text",
                                      wordBreak: "break-word",
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {renderThoughtWithHighlights(
                                      thought.id,
                                      thought.content
                                    )}
                                  </div>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditThought(thought.id);
                                    }}
                                    className="p-1 text-xs bg-[#867979]/30 hover:bg-[#867979]/50 rounded-full text-[#D0CCCC]"
                                    title="Edit"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteThought(thought.id);
                                    }}
                                    className="p-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded-full text-red-400"
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

                      {/* Active Thought Input (Current typing area) - Inside scrollable container at bottom */}
                      <div className="relative pt-4 shrink-0">
                        <textarea
                          ref={inputRef}
                          value={currentThoughtContent}
                          onChange={handleChange}
                          onKeyDown={handleKeyDown}
                          onPaste={handlePaste}
                          onBlur={() => setIsFocused(false)}
                          onFocus={() => setIsFocused(true)}
                          className="bg-transparent text-[#D0CCCC] text-lg font-mono leading-relaxed w-full outline-none border-none focus:outline-none resize-none min-h-[60px]"
                          placeholder={
                            thoughts.length === 0 &&
                            currentThoughtContent === ""
                              ? "Start typing your thoughts... Press Shift+Enter to commit a thought"
                              : ""
                          }
                          rows={Math.max(
                            3,
                            currentThoughtContent.split("\n").length + 1
                          )}
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom hint */}
                <div className="px-8 py-4 border-t border-[#867979]/30 text-sm text-[#867979] text-center">
                  Enter to wrap text · Shift+Enter to commit thought · Select
                  text to extract
                </div>
              </div>
            )}

            {/* Organize View */}
            {viewMode === "organize" && (
              <div className="relative flex-1 flex overflow-hidden">
                <SelectionQuickActions
                  placementClasses="absolute top-4 left-1/2 transform -translate-x-1/2"
                  context="organize"
                />
                {/* Left: Original stream */}
                <div
                  ref={organizeContainerRef}
                  className="w-1/2 border-r border-[#867979]/30 overflow-y-auto p-6"
                >
                  <h2 className="text-xl font-semibold mb-4 text-white">
                    Original Thoughts
                  </h2>
                  <div className="space-y-2 font-mono text-sm">
                    {lines.map((line, index) => (
                      <div
                        key={index}
                        className="p-3 bg-[#867979]/10 rounded-lg border border-[#867979]/20"
                      >
                        {line}
                      </div>
                    ))}
                    {lines.length === 0 && (
                      <div className="text-[#867979] text-center py-12">
                        No thoughts yet. Start writing in Stream mode.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Organized thoughts */}
                <div className="w-1/2 overflow-y-auto p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">
                      Organized Thoughts
                    </h2>
                    <button
                      onClick={() => {
                        const allText = lines.join(" ");
                        if (allText.trim()) {
                          extractThought(allText, "note");
                        }
                      }}
                      className="px-3 py-1 bg-[#867979] hover:bg-[#756868] rounded text-sm transition"
                    >
                      Extract All as Note
                    </button>
                  </div>

                  <div className="space-y-3">
                    {organizedThoughts.map((thought) => (
                      <div
                        key={thought.id}
                        className="p-4 bg-[#867979]/10 rounded-lg border border-[#867979]/20 overflow-hidden"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                thought.type === "action-item"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : thought.type === "requirement"
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : thought.type === "feature"
                                  ? "bg-green-500/20 text-green-300"
                                  : thought.type === "improvement"
                                  ? "bg-orange-500/20 text-orange-300"
                                  : thought.type === "question"
                                  ? "bg-purple-500/20 text-purple-300"
                                  : thought.type === "idea"
                                  ? "bg-pink-500/20 text-pink-300"
                                  : "bg-[#867979]/20 text-[#D0CCCC]"
                              }`}
                            >
                              {thought.type.replace("-", " ")}
                            </span>
                            {thought.priority && (
                              <span className="px-2 py-1 rounded text-xs bg-[#867979]/20">
                                {thought.priority}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => deleteOrganizedThought(thought.id)}
                            className="text-[#867979] hover:text-white transition"
                          >
                            ×
                          </button>
                        </div>
                        <p
                          className="text-[#D0CCCC] mb-2 whitespace-pre-wrap"
                          style={{
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {thought.originalText}
                        </p>
                        {thought.type === "improvement" && (
                          <div className="text-xs text-[#867979] mt-1">
                            {thought.relatedFeatureId
                              ? `Linked to feature: ${
                                  projectFeatures.find(
                                    (feature) =>
                                      feature.id === thought.relatedFeatureId
                                  )?.name || "Unknown feature"
                                }`
                              : `Creates new feature: ${
                                  thought.relatedFeatureName ||
                                  "Unnamed feature"
                                }`}
                          </div>
                        )}
                        {thought.expanded && (
                          <p
                            className="text-sm text-[#867979] mt-2 whitespace-pre-wrap"
                            style={{
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {thought.type === "improvement"
                              ? `Notes: ${thought.expanded}`
                              : thought.expanded}
                          </p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <select
                            value={thought.type}
                            onChange={(e) =>
                              updateOrganizedThought(thought.id, {
                                type: e.target
                                  .value as OrganizedThought["type"],
                              })
                            }
                            className="bg-[#171717] border border-[#867979]/30 rounded px-2 py-1 text-xs text-[#D0CCCC]"
                          >
                            <option value="action-item">Action Item</option>
                            <option value="requirement">Requirement</option>
                            <option value="feature">Feature</option>
                            <option value="improvement">Improvement</option>
                            <option value="question">Question</option>
                            <option value="idea">Idea</option>
                            <option value="note">Note</option>
                          </select>
                          {thought.type === "action-item" && (
                            <select
                              value={thought.priority || "medium"}
                              onChange={(e) =>
                                updateOrganizedThought(thought.id, {
                                  priority: e.target.value as
                                    | "low"
                                    | "medium"
                                    | "high",
                                })
                              }
                              className="bg-[#171717] border border-[#867979]/30 rounded px-2 py-1 text-xs text-[#D0CCCC]"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          )}
                          <button
                            onClick={() => {
                              const expanded = prompt(
                                "Add more details:",
                                thought.expanded || ""
                              );
                              if (expanded !== null) {
                                updateOrganizedThought(thought.id, {
                                  expanded,
                                });
                              }
                            }}
                            className="px-2 py-1 bg-[#867979]/20 hover:bg-[#867979]/30 rounded text-xs transition"
                          >
                            Expand
                          </button>
                        </div>
                      </div>
                    ))}
                    {organizedThoughts.length === 0 && (
                      <div className="text-[#867979] text-center py-12">
                        No organized thoughts yet. Select text in Stream mode or
                        extract thoughts here.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Export View */}
            {viewMode === "export" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-semibold mb-6 text-white">
                    Export to Project
                  </h2>

                  {!selectedProjectId && (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
                      <p className="text-yellow-300">
                        Please select a project to export to.
                      </p>
                    </div>
                  )}

                  {/* Tasks */}
                  {exportItems.tasks.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-3 text-white">
                        Tasks ({exportItems.tasks.length})
                      </h3>
                      <div className="space-y-2">
                        {exportItems.tasks.map((task, index) => (
                          <div
                            key={index}
                            className="p-3 bg-[#867979]/10 rounded-lg border border-[#867979]/20"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[#D0CCCC]">
                                {task.text}
                              </span>
                              <span className="px-2 py-1 bg-[#867979]/20 rounded text-xs">
                                {task.priority}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  {exportItems.requirements.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-3 text-white">
                        Requirements ({exportItems.requirements.length})
                      </h3>
                      <div className="space-y-2">
                        {exportItems.requirements.map((req, index) => (
                          <div
                            key={index}
                            className="p-3 bg-[#867979]/10 rounded-lg border border-[#867979]/20"
                          >
                            <pre className="text-[#D0CCCC] text-sm whitespace-pre-wrap font-mono">
                              {req}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  {exportItems.features.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-3 text-white">
                        Features ({exportItems.features.length})
                      </h3>
                      <div className="space-y-3">
                        {exportItems.features.map((feature, index) => (
                          <div
                            key={index}
                            className="p-4 bg-[#867979]/10 rounded-lg border border-[#867979]/20"
                          >
                            <h4 className="font-semibold text-white mb-2">
                              {feature.name}
                            </h4>
                            {feature.description && (
                              <p className="text-[#D0CCCC] text-sm mb-2">
                                {feature.description}
                              </p>
                            )}
                            {feature.impact && (
                              <p className="text-[#867979] text-sm">
                                Impact: {feature.impact}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvements */}
                  {exportItems.improvements.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-3 text-white">
                        Improvements ({exportItems.improvements.length})
                      </h3>
                      <div className="space-y-3">
                        {exportItems.improvements.map((improvement, index) => {
                          const linkedFeatureName = improvement.relatedFeatureId
                            ? projectFeatures.find(
                                (feature) =>
                                  feature.id === improvement.relatedFeatureId
                              )?.name
                            : improvement.relatedFeatureName;

                          return (
                            <div
                              key={`${improvement.text}-${index}`}
                              className="p-4 bg-[#867979]/10 rounded-lg border border-[#867979]/20"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-white">
                                  {improvement.text}
                                </span>
                                <span className="px-2 py-1 bg-[#867979]/20 text-xs rounded text-[#D0CCCC]">
                                  {improvement.relatedFeatureId
                                    ? `Existing: ${
                                        linkedFeatureName || "Feature"
                                      }`
                                    : `New Feature`}
                                </span>
                              </div>
                              {improvement.notes && (
                                <p className="text-sm text-[#867979] whitespace-pre-wrap mt-1">
                                  Notes: {improvement.notes}
                                </p>
                              )}
                              {!improvement.relatedFeatureId &&
                                improvement.relatedFeatureName && (
                                  <p className="text-xs text-[#867979] mt-2">
                                    Feature name:{" "}
                                    {improvement.relatedFeatureName}
                                  </p>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {exportItems.tasks.length === 0 &&
                    exportItems.requirements.length === 0 &&
                    exportItems.features.length === 0 && (
                      <div className="text-center py-12 text-[#867979]">
                        No items to export. Organize your thoughts first.
                      </div>
                    )}

                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={() => setViewMode("organize")}
                      className="px-6 py-3 border border-[#867979] rounded-lg hover:bg-[#867979]/20 transition"
                    >
                      Back to Organize
                    </button>
                    <button
                      onClick={exportToProject}
                      disabled={!selectedProjectId}
                      className="px-6 py-3 bg-[#867979] hover:bg-[#756868] rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export to {selectedProject?.name || "Project"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Import Confirmation Modal */}
          {showImportConfirm && pendingImport && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-[#171717] border border-[#867979] rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4 text-white">
                  Import File
                </h3>
                <p className="text-[#D0CCCC] mb-4">
                  This will overwrite your current file session. Are you sure
                  you want to continue?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={confirmImport}
                    className="flex-1 px-4 py-2 bg-[#867979] hover:bg-[#756868] rounded transition"
                  >
                    Import
                  </button>
                  <button
                    onClick={() => {
                      setShowImportConfirm(false);
                      setPendingImport(null);
                    }}
                    className="flex-1 px-4 py-2 border border-[#867979] rounded hover:bg-[#867979]/20 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Extract Modal */}
          {showExtractModal && selectedText && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-[#171717] border border-[#867979] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-semibold mb-4 text-white">
                  Extract as {extractType.replace("-", " ")}
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#D0CCCC] mb-2">
                    {extractType === "feature"
                      ? "Feature Name"
                      : extractType === "requirement"
                      ? "Requirement"
                      : extractType === "action-item"
                      ? "Action Item"
                      : "Text"}
                  </label>
                  <p className="text-[#D0CCCC] p-3 bg-[#867979]/10 rounded">
                    {selectedText}
                  </p>
                </div>

                {extractType === "feature" && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[#D0CCCC] mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        value={featureDescription}
                        onChange={(e) => setFeatureDescription(e.target.value)}
                        placeholder="Add more details about this feature..."
                        rows={3}
                        className="w-full px-4 py-3 bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] focus:outline-none focus:border-[#867979] resize-none"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[#D0CCCC] mb-2">
                        Impact (optional)
                      </label>
                      <textarea
                        value={featureImpact}
                        onChange={(e) => setFeatureImpact(e.target.value)}
                        placeholder="How does this create impact?"
                        rows={2}
                        className="w-full px-4 py-3 bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] focus:outline-none focus:border-[#867979] resize-none"
                      />
                    </div>
                  </>
                )}

                {extractType === "improvement" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#D0CCCC] mb-2">
                        Link to Feature
                      </label>
                      <select
                        value={
                          improvementMode === "new"
                            ? "__new"
                            : improvementFeatureId || "__new"
                        }
                        onChange={(event) => {
                          if (event.target.value === "__new") {
                            setImprovementMode("new");
                            setImprovementFeatureId("");
                          } else {
                            setImprovementMode("existing");
                            setImprovementFeatureId(event.target.value);
                          }
                        }}
                        className="w-full px-4 py-3 bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] focus:outline-none focus:border-[#867979]"
                      >
                        <option value="__new">Create new feature</option>
                        {projectFeatures.map((feature) => (
                          <option key={feature.id} value={feature.id}>
                            {feature.name}
                          </option>
                        ))}
                      </select>
                      {featuresLoading && (
                        <p className="text-xs text-[#867979] mt-2">
                          Loading features…
                        </p>
                      )}
                    </div>

                    {improvementMode === "new" && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[#D0CCCC] mb-2">
                            New Feature Name
                          </label>
                          <input
                            type="text"
                            value={improvementFeatureName}
                            onChange={(event) =>
                              setImprovementFeatureName(event.target.value)
                            }
                            placeholder="Name for the new feature..."
                            className="w-full px-4 py-3 bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] focus:outline-none focus:border-[#867979]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#D0CCCC] mb-2">
                            Improvement Details
                          </label>
                          <textarea
                            value={improvementNotes}
                            onChange={(event) =>
                              setImprovementNotes(event.target.value)
                            }
                            placeholder="Add context for this improvement..."
                            rows={3}
                            className="w-full px-4 py-3 bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] focus:outline-none focus:border-[#867979] resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {improvementMode === "existing" && (
                      <div>
                        <label className="block text-sm font-medium text-[#D0CCCC] mb-2">
                          Improvement Notes (optional)
                        </label>
                        <textarea
                          value={improvementNotes}
                          onChange={(event) =>
                            setImprovementNotes(event.target.value)
                          }
                          placeholder="Add context or acceptance criteria for this improvement..."
                          rows={3}
                          className="w-full px-4 py-3 bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] focus:outline-none focus:border-[#867979] resize-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => extractThought(selectedText, extractType)}
                    disabled={!canExtractImprovement}
                    className="flex-1 px-4 py-2 bg-[#867979] hover:bg-[#756868] rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Extract
                  </button>
                  <button
                    onClick={() => {
                      setShowExtractModal(false);
                      setSelectedText("");
                      setSelectionContext(null);
                      setFeatureDescription("");
                      setFeatureImpact("");
                      setImprovementFeatureName("");
                      setImprovementNotes("");
                      setImprovementMode(
                        projectFeatures.length > 0 ? "existing" : "new"
                      );
                      setImprovementFeatureId(
                        projectFeatures.length > 0 ? projectFeatures[0].id : ""
                      );
                    }}
                    className="flex-1 px-4 py-2 border border-[#867979] rounded hover:bg-[#867979]/20 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Theme Modal */}
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
      </div>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#171717] flex items-center justify-center">
          <div className="text-[#D0CCCC]">Loading...</div>
        </div>
      }
    >
      <JournalPageContent />
    </Suspense>
  );
}
