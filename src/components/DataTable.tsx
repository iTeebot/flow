import React from "react";
import { SortableHeader } from "./SortableHeader";
import { TableActions, type Action } from "./TableActions";

export interface DataColumn<T> {
  header: string;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  sortKey?: string;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  actions?: (item: T) => Action[];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sortBy,
  sortOrder,
  onSort,
  actions,
  emptyMessage = "No records found",
  emptyIcon
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {emptyIcon && (
          <div className="rounded-full bg-surface p-4 mb-4 border border-border">
            {emptyIcon}
          </div>
        )}
        <p className="text-text-muted font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface/50 border-b border-border">
            {columns.map((col, idx) => (
              col.sortKey && onSort && sortBy && sortOrder ? (
                <SortableHeader
                  key={idx}
                  label={col.header}
                  sortKey={col.sortKey}
                  currentSortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                  className={col.className}
                />
              ) : (
                <th
                  key={idx}
                  className={`px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted ${col.className || ""}`}
                >
                  {col.header}
                </th>
              )
            ))}
            {actions && (
              <th className="sticky right-0 z-10 bg-surface/90 w-14 px-2 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-text-muted shadow-[-4px_0_10px_rgba(0,0,0,0.1)] backdrop-blur-sm"></th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="group hover:bg-surface/30 transition-all duration-200"
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-5 py-3.5 ${col.className || ""}`}>
                  {typeof col.accessor === "function"
                    ? col.accessor(item)
                    : col.accessor
                      ? (item[col.accessor] as React.ReactNode)
                      : null}
                </td>
              ))}
              {actions && (
                <td className="sticky right-0 z-10 bg-card/95 group-hover:bg-surface/95 w-14 px-2 py-3.5 transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                  <div className="flex items-center justify-end">
                    <TableActions actions={actions(item)} />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
