import { Box, Divider, Typography } from "@mui/material"

interface CasesControlsProps {
  cases: number
  controls: number
  casesSD?: number
  controlsSD?: number
  nDecimals?: number
}

export function CasesControlCell({
  cases,
  casesSD,
  controls,
  controlsSD,
  nDecimals = 2,
}: CasesControlsProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {cases.toFixed(nDecimals)} {casesSD && `± ${casesSD.toFixed(nDecimals)}`}
      </Typography>

      <Divider sx={{ my: "4px" }} />

      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {controls.toFixed(nDecimals)} {controlsSD && `± ${controlsSD.toFixed(nDecimals)}`}
      </Typography>
    </Box>
  )
}
