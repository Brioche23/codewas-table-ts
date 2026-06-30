import { Slider } from "@mui/material"
import { styled } from "@mui/material/styles"

// N thumbs -> N+1 buckets, so colors.length must be values.length + 1.
function buildGradient(values: number[], colors: string[], min: number, max: number) {
  const range = max - min || 1
  const sorted = [...values].sort((a, b) => a - b)
  const pcts = sorted.map((v) => ((v - min) / range) * 100)

  const stops: string[] = []
  let prev = 0
  pcts.forEach((p, i) => {
    stops.push(`${colors[i]} ${prev}%`, `${colors[i]} ${p}%`) // hard stop = crisp edge
    prev = p
  })
  stops.push(`${colors[sorted.length]} ${prev}%`, `${colors[sorted.length]} 100%`)

  return `linear-gradient(to right, ${stops.join(", ")})`
}

const ColorScaleSlider = styled(Slider, {
  shouldForwardProp: (prop) => prop !== "gradient",
})<{ gradient: string }>(({ gradient }) => ({
  height: 8,
  padding: "13px 0",
  "& .MuiSlider-rail": {
    opacity: 1, // MUI dims the rail by default
    background: gradient,
    borderRadius: 100,
  },
  "& .MuiSlider-thumb": {
    height: 10,
    width: 10,
    borderRadius: 100,
    backgroundColor: "#fff",
    border: "0px solid currentColor",
  },
}))

// Controlled multi-thumb slider whose rail renders hard-stop color buckets. The thumbs are the bucket
// breakpoints (value units); `colors` must have one more entry than `value` (N thumbs -> N+1 buckets).
export default function MultiTrackColorSlider({
  value,
  onChange,
  colors,
  min = 0,
  max,
  marks,
}: {
  value: number[]
  onChange: (value: number[]) => void
  colors: string[]
  min?: number
  max: number
  marks?: { value: number; label: string }[]
}) {
  const gradient = buildGradient(value, colors, min, max)

  return (
    <ColorScaleSlider
      gradient={gradient}
      value={value}
      onChange={(_event, next) => onChange(next as number[])}
      min={min}
      max={max}
      track={false} // hide MUI's single track; the rail gradient does the work
      disableSwap // thumbs can't cross — keeps the buckets ordered
      valueLabelDisplay="auto"
      valueLabelFormat={(v: number) => v.toFixed(1)}
      marks={marks}
    />
  )
}
