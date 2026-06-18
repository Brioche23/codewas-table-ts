import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from "react"
import {
  Alert,
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { ScatterChart } from "@mui/x-charts"
import { COLUMNS } from "../../utils/constants"
import { HEATMAP_BLOCKS, HEATMAP_ROW_CAP, SCATTER_POINT_CAP } from "./constants"
import {
  buildClusteredHeatmapRows,
  getBestHeatmapScore,
  getChartMetricValue,
  getHeatmapColor,
  getHeatmapHeaderLines,
  getRepeatEvidenceCount,
  matchesHeatmapSearch,
} from "./heatmapUtils"
import type {
  ChartBlockKey,
  ChartMetricKey,
  ChartMode,
  ChartScope,
  ConceptSummaryRow,
  HeatmapCell,
  HeatmapOrderMode,
  HeatmapScaleMode,
} from "./types"
import { formatNumber } from "./utils"

export function DuckDbCharts({
  rows,
  chartLoading,
  chartScope,
  setChartScope,
  onSelectConcept,
}: {
  rows: ConceptSummaryRow[]
  chartLoading: boolean
  chartScope: ChartScope
  setChartScope: Dispatch<SetStateAction<ChartScope>>
  onSelectConcept: (rowKey: string) => void
}) {
  const [chartMode, setChartMode] = useState<ChartMode>("heatmap")
  const [xBlock, setXBlock] = useState<ChartBlockKey>("Binary")
  const [yBlock, setYBlock] = useState<ChartBlockKey>("Count")
  const [metric, setMetric] = useState<ChartMetricKey>("-log10")
  const [heatmapOrderMode, setHeatmapOrderMode] = useState<HeatmapOrderMode>("repeatEvidence")
  const [heatmapScaleMode, setHeatmapScaleMode] = useState<HeatmapScaleMode>("perColumn")
  const [heatmapOrderBlock, setHeatmapOrderBlock] = useState<ChartBlockKey>("Binary")
  const [repeatThreshold, setRepeatThreshold] = useState(5)
  const [heatmapSearchText, setHeatmapSearchText] = useState("")
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const allScatterPoints = useMemo(
    () =>
      rows
        .map((row) => ({
          id: row.rowKey,
          label: row.conceptName ?? String(row.conceptId),
          x: getChartMetricValue(row, xBlock, metric),
          y: getChartMetricValue(row, yBlock, metric),
        }))
        .filter((row) => row.x != null && row.y != null),
    [metric, rows, xBlock, yBlock],
  )
  const dataset = useMemo(() => allScatterPoints.slice(0, SCATTER_POINT_CAP), [allScatterPoints])

  const perColumnMax = useMemo(
    () =>
      Object.fromEntries(
        HEATMAP_BLOCKS.map((block) => [
          block,
          Math.max(1, ...rows.map((row) => getChartMetricValue(row, block, "-log10") ?? 0)),
        ]),
      ) as Record<ChartBlockKey, number>,
    [rows],
  )
  const heatmapBaseRows = useMemo(
    () => rows.filter((row) => matchesHeatmapSearch(row, heatmapSearchText)),
    [heatmapSearchText, rows],
  )
  const heatmapRowsAll = useMemo(() => {
    const sorted = [...heatmapBaseRows]
    switch (heatmapOrderMode) {
      case "selectedBlock":
        return sorted.sort(
          (a, b) =>
            (getChartMetricValue(b, heatmapOrderBlock, "-log10") ?? 0) -
            (getChartMetricValue(a, heatmapOrderBlock, "-log10") ?? 0),
        )
      case "repeatEvidence":
        return sorted.sort((a, b) => {
          const repeatDiff =
            getRepeatEvidenceCount(b, repeatThreshold) - getRepeatEvidenceCount(a, repeatThreshold)
          if (repeatDiff !== 0) return repeatDiff
          return getBestHeatmapScore(b) - getBestHeatmapScore(a)
        })
      case "clustered":
        return buildClusteredHeatmapRows(sorted, perColumnMax)
      case "strongest":
      default:
        return sorted.sort((a, b) => getBestHeatmapScore(b) - getBestHeatmapScore(a))
    }
  }, [heatmapBaseRows, heatmapOrderBlock, heatmapOrderMode, perColumnMax, repeatThreshold])
  const heatmapRows = useMemo(() => heatmapRowsAll.slice(0, HEATMAP_ROW_CAP), [heatmapRowsAll])
  const maxHeatmapValue = useMemo(
    () =>
      Math.max(
        1,
        ...heatmapRows.flatMap((row) =>
          HEATMAP_BLOCKS.map((block) => getChartMetricValue(row, block, "-log10") ?? 0),
        ),
      ),
    [heatmapRows],
  )
  const rowHeight = 10
  const headerHeight = 36
  const labelWidth = 250
  const repeatWidth = 42
  const columnWidth = 108
  const canvasWidth = labelWidth + repeatWidth + HEATMAP_BLOCKS.length * columnWidth
  const canvasHeight = headerHeight + heatmapRows.length * rowHeight

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    context.clearRect(0, 0, canvasWidth, canvasHeight)
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvasWidth, canvasHeight)

    context.font = "11px Hack, monospace"
    context.textAlign = "center"
    context.textBaseline = "middle"

    context.fillStyle = "#f3f3f3"
    context.fillRect(0, 0, labelWidth, headerHeight)
    context.fillStyle = "#222"
    context.textAlign = "left"
    context.fillText("Concept", 8, headerHeight / 2)

    context.fillStyle = "#f3f3f3"
    context.fillRect(labelWidth, 0, repeatWidth, headerHeight)
    context.fillStyle = "#222"
    context.textAlign = "center"
    context.fillText("Rep", labelWidth + repeatWidth / 2, headerHeight / 2)

    HEATMAP_BLOCKS.forEach((block, blockIndex) => {
      const x = labelWidth + repeatWidth + blockIndex * columnWidth
      context.fillStyle = "#f3f3f3"
      context.fillRect(x, 0, columnWidth, headerHeight)
      context.fillStyle = "#222"
      context.textAlign = "center"
      const headerLines = getHeatmapHeaderLines(block)
      headerLines.forEach((line, lineIndex) => {
        const y = headerLines.length === 1 ? headerHeight / 2 : 12 + lineIndex * 12
        context.fillText(line, x + columnWidth / 2, y)
      })
    })

    heatmapRows.forEach((row, rowIndex) => {
      const y = headerHeight + rowIndex * rowHeight
      const label = row.conceptName
        ? `${row.conceptName} (${row.conceptCode ?? row.conceptId})`
        : String(row.conceptId)
      context.fillStyle = hoveredCell?.row.rowKey === row.rowKey ? "#f0f4ff" : "#ffffff"
      context.fillRect(0, y, labelWidth, rowHeight - 1)
      context.fillStyle = "#222"
      context.textAlign = "left"
      context.fillText(label.slice(0, 34), 8, y + rowHeight / 2)
      context.fillStyle = "#ffffff"
      context.fillRect(labelWidth, y, repeatWidth - 1, rowHeight - 1)
      context.fillStyle = getRepeatEvidenceCount(row, repeatThreshold) > 1 ? "#0d47a1" : "#666666"
      context.textAlign = "center"
      context.fillText(
        String(getRepeatEvidenceCount(row, repeatThreshold)),
        labelWidth + repeatWidth / 2,
        y + rowHeight / 2,
      )
      HEATMAP_BLOCKS.forEach((block, blockIndex) => {
        const value = getChartMetricValue(row, block, "-log10")
        const scaleMax = heatmapScaleMode === "perColumn" ? perColumnMax[block] : maxHeatmapValue
        context.fillStyle = getHeatmapColor(value, scaleMax)
        context.fillRect(
          labelWidth + repeatWidth + blockIndex * columnWidth,
          y,
          columnWidth - 1,
          rowHeight - 1,
        )
      })
    })
  }, [
    canvasHeight,
    canvasWidth,
    heatmapRows,
    heatmapScaleMode,
    hoveredCell,
    labelWidth,
    maxHeatmapValue,
    perColumnMax,
    repeatThreshold,
  ])

  function resolveHeatmapCell(event: MouseEvent<HTMLCanvasElement>): HeatmapCell | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    if (y < headerHeight) return null
    const rowIndex = Math.floor((y - headerHeight) / rowHeight)
    const row = heatmapRows[rowIndex]
    if (!row) return null
    if (x < labelWidth + repeatWidth) {
      return {
        row,
        block: "Concept",
        value: getBestHeatmapScore(row),
      } satisfies HeatmapCell
    }
    const blockIndex = Math.floor((x - labelWidth - repeatWidth) / columnWidth)
    const block = HEATMAP_BLOCKS[blockIndex]
    if (!block) return null
    return {
      row,
      block,
      value: getChartMetricValue(row, block, "-log10"),
    } satisfies HeatmapCell
  }

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <FormControl fullWidth size={"small"}>
            <InputLabel id="duckdb-chart-scope-label">Chart Scope</InputLabel>
            <Select
              labelId="duckdb-chart-scope-label"
              value={chartScope}
              label="Chart Scope"
              onChange={(event) => setChartScope(event.target.value as ChartScope)}
            >
              <MenuItem value="filtered">Filtered concepts</MenuItem>
              <MenuItem value="all">All concepts</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <FormControl fullWidth size={"small"}>
            <InputLabel id="duckdb-chart-mode-label">Chart Mode</InputLabel>
            <Select
              labelId="duckdb-chart-mode-label"
              value={chartMode}
              label="Chart Mode"
              onChange={(event) => setChartMode(event.target.value as ChartMode)}
            >
              <MenuItem value="heatmap">Heatmap</MenuItem>
              <MenuItem value="scatter">Scatter</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {chartMode === "scatter" ? (
          <>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size={"small"}>
                <InputLabel id="duckdb-chart-x-label">X Axis</InputLabel>
                <Select
                  labelId="duckdb-chart-x-label"
                  value={xBlock}
                  label="X Axis"
                  onChange={(event) => setXBlock(event.target.value as ChartBlockKey)}
                >
                  {COLUMNS.map((column) => (
                    <MenuItem key={column.key} value={column.key}>
                      {column.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size={"small"}>
                <InputLabel id="duckdb-chart-y-label">Y Axis</InputLabel>
                <Select
                  labelId="duckdb-chart-y-label"
                  value={yBlock}
                  label="Y Axis"
                  onChange={(event) => setYBlock(event.target.value as ChartBlockKey)}
                >
                  {COLUMNS.map((column) => (
                    <MenuItem key={column.key} value={column.key}>
                      {column.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size={"small"}>
                <InputLabel id="duckdb-chart-metric-label">Metric</InputLabel>
                <Select
                  labelId="duckdb-chart-metric-label"
                  value={metric}
                  label="Metric"
                  onChange={(event) => setMetric(event.target.value as ChartMetricKey)}
                >
                  <MenuItem value="-log10">-log10(p)</MenuItem>
                  <MenuItem value="effectSize">Effect size</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        ) : (
          <>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size={"small"}>
                <InputLabel id="duckdb-heatmap-order-label">Row Order</InputLabel>
                <Select
                  labelId="duckdb-heatmap-order-label"
                  value={heatmapOrderMode}
                  label="Row Order"
                  onChange={(event) => setHeatmapOrderMode(event.target.value as HeatmapOrderMode)}
                >
                  <MenuItem value="repeatEvidence">Repeat evidence</MenuItem>
                  <MenuItem value="strongest">Strongest overall</MenuItem>
                  <MenuItem value="selectedBlock">Selected block</MenuItem>
                  <MenuItem value="clustered">Clustered rows</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size={"small"}>
                <InputLabel id="duckdb-heatmap-scale-label">Color Scale</InputLabel>
                <Select
                  labelId="duckdb-heatmap-scale-label"
                  value={heatmapScaleMode}
                  label="Color Scale"
                  onChange={(event) => setHeatmapScaleMode(event.target.value as HeatmapScaleMode)}
                >
                  <MenuItem value="perColumn">Per column</MenuItem>
                  <MenuItem value="global">Global</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size={"small"} disabled={heatmapOrderMode !== "selectedBlock"}>
                <InputLabel id="duckdb-heatmap-block-label">Order Block</InputLabel>
                <Select
                  labelId="duckdb-heatmap-block-label"
                  value={heatmapOrderBlock}
                  label="Order Block"
                  onChange={(event) => setHeatmapOrderBlock(event.target.value as ChartBlockKey)}
                >
                  {COLUMNS.map((column) => (
                    <MenuItem key={column.key} value={column.key}>
                      {column.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size={"small"}>
                <InputLabel id="duckdb-repeat-threshold-label">Repeat Threshold</InputLabel>
                <Select
                  labelId="duckdb-repeat-threshold-label"
                  value={String(repeatThreshold)}
                  label="Repeat Threshold"
                  onChange={(event) => setRepeatThreshold(Number(event.target.value))}
                >
                  <MenuItem value="3">-log10(p) {">="} 3</MenuItem>
                  <MenuItem value="5">-log10(p) {">="} 5</MenuItem>
                  <MenuItem value="8">-log10(p) {">="} 8</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size={"small"}
                label="Heatmap search"
                value={heatmapSearchText}
                onChange={(event) => setHeatmapSearchText(event.target.value)}
                placeholder="Filter heatmap by concept/code/id"
              />
            </Grid>
          </>
        )}
      </Grid>

      {chartMode === "scatter" ? (
        <>
          {chartLoading && <Alert severity="info">Loading chart concepts from DuckDB...</Alert>}
          {allScatterPoints.length > SCATTER_POINT_CAP && (
            <Alert severity="warning">
              Showing top {SCATTER_POINT_CAP} of {allScatterPoints.length} plotable concepts. Apply
              filters to reduce the dataset.
            </Alert>
          )}
          <Paper sx={{ width: "100%", height: 500, p: 1 }}>
            <ScatterChart
              dataset={dataset}
              series={[
                {
                  datasetKeys: { id: "id", x: "x", y: "y" },
                  label: "Concept",
                  markerSize: 4,
                },
              ]}
              xAxis={[
                {
                  label: `${COLUMNS.find((column) => column.key === xBlock)?.label ?? xBlock} ${metric}`,
                },
              ]}
              yAxis={[
                {
                  label: `${COLUMNS.find((column) => column.key === yBlock)?.label ?? yBlock} ${metric}`,
                },
              ]}
              height={460}
            />
          </Paper>
          {dataset.length === 0 && (
            <Alert severity="info">No rows have both selected metrics available.</Alert>
          )}
        </>
      ) : (
        <Stack spacing={1.5}>
          {chartLoading && <Alert severity="info">Loading chart concepts from DuckDB...</Alert>}
          {heatmapRowsAll.length > HEATMAP_ROW_CAP && (
            <Alert severity="warning">
              Showing top {HEATMAP_ROW_CAP} of {heatmapRowsAll.length} concepts. Apply filters to
              reduce the dataset.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            Heatmap colors show -log10(p) evidence by analysis block. Repeat counts show how many
            blocks pass the selected threshold. Click a cell to jump that concept back into the
            table.
          </Typography>
          {heatmapSearchText.trim() ? (
            <Typography variant="body2" color="text.secondary">
              Showing {heatmapRows.length} of {heatmapRowsAll.length} heatmap rows matching "
              {heatmapSearchText}".
            </Typography>
          ) : null}
          <Paper sx={{ p: 1.5 }}>
            <Box
              sx={{ overflow: "auto", maxHeight: 560, border: "1px solid", borderColor: "divider" }}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                style={{ display: "block", cursor: "pointer" }}
                onMouseMove={(event) => setHoveredCell(resolveHeatmapCell(event))}
                onMouseLeave={() => setHoveredCell(null)}
                onClick={(event) => {
                  const cell = resolveHeatmapCell(event)
                  if (cell) {
                    onSelectConcept(cell.row.rowKey)
                  }
                }}
              />
            </Box>
          </Paper>
          {hoveredCell ? (
            <Alert severity="info">
              <strong>{hoveredCell.row.conceptName ?? hoveredCell.row.conceptId}</strong>
              {` | ${hoveredCell.block} | `}
              {hoveredCell.block === "Concept"
                ? `best cross-analysis -log10(p) ${hoveredCell.value == null ? "N/A" : formatNumber(hoveredCell.value, 2)} | repeat evidence ${getRepeatEvidenceCount(hoveredCell.row, repeatThreshold)}`
                : `-log10(p) ${hoveredCell.value == null ? "N/A" : formatNumber(hoveredCell.value, 2)} | repeat evidence ${getRepeatEvidenceCount(hoveredCell.row, repeatThreshold)}`}
            </Alert>
          ) : (
            <Alert severity="info">Hover a heatmap cell to inspect the concept and score.</Alert>
          )}
        </Stack>
      )}
    </Stack>
  )
}
