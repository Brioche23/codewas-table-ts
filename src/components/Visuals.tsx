// visuals.tsx — lightweight inline charts, no extra charting library needed
import { Box, Typography, Tooltip } from "@mui/material"
import type { SummaryStats } from "../utils/types"

// ─── MeanComparisonChart ──────────────────────────────────────────────────
//
// Renders a small dot-and-line chart comparing cases vs controls means.
// Uses an SVG so it's crisp at any size with zero dependencies.
//
// Layout (all values mapped into a 0–100 px range):
//   [min anchor]----[cases dot]----[controls dot]----[max anchor]
//
// The ±SD is shown as a shaded band around each dot.

interface MeanComparisonChartProps {
  stats: SummaryStats
  unit?: string // e.g. "y" for years, "d" for days, "" for counts
}

export function MeanComparisonChart({ stats, unit = "" }: MeanComparisonChartProps) {
  const { meanValueCases, meanValueControls, sdValueCases, sdValueControls } = stats

  // Build a domain that comfortably fits both means ± their SDs
  const allValues = [
    meanValueCases - sdValueCases,
    meanValueCases + sdValueCases,
    meanValueControls - sdValueControls,
    meanValueControls + sdValueControls,
  ]
  const domainMin = Math.min(...allValues)
  const domainMax = Math.max(...allValues)
  const domainRange = domainMax - domainMin || 1 // avoid /0

  const W = 180 // SVG width
  const H = 36 // SVG height
  const PAD = 12 // left/right padding in px

  // Map a value → SVG x coordinate
  const toX = (v: number) => PAD + ((v - domainMin) / domainRange) * (W - PAD * 2)

  const cx = toX(meanValueCases)
  const cx2 = toX(meanValueControls)

  // SD band half-widths in px
  const sdW = (sdValueCases / domainRange) * (W - PAD * 2)
  const sdW2 = (sdValueControls / domainRange) * (W - PAD * 2)

  const cy = H / 2

  const fmt1 = (v: number) => (Number.isInteger(v) ? v : v.toFixed(1))

  return (
    <Box display="flex" alignItems="center" gap={1} my={0.5}>
      {/* Legend labels */}
      <Box display="flex" flexDirection="column" gap={0.2} sx={{ minWidth: 56 }}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box
            sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#e05c5c", flexShrink: 0 }}
          />
          <Typography variant="caption" noWrap>
            {fmt1(meanValueCases)}
            {unit}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box
            sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#4a90d9", flexShrink: 0 }}
          />
          <Typography variant="caption" noWrap>
            {fmt1(meanValueControls)}
            {unit}
          </Typography>
        </Box>
      </Box>

      {/* SVG chart */}
      <Tooltip
        title={
          <Box>
            <div>
              Cases: {fmt1(meanValueCases)}
              {unit} ± {fmt1(sdValueCases)}
            </div>
            <div>
              Controls: {fmt1(meanValueControls)}
              {unit} ± {fmt1(sdValueControls)}
            </div>
          </Box>
        }
        arrow
      >
        <svg width={W} height={H} style={{ overflow: "visible", cursor: "default" }}>
          {/* Baseline */}
          <line x1={PAD} y1={cy} x2={W - PAD} y2={cy} stroke="#ccc" strokeWidth={1} />

          {/* SD band — cases */}
          <rect
            x={cx - sdW}
            y={cy - 5}
            width={sdW * 2}
            height={10}
            fill="#e05c5c"
            fillOpacity={0.15}
            rx={2}
          />
          {/* SD band — controls */}
          <rect
            x={cx2 - sdW2}
            y={cy - 5}
            width={sdW2 * 2}
            height={10}
            fill="#4a90d9"
            fillOpacity={0.15}
            rx={2}
          />

          {/* Dot — cases */}
          <circle cx={cx} cy={cy} r={5} fill="#e05c5c" />
          {/* Dot — controls */}
          <circle cx={cx2} cy={cy} r={5} fill="#4a90d9" />
        </svg>
      </Tooltip>
    </Box>
  )
}

// ─── CategoryBar ─────────────────────────────────────────────────────────
//
// A pair of thin horizontal bars (cases / controls) showing the proportion
// of a category relative to the total for that group.
// Used inside BinaryDistributionTable and future categorical tables.
//
// total = cases total across all rows for normalisation — pass it in so
// the bar widths are comparable across rows.

interface CategoryBarProps {
  caseCount: number
  controlCount: number
  totalCases: number
  totalControls: number
  maxWidth?: number // px, default 80
}

export function CategoryBar({
  caseCount,
  controlCount,
  totalCases,
  totalControls,
  maxWidth = 80,
}: CategoryBarProps) {
  // Proportions 0–1; guard against divide-by-zero
  const casePct = totalCases > 0 ? caseCount / totalCases : 0
  const ctrlPct = totalControls > 0 ? controlCount / totalControls : 0

  const Bar = ({ pct, color, label }: { pct: number; color: string; label: string }) => (
    <Tooltip title={label} arrow placement="top">
      <Box
        sx={{
          width: maxWidth,
          height: 6,
          bgcolor: "action.hover",
          borderRadius: 1,
          overflow: "hidden",
          cursor: "default",
        }}
      >
        <Box
          sx={{
            width: `${pct * 100}%`,
            height: "100%",
            bgcolor: color,
            borderRadius: 1,
            transition: "width 0.3s ease",
          }}
        />
      </Box>
    </Tooltip>
  )

  return (
    <Box display="flex" flexDirection="column" gap={0.4}>
      <Bar
        pct={casePct}
        color="#e05c5c"
        label={`Cases: ${caseCount} / ${totalCases} (${(casePct * 100).toFixed(1)}%)`}
      />
      <Bar
        pct={ctrlPct}
        color="#4a90d9"
        label={`Controls: ${controlCount} / ${totalControls} (${(ctrlPct * 100).toFixed(1)}%)`}
      />
    </Box>
  )
}
