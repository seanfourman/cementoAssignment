import type { KeyboardEvent } from "react";
import type {
  BooleanLabels,
  TableCellValue,
  TableColumn,
  TableFormatters,
  TableRow,
} from "../types";

export function renderEditor<Row extends TableRow>({
  column,
  draftValue,
  onBlur,
  onCommit,
  onChange,
  onKeyDown,
}: {
  column: TableColumn<Row>;
  draftValue: TableCellValue;
  onBlur: () => void;
  onCommit: (value: TableCellValue) => void;
  onChange: (value: TableCellValue) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}) {
  if (column.type === "select" && column.options?.length) {
    return (
      <select
        autoFocus
        className="cell-editor"
        onBlur={() => onBlur()}
        onChange={(event) => onCommit(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        value={String(draftValue ?? "")}
      >
        {(column.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      autoFocus
      className="cell-editor"
      inputMode={column.type === "number" ? "decimal" : undefined}
      onBlur={() => onBlur()}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={onKeyDown}
      onMouseDown={(event) => event.stopPropagation()}
      type={
        column.type === "date"
          ? "date"
          : column.type === "number"
            ? "number"
            : "text"
      }
      value={String(draftValue ?? "")}
    />
  );
}

export function renderCellValue<Row extends TableRow>(
  value: TableCellValue,
  row: Row,
  column: TableColumn<Row>,
  formatters: TableFormatters<Row> | undefined,
  booleanLabels: BooleanLabels,
  numberFormatter: Intl.NumberFormat,
) {
  const customValue = column.render
    ? column.render(value, row, column)
    : formatters?.formatValue?.(value, row, column);

  if (customValue !== undefined) {
    return customValue;
  }

  if (value === null || value === undefined || value === "") {
    return <span className="muted-value">{formatters?.emptyValue ?? "-"}</span>;
  }

  if (column.type === "boolean") {
    return (
      <span className={`boolean-pill ${value ? "is-yes" : "is-no"}`}>
        {value ? booleanLabels.true : booleanLabels.false}
      </span>
    );
  }

  if (column.type === "select") {
    const option = column.options?.find(
      (candidate) => candidate.value === String(value),
    );
    const label = option?.label ?? String(value);
    const token =
      option?.token ??
      column.token?.(value, row, column) ??
      formatters?.getValueToken?.(value, row, column) ??
      getAutomaticValueToken(column.id, String(value));

    return (
      <span className={`select-pill token-${toToken(token)}`}>{label}</span>
    );
  }

  if (column.type === "number") {
    return numberFormatter.format(Number(value));
  }

  return String(value);
}

export function formatTitleValue<Row extends TableRow>(
  value: TableCellValue,
  row: Row | null,
  column: TableColumn<Row>,
  formatters: TableFormatters<Row> | undefined,
  booleanLabels: BooleanLabels,
  numberFormatter: Intl.NumberFormat,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const customValue = column.format
    ? column.format(value, row as Row, column)
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

export function coerceDraftValue<Row extends TableRow>(
  column: TableColumn<Row>,
  value: TableCellValue,
) {
  if (column.type === "number") {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (column.type === "boolean") {
    return Boolean(value);
  }

  return value === null || value === undefined ? "" : String(value);
}

export function toToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function getAutomaticValueToken(columnId: string, value: string) {
  return `auto-${stableHash(`${columnId}:${value}`) % 12}`;
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
