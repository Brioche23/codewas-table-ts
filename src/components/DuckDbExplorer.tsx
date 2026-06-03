import { useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent, type SetStateAction } from "react"
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
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
import { alpha } from "@mui/material/styles"
import {
  MaterialReactTable,
  type MRT_ColumnFiltersState,
  type MRT_ColumnDef,
  type MRT_FilterFn,
  type MRT_PaginationState,
  type MRT_Row,
  type MRT_SortingState,
  useMaterialReactTable,
} from "material-react-table"
import { ScatterChart } from "@mui/x-charts"
import type { BinaryDistribution, DistributionRow, DuckDbDataSource, PageViewOptions, SummaryStats } from "../utils/types"
import { CasesControlCell } from "../table/custom-cells/CasesControlsCell"
import { CategoryBar, CategoricalDistributionBar, MeanComparisonChart } from "./Visuals"
import { COLUMNS } from "../utils/constants"

type AnalysisBlock =
  | "Binary"
  | "Categorical"
  | "Counts"
  | "AgeFirstEvent"
  | "DaysToFirstEvent"
  | "Continuous"

type ConceptSummaryRow = {
  rowKey: string
  conceptId: number
  conceptName: string | null
  conceptCode: string | null
  ancestorConceptIds: string | null
  domainId: string
  countMode: string
  bestPValue: number | null
  binaryCaseYes?: number | null
  binaryControlYes?: number | null
  binaryTotalCases?: number | null
  binaryTotalControls?: number | null
  binaryPValue?: number | null
  binaryEffectSize?: number | null
  binarySmd?: number | null
  binaryTestName?: string | null
  categoricalCaseYes?: number | null
  categoricalControlYes?: number | null
  categoricalPValue?: number | null
  categoricalEffectSize?: number | null
  categoricalSmd?: number | null
  categoricalTestName?: string | null
  categoricalDistribution?: string | null
  countsCaseCount?: number | null
  countsControlCount?: number | null
  countsCaseMean?: number | null
  countsControlMean?: number | null
  countsCaseSd?: number | null
  countsControlSd?: number | null
  countsP10Case?: number | null
  countsP25Case?: number | null
  countsMedianCase?: number | null
  countsP75Case?: number | null
  countsP90Case?: number | null
  countsP10Control?: number | null
  countsP25Control?: number | null
  countsMedianControl?: number | null
  countsP75Control?: number | null
  countsP90Control?: number | null
  countsPValue?: number | null
  countsEffectSize?: number | null
  countsSmd?: number | null
  countsTestName?: string | null
  ageCaseCount?: number | null
  ageControlCount?: number | null
  ageCaseMean?: number | null
  ageControlMean?: number | null
  ageCaseSd?: number | null
  ageControlSd?: number | null
  ageP10Case?: number | null
  ageP25Case?: number | null
  ageMedianCase?: number | null
  ageP75Case?: number | null
  ageP90Case?: number | null
  ageP10Control?: number | null
  ageP25Control?: number | null
  ageMedianControl?: number | null
  ageP75Control?: number | null
  ageP90Control?: number | null
  agePValue?: number | null
  ageEffectSize?: number | null
  ageSmd?: number | null
  ageTestName?: string | null
  daysCaseCount?: number | null
  daysControlCount?: number | null
  daysCaseMean?: number | null
  daysControlMean?: number | null
  daysCaseSd?: number | null
  daysControlSd?: number | null
  daysP10Case?: number | null
  daysP25Case?: number | null
  daysMedianCase?: number | null
  daysP75Case?: number | null
  daysP90Case?: number | null
  daysP10Control?: number | null
  daysP25Control?: number | null
  daysMedianControl?: number | null
  daysP75Control?: number | null
  daysP90Control?: number | null
  daysPValue?: number | null
  daysEffectSize?: number | null
  daysSmd?: number | null
  daysTestName?: string | null
  continuousCaseCount?: number | null
  continuousControlCount?: number | null
  continuousCaseMean?: number | null
  continuousControlMean?: number | null
  continuousCaseSd?: number | null
  continuousControlSd?: number | null
  continuousP10Case?: number | null
  continuousP25Case?: number | null
  continuousMedianCase?: number | null
  continuousP75Case?: number | null
  continuousP90Case?: number | null
  continuousP10Control?: number | null
  continuousP25Control?: number | null
  continuousMedianControl?: number | null
  continuousP75Control?: number | null
  continuousP90Control?: number | null
  continuousPValue?: number | null
  continuousEffectSize?: number | null
  continuousSmd?: number | null
  continuousTestName?: string | null
  continuousUnit?: string | null
  subRows?: ConceptSummaryRow[]
}

type BlockMetricRow = Record<string, unknown>
type ChartBlockKey = "Binary" | "Count" | "Age" | "Days" | "Continuous" | "Categorical"
type ChartMetricKey = "-log10" | "effectSize"
type ChartMode = "heatmap" | "scatter"
type ChartScope = "filtered" | "all"
type TableMode = "flat" | "hierarchy"
type HeatmapCell = {
  row: ConceptSummaryRow
  block: ChartBlockKey | "Concept"
  value: number | null
}

const DISPLAY_ANALYSIS_TYPES: AnalysisBlock[] = [
  "Binary",
  "Counts",
  "AgeFirstEvent",
  "DaysToFirstEvent",
  "Continuous",
  "Categorical",
]

const CHART_BLOCK_FIELD_PREFIX: Record<ChartBlockKey, string> = {
  Binary: "binary",
  Count: "counts",
  Age: "age",
  Days: "days",
  Continuous: "continuous",
  Categorical: "categorical",
}
const HEATMAP_BLOCKS: ChartBlockKey[] = ["Binary", "Count", "Age", "Days", "Continuous", "Categorical"]

function escapeSqlString(value: string) {
  return value.replace(/'/g, "''")
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return ""
  if (!Number.isFinite(value)) return String(value)
  return value.toFixed(digits)
}

function valueChip(value: number | null | undefined, threshold: number, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <Typography variant="body2">N/A</Typography>
  }
  return (
    <Chip
      label={formatNumber(value, digits)}
      size="small"
      color={value >= threshold ? "success" : "default"}
      variant={value >= threshold ? "filled" : "outlined"}
    />
  )
}

function parseCategoricalDistribution(value: string | null | undefined): BinaryDistribution[] {
  if (!value) return []
  return value
    .split("|")
    .map((part) => {
      const [label, caseValue, controlValue] = part.split("::")
      return {
        value: label,
        case: Number(caseValue ?? 0),
        control: Number(controlValue ?? 0),
      }
    })
    .filter((item) => item.value)
}

function buildStats(caseMean?: number | null, controlMean?: number | null, caseSd?: number | null, controlSd?: number | null) {
  if ([caseMean, controlMean, caseSd, controlSd].some((value) => value === null || value === undefined)) {
    return null
  }
  return {
    meanValueCases: caseMean as number,
    meanValueControls: controlMean as number,
    sdValueCases: caseSd as number,
    sdValueControls: controlSd as number,
  } satisfies SummaryStats
}

function buildDistributionRows(
  caseP10?: number | null,
  caseP25?: number | null,
  caseMedian?: number | null,
  caseP75?: number | null,
  caseP90?: number | null,
  controlP10?: number | null,
  controlP25?: number | null,
  controlMedian?: number | null,
  controlP75?: number | null,
  controlP90?: number | null,
) {
  const values: [string, number | null | undefined, number | null | undefined][] = [
    ["P10", caseP10, controlP10],
    ["P25", caseP25, controlP25],
    ["Median", caseMedian, controlMedian],
    ["P75", caseP75, controlP75],
    ["P90", caseP90, controlP90],
  ]
  if (values.every(([, caseValue, controlValue]) => caseValue == null && controlValue == null)) {
    return null
  }
  return values.map(
    ([measure, caseValue, controlValue]) =>
      ({
        Measure: measure,
        Cases: Number(caseValue ?? 0),
        Controls: Number(controlValue ?? 0),
      }) satisfies DistributionRow,
  )
}

function buildSummaryQueryCtes(countMode: string, domainId: string, searchText: string) {
  const safeCountMode = countMode === "all" ? null : escapeSqlString(countMode)
  const safeDomain = domainId === "all" ? null : escapeSqlString(domainId)
  const safeSearch = searchText.trim() ? escapeSqlString(searchText.trim().toLowerCase()) : null

  return `
    WITH base AS (
      SELECT
        st.conceptId,
        cr.conceptName,
        cr.conceptCode,
        cr.ancestorConceptIds,
        ar.domainId,
        st.countMode,
        MIN(st.pValue) AS bestPValue
      FROM statisticalTests AS st
      JOIN analysisRef AS ar ON ar.analysisId = st.analysisId
      LEFT JOIN conceptRef AS cr ON cr.conceptId = st.conceptId
      WHERE ar.analysisType IN (${DISPLAY_ANALYSIS_TYPES.map((type) => `'${type}'`).join(", ")})
        ${safeCountMode ? `AND st.countMode = '${safeCountMode}'` : ""}
        ${safeDomain ? `AND ar.domainId = '${safeDomain}'` : ""}
        ${
          safeSearch
            ? `AND (
                lower(coalesce(cr.conceptName, '')) LIKE '%${safeSearch}%'
                OR lower(coalesce(cr.conceptCode, '')) LIKE '%${safeSearch}%'
                OR CAST(st.conceptId AS VARCHAR) LIKE '%${safeSearch}%'
              )`
            : ""
        }
      GROUP BY st.conceptId, cr.conceptName, cr.conceptCode, cr.ancestorConceptIds, ar.domainId, st.countMode
    ),
    binary_stats AS (
      SELECT
        b.conceptId,
        b.domainId,
        b.countMode,
        MAX(case_cov.sumValue) AS binaryCaseYes,
        MAX(control_cov.sumValue) AS binaryControlYes,
        MAX(case_totals.cohortSubjects) AS binaryTotalCases,
        MAX(control_totals.cohortSubjects) AS binaryTotalControls,
        MIN(st.pValue) AS binaryPValue,
        MAX(st.effectSize) AS binaryEffectSize,
        MAX(st.standarizeMeanDifference) AS binarySmd,
        MAX(st.testName) AS binaryTestName
      FROM base AS b
      JOIN statisticalTests AS st ON st.conceptId = b.conceptId AND st.countMode = b.countMode
      JOIN analysisRef AS ar ON ar.analysisId = st.analysisId AND ar.domainId = b.domainId AND ar.analysisType = 'Binary'
      JOIN comparisons AS cmp ON cmp.comparisonId = st.comparisonId
      LEFT JOIN covariates AS case_cov
        ON case_cov.cohortDefinitionId = cmp.caseCohortId
       AND case_cov.analysisId = st.analysisId
       AND case_cov.conceptId = st.conceptId
       AND case_cov.countMode = st.countMode
      LEFT JOIN covariates AS control_cov
        ON control_cov.cohortDefinitionId = cmp.controlCohortId
       AND control_cov.analysisId = st.analysisId
       AND control_cov.conceptId = st.conceptId
       AND control_cov.countMode = st.countMode
      LEFT JOIN cohortCounts AS case_totals ON case_totals.cohortId = cmp.caseCohortId
      LEFT JOIN cohortCounts AS control_totals ON control_totals.cohortId = cmp.controlCohortId
      GROUP BY b.conceptId, b.domainId, b.countMode
    ),
    categorical_stats AS (
      SELECT
        b.conceptId,
        b.domainId,
        b.countMode,
        SUM(coalesce(case_cov.sumValue, 0)) AS categoricalCaseYes,
        SUM(coalesce(control_cov.sumValue, 0)) AS categoricalControlYes,
        MIN(st.pValue) AS categoricalPValue,
        MAX(st.effectSize) AS categoricalEffectSize,
        MAX(st.standarizeMeanDifference) AS categoricalSmd,
        MAX(st.testName) AS categoricalTestName,
        string_agg(
          coalesce(cat_ref.conceptName, 'Unknown') || '::' ||
          CAST(coalesce(case_cov.sumValue, 0) AS VARCHAR) || '::' ||
          CAST(coalesce(control_cov.sumValue, 0) AS VARCHAR),
          '|'
          ORDER BY coalesce(cat_ref.conceptName, 'Unknown')
        ) AS categoricalDistribution
      FROM base AS b
      JOIN statisticalTests AS st ON st.conceptId = b.conceptId AND st.countMode = b.countMode
      JOIN analysisRef AS ar ON ar.analysisId = st.analysisId AND ar.domainId = b.domainId AND ar.analysisType = 'Categorical'
      JOIN comparisons AS cmp ON cmp.comparisonId = st.comparisonId
      LEFT JOIN covariates AS case_cov
        ON case_cov.cohortDefinitionId = cmp.caseCohortId
       AND case_cov.analysisId = st.analysisId
       AND case_cov.conceptId = st.conceptId
       AND case_cov.countMode = st.countMode
      LEFT JOIN covariates AS control_cov
        ON control_cov.cohortDefinitionId = cmp.controlCohortId
       AND control_cov.analysisId = st.analysisId
       AND control_cov.conceptId = st.conceptId
       AND control_cov.countMode = st.countMode
       AND control_cov.categoryId = case_cov.categoryId
      LEFT JOIN conceptRef AS cat_ref ON cat_ref.conceptId = case_cov.categoryId
      GROUP BY b.conceptId, b.domainId, b.countMode
    ),
    counts_stats AS (
      SELECT * FROM (${buildContinuousBlockQueryFromBase("Counts", "counts")})
    ),
    age_stats AS (
      SELECT * FROM (${buildContinuousBlockQueryFromBase("AgeFirstEvent", "age")})
    ),
    days_stats AS (
      SELECT * FROM (${buildContinuousBlockQueryFromBase("DaysToFirstEvent", "days")})
    ),
    continuous_stats AS (
      SELECT * FROM (${buildContinuousBlockQueryFromBase("Continuous", "continuous")})
    ),
    final_rows AS (
      SELECT
        CAST(b.conceptId AS VARCHAR) || '|' || b.domainId || '|' || b.countMode AS rowKey,
        b.conceptId,
        b.conceptName,
        b.conceptCode,
        b.ancestorConceptIds,
        b.domainId,
        b.countMode,
        b.bestPValue,
        bs.binaryCaseYes,
        bs.binaryControlYes,
        bs.binaryTotalCases,
        bs.binaryTotalControls,
        bs.binaryPValue,
        CASE WHEN bs.binaryPValue > 0 THEN -log10(bs.binaryPValue) ELSE NULL END AS binaryLogP,
        bs.binaryEffectSize,
        bs.binarySmd,
        bs.binaryTestName,
        cs.categoricalCaseYes,
        cs.categoricalControlYes,
        cs.categoricalPValue,
        CASE WHEN cs.categoricalPValue > 0 THEN -log10(cs.categoricalPValue) ELSE NULL END AS categoricalLogP,
        cs.categoricalEffectSize,
        cs.categoricalSmd,
        cs.categoricalTestName,
        cs.categoricalDistribution,
        cts.* EXCLUDE (conceptId, domainId, countMode),
        ags.* EXCLUDE (conceptId, domainId, countMode),
        dys.* EXCLUDE (conceptId, domainId, countMode),
        cos.* EXCLUDE (conceptId, domainId, countMode)
      FROM base AS b
      LEFT JOIN binary_stats AS bs ON bs.conceptId = b.conceptId AND bs.domainId = b.domainId AND bs.countMode = b.countMode
      LEFT JOIN categorical_stats AS cs ON cs.conceptId = b.conceptId AND cs.domainId = b.domainId AND cs.countMode = b.countMode
      LEFT JOIN counts_stats AS cts ON cts.conceptId = b.conceptId AND cts.domainId = b.domainId AND cts.countMode = b.countMode
      LEFT JOIN age_stats AS ags ON ags.conceptId = b.conceptId AND ags.domainId = b.domainId AND ags.countMode = b.countMode
      LEFT JOIN days_stats AS dys ON dys.conceptId = b.conceptId AND dys.domainId = b.domainId AND dys.countMode = b.countMode
      LEFT JOIN continuous_stats AS cos ON cos.conceptId = b.conceptId AND cos.domainId = b.domainId AND cos.countMode = b.countMode
    )
  `
}

function buildContinuousBlockQueryFromBase(analysisType: string, prefix: "counts" | "age" | "days" | "continuous") {
  return `
    SELECT
      b.conceptId,
      b.domainId,
      b.countMode,
      MAX(case_cov.countValue) AS ${prefix}CaseCount,
      MAX(control_cov.countValue) AS ${prefix}ControlCount,
      MAX(case_cov.averageValue) AS ${prefix}CaseMean,
      MAX(control_cov.averageValue) AS ${prefix}ControlMean,
      MAX(case_cov.standardDeviation) AS ${prefix}CaseSd,
      MAX(control_cov.standardDeviation) AS ${prefix}ControlSd,
      MAX(case_cov.p10Value) AS ${prefix}P10Case,
      MAX(case_cov.p25Value) AS ${prefix}P25Case,
      MAX(case_cov.medianValue) AS ${prefix}MedianCase,
      MAX(case_cov.p75Value) AS ${prefix}P75Case,
      MAX(case_cov.p90Value) AS ${prefix}P90Case,
      MAX(control_cov.p10Value) AS ${prefix}P10Control,
      MAX(control_cov.p25Value) AS ${prefix}P25Control,
      MAX(control_cov.medianValue) AS ${prefix}MedianControl,
      MAX(control_cov.p75Value) AS ${prefix}P75Control,
      MAX(control_cov.p90Value) AS ${prefix}P90Control,
      MIN(st.pValue) AS ${prefix}PValue,
      CASE WHEN MIN(st.pValue) > 0 THEN -log10(MIN(st.pValue)) ELSE NULL END AS ${prefix}LogP,
      MAX(st.effectSize) AS ${prefix}EffectSize,
      MAX(st.standarizeMeanDifference) AS ${prefix}Smd,
      MAX(st.testName) AS ${prefix}TestName,
      MAX(case_cov.unit) AS ${prefix}Unit
    FROM base AS b
    JOIN statisticalTests AS st ON st.conceptId = b.conceptId AND st.countMode = b.countMode
    JOIN analysisRef AS ar ON ar.analysisId = st.analysisId AND ar.domainId = b.domainId AND ar.analysisType = '${analysisType}'
    JOIN comparisons AS cmp ON cmp.comparisonId = st.comparisonId
    LEFT JOIN covariatesContinuous AS case_cov
      ON case_cov.cohortDefinitionId = cmp.caseCohortId
     AND case_cov.analysisId = st.analysisId
     AND case_cov.conceptId = st.conceptId
     AND case_cov.countMode = st.countMode
    LEFT JOIN covariatesContinuous AS control_cov
      ON control_cov.cohortDefinitionId = cmp.controlCohortId
     AND control_cov.analysisId = st.analysisId
     AND control_cov.conceptId = st.conceptId
     AND control_cov.countMode = st.countMode
     AND coalesce(control_cov.unit, '') = coalesce(case_cov.unit, '')
    GROUP BY b.conceptId, b.domainId, b.countMode
  `
}

function buildFilterConditions(columnFilters: MRT_ColumnFiltersState, includeStartupDefaults = true) {
  const conditions = includeStartupDefaults ? ["coalesce(binaryCaseYes, 0) >= 5", "coalesce(binaryLogP, 0) >= 5"] : []
  const textLike = (sqlExpr: string, value: string) => {
    const safe = escapeSqlString(value.trim().toLowerCase())
    return `lower(coalesce(${sqlExpr}, '')) LIKE '%${safe}%'`
  }
  const numericExpr = (sqlExpr: string, value: string) => {
    const parsed = parseNumericFilter(value)
    if (!parsed) return null
    return `${sqlExpr} ${parsed.operator} ${parsed.value}`
  }
  const numericMap: Record<string, string> = {
    binaryCasesControl: "binaryCaseYes",
    binaryLogP: "binaryLogP",
    binaryEffect: "binaryEffectSize",
    countsMean: "countsCaseMean",
    countsLogP: "countsLogP",
    countsEffect: "countsEffectSize",
    ageMean: "ageCaseMean",
    ageLogP: "ageLogP",
    ageEffect: "ageEffectSize",
    daysMean: "daysCaseMean",
    daysLogP: "daysLogP",
    daysEffect: "daysEffectSize",
    continuousMean: "continuousCaseMean",
    continuousLogP: "continuousLogP",
    continuousEffect: "continuousEffectSize",
    categoricalCasesControl: "categoricalCaseYes",
    categoricalLogP: "categoricalLogP",
    categoricalEffect: "categoricalEffectSize",
  }

  for (const filter of columnFilters) {
    const raw = String(filter.value ?? "").trim()
    if (!raw) continue
    if (filter.id === "conceptInfo") {
      const safe = escapeSqlString(raw.toLowerCase())
      conditions.push(
        `(
          lower(coalesce(conceptName, '')) LIKE '%${safe}%'
          OR lower(coalesce(conceptCode, '')) LIKE '%${safe}%'
          OR CAST(conceptId AS VARCHAR) LIKE '%${safe}%'
          OR lower(coalesce(domainId, '')) LIKE '%${safe}%'
          OR lower(coalesce(countMode, '')) LIKE '%${safe}%'
        )`,
      )
      continue
    }
    if (filter.id === "ancestorConceptIds") {
      conditions.push(textLike("ancestorConceptIds", raw))
      continue
    }
    const mapped = numericMap[filter.id]
    if (mapped) {
      const condition = numericExpr(mapped, raw)
      if (condition) conditions.push(condition)
    }
  }
  return conditions
}

function buildSortExpression(sorting: MRT_SortingState) {
  const sortMap: Record<string, string> = {
    conceptInfo: "conceptName",
    ancestorConceptIds: "ancestorConceptIds",
    binaryCasesControl: "binaryCaseYes",
    binaryLogP: "binaryLogP",
    binaryEffect: "binaryEffectSize",
    countsMean: "countsCaseMean",
    countsLogP: "countsLogP",
    countsEffect: "countsEffectSize",
    ageMean: "ageCaseMean",
    ageLogP: "ageLogP",
    ageEffect: "ageEffectSize",
    daysMean: "daysCaseMean",
    daysLogP: "daysLogP",
    daysEffect: "daysEffectSize",
    continuousMean: "continuousCaseMean",
    continuousLogP: "continuousLogP",
    continuousEffect: "continuousEffectSize",
    categoricalCasesControl: "categoricalCaseYes",
    categoricalLogP: "categoricalLogP",
    categoricalEffect: "categoricalEffectSize",
  }
  if (sorting.length === 0) return "ORDER BY binaryEffectSize DESC NULLS LAST, conceptName ASC"
  const clauses = sorting
    .map((sort) => {
      const expr = sortMap[sort.id]
      if (!expr) return null
      return `${expr} ${sort.desc ? "DESC" : "ASC"} NULLS LAST`
    })
    .filter((value): value is string => Boolean(value))
  return clauses.length > 0 ? `ORDER BY ${clauses.join(", ")}` : "ORDER BY conceptName ASC"
}

function buildPagedSummaryQuery(
  countMode: string,
  domainId: string,
  searchText: string,
  columnFilters: MRT_ColumnFiltersState,
  sorting: MRT_SortingState,
  pagination: MRT_PaginationState,
) {
  const ctes = buildSummaryQueryCtes(countMode, domainId, searchText)
  const conditions = buildFilterConditions(columnFilters, true)
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const orderBy = buildSortExpression(sorting)
  const offset = pagination.pageIndex * pagination.pageSize
  return `
    ${ctes}
    SELECT * FROM final_rows
    ${whereClause}
    ${orderBy}
    LIMIT ${pagination.pageSize}
    OFFSET ${offset}
  `
}

function buildSummaryCountQuery(
  countMode: string,
  domainId: string,
  searchText: string,
  columnFilters: MRT_ColumnFiltersState,
) {
  const ctes = buildSummaryQueryCtes(countMode, domainId, searchText)
  const conditions = buildFilterConditions(columnFilters, true)
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  return `
    ${ctes}
    SELECT COUNT(*) AS rowCount
    FROM final_rows
    ${whereClause}
  `
}

function buildFullSummaryQuery(
  countMode: string,
  domainId: string,
  searchText: string,
  columnFilters: MRT_ColumnFiltersState,
  includeStartupDefaults: boolean,
) {
  const ctes = buildSummaryQueryCtes(countMode, domainId, searchText)
  const conditions = buildFilterConditions(columnFilters, includeStartupDefaults)
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  return `
    ${ctes}
    SELECT * FROM final_rows
    ${whereClause}
    ORDER BY bestPValue ASC NULLS LAST, conceptName ASC
  `
}

function mapSummaryRow(row: BlockMetricRow): ConceptSummaryRow {
  return {
    rowKey: String(row.rowKey),
    conceptId: Number(row.conceptId),
    conceptName: (row.conceptName as string | null) ?? null,
    conceptCode: (row.conceptCode as string | null) ?? null,
    ancestorConceptIds: (row.ancestorConceptIds as string | null) ?? null,
    domainId: String(row.domainId),
    countMode: String(row.countMode),
    bestPValue: (row.bestPValue as number | null) ?? null,
    binaryCaseYes: (row.binaryCaseYes as number | null) ?? null,
    binaryControlYes: (row.binaryControlYes as number | null) ?? null,
    binaryTotalCases: (row.binaryTotalCases as number | null) ?? null,
    binaryTotalControls: (row.binaryTotalControls as number | null) ?? null,
    binaryPValue: (row.binaryPValue as number | null) ?? null,
    binaryEffectSize: (row.binaryEffectSize as number | null) ?? null,
    binarySmd: (row.binarySmd as number | null) ?? null,
    binaryTestName: (row.binaryTestName as string | null) ?? null,
    categoricalCaseYes: (row.categoricalCaseYes as number | null) ?? null,
    categoricalControlYes: (row.categoricalControlYes as number | null) ?? null,
    categoricalPValue: (row.categoricalPValue as number | null) ?? null,
    categoricalEffectSize: (row.categoricalEffectSize as number | null) ?? null,
    categoricalSmd: (row.categoricalSmd as number | null) ?? null,
    categoricalTestName: (row.categoricalTestName as string | null) ?? null,
    categoricalDistribution: (row.categoricalDistribution as string | null) ?? null,
    countsCaseCount: (row.countsCaseCount as number | null) ?? null,
    countsControlCount: (row.countsControlCount as number | null) ?? null,
    countsCaseMean: (row.countsCaseMean as number | null) ?? null,
    countsControlMean: (row.countsControlMean as number | null) ?? null,
    countsCaseSd: (row.countsCaseSd as number | null) ?? null,
    countsControlSd: (row.countsControlSd as number | null) ?? null,
    countsP10Case: (row.countsP10Case as number | null) ?? null,
    countsP25Case: (row.countsP25Case as number | null) ?? null,
    countsMedianCase: (row.countsMedianCase as number | null) ?? null,
    countsP75Case: (row.countsP75Case as number | null) ?? null,
    countsP90Case: (row.countsP90Case as number | null) ?? null,
    countsP10Control: (row.countsP10Control as number | null) ?? null,
    countsP25Control: (row.countsP25Control as number | null) ?? null,
    countsMedianControl: (row.countsMedianControl as number | null) ?? null,
    countsP75Control: (row.countsP75Control as number | null) ?? null,
    countsP90Control: (row.countsP90Control as number | null) ?? null,
    countsPValue: (row.countsPValue as number | null) ?? null,
    countsEffectSize: (row.countsEffectSize as number | null) ?? null,
    countsSmd: (row.countsSmd as number | null) ?? null,
    countsTestName: (row.countsTestName as string | null) ?? null,
    ageCaseCount: (row.ageCaseCount as number | null) ?? null,
    ageControlCount: (row.ageControlCount as number | null) ?? null,
    ageCaseMean: (row.ageCaseMean as number | null) ?? null,
    ageControlMean: (row.ageControlMean as number | null) ?? null,
    ageCaseSd: (row.ageCaseSd as number | null) ?? null,
    ageControlSd: (row.ageControlSd as number | null) ?? null,
    ageP10Case: (row.ageP10Case as number | null) ?? null,
    ageP25Case: (row.ageP25Case as number | null) ?? null,
    ageMedianCase: (row.ageMedianCase as number | null) ?? null,
    ageP75Case: (row.ageP75Case as number | null) ?? null,
    ageP90Case: (row.ageP90Case as number | null) ?? null,
    ageP10Control: (row.ageP10Control as number | null) ?? null,
    ageP25Control: (row.ageP25Control as number | null) ?? null,
    ageMedianControl: (row.ageMedianControl as number | null) ?? null,
    ageP75Control: (row.ageP75Control as number | null) ?? null,
    ageP90Control: (row.ageP90Control as number | null) ?? null,
    agePValue: (row.agePValue as number | null) ?? null,
    ageEffectSize: (row.ageEffectSize as number | null) ?? null,
    ageSmd: (row.ageSmd as number | null) ?? null,
    ageTestName: (row.ageTestName as string | null) ?? null,
    daysCaseCount: (row.daysCaseCount as number | null) ?? null,
    daysControlCount: (row.daysControlCount as number | null) ?? null,
    daysCaseMean: (row.daysCaseMean as number | null) ?? null,
    daysControlMean: (row.daysControlMean as number | null) ?? null,
    daysCaseSd: (row.daysCaseSd as number | null) ?? null,
    daysControlSd: (row.daysControlSd as number | null) ?? null,
    daysP10Case: (row.daysP10Case as number | null) ?? null,
    daysP25Case: (row.daysP25Case as number | null) ?? null,
    daysMedianCase: (row.daysMedianCase as number | null) ?? null,
    daysP75Case: (row.daysP75Case as number | null) ?? null,
    daysP90Case: (row.daysP90Case as number | null) ?? null,
    daysP10Control: (row.daysP10Control as number | null) ?? null,
    daysP25Control: (row.daysP25Control as number | null) ?? null,
    daysMedianControl: (row.daysMedianControl as number | null) ?? null,
    daysP75Control: (row.daysP75Control as number | null) ?? null,
    daysP90Control: (row.daysP90Control as number | null) ?? null,
    daysPValue: (row.daysPValue as number | null) ?? null,
    daysEffectSize: (row.daysEffectSize as number | null) ?? null,
    daysSmd: (row.daysSmd as number | null) ?? null,
    daysTestName: (row.daysTestName as string | null) ?? null,
    continuousCaseCount: (row.continuousCaseCount as number | null) ?? null,
    continuousControlCount: (row.continuousControlCount as number | null) ?? null,
    continuousCaseMean: (row.continuousCaseMean as number | null) ?? null,
    continuousControlMean: (row.continuousControlMean as number | null) ?? null,
    continuousCaseSd: (row.continuousCaseSd as number | null) ?? null,
    continuousControlSd: (row.continuousControlSd as number | null) ?? null,
    continuousP10Case: (row.continuousP10Case as number | null) ?? null,
    continuousP25Case: (row.continuousP25Case as number | null) ?? null,
    continuousMedianCase: (row.continuousMedianCase as number | null) ?? null,
    continuousP75Case: (row.continuousP75Case as number | null) ?? null,
    continuousP90Case: (row.continuousP90Case as number | null) ?? null,
    continuousP10Control: (row.continuousP10Control as number | null) ?? null,
    continuousP25Control: (row.continuousP25Control as number | null) ?? null,
    continuousMedianControl: (row.continuousMedianControl as number | null) ?? null,
    continuousP75Control: (row.continuousP75Control as number | null) ?? null,
    continuousP90Control: (row.continuousP90Control as number | null) ?? null,
    continuousPValue: (row.continuousPValue as number | null) ?? null,
    continuousEffectSize: (row.continuousEffectSize as number | null) ?? null,
    continuousSmd: (row.continuousSmd as number | null) ?? null,
    continuousTestName: (row.continuousTestName as string | null) ?? null,
    continuousUnit: (row.continuousUnit as string | null) ?? null,
  }
}

function makeContinuousColumns(
  header: string,
  colorThreshold: number,
  prefix: "counts" | "age" | "days" | "continuous",
): MRT_ColumnDef<ConceptSummaryRow> {
  return {
    id: prefix,
    header,
    columns: [
      {
        id: `${prefix}Mean`,
        header: "Mean",
        accessorFn: (row) => row[`${prefix}CaseMean` as keyof ConceptSummaryRow] as number | null,
        filterFn: numericExpressionFilter,
        Cell: ({ row }) => {
          const caseMean = row.original[`${prefix}CaseMean` as keyof ConceptSummaryRow] as number | null
          const controlMean = row.original[`${prefix}ControlMean` as keyof ConceptSummaryRow] as number | null
          const caseSd = row.original[`${prefix}CaseSd` as keyof ConceptSummaryRow] as number | null
          const controlSd = row.original[`${prefix}ControlSd` as keyof ConceptSummaryRow] as number | null
          if (caseMean == null || controlMean == null || caseSd == null || controlSd == null) {
            return <Typography variant="body2">N/A</Typography>
          }
          return <CasesControlCell cases={caseMean} controls={controlMean} casesSD={caseSd} controlsSD={controlSd} />
        },
        size: 140,
      },
      {
        id: `${prefix}Distribution`,
        header: "Distribution",
        accessorFn: (row) => row[`${prefix}CaseMean` as keyof ConceptSummaryRow] as number | null,
        Cell: ({ row }) => {
          const stats = buildStats(
            row.original[`${prefix}CaseMean` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}ControlMean` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}CaseSd` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}ControlSd` as keyof ConceptSummaryRow] as number | null,
          )
          const distributions = buildDistributionRows(
            row.original[`${prefix}P10Case` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P25Case` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}MedianCase` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P75Case` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P90Case` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P10Control` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P25Control` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}MedianControl` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P75Control` as keyof ConceptSummaryRow] as number | null,
            row.original[`${prefix}P90Control` as keyof ConceptSummaryRow] as number | null,
          )
          if (!stats || !distributions) return <Typography variant="body2">N/A</Typography>
          return (
            <MeanComparisonChart
              stats={stats}
              distributions={distributions}
              unit={prefix === "continuous" ? ((row.original.continuousUnit as string | null) ?? "") : ""}
            />
          )
        },
        size: 180,
      },
      {
        id: `${prefix}LogP`,
        header: "-log10(p)",
        accessorFn: (row) => {
          const pValue = row[`${prefix}PValue` as keyof ConceptSummaryRow] as number | null
          return pValue && pValue > 0 ? -Math.log10(pValue) : null
        },
        filterFn: numericExpressionFilter,
        Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 8),
        size: 95,
      },
      {
        id: `${prefix}Effect`,
        header: "Effect",
        accessorFn: (row) => row[`${prefix}EffectSize` as keyof ConceptSummaryRow] as number | null,
        filterFn: numericExpressionFilter,
        Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), colorThreshold),
        size: 90,
      },
    ],
  }
}

function buildColumns(): MRT_ColumnDef<ConceptSummaryRow>[] {
  return [
    {
      id: "info",
      header: "Info",
      columns: [
        {
          id: "conceptInfo",
          header: "Concept",
          accessorFn: (row) =>
            [
              row.conceptName ?? "",
              row.conceptCode ?? "",
              String(row.conceptId),
              row.domainId,
              row.countMode,
            ].join(" "),
          Cell: ({ row }) => (
            <Stack
              spacing={0.25}
              sx={{
                pl: row.depth * 1.5,
                borderLeft: row.depth > 0 ? "3px solid" : "none",
                borderColor: row.depth > 0 ? `rgba(25, 118, 210, ${Math.min(0.18 + row.depth * 0.08, 0.42)})` : "transparent",
              }}
            >
              <Typography variant="body2" sx={{ color: "primary.main" }}>
                {row.original.conceptName ?? row.original.conceptId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Source code: {row.original.conceptCode ?? "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Concept ID: {row.original.conceptId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Domain: {row.original.domainId}
              </Typography>
              <Box>
                <Chip
                  size="small"
                  label={row.original.countMode === "descendant" ? "All descendants" : "Exact code"}
                  variant="outlined"
                />
                {row.depth > 0 && (
                  <Chip
                    size="small"
                    label={`Level ${row.depth + 1}`}
                    variant="outlined"
                    sx={{ ml: 0.5 }}
                  />
                )}
              </Box>
            </Stack>
          ),
          size: 240,
        },
        {
          accessorKey: "ancestorConceptIds",
          header: "Ancestors",
          size: 200,
          Cell: ({ cell }) => {
            const value = cell.getValue<string | null>()
            if (!value) return <Typography variant="body2">N/A</Typography>
            return (
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {value.split(",").join("\n")}
              </Typography>
            )
          },
        },
      ],
    },
    {
      id: "binary",
      header: "Binary",
      columns: [
        {
          id: "binaryCasesControl",
          header: "Cases / Controls",
          accessorFn: (row) => row.binaryCaseYes ?? null,
          filterFn: numericExpressionFilter,
          Cell: ({ row }) =>
            row.original.binaryCaseYes != null && row.original.binaryControlYes != null ? (
              <CasesControlCell
                cases={row.original.binaryCaseYes}
                controls={row.original.binaryControlYes}
                nDecimals={0}
              />
            ) : (
              <Typography variant="body2">N/A</Typography>
            ),
          size: 135,
        },
        {
          id: "binaryDistribution",
          header: "Distribution",
          accessorFn: (row) => row.binaryCaseYes ?? null,
          Cell: ({ row }) => {
            const caseCount = row.original.binaryCaseYes
            const controlCount = row.original.binaryControlYes
            const totalCases = row.original.binaryTotalCases
            const totalControls = row.original.binaryTotalControls
            if (caseCount == null || controlCount == null || totalCases == null || totalControls == null) {
              return <Typography variant="body2">N/A</Typography>
            }
            return (
              <CategoryBar
                caseCount={caseCount}
                controlCount={controlCount}
                totalCases={totalCases}
                totalControls={totalControls}
              />
            )
          },
          size: 130,
        },
        {
          id: "binaryLogP",
          header: "-log10(p)",
          accessorFn: (row) => (row.binaryPValue && row.binaryPValue > 0 ? -Math.log10(row.binaryPValue) : null),
          filterFn: numericExpressionFilter,
          Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 8),
          size: 95,
        },
        {
          id: "binaryEffect",
          header: "OR",
          accessorFn: (row) => row.binaryEffectSize ?? null,
          filterFn: numericExpressionFilter,
          Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 1.2),
          size: 90,
        },
      ],
    },
    makeContinuousColumns("Counts", 1.1, "counts"),
    makeContinuousColumns("Age First Event", 1.1, "age"),
    makeContinuousColumns("Days To First Event", 1.1, "days"),
    makeContinuousColumns("Continuous", 1.1, "continuous"),
    {
      id: "categorical",
      header: "Categorical",
      columns: [
        {
          id: "categoricalCasesControl",
          header: "Cases / Controls",
          accessorFn: (row) => row.categoricalCaseYes ?? null,
          filterFn: numericExpressionFilter,
          Cell: ({ row }) =>
            row.original.categoricalCaseYes != null && row.original.categoricalControlYes != null ? (
              <CasesControlCell
                cases={row.original.categoricalCaseYes}
                controls={row.original.categoricalControlYes}
                nDecimals={0}
              />
            ) : (
              <Typography variant="body2">N/A</Typography>
            ),
          size: 135,
        },
        {
          id: "categoricalDistribution",
          header: "Distribution",
          accessorFn: (row) => row.categoricalDistribution ?? null,
          Cell: ({ row }) => {
            const distributions = parseCategoricalDistribution(row.original.categoricalDistribution)
            if (distributions.length === 0) return <Typography variant="body2">N/A</Typography>
            return (
              <CategoricalDistributionBar
                totalCases={row.original.categoricalCaseYes ?? 0}
                totalControls={row.original.categoricalControlYes ?? 0}
                distributions={distributions}
              />
            )
          },
          size: 180,
        },
        {
          id: "categoricalLogP",
          header: "-log10(p)",
          accessorFn: (row) =>
            row.categoricalPValue && row.categoricalPValue > 0 ? -Math.log10(row.categoricalPValue) : null,
          filterFn: numericExpressionFilter,
          Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 8),
          size: 95,
        },
        {
          id: "categoricalEffect",
          header: "Effect",
          accessorFn: (row) => row.categoricalEffectSize ?? null,
          filterFn: numericExpressionFilter,
          Cell: ({ cell }) => valueChip(cell.getValue<number | null>(), 1.2),
          size: 90,
        },
      ],
    },
  ]
}

function getChartMetricValue(row: ConceptSummaryRow, block: ChartBlockKey, metric: ChartMetricKey) {
  const prefix = CHART_BLOCK_FIELD_PREFIX[block]
  if (metric === "effectSize") {
    return row[`${prefix}EffectSize` as keyof ConceptSummaryRow] as number | null
  }
  const pValue = row[`${prefix}PValue` as keyof ConceptSummaryRow] as number | null
  return pValue && pValue > 0 ? -Math.log10(pValue) : null
}

function getBestHeatmapScore(row: ConceptSummaryRow) {
  return Math.max(
    ...HEATMAP_BLOCKS.map((block) => {
      const value = getChartMetricValue(row, block, "-log10")
      return value ?? 0
    }),
  )
}

function getHeatmapColor(value: number | null, maxValue: number) {
  if (value == null) return "#dadada"
  if (!Number.isFinite(value)) return "#8b0000"
  const intensity = Math.min(value / Math.max(maxValue, 1), 1)
  const lightness = 94 - intensity * 46
  return `hsl(5 78% ${lightness}%)`
}

function renderTestSummary(label: string, pValue?: number | null, effectSize?: number | null, smd?: number | null, testName?: string | null) {
  if (pValue == null && effectSize == null && smd == null && !testName) return null
  return (
    <Stack spacing={0.25}>
      <Typography variant="subtitle2">{label}</Typography>
      <Typography variant="body2" color="text.secondary">
        -log10(p): {pValue && pValue > 0 ? formatNumber(-Math.log10(pValue), 2) : "N/A"}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Effect: {effectSize == null ? "N/A" : formatNumber(effectSize, 2)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        SMD: {smd == null ? "N/A" : formatNumber(smd, 2)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Test: {testName ?? "N/A"}
      </Typography>
    </Stack>
  )
}

function ConceptDetailDialog({
  row,
  onClose,
}: {
  row: ConceptSummaryRow | null
  onClose: () => void
}) {
  if (!row) return null

  const binaryDistribution =
    row.binaryCaseYes != null &&
    row.binaryControlYes != null &&
    row.binaryTotalCases != null &&
    row.binaryTotalControls != null ? (
      <CategoryBar
        caseCount={row.binaryCaseYes}
        controlCount={row.binaryControlYes}
        totalCases={row.binaryTotalCases}
        totalControls={row.binaryTotalControls}
      />
    ) : null

  const categoricalDistribution = row.categoricalDistribution ? parseCategoricalDistribution(row.categoricalDistribution) : []

  const continuousSections: Array<{
    title: string
    prefix: "counts" | "age" | "days" | "continuous"
    unit?: string
  }> = [
    { title: "Counts", prefix: "counts" },
    { title: "Age First Event", prefix: "age" },
    { title: "Days To First Event", prefix: "days" },
    { title: "Continuous", prefix: "continuous", unit: row.continuousUnit ?? "" },
  ]

  return (
    <Dialog open={Boolean(row)} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{row.conceptName ?? row.conceptId}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography variant="body2">Source code: {row.conceptCode ?? "N/A"}</Typography>
            <Typography variant="body2">Concept ID: {row.conceptId}</Typography>
            <Typography variant="body2">Domain: {row.domainId}</Typography>
            <Typography variant="body2">Count mode: {row.countMode}</Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
              Ancestors: {row.ancestorConceptIds ? row.ancestorConceptIds.split(",").join("\n") : "N/A"}
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography variant="h6">Binary</Typography>
                  {binaryDistribution ?? <Typography variant="body2">No binary distribution available.</Typography>}
                  {renderTestSummary("Binary statistics", row.binaryPValue, row.binaryEffectSize, row.binarySmd, row.binaryTestName)}
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography variant="h6">Categorical</Typography>
                  {categoricalDistribution.length > 0 ? (
                    <CategoricalDistributionBar
                      totalCases={row.categoricalCaseYes ?? 0}
                      totalControls={row.categoricalControlYes ?? 0}
                      distributions={categoricalDistribution}
                    />
                  ) : (
                    <Typography variant="body2">No categorical distribution available.</Typography>
                  )}
                  {renderTestSummary(
                    "Categorical statistics",
                    row.categoricalPValue,
                    row.categoricalEffectSize,
                    row.categoricalSmd,
                    row.categoricalTestName,
                  )}
                </Stack>
              </Paper>
            </Grid>
            {continuousSections.map((section) => {
              const stats = buildStats(
                row[`${section.prefix}CaseMean` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}ControlMean` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}CaseSd` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}ControlSd` as keyof ConceptSummaryRow] as number | null,
              )
              const distributions = buildDistributionRows(
                row[`${section.prefix}P10Case` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P25Case` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}MedianCase` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P75Case` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P90Case` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P10Control` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P25Control` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}MedianControl` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P75Control` as keyof ConceptSummaryRow] as number | null,
                row[`${section.prefix}P90Control` as keyof ConceptSummaryRow] as number | null,
              )
              return (
                <Grid key={section.prefix} size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Typography variant="h6">{section.title}</Typography>
                      {stats && distributions ? (
                        <MeanComparisonChart stats={stats} distributions={distributions} unit={section.unit ?? ""} />
                      ) : (
                        <Typography variant="body2">No summary distribution available.</Typography>
                      )}
                      {renderTestSummary(
                        `${section.title} statistics`,
                        row[`${section.prefix}PValue` as keyof ConceptSummaryRow] as number | null,
                        row[`${section.prefix}EffectSize` as keyof ConceptSummaryRow] as number | null,
                        row[`${section.prefix}Smd` as keyof ConceptSummaryRow] as number | null,
                        row[`${section.prefix}TestName` as keyof ConceptSummaryRow] as string | null,
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

function parseNumericFilter(filterValue: string) {
  const trimmed = filterValue.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(<=|>=|<|>|=)?\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null
  return {
    operator: match[1] ?? "=",
    value: Number(match[2]),
  }
}

function parseAncestorIds(value: string | null | undefined) {
  if (!value) return []
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item))
}

function buildHierarchyTree(rows: ConceptSummaryRow[]) {
  const descendantRows = rows.filter((row) => row.countMode === "descendant")
  const codeRows = rows.filter((row) => row.countMode === "code")
  const descendantConceptIds = new Set(descendantRows.map((row) => row.conceptId))

  const conceptDepth = new Map<number, number>()
  descendantRows.forEach((row) => {
    const depth = parseAncestorIds(row.ancestorConceptIds).length
    conceptDepth.set(row.conceptId, Math.max(conceptDepth.get(row.conceptId) ?? 0, depth))
  })

  const directParentByConceptId = new Map<number, number | null>()
  descendantConceptIds.forEach((conceptId) => {
    const sampleRow = descendantRows.find((row) => row.conceptId === conceptId)
    const ancestorIds = parseAncestorIds(sampleRow?.ancestorConceptIds)
    const candidateParents = ancestorIds.filter((ancestorId) => descendantConceptIds.has(ancestorId))
    if (candidateParents.length === 0) {
      directParentByConceptId.set(conceptId, null)
      return
    }
    candidateParents.sort((left, right) => (conceptDepth.get(right) ?? 0) - (conceptDepth.get(left) ?? 0))
    directParentByConceptId.set(conceptId, candidateParents[0] ?? null)
  })

  const nodeByRowKey = new Map<string, ConceptSummaryRow>()
  descendantRows.forEach((row) => {
    nodeByRowKey.set(row.rowKey, { ...row, subRows: [] })
  })

  const codeRowsByConceptAndDomain = new Map<string, ConceptSummaryRow[]>()
  codeRows.forEach((row) => {
    const key = `${row.conceptId}|${row.domainId}`
    const rowsForKey = codeRowsByConceptAndDomain.get(key) ?? []
    rowsForKey.push({ ...row, subRows: [] })
    codeRowsByConceptAndDomain.set(key, rowsForKey)
  })

  const descendantRowsByParentConceptId = new Map<number, ConceptSummaryRow[]>()
  descendantRows.forEach((row) => {
    const parentConceptId = directParentByConceptId.get(row.conceptId)
    if (parentConceptId == null) return
    const rowsForParent = descendantRowsByParentConceptId.get(parentConceptId) ?? []
    const node = nodeByRowKey.get(row.rowKey)
    if (node) rowsForParent.push(node)
    descendantRowsByParentConceptId.set(parentConceptId, rowsForParent)
  })

  function attachChildren(node: ConceptSummaryRow) {
    const selfCodeKey = `${node.conceptId}|${node.domainId}`
    const selfCodeRows = (codeRowsByConceptAndDomain.get(selfCodeKey) ?? []).filter((row) => row.rowKey !== node.rowKey)
    const childNodes = (descendantRowsByParentConceptId.get(node.conceptId) ?? []).map((child) => attachChildren(child))
    node.subRows = [...selfCodeRows, ...childNodes]
    return node
  }

  return descendantRows
    .filter((row) => directParentByConceptId.get(row.conceptId) == null)
    .map((row) => nodeByRowKey.get(row.rowKey))
    .filter((row): row is ConceptSummaryRow => Boolean(row))
    .map((row) => attachChildren(row))
}

const numericExpressionFilter: MRT_FilterFn<ConceptSummaryRow> = (row, columnId, filterValue) => {
  const rawValue = row.getValue<number | null>(columnId)
  const value = typeof rawValue === "number" ? rawValue : null
  const filterText = String(filterValue ?? "").trim()
  if (!filterText) return true
  const parsed = parseNumericFilter(filterText)
  if (!parsed || value == null || Number.isNaN(value)) return false
  switch (parsed.operator) {
    case ">":
      return value > parsed.value
    case ">=":
      return value >= parsed.value
    case "<":
      return value < parsed.value
    case "<=":
      return value <= parsed.value
    default:
      return value === parsed.value
  }
}

function DuckDbCharts({
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
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const dataset = useMemo(
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

  const heatmapRows = useMemo(() => [...rows].sort((a, b) => getBestHeatmapScore(b) - getBestHeatmapScore(a)), [rows])
  const maxHeatmapValue = useMemo(
    () => Math.max(1, ...heatmapRows.flatMap((row) => HEATMAP_BLOCKS.map((block) => getChartMetricValue(row, block, "-log10") ?? 0))),
    [heatmapRows],
  )
  const rowHeight = 10
  const headerHeight = 24
  const labelWidth = 240
  const columnWidth = 90
  const canvasWidth = labelWidth + HEATMAP_BLOCKS.length * columnWidth
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

    HEATMAP_BLOCKS.forEach((block, blockIndex) => {
      const x = labelWidth + blockIndex * columnWidth
      context.fillStyle = "#f3f3f3"
      context.fillRect(x, 0, columnWidth, headerHeight)
      context.fillStyle = "#222"
      context.textAlign = "center"
      context.fillText(COLUMNS.find((column) => column.key === block)?.label ?? block, x + columnWidth / 2, headerHeight / 2)
    })

    heatmapRows.forEach((row, rowIndex) => {
      const y = headerHeight + rowIndex * rowHeight
      const label = row.conceptName ? `${row.conceptName} (${row.conceptCode ?? row.conceptId})` : String(row.conceptId)
      context.fillStyle = hoveredCell?.row.rowKey === row.rowKey ? "#f0f4ff" : "#ffffff"
      context.fillRect(0, y, labelWidth, rowHeight - 1)
      context.fillStyle = "#222"
      context.textAlign = "left"
      context.fillText(label.slice(0, 34), 8, y + rowHeight / 2)
      HEATMAP_BLOCKS.forEach((block, blockIndex) => {
        const value = getChartMetricValue(row, block, "-log10")
        context.fillStyle = getHeatmapColor(value, maxHeatmapValue)
        context.fillRect(labelWidth + blockIndex * columnWidth, y, columnWidth - 1, rowHeight - 1)
      })
    })
  }, [canvasHeight, canvasWidth, heatmapRows, hoveredCell, labelWidth, maxHeatmapValue])

  function resolveHeatmapCell(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    if (y < headerHeight) return null
    const rowIndex = Math.floor((y - headerHeight) / rowHeight)
    const row = heatmapRows[rowIndex]
    if (!row) return null
    if (x < labelWidth) {
      return {
        row,
        block: "Concept",
        value: getBestHeatmapScore(row),
      } satisfies HeatmapCell
    }
    const blockIndex = Math.floor((x - labelWidth) / columnWidth)
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
          <FormControl fullWidth>
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
          <FormControl fullWidth>
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
              <FormControl fullWidth>
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
              <FormControl fullWidth>
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
              <FormControl fullWidth>
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
        ) : null}
      </Grid>

      {chartMode === "scatter" ? (
        <>
          {chartLoading && <Alert severity="info">Loading chart concepts from DuckDB...</Alert>}
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
          {dataset.length === 0 && <Alert severity="info">No rows have both selected metrics available.</Alert>}
        </>
      ) : (
        <Stack spacing={1.5}>
          {chartLoading && <Alert severity="info">Loading chart concepts from DuckDB...</Alert>}
          <Typography variant="body2" color="text.secondary">
            Heatmap rows are ordered by strongest cross-analysis significance. Click a cell to jump that concept back into the table.
          </Typography>
          <Paper sx={{ p: 1.5 }}>
            <Box sx={{ overflow: "auto", maxHeight: 560, border: "1px solid", borderColor: "divider" }}>
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
              {hoveredCell.block === "Concept" ? "best cross-analysis -log10(p) " : "-log10(p) "}
              {hoveredCell.value == null ? "N/A" : formatNumber(hoveredCell.value, 2)}
            </Alert>
          ) : (
            <Alert severity="info">Hover a heatmap cell to inspect the concept and score.</Alert>
          )}
        </Stack>
      )}
    </Stack>
  )
}

export default function DuckDbExplorer({
  dataSource,
  pageView,
  setPageView,
}: {
  dataSource: DuckDbDataSource
  pageView: PageViewOptions
  setPageView: Dispatch<SetStateAction<PageViewOptions>>
}) {
  const [countMode, setCountMode] = useState("descendant")
  const [selectedDomain, setSelectedDomain] = useState("all")
  const [searchText, setSearchText] = useState("")
  const [domains, setDomains] = useState<string[]>([])
  const [chartRows, setChartRows] = useState<ConceptSummaryRow[]>([])
  const [tableRows, setTableRows] = useState<ConceptSummaryRow[]>([])
  const [tableRowCount, setTableRowCount] = useState(0)
  const [hierarchyRows, setHierarchyRows] = useState<ConceptSummaryRow[]>([])
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null)
  const [selectedDetailRow, setSelectedDetailRow] = useState<ConceptSummaryRow | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [chartLoading, setChartLoading] = useState(false)
  const [chartScope, setChartScope] = useState<ChartScope>("filtered")
  const [tableLoading, setTableLoading] = useState(false)
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [tableMode, setTableMode] = useState<TableMode>("flat")
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([])
  const [sorting, setSorting] = useState<MRT_SortingState>([{ id: "binaryEffect", desc: true }])
  const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 20 })

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
          buildFullSummaryQuery(
            countMode,
            selectedDomain,
            searchText,
            chartScope === "filtered" ? columnFilters : [],
            chartScope === "filtered",
          ),
        )
        if (!active) return
        setChartRows((rowsRaw as BlockMetricRow[]).map(mapSummaryRow))
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
          dataSource.runQuery(buildPagedSummaryQuery(countMode, selectedDomain, searchText, columnFilters, sorting, pagination)),
          dataSource.runQuery(buildSummaryCountQuery(countMode, selectedDomain, searchText, columnFilters)),
        ])
        if (!active) return
        setTableRows((rowsRaw as BlockMetricRow[]).map(mapSummaryRow))
        setTableRowCount(Number((countRaw[0] as Record<string, unknown> | undefined)?.rowCount ?? 0))
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

  useEffect(() => {
    if (tableMode !== "hierarchy") return
    let active = true
    async function loadHierarchyRows() {
      setHierarchyLoading(true)
      try {
        const rowsRaw = await dataSource.runQuery(
          buildFullSummaryQuery("all", selectedDomain, searchText, [], true),
        )
        if (!active) return
        setHierarchyRows(buildHierarchyTree((rowsRaw as BlockMetricRow[]).map(mapSummaryRow)))
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
  }, [dataSource, searchText, selectedDomain, tableMode])

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
    enableExpanding: tableMode === "hierarchy",
    manualFiltering: tableMode === "flat",
    manualPagination: tableMode === "flat",
    manualSorting: tableMode === "flat",
    onColumnFiltersChange: setColumnFilters,
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
      pagination,
      sorting,
      columnVisibility: {
        ancestorConceptIds: false,
      },
    },
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
  })

  function focusRow(rowKey: string) {
    setFocusedRowKey(rowKey)
    setPageView("table")
    const fallbackRow = chartRows.find((row) => row.rowKey === rowKey) ?? null
    setSelectedDetailRow(fallbackRow)
    requestAnimationFrame(() => {
      const visibleRows = table.getPrePaginationRowModel().rows
      const matchedRow = visibleRows.find((row: MRT_Row<ConceptSummaryRow>) => row.original.rowKey === rowKey)
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

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 150 }}>
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
          <FormControl sx={{ minWidth: 160 }}>
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
          <FormControl sx={{ minWidth: 180 }}>
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
          />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
          <Chip label="Startup default: Binary cases >= 5" size="small" variant="outlined" />
          <Chip label="Startup default: -log10(Binary p) >= 5" size="small" variant="outlined" />
        </Stack>
        {(tableLoading || chartLoading || hierarchyLoading) && (
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
              Loading {pageView === "charts" ? "chart" : tableMode === "hierarchy" ? "hierarchy" : "table"} results...
            </Typography>
          </Box>
        )}
        {summaryError && <Alert severity="error">{summaryError}</Alert>}
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
      <ConceptDetailDialog row={selectedDetailRow} onClose={() => setSelectedDetailRow(null)} />
    </Stack>
  )
}
