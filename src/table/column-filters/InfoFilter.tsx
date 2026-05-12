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
} from "@mui/material"
import type { MRT_TableInstance } from "material-react-table"
import type { ConceptRow } from "../../utils/types"

const DOMAIN_OPTIONS = ["Condition", "Source:ICD10", "Source:ICPC", "Source:ENDPOINT"]

type InfoFilterProps = {
  table: MRT_TableInstance<ConceptRow>
}

export function InfoFilter({ table }: InfoFilterProps) {
  const nameColumn = table.getColumn("conceptName")
  const conceptIdColumn = table.getColumn("conceptId")
  const domainColumn = table.getColumn("domainId")

  const nameValue = (nameColumn?.getFilterValue() as string) ?? ""
  const conceptIdValue = (conceptIdColumn?.getFilterValue() as string) ?? ""
  const domainValue = (domainColumn?.getFilterValue() as string[]) ?? []

  const handleDomainChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value
    domainColumn?.setFilterValue(typeof value === "string" ? value.split(",") : value)
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, p: 1, minWidth: 150 }}>
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
      <FormControl size="small">
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
          {DOMAIN_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
