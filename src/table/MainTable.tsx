import { useMemo, useRef, useState } from "react"
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_GroupingState,
} from "material-react-table"
import { Box, Container } from "@mui/material"
import type { ConceptRow, ConceptTableProps } from "../utils/types"
import { FilterWrapper } from "../components/filters/FiltersWarpper"

import { useColumns } from "./ColumnFactory"
import { TopToolbar } from "./TopToolbar"
import { Heatmap } from "../components/charts/Heatmap"
import { Scatter } from "../components/charts/Scatter"
import { sumBinaryCount } from "../utils/aggregations"

// ─── main table ───────────────────────────────────────────────────────────

export default function MainTable({ data, setData, pageView }: ConceptTableProps) {
  const tableContainerRef = useRef(null)
  const [grouping, setGrouping] = useState<MRT_GroupingState>(["ancestorConceptIds"])

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([
    {
      id: "casesControl",
      value: ["5", ""],
    },
    {
      id: "-log10Binary",
      value: ["5", ""],
    },
  ])

  const conceptsById = useMemo<Record<number, ConceptRow>>(
    () => Object.fromEntries((data ?? []).map((row) => [row.conceptId, row])),
    [data],
  )

  // MRT_ColumnDef<ConceptRow> types each column to your data shape.
  // `accessorFn` lets you derive a display value from nested fields.
  const columns = useColumns(conceptsById)

  // Expanded rows: one row per ancestorConceptId
  const expandedRows = useMemo(() => {
    if (!data) return []
    return data.flatMap((row) =>
      (row.ancestorConceptIds ?? []).map((ancestorId) => ({
        ...row,
        ancestorConceptIds: [ancestorId], // scalar, so MRT can group on it
      })),
    )
  }, [data])

  const isGrouping = grouping.includes("ancestorConceptIds")

  const tableData = useMemo(() => (isGrouping ? expandedRows : data), [isGrouping])

  const rootRows = useMemo(() => {
    if (!data) return []
    const allAncestorIds = new Set(data.flatMap((r) => r.ancestorConceptIds ?? []))
    return data.filter((r) => allAncestorIds.has(r.conceptId))
  }, [data])
  const table = useMaterialReactTable({
    columns,
    data: tableData,
    // enableExpanding: true,
    aggregationFns: { sumBinaryCount },
    state: {
      grouping,
      columnFilters,
      columnVisibility: {
        conceptName: false,
        conceptId: false,
        domainId: false,
        // ancestorConceptId: false,
      },
    },
    // getSubRows: (row) => data.filter((r) => r.ancestorConceptIds.includes(row.conceptId)),
    layoutMode: "grid-no-grow",

    defaultColumn: {
      minSize: 20,
      size: 115, // starting point — override per column as needed
      maxSize: 400,
    },
    // ── expand ──
    // renderDetailPanel: ({ row }) => <ConceptDetailPanel row={row} />,
    // ── pagination ──
    enableColumnPinning: true,
    initialState: {
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
    onGroupingChange: (updater) => {
      // updater can be a value or a function (MRT uses the same pattern as React setState)
      const newGrouping = typeof updater === "function" ? updater(grouping) : updater
      setGrouping(newGrouping)
    },

    // ── filtering ──
    enableColumnFilters: true,
    enableGlobalFilter: true,
    // ── sorting ──
    enableSorting: true,

    // ── grouping ──
    enableGrouping: true,
    // ── misc ──
    enableStickyHeader: true,

    muiTableContainerProps: { sx: { maxHeight: "70vh" }, ref: tableContainerRef },
    renderTopToolbarCustomActions: ({ table }) => <TopToolbar table={table} setData={setData} />,

    // Apply to all header cells globally
    muiTableHeadCellProps: {
      sx: {
        flex: "0 0 auto",
      },
    },

    muiTableFooterCellProps: {
      sx: { flex: "0 0 auto" },
    },
    muiFilterTextFieldProps: {
      variant: "outlined",
      size: "small",
    },
  })

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, p: 0 }}>
      <FilterWrapper table={table} />
      {pageView === "charts" && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Scatter data={table} />
          <Heatmap
            table={table}
            metricKey="pValue"
            tableContainerRef={tableContainerRef}
            isGrouping={isGrouping}
          />
        </Box>
      )}
      {pageView === "table" && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <MaterialReactTable table={table} />
        </Box>
      )}
    </Box>
  )
}
