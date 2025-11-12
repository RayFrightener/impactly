"use client";

import { useState, useEffect, useRef } from "react";

interface JournalingProps {
  projectId?: string | null;
  onClose: () => void;
}

export default function Journaling({ projectId, onClose }: JournalingProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [isFocused, setIsFocused] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved journal entries
  useEffect(() => {
    const saved = localStorage.getItem(`journal-${projectId || "general"}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setLines(parsed.lines || []);
      setCurrentLine(parsed.currentLine || "");
    }
  }, [projectId]);

  // Save journal entries
  useEffect(() => {
    const data = {
      lines,
      currentLine,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(
      `journal-${projectId || "general"}`,
      JSON.stringify(data)
    );
  }, [lines, currentLine, projectId]);

  // Keep focus on input
  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused, lines]);

  // Keep view at bottom (where current line is)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, currentLine]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (currentLine.trim()) {
        setLines([...lines, currentLine]);
        setCurrentLine("");
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentLine(e.target.value);
  };

  return (
    <div className="fixed inset-0 bg-[#171717] z-50 flex flex-col">
      {/* Header with close button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="text-[#D0CCCC] hover:text-white px-4 py-2 rounded-md transition"
          onKeyDown={(e) => e.key === "Escape" && onClose()}
        >
          ESC to close
        </button>
      </div>

      {/* Journaling area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-8 py-12 flex flex-col justify-end"
        onClick={() => setIsFocused(true)}
      >
        <div className="max-w-4xl mx-auto w-full space-y-1">
          {/* Previous lines */}
          {lines.map((line, index) => (
            <div
              key={index}
              className="text-[#D0CCCC] text-lg font-mono leading-relaxed"
            >
              {line}
            </div>
          ))}

          {/* Current line with cursor */}
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={currentLine}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={() => setIsFocused(false)}
              onFocus={() => setIsFocused(true)}
              className="bg-transparent text-[#D0CCCC] text-lg font-mono leading-relaxed w-full outline-none border-none focus:outline-none"
              placeholder=""
              autoFocus
            />
            {isFocused && (
              <span className="inline-block w-2 h-6 bg-[#D0CCCC] ml-1 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
