import { COLUMNS } from "../../utils/constants"
import { CHART_BLOCK_FIELD_PREFIX, HEATMAP_BLOCKS } from "./constants"
import type { ChartBlockKey, ChartMetricKey, ConceptSummaryRow } from "./types"

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
  if (!Number.isFinite(value)) return "#8b0000"
  const intensity = Math.min(value / Math.max(maxValue, 1), 1)
  const lightness = 94 - intensity * 46
  return `hsl(5 78% ${lightness}%)`
}

export function buildClusteredHeatmapRows(
  rows: ConceptSummaryRow[],
  perColumnMax: Record<ChartBlockKey, number>,
) {
  if (rows.length <= 2) return rows

  const remaining = [...rows]
  const ordered: ConceptSummaryRow[] = []

  const vectorFor = (row: ConceptSummaryRow) =>
    HEATMAP_BLOCKS.map((block) => {
      const raw = getChartMetricValue(row, block, "-log10") ?? 0
      return raw / Math.max(perColumnMax[block] ?? 1, 1)
    })

  const distance = (left: number[], right: number[]) =>
    Math.sqrt(left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0))

  remaining.sort((left, right) => getBestHeatmapScore(right) - getBestHeatmapScore(left))
  ordered.push(remaining.shift() as ConceptSummaryRow)

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1]
    const lastVector = vectorFor(last)
    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY

    remaining.forEach((candidate, index) => {
      const candidateDistance = distance(lastVector, vectorFor(candidate))
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance
        bestIndex = index
      }
    })

    ordered.push(remaining.splice(bestIndex, 1)[0])
  }

  return ordered
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
