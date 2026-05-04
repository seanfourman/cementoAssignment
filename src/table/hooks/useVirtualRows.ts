import { useMemo } from "react";

export type VirtualRow = {
  index: number;
  top: number;
};

type VirtualRowsInput = {
  rowCount: number;
  rowHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan: number;
};

export function useVirtualRows({
  rowCount,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscan,
}: VirtualRowsInput) {
  return useMemo(() => {
    if (rowCount <= 0 || rowHeight <= 0 || viewportHeight <= 0) {
      return {
        startIndex: 0,
        endIndex: -1,
        totalHeight: 0,
        virtualRows: [] as VirtualRow[],
      };
    }

    const visibleStart = Math.floor(scrollTop / rowHeight);
    const visibleEnd = Math.ceil((scrollTop + viewportHeight) / rowHeight);
    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(rowCount - 1, visibleEnd + overscan);

    const virtualRows: VirtualRow[] = [];

    for (let index = startIndex; index <= endIndex; index += 1) {
      virtualRows.push({
        index,
        top: index * rowHeight,
      });
    }

    return {
      startIndex,
      endIndex,
      totalHeight: rowCount * rowHeight,
      virtualRows,
    };
  }, [rowCount, rowHeight, viewportHeight, scrollTop, overscan]);
}
