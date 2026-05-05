import type { MRT_ColumnFiltersState, MRT_TableInstance } from "material-react-table"
import type { ConceptRow, FilterPreset } from "../../utils/types"
import { useState } from "react"
import { Box } from "@mui/material"
import { FilterChips } from "./FilterChips"
import { FilterPresets } from "./FilterPresets"

const STORAGE_KEY = "mrt-filter-presets"

function loadPresets(): FilterPreset[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function savePresets(presets: FilterPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

// FilterWrapper.tsx
export function FilterWrapper({ table }: { table: MRT_TableInstance<ConceptRow> }) {
  const [presets, setPresets] = useState<FilterPreset[]>(loadPresets)

  const handleSave = (preset: FilterPreset) => {
    const updated = [...presets, preset]
    setPresets(updated)
    savePresets(updated)
  }

  const handleDelete = (id: string) => {
    const updated = presets.filter((p) => p.id !== id)
    setPresets(updated)
    savePresets(updated)
  }

  const handleEdit = (updated: FilterPreset) => {
    const next = presets.map((p) => (p.id === updated.id ? updated : p))
    setPresets(next)
    savePresets(next)
  }

  const handleApply = (filters: MRT_ColumnFiltersState) => {
    table.setColumnFilters(filters)
  }

  return (
    <Box>
      <FilterChips table={table} onSave={handleSave} />
      <FilterPresets
        presets={presets}
        onApply={handleApply}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </Box>
  )
}
