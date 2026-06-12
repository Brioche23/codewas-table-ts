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

// Max rows fetched from DuckDB for chart views. TSV exports bypass this.
export const CHART_ROWS_LIMIT = 5000
// Canvas browser limit is ~32767px; at 10px/row that's ~3200. Stay well under it.
export const HEATMAP_ROW_CAP = 2500
// @mui/x-charts ScatterChart renders SVG — no virtualization.
export const SCATTER_POINT_CAP = 3000
