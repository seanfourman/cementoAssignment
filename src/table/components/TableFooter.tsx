import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { TableMessages } from "../types";

export function TableFooter({
  loading,
  messages,
  numberFormatter,
  onNextPage,
  onPageInputBlur,
  onPageInputChange,
  onPageInputKeyDown,
  onPreviousPage,
  pageCount,
  pageEndDisplay,
  pageIndex,
  pageInput,
  pageStartDisplay,
  resultTotalRows,
}: {
  loading: boolean;
  messages: Required<TableMessages>;
  numberFormatter: Intl.NumberFormat;
  onNextPage: () => void;
  onPageInputBlur: () => void;
  onPageInputChange: (value: string) => void;
  onPageInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPreviousPage: () => void;
  pageCount: number;
  pageEndDisplay: number;
  pageIndex: number;
  pageInput: string;
  pageStartDisplay: number;
  resultTotalRows: number;
}) {
  return (
    <div className="table-footer">
      <div className="row-range">
        {numberFormatter.format(pageStartDisplay)}-
        {numberFormatter.format(pageEndDisplay)} /{" "}
        {numberFormatter.format(resultTotalRows)}
      </div>

      <div className="pagination">
        <button
          aria-label={messages.previousPageLabel}
          className="icon-button"
          disabled={pageIndex === 0}
          onClick={onPreviousPage}
          type="button"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        <label className="page-input">
          <span>{messages.pageLabel}</span>
          <input
            inputMode="numeric"
            onBlur={onPageInputBlur}
            onChange={(event) => onPageInputChange(event.target.value)}
            onKeyDown={onPageInputKeyDown}
            value={pageInput}
          />
          <span>
            {messages.pageOfLabel} {numberFormatter.format(pageCount)}
          </span>
        </label>

        <button
          aria-label={messages.nextPageLabel}
          className="icon-button"
          disabled={pageIndex >= pageCount - 1}
          onClick={onNextPage}
          type="button"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
