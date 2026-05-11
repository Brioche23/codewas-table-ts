import { useMemo, useState } from "react"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
} from "material-react-table"
import { Container } from "@mui/material"
import type { ConceptRow, ConceptTableProps } from "../utils/types"
import { FilterWrapper } from "../components/filters/FiltersWarpper"

import {
  infoColumn,
  binaryColumn,
  STAT_GROUPS,
  makeStatGroup,
  categoryColumn,
} from "./ColumnFactory"
import { TopToolbar } from "./TopToolbar"

// ─── main table ───────────────────────────────────────────────────────────

export default function MainTable({ data, setData }: ConceptTableProps) {
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([
    {
      id: "casesControl",
      value: ["5", null],
    },
    {
      id: "-log10Binary",
      value: ["5", null],
    },
  ])

  // MRT_ColumnDef<ConceptRow> types each column to your data shape.
  // `accessorFn` lets you derive a display value from nested fields.
  const columns = useMemo<MRT_ColumnDef<ConceptRow>[]>(
    () => [infoColumn, binaryColumn, ...STAT_GROUPS.map(makeStatGroup), categoryColumn],
    [],
  )

  const table = useMaterialReactTable({
    columns,
    data,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    // enableGrouping: true,
    // ── expand ──
    // renderDetailPanel: ({ row }) => <ConceptDetailPanel row={row} />,
    // ── pagination ──
    enableColumnPinning: true,
    initialState: {
      // grouping: ["conceptId", "conceptName"],
      sorting: [
        {
          id: "oddsRatioBinary", //sort by age by default on page load
          desc: true,
        },
      ],
      pagination: { pageSize: 20, pageIndex: 0 },
      columnPinning: { left: ["info"] },
      density: "compact",
    },

    // ── filtering ──
    enableColumnFilters: true,
    enableGlobalFilter: true,
    // ── sorting ──
    enableSorting: true,
    // ── misc ──
    enableStickyHeader: true,
    muiTableContainerProps: { sx: { maxHeight: "70vh" } },
    renderTopToolbarCustomActions: ({ table }) => <TopToolbar table={table} setData={setData} />,
  })

  return (
    <Container component="section" sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <FilterWrapper table={table} />
      <MaterialReactTable table={table} />
    </Container>
  )
}
