# Cemento Table Assignment

React + TypeScript implementation of the client-side table assignment for Cemento.

The project builds a reusable data table component around the required input shape:

```ts
type TableInputData<Row> = {
  columns: Array<{
    id: string;
    ordinalNo: number;
    title: string;
    type: string;
    width?: number;
  }>;
  data: Array<{
    id: string;
    [columnId: string]: any;
  }>;
};
```

The demo data is construction-oriented so the table feels close to Cemento's domain: projects, buildings, units, trades, checklists, field owners, compliance, delay risk, quality score, and due dates.

The app intentionally passes the demo into the table as `columns` and `data`, matching the assignment's required input version.

## Running Locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Assignment Coverage

- Renders different column data types: string, number, boolean, select, and date.
- Lets users choose which columns are visible.
- Lets users edit cell values directly in the table.
- Saves edits locally without backend persistence.
- Handles large data sets with virtualized rows and paged row loading.
- Keeps the table generic so it can be reused with different column schemas and row data.

## Extra UX Features

- Search, filters, and sortable headers.
- Column resizing, fit-to-content, and width reset.
- Row selection and Excel export.
- Row details panel and context menu actions.
- Keyboard-friendly cell focus and editing flow.
- Local column-width persistence per table id.

## Reusability

The reusable table lives under `src/table`.

The table accepts either:

- `data`: an in-memory row array, matching the assignment's required shape.
- `dataSource`: an optional extension with `getRows`, useful when rows should be loaded by page/query instead of all at once.

This keeps the table independent from the construction demo data in `src/data/constructionData.ts`.

## Performance Notes

The table does not render every row at once. It uses `useVirtualRows` to render only the visible rows plus overscan, so scrolling remains responsive with large data sets.

The data API is also query-aware. Search, filters, sorting, paging, and deleted row ids are passed through a `TableQuery`/`TableDataRequest` shape, allowing the same table component to work with either local arrays or server-style data sources.

## Column Schema Extensions

The original required fields are preserved with the same types:

- `id: string`
- `ordinalNo: number`
- `title: string`
- `type: string`
- `width?: number`

The schema was extended with optional metadata to support richer UX while keeping the table generic:

- `minWidth?: number` and `maxWidth?: number`: constrain resize behavior and prevent unusable columns.
- `editable?: boolean`: allow specific columns to be read-only.
- `filterable?: boolean`: choose which columns appear in the filter panel.
- `filterType?: ColumnFilterType`: override the default filter UI when needed.
- `sortable?: boolean`: explicitly enable or disable sorting per column.
- `options?: SelectOption[]`: provide labels and values for select/boolean-style columns.
- `align?: "left" | "center" | "right"`: align numeric/status columns without hardcoding column ids.
- `format`, `render`, and `token`: customize display text, custom cell rendering, and visual token colors without changing the table internals.

These additions are optional. A dataset that only provides the assignment's base schema can still render in the table.

## Manual Review Checklist

1. Open the app and verify the construction table renders.
2. Toggle columns from the Columns menu.
3. Apply filters and search text, then clear them.
4. Sort a sortable header.
5. Enable Edit mode, change a cell, save, and confirm the value stays locally.
6. Resize a column and use fit/reset controls.
7. Scroll through the table and confirm only visible rows are rendered smoothly.
