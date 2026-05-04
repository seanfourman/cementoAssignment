import { useCallback, useEffect, useMemo, useState } from "react";
import { isActiveFilter } from "../components/TableControls";
import { isColumnSortable } from "../utils/TableUtils";
import type {
  SortDirection,
  TableColumn,
  TableFilter,
  TableQuery,
  TableRow,
} from "../types";

export function useTableQuery<Row extends TableRow>() {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [filters, setFilters] = useState<Record<string, TableFilter>>({});
  const [sortColumnId, setSortColumnId] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const query = useMemo<TableQuery>(
    () => ({
      searchText: debouncedSearchText,
      filters,
      sort: sortColumnId
        ? {
            columnId: sortColumnId,
            direction: sortDirection,
          }
        : null,
    }),
    [debouncedSearchText, filters, sortColumnId, sortDirection],
  );

  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  const hasActiveQuery = useMemo(
    () =>
      Boolean(searchText.trim()) ||
      Object.values(filters).some(isActiveFilter) ||
      Boolean(sortColumnId),
    [filters, searchText, sortColumnId],
  );

  const activeQueryCount = useMemo(() => {
    let count = 0;

    if (searchText.trim()) {
      count += 1;
    }

    count += Object.values(filters).filter(isActiveFilter).length;

    if (sortColumnId) {
      count += 1;
    }

    return count;
  }, [filters, searchText, sortColumnId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 260);

    return () => window.clearTimeout(timeout);
  }, [searchText]);

  const updateFilter = useCallback(
    (columnId: string, filter: TableFilter | null) => {
      setFilters((current) => {
        const next = { ...current };

        if (!filter || !isActiveFilter(filter)) {
          delete next[columnId];
        } else {
          next[columnId] = filter;
        }

        return next;
      });
    },
    [],
  );

  const removeFilter = useCallback((columnId: string) => {
    setFilters((current) => {
      const next = { ...current };
      delete next[columnId];
      return next;
    });
  }, []);

  const removeSearch = useCallback(() => {
    setSearchText("");
    setDebouncedSearchText("");
  }, []);

  const removeSort = useCallback(() => {
    setSortColumnId("");
    setSortDirection("asc");
  }, []);

  const toggleSort = useCallback(
    (column: TableColumn<Row>) => {
      if (!isColumnSortable(column)) {
        return;
      }

      if (sortColumnId !== column.id) {
        setSortColumnId(column.id);
        setSortDirection("asc");
        return;
      }

      if (sortDirection === "desc") {
        setSortColumnId("");
        setSortDirection("asc");
        return;
      }

      setSortDirection("desc");
    },
    [sortColumnId, sortDirection],
  );

  const clearFilters = useCallback(() => {
    setSearchText("");
    setDebouncedSearchText("");
    setFilters({});
    setSortColumnId("");
    setSortDirection("asc");
    setIsFilterMenuOpen(false);
  }, []);

  return {
    activeQueryCount,
    clearFilters,
    filters,
    hasActiveQuery,
    isFilterMenuOpen,
    query,
    queryKey,
    removeFilter,
    removeSearch,
    removeSort,
    searchText,
    setIsFilterMenuOpen,
    setSearchText,
    sortColumnId,
    sortDirection,
    toggleSort,
    updateFilter,
  };
}
