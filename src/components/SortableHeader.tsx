import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (key: any) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSortBy,
  sortOrder,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const isActive = currentSortBy === sortKey;

  return (
    <th 
      className={`px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-primary transition-colors group/th ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <div className={`transition-all duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover/th:opacity-50"}`}>
          {isActive ? (
            sortOrder === "asc" ? (
              <ChevronUp className="h-3 w-3 text-primary" />
            ) : (
              <ChevronDown className="h-3 w-3 text-primary" />
            )
          ) : (
            <ChevronsUpDown className="h-3 w-3" />
          )}
        </div>
      </div>
    </th>
  );
}
