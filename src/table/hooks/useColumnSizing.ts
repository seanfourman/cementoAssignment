import type {
  BooleanLabels,
  EditMap,
  TableCellValue,
  TableColumn,
  TableFormatters,
  TableRow,
  TableSizingOptions,
} from "../types";
import { hasEdit, isColumnSortable } from "../utils/TableUtils";

export function estimateColumnWidth<Row extends TableRow>(
  column: TableColumn<Row>,
  rowCache: Map<number, Row>,
  savedEdits: EditMap,
  pendingEdits: EditMap,
  formatters: TableFormatters<Row> | undefined,
  numberFormatter: Intl.NumberFormat,
  booleanLabels: BooleanLabels,
  sizing: Required<TableSizingOptions>,
) {
  const valueSamples: string[] = [];

  column.options?.forEach((option) => {
    valueSamples.push(option.label);
  });

  rowCache.forEach((row) => {
    const value = getCellValueForSizing(row, column, savedEdits, pendingEdits);
    valueSamples.push(
      toSizingText(
        value,
        row,
        column,
        formatters,
        numberFormatter,
        booleanLabels,
      ),
    );
  });

  const widestValueText = valueSamples.reduce(
    (widest, sample) =>
      Math.max(
        widest,
        measureTextWidth(
          sample,
          sizing.cellTextMeasureFont,
          sizing.textMeasureSafetyPx,
        ),
      ),
    0,
  );

  const estimatedHeaderWidth =
    measureTextWidth(
      column.title,
      sizing.headerTextMeasureFont,
      sizing.textMeasureSafetyPx,
    ) + getHeaderChromeWidth(column);
  const estimatedValueWidth = widestValueText + getCellChromeWidth(column);
  const estimatedWidth = Math.max(estimatedHeaderWidth, estimatedValueWidth);

  const schemaWidthHint = column.width ?? getColumnMinimumWidth(column);
  const minWidth = getColumnMinimumWidth(column);

  return Math.max(estimatedWidth, schemaWidthHint, minWidth);
}

export function getColumnMaximumWidth<Row extends TableRow>(
  column: TableColumn<Row>,
) {
  if (column.maxWidth !== undefined) {
    return column.maxWidth;
  }

  if (column.type === "number" || column.type === "boolean") {
    return 150;
  }

  if (column.type === "date") {
    return 150;
  }

  if (column.type === "select") {
    return 230;
  }

  return 360;
}

function getCellValueForSizing<Row extends TableRow>(
  row: Row,
  column: TableColumn<Row>,
  savedEdits: EditMap,
  pendingEdits: EditMap,
) {
  if (hasEdit(pendingEdits, row.id, column.id)) {
    return pendingEdits.get(row.id)!.get(column.id);
  }

  if (hasEdit(savedEdits, row.id, column.id)) {
    return savedEdits.get(row.id)!.get(column.id);
  }

  return row[column.id];
}

function toSizingText<Row extends TableRow>(
  value: TableCellValue,
  row: Row,
  column: TableColumn<Row>,
  formatters: TableFormatters<Row> | undefined,
  numberFormatter: Intl.NumberFormat,
  booleanLabels: BooleanLabels,
) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const customValue = column.format
    ? column.format(value, row, column)
    : formatters?.formatPlainValue?.(value, row, column);

  if (customValue !== undefined) {
    return customValue;
  }

  if (column.type === "boolean") {
    return value ? booleanLabels.true : booleanLabels.false;
  }

  if (column.type === "select") {
    return (
      column.options?.find((option) => option.value === String(value))?.label ??
      String(value)
    );
  }

  if (column.type === "number") {
    return numberFormatter.format(Number(value));
  }

  return String(value);
}

const textWidthCache = new Map<string, number>();
let textMeasureContext: CanvasRenderingContext2D | null | undefined;

function measureTextWidth(value: string, font: string, safetyPx: number) {
  const cacheKey = `${font}:${value}`;
  const cachedWidth = textWidthCache.get(cacheKey);

  if (cachedWidth !== undefined) {
    return cachedWidth;
  }

  if (textMeasureContext === undefined && typeof document !== "undefined") {
    textMeasureContext = document.createElement("canvas").getContext("2d");
  }

  if (!textMeasureContext) {
    return value.length * 8 + safetyPx;
  }

  textMeasureContext.font = font;

  const width =
    Math.ceil(textMeasureContext.measureText(value).width) + safetyPx;
  textWidthCache.set(cacheKey, width);

  return width;
}

function getHeaderChromeWidth<Row extends TableRow>(column: TableColumn<Row>) {
  const cellPadding = 24;
  const sortControlWidth = isColumnSortable(column) ? 35 : 0;
  const resizeHandleRoom = 8;

  return cellPadding + sortControlWidth + resizeHandleRoom;
}

function getCellChromeWidth<Row extends TableRow>(column: TableColumn<Row>) {
  const cellPadding = 24;

  if (column.type === "select" || column.type === "boolean") {
    return cellPadding + 18;
  }

  return cellPadding;
}

function getColumnMinimumWidth<Row extends TableRow>(column: TableColumn<Row>) {
  if (column.minWidth !== undefined) {
    return column.minWidth;
  }

  if (column.type === "boolean") {
    return 84;
  }

  if (column.type === "number") {
    return 78;
  }

  if (column.type === "date") {
    return 104;
  }

  return 96;
}
