"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type JournalFileSystemItem,
  type JournalFolder,
  type JournalFile,
  getFileSystemTree,
  getItemsByPath,
  createFolder,
  moveItem,
} from "@/lib/journalStorage";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "archived";
}
import JournalFileItem from "./JournalFileItem";

interface JournalFileExplorerProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  onOpenFile: (file: JournalFile) => void;
  onRename: (id: string, newName: string, type: "file" | "folder") => void;
  onDelete: (id: string, type: "file" | "folder") => Promise<void>;
  onCreateFile: () => void;
  onExportCurrent?: () => void;
  onImportCurrent?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  selectedProjectFilter: string | null;
  projects: Project[];
  currentFileId?: string | null;
  autosaveStatus?: "idle" | "saving" | "saved" | "error";
  lastSavedAt?: Date | null;
  variant?: "compact" | "full";
  className?: string;
  refreshTrigger?: number;
}

type SortOption = "name-asc" | "name-desc" | "date-newest" | "date-oldest" | "type";
type FilterOption = "all" | "folders" | "files";

export default function JournalFileExplorer({
  currentPath,
  onPathChange,
  onOpenFile,
  onRename,
  onDelete,
  onCreateFile,
  onExportCurrent,
  onImportCurrent,
  selectedProjectFilter,
  projects,
  currentFileId,
  autosaveStatus = "idle",
  lastSavedAt = null,
  variant = "full",
  className = "",
  refreshTrigger,
}: JournalFileExplorerProps) {
  const [items, setItems] = useState<JournalFileSystemItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["/"])
  );
  const [draggedItem, setDraggedItem] = useState<JournalFileSystemItem | null>(
    null
  );
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Optimistic UI: Track items being deleted
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  const isCompact = variant === "compact";
  const lastSavedLabel = lastSavedAt
    ? lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const loadItems = useCallback(() => {
    const projectFilter =
      selectedProjectFilter === "all" || !selectedProjectFilter
        ? undefined
        : selectedProjectFilter;
    const pathItems = getItemsByPath(currentPath, projectFilter);
    setItems(pathItems);
  }, [currentPath, selectedProjectFilter]);

  // Load items when path or filter changes
  // This is necessary to sync UI with file system state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadItems();
  }, [loadItems, refreshTrigger]);

  const handleOpen = (item: JournalFileSystemItem) => {
    if (item.type === "folder") {
      const folder = item as JournalFolder;
      const newPath = folder.path;
      onPathChange(newPath);
      setExpandedFolders((prev) => new Set([...prev, newPath]));
    } else {
      onOpenFile(item as JournalFile);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: JournalFileSystemItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverPath(null);
  };

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverPath(path);
  };

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    // Prevent dropping on itself or into its own children
    if (draggedItem.type === "folder") {
      const folder = draggedItem as JournalFolder;
      if (
        targetPath === folder.path ||
        targetPath.startsWith(folder.path + "/")
      ) {
        setDragOverPath(null);
        return;
      }
    }

    moveItem(draggedItem.id, targetPath, draggedItem.type);
    loadItems();
    setDragOverPath(null);
    setDraggedItem(null);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      alert("Please enter a folder name");
      return;
    }

    try {
      const projectId =
        selectedProjectFilter &&
        selectedProjectFilter !== "all"
          ? selectedProjectFilter
          : undefined;

      createFolder(newFolderName.trim(), currentPath, projectId);
      setNewFolderName("");
      setShowCreateFolderModal(false);

      // Refresh the items list
      loadItems();
      setTimeout(() => loadItems(), 50);
    } catch (error) {
      alert(
        `Failed to create folder: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const getBreadcrumbs = () => {
    if (currentPath === "/") return ["/"];
    return currentPath.split("/").filter(Boolean);
  };

  const navigateToPath = (pathParts: string[]) => {
    if (
      pathParts.length === 0 ||
      (pathParts.length === 1 && pathParts[0] === "/")
    ) {
      onPathChange("/");
    } else {
      onPathChange("/" + pathParts.join("/"));
    }
  };

  // Filter items (exclude items being deleted for optimistic UI)
  const filteredItems = items.filter((item) => {
    // Optimistic UI: Hide items being deleted
    if (deletingItems.has(item.id)) return false;
    
    // Type filter
    if (filter === "folders" && item.type !== "folder") return false;
    if (filter === "files" && item.type !== "file") return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.name?.toLowerCase().includes(query) ?? false;
    }
    
    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return (a.name || "").localeCompare(b.name || "");
      case "name-desc":
        return (b.name || "").localeCompare(a.name || "");
      case "date-newest":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "date-oldest":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "type":
        if (a.type === b.type) return (a.name || "").localeCompare(b.name || "");
        return a.type === "folder" ? -1 : 1;
      default:
        return 0;
    }
  });

  const folders = sortedItems.filter((i) => i.type === "folder") as JournalFolder[];
  const files = sortedItems.filter((i) => i.type === "file") as JournalFile[];

  // Selection handlers
  const handleSelectItem = (itemId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    } else if (event.shiftKey && selectedItems.size > 0) {
      // Range select with Shift
      const currentIndex = sortedItems.findIndex((item) => item.id === itemId);
      const lastSelectedId = Array.from(selectedItems)[selectedItems.size - 1];
      const lastIndex = sortedItems.findIndex((item) => item.id === lastSelectedId);
      
      const start = Math.min(currentIndex, lastIndex);
      const end = Math.max(currentIndex, lastIndex);
      
      const newSet = new Set(selectedItems);
      for (let i = start; i <= end; i++) {
        newSet.add(sortedItems[i].id);
      }
      setSelectedItems(newSet);
    } else {
      // Single select
      setSelectedItems(new Set([itemId]));
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === sortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedItems.map((item) => item.id)));
    }
  };

  // Optimistic delete handler
  const handleOptimisticDelete = useCallback(async (id: string, type: "file" | "folder") => {
    // Add to deleting set immediately (optimistic UI)
    setDeletingItems((prev) => new Set([...prev, id]));
    
    // Also remove from selection if selected
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    try {
      // Call the actual delete handler (now async)
      await onDelete(id, type);
      
      // Force a fresh reload of items to ensure UI is in sync
      // Use setTimeout to ensure deletion has completed in localStorage
      setTimeout(() => {
        loadItems();
        // Remove from deleting set after refresh
        setDeletingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 50);
    } catch (error) {
      // On error, revert optimistic update
      setDeletingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      console.error("Delete failed:", error);
      // Reload items to restore state
      loadItems();
      throw error;
    }
  }, [onDelete, loadItems]);

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    const itemsToDelete = Array.from(selectedItems)
      .map((id) => {
        const item = items.find((i) => i.id === id);
        return item ? { id, name: item.name, type: item.type } : null;
      })
      .filter((item): item is { id: string; name: string; type: "file" | "folder" } => item !== null);
    
    if (itemsToDelete.length === 0) return;
    
    // Use confirmation modal instead of window.confirm
    const itemNames = itemsToDelete.slice(0, 3).map((item) => item.name).join(", ");
    const moreCount = itemsToDelete.length > 3 ? itemsToDelete.length - 3 : 0;
    const message = itemsToDelete.length === 1
      ? `Are you sure you want to delete "${itemsToDelete[0].name}"? This action cannot be undone.`
      : `Are you sure you want to delete ${itemsToDelete.length} item(s)?\n\n${itemNames}${moreCount > 0 ? ` and ${moreCount} more` : ""}\n\nThis action cannot be undone.`;
    
    const confirmed = window.confirm(message);
    
    if (!confirmed) return;
    
    // Optimistically remove all items
    setDeletingItems((prev) => {
      const newSet = new Set(prev);
      itemsToDelete.forEach((item) => newSet.add(item.id));
      return newSet;
    });
    
    try {
      // Delete all items (await all deletions)
      await Promise.all(
        itemsToDelete.map((item) => onDelete(item.id, item.type))
      );
      
      setSelectedItems(new Set());
      
      // Force a fresh reload after all deletions complete
      // Use setTimeout to ensure all deletions have completed in localStorage
      setTimeout(() => {
        loadItems();
        // Clear deleting state after refresh
        setDeletingItems(new Set());
      }, 50);
    } catch (error) {
      // Revert on error
      setDeletingItems(new Set());
      loadItems();
      console.error("Bulk delete failed:", error);
      alert("Failed to delete some items. Please try again.");
    }
  };

  const handleBulkMove = async (targetPath: string) => {
    if (selectedItems.size === 0) return;
    
    selectedItems.forEach((itemId) => {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        moveItem(itemId, targetPath, item.type);
      }
    });
    
    setSelectedItems(new Set());
    loadItems();
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const autosaveMessage =
    autosaveStatus === "saving"
      ? "Saving…"
      : autosaveStatus === "error"
      ? "Save failed"
      : lastSavedLabel
      ? `Saved ${lastSavedLabel}`
      : "Autosave ready";

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#867979]/20 flex-shrink-0">
        <button
          onClick={() => onPathChange("/")}
          className="text-[#867979] hover:text-[#D0CCCC] transition text-sm"
        >
          Home
        </button>
        {getBreadcrumbs().map((part, index) => {
          if (part === "/") return null;
          const pathParts = getBreadcrumbs().slice(0, index + 1);
          return (
            <span key={index} className="flex items-center gap-2">
              <span className="text-[#867979]">/</span>
              <button
                onClick={() => navigateToPath(pathParts)}
                className="text-[#867979] hover:text-[#D0CCCC] transition text-sm"
              >
                {part}
              </button>
            </span>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className={`${isCompact ? "space-y-2 mb-3" : "space-y-3 mb-4"} flex-shrink-0`}>
        {/* Top toolbar */}
        <div
          className={`flex ${
            isCompact ? "flex-col gap-3" : "items-center justify-between"
          }`}
        >
          <div
            className={`flex ${
              isCompact
                ? "flex-wrap gap-2"
                : "items-center gap-2"
            }`}
          >
            <button
              onClick={onCreateFile}
              className={`px-4 py-2 bg-[#867979] hover:bg-[#756868] rounded-lg text-white transition ${
                isCompact ? "text-xs" : "text-sm"
              }`}
            >
              New File
            </button>
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className={`px-4 py-2 bg-[#867979]/20 hover:bg-[#867979]/15 border border-[#867979]/20 rounded-lg text-[#D0CCCC] transition ${
                isCompact ? "text-xs" : "text-sm"
              }`}
            >
              New Folder
            </button>
            {selectedItems.size > 0 && (
              <>
                <button
                  onClick={handleBulkDelete}
                  className={`px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition ${
                    isCompact ? "text-xs" : "text-sm"
                  }`}
                >
                  Delete ({selectedItems.size})
                </button>
                <button
                  onClick={clearSelection}
                  className={`px-4 py-2 border border-[#867979] hover:bg-[#867979]/10 rounded-lg text-[#D0CCCC] transition ${
                    isCompact ? "text-xs" : "text-sm"
                  }`}
                >
                  Clear Selection
                </button>
              </>
            )}
          </div>

          <div
            className={`flex items-center ${
              isCompact ? "gap-2 flex-wrap" : "gap-3"
            }`}
          >
            {(onExportCurrent || onImportCurrent) && (
              <div className="flex items-center gap-2 border border-[#867979]/20 rounded-lg overflow-hidden">
                {onExportCurrent && (
                  <button
                    onClick={onExportCurrent}
                    className={`px-3 py-2 hover:bg-[#867979]/10 text-[#D0CCCC] transition ${
                      isCompact ? "text-xs" : "text-sm"
                    }`}
                    title="Export current journal as JSON"
                  >
                    Export
                  </button>
                )}
                {onImportCurrent && (
                  <>
                    <div className="h-6 w-px bg-[#867979]/20" />
                    <label className="cursor-pointer">
                      <span
                        className={`px-3 py-2 hover:bg-[#867979]/10 text-[#D0CCCC] transition block ${
                          isCompact ? "text-xs" : "text-sm"
                        }`}
                        title="Import journal from JSON file"
                      >
                        Import
                      </span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={onImportCurrent}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
              </div>
            )}
            <div
              className={`${
                autosaveStatus === "error" ? "text-red-400" : "text-[#867979]"
              } ${isCompact ? "text-xs" : "text-sm"}`}
            >
              {autosaveMessage}
            </div>
          </div>
        </div>

        {selectedItems.size > 0 && (
          <div
            className={`${
              isCompact ? "text-xs" : "text-sm"
            } text-[#867979]`}
          >
            {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
          </div>
        )}

        {/* Filters and Search */}
        <div
          className={`flex flex-wrap gap-3 ${
            isCompact ? "" : "items-center"
          }`}
        >
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files and folders..."
            className={`flex-1 min-w-[180px] bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] placeholder-[#867979] focus:outline-none focus:border-[#867979] ${
              isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
            }`}
          />

          {/* Type Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterOption)}
            className={`bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] focus:outline-none focus:border-[#867979] ${
              isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
            }`}
          >
            <option value="all">All</option>
            <option value="folders">Folders</option>
            <option value="files">Files</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={`bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] focus:outline-none focus:border-[#867979] ${
              isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
            }`}
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="date-newest">Date (Newest)</option>
            <option value="date-oldest">Date (Oldest)</option>
            <option value="type">Type</option>
          </select>

          {/* Select All */}
          <button
            onClick={handleSelectAll}
            className={`border border-[#867979] hover:bg-[#867979]/10 rounded-lg text-[#D0CCCC] transition ${
              isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
            }`}
          >
            {selectedItems.size === sortedItems.length ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {items.length === 0 ? (
          <div className="text-center py-12 text-[#867979]">
            <p>This folder is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Folders */}
            {folders.map((folder) => {
              const project = projects.find((p) => p.id === folder.projectId);
              return (
                <div
                  key={folder.id}
                  onDragOver={(e) => handleDragOver(e, folder.path)}
                  onDrop={(e) => handleDrop(e, folder.path)}
                  className={`rounded-md transition ${
                    dragOverPath === folder.path ? "ring-1 ring-[#867979]" : ""
                  }`}
                >
                  <JournalFileItem
                    item={folder}
                    isSelected={selectedItems.has(folder.id)}
                    isCurrentFile={false}
                    onOpen={handleOpen}
                    onSelect={(e) => handleSelectItem(folder.id, e)}
                    onRename={(id, name, type) => {
                      onRename(id, name, type);
                      loadItems();
                    }}
                    onDelete={handleOptimisticDelete}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    projectName={project?.name}
                    density={isCompact ? "compact" : "default"}
                  />
                </div>
              );
            })}

            {/* Files */}
            {files.map((file) => {
              const project = projects.find((p) => p.id === file.projectId);
              return (
                <JournalFileItem
                  key={file.id}
                  item={file}
                  isSelected={selectedItems.has(file.id)}
                  isCurrentFile={currentFileId === file.id}
                  onOpen={handleOpen}
                  onSelect={(e) => handleSelectItem(file.id, e)}
                  onRename={(id, name, type) => {
                    onRename(id, name, type);
                    loadItems();
                  }}
                  onDelete={handleOptimisticDelete}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  projectName={project?.name}
                  density={isCompact ? "compact" : "default"}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#171717] border border-[#867979]/30 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4 text-[#D0CCCC]">
              Create Folder
            </h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="w-full px-4 py-3 bg-[#171717] border border-[#867979] rounded-lg text-[#D0CCCC] focus:outline-none focus:border-[#867979] mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (newFolderName.trim()) {
                    handleCreateFolder();
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setShowCreateFolderModal(false);
                  setNewFolderName("");
                }
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateFolder();
                }}
                disabled={!newFolderName.trim()}
                className="flex-1 px-4 py-2 bg-[#867979] hover:bg-[#756868] text-[#D0CCCC] rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowCreateFolderModal(false);
                  setNewFolderName("");
                }}
                className="flex-1 px-4 py-2 border border-[#867979] text-[#D0CCCC] rounded hover:bg-[#867979]/10 transition"
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
