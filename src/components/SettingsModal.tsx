"use client";

import { useState, useEffect } from "react";
import SignOut from "@/components/sign-out";
import ThemeCustomizer from "@/components/theme/ThemeCustomizer";
import { useTheme } from "@/components/theme/ThemeProvider";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const { previewPreset } = useTheme();

  // Revert any preview when theme modal closes
  useEffect(() => {
    if (!isThemeModalOpen) {
      previewPreset(null);
    }
  }, [isThemeModalOpen, previewPreset]);

  // Revert any preview when main settings modal closes
  useEffect(() => {
    if (!isOpen) {
      previewPreset(null);
    }
  }, [isOpen, previewPreset]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isThemeModalOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isThemeModalOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-text-primary">
              Settings
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-2xl leading-none text-text-secondary transition hover:text-text-primary"
              aria-label="Close settings modal"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Theme Section */}
            <div>
              <h4 className="text-lg font-medium text-text-primary mb-3">
                Theme &amp; Personalization
              </h4>
              <button
                type="button"
                onClick={() => setIsThemeModalOpen(true)}
                className="w-full px-4 py-3 bg-surface border-2 border-border rounded-xl hover:bg-surface-alt transition text-text-primary font-medium text-left"
              >
                Customize Theme
              </button>
            </div>

            {/* Sign Out Section */}
            <div>
              <h4 className="text-lg font-medium text-text-primary mb-3">
                Account
              </h4>
              <div className="px-4 py-3 bg-surface border-2 border-border rounded-xl">
                <SignOut />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-text-primary">
                Theme &amp; Personalization
              </h3>
              <button
                type="button"
                onClick={() => {
                  previewPreset(null);
                  setIsThemeModalOpen(false);
                }}
                className="text-2xl leading-none text-text-secondary transition hover:text-text-primary"
                aria-label="Close theme modal"
              >
                ×
              </button>
            </div>
            <ThemeCustomizer />
          </div>
        </div>
      )}
    </>
  );
}

