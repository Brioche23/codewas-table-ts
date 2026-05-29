// aggregations.ts
import type { MRT_AggregationFn } from "material-react-table" // or 'material-react-table'
import type { BinaryCount, ConceptRow } from "./types"

export const sumBinaryCount: MRT_AggregationFn<ConceptRow> = (
  columnId,
  leafRows, // all non-grouped rows in this group
  _childRows, // direct children (could be sub-groups)
) => {
  return leafRows.reduce<BinaryCount>(
    (acc, row) => {
      // row.getValue(columnId) calls your accessorFn under the hood
      const val = row.getValue<BinaryCount>(columnId)
      return {
        nCasesWithCategory: acc.nCasesWithCategory + (val?.nCasesWithCategory ?? 0),
        nControlsWithCategory: acc.nControlsWithCategory + (val?.nControlsWithCategory ?? 0),
      }
    },
    { nCasesWithCategory: 0, nControlsWithCategory: 0 },
  )
}
