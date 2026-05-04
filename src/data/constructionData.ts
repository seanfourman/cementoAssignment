import type {
  TableCellValue,
  TableColumn,
  TableDataRequest,
  TableDataResponse,
  TableDataSource,
  TableFilter,
  TableQuery,
  TableRow,
} from "../table/types";

export type ConstructionRow = TableRow & {
  project: string;
  microProject: string;
  unit: string;
  building: string;
  floor: number;
  trade: string;
  checklist: string;
  fieldOwner: string;
  status: string;
  complianceRequired: boolean;
  delayRisk: string;
  openIssues: number;
  qualityScore: number;
  dueDate: string;
};

const projects = [
  "Riverside Residences",
  "Bursa Heights",
  "Harbor View Hotel",
  "Central Park Lofts",
];
const buildings = ["North Tower", "South Tower", "Atrium", "Garden Wing"];
const trades = [
  "Drywall",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Flooring",
  "Facade",
];
const checklists = [
  "Rough-in QA",
  "Pre-inspection",
  "Punch list",
  "Handover",
  "Safety walk",
  "Regulatory signoff",
];
const fieldOwners = [
  "N. Cohen",
  "M. Levy",
  "D. Miller",
  "A. Rosen",
  "T. Katz",
  "L. Green",
];
const statuses = [
  "Not started",
  "In progress",
  "Inspection",
  "Blocked",
  "Complete",
];
const delayRisks = ["Low", "Medium", "High", "Critical"];
const floors = Array.from({ length: 42 }, (_, index) => String(index + 1));
const QUERY_CHUNK_SIZE = 25_000;
const QUERY_DELAY_MS = 80;
const MAX_QUERY_CACHE_ENTRIES = 8;

const statusSortRank = createRank(statuses);
const delayRiskSortRank = createRank(delayRisks);

function createRank(values: readonly string[]) {
  return new Map(values.map((value, index) => [value, index]));
}

export const constructionColumns: TableColumn<ConstructionRow>[] = [
  {
    id: "project",
    ordinalNo: 1,
    title: "Project",
    type: "select",
    width: 178,
    filterable: true,
    options: projects.map((value) => ({ label: value, value })),
  },
  {
    id: "microProject",
    ordinalNo: 2,
    title: "Micro Project",
    type: "string",
    width: 212,
  },
  {
    id: "building",
    ordinalNo: 3,
    title: "Building",
    type: "select",
    width: 154,
    filterable: true,
    options: buildings.map((value) => ({ label: value, value })),
  },
  {
    id: "floor",
    ordinalNo: 4,
    title: "Floor",
    type: "number",
    width: 92,
    align: "right",
    filterable: true,
    options: floors.map((value) => ({ label: value, value })),
  },
  {
    id: "unit",
    ordinalNo: 5,
    title: "Unit",
    type: "string",
    width: 118,
  },
  {
    id: "trade",
    ordinalNo: 6,
    title: "Trade",
    type: "select",
    width: 142,
    options: trades.map((value) => ({ label: value, value })),
  },
  {
    id: "checklist",
    ordinalNo: 7,
    title: "Checklist",
    type: "select",
    width: 166,
    options: checklists.map((value) => ({ label: value, value })),
  },
  {
    id: "fieldOwner",
    ordinalNo: 8,
    title: "Field Owner",
    type: "string",
    width: 136,
  },
  {
    id: "status",
    ordinalNo: 9,
    title: "Status",
    type: "select",
    width: 142,
    filterable: true,
    options: statuses.map((value) => ({ label: value, value })),
  },
  {
    id: "complianceRequired",
    ordinalNo: 10,
    title: "Compliance",
    type: "boolean",
    width: 118,
    align: "center",
    filterable: true,
    options: [
      { label: "Required", value: "true" },
      { label: "Not required", value: "false" },
    ],
  },
  {
    id: "delayRisk",
    ordinalNo: 11,
    title: "Delay Risk",
    type: "select",
    width: 126,
    filterable: true,
    options: delayRisks.map((value) => ({ label: value, value })),
  },
  {
    id: "openIssues",
    ordinalNo: 12,
    title: "Open Issues",
    type: "number",
    width: 132,
    align: "right",
  },
  {
    id: "qualityScore",
    ordinalNo: 13,
    title: "QA Score",
    type: "number",
    width: 112,
    align: "right",
  },
  {
    id: "dueDate",
    ordinalNo: 14,
    title: "Due Date",
    type: "date",
    width: 138,
  },
];

export function createConstructionDataSource(
  totalRows: number,
): TableDataSource<ConstructionRow> {
  const indexCache = new Map<string, number[]>();

  return {
    totalRows,
    async getRows(request) {
      await delay(QUERY_DELAY_MS);
      return getConstructionRows(totalRows, request, indexCache);
    },
  };
}

export function createConstructionRows(totalRows: number) {
  return createRowsByIndex(totalRows, 0, totalRows);
}

async function getConstructionRows(
  totalRows: number,
  request: TableDataRequest,
  indexCache: Map<string, number[]>,
): Promise<TableDataResponse<ConstructionRow>> {
  const query = normalizeQuery(request.query);
  const queryKey = getQueryKey(query);
  const hasQuery = queryKey !== "default";
  const safeStart = Math.max(0, request.startIndex);
  const safeCount = Math.max(0, request.count);
  const excludeIds = request.excludeIds;

  const isExcluded = excludeIds?.size
    ? (index: number) => excludeIds.has(`row-${index + 1}`)
    : () => false;

  if (!hasQuery) {
    if (!excludeIds?.size) {
      return {
        totalRows,
        rows: createRowsByIndex(totalRows, safeStart, safeCount),
      };
    }
    // Convert excluded IDs to a sorted index set so we can offset the start quickly
    const excIndices = [...excludeIds]
      .map((id) => parseInt(id.replace("row-", ""), 10) - 1)
      .filter((i) => i >= 0 && i < totalRows)
      .sort((a, b) => a - b);

    // Count how many excluded indices fall before the effective start
    let rawIndex = safeStart;
    for (const excIdx of excIndices) {
      if (excIdx <= rawIndex) rawIndex += 1;
    }

    const rows: ConstructionRow[] = [];
    for (; rawIndex < totalRows && rows.length < safeCount; rawIndex += 1) {
      if (isExcluded(rawIndex)) continue;
      rows.push(createConstructionRow(rawIndex));
    }
    return { totalRows: totalRows - excIndices.length, rows };
  }

  let matchingIndexes = indexCache.get(queryKey);

  if (!matchingIndexes) {
    matchingIndexes = await createMatchingIndexes(totalRows, query);
    indexCache.set(queryKey, matchingIndexes);
    trimIndexCache(indexCache);
  }

  const filtered = excludeIds?.size
    ? matchingIndexes.filter((index) => !isExcluded(index))
    : matchingIndexes;

  const rows = filtered
    .slice(safeStart, safeStart + safeCount)
    .map((index) => createConstructionRow(index));

  return {
    totalRows: filtered.length,
    rows,
  };
}

function createRowsByIndex(
  totalRows: number,
  startIndex: number,
  count: number,
) {
  const safeCount = Math.max(0, Math.min(count, totalRows - startIndex));
  const rows: ConstructionRow[] = new Array(safeCount);

  for (let offset = 0; offset < safeCount; offset += 1) {
    rows[offset] = createConstructionRow(startIndex + offset);
  }

  return rows;
}

async function createMatchingIndexes(totalRows: number, query: TableQuery) {
  const matchingIndexes: number[] = [];
  const sortColumnId = query.sort?.columnId;
  const buckets = sortColumnId ? createSortBuckets(sortColumnId) : null;

  // This demo data source simulates server-side filtering/sorting over generated
  // data. The table only receives the requested range and never renders/scans
  // the full data set itself.
  for (let index = 0; index < totalRows; index += 1) {
    if (matchesQueryIndex(index, query)) {
      if (buckets && sortColumnId) {
        buckets[getSortBucket(index, sortColumnId)].push(index);
      } else {
        matchingIndexes.push(index);
      }
    }

    if (index > 0 && index % QUERY_CHUNK_SIZE === 0) {
      await yieldToBrowser();
    }
  }

  if (query.sort) {
    if (buckets) {
      const orderedBuckets =
        query.sort.direction === "desc" ? [...buckets].reverse() : buckets;

      return orderedBuckets.flat();
    }

    return query.sort.direction === "desc"
      ? matchingIndexes.reverse()
      : matchingIndexes;
  }

  return matchingIndexes;
}

function getRowSearchString(index: number) {
  return constructionColumns
    .map((column) => String(getIndexValue(index, column.id) ?? ""))
    .join(" ")
    .toLowerCase();
}

function matchesQueryIndex(index: number, query: TableQuery) {
  const searchText = query.searchText?.trim().toLowerCase();

  if (searchText && !getRowSearchString(index).includes(searchText)) {
    return false;
  }

  const filters = query.filters ?? {};

  return Object.entries(filters).every(([columnId, filter]) => {
    if (!filter.value && !filter.valueTo) {
      return true;
    }

    return matchesFilter(getIndexValue(index, columnId), filter);
  });
}

function matchesFilter(value: TableCellValue, filter: TableFilter) {
  const normalizedValue = String(value ?? "").toLowerCase();
  const filterValue = filter.value.toLowerCase();

  if (filter.operator === "contains") {
    return normalizedValue.includes(filterValue);
  }

  if (filter.operator === "equals") {
    return String(value ?? "") === filter.value;
  }

  if (filter.operator === "gte") {
    return compareFilterValues(value, filter.value) >= 0;
  }

  if (filter.operator === "lte") {
    return compareFilterValues(value, filter.value) <= 0;
  }

  return (
    compareFilterValues(value, filter.value) >= 0 &&
    compareFilterValues(value, filter.valueTo ?? filter.value) <= 0
  );
}

function compareFilterValues(value: TableCellValue, filterValue: string) {
  const numericValue = Number(value);
  const numericFilter = Number(filterValue);

  if (Number.isFinite(numericValue) && Number.isFinite(numericFilter)) {
    return numericValue - numericFilter;
  }

  return String(value ?? "").localeCompare(filterValue);
}

function createSortBuckets(columnId: string) {
  const bucketCount = getSortBucketCount(columnId);

  if (bucketCount === null) {
    return null;
  }

  return Array.from({ length: bucketCount }, () => [] as number[]);
}

function getSortBucketCount(columnId: string) {
  if (columnId === "project") {
    return projects.length;
  }

  if (columnId === "building") {
    return buildings.length;
  }

  if (columnId === "floor") {
    return 42;
  }

  if (columnId === "trade") {
    return trades.length;
  }

  if (columnId === "checklist") {
    return checklists.length;
  }

  if (columnId === "fieldOwner") {
    return fieldOwners.length;
  }

  if (columnId === "status") {
    return statuses.length;
  }

  if (columnId === "complianceRequired") {
    return 2;
  }

  if (columnId === "delayRisk") {
    return delayRisks.length;
  }

  if (columnId === "openIssues") {
    return 8;
  }

  if (columnId === "qualityScore") {
    return 39;
  }

  if (columnId === "dueDate") {
    return 365;
  }

  return null;
}

function getSortBucket(index: number, columnId: string) {
  if (columnId === "project") {
    return projects.indexOf(getProject(index));
  }

  if (columnId === "building") {
    return buildings.indexOf(getBuilding(index));
  }

  if (columnId === "floor") {
    return getFloor(index) - 1;
  }

  if (columnId === "trade") {
    return trades.indexOf(getTrade(index));
  }

  if (columnId === "checklist") {
    return checklists.indexOf(getChecklist(index));
  }

  if (columnId === "fieldOwner") {
    return fieldOwners.indexOf(getFieldOwner(index));
  }

  if (columnId === "status") {
    return statusSortRank.get(getStatus(index)) ?? statuses.length - 1;
  }

  if (columnId === "complianceRequired") {
    return getComplianceRequired(index) ? 1 : 0;
  }

  if (columnId === "delayRisk") {
    return delayRiskSortRank.get(getDelayRisk(index)) ?? delayRisks.length - 1;
  }

  if (columnId === "openIssues") {
    return getOpenIssues(index);
  }

  if (columnId === "qualityScore") {
    return getQualityScore(index) - 62;
  }

  if (columnId === "dueDate") {
    return index % 365;
  }

  return 0;
}

function getIndexValue(index: number, columnId: string) {
  if (columnId === "project") {
    return getProject(index);
  }

  if (columnId === "building") {
    return getBuilding(index);
  }

  if (columnId === "status") {
    return getStatus(index);
  }

  if (columnId === "delayRisk") {
    return getDelayRisk(index);
  }

  if (columnId === "trade") {
    return getTrade(index);
  }

  if (columnId === "checklist") {
    return getChecklist(index);
  }

  if (columnId === "fieldOwner") {
    return getFieldOwner(index);
  }

  if (columnId === "floor") {
    return getFloor(index);
  }

  if (columnId === "complianceRequired") {
    return getComplianceRequired(index);
  }

  if (columnId === "openIssues") {
    return getOpenIssues(index);
  }

  if (columnId === "qualityScore") {
    return getQualityScore(index);
  }

  if (columnId === "dueDate") {
    return toDateInputValue(index);
  }

  return String(createConstructionRow(index)[columnId] ?? "");
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

function getQueryKey(query: TableQuery) {
  const hasSearch = Boolean(query.searchText);
  const hasFilters = Object.keys(query.filters ?? {}).length > 0;
  const hasSort = Boolean(query.sort);

  if (!hasSearch && !hasFilters && !hasSort) {
    return "default";
  }

  return JSON.stringify(query);
}

function createConstructionRow(index: number): ConstructionRow {
  const unitNumber = index + 1;
  const project = getProject(index);
  const floor = getFloor(index);
  const building = getBuilding(index);
  const trade = getTrade(index);
  const checklist = getChecklist(index);
  const status = getStatus(index);
  const delayRisk = getDelayRisk(index);
  const openIssues = getOpenIssues(index);
  const dueDate = toDateInputValue(index);
  const unit = getUnit(index);

  return {
    id: `row-${unitNumber}`,
    project,
    microProject: `${unit} / ${trade} / ${checklist}`,
    unit,
    building,
    floor,
    trade,
    checklist,
    fieldOwner: getFieldOwner(index),
    status,
    complianceRequired: getComplianceRequired(index),
    delayRisk,
    openIssues,
    qualityScore: getQualityScore(index),
    dueDate,
  };
}

function getProject(index: number) {
  return projects[index % projects.length];
}

function getBuilding(index: number) {
  return buildings[index % buildings.length];
}

function getFloor(index: number) {
  return (index % 42) + 1;
}

function getTrade(index: number) {
  return trades[(index * 3) % trades.length];
}

function getChecklist(index: number) {
  return checklists[(index * 5) % checklists.length];
}

function getFieldOwner(index: number) {
  return fieldOwners[(index * 13) % fieldOwners.length];
}

function getStatus(index: number) {
  return statuses[(index * 7) % statuses.length];
}

function getDelayRisk(index: number) {
  return delayRisks[(index * 11) % delayRisks.length];
}

function getOpenIssues(index: number) {
  return getStatus(index) === "Complete" ? 0 : (index * 11) % 8;
}

function getQualityScore(index: number) {
  return getStatus(index) === "Complete" ? 100 : 62 + ((index * 19) % 39);
}

function getComplianceRequired(index: number) {
  const checklist = getChecklist(index);

  return (
    checklist === "Regulatory signoff" ||
    checklist === "Safety walk" ||
    index % 17 === 0
  );
}

function getUnit(index: number) {
  return `U-${String(index + 1).padStart(7, "0")}`;
}

function getMicroProject(index: number, unit = getUnit(index)) {
  return `${unit} / ${getTrade(index)} / ${getChecklist(index)}`;
}

function toDateInputValue(index: number) {
  const date = new Date(Date.UTC(2026, 0, 1 + (index % 365)));
  return date.toISOString().slice(0, 10);
}

function trimIndexCache(indexCache: Map<string, number[]>) {
  while (indexCache.size > MAX_QUERY_CACHE_ENTRIES) {
    const oldestKey = indexCache.keys().next().value;

    if (!oldestKey) {
      break;
    }

    indexCache.delete(oldestKey);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function yieldToBrowser() {
  return delay(0);
}
