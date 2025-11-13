"use client";

import { useRef, useEffect } from "react";

interface JournalTypingAreaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function JournalTypingArea({
  value,
  onChange,
  onKeyDown,
  placeholder = "Start typing your thoughts... Press Shift+Enter to commit a thought",
  autoFocus = false,
  onFocus,
  onBlur,
}: JournalTypingAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const rows = Math.max(3, value.split("\n").length + 1);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown || undefined}
      onFocus={onFocus}
      onBlur={onBlur}
      className="bg-transparent text-lg font-mono leading-relaxed w-full outline-none border-none focus:outline-none resize-none min-h-[60px] placeholder:text-[var(--theme-placeholder)]"
      style={{
        color: "var(--theme-text-primary)",
      }}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

