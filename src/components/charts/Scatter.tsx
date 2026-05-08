import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  useTheme,
  type SelectChangeEvent,
} from "@mui/material"
import type { ConceptRow } from "../../utils/types"
import {
  ChartsClipPath,
  rainbowSurgePalette,
  ScatterChart,
  useSeries,
  useXScale,
  useYScale,
} from "@mui/x-charts"
import { Fragment } from "react/jsx-runtime"
import { useId, useState } from "react"

type ScatterKey = "pValue" | "effectSize" | "standarizeMeanDifference"

type KeyOption = {
  label: string
  key: ScatterKey
}

const KEYS: KeyOption[] = [
  { label: "P-Value", key: "pValue" },
  { label: "Effect Size", key: "effectSize" },
  { label: "Standardized Mean Difference", key: "standarizeMeanDifference" },
]

type ScatterDimensions = {
  x: ScatterKey
  y: ScatterKey
}

export function Scatter({ data }: { data: ConceptRow[] }) {
  const theme = useTheme()
  const palette = rainbowSurgePalette(theme.palette.mode)

  const [scatterPlotDimensions, setScatterPlotDimensions] = useState<ScatterDimensions>({
    x: KEYS[0].key,
    y: KEYS[1].key,
  })

  const scatterDataset = data.map((d) => ({
    uniqID: `${d.conceptId}-${d.conceptName}-${d.domainId}`,
    id: d.conceptId,
    name: d.conceptName,
    x1: d.t_Binary[0][0][scatterPlotDimensions.x],
    y1: d.t_Binary[0][0][scatterPlotDimensions.y],
  }))

  const handleChange = (axis: keyof ScatterDimensions) => (e: SelectChangeEvent<ScatterKey>) => {
    setScatterPlotDimensions((prev) => ({ ...prev, [axis]: e.target.value as ScatterKey }))
  }

  return (
    <Grid spacing={2} size={{ xs: 12, md: 6 }}>
      <Grid spacing={2} direction={"row"}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>X Axis</InputLabel>
          <Select<ScatterKey>
            value={scatterPlotDimensions.x}
            label="X Axis"
            onChange={handleChange("x")}
          >
            {KEYS.map((k) => (
              <MenuItem key={k.key} value={k.key}>
                {k.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Y Axis</InputLabel>
          <Select<ScatterKey>
            value={scatterPlotDimensions.y}
            label="Y Axis"
            onChange={handleChange("y")}
          >
            {KEYS.map((k) => (
              <MenuItem key={k.key} value={k.key}>
                {k.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Paper sx={{ width: "100%", height: 400 }}>
        <ScatterChart
          hideLegend
          dataset={scatterDataset}
          series={[
            {
              id: "has-value",
              datasetKeys: { x: "x1", y: "y1", id: "uniqID" },
              markerSize: 3,
              label: "Concept",
              color: palette[2],
              valueFormatter: (v) => v && `${v.id} with  ${v.x} pVal and ${v.y} effect size `,
            },
            //   {
            //     id: "no-value",
            //     datasetKeys: { x: "x2", y: "y2" },
            //     markerSize: 3,
            //     label: "No Value",
            //     color: palette[3],
            //   },
          ]}
          xAxis={[
            {
              height: 50,
              tickLabelPlacement: "middle",
              tickLabelStyle: { fontSize: 10, fontWeight: "bold" },
              label: KEYS.filter((k) => k.key === scatterPlotDimensions.x)[0].label,
              labelStyle: { fontSize: 10, fontWeight: "bold" },
            },
          ]}
          yAxis={[
            {
              width: 75,
              tickLabelPlacement: "middle",
              tickLabelStyle: { fontSize: 10, fontWeight: "bold" },
              label: KEYS.filter((k) => k.key === scatterPlotDimensions.y)[0].label,
              labelStyle: { fontSize: 10, fontWeight: "bold" },
            },
          ]}
          grid={{ vertical: true, horizontal: true }}
        >
          <RegressionLine seriesId="has-value" colorIndex={2} />
          {/* <RegressionLine seriesId="no-value" colorIndex={3} /> */}
        </ScatterChart>
      </Paper>
    </Grid>
  )
}

function RegressionLine({ seriesId, colorIndex }: { seriesId: string; colorIndex: number }) {
  const theme = useTheme()
  const palette = rainbowSurgePalette(theme.palette.mode)
  const stroke = palette[colorIndex]
  const allSeries = useSeries()
  const series = allSeries.scatter!.series[seriesId]!
  const xScale = useXScale(series.xAxisId!)
  const yScale = useYScale(series.yAxisId!)
  const clipPathId = `linear-regression-clip-${useId()}`

  const { m, b } = linearRegression(series.data ?? [])

  const xDomain = xScale.domain() as [number, number]
  const x1 = xScale(xDomain[0])
  const x2 = xScale(xDomain[1])
  const y1 = yScale(m * xDomain[0] + b)
  const y2 = yScale(m * xDomain[1] + b)

  return (
    <Fragment>
      <ChartsClipPath id={clipPathId} />
      <g clipPath={`url(#${clipPathId})`}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={1} strokeOpacity={0.5} />
      </g>
    </Fragment>
  )
}

function linearRegression(points: ReadonlyArray<{ x: number; y: number }>) {
  const n = points.length

  // Calculate sums
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0

  for (let i = 0; i < n; i += 1) {
    const x = points[i].x
    const y = points[i].y
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  // Calculate slope (m) and intercept (b)
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const b = (sumY - m * sumX) / n

  return { m, b }
}
