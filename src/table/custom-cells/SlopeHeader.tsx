import type { MRT_TableInstance } from "material-react-table"
import { SlopeChart } from "../../components/charts/SlopeChart"
import type { ConceptRow } from "../../utils/types"

interface SlopeHeaderProps {
  table: MRT_TableInstance<ConceptRow>
  label: string
  idKey: string
  dataKey: string
  getStart: (data: any) => number
  getEnd: (data: any) => number
}

export function SlopeHeader({ table, label, idKey, dataKey, getStart, getEnd }: SlopeHeaderProps) {
  const allValues = table.getFilteredRowModel().rows.map((row) => ({
    id: row.getValue<number>(idKey),
    data: row.getValue<any>(dataKey),
  }))

  const allVisibleValues = table.getRowModel().rows.map((row) => row.getValue<number>(idKey))

  const slopeChartData = allValues.map((d) => ({
    id: d.id,
    start: getStart(d.data),
    end: getEnd(d.data),
  }))

  return (
    <div>
      <p>{label}</p>
      {/* {slopeChartData.length > 0 && (
        <SlopeChart data={slopeChartData} visibleDataIds={allVisibleValues} />
      )} */}
    </div>
  )
}
