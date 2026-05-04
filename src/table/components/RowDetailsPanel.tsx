import { X } from "lucide-react";
import type { ReactNode } from "react";
import type {
  BooleanLabels,
  TableCellValue,
  TableColumn,
  TableFormatters,
  TableMessages,
  TableRow,
} from "../types";
import { formatTitleValue } from "./TableCells";

export function RowDetailsPanel<Row extends TableRow>({
  booleanLabels,
  columns,
  formatters,
  getResolvedValue,
  label,
  messages,
  numberFormatter,
  onClose,
  renderRowDetails,
  row,
}: {
  booleanLabels: BooleanLabels;
  columns: readonly TableColumn<Row>[];
  formatters: TableFormatters<Row> | undefined;
  getResolvedValue: (row: Row, column: TableColumn<Row>) => TableCellValue;
  label: string;
  messages: Required<TableMessages>;
  numberFormatter: Intl.NumberFormat;
  onClose: () => void;
  renderRowDetails?: (row: Row) => ReactNode;
  row: Row;
}) {
  return (
    <aside
      aria-label={messages.detailsLabel}
      className="details-panel"
      role="complementary"
    >
      <div className="details-panel-head">
        <div>
          <span>{messages.detailsLabel}</span>
          <strong>{label}</strong>
        </div>
        <button
          aria-label={messages.closeDetailsLabel}
          className="icon-button"
          onClick={onClose}
          type="button"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      {renderRowDetails ? (
        renderRowDetails(row)
      ) : (
        <dl className="details-list">
          {columns.map((column) => (
            <div key={column.id}>
              <dt>{column.title}</dt>
              <dd>
                {formatTitleValue(
                  getResolvedValue(row, column),
                  row,
                  column,
                  formatters,
                  booleanLabels,
                  numberFormatter,
                ) || "-"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}
