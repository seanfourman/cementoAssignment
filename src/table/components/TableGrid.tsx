import { ArrowDown, ArrowUp, RefreshCw, SlidersHorizontal } from "lucide-react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { useEffect, useRef } from "react";
import type {
  BooleanLabels,
  EditMap,
  RowAction,
  SortDirection,
  TableCellValue,
  TableColumn,
  TableFormatters,
  TableMessages,
  TableRow,
} from "../types";
import type { VirtualRow } from "../hooks/useVirtualRows";
import { formatTitleValue, renderCellValue, renderEditor } from "./TableCells";
import { TableState } from "./TableControls";
import { hasEdit, isColumnSortable } from "../utils/TableUtils";

type EditingCell = {
  rowId: string;
  columnId: string;
  committedValue: TableCellValue;
} | null;

type FocusedCell = {
  rowId: string;
  columnId: string;
} | null;

function HeaderCheckbox({
  isAllSelected,
  isPartiallySelected,
  onToggle,
}: {
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = isPartiallySelected;
  }, [isPartiallySelected]);
  return (
    <input
      checked={isAllSelected}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
      ref={ref}
      type="checkbox"
    />
  );
}

export function TableGrid<Row extends TableRow>({
  beginColumnResize,
  bodyRef,
  booleanLabels,
  clearFilters,
  commitEditing,
  contentColumnWidths,
  draftValue,
  editingCell,
  focusedCell,
  formatters,
  getResolvedRowLabel,
  getResolvedValue,
  gridStyle,
  handleCellKeyDown,
  handleEditorKeyDown,
  hasRowActions,
  isAllRowsSelected,
  isEditingEnabled,
  isEmpty,
  isPageAllSelected,
  isPagePartiallySelected,
  fitColumnToContent,
  loadError,
  loading,
  messages,
  numberFormatter,
  onScrollTopChange,
  onHorizontalWheel,
  onTogglePageSelection,
  onToggleRowSelection,
  pageStartIndex,
  pendingEdits,
  retryLoad,
  resolvedRowActions,
  resultTotalRows,
  rowCache,
  rowHeight,
  scrollerRef,
  selectedRowId,
  selectedRowIds,
  setDraftValue,
  setFocusedCell,
  sortColumnId,
  sortDirection,
  startEditing,
  tableWidth,
  title,
  toggleSort,
  virtualRows,
  visibleColumns,
  pinnedRows,
  onRowContextMenu,
}: {
  beginColumnResize: (
    event: ReactPointerEvent<HTMLButtonElement>,
    column: TableColumn<Row>,
    currentWidth: number,
  ) => void;
  bodyRef: RefObject<HTMLDivElement | null>;
  booleanLabels: BooleanLabels;
  clearFilters: () => void;
  commitEditing: (nextValue?: TableCellValue) => void;
  contentColumnWidths: readonly number[];
  draftValue: TableCellValue;
  editingCell: EditingCell;
  focusedCell: FocusedCell;
  formatters: TableFormatters<Row> | undefined;
  getResolvedRowLabel: (row: Row) => string;
  getResolvedValue: (row: Row, column: TableColumn<Row>) => TableCellValue;
  gridStyle: CSSProperties;
  handleCellKeyDown: (
    event: KeyboardEvent<HTMLDivElement>,
    row: Row,
    localRowIndex: number,
    column: TableColumn<Row>,
  ) => void;
  handleEditorKeyDown: (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  hasRowActions: boolean;
  isAllRowsSelected: boolean;
  isEditingEnabled: boolean;
  isEmpty: boolean;
  isPageAllSelected: boolean;
  isPagePartiallySelected: boolean;
  fitColumnToContent: (column: TableColumn<Row>) => void;
  loadError: string | null;
  loading: boolean;
  messages: Required<TableMessages>;
  numberFormatter: Intl.NumberFormat;
  onScrollTopChange: (scrollTop: number) => void;
  onHorizontalWheel: (deltaX: number) => void;
  onTogglePageSelection: () => void;
  onToggleRowSelection: (rowId: string) => void;
  pageStartIndex: number;
  pendingEdits: EditMap;
  retryLoad: () => void;
  resolvedRowActions: readonly RowAction<Row>[];
  resultTotalRows: number;
  rowCache: Map<number, Row>;
  rowHeight: number;
  scrollerRef: RefObject<HTMLDivElement | null>;
  selectedRowId?: string;
  selectedRowIds: Set<string>;
  setDraftValue: (value: TableCellValue) => void;
  setFocusedCell: (cell: FocusedCell) => void;
  sortColumnId: string;
  sortDirection: SortDirection;
  startEditing: (row: Row, column: TableColumn<Row>) => void;
  tableWidth: number;
  title: string;
  toggleSort: (column: TableColumn<Row>) => void;
  virtualRows: {
    totalHeight: number;
    virtualRows: readonly VirtualRow[];
  };
  visibleColumns: readonly TableColumn<Row>[];
  pinnedRows: readonly Row[];
  onRowContextMenu: (x: number, y: number, row: Row) => void;
}) {
  const isStateVisible = isEmpty || !!loadError;

  return (
    <div
      className={`table-scroller${isStateVisible ? " is-empty" : ""}`}
      ref={scrollerRef}
    >
      <div className="table-header" role="row" style={gridStyle}>
        <div
          aria-colindex={1}
          className="header-cell checkbox-header"
          role="columnheader"
        >
          <HeaderCheckbox
            isAllSelected={isPageAllSelected || isAllRowsSelected}
            isPartiallySelected={isPagePartiallySelected}
            onToggle={onTogglePageSelection}
          />
        </div>
        {visibleColumns.map((column, index) => (
          <div
            aria-colindex={index + 2}
            aria-sort={
              isColumnSortable(column)
                ? sortColumnId === column.id
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
                : undefined
            }
            className={[
              "header-cell",
              `align-${column.align ?? "left"}`,
              isColumnSortable(column) ? "is-sortable" : "",
              sortColumnId === column.id ? "is-sorted" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={column.id}
            onClick={
              isColumnSortable(column) ? () => toggleSort(column) : undefined
            }
            role="columnheader"
          >
            {isColumnSortable(column) ? (
              <button
                aria-label={`Sort by ${column.title} ${
                  sortColumnId === column.id && sortDirection === "asc"
                    ? "descending"
                    : "ascending"
                }`}
                className="header-sort-button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleSort(column);
                }}
                type="button"
              >
                <span>{column.title}</span>
                {sortColumnId === column.id ? (
                  sortDirection === "asc" ? (
                    <ArrowUp size={14} aria-hidden="true" />
                  ) : (
                    <ArrowDown size={14} aria-hidden="true" />
                  )
                ) : (
                  <span className="sort-placeholder" aria-hidden="true" />
                )}
              </button>
            ) : (
              <span>{column.title}</span>
            )}
            <button
              aria-label={`Resize ${column.title} column`}
              className="column-resize-handle"
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={() => fitColumnToContent(column)}
              onPointerDown={(event) =>
                beginColumnResize(
                  event,
                  column,
                  contentColumnWidths[index] ?? column.width ?? 120,
                )
              }
              type="button"
            />
          </div>
        ))}
        {hasRowActions ? (
          <div
            aria-colindex={visibleColumns.length + 2}
            className="header-cell action-header"
            role="columnheader"
          >
            <span className="sr-only">{messages.actionsLabel}</span>
          </div>
        ) : null}
      </div>

      <div
        aria-busy={loading}
        aria-colcount={visibleColumns.length + 1 + (hasRowActions ? 1 : 0)}
        aria-label={`${title} rows`}
        aria-rowcount={resultTotalRows}
        className="table-body"
        onWheel={(event) => {
          if (event.deltaX !== 0 && !isStateVisible) {
            onHorizontalWheel(event.deltaX);
          }
        }}
        onScroll={(event) => onScrollTopChange(event.currentTarget.scrollTop)}
        ref={bodyRef}
        role="grid"
        style={{ width: isStateVisible ? "100%" : tableWidth }}
      >
        {pinnedRows.length > 0 && (
          <div className="pinned-rows">
            {pinnedRows.map((row) => {
              const rowHasPending = pendingEdits.has(row.id);
              const isSelected = selectedRowId === row.id;

              return (
                <div
                  className={[
                    "table-row",
                    "is-pinned",
                    rowHasPending ? "row-pending" : "",
                    isSelected ? "row-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={row.id}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onRowContextMenu(event.clientX, event.clientY, row);
                  }}
                  role="row"
                  style={{ ...gridStyle, height: rowHeight }}
                >
                  <div
                    aria-colindex={1}
                    className="table-cell checkbox-cell"
                    role="gridcell"
                  >
                    <input
                      checked={isAllRowsSelected || selectedRowIds.has(row.id)}
                      onChange={() => onToggleRowSelection(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      type="checkbox"
                    />
                  </div>

                  {visibleColumns.map((column, columnIndex) => {
                    const value = getResolvedValue(row, column);
                    const isEditing =
                      editingCell?.rowId === row.id &&
                      editingCell.columnId === column.id;
                    const isPending = hasEdit(pendingEdits, row.id, column.id);
                    const cellId = `${row.id}:${column.id}`;

                    return (
                      <div
                        aria-colindex={columnIndex + 2}
                        aria-readonly={
                          !isEditingEnabled || column.editable === false
                        }
                        className={[
                          "table-cell",
                          `align-${column.align ?? "left"}`,
                          `type-${column.type}`,
                          isEditingEnabled ? "cell-editable" : "",
                          isPending ? "cell-pending" : "",
                          column.editable === false ? "cell-readonly" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        data-cell-id={cellId}
                        key={column.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isEditingEnabled) startEditing(row, column);
                        }}
                        onFocus={() =>
                          setFocusedCell({ rowId: row.id, columnId: column.id })
                        }
                        onKeyDown={(event) =>
                          handleCellKeyDown(event, row, 0, column)
                        }
                        role="gridcell"
                        tabIndex={
                          isEditingEnabled &&
                          (!focusedCell ||
                            (focusedCell.rowId === row.id &&
                              focusedCell.columnId === column.id))
                            ? 0
                            : -1
                        }
                        title={formatTitleValue(
                          value,
                          row,
                          column,
                          formatters,
                          booleanLabels,
                          numberFormatter,
                        )}
                      >
                        {isEditing
                          ? renderEditor({
                              column,
                              draftValue,
                              onBlur: commitEditing,
                              onCommit: commitEditing,
                              onChange: setDraftValue,
                              onKeyDown: handleEditorKeyDown,
                            })
                          : renderCellValue(
                              value,
                              row,
                              column,
                              formatters,
                              booleanLabels,
                              numberFormatter,
                            )}
                      </div>
                    );
                  })}

                  {hasRowActions ? (
                    <div
                      aria-colindex={visibleColumns.length + 2}
                      className="table-cell action-cell"
                      role="gridcell"
                    >
                      {resolvedRowActions.map((action) => {
                        const label =
                          typeof action.label === "function"
                            ? action.label(row)
                            : action.label;
                        const icon =
                          typeof action.icon === "function"
                            ? action.icon(row)
                            : action.icon;
                        return (
                          <button
                            aria-label={`${label} for ${String(getResolvedRowLabel(row))}`}
                            className="row-action-button"
                            key={action.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              action.onClick(row);
                            }}
                            title={label}
                            type="button"
                          >
                            {icon ?? label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div
          className="table-rows"
          style={{
            height: virtualRows.totalHeight,
            width: tableWidth,
          }}
        >
          {virtualRows.virtualRows.map((virtualRow) => {
            const row = rowCache.get(virtualRow.index);
            const globalIndex = pageStartIndex + virtualRow.index;
            const rowHasPending = row ? pendingEdits.has(row.id) : false;
            const rowToneClass = globalIndex % 2 === 0 ? "row-even" : "row-odd";
            const isSelected = row ? selectedRowId === row.id : false;

            return (
              <div
                aria-rowindex={globalIndex + 1}
                className={[
                  "table-row",
                  rowToneClass,
                  rowHasPending ? "row-pending" : "",
                  isSelected ? "row-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={row?.id ?? `placeholder-${globalIndex}`}
                onContextMenu={(event) => {
                  if (row) {
                    event.preventDefault();
                    onRowContextMenu(event.clientX, event.clientY, row);
                  }
                }}
                role="row"
                style={{
                  ...gridStyle,
                  height: rowHeight,
                  transform: `translateY(${virtualRow.top}px)`,
                }}
              >
                <div
                  aria-colindex={1}
                  className="table-cell checkbox-cell"
                  role="gridcell"
                >
                  {row ? (
                    <input
                      checked={isAllRowsSelected || selectedRowIds.has(row.id)}
                      onChange={() => onToggleRowSelection(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      type="checkbox"
                    />
                  ) : null}
                </div>

                {visibleColumns.map((column, columnIndex) => {
                  if (!row) {
                    return (
                      <div
                        aria-colindex={columnIndex + 2}
                        className="table-cell cell-loading"
                        key={column.id}
                        role="gridcell"
                      >
                        <span />
                      </div>
                    );
                  }

                  const value = getResolvedValue(row, column);
                  const isEditing =
                    editingCell?.rowId === row.id &&
                    editingCell.columnId === column.id;
                  const isPending = hasEdit(pendingEdits, row.id, column.id);
                  const cellId = `${row.id}:${column.id}`;

                  return (
                    <div
                      aria-colindex={columnIndex + 2}
                      aria-readonly={
                        !isEditingEnabled || column.editable === false
                      }
                      className={[
                        "table-cell",
                        `align-${column.align ?? "left"}`,
                        `type-${column.type}`,
                        isEditingEnabled ? "cell-editable" : "",
                        isPending ? "cell-pending" : "",
                        column.editable === false ? "cell-readonly" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      data-cell-id={cellId}
                      key={column.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isEditingEnabled) {
                          startEditing(row, column);
                        }
                      }}
                      onFocus={() =>
                        setFocusedCell({ rowId: row.id, columnId: column.id })
                      }
                      onKeyDown={(event) =>
                        handleCellKeyDown(event, row, virtualRow.index, column)
                      }
                      role="gridcell"
                      tabIndex={
                        isEditingEnabled &&
                        (!focusedCell ||
                          (focusedCell.rowId === row.id &&
                            focusedCell.columnId === column.id))
                          ? 0
                          : -1
                      }
                      title={formatTitleValue(
                        value,
                        row,
                        column,
                        formatters,
                        booleanLabels,
                        numberFormatter,
                      )}
                    >
                      {isEditing
                        ? renderEditor({
                            column,
                            draftValue,
                            onBlur: commitEditing,
                            onCommit: commitEditing,
                            onChange: setDraftValue,
                            onKeyDown: handleEditorKeyDown,
                          })
                        : renderCellValue(
                            value,
                            row,
                            column,
                            formatters,
                            booleanLabels,
                            numberFormatter,
                          )}
                    </div>
                  );
                })}

                {hasRowActions ? (
                  <div
                    aria-colindex={visibleColumns.length + 2}
                    className="table-cell action-cell"
                    role="gridcell"
                  >
                    {row ? (
                      resolvedRowActions.map((action) => {
                        const label =
                          typeof action.label === "function"
                            ? action.label(row)
                            : action.label;
                        const icon =
                          typeof action.icon === "function"
                            ? action.icon(row)
                            : action.icon;
                        return (
                          <button
                            aria-label={`${label} for ${String(getResolvedRowLabel(row))}`}
                            className="row-action-button"
                            key={action.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              action.onClick(row);
                            }}
                            title={label}
                            type="button"
                          >
                            {icon ?? label}
                          </button>
                        );
                      })
                    ) : (
                      <span className="cell-action-loading" />
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {loadError ? (
          <TableState
            actionLabel={messages.retryLabel}
            icon={<RefreshCw size={20} aria-hidden="true" />}
            onAction={retryLoad}
            title={messages.loadErrorTitle}
          >
            {loadError}
          </TableState>
        ) : null}

        {isEmpty ? (
          <TableState
            actionLabel={messages.clearAllLabel}
            icon={<SlidersHorizontal size={20} aria-hidden="true" />}
            onAction={clearFilters}
            title={messages.emptyTitle}
          >
            {messages.emptyDescription}
          </TableState>
        ) : null}
      </div>
    </div>
  );
}
