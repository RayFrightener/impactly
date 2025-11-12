"use client";

import { useEffect } from "react";

/**
 * ConfirmationModal Component
 * 
 * RULE: For all confirmation dialogs in the app, use ConfirmationModal instead of native confirm().
 * Import and use the useConfirm hook for easy integration.
 * 
 * This component provides a consistent, styled confirmation dialog that matches
 * the app's design system.
 */

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onConfirm();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleEnter);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleEnter);
    };
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-light text-neutral-800 mb-4">{title}</h2>
        <p className="text-neutral-800 text-base mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border-2 border-blue-200 text-neutral-800 rounded-xl hover:bg-blue-100 transition font-medium"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-blue-300 text-white rounded-xl hover:bg-blue-400 transition font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

