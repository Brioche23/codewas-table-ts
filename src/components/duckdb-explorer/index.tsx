import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import {
  MaterialReactTable,
  MRT_GlobalFilterTextField,
  useMaterialReactTable,
  type MRT_ColumnFiltersState,
  type MRT_ExpandedState,
  type MRT_PaginationState,
  type MRT_Row,
  type MRT_SortingState,
  type MRT_VisibilityState,
} from "material-react-table"
import type { DuckDbDataSource, PageViewOptions } from "../../utils/types"
import { CHART_ROWS_LIMIT, DEFAULT_COLUMN_FILTERS, DISPLAY_ANALYSIS_TYPES } from "./constants"
import { ConceptDetailDialog } from "./ConceptDetailDialog"
import { DuckDbCharts } from "./DuckDbCharts"
import { DuckDbFilterBar } from "./DuckDbFilterBar"
import {
  attachChildrenToHierarchy,
  buildHierarchyIndex,
  getExpandedRowKeys,
  orderRowsByRowKeys,
  withEmptySubRows,
} from "./hierarchyUtils"
import {
  buildFullSummaryQuery,
  buildHeatmapQuery,
  buildHierarchyMetaQuery,
  buildPagedSummaryQuery,
  buildSummaryCountQuery,
  buildSummaryRowsByRowKeysQuery,
} from "./queryBuilders"
import { mapHeatmapRow, mapHierarchyMetaRow, mapSummaryRow } from "./rowMappers"
import { buildColumns } from "./tableColumns"
import type {
  BlockMetricRow,
  ChartScope,
  ConceptSummaryRow,
  HierarchyIndex,
  TableMode,
} from "./types"
import { getSafeDownloadName, summaryRowsToTsv, triggerDownload } from "./utils"
import DownloadMenu from "./DownloadMenu"

export default function DuckDbExplorer({
  dataSource,
  pageView,
  setPageView,
  onConceptStats,
}: {
  dataSource: DuckDbDataSource
  pageView: PageViewOptions
  setPageView: Dispatch<SetStateAction<PageViewOptions>>
  onConceptStats?: (stats: { filtered: number; total: number }) => void
}) {
  const [countMode, setCountMode] = useState("descendant")
  const [selectedDomain, setSelectedDomain] = useState("all")
  const [searchText, setSearchText] = useState("")
  const [domains, setDomains] = useState<string[]>([])
  const [chartRows, setChartRows] = useState<ConceptSummaryRow[]>([])
  const [tableRows, setTableRows] = useState<ConceptSummaryRow[]>([])
  const [tableRowCount, setTableRowCount] = useState(0)
  const [totalRowCount, setTotalRowCount] = useState(0)
  const [hierarchyRows, setHierarchyRows] = useState<ConceptSummaryRow[]>([])
  const [hierarchyExpanded, setHierarchyExpanded] = useState<MRT_ExpandedState>({})
  const [hierarchyIndex, setHierarchyIndex] = useState<HierarchyIndex | null>(null)
  const [hierarchyLoadedParentRowKeys, setHierarchyLoadedParentRowKeys] = useState<string[]>([])
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null)
  const [selectedDetailRow, setSelectedDetailRow] = useState<ConceptSummaryRow | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [chartScope, setChartScope] = useState<ChartScope>("filtered")
  const [tableLoading, setTableLoading] = useState(false)
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [tableMode, setTableMode] = useState<TableMode>("flat")
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(DEFAULT_COLUMN_FILTERS)
  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>({
    ancestorConceptIds: false,
  })
  const [sorting, setSorting] = useState<MRT_SortingState>([{ id: "binaryEffect", desc: true }])
  const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 20 })
  const hierarchyLoadingParentRowKeysRef = useRef(new Set<string>())

  useEffect(() => {
    let active = true
    dataSource
      .runQuery(
        `
          SELECT DISTINCT domainId
          FROM analysisRef
          WHERE analysisType IN (${DISPLAY_ANALYSIS_TYPES.map((type) => `'${type}'`).join(", ")})
          ORDER BY domainId
        `,
      )
      .then((rows) => {
        if (!active) return
        setDomains(rows.map((row) => String(row.domainId)))
      })
    return () => {
      active = false
    }
  }, [dataSource])

  useEffect(() => {
    let active = true
    async function loadChartRows() {
      setChartLoading(true)
      setSummaryError(null)
      try {
        const rowsRaw = await dataSource.runQuery(
          buildHeatmapQuery(
            countMode,
            selectedDomain,
            searchText,
            chartScope === "filtered" ? columnFilters : [],
            CHART_ROWS_LIMIT,
          ),
        )
        if (!active) return
        setChartRows((rowsRaw as BlockMetricRow[]).map(mapHeatmapRow))
      } catch (error) {
        if (!active) return
        setSummaryError(error instanceof Error ? error.message : String(error))
      } finally {
        if (active) {
          setChartLoading(false)
        }
      }
    }
    void loadChartRows()
    return () => {
      active = false
    }
  }, [chartScope, columnFilters, countMode, dataSource, searchText, selectedDomain])

  useEffect(() => {
    let active = true
    async function loadTableRows() {
      setTableLoading(true)
      try {
        const [rowsRaw, countRaw] = await Promise.all([
          dataSource.runQuery(
            buildPagedSummaryQuery(
              countMode,
              selectedDomain,
              searchText,
              columnFilters,
              sorting,
              pagination,
            ),
          ),
          dataSource.runQuery(
            buildSummaryCountQuery(countMode, selectedDomain, searchText, columnFilters),
          ),
        ])
        if (!active) return
        setTableRows((rowsRaw as BlockMetricRow[]).map(mapSummaryRow))
        setTableRowCount(
          Number((countRaw[0] as Record<string, unknown> | undefined)?.rowCount ?? 0),
        )
      } catch (error) {
        if (!active) return
        setSummaryError(error instanceof Error ? error.message : String(error))
      } finally {
        if (active) {
          setTableLoading(false)
        }
      }
    }
    void loadTableRows()
    return () => {
      active = false
    }
  }, [columnFilters, countMode, dataSource, pagination, searchText, selectedDomain, sorting])

  // Unfiltered concept total for the current view (countMode/domain/search), so the footer can show
  // "filtered of total". Depends on the view selectors but NOT on columnFilters.
  useEffect(() => {
    let active = true
    dataSource
      .runQuery(buildSummaryCountQuery(countMode, selectedDomain, searchText, []))
      .then((countRaw) => {
        if (!active) return
        setTotalRowCount(
          Number((countRaw[0] as Record<string, unknown> | undefined)?.rowCount ?? 0),
        )
      })
      .catch(() => {
        // Total is non-critical; leave the previous value on failure.
      })
    return () => {
      active = false
    }
  }, [countMode, dataSource, searchText, selectedDomain])

  // Lift the table's row counts so the footer reflects exactly what the table shows.
  useEffect(() => {
    onConceptStats?.({ filtered: tableRowCount, total: totalRowCount })
  }, [onConceptStats, tableRowCount, totalRowCount])

  useEffect(() => {
    if (tableMode !== "hierarchy") return
    let active = true
    async function loadHierarchyRows() {
      setHierarchyLoading(true)
      try {
        const hierarchyCountMode = countMode === "code" ? "all" : countMode
        const metadataRowsRaw = await dataSource.runQuery(
          buildHierarchyMetaQuery(hierarchyCountMode, selectedDomain, searchText, columnFilters),
        )
        const hierarchyMetaRows = (metadataRowsRaw as BlockMetricRow[]).map(mapHierarchyMetaRow)
        const nextHierarchyIndex = buildHierarchyIndex(hierarchyMetaRows)
        const rootRowKeys = nextHierarchyIndex.rootRowKeys
        const rootRowsRaw =
          rootRowKeys.length > 0
            ? await dataSource.runQuery(
                buildSummaryRowsByRowKeysQuery(
                  hierarchyCountMode,
                  selectedDomain,
                  searchText,
                  rootRowKeys,
                ),
              )
            : []
        if (!active) return
        setHierarchyIndex(nextHierarchyIndex)
        setHierarchyExpanded({})
        setHierarchyLoadedParentRowKeys([])
        hierarchyLoadingParentRowKeysRef.current.clear()
        setHierarchyRows(
          withEmptySubRows(
            orderRowsByRowKeys((rootRowsRaw as BlockMetricRow[]).map(mapSummaryRow), rootRowKeys),
          ),
        )
      } catch (error) {
        if (!active) return
        setSummaryError(error instanceof Error ? error.message : String(error))
      } finally {
        if (active) {
          setHierarchyLoading(false)
        }
      }
    }
    void loadHierarchyRows()
    return () => {
      active = false
    }
  }, [columnFilters, countMode, dataSource, searchText, selectedDomain, tableMode])

  useEffect(() => {
    if (tableMode !== "hierarchy" || !hierarchyIndex) return
    const hierarchyCountMode = countMode === "code" ? "all" : countMode
    const activeHierarchyIndex = hierarchyIndex
    const expandedRowKeys = getExpandedRowKeys(hierarchyExpanded)
    const nextParentRowKeys = expandedRowKeys.filter((rowKey) => {
      const hasChildren =
        (activeHierarchyIndex.childRowKeysByParentRowKey.get(rowKey) ?? []).length > 0
      return (
        hasChildren &&
        !hierarchyLoadedParentRowKeys.includes(rowKey) &&
        !hierarchyLoadingParentRowKeysRef.current.has(rowKey)
      )
    })
    if (nextParentRowKeys.length === 0) return

    let active = true
    async function loadExpandedChildren() {
      nextParentRowKeys.forEach((rowKey) => hierarchyLoadingParentRowKeysRef.current.add(rowKey))
      try {
        const childRowKeys = Array.from(
          new Set(
            nextParentRowKeys.flatMap(
              (rowKey) => activeHierarchyIndex.childRowKeysByParentRowKey.get(rowKey) ?? [],
            ),
          ),
        )
        if (childRowKeys.length === 0 || !active) return
        const rowsRaw = await dataSource.runQuery(
          buildSummaryRowsByRowKeysQuery(
            hierarchyCountMode,
            selectedDomain,
            searchText,
            childRowKeys,
          ),
        )
        if (!active) return
        const orderedChildrenByParent = new Map<string, ConceptSummaryRow[]>()
        const fetchedRows = withEmptySubRows((rowsRaw as BlockMetricRow[]).map(mapSummaryRow))
        nextParentRowKeys.forEach((parentRowKey) => {
          const orderedRowKeys =
            activeHierarchyIndex.childRowKeysByParentRowKey.get(parentRowKey) ?? []
          orderedChildrenByParent.set(parentRowKey, orderRowsByRowKeys(fetchedRows, orderedRowKeys))
        })
        setHierarchyRows((currentRows) => {
          let nextRows = currentRows
          orderedChildrenByParent.forEach((children, parentRowKey) => {
            nextRows = attachChildrenToHierarchy(nextRows, parentRowKey, children)
          })
          return nextRows
        })
        setHierarchyLoadedParentRowKeys((current) => [
          ...current,
          ...nextParentRowKeys.filter((rowKey) => !current.includes(rowKey)),
        ])
      } catch (error) {
        if (!active) return
        setSummaryError(error instanceof Error ? error.message : String(error))
      } finally {
        nextParentRowKeys.forEach((rowKey) =>
          hierarchyLoadingParentRowKeysRef.current.delete(rowKey),
        )
      }
    }
    void loadExpandedChildren()
    return () => {
      active = false
      nextParentRowKeys.forEach((rowKey) => {
        hierarchyLoadingParentRowKeysRef.current.delete(rowKey)
      })
    }
  }, [
    countMode,
    dataSource,
    hierarchyExpanded,
    hierarchyIndex,
    hierarchyLoadedParentRowKeys,
    searchText,
    selectedDomain,
    tableMode,
  ])

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [columnFilters, countMode, searchText, selectedDomain])

  const columns = useMemo(() => buildColumns(), [])

  const table = useMaterialReactTable({
    columns,
    data: tableMode === "hierarchy" ? hierarchyRows : tableRows,
    enableSorting: true,
    enableColumnFilters: true,
    enablePagination: true,
    enableStickyHeader: true,
    enableStickyFooter: true,
    // Fill the flex parent and keep the header/toolbars fixed while the rows scroll inside.
    muiTablePaperProps: {
      sx: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 },
    },
    muiTableContainerProps: {
      sx: { flex: 1, minHeight: 0, overflow: "auto" },
    },
    enableExpanding: tableMode === "hierarchy",
    manualFiltering: tableMode === "flat",
    manualPagination: tableMode === "flat",
    manualSorting: tableMode === "flat",
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setHierarchyExpanded,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    initialState: {
      sorting: [{ id: "binaryEffect", desc: true }],
      pagination: { pageSize: 20, pageIndex: 0 },
      density: "compact",
      columnPinning: { left: ["mrt-row-expand", "info"] },
      showColumnFilters: true,
    },
    rowCount: tableMode === "flat" ? tableRowCount : undefined,
    state: {
      isLoading: tableMode === "hierarchy" ? hierarchyLoading : tableLoading,
      columnFilters,
      columnVisibility,
      expanded: hierarchyExpanded,
      pagination,
      sorting,
    },
    getRowCanExpand: (row) =>
      tableMode === "hierarchy" &&
      Boolean(hierarchyIndex?.childRowKeysByParentRowKey.get(row.original.rowKey)?.length),
    getSubRows: (row) => row.subRows,
    getRowId: (row) => row.rowKey,
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        setFocusedRowKey(row.original.rowKey)
        setSelectedDetailRow(row.original)
      },
      sx: {
        cursor: "pointer",
        backgroundColor:
          focusedRowKey === row.original.rowKey
            ? "action.selected"
            : tableMode === "hierarchy" && row.depth > 0
              ? alpha("#1976d2", Math.min(0.035 + row.depth * 0.025, 0.12))
              : undefined,
        "& td:first-of-type": {
          position: "relative",
        },
        "& td:first-of-type::before":
          tableMode === "hierarchy" && row.depth > 0
            ? {
                content: '""',
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.min(4 + row.depth * 2, 10)}px`,
                backgroundColor: alpha("#1976d2", Math.min(0.15 + row.depth * 0.08, 0.42)),
              }
            : undefined,
      },
    }),
    renderTopToolbarCustomActions: () => (
      <Stack
        direction="row"
        spacing={2}
        sx={{
          mb: 0,
          flexWrap: "wrap",
          placeContent: "space-between",
          alignContent: "center",
          overflow: "visible",
        }}
      >
        <Stack direction="row" spacing={2}>
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel id="table-mode-label">Table View</InputLabel>
            <Select
              labelId="table-mode-label"
              value={tableMode}
              label="Table View"
              onChange={(event) => {
                const nextMode = event.target.value as TableMode
                setTableMode(nextMode)
                if (nextMode === "hierarchy" && countMode === "code") {
                  setCountMode("all")
                }
              }}
            >
              <MenuItem value="flat">Flat</MenuItem>
              <MenuItem value="hierarchy">Hierarchy</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel id="count-mode-label">Count Mode</InputLabel>
            <Select
              labelId="count-mode-label"
              value={countMode}
              label="Count Mode"
              onChange={(event) => setCountMode(event.target.value)}
              disabled={tableMode === "hierarchy"}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="code">Exact code</MenuItem>
              <MenuItem value="descendant">All descendants</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel id="domain-label">Domain</InputLabel>
            <Select
              labelId="domain-label"
              value={selectedDomain}
              label="Domain"
              onChange={(event) => setSelectedDomain(event.target.value)}
            >
              <MenuItem value="all">All domains</MenuItem>
              {domains.map((domain) => (
                <MenuItem key={domain} value={domain}>
                  {domain}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Search concept/code/id"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            sx={{ minWidth: 220 }}
            size="small"
          />
        </Stack>

        <DownloadMenu {...downloadMenuProps} />
      </Stack>
    ),
  })

  function focusRow(rowKey: string) {
    setFocusedRowKey(rowKey)
    setPageView("table")
    const fallbackRow = chartRows.find((row) => row.rowKey === rowKey) ?? null
    setSelectedDetailRow(fallbackRow)
    requestAnimationFrame(() => {
      const visibleRows = table.getPrePaginationRowModel().rows
      const matchedRow = visibleRows.find(
        (row: MRT_Row<ConceptSummaryRow>) => row.original.rowKey === rowKey,
      )
      const index = matchedRow ? visibleRows.indexOf(matchedRow) : -1
      if (matchedRow) {
        setSelectedDetailRow(matchedRow.original)
      }
      if (index >= 0) {
        const pageSize = table.getState().pagination.pageSize
        table.setPageIndex(Math.floor(index / pageSize))
      }
    })
  }

  const downloadMenuProps = {
    dataSource,
    countMode,
    selectedDomain,
    searchText,
    columnFilters,
    exportLoading,
    setExportLoading,
  }

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }}>
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* <Stack direction="row" sx={{ mb: 2, flexWrap: "wrap", placeContent: "space-between" }}>
          <Stack direction="row" spacing={2}>
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel id="table-mode-label">Table View</InputLabel>
              <Select
                labelId="table-mode-label"
                value={tableMode}
                label="Table View"
                onChange={(event) => {
                  const nextMode = event.target.value as TableMode
                  setTableMode(nextMode)
                  if (nextMode === "hierarchy" && countMode === "code") {
                    setCountMode("all")
                  }
                }}
              >
                <MenuItem value="flat">Flat</MenuItem>
                <MenuItem value="hierarchy">Hierarchy</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 160 }} size="small">
              <InputLabel id="count-mode-label">Count Mode</InputLabel>
              <Select
                labelId="count-mode-label"
                value={countMode}
                label="Count Mode"
                onChange={(event) => setCountMode(event.target.value)}
                disabled={tableMode === "hierarchy"}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="code">Exact code</MenuItem>
                <MenuItem value="descendant">All descendants</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 160 }} size="small">
              <InputLabel id="domain-label">Domain</InputLabel>
              <Select
                labelId="domain-label"
                value={selectedDomain}
                label="Domain"
                onChange={(event) => setSelectedDomain(event.target.value)}
              >
                <MenuItem value="all">All domains</MenuItem>
                {domains.map((domain) => (
                  <MenuItem key={domain} value={domain}>
                    {domain}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Search concept/code/id"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              sx={{ minWidth: 220 }}
              size="small"
            />
          </Stack>

          <DownloadMenu {...downloadMenuProps} />
        </Stack> */}
        <DuckDbFilterBar
          table={table}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          countMode={countMode}
          setCountMode={setCountMode}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          searchText={searchText}
          setSearchText={setSearchText}
          rowCount={tableRowCount}
        />
        {(tableLoading || chartLoading || hierarchyLoading || exportLoading) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              color: "text.secondary",
            }}
          >
            <CircularProgress size={18} />
            <Typography variant="body2">
              {exportLoading
                ? "Preparing download..."
                : `Loading ${pageView === "charts" ? "chart" : tableMode === "hierarchy" ? "hierarchy" : "table"} results...`}
            </Typography>
          </Box>
        )}
        {summaryError && <Alert severity="error">{summaryError}</Alert>}
        {/* Fills the remaining height; the table scrolls inside it, charts scroll the box. */}
        <Box
          sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "auto" }}
        >
          {pageView === "charts" ? (
            <DuckDbCharts
              rows={chartRows}
              chartLoading={chartLoading}
              chartScope={chartScope}
              setChartScope={setChartScope}
              onSelectConcept={focusRow}
            />
          ) : (
            <MaterialReactTable table={table} />
          )}
        </Box>
      </Box>
      <ConceptDetailDialog row={selectedDetailRow} onClose={() => setSelectedDetailRow(null)} />
    </Stack>
  )
}
