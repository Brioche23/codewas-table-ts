import { Chip } from "@mui/material"
import type { MRT_ColumnDef } from "material-react-table"
import type { ConceptRow } from "../utils/types"

export const valueChip = (value: number | null, threshold: number) => {
  if (value === null) return <Chip label="n/a" size="small" />

  const color = value >= threshold ? "success" : "error"

  return <Chip label={fmt(value)} size="small" color={color} />
}

export function groupCellProps(color: string): Partial<MRT_ColumnDef<ConceptRow>> {
  return {
    muiTableBodyCellProps: { sx: { backgroundColor: color } },
    muiTableHeadCellProps: { sx: { backgroundColor: color } },
  }
}

const fmt = (v: number | null, decimals = 4): string => (v === null ? "—" : v.toFixed(decimals))
