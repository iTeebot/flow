import React from "react";
import { Button } from "./ui/Button";
import { Plus } from "lucide-react";

interface ModulePageProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  filterBar?: React.ReactNode;
  listIcon?: React.ReactNode;
  listTitle?: string;
  count?: number;
  children: React.ReactNode;
  pagination?: React.ReactNode;
  loading?: boolean;
}

export function ModulePage({
  title,
  subtitle,
  action,
  filterBar,
  listIcon,
  listTitle,
  count,
  children,
  pagination,
  loading
}: ModulePageProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-text-muted font-medium">Loading records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
        </div>
        {action && (
          <Button
            onClick={action.onClick}
            leftIcon={action.icon || <Plus className="h-4 w-4" />}
          >
            {action.label}
          </Button>
        )}
      </div>

      {/* List Container */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-fit">
        <div className="border-b border-border bg-surface/30 px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              {listIcon && <div className="text-primary">{listIcon}</div>}
              <h2 className="text-lg font-bold text-text-primary">
                {listTitle}
                {count !== undefined && (
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                    {count}
                  </span>
                )}
              </h2>
            </div>

            {filterBar && (
              <div className="lg:flex-1 lg:max-w-4xl lg:ml-8">
                {filterBar}
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          {children}
        </div>

        {pagination && (
          <div className="border-t border-border bg-surface/20">
            {pagination}
          </div>
        )}
      </div>
    </div>
  );
}
