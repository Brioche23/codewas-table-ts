import { FileDownload } from "@mui/icons-material"
import { Box, Divider, Button } from "@mui/material"
import type { MRT_TableInstance, MRT_Row } from "material-react-table"
import InputFileUpload from "../components/FileUpload"
import type { ConceptRow } from "../utils/types"

interface TopToolbarProps {
  table: MRT_TableInstance<ConceptRow>
  setData: React.Dispatch<React.SetStateAction<ConceptRow[] | null>>
}

export function TopToolbar({ table, setData }: TopToolbarProps) {
  const handleExportRows = (rows: MRT_Row<ConceptRow>[]) => {
    const rowData = rows.map((row) => row.original)
    const exportName = `${new Date().toString()}_filtered_data`

    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rowData))
    var downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", exportName + ".json")
    document.body.appendChild(downloadAnchorNode) // required for firefox
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: "16px",
        padding: "8px",
        flexWrap: "wrap",
      }}
    >
      <InputFileUpload setData={setData} />
      <Divider orientation="vertical" flexItem />

      <Button
        disabled={table.getPrePaginationRowModel().rows.length === 0}
        //export all rows, including from the next page, (still respects filtering and sorting)
        onClick={() => handleExportRows(table.getPrePaginationRowModel().rows)}
        startIcon={<FileDownload />}
      >
        Export Filtered Rows
      </Button>
    </Box>
  )
}
