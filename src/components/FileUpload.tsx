import { styled } from "@mui/material/styles"
import Button from "@mui/material/Button"
import type React from "react"
import type { ConceptRow, LoadedDataSource } from "../utils/types"
import { FileUpload } from "@mui/icons-material"
import { loadDuckDbDataSource } from "../utils/duckdb"

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

function normalizeJsonPayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown[] }).results)) {
    return (payload as { results: unknown[] }).results
  }

  throw new Error("Unsupported JSON payload shape")
}

export default function InputFileUpload({
  setData,
  setDataSource,
}: {
  setData?: React.Dispatch<React.SetStateAction<ConceptRow[] | null>>
  setDataSource?: React.Dispatch<React.SetStateAction<LoadedDataSource | null>>
}) {
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.name.endsWith(".duckdb")) {
      if (!setDataSource) {
        throw new Error("DuckDB upload is only supported from the top-level loader")
      }

      const source = await loadDuckDbDataSource(file.name, new Uint8Array(await file.arrayBuffer()))
      setDataSource(source)
      return
    }

    if (!file.name.endsWith(".json")) return

    const parsed = JSON.parse(await file.text())
    const rows = normalizeJsonPayload(parsed) as any

    if (setData) {
      setData(rows)
      return
    }

    if (!setDataSource) {
      throw new Error("No data target configured for uploaded JSON")
    }

    setDataSource({
      kind: "json",
      rows,
    })
  }

  return (
    <Button component="label" role={undefined} tabIndex={-1} startIcon={<FileUpload />}>
      Upload
      <VisuallyHiddenInput type="file" onChange={handleFileChange} accept=".json,.duckdb" />
    </Button>
  )
}
