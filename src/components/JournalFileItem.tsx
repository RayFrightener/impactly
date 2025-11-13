"use client";

import { useState, useRef, useEffect } from "react";
import {
  type JournalFileSystemItem,
  type JournalFile,
  type JournalFolder,
  countFolderChildren,
} from "@/lib/journalStorage";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmationModal from "@/components/ConfirmationModal";

interface JournalFileItemProps {
  item: JournalFileSystemItem;
  isSelected?: boolean;
  isCurrentFile?: boolean;
  onOpen: (item: JournalFileSystemItem) => void;
  onSelect?: (e: React.MouseEvent) => void;
  onRename: (id: string, newName: string, type: "file" | "folder") => void;
  onDelete: (id: string, type: "file" | "folder") => Promise<void>;
  onDragStart: (e: React.DragEvent, item: JournalFileSystemItem) => void;
  onDragEnd: () => void;
  projectName?: string;
  density?: "default" | "compact";
}

export default function JournalFileItem({
  item,
  isSelected = false,
  isCurrentFile = false,
  onOpen,
  onSelect,
  onRename,
  onDelete,
  onDragStart,
  onDragEnd,
  projectName,
  density = "default",
}: JournalFileItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOpen, options, showConfirm, handleConfirm, handleCancel } =
    useConfirm();
  const clickTimeoutRef = useRef<number | null>(null);

  // Update editName when item.name changes (but not when editing)
  // This is necessary to sync edit state with item props when not editing
  useEffect(() => {
    if (!isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditName((prev) => (prev !== item.name ? item.name : prev));
    }
  }, [item.name, isEditing]);

  const isFolder = item.type === "folder";
  const file = !isFolder ? (item as JournalFile) : null;
  const isCompact = density === "compact";
  const basePadding = isCompact ? "py-2.5 px-3" : "py-3 px-4";

  // Extract folder name from path
  const getFolderName = (): string | null => {
    if (file && file.path && file.parentId) {
      // Extract folder name from parentId (e.g., "/folder1" -> "folder1")
      const parts = file.parentId.split("/").filter(Boolean);
      if (parts.length > 0) {
        // If it's a project folder, don't show it
        if (parts[0].startsWith("project-")) {
          return null;
        }
        return parts[parts.length - 1];
      }
    }
    return null;
  };

  const folderName = getFolderName();

  // Format date/time nicely
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else if (diffDays < 365) {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const rowStateClasses = isCurrentFile
    ? "bg-[#2a2323]/50 border-l-2 border-[#9f8f8f]"
    : isSelected
    ? "bg-[#241c1c]/50 border-l-2 border-[#867979]"
    : "border-l-2 border-transparent hover:bg-[#1f1818]/30";

  const handleRename = () => {
    if (editName && editName.trim() && editName !== item.name) {
      onRename(item.id, editName.trim(), isFolder ? "folder" : "file");
    } else {
      setEditName(item.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setEditName(item.name);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        if (!isEditing) {
          if (onSelect && (e.ctrlKey || e.metaKey || e.shiftKey)) {
            onSelect(e);
          } else if (onSelect && isSelected) {
            // Allow clicking selected items to toggle
            onSelect(e);
          } else {
            if (clickTimeoutRef.current) {
              window.clearTimeout(clickTimeoutRef.current);
            }
            clickTimeoutRef.current = window.setTimeout(() => {
              onOpen(item);
              clickTimeoutRef.current = null;
            }, 200);
          }
        }
      }}
      onDoubleClick={(e) => {
        if (clickTimeoutRef.current) {
          window.clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
        }
        e.preventDefault();
        e.stopPropagation();
        setIsEditing(true);
        setEditName(item.name);
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`group relative flex items-center gap-3 rounded-lg ${basePadding} transition-all cursor-pointer ${rowStateClasses}`}
    >
      <div
        className={`flex items-center ${
          isCompact ? "gap-2.5" : "gap-3"
        } flex-1 min-w-0`}
      >
        {/* Subtle checkbox - only visible on hover or when selected */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelect) {
                onSelect(e);
              }
            }}
            className={`w-3.5 h-3.5 text-[#867979] bg-[#171717] border-[#867979]/30 rounded focus:ring-[#867979] transition-opacity ${
              isSelected || showActions
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
          />
        )}

        {/* Icon - more subtle */}
        <div className="flex-shrink-0 text-[#867979]/60">
          {isFolder ? (
            <svg
              className={`${isCompact ? "w-4 h-4" : "w-4 h-4"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          ) : (
            <svg
              className={`${isCompact ? "w-4 h-4" : "w-4 h-4"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 bg-[#171717] border border-[#867979] rounded text-[#D0CCCC] focus:outline-none focus:border-[#867979]"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex flex-col gap-1">
              {/* File name - prominent */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`truncate ${
                    isCompact ? "text-sm" : "text-base"
                  } font-medium ${
                    isCurrentFile ? "text-[#D0CCCC]" : "text-[#D0CCCC]"
                  }`}
                >
                  {item.name}
                </span>
                {isCurrentFile && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#867979]/20 text-[#867979] rounded uppercase tracking-wide">
                    Active
                  </span>
                )}
              </div>

              {/* Metadata row */}
              <div className="flex items-center gap-2 text-[#867979] text-xs">
                {file && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span title={new Date(file.updatedAt).toLocaleString()}>
                        {formatDateTime(file.updatedAt)}
                      </span>
                    </span>
                    {folderName && (
                      <>
                        <span className="text-[#867979]/40">•</span>
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                          </svg>
                          <span>{folderName}</span>
                        </span>
                      </>
                    )}
                  </>
                )}
                {isFolder && (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span
                      title={new Date(
                        (item as JournalFolder).updatedAt
                      ).toLocaleString()}
                    >
                      {formatDateTime((item as JournalFolder).updatedAt)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions - subtle, appear on hover */}
        {!isEditing && (
          <div
            className={`flex items-center gap-1.5 ${
              showActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            } transition-opacity`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setEditName(item.name);
              }}
              className="p-1.5 rounded text-[#867979] hover:text-[#D0CCCC] hover:bg-[#867979]/10 transition"
              title="Rename"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();

                if (isDeleting) return; // Prevent double-clicks

                let message = `Are you sure you want to delete ${
                  isFolder ? "folder" : "file"
                } "${item.name}"?`;

                // For folders, show child count warning
                if (isFolder) {
                  const folder = item as JournalFolder;
                  const { fileCount, folderCount } = countFolderChildren(
                    folder.path
                  );
                  const totalChildren = fileCount + folderCount;

                  if (totalChildren > 0) {
                    const childDetails: string[] = [];
                    if (folderCount > 0) {
                      childDetails.push(
                        `${folderCount} folder${folderCount !== 1 ? "s" : ""}`
                      );
                    }
                    if (fileCount > 0) {
                      childDetails.push(
                        `${fileCount} file${fileCount !== 1 ? "s" : ""}`
                      );
                    }
                    message += `\n\nThis folder contains ${childDetails.join(
                      " and "
                    )}. All contents will be permanently deleted.`;
                  }
                }

                message += "\n\nThis action cannot be undone.";

                const confirmed = await showConfirm({
                  title: `Delete ${isFolder ? "Folder" : "File"}`,
                  message,
                  confirmText: "Delete",
                  cancelText: "Cancel",
                });
                if (confirmed) {
                  setIsDeleting(true);
                  try {
                    await onDelete(item.id, isFolder ? "folder" : "file");
                  } catch (error) {
                    setIsDeleting(false);
                    console.error("Delete failed:", error);
                  }
                }
              }}
              disabled={isDeleting}
              className={`p-1.5 rounded transition ${
                isDeleting
                  ? "text-[#867979]/50 cursor-not-allowed"
                  : "text-[#867979] hover:text-red-400 hover:bg-red-500/10"
              }`}
              title={isDeleting ? "Deleting..." : "Delete"}
            >
              {isDeleting ? (
                <svg
                  className="w-3.5 h-3.5 animate-spin"
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
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

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
  );
}
