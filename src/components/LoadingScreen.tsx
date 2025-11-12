"use client";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({
  message = "Loading...",
  fullScreen = true,
}: LoadingScreenProps) {
  const containerClasses = fullScreen
    ? "min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center"
    : "w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center";

  return (
    <div className={containerClasses}>
      <div className="text-center">
        {/* Animated Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 border-r-purple-600 rounded-full animate-spin"></div>
        </div>
        
        {/* Loading Text */}
        <p className="text-xl text-gray-600 font-light">{message}</p>
      </div>
    </div>
  );
}

