import { ContentCopy } from "@mui/icons-material"
import { IconButton } from "@mui/material"
import { useClipboard } from "../context/ClipboardContext"
export function CopyButton({ value }: { value: string | number }) {
  const { copy } = useClipboard()
  return (
    <IconButton size="small" onClick={() => copy(String(value))} sx={{ my: 0 }}>
      <ContentCopy fontSize="inherit" />
    </IconButton>
  )
}
