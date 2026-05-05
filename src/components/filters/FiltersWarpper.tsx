import type { MRT_TableInstance } from "material-react-table"
import type { ConceptRow, FilterPreset } from "../../utils/types"
import { useState } from "react"
import { Box, Divider } from "@mui/material"
import { FilterChips } from "./FilterChips"
import { FilterPresets } from "./FilterPresets"
import { FilterStats } from "./FilterStats"

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
  const [selectedPresetId, setSelectedPresetId] = useState<string>("")

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

  const handleApply = (preset: FilterPreset) => {
    setSelectedPresetId(preset.id)
    table.setColumnFilters(preset.filters)
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        alignItems: "center",
        minHeight: 100,
      }}
    >
      <FilterStats table={table} />
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
        }}
      >
        <FilterChips table={table} onSave={handleSave} />
        <Divider orientation="vertical" flexItem />
        <FilterPresets
          presets={presets}
          selectedPresetId={selectedPresetId}
          onApply={handleApply}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </Box>
    </Box>
  )
}
