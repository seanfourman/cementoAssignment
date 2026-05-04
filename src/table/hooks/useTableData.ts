import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createArrayDataSource } from "../data/arrayDataSource";
import { useVirtualRows } from "./useVirtualRows";
import { clamp, getErrorMessage } from "../utils/TableUtils";
import type {
  EditMap,
  TableColumn,
  TableDataSource,
  TableQuery,
  TableRow,
} from "../types";

type UseTableDataInput<Row extends TableRow> = {
  bodyRef: RefObject<HTMLDivElement | null>;
  data: readonly Row[] | undefined;
  dataSource: TableDataSource<Row> | undefined;
  deletedRowIds: Set<string>;
  orderedColumns: readonly TableColumn<Row>[];
  overscan: number;
  pageSize: number;
  query: TableQuery;
  queryKey: string;
  rowHeight: number;
};

export function useTableData<Row extends TableRow>({
  bodyRef,
  data,
  dataSource,
  deletedRowIds,
  orderedColumns,
  overscan,
  pageSize,
  query,
  queryKey,
  rowHeight,
}: UseTableDataInput<Row>) {
  const activeRequestKeyRef = useRef("");
  const inFlightRowsRef = useRef<Set<number>>(new Set());
  const isArrayBacked = data !== undefined;
  const [localRows, setLocalRows] = useState<Row[]>(() =>
    data ? [...data] : [],
  );
  const [sourceVersion, setSourceVersion] = useState(0);
  const resolvedDataSource = useMemo(() => {
    if (isArrayBacked) {
      return createArrayDataSource(localRows, orderedColumns);
    }

    if (dataSource) {
      return dataSource;
    }

    throw new Error("Table requires either data or dataSource.");
  }, [dataSource, isArrayBacked, localRows, orderedColumns]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(520);
  const [rowCache, setRowCache] = useState<Map<number, Row>>(() => new Map());
  const [resultTotalRows, setResultTotalRows] = useState(
    resolvedDataSource.totalRows,
  );
  const [loadingRequests, setLoadingRequests] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const pageCount = Math.max(1, Math.ceil(resultTotalRows / pageSize));
  const pageStartIndex = pageIndex * pageSize;
  const pageRowCount = Math.max(
    0,
    Math.min(pageSize, resultTotalRows - pageStartIndex),
  );
  const deletedKey =
    deletedRowIds.size > 0 ? [...deletedRowIds].sort().join(",") : "";
  const requestKey = `${sourceVersion}:${pageStartIndex}:${pageSize}:${queryKey}:${retryToken}:${deletedKey}`;

  const virtualRows = useVirtualRows({
    rowCount: pageRowCount,
    rowHeight,
    viewportHeight,
    scrollTop,
    overscan,
  });

  const loadCurrentPageRows = useCallback(async () => {
    if (pageRowCount === 0) {
      return [];
    }

    const activeKey = requestKey;
    setLoadingRequests((current) => current + 1);
    setLoadError(null);

    try {
      const response = await Promise.resolve(
        resolvedDataSource.getRows({
          startIndex: pageStartIndex,
          count: pageRowCount,
          query,
          excludeIds: deletedRowIds.size > 0 ? deletedRowIds : undefined,
        }),
      );

      if (activeRequestKeyRef.current !== activeKey) {
        return [];
      }

      setResultTotalRows(response.totalRows);
      setRowCache((current) => {
        const next = new Map(current);
        response.rows.forEach((row, index) => {
          next.set(index, row);
        });
        return next;
      });

      return response.rows;
    } catch (error: unknown) {
      if (activeRequestKeyRef.current === activeKey) {
        setLoadError(getErrorMessage(error));
      }

      return [];
    } finally {
      setLoadingRequests((current) => Math.max(0, current - 1));
    }
  }, [
    deletedRowIds,
    pageRowCount,
    pageStartIndex,
    query,
    requestKey,
    resolvedDataSource,
  ]);

  const replaceLocalRows = useCallback((rows: readonly Row[]) => {
    setLocalRows([...rows]);
    setSourceVersion((current) => current + 1);
  }, []);

  const refreshDataSource = useCallback(() => {
    setSourceVersion((current) => current + 1);
  }, []);

  const applyLocalEdits = useCallback((edits: EditMap) => {
    setLocalRows((current) => applyEditMapToRows(current, edits));
    setSourceVersion((current) => current + 1);
  }, []);

  const commitPageInput = useCallback(() => {
    const parsedPage = Number(pageInput.replace(/,/g, ""));
    const nextPageIndex = Number.isFinite(parsedPage)
      ? clamp(Math.floor(parsedPage) - 1, 0, pageCount - 1)
      : pageIndex;

    setPageIndex(nextPageIndex);
    setPageInput(String(nextPageIndex + 1));
  }, [pageCount, pageIndex, pageInput]);

  const retryLoad = useCallback(() => {
    setRetryToken((current) => current + 1);
  }, []);

  useEffect(() => {
    setPageIndex(0);
    setPageInput("1");
    setResultTotalRows(resolvedDataSource.totalRows);
  }, [queryKey, resolvedDataSource.totalRows, sourceVersion]);

  useEffect(() => {
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setPageInput(String(pageIndex + 1));
  }, [pageIndex]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }

    const updateViewportHeight = () => {
      setViewportHeight(body.clientHeight);
    };

    updateViewportHeight();

    const resizeObserver = new ResizeObserver(updateViewportHeight);
    resizeObserver.observe(body);

    return () => {
      resizeObserver.disconnect();
    };
  }, [bodyRef]);

  useEffect(() => {
    activeRequestKeyRef.current = requestKey;
    inFlightRowsRef.current.clear();
    setRowCache(new Map());
    setScrollTop(0);
    setLoadError(null);

    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [bodyRef, requestKey]);

  useEffect(() => {
    if (pageRowCount === 0 || virtualRows.endIndex < virtualRows.startIndex) {
      return;
    }

    let firstMissing = -1;
    let lastMissing = -1;

    for (
      let index = virtualRows.startIndex;
      index <= virtualRows.endIndex;
      index += 1
    ) {
      if (!rowCache.has(index) && !inFlightRowsRef.current.has(index)) {
        if (firstMissing === -1) {
          firstMissing = index;
        }

        lastMissing = index;
      }
    }

    if (firstMissing === -1) {
      return;
    }

    for (let index = firstMissing; index <= lastMissing; index += 1) {
      inFlightRowsRef.current.add(index);
    }

    const activeKey = requestKey;
    const requestStart = firstMissing;
    const requestCount = lastMissing - firstMissing + 1;

    setLoadingRequests((current) => current + 1);
    setLoadError(null);

    Promise.resolve(
      resolvedDataSource.getRows({
        startIndex: pageStartIndex + requestStart,
        count: requestCount,
        query,
        excludeIds: deletedRowIds.size > 0 ? deletedRowIds : undefined,
      }),
    )
      .then((response) => {
        if (activeRequestKeyRef.current !== activeKey) {
          return;
        }

        setResultTotalRows(response.totalRows);
        setRowCache((current) => {
          const next = new Map(current);
          response.rows.forEach((row, offset) => {
            next.set(requestStart + offset, row);
          });
          return next;
        });
      })
      .catch((error: unknown) => {
        if (activeRequestKeyRef.current !== activeKey) {
          return;
        }

        setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (activeRequestKeyRef.current === activeKey) {
          for (
            let index = requestStart;
            index < requestStart + requestCount;
            index += 1
          ) {
            inFlightRowsRef.current.delete(index);
          }
        }

        setLoadingRequests((current) => Math.max(0, current - 1));
      });
  }, [
    deletedRowIds,
    pageRowCount,
    pageStartIndex,
    query,
    requestKey,
    resolvedDataSource,
    rowCache,
    virtualRows.endIndex,
    virtualRows.startIndex,
  ]);

  const isInitialLoading = loadingRequests > 0 && rowCache.size === 0;
  const isEmpty = !isInitialLoading && !loadError && resultTotalRows === 0;
  const pageStartDisplay = resultTotalRows === 0 ? 0 : pageStartIndex + 1;
  const pageEndDisplay = Math.min(
    resultTotalRows,
    pageStartIndex + pageRowCount,
  );

  return {
    applyLocalEdits,
    commitPageInput,
    isArrayBacked,
    isEmpty,
    loadCurrentPageRows,
    loadError,
    loadingRequests,
    pageCount,
    pageEndDisplay,
    pageIndex,
    pageInput,
    pageRowCount,
    pageStartDisplay,
    pageStartIndex,
    refreshDataSource,
    replaceLocalRows,
    resolvedDataSource,
    resultTotalRows,
    retryLoad,
    rowCache,
    setLoadError,
    setPageIndex,
    setPageInput,
    setScrollTop,
    sourceVersion,
    virtualRows,
  };
}

function applyEditMapToRows<Row extends TableRow>(
  rows: readonly Row[],
  edits: EditMap,
) {
  return rows.map((row) => {
    const rowEdits = edits.get(row.id);

    if (!rowEdits?.size) {
      return row;
    }

    return {
      ...row,
      ...Object.fromEntries(rowEdits),
    } as Row;
  });
}
