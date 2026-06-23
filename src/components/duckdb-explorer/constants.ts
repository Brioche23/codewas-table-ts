import type { MRT_ColumnFiltersState } from "material-react-table"
import type { AnalysisBlock, ChartBlockKey } from "./types"

export const DISPLAY_ANALYSIS_TYPES: AnalysisBlock[] = [
  "Binary",
  "Counts",
  "AgeFirstEvent",
  "DaysToFirstEvent",
  "Continuous",
  "Categorical",
]

export const CHART_BLOCK_FIELD_PREFIX: Record<ChartBlockKey, string> = {
  Binary: "binary",
  Count: "counts",
  Age: "age",
  Days: "days",
  Continuous: "continuous",
  Categorical: "categorical",
}

export const HEATMAP_BLOCKS: ChartBlockKey[] = [
  "Binary",
  "Count",
  "Age",
  "Days",
  "Continuous",
  "Categorical",
]

export const DEFAULT_COLUMN_FILTERS: MRT_ColumnFiltersState = [
  { id: "binaryCasesControl", value: ">= 5" },
  { id: "binaryLogP", value: ">= 5" },
]

// Max rows fetched from DuckDB for chart views. TSV exports bypass this. The heatmap uses a lean
// projection (buildHeatmapQuery) and canvas virtualization, so it can handle tens of thousands.
export const CHART_ROWS_LIMIT = 50000
// Greedy nearest-neighbor clustering is O(n²); only the top-N by evidence are clustered, the rest
// are appended by strength. Keeps the "clustered" order mode responsive at scale.
export const HEATMAP_MAX_CLUSTER_ROWS = 1500
// @mui/x-charts ScatterChart renders SVG — no virtualization.
export const SCATTER_POINT_CAP = 3000
