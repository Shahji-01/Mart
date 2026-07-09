import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { ReactNode } from "react";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-6 text-sm break-words">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex gap-4 w-full">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
          <Button 
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={resetErrorBoundary}
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset state here if needed
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
