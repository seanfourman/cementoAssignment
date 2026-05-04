import type {
  TableColumn,
  TableDataRequest,
  TableDataResponse,
  TableDataSource,
  TableFilter,
  TableQuery,
  TableRow,
} from "../types";

export function createArrayDataSource<Row extends TableRow>(
  data: readonly Row[],
  columns: readonly TableColumn<Row>[],
): TableDataSource<Row> {
  const orderedColumns = [...columns].sort(
    (left, right) => left.ordinalNo - right.ordinalNo,
  );
  const columnsById = new Map(
    orderedColumns.map((column) => [column.id, column]),
  );

  return {
    totalRows: data.length,
    getRows(request) {
      return getArrayRows(data, orderedColumns, columnsById, request);
    },
  };
}

function getArrayRows<Row extends TableRow>(
  data: readonly Row[],
  columns: readonly TableColumn<Row>[],
  columnsById: Map<string, TableColumn<Row>>,
  request: TableDataRequest,
): TableDataResponse<Row> {
  const query = normalizeQuery(request.query);
  const safeStart = Math.max(0, request.startIndex);
  const safeCount = Math.max(0, request.count);
  const activeFilters = Object.entries(query.filters ?? {});
  const hasQuery =
    Boolean(query.searchText) ||
    activeFilters.length > 0 ||
    Boolean(query.sort);

  if (!hasQuery && !request.excludeIds?.size) {
    return {
      rows: data.slice(safeStart, safeStart + safeCount),
      totalRows: data.length,
    };
  }

  let rows = request.excludeIds?.size
    ? data.filter((row) => !request.excludeIds!.has(row.id))
    : [...data];

  if (query.searchText) {
    const searchText = query.searchText.toLowerCase();
    rows = rows.filter((row) => matchesSearch(row, columns, searchText));
  }

  if (activeFilters.length > 0) {
    rows = rows.filter((row) =>
      activeFilters.every(([columnId, filter]) => {
        const column = columnsById.get(columnId);
        return matchesFilter(row[columnId], filter, column);
      }),
    );
  }

  if (query.sort) {
    const column = columnsById.get(query.sort.columnId);
    if (column) {
      rows = sortRows(rows, column, query.sort.direction);
    }
  }

  return {
    rows: rows.slice(safeStart, safeStart + safeCount),
    totalRows: rows.length,
  };
}

function normalizeQuery(query?: TableQuery): TableQuery {
  const filters = Object.fromEntries(
    Object.entries(query?.filters ?? {}).filter(
      ([, filter]) => filter.value !== "" || filter.valueTo !== "",
    ),
  );

  return {
    searchText: query?.searchText?.trim() ?? "",
    filters,
    sort: query?.sort ?? null,
  };
}

function matchesSearch<Row extends TableRow>(
  row: Row,
  columns: readonly TableColumn<Row>[],
  searchText: string,
) {
  return columns.some((column) =>
    getDisplayValue(row[column.id], column).toLowerCase().includes(searchText),
  );
}

function matchesFilter<Row extends TableRow>(
  value: unknown,
  filter: TableFilter,
  column?: TableColumn<Row>,
) {
  if (!filter.value && !filter.valueTo) {
    return true;
  }

  const normalizedValue = String(value ?? "").toLowerCase();
  const filterValue = filter.value.toLowerCase();

  if (filter.operator === "contains") {
    return normalizedValue.includes(filterValue);
  }

  if (filter.operator === "equals") {
    return String(value ?? "") === filter.value;
  }

  if (filter.operator === "gte") {
    return compareFilterValues(value, filter.value, column) >= 0;
  }

  if (filter.operator === "lte") {
    return compareFilterValues(value, filter.value, column) <= 0;
  }

  return (
    compareFilterValues(value, filter.value, column) >= 0 &&
    compareFilterValues(value, filter.valueTo ?? filter.value, column) <= 0
  );
}

function compareFilterValues<Row extends TableRow>(
  value: unknown,
  filterValue: string,
  column?: TableColumn<Row>,
) {
  if (column?.type === "date") {
    const valueTime = Date.parse(String(value ?? ""));
    const filterTime = Date.parse(filterValue);

    if (Number.isFinite(valueTime) && Number.isFinite(filterTime)) {
      return valueTime - filterTime;
    }
  }

  const numericValue = Number(value);
  const numericFilter = Number(filterValue);

  if (Number.isFinite(numericValue) && Number.isFinite(numericFilter)) {
    return numericValue - numericFilter;
  }

  return String(value ?? "").localeCompare(filterValue);
}

function sortRows<Row extends TableRow>(
  rows: readonly Row[],
  column: TableColumn<Row>,
  direction: "asc" | "desc",
) {
  const multiplier = direction === "desc" ? -1 : 1;

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const comparison =
        compareSortValues(left.row[column.id], right.row[column.id], column) ||
        left.index - right.index;

      return comparison * multiplier;
    })
    .map(({ row }) => row);
}

function compareSortValues<Row extends TableRow>(
  left: unknown,
  right: unknown,
  column: TableColumn<Row>,
) {
  if (column.type === "number") {
    return Number(left ?? 0) - Number(right ?? 0);
  }

  if (column.type === "boolean") {
    return Number(Boolean(left)) - Number(Boolean(right));
  }

  if (column.type === "date") {
    const leftTime = Date.parse(String(left ?? ""));
    const rightTime = Date.parse(String(right ?? ""));

    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return leftTime - rightTime;
    }
  }

  if (column.type === "select" && column.options?.length) {
    const leftIndex = column.options.findIndex(
      (option) => option.value === String(left),
    );
    const rightIndex = column.options.findIndex(
      (option) => option.value === String(right),
    );

    if (leftIndex !== -1 && rightIndex !== -1) {
      return leftIndex - rightIndex;
    }
  }

  return getDisplayValue(left, column).localeCompare(
    getDisplayValue(right, column),
  );
}

function getDisplayValue<Row extends TableRow>(
  value: unknown,
  column: TableColumn<Row>,
) {
  if (value === null || value === undefined) {
    return "";
  }

  if (column.type === "select") {
    return (
      column.options?.find((option) => option.value === String(value))?.label ??
      String(value)
    );
  }

  return String(value);
}
