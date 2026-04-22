import { ChevronLeft, ChevronRight } from "lucide-react";

type TablePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4 bg-surface/10">
      <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Total {totalItems} items
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">Rows per page</span>
          <select
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-bold text-text-primary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none min-w-[60px] text-center"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-text-primary transition-all hover:bg-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="min-w-[60px] text-center text-xs font-bold text-text-primary">
            Page {page} of {totalPages}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-text-primary transition-all hover:bg-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-background"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
