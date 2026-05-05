import type { MRT_TableInstance } from "material-react-table"
import type { ConceptRow, FilterPreset } from "../../utils/types"
import { useState } from "react"
import {
  Box,
  Chip,
  Typography,
  Modal,
  Button,
  TextField,
  FormGroup,
  Checkbox,
  FormControlLabel,
  Divider,
} from "@mui/material"
import { Clear, Save } from "@mui/icons-material"

type FilterChipsProps = {
  table: MRT_TableInstance<ConceptRow>
  onSave: (preset: FilterPreset) => void // lifted up to FilterWrapper
}

export function FilterChips({ table, onSave }: FilterChipsProps) {
  const [open, setOpen] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  const isFilterActive = (value: unknown): boolean => {
    if (value === undefined || value === null || value === "") return false
    if (Array.isArray(value)) return value.some((v) => v !== undefined && v !== "")
    return true
  }

  const columnFilters = table.getState().columnFilters.filter((f) => isFilterActive(f.value))

  // When the modal opens, pre-check all active filters by default
  const handleOpen = () => {
    setCheckedIds(new Set(columnFilters.map((f) => f.id)))
    setPresetName("")
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = () => {
    if (!presetName.trim() || checkedIds.size === 0) return

    onSave({
      id: String(Date.now()),
      name: presetName.trim(),
      filters: columnFilters.filter((f) => checkedIds.has(f.id)),
    })

    handleClose()
  }

  const modalStyle = {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  }

  if (columnFilters.length === 0) return null

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
      {columnFilters.map((filter) => {
        const column = table.getColumn(filter.id)
        const label = column?.columnDef.header ?? filter.id
        const value = Array.isArray(filter.value)
          ? `${filter.value[0]} – ${filter.value[1]}`
          : String(filter.value)

        return (
          <Chip
            key={filter.id}
            label={`${label}: ${value}`}
            onDelete={() => column?.setFilterValue(undefined)}
          />
        )
      })}

      <Chip
        label="Clear all"
        icon={<Clear />}
        variant="outlined"
        onClick={() => table.resetColumnFilters()}
      />
      <Chip label="Save Preset" icon={<Save />} variant="outlined" onClick={handleOpen} />

      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Save filter preset</Typography>

          <TextField
            label="Preset name"
            variant="outlined"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            size="small"
            autoFocus
          />

          <Divider />

          <Typography variant="body2" color="text.secondary">
            Choose which filters to include:
          </Typography>

          <FormGroup>
            {columnFilters.map((filter) => {
              const column = table.getColumn(filter.id)
              const label = column?.columnDef.header ?? filter.id
              const value = Array.isArray(filter.value)
                ? `${filter.value[0]} – ${filter.value[1]}`
                : String(filter.value)

              return (
                <FormControlLabel
                  key={filter.id}
                  control={
                    <Checkbox
                      checked={checkedIds.has(filter.id)}
                      onChange={() => toggleCheck(filter.id)}
                    />
                  }
                  label={`${label}: ${value}`}
                />
              )
            })}
          </FormGroup>

          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!presetName.trim() || checkedIds.size === 0}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  )
}
