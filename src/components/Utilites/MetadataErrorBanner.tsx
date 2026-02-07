import React from "react";
import { useAuth } from "@context/authContext";

/**
 * Banner component that displays when user metadata fails to load.
 * Provides manual retry and logout options for recovery.
 */
export const MetadataErrorBanner: React.FC = () => {
  const { user, metadataError, isLoadingMetadata, retryFetchMetadata, logout } =
    useAuth();

  // Don't show banner if not authenticated or no error
  if (!user || !metadataError) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <svg
              className="w-6 h-6 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Profile Loading Error</p>
              <p className="text-sm text-white/90 truncate">{metadataError}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={retryFetchMetadata}
              disabled={isLoadingMetadata}
              className="px-4 py-2 bg-white text-red-600 rounded-md font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingMetadata ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
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
                  Retrying...
                </span>
              ) : (
                "Retry"
              )}
            </button>
            <button
              onClick={logout}
              disabled={isLoadingMetadata}
              className="px-4 py-2 bg-red-700 text-white rounded-md font-medium hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
