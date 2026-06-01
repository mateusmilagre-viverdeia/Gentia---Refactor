import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function useTableSort<T>(data: T[], defaultSort?: SortConfig) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    defaultSort || { key: "", direction: null }
  );

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      if (prev.direction === "desc") {
        return { key: "", direction: null };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === "asc" ? 1 : -1;
      if (bValue == null) return sortConfig.direction === "asc" ? -1 : 1;

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === "asc"
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Handle strings
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue, "pt-BR", { sensitivity: "base" });
        return sortConfig.direction === "asc" ? comparison : -comparison;
      }

      // Handle numbers
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [data, sortConfig]);

  return {
    sortConfig,
    handleSort,
    sortedData,
  };
}
