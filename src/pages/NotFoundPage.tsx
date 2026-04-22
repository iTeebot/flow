import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-surface to-background text-text-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* 404 Icon */}
        <div className="space-y-4">
          <div className="text-9xl font-black text-primary/20">404</div>
          <h1 className="text-4xl font-bold">Page Not Found</h1>
          <p className="text-lg text-text-muted">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition font-semibold"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-surface border border-border rounded-lg hover:border-primary/50 transition font-semibold text-text-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Footer Info */}
        <div className="pt-8 border-t border-border/50 text-sm text-text-muted">
          <p>If you think this is a mistake, please contact support.</p>
        </div>
      </div>
    </div>
  );
}
