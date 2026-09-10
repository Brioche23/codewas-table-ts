import type { MRT_ColumnFiltersState } from "material-react-table"

// ─── Distribution row (used in d_Binary, d_Counts, d_AgeFirstEvent, d_DaysToFirstEvent) ───
export interface DistributionRow {
  Measure: string
  Cases: number
  Controls: number
}

// ─── Binary ───
export interface BinaryCount {
  nCasesWithCategory: number
  nControlsWithCategory: number
}

export interface BinaryDistribution {
  value: string
  case: number
  control: number
}

export interface Test {
  pValue: number
  effectSize: number
  standarizeMeanDifference: number
  testName: string
}

// ─── Counts / Age / Days ───
export interface SummaryStats {
  meanValueCases: number
  meanValueControls: number
  sdValueCases: number
  sdValueControls: number
}

export interface ContinuousCount {
  nControlsYesWithValue: number
  nCasesYesWithValue: number
}

export interface ConceptMetadata {
  conceptId: number
  vocabularyId?: string | null
  conceptClassId?: string | null
  conceptName?: string | null
  conceptCode?: string | null
}

// ─── Top-level Concept row ───
export interface ConceptRow {
  conceptId: number
  ancestorConceptIds: number[]
  ancestorConcepts?: ConceptMetadata[]
  conceptName: string
  sourceConceptCode?: string
  domainId: string
  countMode?: "code" | "descendant" | string
  isStandard: boolean

  // Binary
  n_Binary: BinaryCount[]
  d_Binary: BinaryDistribution[][]
  t_Binary: Test[][]

  // Counts
  s_Counts: SummaryStats[]
  d_Counts: DistributionRow[][][]
  t_Counts: Test[][]

  // Age at first event
  s_AgeFirstEvent: SummaryStats[]
  d_AgeFirstEvent: DistributionRow[][][]
  t_AgeFirstEvent: Test[][]

  // Days to first event
  s_DaysToFirstEvent: SummaryStats[]
  d_DaysToFirstEvent: DistributionRow[][][]
  t_DaysToFirstEvent: Test[][]

  // Continuous / Categorical (may be empty objects)
  n_Continuous: ContinuousCount[]
  s_Continuous: SummaryStats[]
  d_Continuous: DistributionRow[][][]
  t_Continuous: Test[][]

  // Categorical (is Binary)
  n_Categorical: BinaryCount[]
  d_Categorical: BinaryDistribution[][]
  t_Categorical: Test[][]

  // [k: string]: unknown
}

export interface ConceptTableProps {
  data: ConceptRow[]
  setData: React.Dispatch<React.SetStateAction<ConceptRow[] | null>>
  pageView: PageViewOptions
}

export interface DuckDbTableCount {
  tableName: string
  rowCount: number
}

export interface DuckDbPreviewSection {
  title: string
  rows: Record<string, unknown>[]
}

export interface DuckDbDataSource {
  kind: "duckdb"
  sourceLabel: string
  sourceBytes: Uint8Array
  fileSize: number // source file size in bytes
  loadMs: number // time spent loading/processing the database
  columnCount: number // distinct analysis types (heatmap/table column groups)
  tableCounts: DuckDbTableCount[]
  previewSections: DuckDbPreviewSection[]
  runQuery: (sql: string) => Promise<Record<string, unknown>[]>
}

export interface JsonDataSource {
  kind: "json"
  rows: ConceptRow[]
  fileSize?: number // source file size in bytes (when known)
  loadMs?: number // time spent fetching/parsing (when known)
}

export type LoadedDataSource = JsonDataSource | DuckDbDataSource

// Shape of a saved preset stored in localStorage
export type FilterPreset = {
  id: string // unique id, e.g. crypto timestamp
  name: string
  filters: MRT_ColumnFiltersState // only the filters the user checked
  countMode?: string // DuckDB full-snapshot extras (absent for JSON presets)
  selectedDomain?: string
  aiCategory?: string // only meaningful for databases carrying the AI review tables
  searchText?: string
}

export type Columns = "Binary" | "Count" | "Age" | "Days" | "Continuous" | "Categorical"

export type ColumnsOption = {
  label: string
  key: Columns
}

export type PageViewOptions = "table" | "charts"
