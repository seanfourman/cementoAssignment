import { useCallback, useMemo, useState } from "react";
import type { TableRow } from "../types";

type UseTableSelectionInput<Row extends TableRow> = {
  loadCurrentPageRows: () => Promise<Row[]>;
  pageRowCount: number;
  resultTotalRows: number;
  rowCache: Map<number, Row>;
};

export function useTableSelection<Row extends TableRow>({
  loadCurrentPageRows,
  pageRowCount,
  resultTotalRows,
  rowCache,
}: UseTableSelectionInput<Row>) {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isAllRowsSelected, setIsAllRowsSelected] = useState(false);

  const pageRowIds = useMemo(() => {
    const ids: string[] = [];
    rowCache.forEach((row) => ids.push(row.id));
    return ids;
  }, [rowCache]);

  const pageSelectedCount = useMemo(
    () =>
      isAllRowsSelected
        ? pageRowCount
        : pageRowIds.filter((id) => selectedRowIds.has(id)).length,
    [isAllRowsSelected, pageRowCount, pageRowIds, selectedRowIds],
  );

  const isPageAllSelected =
    pageRowCount > 0 &&
    (isAllRowsSelected ||
      (pageRowIds.length >= pageRowCount &&
        pageSelectedCount === pageRowCount));
  const isPagePartiallySelected = pageSelectedCount > 0 && !isPageAllSelected;
  const selectedCount = isAllRowsSelected
    ? resultTotalRows
    : selectedRowIds.size;

  const toggleRowSelection = useCallback(
    (rowId: string) => {
      if (isAllRowsSelected) {
        setIsAllRowsSelected(false);
        setSelectedRowIds(new Set(pageRowIds.filter((id) => id !== rowId)));
      } else {
        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          if (next.has(rowId)) next.delete(rowId);
          else next.add(rowId);
          return next;
        });
      }
    },
    [isAllRowsSelected, pageRowIds],
  );

  const togglePageSelection = useCallback(async () => {
    if (isPageAllSelected || isAllRowsSelected || isPagePartiallySelected) {
      setSelectedRowIds(new Set());
      setIsAllRowsSelected(false);
    } else {
      const pageRows = await loadCurrentPageRows();
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        pageRows.forEach((row) => next.add(row.id));
        return next;
      });
    }
  }, [
    isPageAllSelected,
    isAllRowsSelected,
    isPagePartiallySelected,
    loadCurrentPageRows,
  ]);

  const selectAllRows = useCallback(() => {
    setIsAllRowsSelected(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
    setIsAllRowsSelected(false);
  }, []);

  const removeRowSelection = useCallback((rowId: string) => {
    setSelectedRowIds((prev) => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }, []);

  return {
    clearSelection,
    isAllRowsSelected,
    isPageAllSelected,
    isPagePartiallySelected,
    removeRowSelection,
    selectAllRows,
    selectedCount,
    selectedRowIds,
    togglePageSelection,
    toggleRowSelection,
  };
}
