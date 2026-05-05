import { useState, useEffect, useRef } from "react"
import { Typography, Box } from "@mui/material"
import type { MRT_TableInstance } from "material-react-table"
import type { ConceptRow } from "../../utils/types"

export function FilterStats({ table }: { table: MRT_TableInstance<ConceptRow> }) {
  const [filterTime, setFilterTime] = useState<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const columnFilters = table.getState().columnFilters
  const totalRows = table.getPreFilteredRowModel().rows.length
  const filteredRows = table.getFilteredRowModel().rows.length

  // Mark start time when filters change
  useEffect(() => {
    startTimeRef.current = performance.now()
  }, [columnFilters])

  // Measure end time after filtered row model updates
  useEffect(() => {
    if (startTimeRef.current === null) return
    const elapsed = performance.now() - startTimeRef.current
    setFilterTime(elapsed)
    startTimeRef.current = null
  }, [filteredRows]) // filteredRows changes after MRT finishes computing

  //   if (columnFilters.length === 0) return null

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary">
        {filteredRows} / {totalRows} rows
      </Typography>
      {filterTime !== null && filterTime > 0 && (
        <Typography variant="body2" color="text.secondary">
          in {filterTime.toFixed(4)}ms
        </Typography>
      )}
    </Box>
  )
}
