"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({
  message = "Loading...",
  fullScreen = true,
}: LoadingScreenProps) {
  const { tokens } = useTheme();
  
  const containerClasses = fullScreen
    ? "min-h-screen flex items-center justify-center"
    : "w-full h-full flex items-center justify-center";

  return (
    <div 
      className={containerClasses}
      style={{ backgroundColor: tokens.background }}
    >
      <div className="text-center">
        {/* Animated Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div 
            className="absolute inset-0 border-4 rounded-full"
            style={{ borderColor: tokens.border }}
          ></div>
          <div 
            className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
            style={{ 
              borderTopColor: tokens.accent,
              borderRightColor: tokens.button 
            }}
          ></div>
        </div>
        
        {/* Loading Text */}
        <p 
          className="text-xl font-light"
          style={{ color: tokens.textSecondary }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

