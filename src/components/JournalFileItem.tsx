"use client";

import { useState, useRef, useEffect } from "react";
import {
  type JournalFileSystemItem,
  type JournalFile,
  type JournalFolder,
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
  onDelete: (id: string, type: "file" | "folder") => void;
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
  const { isOpen, options, showConfirm, handleConfirm, handleCancel } =
    useConfirm();
  const clickTimeoutRef = useRef<number | null>(null);

  const isFolder = item.type === "folder";
  const file = !isFolder ? (item as JournalFile) : null;
  const isCompact = density === "compact";
  const basePadding = isCompact ? "py-1.5 px-2.5" : "py-2 px-3";
  const rowStateClasses = isCurrentFile
    ? "bg-[#2a2323] border-l-2 border-[#9f8f8f]"
    : isSelected
    ? "bg-[#241c1c] border-l-2 border-[#867979]"
    : "border-l-2 border-transparent hover:bg-[#1f1818]";

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
      className={`group relative flex items-center gap-2 rounded-md ${basePadding} transition-colors cursor-pointer ${rowStateClasses}`}
    >
      <div className={`flex items-center ${isCompact ? "gap-2" : "gap-3"} flex-1 min-w-0`}>
        {/* Checkbox for selection */}
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
            className="w-4 h-4 text-[#867979] bg-[#171717] border-[#867979] rounded focus:ring-[#867979]"
          />
        )}
        {/* Icon */}
        <div className="flex-shrink-0 text-[#867979]">
          {isFolder ? (
            <svg
              className={`${isCompact ? "w-4 h-4" : "w-5 h-5"}`}
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
              className={`${isCompact ? "w-4 h-4" : "w-5 h-5"}`}
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

        {/* Name */}
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
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`truncate ${
                    isCompact ? "text-sm" : "text-[15px]"
                  } font-medium text-white ${
                    isCurrentFile ? "text-[#d8cfcf]" : ""
                  }`}
                >
                  {item.name}
                </span>
                {isCurrentFile && (
                  <span className="text-[10px] uppercase tracking-wide text-[#867979]">
                    Active
                  </span>
                )}
              </div>
              {file && (
                <div
                  className={`flex flex-wrap items-center gap-2 text-[#867979] ${
                    isCompact ? "text-[10px]" : "text-xs"
                  }`}
                >
                  <span>{file.metadata?.wordCount || 0} words</span>
                  <span>•</span>
                  <span
                    title={`Last updated: ${new Date(
                      file.updatedAt
                    ).toLocaleString()}`}
                  >
                    {new Date(file.updatedAt).toLocaleDateString()}
                  </span>
                  {file.createdAt && file.createdAt !== file.updatedAt && (
                    <>
                      <span>•</span>
                      <span
                        title={`Created: ${new Date(
                          file.createdAt
                        ).toLocaleString()}`}
                      >
                        Created {new Date(file.createdAt).toLocaleDateString()}
                      </span>
                    </>
                  )}
                  {projectName && (
                    <>
                      <span>•</span>
                      <span>{projectName}</span>
                    </>
                  )}
                </div>
              )}
              {isFolder && (
                <div
                  className={`${
                    isCompact ? "text-[10px]" : "text-xs"
                  } text-[#867979]`}
                >
                  {new Date((item as JournalFolder).updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div
            className={`flex items-center ${
              isCompact ? "gap-1.5" : "gap-2"
            } ${
              showActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            } transition-opacity`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setEditName(item.name);
              }}
              className={`${
                isCompact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
              } rounded text-[#D0CCCC] hover:text-white transition`}
              title="Rename"
            >
              ✎
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const confirmed = await showConfirm({
                  title: `Delete ${isFolder ? "Folder" : "File"}`,
                  message: `Are you sure you want to delete ${isFolder ? "folder" : "file"} "${item.name}"? This action cannot be undone.`,
                  confirmText: "Delete",
                  cancelText: "Cancel",
                });
                if (confirmed) {
                  onDelete(item.id, isFolder ? "folder" : "file");
                }
              }}
              className={`${
                isCompact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
              } rounded text-red-400 hover:text-red-300 transition`}
              title="Delete"
            >
              ×
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


