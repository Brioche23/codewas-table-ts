import { useMemo, useState, type ReactNode } from "react"
import {
  Alert,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
} from "@mui/material"
import { ScatterChart } from "@mui/x-charts"
import { COLUMNS } from "../../utils/constants"
import { SCATTER_POINT_CAP } from "./constants"
import { getChartMetricValue } from "./heatmapUtils"
import type { ChartBlockKey, ChartMetricKey, ConceptSummaryRow } from "./types"

export function DuckDbScatter({
  rows,
  chartLoading,
  sharedControls,
}: {
  rows: ConceptSummaryRow[]
  chartLoading: boolean
  sharedControls: ReactNode
}) {
  const [xBlock, setXBlock] = useState<ChartBlockKey>("Binary")
  const [yBlock, setYBlock] = useState<ChartBlockKey>("Count")
  const [metric, setMetric] = useState<ChartMetricKey>("-log10")

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

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        {sharedControls}
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
      </Grid>

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
    </Stack>
  )
}
