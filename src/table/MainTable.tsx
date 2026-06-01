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
  const [grouping, setGrouping] = useState<MRT_GroupingState>([])

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

  const formattedData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        isStandard: !d.domainId.includes("Source:"),
      })),
    [data],
  )

  const conceptsById = useMemo<Record<number, ConceptRow>>(
    () => Object.fromEntries((formattedData ?? []).map((row) => [row.conceptId, row])),
    [formattedData],
  )

  // MRT_ColumnDef<ConceptRow> types each column to your data shape.
  // `accessorFn` lets you derive a display value from nested fields.
  const columns = useColumns(conceptsById)

  // Expanded rows: one row per ancestorConceptId
  const expandedRows = useMemo(() => {
    if (!formattedData) return []
    return formattedData.flatMap((row) =>
      (row.ancestorConceptIds ?? []).map((ancestorId) => ({
        ...row,
        ancestorConceptIds: [ancestorId], // scalar, so MRT can group on it
      })),
    )
  }, [formattedData])

  const isGrouping = grouping.includes("ancestorConceptIds")

  const tableData = useMemo(() => (isGrouping ? expandedRows : formattedData), [isGrouping])
  const rootRows = useMemo(() => {
    if (!formattedData) return []

    // IDs of concepts that exist in the dataset and appear as someone's ancestor
    const allConceptIds = new Set(formattedData.map((r) => r.conceptId))

    const ancestorIdsInDataset = new Set(
      formattedData
        .flatMap((r) => r.ancestorConceptIds ?? [])
        .filter((id) => allConceptIds.has(id)), // O(1) lookup now
    )

    // A row is a root if none of its ancestors exist in the dataset
    return formattedData.filter(
      (r) => !r.ancestorConceptIds?.some((id) => ancestorIdsInDataset.has(id)),
    )
  }, [formattedData])
  console.log("rootRows", rootRows)

  const table = useMaterialReactTable({
    columns,
    data: rootRows,
    enableExpanding: true,
    enableExpandAll: false,
    filterFromLeafRows: true,
    aggregationFns: { sumBinaryCount },
    state: {
      // grouping,
      columnVisibility: {
        conceptName: false,
        conceptId: false,
        domainId: false,
        // ancestorConceptIds: false,
      },
    },
    getSubRows: (row) => expandedRows.filter((r) => r.ancestorConceptIds.includes(row.conceptId)),
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
      columnFilters,
      sorting: [
        {
          id: "oddsRatioBinary", //sort by age by default on page load
          desc: true,
        },
      ],
      pagination: { pageSize: 20, pageIndex: 0 },
      columnPinning: { left: ["mrt-row-expand", "info"] },
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
