import type { ReactNode } from "react";

export type KnownColumnDataType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "date";

export type ColumnDataType = string;

export type TableCellValue = any;

export type TableRow = {
  id: string;
  [columnId: string]: TableCellValue;
};

export type SelectOption = {
  label: string;
  value: string;
  token?: string;
};

export type BooleanLabels = {
  true: string;
  false: string;
};

export type TableFormatters<Row extends TableRow = TableRow> = {
  emptyValue?: ReactNode;
  booleanLabels?: BooleanLabels;
  number?: Intl.NumberFormat;
  formatValue?: (
    value: TableCellValue,
    row: Row,
    column: TableColumn<Row>,
  ) => ReactNode;
  formatPlainValue?: (
    value: TableCellValue,
    row: Row | null,
    column: TableColumn<Row>,
  ) => string;
  getValueToken?: (
    value: TableCellValue,
    row: Row,
    column: TableColumn<Row>,
  ) => string | null | undefined;
};

export type RowAction<Row extends TableRow = TableRow> = {
  id: string;
  label: string | ((row: Row) => string);
  icon?: ReactNode | ((row: Row) => ReactNode);
  onClick: (row: Row) => void;
};

export type TableMessages = {
  filtersLabel?: string;
  columnsLabel?: string;
  editLabel?: string;
  editingLabel?: string;
  resetEditsLabel?: string;
  saveEditsLabel?: string;
  clearAllLabel?: string;
  searchPlaceholder?: string;
  allOptionLabel?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  detailsLabel?: string;
  closeDetailsLabel?: string;
  actionsLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  loadErrorTitle?: string;
  retryLabel?: string;
  pageLabel?: string;
  pageOfLabel?: string;
  previousPageLabel?: string;
  nextPageLabel?: string;
};

export type TableSizingOptions = {
  headerTextMeasureFont?: string;
  cellTextMeasureFont?: string;
  textMeasureSafetyPx?: number;
};

export type ColumnFilterType =
  | "text"
  | "select"
  | "boolean"
  | "numberRange"
  | "dateRange";

export type FilterOperator = "contains" | "equals" | "gte" | "lte" | "between";

export type TableFilter = {
  operator: FilterOperator;
  value: string;
  valueTo?: string;
};

/**
 * Assignment column schema.
 *
 * Required fields keep their requested types: id/title/type are strings,
 * ordinalNo is a number, and width remains optional. Additional optional
 * metadata makes the table reusable across datasets by describing rendering,
 * editing, filtering, alignment, and select options next to each column.
 */
export type TableColumn<Row extends TableRow = TableRow> = {
  id: string;
  ordinalNo: number;
  title: string;
  type: ColumnDataType;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  editable?: boolean;
  filterable?: boolean;
  filterType?: ColumnFilterType;
  sortable?: boolean;
  options?: readonly SelectOption[];
  align?: "left" | "center" | "right";
  format?: (
    value: TableCellValue,
    row: Row,
    column: TableColumn<Row>,
  ) => string;
  token?: (
    value: TableCellValue,
    row: Row,
    column: TableColumn<Row>,
  ) => string | null | undefined;
  render?: (
    value: TableCellValue,
    row: Row,
    column: TableColumn<Row>,
  ) => ReactNode;
};

export type SortDirection = "asc" | "desc";

export type TableSort = {
  columnId: string;
  direction: SortDirection;
};

export type TableQuery = {
  searchText?: string;
  filters?: Record<string, TableFilter>;
  sort?: TableSort | null;
};

export type TableDataRequest = {
  startIndex: number;
  count: number;
  query?: TableQuery;
  excludeIds?: ReadonlySet<string>;
};

export type TableDataResponse<Row extends TableRow = TableRow> = {
  rows: Row[];
  totalRows: number;
};

export type TableDataSource<Row extends TableRow = TableRow> = {
  totalRows: number;
  getRows: (
    request: TableDataRequest,
  ) => TableDataResponse<Row> | Promise<TableDataResponse<Row>>;
};

export type TableInputData<Row extends TableRow = TableRow> = {
  columns: TableColumn<Row>[];
  data: Row[];
};

type TableBaseProps<Row extends TableRow = TableRow> = {
  title: string;
  columns: readonly TableColumn<Row>[];
  tableId?: string;
  columnWidthStorageKey?: string;
  pageSize?: number;
  rowHeight?: number;
  overscan?: number;
  formatters?: TableFormatters<Row>;
  messages?: TableMessages;
  sizing?: TableSizingOptions;
  getRowLabel?: (row: Row) => string;
  rowActions?: readonly RowAction<Row>[];
  enableRowDetails?: boolean;
  renderRowDetails?: (row: Row) => ReactNode;
  onSaveEdits?: (edits: EditMap) => void | Promise<void>;
  onResetEdits?: (edits: EditMap) => void;
  isSavingEdits?: boolean;
  onDeleteRow?: (row: Row) => void;
  onImportRows?: (rows: Record<string, unknown>[]) => void;
};

export type TableProps<Row extends TableRow = TableRow> =
  | (TableBaseProps<Row> & {
      data: readonly Row[];
      dataSource?: never;
    })
  | (TableBaseProps<Row> & {
      data?: never;
      dataSource: TableDataSource<Row>;
    });

export type CellEdit = {
  rowId: string;
  columnId: string;
  value: TableCellValue;
};

export type EditMap = Map<string, Map<string, TableCellValue>>;
