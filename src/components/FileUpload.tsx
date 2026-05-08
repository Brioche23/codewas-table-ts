import { styled } from "@mui/material/styles"
import Button from "@mui/material/Button"
import CloudUploadIcon from "@mui/icons-material/CloudUpload"
import type React from "react"
import type { ConceptRow } from "../utils/types"

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
})

export default function InputFileUpload({ setData }: { setData: (data: ConceptRow[]) => void }) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/json") return
    const reader = new FileReader()
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const parsed = JSON.parse(event.target?.result as string)
      setData(parsed)
    }
    reader.readAsText(file)
  }
  return (
    <Button
      component="label"
      role={undefined}
      variant="contained"
      tabIndex={-1}
      startIcon={<CloudUploadIcon />}
    >
      Upload file
      <VisuallyHiddenInput type="file" onChange={handleFileChange} accept=".json" />
    </Button>
  )
}
