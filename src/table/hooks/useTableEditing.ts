import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { coerceDraftValue } from "../components/TableCells";
import {
  areCellValuesEqual,
  cloneEditMap,
  countEdits,
  getErrorMessage,
  hasEdit,
  mergeEditMaps,
} from "../utils/TableUtils";
import type { EditMap, TableCellValue, TableColumn, TableRow } from "../types";

export type EditingCell = {
  rowId: string;
  columnId: string;
  committedValue: TableCellValue;
} | null;

export type FocusedCell = {
  rowId: string;
  columnId: string;
} | null;

type UseTableEditingInput<Row extends TableRow> = {
  applyLocalEdits: (edits: EditMap) => void;
  columnsById: Map<string, TableColumn<Row>>;
  editModeButtonRef: RefObject<HTMLButtonElement | null>;
  isArrayBacked: boolean;
  isSavingEdits: boolean;
  onResetEdits: ((edits: EditMap) => void) | undefined;
  onSaveEdits: ((edits: EditMap) => void | Promise<void>) | undefined;
  setLoadError: (error: string | null) => void;
};

export function useTableEditing<Row extends TableRow>({
  applyLocalEdits,
  columnsById,
  editModeButtonRef,
  isArrayBacked,
  isSavingEdits,
  onResetEdits,
  onSaveEdits,
  setLoadError,
}: UseTableEditingInput<Row>) {
  const lastEditedCellRef = useRef<FocusedCell>(null);
  const editingCellRef = useRef<EditingCell>(null);
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  const [savedEdits, setSavedEdits] = useState<EditMap>(() => new Map());
  const [pendingEdits, setPendingEdits] = useState<EditMap>(() => new Map());
  const [isSavingLocalEdits, setIsSavingLocalEdits] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [draftValue, setDraftValue] = useState<TableCellValue>("");
  const [focusedCell, setFocusedCell] = useState<FocusedCell>(null);

  const pendingEditCount = useMemo(
    () => countEdits(pendingEdits),
    [pendingEdits],
  );
  const isSaving = isSavingEdits || isSavingLocalEdits;

  const resetAllEdits = useCallback(() => {
    setSavedEdits(new Map());
    setPendingEdits(new Map());
    editingCellRef.current = null;
    setEditingCell(null);
    setDraftValue("");
  }, []);

  const setPendingCell = useCallback(
    (
      rowId: string,
      column: TableColumn<Row>,
      value: TableCellValue,
      committedValue: TableCellValue,
    ) => {
      setPendingEdits((current) => {
        const next = cloneEditMap(current);
        const rowEdits = new Map(next.get(rowId));

        if (areCellValuesEqual(column, value, committedValue)) {
          rowEdits.delete(column.id);
        } else {
          rowEdits.set(column.id, value);
        }

        if (rowEdits.size === 0) {
          next.delete(rowId);
        } else {
          next.set(rowId, rowEdits);
        }

        return next;
      });
    },
    [],
  );

  const getCommittedValue = useCallback(
    (row: Row, column: TableColumn<Row>) => {
      if (hasEdit(savedEdits, row.id, column.id)) {
        return savedEdits.get(row.id)!.get(column.id);
      }

      return row[column.id];
    },
    [savedEdits],
  );

  const getResolvedValue = useCallback(
    (row: Row, column: TableColumn<Row>) => {
      if (hasEdit(pendingEdits, row.id, column.id)) {
        return pendingEdits.get(row.id)!.get(column.id);
      }

      return getCommittedValue(row, column);
    },
    [getCommittedValue, pendingEdits],
  );

  const focusCell = useCallback((cell: FocusedCell) => {
    if (!cell) {
      return;
    }

    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-cell-id="${cell.rowId}:${cell.columnId}"]`,
      );

      target?.focus();
    }, 0);
  }, []);

  const cancelEditing = useCallback(() => {
    const lastCell = lastEditedCellRef.current;
    editingCellRef.current = null;
    setEditingCell(null);
    setDraftValue("");
    focusCell(lastCell);
  }, [focusCell]);

  const startEditing = useCallback(
    (row: Row, column: TableColumn<Row>) => {
      if (!isEditingEnabled || column.editable === false) {
        return;
      }

      const currentValue = getResolvedValue(row, column);
      const committedValue = getCommittedValue(row, column);
      lastEditedCellRef.current = {
        rowId: row.id,
        columnId: column.id,
      };

      if (column.type === "boolean") {
        setPendingCell(row.id, column, !Boolean(currentValue), committedValue);
        focusCell(lastEditedCellRef.current);
        return;
      }

      const nextEditingCell = {
        rowId: row.id,
        columnId: column.id,
        committedValue,
      };
      editingCellRef.current = nextEditingCell;
      setEditingCell(nextEditingCell);
      setDraftValue(currentValue ?? "");
    },
    [
      focusCell,
      getCommittedValue,
      getResolvedValue,
      isEditingEnabled,
      setPendingCell,
    ],
  );

  const commitEditing = useCallback(
    (nextValue = draftValue) => {
      const activeEditingCell = editingCellRef.current ?? editingCell;

      if (!activeEditingCell) {
        return;
      }

      const column = columnsById.get(activeEditingCell.columnId);
      if (!column) {
        cancelEditing();
        return;
      }

      setPendingCell(
        activeEditingCell.rowId,
        column,
        coerceDraftValue(column, nextValue),
        activeEditingCell.committedValue,
      );
      editingCellRef.current = null;
      setEditingCell(null);
      setDraftValue("");
      focusCell(lastEditedCellRef.current);
    },
    [
      cancelEditing,
      columnsById,
      draftValue,
      editingCell,
      focusCell,
      setPendingCell,
    ],
  );

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitEditing();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelEditing();
      }
    },
    [cancelEditing, commitEditing],
  );

  const savePendingEdits = useCallback(async () => {
    if (pendingEditCount === 0 || isSaving) {
      return;
    }

    const editsToSave = cloneEditMap(pendingEdits);
    setIsSavingLocalEdits(true);

    try {
      await onSaveEdits?.(editsToSave);
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error));
      return;
    } finally {
      setIsSavingLocalEdits(false);
    }

    if (isArrayBacked) {
      applyLocalEdits(editsToSave);
      setSavedEdits(new Map());
    } else {
      setSavedEdits((current) => mergeEditMaps(current, editsToSave));
    }

    setPendingEdits(new Map());
    editingCellRef.current = null;
    setEditingCell(null);
    setDraftValue("");
    editModeButtonRef.current?.focus();
  }, [
    applyLocalEdits,
    editModeButtonRef,
    isArrayBacked,
    isSaving,
    onSaveEdits,
    pendingEditCount,
    pendingEdits,
    setLoadError,
  ]);

  const resetPendingEdits = useCallback(() => {
    onResetEdits?.(cloneEditMap(pendingEdits));
    setPendingEdits(new Map());
    editingCellRef.current = null;
    setEditingCell(null);
    setDraftValue("");
    editModeButtonRef.current?.focus();
  }, [editModeButtonRef, onResetEdits, pendingEdits]);

  const toggleEditingMode = useCallback(() => {
    setIsEditingEnabled((current) => {
      const next = !current;

      if (!next) {
        editingCellRef.current = null;
        setEditingCell(null);
        setDraftValue("");
      }

      return next;
    });
  }, []);

  return {
    cancelEditing,
    commitEditing,
    draftValue,
    editingCell,
    focusedCell,
    focusCell,
    getResolvedValue,
    handleEditorKeyDown,
    isEditingEnabled,
    isSaving,
    pendingEditCount,
    pendingEdits,
    resetAllEdits,
    resetPendingEdits,
    savePendingEdits,
    savedEdits,
    setDraftValue,
    setFocusedCell,
    startEditing,
    toggleEditingMode,
  };
}
