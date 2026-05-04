import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Download, X } from "lucide-react";
import { RowContextMenu } from "./components/RowContextMenu";
import type {
  BooleanLabels,
  TableColumn,
  TableFormatters,
  TableMessages,
  TableProps,
  TableRow,
  TableSizingOptions,
} from "./types";
import { TableFooter } from "./components/TableFooter";
import { RowDetailsPanel } from "./components/RowDetailsPanel";
import { TableToolbar } from "./components/TableToolbar";
import { TableGrid } from "./components/TableGrid";
import { getRowLabel } from "./utils/TableUtils";
import { ACTION_COLUMN_WIDTH, useTableColumns } from "./hooks/useTableColumns";
import { useTableData } from "./hooks/useTableData";
import { type FocusedCell, useTableEditing } from "./hooks/useTableEditing";
import { useTableQuery } from "./hooks/useTableQuery";
import { useTableSelection } from "./hooks/useTableSelection";
import "./Table.css";

function SelectionBar({
  isAllRowsSelected,
  isPageAllSelected,
  onClearSelection,
  onExport,
  onSelectAllRows,
  selectedCount,
  totalFilteredRows,
}: {
  isAllRowsSelected: boolean;
  isPageAllSelected: boolean;
  onClearSelection: () => void;
  onExport: () => void;
  onSelectAllRows: () => void;
  selectedCount: number;
  totalFilteredRows: number;
}) {
  const hasSelection = selectedCount > 0;

  return (
    <div className={`selection-bar-outer${hasSelection ? " is-visible" : ""}`}>
      <div className="selection-bar">
        <button
          className="primary-button text-button"
          onClick={onExport}
          type="button"
        >
          <Download size={16} aria-hidden="true" />
          Export
        </button>

        <span className="selection-count">
          {selectedCount.toLocaleString()} row{selectedCount !== 1 ? "s" : ""}{" "}
          selected
        </span>

        {isPageAllSelected && !isAllRowsSelected ? (
          <button
            className="selection-link"
            onClick={onSelectAllRows}
            type="button"
          >
            Select all {totalFilteredRows.toLocaleString()} rows
          </button>
        ) : null}

        {isAllRowsSelected ? (
          <span className="selection-all-badge">All results selected</span>
        ) : null}

        <button
          aria-label="Clear selection"
          className="icon-button"
          onClick={onClearSelection}
          title="Clear selection"
          type="button"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const DEFAULT_PAGE_SIZE = 10_000;
const DEFAULT_ROW_HEIGHT = 44;
const DEFAULT_OVERSCAN = 12;
const COLUMN_WIDTH_STORAGE_PREFIX = "generic-data-table-column-widths";

const defaultNumberFormatter = new Intl.NumberFormat("en-US");
const defaultBooleanLabels: BooleanLabels = {
  true: "Yes",
  false: "No",
};
const defaultMessages: Required<TableMessages> = {
  filtersLabel: "Filters",
  columnsLabel: "Columns",
  editLabel: "Edit",
  editingLabel: "Editing",
  resetEditsLabel: "Reset pending edits",
  saveEditsLabel: "Save pending edits",
  clearAllLabel: "Clear all",
  searchPlaceholder: "Search",
  allOptionLabel: "All",
  minPlaceholder: "Min",
  maxPlaceholder: "Max",
  detailsLabel: "Row details",
  closeDetailsLabel: "Close details",
  actionsLabel: "Actions",
  emptyTitle: "No matching rows",
  emptyDescription: "Adjust the filters or search query to see more rows.",
  loadErrorTitle: "Could not load rows",
  retryLabel: "Retry",
  pageLabel: "Page",
  pageOfLabel: "of",
  previousPageLabel: "Previous page",
  nextPageLabel: "Next page",
};
const defaultSizing: Required<TableSizingOptions> = {
  headerTextMeasureFont: "850 13.12px system-ui, sans-serif",
  cellTextMeasureFont: "850 14.4px system-ui, sans-serif",
  textMeasureSafetyPx: 10,
};

export default function Table<Row extends TableRow>({
  title,
  columns,
  data,
  dataSource,
  tableId,
  columnWidthStorageKey,
  pageSize = DEFAULT_PAGE_SIZE,
  rowHeight = DEFAULT_ROW_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  formatters,
  messages,
  sizing,
  getRowLabel: getCustomRowLabel,
  rowActions,
  enableRowDetails = true,
  renderRowDetails,
  onSaveEdits,
  onResetEdits,
  isSavingEdits = false,
  onDeleteRow,
  onImportRows,
}: TableProps<Row>) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const editModeButtonRef = useRef<HTMLButtonElement | null>(null);
  const resolvedColumnWidthStorageKey =
    columnWidthStorageKey ??
    `${COLUMN_WIDTH_STORAGE_PREFIX}:${tableId ?? title}`;
  const numberFormatter = formatters?.number ?? defaultNumberFormatter;
  const booleanLabels = formatters?.booleanLabels ?? defaultBooleanLabels;
  const resolvedMessages = useMemo(
    () => ({ ...defaultMessages, ...messages }),
    [messages],
  );
  const resolvedSizing = useMemo(
    () => ({ ...defaultSizing, ...sizing }),
    [sizing],
  );

  const orderedColumns = useMemo(
    () => [...columns].sort((left, right) => left.ordinalNo - right.ordinalNo),
    [columns],
  );

  const columnsById = useMemo(() => {
    const map = new Map<string, TableColumn<Row>>();
    orderedColumns.forEach((column) => map.set(column.id, column));
    return map;
  }, [orderedColumns]);

  const {
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
  } = useTableQuery<Row>();

  const [deletedRowIds, setDeletedRowIds] = useState<Set<string>>(
    () => new Set(),
  );

  const {
    applyLocalEdits,
    commitPageInput,
    isArrayBacked,
    isEmpty,
    loadCurrentPageRows,
    loadError,
    loadingRequests,
    pageCount,
    pageEndDisplay,
    pageIndex,
    pageInput,
    pageRowCount,
    pageStartDisplay,
    pageStartIndex,
    refreshDataSource,
    replaceLocalRows,
    resolvedDataSource,
    resultTotalRows,
    retryLoad,
    rowCache,
    setLoadError,
    setPageIndex,
    setPageInput,
    setScrollTop,
    sourceVersion,
    virtualRows,
  } = useTableData<Row>({
    bodyRef,
    data,
    dataSource,
    deletedRowIds,
    orderedColumns,
    overscan,
    pageSize,
    query,
    queryKey,
    rowHeight,
  });

  const {
    cancelEditing,
    commitEditing,
    draftValue,
    editingCell,
    focusedCell,
    focusCell,
    getResolvedValue,
    handleEditorKeyDown,
    isEditingEnabled,
    isSaving,
    pendingEditCount,
    pendingEdits,
    resetAllEdits,
    resetPendingEdits,
    savePendingEdits,
    savedEdits,
    setDraftValue,
    setFocusedCell,
    startEditing,
    toggleEditingMode,
  } = useTableEditing<Row>({
    applyLocalEdits,
    columnsById,
    editModeButtonRef,
    isArrayBacked,
    isSavingEdits,
    onResetEdits,
    onSaveEdits,
    setLoadError,
  });

  const resolvedRowActions = rowActions ?? [];
  const hasRowActions = resolvedRowActions.length > 0;
  const actionColumnWidth = hasRowActions ? ACTION_COLUMN_WIDTH : 0;

  const {
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
  } = useTableColumns<Row>({
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
    storageKey: resolvedColumnWidthStorageKey,
  });

  const {
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
  } = useTableSelection<Row>({
    loadCurrentPageRows,
    pageRowCount,
    resultTotalRows,
    rowCache,
  });

  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [pinnedRows, setPinnedRows] = useState<Row[]>(() => []);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: Row;
  } | null>(null);

  const pinnedRowIds = useMemo(
    () => new Set(pinnedRows.map((r) => r.id)),
    [pinnedRows],
  );

  const getResolvedRowLabel = useCallback(
    (row: Row) => getCustomRowLabel?.(row) ?? getRowLabel(row, orderedColumns),
    [getCustomRowLabel, orderedColumns],
  );

  useEffect(() => {
    if (!isArrayBacked) {
      return;
    }

    replaceLocalRows(data ?? []);
    resetAllEdits();
  }, [data, isArrayBacked, replaceLocalRows, resetAllEdits]);

  useEffect(() => {
    if (isArrayBacked) {
      return;
    }

    resetAllEdits();
    refreshDataSource();
  }, [dataSource, isArrayBacked, refreshDataSource, resetAllEdits]);

  useEffect(() => {
    setSelectedRow(null);
  }, [queryKey, resolvedDataSource.totalRows, sourceVersion]);

  useEffect(() => {
    if (isEmpty && scrollerRef.current) {
      scrollerRef.current.scrollLeft = 0;
    }
  }, [isEmpty]);

  const openRowDetails = useCallback((row: Row) => {
    setSelectedRow(row);
  }, []);

  const togglePinRow = useCallback((row: Row) => {
    setPinnedRows((current) =>
      current.some((r) => r.id === row.id)
        ? current.filter((r) => r.id !== row.id)
        : [...current, row],
    );
  }, []);

  const openContextMenu = useCallback((x: number, y: number, row: Row) => {
    setContextMenu({ x, y, row });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const copyRowAsJson = useCallback(
    (row: Row) => {
      const data: Record<string, unknown> = {};
      orderedColumns.forEach((col) => {
        data[col.title] = row[col.id] ?? null;
      });
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    },
    [orderedColumns],
  );

  const deleteRow = useCallback(
    (row: Row) => {
      setPinnedRows((prev) => prev.filter((r) => r.id !== row.id));
      setDeletedRowIds((prev) => new Set([...prev, row.id]));
      removeRowSelection(row.id);
      onDeleteRow?.(row);
    },
    [onDeleteRow, removeRowSelection],
  );

  const importFromFile = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      const { read, utils } = await import("xlsx");
      const wb = read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json<Record<string, unknown>>(ws);
      onImportRows?.(rows);
    },
    [onImportRows],
  );

  const exportToExcel = useCallback(async () => {
    let rowsToExport: Row[];
    if (isAllRowsSelected) {
      const response = await Promise.resolve(
        resolvedDataSource.getRows({
          startIndex: 0,
          count: resultTotalRows,
          query,
          excludeIds: deletedRowIds.size > 0 ? deletedRowIds : undefined,
        }),
      );
      rowsToExport = response.rows;
    } else {
      rowsToExport = [];
      rowCache.forEach((row) => {
        if (selectedRowIds.has(row.id)) rowsToExport.push(row);
      });
    }

    const { utils, writeFile } = await import("xlsx");
    const headers = orderedColumns.map((col) => col.title);
    const dataRows = rowsToExport.map((row) =>
      orderedColumns.map((col) => row[col.id] ?? ""),
    );
    const ws = utils.aoa_to_sheet([headers, ...dataRows]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Export");
    writeFile(wb, `${title.replace(/\s+/g, "-")}-export.xlsx`);
  }, [
    deletedRowIds,
    isAllRowsSelected,
    orderedColumns,
    query,
    resolvedDataSource,
    resultTotalRows,
    rowCache,
    selectedRowIds,
    title,
  ]);

  const toggleColumnMenu = useCallback(() => {
    setIsColumnMenuOpen((value) => !value);
    setIsFilterMenuOpen(false);
  }, [setIsColumnMenuOpen, setIsFilterMenuOpen]);

  const toggleFilterMenu = useCallback(() => {
    setIsFilterMenuOpen((value) => !value);
    setIsColumnMenuOpen(false);
  }, [setIsColumnMenuOpen, setIsFilterMenuOpen]);

  const focusAdjacentCell = useCallback(
    (
      row: Row,
      localRowIndex: number,
      column: TableColumn<Row>,
      direction: "left" | "right" | "up" | "down",
    ) => {
      const columnIndex = visibleColumns.findIndex(
        (visibleColumn) => visibleColumn.id === column.id,
      );

      let nextColumnIndex = columnIndex;
      let nextRowIndex = localRowIndex;

      if (direction === "left") {
        nextColumnIndex = Math.max(0, columnIndex - 1);
      }

      if (direction === "right") {
        nextColumnIndex = Math.min(visibleColumns.length - 1, columnIndex + 1);
      }

      if (direction === "up") {
        nextRowIndex = Math.max(0, localRowIndex - 1);
      }

      if (direction === "down") {
        nextRowIndex = Math.min(pageRowCount - 1, localRowIndex + 1);
      }

      const nextColumn = visibleColumns[nextColumnIndex];
      const nextRow = rowCache.get(nextRowIndex);

      if (!nextColumn) {
        return;
      }

      if (!nextRow && bodyRef.current) {
        bodyRef.current.scrollTop = nextRowIndex * rowHeight;
        return;
      }

      if (nextRow) {
        const nextCell = {
          rowId: nextRow.id,
          columnId: nextColumn.id,
        };
        setFocusedCell(nextCell);
        focusCell(nextCell);
      } else {
        const currentCell: FocusedCell = {
          rowId: row.id,
          columnId: column.id,
        };
        setFocusedCell(currentCell);
      }
    },
    [
      focusCell,
      pageRowCount,
      rowCache,
      rowHeight,
      setFocusedCell,
      visibleColumns,
    ],
  );

  const handleCellKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLDivElement>,
      row: Row,
      localRowIndex: number,
      column: TableColumn<Row>,
    ) => {
      if (event.key === "Enter" || event.key === "F2") {
        event.preventDefault();
        startEditing(row, column);
      }

      if (event.key === " " && column.type === "boolean") {
        event.preventDefault();
        startEditing(row, column);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusAdjacentCell(row, localRowIndex, column, "left");
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusAdjacentCell(row, localRowIndex, column, "right");
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        focusAdjacentCell(row, localRowIndex, column, "up");
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusAdjacentCell(row, localRowIndex, column, "down");
      }
    },
    [focusAdjacentCell, startEditing],
  );

  return (
    <div className="data-table-wrap">
      <SelectionBar
        isAllRowsSelected={isAllRowsSelected}
        isPageAllSelected={isPageAllSelected}
        onClearSelection={clearSelection}
        onExport={exportToExcel}
        onSelectAllRows={selectAllRows}
        selectedCount={selectedCount}
        totalFilteredRows={resultTotalRows}
      />

      <section
        className={`data-table ${isEditingEnabled ? "is-editing-mode" : ""}`}
        aria-label={title}
      >
        <span className="sr-only" aria-live="polite">
          {isEditingEnabled
            ? "Edit mode enabled. Press Enter or F2 on a focused cell to edit."
            : "Edit mode disabled."}
        </span>

        <TableToolbar
          activeQueryCount={activeQueryCount}
          booleanLabels={booleanLabels}
          clearFilters={clearFilters}
          columnsById={columnsById}
          editModeButtonRef={editModeButtonRef}
          filterableColumns={filterableColumns}
          filters={filters}
          fitAllColumnsToContent={fitAllColumnsToContent}
          hasActiveQuery={hasActiveQuery}
          isColumnMenuOpen={isColumnMenuOpen}
          isEditingEnabled={isEditingEnabled}
          isFilterMenuOpen={isFilterMenuOpen}
          isSaving={isSaving}
          messages={resolvedMessages}
          onToggleColumnMenu={toggleColumnMenu}
          onToggleEditMode={toggleEditingMode}
          onToggleFilterMenu={toggleFilterMenu}
          orderedColumns={orderedColumns}
          pendingEditCount={pendingEditCount}
          removeFilter={removeFilter}
          removeSearch={removeSearch}
          removeSort={removeSort}
          resetColumnWidths={resetColumnWidths}
          resetPendingEdits={resetPendingEdits}
          savePendingEdits={savePendingEdits}
          searchText={searchText}
          setSearchText={setSearchText}
          showAllColumns={showAllColumns}
          sortColumnId={sortColumnId}
          sortDirection={sortDirection}
          title={title}
          toggleColumn={toggleColumn}
          updateFilter={updateFilter}
          visibleColumnIds={visibleColumnIds}
          onImport={onImportRows ? importFromFile : undefined}
        />

        <TableGrid
          beginColumnResize={beginColumnResize}
          bodyRef={bodyRef}
          booleanLabels={booleanLabels}
          clearFilters={clearFilters}
          commitEditing={commitEditing}
          contentColumnWidths={contentColumnWidths}
          draftValue={draftValue}
          editingCell={editingCell}
          fitColumnToContent={fitColumnToContent}
          focusedCell={focusedCell}
          formatters={formatters}
          getResolvedRowLabel={getResolvedRowLabel}
          getResolvedValue={getResolvedValue}
          gridStyle={gridStyle}
          handleCellKeyDown={handleCellKeyDown}
          handleEditorKeyDown={handleEditorKeyDown}
          hasRowActions={hasRowActions}
          isEditingEnabled={isEditingEnabled}
          isEmpty={isEmpty}
          loadError={loadError}
          loading={loadingRequests > 0}
          messages={resolvedMessages}
          numberFormatter={numberFormatter}
          onHorizontalWheel={(deltaX) => {
            if (scrollerRef.current) {
              scrollerRef.current.scrollLeft += deltaX;
            }
          }}
          onScrollTopChange={setScrollTop}
          pageStartIndex={pageStartIndex}
          pendingEdits={pendingEdits}
          resolvedRowActions={resolvedRowActions}
          resultTotalRows={resultTotalRows}
          retryLoad={retryLoad}
          rowCache={rowCache}
          rowHeight={rowHeight}
          scrollerRef={scrollerRef}
          selectedRowId={selectedRow?.id}
          setDraftValue={setDraftValue}
          setFocusedCell={setFocusedCell}
          sortColumnId={sortColumnId}
          sortDirection={sortDirection}
          startEditing={startEditing}
          tableWidth={tableWidth}
          title={title}
          toggleSort={toggleSort}
          virtualRows={virtualRows}
          visibleColumns={visibleColumns}
          pinnedRows={pinnedRows}
          onRowContextMenu={openContextMenu}
          isAllRowsSelected={isAllRowsSelected}
          isPageAllSelected={isPageAllSelected}
          isPagePartiallySelected={isPagePartiallySelected}
          onTogglePageSelection={togglePageSelection}
          onToggleRowSelection={toggleRowSelection}
          selectedRowIds={selectedRowIds}
        />

        <TableFooter
          loading={loadingRequests > 0}
          messages={resolvedMessages}
          numberFormatter={numberFormatter}
          onNextPage={() =>
            setPageIndex((current) => Math.min(pageCount - 1, current + 1))
          }
          onPageInputBlur={commitPageInput}
          onPageInputChange={setPageInput}
          onPageInputKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          onPreviousPage={() =>
            setPageIndex((current) => Math.max(0, current - 1))
          }
          pageCount={pageCount}
          pageEndDisplay={pageEndDisplay}
          pageIndex={pageIndex}
          pageInput={pageInput}
          pageStartDisplay={pageStartDisplay}
          resultTotalRows={resultTotalRows}
        />

        {selectedRow && enableRowDetails ? (
          <RowDetailsPanel
            booleanLabels={booleanLabels}
            columns={orderedColumns}
            formatters={formatters}
            getResolvedValue={getResolvedValue}
            label={getResolvedRowLabel(selectedRow)}
            messages={resolvedMessages}
            numberFormatter={numberFormatter}
            onClose={() => setSelectedRow(null)}
            renderRowDetails={renderRowDetails}
            row={selectedRow}
          />
        ) : null}

        {contextMenu ? (
          <RowContextMenu
            isPinned={pinnedRowIds.has(contextMenu.row.id)}
            onClose={closeContextMenu}
            onCopyJson={() => copyRowAsJson(contextMenu.row)}
            onDelete={() => deleteRow(contextMenu.row)}
            onDetails={() => openRowDetails(contextMenu.row)}
            onPin={() => togglePinRow(contextMenu.row)}
            showDetails={enableRowDetails}
            x={contextMenu.x}
            y={contextMenu.y}
          />
        ) : null}
      </section>
    </div>
  );
}
