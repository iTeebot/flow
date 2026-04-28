import React from "react";
import { useTranslation } from "react-i18next";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading,
  emptyMessage,
  className,
}: TableProps<T>) {
  const { t } = useTranslation("common");

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 p-8 text-center text-text-muted">
        <p className="text-sm font-medium">{emptyMessage || t("table.no_data")}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface/30 text-[10px] font-black uppercase tracking-widest text-text-muted">
            {columns.map((column, idx) => (
              <th
                key={idx}
                className={`px-4 py-3 text-start font-black ${column.headerClassName || ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {data.map((item, rowIdx) => (
            <tr
              key={keyExtractor(item, rowIdx)}
              onClick={() => onRowClick?.(item)}
              className={`group transition-colors ${onRowClick ? "cursor-pointer hover:bg-surface" : "hover:bg-surface/50"}`}
            >
              {columns.map((column, colIdx) => (
                <td key={colIdx} className={`px-4 py-4 ${column.className || ""}`}>
                  {typeof column.accessor === "function"
                    ? column.accessor(item)
                    : (item[column.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
