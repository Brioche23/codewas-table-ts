import { interpolateLab } from "d3"
import { COLUMNS } from "../../../utils/constants"
import {
  CHART_BLOCK_FIELD_PREFIX,
  HEATMAP_BLOCKS,
  OVERVIEW_BUCKET_COUNT,
  OVERVIEW_RAMP_FROM,
  OVERVIEW_RAMP_TO,
} from "../constants"
import type { ChartBlockKey, ChartMetricKey, ConceptSummaryRow } from "../types"

// Perceptual white→main-color ramp (d3 Lab interpolation). `t` is clamped to [0, 1]. This is the single
// palette behind both heatmap scales: the continuous per-analysis scale and the global bucket scale.
const rampInterpolator = interpolateLab(OVERVIEW_RAMP_FROM, OVERVIEW_RAMP_TO)
export function rampColor(t: number) {
  return rampInterpolator(Math.max(0, Math.min(1, t)))
}

// Bucket swatches sampled at each bucket's midpoint along the ramp, so the discrete global scale reads
// as the same palette as the continuous one. The user drags the breakpoints; these colors stay put.
export const OVERVIEW_BUCKET_COLORS = Array.from({ length: OVERVIEW_BUCKET_COUNT }, (_, index) =>
  rampColor((index + 0.5) / OVERVIEW_BUCKET_COUNT),
)

export function getChartMetricValue(
  row: ConceptSummaryRow,
  block: ChartBlockKey,
  metric: ChartMetricKey,
) {
  const prefix = CHART_BLOCK_FIELD_PREFIX[block]
  if (metric === "effectSize") {
    return row[`${prefix}EffectSize` as keyof ConceptSummaryRow] as number | null
  }
  const pValue = row[`${prefix}PValue` as keyof ConceptSummaryRow] as number | null
  return pValue && pValue > 0 ? -Math.log10(pValue) : null
}

export function getBestHeatmapScore(row: ConceptSummaryRow) {
  return Math.max(
    ...HEATMAP_BLOCKS.map((block) => {
      const value = getChartMetricValue(row, block, "-log10")
      return value ?? 0
    }),
  )
}

export function getRepeatEvidenceCount(row: ConceptSummaryRow, threshold: number) {
  return HEATMAP_BLOCKS.reduce((count, block) => {
    const value = getChartMetricValue(row, block, "-log10")
    return count + ((value ?? 0) >= threshold ? 1 : 0)
  }, 0)
}

export function getHeatmapColor(value: number | null, maxValue: number) {
  if (value == null) return "#dadada"
  if (!Number.isFinite(value)) return rampColor(1)
  return rampColor(value / Math.max(maxValue, 1))
}

// Step ("bucketed") color scale used by the overview's global scale. `colors.length` buckets are
// defined by the ascending `breakpoints` (length colors.length - 1): a value lands in bucket `i`
// when it is >= breakpoints[i-1] and < breakpoints[i]. e.g. [0,b1)->colors[0] ... [b3,∞)->colors[3].
export function getBucketColor(value: number | null, breakpoints: number[], colors: string[]) {
  if (value == null) return "#dadada"
  if (!Number.isFinite(value)) return colors[colors.length - 1]
  let bucket = 0
  while (bucket < breakpoints.length && value >= breakpoints[bucket]) bucket++
  return colors[bucket] ?? colors[colors.length - 1]
}

// Per-row metrics derived once from the heatmap rows so sorting, clustering, and drawing don't
// recompute them. `logp` is the per-block -log10(p) (indexed by HEATMAP_BLOCKS, null when absent),
// `bestScore` the strongest block, `vector` the per-column-normalized profile used for clustering.
export type HeatmapDerived = {
  logp: (number | null)[]
  bestScore: number
  vector: number[]
}

// Single pass over all rows computing per-row derived metrics plus the per-column and global
// maxima — using plain loops (never `Math.max(...arr)`, which overflows the call stack at tens of
// thousands of args). Maxima seed at 1 so an empty/all-null input never yields -Infinity or 0.
export function computeHeatmapDerived(rows: ConceptSummaryRow[]): {
  perColumnMax: Record<ChartBlockKey, number>
  globalMax: number
  derivedByKey: Map<string, HeatmapDerived>
} {
  const blockCount = HEATMAP_BLOCKS.length
  const perColumnMaxArr = new Array<number>(blockCount).fill(1)
  let globalMax = 1
  const derivedByKey = new Map<string, HeatmapDerived>()

  for (const row of rows) {
    const logp = new Array<number | null>(blockCount)
    let bestScore = 0
    for (let b = 0; b < blockCount; b++) {
      const value = getChartMetricValue(row, HEATMAP_BLOCKS[b], "-log10")
      logp[b] = value
      if (value != null) {
        if (value > perColumnMaxArr[b]) perColumnMaxArr[b] = value
        if (value > globalMax) globalMax = value
        if (value > bestScore) bestScore = value
      }
    }
    derivedByKey.set(row.rowKey, { logp, bestScore, vector: new Array<number>(blockCount).fill(0) })
  }

  // Second pass: normalize each block by its column max (now finalized) into the cluster vector.
  for (const derived of derivedByKey.values()) {
    for (let b = 0; b < blockCount; b++) {
      derived.vector[b] = (derived.logp[b] ?? 0) / perColumnMaxArr[b]
    }
  }

  const perColumnMax = Object.fromEntries(
    HEATMAP_BLOCKS.map((block, b) => [block, perColumnMaxArr[b]]),
  ) as Record<ChartBlockKey, number>

  return { perColumnMax, globalMax, derivedByKey }
}

export function getRepeatEvidenceCountFromLogp(logp: (number | null)[], threshold: number) {
  let count = 0
  for (const value of logp) {
    if ((value ?? 0) >= threshold) count++
  }
  return count
}

function vectorDistance(left: number[], right: number[]) {
  let sum = 0
  for (let i = 0; i < left.length; i++) {
    const diff = left[i] - right[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

// Greedy nearest-neighbor ordering, but bounded: only the top `maxClusterRows` by evidence are
// clustered (the O(n²) part); the remainder is appended in descending strength. Reuses precomputed
// vectors so each distance is a cheap array read, not a metric recompute.
export function clusterHeatmapRows(
  rows: ConceptSummaryRow[],
  derivedByKey: Map<string, HeatmapDerived>,
  maxClusterRows: number,
): ConceptSummaryRow[] {
  if (rows.length <= 2) return rows

  const bestScore = (row: ConceptSummaryRow) => derivedByKey.get(row.rowKey)?.bestScore ?? 0
  const vector = (row: ConceptSummaryRow) => derivedByKey.get(row.rowKey)?.vector ?? []

  const sorted = [...rows].sort((left, right) => bestScore(right) - bestScore(left))
  const clusterCount = Math.min(sorted.length, Math.max(2, maxClusterRows))
  const remaining = sorted.slice(0, clusterCount)
  const tail = sorted.slice(clusterCount) // already in descending bestScore order

  const ordered: ConceptSummaryRow[] = [remaining.shift() as ConceptSummaryRow]
  while (remaining.length > 0) {
    const lastVector = vector(ordered[ordered.length - 1])
    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY
    for (let i = 0; i < remaining.length; i++) {
      const candidateDistance = vectorDistance(lastVector, vector(remaining[i]))
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance
        bestIndex = i
      }
    }
    ordered.push(remaining.splice(bestIndex, 1)[0])
  }

  return ordered.concat(tail)
}

export function getHeatmapHeaderLines(block: ChartBlockKey) {
  const label = COLUMNS.find((column) => column.key === block)?.label ?? block
  switch (label) {
    case "Age at First Event":
      return ["Age at", "First Event"]
    case "Days to First Event":
      return ["Days to", "First Event"]
    default:
      return [label]
  }
}

export function matchesHeatmapSearch(row: ConceptSummaryRow, searchText: string) {
  const needle = searchText.trim().toLowerCase()
  if (!needle) return true
  return [
    row.conceptName ?? "",
    row.conceptCode ?? "",
    String(row.conceptId),
    row.domainId,
    row.countMode,
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle)
}
