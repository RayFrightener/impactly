"use client";

import { useState } from "react";
import { createFeedback, type FeedbackType } from "@/app/actions/feedback";

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [type, setType] = useState<FeedbackType>("FEATURE_REQUEST");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) return;

    try {
      setIsSubmitting(true);
      await createFeedback({
        type,
        title,
        description,
        page: window.location.pathname,
        isAnonymous,
      });

      // Show success
      setShowSuccess(true);
      setTitle("");
      setDescription("");
      setIsAnonymous(false);
      
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
        aria-label="Send feedback"
      >
        {isOpen ? (
          <span className="text-2xl">✕</span>
        ) : (
          <span className="text-2xl">💬</span>
        )}
      </button>

      {/* Feedback Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 border border-gray-200 overflow-hidden">
          {showSuccess ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Thank you!
              </h3>
              <p className="text-gray-600">
                Your feedback has been submitted successfully.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <h3 className="text-xl font-bold mb-1">Send Feedback</h3>
                <p className="text-sm opacity-90">
                  Help us improve Impactly
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <TypeButton
                      icon="🐛"
                      label="Bug"
                      active={type === "BUG"}
                      onClick={() => setType("BUG")}
                    />
                    <TypeButton
                      icon="✨"
                      label="Feature"
                      active={type === "FEATURE_REQUEST"}
                      onClick={() => setType("FEATURE_REQUEST")}
                    />
                    <TypeButton
                      icon="💡"
                      label="Improvement"
                      active={type === "IMPROVEMENT"}
                      onClick={() => setType("IMPROVEMENT")}
                    />
                    <TypeButton
                      icon="❤️"
                      label="Praise"
                      active={type === "PRAISE"}
                      onClick={() => setType("PRAISE")}
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label
                    htmlFor="feedback-title"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Title
                  </label>
                  <input
                    id="feedback-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-gray-600"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="feedback-description"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="feedback-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us more..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder:text-gray-600"
                    required
                  />
                </div>

                {/* Anonymous Option */}
                <div className="flex items-center gap-2">
                  <input
                    id="feedback-anonymous"
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="feedback-anonymous"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Make it anonymous (hide my name)
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Your feedback helps us build a better product ✨
                </p>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

interface TypeButtonProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function TypeButton({ icon, label, active, onClick }: TypeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
        active
          ? "border-blue-600 bg-blue-50 text-blue-600"
          : "border-gray-200 hover:border-gray-300 text-gray-700"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

