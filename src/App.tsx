import { useMemo } from "react";
import {
  type ConstructionRow,
  constructionColumns,
  createConstructionRows,
} from "./data/constructionData";
import Table from "./table/Table";
import type { TableInputData } from "./table/types";

const ROW_COUNT = 100_000;
const cementoLogoUrl = new URL(
  "./images/Cemento-logo-for gmail_2024_- Black_edit.avif",
  import.meta.url,
).href;

export default function App() {
  const tableData = useMemo(
    (): TableInputData<ConstructionRow> => ({
      columns: constructionColumns,
      data: createConstructionRows(ROW_COUNT),
    }),
    [],
  );

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="brand-block">
          <img className="brand-logo" src={cementoLogoUrl} alt="Cemento" />
          <h1>Production Progress Table</h1>
        </div>
      </header>

      <Table
        columns={tableData.columns}
        data={tableData.data}
        pageSize={1_000}
        tableId="cemento-mpa-workflow"
        title="Cemento MPA Workflow Table"
      />
    </main>
  );
}
