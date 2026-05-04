import { X } from "lucide-react";
import type { ReactNode } from "react";
import type {
  BooleanLabels,
  TableColumn,
  TableFilter,
  TableMessages,
  TableRow,
} from "../types";
import { getAutomaticValueToken, toToken } from "./TableCells";

export function TableState({
  actionLabel,
  children,
  icon,
  onAction,
  title,
}: {
  actionLabel: string;
  children: string;
  icon: ReactNode;
  onAction: () => void;
  title: string;
}) {
  return (
    <div className="table-state" role="status">
      <div className="table-state-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{children}</p>
      <button className="primary-button" onClick={onAction} type="button">
        {actionLabel}
      </button>
    </div>
  );
}

export function getFilterColorClass<Row extends TableRow>(
  column: TableColumn<Row>,
  filter: TableFilter,
): string | null {
  if (filter.operator !== "equals") return null;

  if (column.type === "boolean") {
    return filter.value === "true" ? "is-yes" : "is-no";
  }

  if (column.type === "select") {
    const option = column.options?.find((o) => o.value === filter.value);
    const token =
      option?.token ?? getAutomaticValueToken(column.id, filter.value);
    return `token-${toToken(token)}`;
  }

  return null;
}

export function FilterChip({
  label,
  onRemove,
  colorClass,
}: {
  label: string;
  onRemove: () => void;
  colorClass?: string | null;
}) {
  return (
    <span
      className={[
        "filter-chip",
        colorClass,
        colorClass ? "filter-chip--colored" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
      <button aria-label={`Remove ${label}`} onClick={onRemove} type="button">
        <X size={13} aria-hidden="true" />
      </button>
    </span>
  );
}

export function FilterControl<Row extends TableRow>({
  column,
  booleanLabels,
  filter,
  messages,
  onChange,
}: {
  column: TableColumn<Row>;
  booleanLabels: BooleanLabels;
  filter?: TableFilter;
  messages: Required<TableMessages>;
  onChange: (filter: TableFilter | null) => void;
}) {
  const filterType = getColumnFilterType(column);

  if (filterType === "numberRange" || filterType === "dateRange") {
    const inputType = filterType === "dateRange" ? "date" : "number";
    const rangeStart = getRangeFilterStart(filter);
    const rangeEnd = getRangeFilterEnd(filter);
    const showRangeEnd = Boolean(rangeStart);
    const numericLimits =
      inputType === "number" ? getNumericOptionLimits(column) : null;

    return (
      <fieldset
        className={`filter-field filter-range-field ${
          showRangeEnd ? "is-range-open" : ""
        }`}
        key={column.id}
      >
        <legend>{column.title}</legend>
        <input
          aria-label={column.title}
          inputMode={inputType === "number" ? "decimal" : undefined}
          max={numericLimits?.max}
          min={numericLimits?.min}
          onChange={(event) =>
            onChange(createRangeFilter(event.target.value, rangeEnd))
          }
          placeholder={column.title}
          type={inputType}
          value={rangeStart}
        />
        <div className="range-end-wrap" aria-hidden={!showRangeEnd}>
          <input
            aria-label={`${column.title} maximum`}
            disabled={!showRangeEnd}
            inputMode={inputType === "number" ? "decimal" : undefined}
            max={numericLimits?.max}
            min={numericLimits?.min}
            onChange={(event) =>
              onChange(createRangeFilter(rangeStart, event.target.value))
            }
            placeholder={messages.maxPlaceholder}
            tabIndex={showRangeEnd ? 0 : -1}
            type={inputType}
            value={rangeEnd}
          />
        </div>
      </fieldset>
    );
  }

  if (filterType === "text") {
    return (
      <label className="filter-field" key={column.id}>
        <span>{column.title}</span>
        <input
          onChange={(event) =>
            onChange({
              operator: "contains",
              value: event.target.value,
            })
          }
          value={filter?.value ?? ""}
        />
      </label>
    );
  }

  return (
    <label className="filter-field" key={column.id}>
      <span>{column.title}</span>
      <select
        onChange={(event) =>
          onChange(
            event.target.value
              ? {
                  operator: "equals",
                  value: event.target.value,
                }
              : null,
          )
        }
        value={filter?.value ?? ""}
      >
        <option value="">{messages.allOptionLabel}</option>
        {getFilterOptions(column, booleanLabels).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function getFilterOptionLabel<Row extends TableRow>(
  column: TableColumn<Row>,
  filter: TableFilter,
  booleanLabels: BooleanLabels,
) {
  if (filter.operator === "between") {
    return `${filter.value} to ${filter.valueTo ?? ""}`;
  }

  if (filter.operator === "gte") {
    return `from ${filter.value}`;
  }

  if (filter.operator === "lte") {
    return `until ${filter.value}`;
  }

  if (filter.operator === "contains") {
    return `contains ${filter.value}`;
  }

  const optionLabel = getFilterOptions(column, booleanLabels).find(
    (option) => option.value === filter.value,
  )?.label;

  if (optionLabel) {
    return optionLabel;
  }

  if (column.type === "boolean") {
    return filter.value === "true" ? booleanLabels.true : booleanLabels.false;
  }

  return filter.value;
}

export function isActiveFilter(filter: TableFilter) {
  return Boolean(filter.value) || Boolean(filter.valueTo);
}

function createRangeFilter(value: string, valueTo: string): TableFilter | null {
  if (value && valueTo) {
    return {
      operator: "between",
      value,
      valueTo,
    };
  }

  if (value) {
    return {
      operator: "equals",
      value,
    };
  }

  if (valueTo) {
    return {
      operator: "equals",
      value: valueTo,
    };
  }

  return null;
}

function getRangeFilterStart(filter?: TableFilter) {
  if (!filter) {
    return "";
  }

  return filter.value;
}

function getRangeFilterEnd(filter?: TableFilter) {
  if (!filter || filter.operator !== "between") {
    return "";
  }

  return filter.valueTo ?? "";
}

function getColumnFilterType<Row extends TableRow>(column: TableColumn<Row>) {
  if (column.filterType) {
    return column.filterType;
  }

  if (column.type === "number") {
    return "numberRange";
  }

  if (column.type === "date") {
    return "dateRange";
  }

  if (column.type === "boolean") {
    return "boolean";
  }

  if (column.options?.length) {
    return "select";
  }

  return "text";
}

function getNumericOptionLimits<Row extends TableRow>(
  column: TableColumn<Row>,
) {
  const values = (column.options ?? [])
    .map((option) => Number(option.value))
    .filter(Number.isFinite);

  if (values.length === 0) {
    return null;
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function getFilterOptions<Row extends TableRow>(
  column: TableColumn<Row>,
  booleanLabels: BooleanLabels,
) {
  if (column.type === "boolean") {
    return (
      column.options ?? [
        { label: booleanLabels.true, value: "true" },
        { label: booleanLabels.false, value: "false" },
      ]
    );
  }

  return column.options ?? [];
}
