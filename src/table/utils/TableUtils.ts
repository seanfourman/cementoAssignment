import type { EditMap, TableCellValue, TableColumn, TableRow } from "../types";

export function getRowLabel<Row extends TableRow>(
  row: Row,
  columns: readonly TableColumn<Row>[],
) {
  const firstDisplayValue = columns
    .map((column) => row[column.id])
    .find((value) => value !== null && value !== undefined && value !== "");

  return String(firstDisplayValue ?? row.id);
}

export function isColumnSortable<Row extends TableRow>(
  column: TableColumn<Row>,
) {
  return column.sortable !== false;
}

export function cloneEditMap(editMap: EditMap): EditMap {
  const next: EditMap = new Map();
  editMap.forEach((cellMap, rowId) => {
    next.set(rowId, new Map(cellMap));
  });
  return next;
}

export function mergeEditMaps(base: EditMap, patch: EditMap): EditMap {
  const next = cloneEditMap(base);
  patch.forEach((cellMap, rowId) => {
    const rowEdits = new Map(next.get(rowId));
    cellMap.forEach((value, columnId) => {
      rowEdits.set(columnId, value);
    });
    next.set(rowId, rowEdits);
  });
  return next;
}

export function hasEdit(editMap: EditMap, rowId: string, columnId: string) {
  return editMap.get(rowId)?.has(columnId) ?? false;
}

export function areCellValuesEqual<Row extends TableRow>(
  column: TableColumn<Row>,
  left: TableCellValue,
  right: TableCellValue,
) {
  const leftIsEmpty = isEmptyCell(left);
  const rightIsEmpty = isEmptyCell(right);

  if (leftIsEmpty || rightIsEmpty) {
    return leftIsEmpty && rightIsEmpty;
  }

  if (column.type === "number") {
    return Number(left) === Number(right);
  }

  if (column.type === "boolean") {
    return Boolean(left) === Boolean(right);
  }

  return String(left) === String(right);
}

export function countEdits(editMap: EditMap) {
  let count = 0;
  editMap.forEach((cellMap) => {
    count += cellMap.size;
  });
  return count;
}

export function readStoredColumnWidths(storageKey: string) {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function writeStoredColumnWidths(
  storageKey: string,
  widths: Record<string, number>,
) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(widths));
  } catch {
    // localStorage is optional for the table; resizing still works in-memory.
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "The data source returned an unexpected error.";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isEmptyCell(value: TableCellValue) {
  return value === null || value === undefined || value === "";
}
