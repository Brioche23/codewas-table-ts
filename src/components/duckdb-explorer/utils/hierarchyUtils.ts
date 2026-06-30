import type { MRT_ExpandedState } from "material-react-table"
import type { ConceptSummaryRow, HierarchyIndex, HierarchyMetaRow } from "../types"

export function parseAncestorIds(value: string | null | undefined) {
  if (!value) return []
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item))
}

export function buildHierarchyIndex(rows: HierarchyMetaRow[]): HierarchyIndex {
  const descendantRows = rows.filter((row) => row.countMode === "descendant")
  const codeRows = rows.filter((row) => row.countMode === "code")

  const descendantRowsByConceptId = new Map<number, HierarchyMetaRow[]>()
  const conceptDepthByRowKey = new Map<string, number>()
  descendantRows.forEach((row) => {
    const rowsForConcept = descendantRowsByConceptId.get(row.conceptId) ?? []
    rowsForConcept.push(row)
    descendantRowsByConceptId.set(row.conceptId, rowsForConcept)
    conceptDepthByRowKey.set(row.rowKey, parseAncestorIds(row.ancestorConceptIds).length)
  })

  const directParentRowKeyByRowKey = new Map<string, string | null>()
  descendantRows.forEach((row) => {
    const ancestorIds = parseAncestorIds(row.ancestorConceptIds)
    const candidateParents = ancestorIds.flatMap(
      (ancestorId) => descendantRowsByConceptId.get(ancestorId) ?? [],
    )
    if (candidateParents.length === 0) {
      directParentRowKeyByRowKey.set(row.rowKey, null)
      return
    }
    const sameDomainParents = candidateParents.filter(
      (candidate) => candidate.domainId === row.domainId,
    )
    const rankedParents = (
      sameDomainParents.length > 0 ? sameDomainParents : candidateParents
    ).sort(
      (left, right) =>
        (conceptDepthByRowKey.get(right.rowKey) ?? 0) -
        (conceptDepthByRowKey.get(left.rowKey) ?? 0),
    )
    directParentRowKeyByRowKey.set(row.rowKey, rankedParents[0]?.rowKey ?? null)
  })

  const childRowKeysByParentRowKey = new Map<string, string[]>()
  descendantRows.forEach((row) => {
    const parentRowKey = directParentRowKeyByRowKey.get(row.rowKey)
    if (!parentRowKey) return
    const rowKeys = childRowKeysByParentRowKey.get(parentRowKey) ?? []
    rowKeys.push(row.rowKey)
    childRowKeysByParentRowKey.set(parentRowKey, rowKeys)
  })

  const codeRowsByConceptAndDomain = new Map<string, string[]>()
  codeRows.forEach((row) => {
    const key = `${row.conceptId}|${row.domainId}`
    const rowKeys = codeRowsByConceptAndDomain.get(key) ?? []
    rowKeys.push(row.rowKey)
    codeRowsByConceptAndDomain.set(key, rowKeys)
  })

  descendantRows.forEach((row) => {
    const selfCodeKey = `${row.conceptId}|${row.domainId}`
    const selfCodeRowKeys = (codeRowsByConceptAndDomain.get(selfCodeKey) ?? []).filter(
      (rowKey) => rowKey !== row.rowKey,
    )
    if (selfCodeRowKeys.length === 0) return
    const rowKeys = childRowKeysByParentRowKey.get(row.rowKey) ?? []
    childRowKeysByParentRowKey.set(row.rowKey, [...selfCodeRowKeys, ...rowKeys])
  })

  return {
    rootRowKeys: descendantRows
      .filter((row) => directParentRowKeyByRowKey.get(row.rowKey) == null)
      .map((row) => row.rowKey),
    childRowKeysByParentRowKey,
  }
}

export function orderRowsByRowKeys(rows: ConceptSummaryRow[], rowKeys: string[]) {
  const rowByKey = new Map(rows.map((row) => [row.rowKey, row] as const))
  return rowKeys
    .map((rowKey) => rowByKey.get(rowKey))
    .filter((row): row is ConceptSummaryRow => Boolean(row))
}

export function withEmptySubRows(rows: ConceptSummaryRow[]) {
  return rows.map((row) => ({ ...row, subRows: row.subRows ?? [] }))
}

export function attachChildrenToHierarchy(
  rows: ConceptSummaryRow[],
  parentRowKey: string,
  children: ConceptSummaryRow[],
): ConceptSummaryRow[] {
  return rows.map((row) => {
    if (row.rowKey === parentRowKey) {
      return { ...row, subRows: children }
    }
    if (row.subRows && row.subRows.length > 0) {
      return { ...row, subRows: attachChildrenToHierarchy(row.subRows, parentRowKey, children) }
    }
    return row
  })
}

export function getExpandedRowKeys(expanded: MRT_ExpandedState) {
  if (expanded === true) return []
  return Object.entries(expanded)
    .filter(([, isExpanded]) => Boolean(isExpanded))
    .map(([rowKey]) => rowKey)
}
