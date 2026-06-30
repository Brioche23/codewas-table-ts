import type { BinaryDistribution, DistributionRow, SummaryStats } from "../../../utils/types"
import type { ConceptSummaryRow } from "../types"

export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return ""
  if (!Number.isFinite(value)) return String(value)
  return value.toFixed(digits)
}

export function getSafeDownloadName(sourceLabel: string) {
  const baseName = sourceLabel.split("/").at(-1)?.split("\\").at(-1) ?? "codewas_results"
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export function triggerDownload(fileName: string, payload: BlobPart, mimeType: string) {
  const blob = new Blob([payload], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function tsvEscape(value: unknown) {
  if (value == null) return ""
  const text = String(value)
  if (!/[\t\r\n"]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

export function summaryRowsToTsv(rows: ConceptSummaryRow[]) {
  const exportRows = rows.map((row) => ({
    conceptName: row.conceptName ?? "",
    conceptCode: row.conceptCode ?? "",
    conceptId: row.conceptId,
    ancestorConceptIds: row.ancestorConceptIds ?? "",
    domainId: row.domainId,
    countMode: row.countMode,
    binaryCases: row.binaryCaseYes ?? "",
    binaryControls: row.binaryControlYes ?? "",
    binaryLogP: row.binaryPValue && row.binaryPValue > 0 ? -Math.log10(row.binaryPValue) : "",
    binaryEffect: row.binaryEffectSize ?? "",
    countsCaseMean: row.countsCaseMean ?? "",
    countsControlMean: row.countsControlMean ?? "",
    countsLogP: row.countsPValue && row.countsPValue > 0 ? -Math.log10(row.countsPValue) : "",
    countsEffect: row.countsEffectSize ?? "",
    ageCaseMean: row.ageCaseMean ?? "",
    ageControlMean: row.ageControlMean ?? "",
    ageLogP: row.agePValue && row.agePValue > 0 ? -Math.log10(row.agePValue) : "",
    ageEffect: row.ageEffectSize ?? "",
    daysCaseMean: row.daysCaseMean ?? "",
    daysControlMean: row.daysControlMean ?? "",
    daysLogP: row.daysPValue && row.daysPValue > 0 ? -Math.log10(row.daysPValue) : "",
    daysEffect: row.daysEffectSize ?? "",
    continuousCaseMean: row.continuousCaseMean ?? "",
    continuousControlMean: row.continuousControlMean ?? "",
    continuousUnit: row.continuousUnit ?? "",
    continuousLogP:
      row.continuousPValue && row.continuousPValue > 0 ? -Math.log10(row.continuousPValue) : "",
    continuousEffect: row.continuousEffectSize ?? "",
    categoricalCases: row.categoricalCaseYes ?? "",
    categoricalControls: row.categoricalControlYes ?? "",
    categoricalLogP:
      row.categoricalPValue && row.categoricalPValue > 0 ? -Math.log10(row.categoricalPValue) : "",
    categoricalEffect: row.categoricalEffectSize ?? "",
  }))

  const headers = Object.keys(
    exportRows[0] ?? {
      conceptName: "",
      conceptCode: "",
      conceptId: "",
      ancestorConceptIds: "",
      domainId: "",
      countMode: "",
    },
  )
  const lines = [headers.join("\t")]
  exportRows.forEach((row) => {
    lines.push(headers.map((header) => tsvEscape(row[header as keyof typeof row])).join("\t"))
  })
  return lines.join("\n")
}

export function parseCategoricalDistribution(
  value: string | null | undefined,
): BinaryDistribution[] {
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

export function buildStats(
  caseMean?: number | null,
  controlMean?: number | null,
  caseSd?: number | null,
  controlSd?: number | null,
) {
  if (
    [caseMean, controlMean, caseSd, controlSd].some(
      (value) => value === null || value === undefined,
    )
  ) {
    return null
  }
  return {
    meanValueCases: caseMean as number,
    meanValueControls: controlMean as number,
    sdValueCases: caseSd as number,
    sdValueControls: controlSd as number,
  } satisfies SummaryStats
}

export function buildDistributionRows(
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
