import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

/**
 * Standard layout wrapper for the desktop application
 * Ensures consistent window dimensions and spacing across all modules
 */
export function AppLayout({ children, title, className = "" }: AppLayoutProps) {
  return (
    <div className={`flex flex-col h-screen w-full bg-background text-text-primary ${className}`}>
      {title && (
        <header className="px-8 py-6 border-b border-border bg-surface/40">
          <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        </header>
      )}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page container for consistent content spacing within the layout
 */
export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`w-full max-w-6xl mx-auto ${className}`}>
      {children}
    </div>
  );
}

interface ModalLayoutProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

/**
 * Modal layout for dialogs and overlays maintaining desktop app consistency
 */
export function ModalLayout({ children, maxWidth = "md", className = "" }: ModalLayoutProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className={`bg-surface border border-border rounded-xl shadow-2xl ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Desktop window sizing constants for Tauri
 * Use these when configuring window dimensions
 */
export const WINDOW_SIZES = {
  default: { width: 1024, height: 768 },
  small: { width: 800, height: 600 },
  large: { width: 1280, height: 900 },
  fullscreen: { width: 1920, height: 1080 },
} as const;

/**
 * Default styling for the desktop app window
 */
export const windowStyles = {
  container: "h-screen w-screen overflow-hidden",
  mainContent: "flex-1 overflow-auto",
  sidebar: "border-r border-border bg-surface",
};
