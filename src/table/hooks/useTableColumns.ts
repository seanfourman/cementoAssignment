import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  clamp,
  readStoredColumnWidths,
  writeStoredColumnWidths,
} from "../utils/TableUtils";
import { estimateColumnWidth, getColumnMaximumWidth } from "./useColumnSizing";
import type {
  BooleanLabels,
  EditMap,
  TableColumn,
  TableFormatters,
  TableRow,
  TableSizingOptions,
} from "../types";

export const ACTION_COLUMN_WIDTH = 44;
export const CHECKBOX_COLUMN_WIDTH = 44;

type UseTableColumnsInput<Row extends TableRow> = {
  actionColumnWidth: number;
  booleanLabels: BooleanLabels;
  formatters: TableFormatters<Row> | undefined;
  hasRowActions: boolean;
  numberFormatter: Intl.NumberFormat;
  orderedColumns: readonly TableColumn<Row>[];
  pendingEdits: EditMap;
  resolvedSizing: Required<TableSizingOptions>;
  rowCache: Map<number, Row>;
  savedEdits: EditMap;
  scrollerRef: RefObject<HTMLDivElement | null>;
  storageKey: string;
};

export function useTableColumns<Row extends TableRow>({
  actionColumnWidth,
  booleanLabels,
  formatters,
  hasRowActions,
  numberFormatter,
  orderedColumns,
  pendingEdits,
  resolvedSizing,
  rowCache,
  savedEdits,
  scrollerRef,
  storageKey,
}: UseTableColumnsInput<Row>) {
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(
    () => new Set(orderedColumns.map((column) => column.id)),
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    readStoredColumnWidths(storageKey),
  );
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(0);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => visibleColumnIds.has(column.id)),
    [orderedColumns, visibleColumnIds],
  );

  const filterableColumns = useMemo(
    () => orderedColumns.filter((column) => column.filterable),
    [orderedColumns],
  );

  const contentColumnWidths = useMemo(
    () =>
      visibleColumns.map((column) => {
        const storedWidth = columnWidths[column.id];
        const estimatedWidth = estimateColumnWidth(
          column,
          rowCache,
          savedEdits,
          pendingEdits,
          formatters,
          numberFormatter,
          booleanLabels,
          resolvedSizing,
        );
        return storedWidth === undefined
          ? estimatedWidth
          : Math.max(storedWidth, estimatedWidth);
      }),
    [
      booleanLabels,
      columnWidths,
      formatters,
      numberFormatter,
      pendingEdits,
      resolvedSizing,
      rowCache,
      savedEdits,
      visibleColumns,
    ],
  );

  const baseTableWidth = useMemo(
    () =>
      CHECKBOX_COLUMN_WIDTH +
      contentColumnWidths.reduce((total, width) => total + width, 0) +
      actionColumnWidth,
    [actionColumnWidth, contentColumnWidths],
  );

  const tableWidth =
    availableWidth > 0
      ? Math.max(availableWidth, baseTableWidth)
      : baseTableWidth;

  const gridTemplateColumns = useMemo(() => {
    if (visibleColumns.length === 0) {
      return `${CHECKBOX_COLUMN_WIDTH}px ${ACTION_COLUMN_WIDTH}px`;
    }

    return [
      `${CHECKBOX_COLUMN_WIDTH}px`,
      ...visibleColumns.map((_, index) => {
        const width = contentColumnWidths[index] ?? 100;
        return `minmax(${width}px, 1fr)`;
      }),
      ...(hasRowActions ? [`${ACTION_COLUMN_WIDTH}px`] : []),
    ].join(" ");
  }, [contentColumnWidths, hasRowActions, visibleColumns]);

  const gridStyle = useMemo<CSSProperties>(
    () => ({
      gridTemplateColumns,
      width: tableWidth,
    }),
    [gridTemplateColumns, tableWidth],
  );

  useEffect(() => {
    writeStoredColumnWidths(storageKey, columnWidths);
  }, [columnWidths, storageKey]);

  useEffect(() => {
    const columnIds = new Set(orderedColumns.map((column) => column.id));

    setVisibleColumnIds((current) => {
      const next = new Set<string>();
      current.forEach((id) => {
        if (columnIds.has(id)) {
          next.add(id);
        }
      });

      if (next.size === 0) {
        orderedColumns.forEach((column) => next.add(column.id));
      }

      return next;
    });
  }, [orderedColumns]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const updateAvailableWidth = () => {
      setAvailableWidth(scroller.clientWidth);
    };

    updateAvailableWidth();

    const resizeObserver = new ResizeObserver(updateAvailableWidth);
    resizeObserver.observe(scroller);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollerRef]);

  const toggleColumn = useCallback((columnId: string) => {
    setVisibleColumnIds((current) => {
      const next = new Set(current);

      if (next.has(columnId)) {
        if (next.size === 1) {
          return current;
        }

        next.delete(columnId);
      } else {
        next.add(columnId);
      }

      return next;
    });
  }, []);

  const showAllColumns = useCallback(() => {
    setVisibleColumnIds(new Set(orderedColumns.map((column) => column.id)));
  }, [orderedColumns]);

  const fitColumnToContent = useCallback(
    (column: TableColumn<Row>) => {
      setColumnWidths((current) => ({
        ...current,
        [column.id]: estimateColumnWidth(
          column,
          rowCache,
          savedEdits,
          pendingEdits,
          formatters,
          numberFormatter,
          booleanLabels,
          resolvedSizing,
        ),
      }));
    },
    [
      booleanLabels,
      formatters,
      numberFormatter,
      pendingEdits,
      resolvedSizing,
      rowCache,
      savedEdits,
    ],
  );

  const fitAllColumnsToContent = useCallback(() => {
    setColumnWidths((current) => {
      const next = { ...current };
      visibleColumns.forEach((column) => {
        next[column.id] = estimateColumnWidth(
          column,
          rowCache,
          savedEdits,
          pendingEdits,
          formatters,
          numberFormatter,
          booleanLabels,
          resolvedSizing,
        );
      });
      return next;
    });
  }, [
    booleanLabels,
    formatters,
    numberFormatter,
    pendingEdits,
    resolvedSizing,
    rowCache,
    savedEdits,
    visibleColumns,
  ]);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths({});
  }, []);

  const beginColumnResize = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      column: TableColumn<Row>,
      currentWidth: number,
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = currentWidth;
      const minWidth = estimateColumnWidth(
        column,
        rowCache,
        savedEdits,
        pendingEdits,
        formatters,
        numberFormatter,
        booleanLabels,
        resolvedSizing,
      );
      const maxWidth = Math.max(minWidth, getColumnMaximumWidth(column));

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const width = clamp(
          startWidth + moveEvent.clientX - startX,
          minWidth,
          maxWidth,
        );

        setColumnWidths((current) => ({
          ...current,
          [column.id]: width,
        }));
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [
      booleanLabels,
      formatters,
      numberFormatter,
      pendingEdits,
      resolvedSizing,
      rowCache,
      savedEdits,
    ],
  );

  return {
    beginColumnResize,
    contentColumnWidths,
    filterableColumns,
    fitAllColumnsToContent,
    fitColumnToContent,
    gridStyle,
    isColumnMenuOpen,
    resetColumnWidths,
    setIsColumnMenuOpen,
    showAllColumns,
    tableWidth,
    toggleColumn,
    visibleColumnIds,
    visibleColumns,
  };
}
