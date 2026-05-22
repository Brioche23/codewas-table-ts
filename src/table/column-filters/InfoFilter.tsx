import {
  Box,
  TextField,
  MenuItem,
  Select,
  Chip,
  OutlinedInput,
  FormControl,
  InputLabel,
  type SelectChangeEvent,
  Typography,
} from "@mui/material"
import type { MRT_TableInstance } from "material-react-table"
import type { ConceptRow } from "../../utils/types"
import { useMemo } from "react"

type InfoFilterProps = {
  table: MRT_TableInstance<ConceptRow>
}

export function InfoFilter({ table }: InfoFilterProps) {
  const nameColumn = table.getColumn("conceptName")
  const conceptIdColumn = table.getColumn("conceptId")
  const domainColumn = table.getColumn("domainId")
  const ancestorIdsColumn = table.getColumn("ancestorConceptIds")

  const domainOptions = useMemo(() => {
    const rows = table.getPreFilteredRowModel().rows
    const unique = new Set(rows.map((row) => row.getValue<string>("domainId")))
    return [...unique].filter(Boolean).sort()
  }, [table.getPreFilteredRowModel().rows])

  // Rows filtered by name+conceptId only, ignoring domain filter
  const domainAgnosticRows = useMemo(() => {
    const allRows = table.getPreFilteredRowModel().rows
    const columnFilters = table.getState().columnFilters.filter((f) => f.id !== "domainId") // exclude domain

    console.log(columnFilters)
    // For each active filter, grab its column and run its filterFn
    const activeFilters = columnFilters
      .map((f) => {
        const col = table.getColumn(f.id)
        const filterFn = col?.getFilterFn()
        return { col, filterFn, value: f.value }
      })
      .filter((f) => f.col && f.filterFn)

    if (activeFilters.length === 0) return allRows

    return allRows.filter((row) =>
      activeFilters.every(({ col, filterFn, value }) => filterFn!(row, col!.id, value, () => {})),
    )
  }, [
    table.getPreFilteredRowModel().rows,
    table.getState(), // re-runs whenever any filter changes
  ])

  // Count per domain from that domain-agnostic filtered set
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of domainAgnosticRows) {
      const d = row.getValue<string>("domainId")
      if (d) counts[d] = (counts[d] ?? 0) + 1
    }
    return counts
  }, [domainAgnosticRows])
  const nameValue = (nameColumn?.getFilterValue() as string) ?? ""
  const conceptIdValue = (conceptIdColumn?.getFilterValue() as string) ?? ""
  const domainValue = (domainColumn?.getFilterValue() as string[]) ?? []
  const ancestorIdsValue = (ancestorIdsColumn?.getFilterValue() as string[]) ?? []

  const handleDomainChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value
    domainColumn?.setFilterValue(typeof value === "string" ? value.split(",") : value)
  }

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <TextField
        label="Name"
        size="small"
        value={nameValue}
        onChange={(e) => nameColumn?.setFilterValue(e.target.value)}
      />
      <TextField
        label="Concept ID"
        size="small"
        type="number"
        value={conceptIdValue}
        onChange={(e) => conceptIdColumn?.setFilterValue(e.target.value)}
      />
      <TextField
        label="Ancestors Concept ID"
        size="small"
        // type="number"
        value={ancestorIdsValue}
        onChange={(e) => ancestorIdsColumn?.setFilterValue(e.target.value)}
      />
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>Domain</InputLabel>
        <Select
          multiple
          value={domainValue}
          onChange={handleDomainChange}
          input={<OutlinedInput label="Domain" />}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((val) => (
                <Chip key={val} label={val} size="small" />
              ))}
            </Box>
          )}
        >
          {domainOptions.map((opt) => (
            <MenuItem key={opt} value={opt} sx={{ opacity: domainCounts[opt] ? 1 : 0.4 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 2 }}>
                <span>{opt}</span>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {domainCounts[opt] ?? 0}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
