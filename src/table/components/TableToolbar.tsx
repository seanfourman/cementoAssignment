import {
  Columns3,
  Pencil,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { useRef, type RefObject } from "react";
import type {
  BooleanLabels,
  TableColumn,
  TableFilter,
  TableMessages,
  TableRow,
} from "../types";
import {
  FilterChip,
  FilterControl,
  getFilterColorClass,
  getFilterOptionLabel,
  isActiveFilter,
} from "./TableControls";

export function TableToolbar<Row extends TableRow>({
  activeQueryCount,
  booleanLabels,
  clearFilters,
  columnsById,
  filterableColumns,
  filters,
  fitAllColumnsToContent,
  hasActiveQuery,
  isColumnMenuOpen,
  isEditingEnabled,
  isFilterMenuOpen,
  isSaving,
  messages,
  onImport,
  onToggleColumnMenu,
  onToggleEditMode,
  onToggleFilterMenu,
  orderedColumns,
  pendingEditCount,
  removeFilter,
  removeSearch,
  removeSort,
  resetColumnWidths,
  resetPendingEdits,
  savePendingEdits,
  searchText,
  setSearchText,
  showAllColumns,
  sortColumnId,
  sortDirection,
  title,
  toggleColumn,
  updateFilter,
  visibleColumnIds,
  editModeButtonRef,
}: {
  activeQueryCount: number;
  booleanLabels: BooleanLabels;
  clearFilters: () => void;
  columnsById: Map<string, TableColumn<Row>>;
  filterableColumns: readonly TableColumn<Row>[];
  filters: Record<string, TableFilter>;
  fitAllColumnsToContent: () => void;
  hasActiveQuery: boolean;
  isColumnMenuOpen: boolean;
  isEditingEnabled: boolean;
  isFilterMenuOpen: boolean;
  isSaving: boolean;
  messages: Required<TableMessages>;
  onImport: ((file: File) => void) | undefined;
  onToggleColumnMenu: () => void;
  onToggleEditMode: () => void;
  onToggleFilterMenu: () => void;
  orderedColumns: readonly TableColumn<Row>[];
  pendingEditCount: number;
  removeFilter: (columnId: string) => void;
  removeSearch: () => void;
  removeSort: () => void;
  resetColumnWidths: () => void;
  resetPendingEdits: () => void;
  savePendingEdits: () => void;
  searchText: string;
  setSearchText: (value: string) => void;
  showAllColumns: () => void;
  sortColumnId: string;
  sortDirection: string;
  title: string;
  toggleColumn: (columnId: string) => void;
  updateFilter: (columnId: string, filter: TableFilter | null) => void;
  visibleColumnIds: Set<string>;
  editModeButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="table-toolbar">
        <div className="toolbar-chips">
          <div className="toolbar-chips-inner">
            {searchText.trim() ? (
              <FilterChip
                label={`Search: ${searchText.trim()}`}
                onRemove={removeSearch}
              />
            ) : null}

            {Object.entries(filters)
              .filter(([, filter]) => isActiveFilter(filter))
              .map(([columnId, filter]) => {
                const column = columnsById.get(columnId);
                if (!column) return null;
                return (
                  <FilterChip
                    key={columnId}
                    colorClass={getFilterColorClass(column, filter)}
                    label={`${column.title}: ${getFilterOptionLabel(column, filter, booleanLabels)}`}
                    onRemove={() => removeFilter(columnId)}
                  />
                );
              })}

            {sortColumnId ? (
              <FilterChip
                label={`Sort: ${columnsById.get(sortColumnId)?.title ?? sortColumnId} ${sortDirection === "asc" ? "↑" : "↓"}`}
                onRemove={removeSort}
              />
            ) : null}

            {activeQueryCount > 0 ? (
              <button
                className="clear-filter-link"
                onClick={clearFilters}
                type="button"
              >
                {messages.clearAllLabel}
              </button>
            ) : null}
          </div>
        </div>

        <div className="table-actions">
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">{messages.searchPlaceholder}</span>
            <input
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={messages.searchPlaceholder}
              value={searchText}
            />
          </label>

          <div className="filter-menu-wrap">
            <button
              aria-expanded={isFilterMenuOpen}
              className={`icon-button text-button ${
                activeQueryCount > 0 ? "has-active-filters" : ""
              }`}
              onClick={onToggleFilterMenu}
              type="button"
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
              {messages.filtersLabel}
              {activeQueryCount > 0 ? (
                <span className="filter-count">{activeQueryCount}</span>
              ) : null}
            </button>

            {isFilterMenuOpen ? (
              <div
                className="filter-menu"
                role="dialog"
                aria-label={messages.filtersLabel}
              >
                <div className="filter-menu-head">
                  <strong>{messages.filtersLabel}</strong>
                  <button
                    disabled={!hasActiveQuery}
                    onClick={clearFilters}
                    type="button"
                  >
                    {messages.clearAllLabel}
                  </button>
                </div>

                <div className="filter-panel">
                  <div className="filter-group">
                    {filterableColumns.map((column) => (
                      <FilterControl
                        booleanLabels={booleanLabels}
                        column={column}
                        filter={filters[column.id]}
                        key={column.id}
                        messages={messages}
                        onChange={(filter) => updateFilter(column.id, filter)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="column-menu-wrap">
            <button
              aria-expanded={isColumnMenuOpen}
              className="icon-button text-button"
              onClick={onToggleColumnMenu}
              type="button"
            >
              <Columns3 size={18} aria-hidden="true" />
              {messages.columnsLabel}
            </button>

            {isColumnMenuOpen ? (
              <div
                className="column-menu"
                role="dialog"
                aria-label={messages.columnsLabel}
              >
                <div className="column-menu-head">
                  <strong>{messages.columnsLabel}</strong>
                  <div className="column-menu-actions">
                    <button type="button" onClick={fitAllColumnsToContent}>
                      Fit
                    </button>
                    <button type="button" onClick={resetColumnWidths}>
                      Reset
                    </button>
                    <button type="button" onClick={showAllColumns}>
                      All
                    </button>
                  </div>
                </div>

                <div className="column-list">
                  {orderedColumns.map((column) => (
                    <label className="column-option" key={column.id}>
                      <input
                        checked={visibleColumnIds.has(column.id)}
                        onChange={() => toggleColumn(column.id)}
                        type="checkbox"
                      />
                      <span>{column.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {onImport ? (
            <>
              <input
                accept=".xlsx,.xls,.csv"
                ref={importInputRef}
                style={{ display: "none" }}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onImport(file);
                    e.target.value = "";
                  }
                }}
              />
              <button
                className="icon-button text-button"
                onClick={() => importInputRef.current?.click()}
                title="Import from file"
                type="button"
              >
                <Upload size={17} aria-hidden="true" />
                Import
              </button>
            </>
          ) : null}

          <div
            className={`edit-control-group ${
              isEditingEnabled ? "is-expanded" : ""
            }`}
          >
            <button
              aria-label={
                isEditingEnabled ? "Turn edit mode off" : "Turn edit mode on"
              }
              aria-pressed={isEditingEnabled}
              className={`icon-button text-button edit-mode-button ${
                isEditingEnabled ? "is-active" : ""
              }`}
              onClick={onToggleEditMode}
              ref={editModeButtonRef}
              type="button"
            >
              <Pencil size={17} aria-hidden="true" />
              {isEditingEnabled ? messages.editingLabel : messages.editLabel}
            </button>

            <div
              className="edit-commit-actions"
              aria-hidden={!isEditingEnabled}
            >
              <button
                aria-label={messages.resetEditsLabel}
                className="icon-button edit-action-button"
                disabled={
                  !isEditingEnabled || pendingEditCount === 0 || isSaving
                }
                onClick={resetPendingEdits}
                tabIndex={isEditingEnabled ? 0 : -1}
                title={messages.resetEditsLabel}
                type="button"
              >
                <RotateCcw size={17} aria-hidden="true" />
              </button>

              <button
                aria-label={messages.saveEditsLabel}
                className="primary-button edit-action-button"
                disabled={
                  !isEditingEnabled || pendingEditCount === 0 || isSaving
                }
                onClick={savePendingEdits}
                tabIndex={isEditingEnabled ? 0 : -1}
                title={messages.saveEditsLabel}
                type="button"
              >
                <Save size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
