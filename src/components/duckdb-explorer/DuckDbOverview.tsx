import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react"
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  FormControl,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Modal,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { HEATMAP_BLOCKS, OVERVIEW_MIN_COL_PX, OVERVIEW_MIN_LABEL_PX } from "./constants"
import {
  computeHeatmapDerived,
  getBucketColor,
  getHeatmapColor,
  getHeatmapHeaderLines,
  matchesHeatmapSearch,
  OVERVIEW_BUCKET_COLORS,
} from "./utils/heatmapUtils"
import { buildHierarchyIndex } from "./utils/hierarchyUtils"
import type { ChartBlockKey, ConceptSummaryRow, HeatmapScaleMode } from "./types"
import { formatNumber } from "./utils/utils"
import MultiTrackColorSlider from "./UI/MultiTrackColorSlider"
import { AllInbox, Info, Restore, Search } from "@mui/icons-material"
import React from "react"

// Canvas geometry (CSS pixels). The overview is transposed: analyses are the (few, fixed) rows and
// concepts are the (many) columns. Columns follow the parent→children hierarchy (buildHierarchyIndex):
// the top level is the tree roots; clicking a parent opens its direct children in a panel below — the
// stack of panels keeps the whole drill path on screen so you always know where you are.
const LABEL_WIDTH = 160 // left gutter for analysis row labels
const HEADER_WIDTH = 34 // top strip for horizontal concept labels (hovered, or all when columns are wide)
const ROW_HEIGHT = 30
const CANVAS_HEIGHT = HEADER_WIDTH + HEATMAP_BLOCKS.length * ROW_HEIGHT
const MIN_CANVAS_WIDTH = LABEL_WIDTH + 120
// Affordance tick at the foot of the header strip: blue = parent (click opens children below),
// gray = leaf (click opens the concept dialog). Always visible, even on 3px-wide columns.
const AFFORD_BAND_H = 5
const PARENT_COLOR = "#1976d2"
const LEAF_COLOR = "#c2c2c2"

// Per-row sort glyph in the label gutter: a fixed icon column near the gutter's right edge.
const SORT_ICON_RIGHT_PAD = 4
const SORT_ICON_W = 16
const SORT_ACTIVE_COLOR = "#0d47a1"
const SORT_INACTIVE_COLOR = "#bbbbbb"

const VERTICAL_GUTTER = 0
const HORIZONTAL_GUTTER = 0

// Per-node rollup: MAX -log10(p) per block over the node's whole subtree (itself + all descendants),
// plus the subtree concept count and its strongest block (for sorting and the tooltip).
type SubtreeAgg = {
  maxLogp: (number | null)[]
  bestScore: number
  count: number
}

// One drawn column: a concept node at a hierarchy level, shown via its subtree rollup.
type Column = {
  row: ConceptSummaryRow
  agg: SubtreeAgg
  hasChildren: boolean
}

const EMPTY_AGG: SubtreeAgg = {
  maxLogp: new Array<number | null>(HEATMAP_BLOCKS.length).fill(null),
  bestScore: 0,
  count: 1,
}

// Size a canvas for the current devicePixelRatio (crisp text on retina) and reset its transform.
function prepareCanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(cssWidth * dpr)
  canvas.height = Math.round(cssHeight * dpr)
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  const context = canvas.getContext("2d")
  if (context) context.scale(dpr, dpr)
  return context
}

// Trim text to fit maxWidth, appending an ellipsis when cut.
function truncateToWidth(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 1 && context.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

function conceptLabel(row: ConceptSummaryRow) {
  return row.conceptName ?? row.conceptCode ?? String(row.conceptId)
}

// One hierarchy level as a transposed heatmap. Measures its own width, caps columns to what fits,
// and highlights the currently-expanded child (activeRowKey) so the link to the panel below is clear.
function OverviewLevel({
  title,
  columns,
  activeRowKey,
  scaleMode,
  perColumnMax,
  bucketBreakpoints,
  bucketColors,
  onPick,
}: {
  title: string
  columns: Column[]
  activeRowKey: string | null
  scaleMode: HeatmapScaleMode
  perColumnMax: Record<ChartBlockKey, number>
  bucketBreakpoints: number[]
  bucketColors: string[]
  onPick: (column: Column) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(MIN_CANVAS_WIDTH)
  const [hovered, setHovered] = useState<{ column: number; block: number } | null>(null)
  // null = use the relevance default (so the default stays dynamic until the user picks a row).
  const [sort, setSort] = useState<{ block: ChartBlockKey; dir: "asc" | "desc" } | null>(null)

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const update = () => setCanvasWidth(Math.max(MIN_CANVAS_WIDTH, Math.floor(element.clientWidth)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Relevance default: the analysis with the highest summed -log10(p) across this panel's columns.
  const relevanceBlock = useMemo(() => {
    let bestBlock = HEATMAP_BLOCKS[0]
    let bestSum = -1
    for (let b = 0; b < HEATMAP_BLOCKS.length; b++) {
      let sum = 0
      for (const column of columns) {
        const value = column.agg.maxLogp[b]
        if (value != null) sum += value
      }
      if (sum > bestSum) {
        bestSum = sum
        bestBlock = HEATMAP_BLOCKS[b]
      }
    }
    return bestBlock
  }, [columns])

  const effectiveSort: { block: ChartBlockKey; dir: "asc" | "desc" } = sort ?? {
    block: relevanceBlock,
    dir: "desc",
  }
  const sortBlockIndex = HEATMAP_BLOCKS.indexOf(effectiveSort.block)

  // Rank by the active analysis (desc, nulls last) so the width cap keeps the most significant columns;
  // ascending just reverses the kept set for display. Tiebreak by overall bestScore, then name.
  const ranked = useMemo(() => {
    return [...columns].sort((a, b) => {
      const av = a.agg.maxLogp[sortBlockIndex]
      const bv = b.agg.maxLogp[sortBlockIndex]
      if (av == null && bv == null) {
        return (
          b.agg.bestScore - a.agg.bestScore ||
          conceptLabel(a.row).localeCompare(conceptLabel(b.row))
        )
      }
      if (av == null) return 1
      if (bv == null) return -1
      return bv - av || b.agg.bestScore - a.agg.bestScore
    })
  }, [columns, sortBlockIndex])

  const gridWidth = canvasWidth - LABEL_WIDTH
  const maxColumns = Math.max(1, Math.floor(gridWidth / OVERVIEW_MIN_COL_PX))
  const kept = ranked.length > maxColumns ? ranked.slice(0, maxColumns) : ranked
  const shown = effectiveSort.dir === "asc" ? [...kept].reverse() : kept
  const hiddenCount = columns.length - kept.length
  const columnWidth = shown.length > 0 ? gridWidth / shown.length : gridWidth

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = prepareCanvas(canvas, canvasWidth, CANVAS_HEIGHT)
    if (!context) return

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvasWidth, CANVAS_HEIGHT)
    context.font = "12px Hack, monospace"
    context.textBaseline = "middle"

    if (shown.length === 0) {
      context.fillStyle = "#888"
      context.textAlign = "left"
      context.fillText("No concepts at this level.", 12, HEADER_WIDTH + ROW_HEIGHT)
      return
    }

    const showAllLabels = columnWidth >= OVERVIEW_MIN_LABEL_PX
    const cellWidth = columnWidth > 4 ? columnWidth - VERTICAL_GUTTER : columnWidth
    const activeIndex = activeRowKey ? shown.findIndex((c) => c.row.rowKey === activeRowKey) : -1

    // Cells + analysis row labels.
    for (let b = 0; b < HEATMAP_BLOCKS.length; b++) {
      const block = HEATMAP_BLOCKS[b]
      const y = HEADER_WIDTH + b * ROW_HEIGHT

      for (let i = 0; i < shown.length; i++) {
        const value = shown[i].agg.maxLogp[b]
        context.fillStyle =
          scaleMode === "global"
            ? getBucketColor(value, bucketBreakpoints, bucketColors)
            : getHeatmapColor(value, perColumnMax[block])
        context.fillRect(
          LABEL_WIDTH + i * columnWidth,
          y,
          cellWidth,
          ROW_HEIGHT - HORIZONTAL_GUTTER,
        )
      }

      context.fillStyle = "#f3f3f3"
      context.fillRect(0, y, LABEL_WIDTH - HORIZONTAL_GUTTER, ROW_HEIGHT - VERTICAL_GUTTER)
      context.fillStyle = "#222"
      context.textAlign = "left"
      const lines = getHeatmapHeaderLines(block)
      lines.forEach((line, lineIndex) => {
        const lineY = lines.length === 1 ? y + ROW_HEIGHT / 2 : y + 9 + lineIndex * 13
        context.fillText(line, 10, lineY)
      })

      // Sort affordance: the active row shows its direction arrow; others a faint toggle hint.
      const isSortBlock = b === sortBlockIndex
      context.fillStyle = isSortBlock ? SORT_ACTIVE_COLOR : SORT_INACTIVE_COLOR
      context.textAlign = "center"
      context.fillText(
        isSortBlock ? (effectiveSort.dir === "desc" ? "▼" : "▲") : "⇅",
        LABEL_WIDTH - SORT_ICON_RIGHT_PAD - SORT_ICON_W / 2,
        y + ROW_HEIGHT / 2,
      )
      context.textAlign = "left"
    }

    // Header strip: gutter caption + rotated concept labels (all when wide enough, else only hovered).
    context.fillStyle = "#f3f3f3"
    context.fillRect(0, 0, LABEL_WIDTH - HORIZONTAL_GUTTER, HEADER_WIDTH)
    context.fillStyle = "#444"
    context.textAlign = "left"
    context.fillText("Concept →", 10, HEADER_WIDTH / 2)

    // Affordance tick per column: parents (blue) open children below; leaves (gray) open the dialog.
    const bandTop = HEADER_WIDTH - AFFORD_BAND_H
    for (let i = 0; i < shown.length; i++) {
      context.fillStyle = shown[i].hasChildren ? PARENT_COLOR : LEAF_COLOR
      context.fillRect(LABEL_WIDTH + i * columnWidth, bandTop, cellWidth, AFFORD_BAND_H)
    }

    // Horizontal label centered over the column. Clamped to the canvas so edge columns stay fully
    // legible: a label that would spill past the left edge left-aligns, past the right edge right-aligns,
    // otherwise it stays centered. `maxWidth` caps it (per-column when showing all, full plot when hovered).
    const labelY = bandTop / 2
    const labelMinX = LABEL_WIDTH + 3
    const labelMaxX = canvasWidth - 3
    const drawColumnLabel = (
      index: number,
      color: string,
      maxWidth: number,
      withBackground: boolean,
    ) => {
      const column = shown[index]
      if (!column) return
      const suffix = column.hasChildren ? " ▸" : ""
      const text = truncateToWidth(context, conceptLabel(column.row) + suffix, maxWidth)
      const textWidth = context.measureText(text).width
      const centerX = LABEL_WIDTH + index * columnWidth + columnWidth / 2
      let align: CanvasTextAlign = "center"
      let x = centerX
      if (centerX - textWidth / 2 < labelMinX) {
        align = "left"
        x = labelMinX
      } else if (centerX + textWidth / 2 > labelMaxX) {
        align = "right"
        x = labelMaxX
      }
      if (withBackground) {
        const left = align === "left" ? x : align === "right" ? x - textWidth : x - textWidth / 2
        context.fillStyle = "rgba(255, 255, 255, 0.9)"
        context.fillRect(left - 3, labelY - 8, textWidth + 6, 16)
      }
      context.fillStyle = color
      context.textAlign = align
      context.textBaseline = "middle"
      context.fillText(text, x, labelY)
      context.textAlign = "left"
    }

    // When columns are wide enough, label every one (kept inside its own column so they don't collide).
    if (showAllLabels) {
      for (let i = 0; i < shown.length; i++)
        drawColumnLabel(i, shown[i].hasChildren ? "#0d47a1" : "#333", columnWidth - 6, false)
    }

    // Persistent highlight for the expanded column (its children are the panel below).
    if (activeIndex >= 0) {
      const x = LABEL_WIDTH + activeIndex * columnWidth
      context.fillStyle = "#1b5e20"
      context.fillRect(x, 0, Math.max(cellWidth, 2), 4)
      context.strokeStyle = "#1b5e20"
      context.lineWidth = 2
      context.strokeRect(
        x + 1,
        HEADER_WIDTH + 1,
        Math.max(cellWidth - HORIZONTAL_GUTTER, 2),
        HEATMAP_BLOCKS.length * ROW_HEIGHT - 2,
      )
      drawColumnLabel(activeIndex, "#1b5e20", labelMaxX - labelMinX, true)
    }

    // Hover highlight: outline the hovered column across all rows, and always label it.
    if (hovered && shown[hovered.column]) {
      const x = LABEL_WIDTH + hovered.column * columnWidth
      context.strokeStyle = "#0d47a1"
      context.lineWidth = 1.5
      context.strokeRect(
        x + 0.5,
        HEADER_WIDTH + 0.5,
        Math.max(cellWidth, 2),
        HEATMAP_BLOCKS.length * ROW_HEIGHT - VERTICAL_GUTTER,
      )
      drawColumnLabel(hovered.column, "#0d47a1", labelMaxX - labelMinX, true)
    }
  }, [
    activeRowKey,
    bucketBreakpoints,
    bucketColors,
    canvasWidth,
    columnWidth,
    effectiveSort.dir,
    hovered,
    perColumnMax,
    scaleMode,
    shown,
    sortBlockIndex,
  ])

  useEffect(() => {
    draw()
  }, [draw])

  const resolveCell = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    if (x < LABEL_WIDTH || y < HEADER_WIDTH) return null
    const column = Math.floor((x - LABEL_WIDTH) / columnWidth)
    const block = Math.floor((y - HEADER_WIDTH) / ROW_HEIGHT)
    if (column < 0 || column >= shown.length) return null
    if (block < 0 || block >= HEATMAP_BLOCKS.length) return null
    return { column, block }
  }

  // Hit-test the sort-icon column in the gutter; returns the analysis row index, or null.
  const resolveGutterSort = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const iconCenter = LABEL_WIDTH - SORT_ICON_RIGHT_PAD - SORT_ICON_W / 2
    if (x < iconCenter - SORT_ICON_W / 2 || x > iconCenter + SORT_ICON_W / 2) return null
    if (y < HEADER_WIDTH) return null
    const block = Math.floor((y - HEADER_WIDTH) / ROW_HEIGHT)
    if (block < 0 || block >= HEATMAP_BLOCKS.length) return null
    return block
  }

  const toggleSort = (blockIndex: number) => {
    const block = HEATMAP_BLOCKS[blockIndex]
    setSort((current) => {
      const active = current ?? { block: relevanceBlock, dir: "desc" as const }
      if (active.block === block) return { block, dir: active.dir === "desc" ? "asc" : "desc" }
      return { block, dir: "desc" }
    })
  }

  const hoveredColumn = hovered ? shown[hovered.column] : null
  const hoveredBlock = hovered ? HEATMAP_BLOCKS[hovered.block] : null
  const hoveredValue = hovered && hoveredColumn ? hoveredColumn.agg.maxLogp[hovered.block] : null

  return (
    <Paper sx={{ p: 1.5 }} variant="outlined">
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 0.5 }}
      >
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {shown.length.toLocaleString()} of {columns.length.toLocaleString()}
          {hiddenCount > 0 ? ` · ${hiddenCount.toLocaleString()} weaker hidden` : ""}
          {` · sorted by ${effectiveSort.block} ${effectiveSort.dir === "desc" ? "▼" : "▲"}`}
        </Typography>
      </Stack>
      <Box ref={containerRef} sx={{ width: "100%", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", cursor: "pointer" }}
          onMouseMove={(event) => setHovered(resolveCell(event))}
          onMouseLeave={() => setHovered(null)}
          onClick={(event) => {
            const sortHit = resolveGutterSort(event)
            if (sortHit != null) {
              toggleSort(sortHit)
              return
            }
            const cell = resolveCell(event)
            const column = cell ? shown[cell.column] : null
            if (column) onPick(column)
          }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        {hoveredColumn && hoveredBlock ? (
          <>
            <strong>{conceptLabel(hoveredColumn.row)}</strong>
            {hoveredColumn.row.conceptCode ? ` | ${hoveredColumn.row.conceptCode}` : ""}
            {hoveredColumn.agg.count > 1
              ? ` | ${hoveredColumn.agg.count.toLocaleString()} in subtree — click to open below`
              : " | leaf — click to open in the table"}
            {` | ${hoveredBlock} | max -log10(p) ${hoveredValue == null ? "N/A" : formatNumber(hoveredValue, 2)}`}
          </>
        ) : (
          "Hover a column to inspect the concept and subtree evidence."
        )}
      </Typography>
    </Paper>
  )
}

function ColorRangeSlider({
  value,
  onChange,
  max,
  colors,
  resetBreakpoints,
}: {
  value: number[]
  onChange: (value: number[]) => void
  max: number
  colors: string[]
  resetBreakpoints: () => void
}) {
  return (
    <Box sx={{ px: 1 }}>
      <MultiTrackColorSlider
        value={value}
        onChange={onChange}
        colors={colors}
        max={max}
        marks={[
          { value: 0, label: "0" },
          // A mark under each handle so its threshold value is always visible (not just on hover).
          ...value.map((breakpoint) => ({ value: breakpoint, label: breakpoint.toFixed(1) })),
          { value: max, label: formatNumber(max, 0) },
        ]}
      />
      <Typography variant="caption">-Log(p) color buckets (drag to set thresholds)</Typography>
      <Button size="small" startIcon={<Restore />} onClick={resetBreakpoints} />
    </Box>
  )
}

function InfoModal() {
  const [open, setOpen] = React.useState(false)
  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
  }

  return (
    <Box>
      <Button onClick={handleOpen} startIcon={<Info />}>
        About
      </Button>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography
            variant="body2"
            color="text.secondary"
            component="div"
            sx={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            Each column is a concept; its color shows the strongest -log10(p) evidence across that
            concept and all of its descendants. The tick under each column header shows what a click
            does:
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mx: 0.75 }}
            >
              <Box
                component="span"
                sx={{
                  width: 14,
                  height: 6,
                  bgcolor: PARENT_COLOR,
                  borderRadius: 0.5,
                  display: "inline-block",
                }}
              />
              parent → opens its children in a panel below
            </Box>
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mx: 0.75 }}
            >
              <Box
                component="span"
                sx={{
                  width: 14,
                  height: 6,
                  bgcolor: LEAF_COLOR,
                  borderRadius: 0.5,
                  display: "inline-block",
                }}
              />
              leaf → opens the concept dialog.
            </Box>
            <Box>The currently expanded column is outlined in green.</Box>
            <Box>
              When color scale is set to <b>Global</b> you can use the slider to adjust the
              thresholds
            </Box>
          </Typography>
        </Box>
      </Modal>
    </Box>
  )
}

export function DuckDbOverview({
  rows,
  chartLoading,
  onSelectConcept,
  sharedControls,
}: {
  rows: ConceptSummaryRow[]
  chartLoading: boolean
  onSelectConcept: (rowKey: string) => void
  sharedControls: ReactNode
}) {
  const [scaleMode, setScaleMode] = useState<HeatmapScaleMode>("perColumn")
  const [searchText, setSearchText] = useState("")
  // Drill path of parent rowKeys. Empty = only the roots panel. Each entry adds a child panel below.
  const [path, setPath] = useState<string[]>([])
  // Breakpoints (in -log10 value units) for the global bucketed color scale; 3 thumbs -> 4 buckets.
  const [breakpoints, setBreakpoints] = useState<number[]>([])

  const { perColumnMax, globalMax, derivedByKey } = useMemo(
    () => computeHeatmapDerived(rows),
    [rows],
  )

  // The concept population for the overview: search-filtered. The hierarchy is rebuilt from this set,
  // so a filtered-out parent re-links its children to the nearest surviving ancestor (same as the table).
  const population = useMemo(
    () => rows.filter((row) => matchesHeatmapSearch(row, searchText)),
    [rows, searchText],
  )

  const rowByKey = useMemo(
    () => new Map(population.map((row) => [row.rowKey, row] as const)),
    [population],
  )

  // Same parent→children logic the table uses (rootRowKeys + childRowKeysByParentRowKey).
  const hierarchy = useMemo(() => buildHierarchyIndex(population), [population])

  // Subtree rollups: MAX -log10(p) per block across each node's whole subtree. Post-order over the
  // hierarchy, memoized per node, with a cycle guard. O(nodes); recomputed only when data changes.
  const subtreeAggByKey = useMemo(() => {
    const blockCount = HEATMAP_BLOCKS.length
    const agg = new Map<string, SubtreeAgg>()
    const visiting = new Set<string>()
    const compute = (rowKey: string): SubtreeAgg => {
      const cached = agg.get(rowKey)
      if (cached) return cached
      const derived = derivedByKey.get(rowKey)
      const maxLogp: (number | null)[] = derived
        ? [...derived.logp]
        : new Array<number | null>(blockCount).fill(null)
      let count = 1
      if (!visiting.has(rowKey)) {
        visiting.add(rowKey)
        for (const childKey of hierarchy.childRowKeysByParentRowKey.get(rowKey) ?? []) {
          if (childKey === rowKey) continue
          const childAgg = compute(childKey)
          count += childAgg.count
          for (let b = 0; b < blockCount; b++) {
            const value = childAgg.maxLogp[b]
            if (value != null && (maxLogp[b] == null || value > (maxLogp[b] as number))) {
              maxLogp[b] = value
            }
          }
        }
        visiting.delete(rowKey)
      }
      let bestScore = 0
      for (const value of maxLogp) if (value != null && value > bestScore) bestScore = value
      const result: SubtreeAgg = { maxLogp, bestScore, count }
      agg.set(rowKey, result)
      return result
    }
    for (const rowKey of rowByKey.keys()) compute(rowKey)
    return agg
  }, [derivedByKey, hierarchy, rowByKey])

  // Reset the drill path when the population changes (new data or search). Done during render —
  // React's recommended alternative to a setState-in-effect.
  const [prevPopulation, setPrevPopulation] = useState(population)
  if (prevPopulation !== population) {
    setPrevPopulation(population)
    setPath([])
  }

  // Reset the global color-scale breakpoints to equal quarters whenever the value range changes (new
  // data/scope). Also render-time, mirroring the path reset above.
  const [prevGlobalMax, setPrevGlobalMax] = useState<number | null>(null)
  if (prevGlobalMax !== globalMax) {
    resetBreakpoints()
  }

  function resetBreakpoints() {
    setPrevGlobalMax(globalMax)
    setBreakpoints([globalMax * 0.25, globalMax * 0.5, globalMax * 0.75])
  }

  // One entry per visible panel: the roots, then one panel per drilled parent in `path`. Columns are the
  // level's nodes in hierarchy order; each OverviewLevel sorts (by its chosen analysis) and caps them.
  const levels = useMemo(() => {
    const makeColumns = (keys: string[]): Column[] =>
      keys
        .map((rowKey) => {
          const row = rowByKey.get(rowKey)
          if (!row) return null
          const agg = subtreeAggByKey.get(rowKey) ?? EMPTY_AGG
          const hasChildren = (hierarchy.childRowKeysByParentRowKey.get(rowKey)?.length ?? 0) > 0
          return { row, agg, hasChildren } satisfies Column
        })
        .filter((column): column is Column => column != null)

    const rootKeys =
      hierarchy.rootRowKeys.length > 0 ? hierarchy.rootRowKeys : population.map((row) => row.rowKey)
    const result: { parentRow: ConceptSummaryRow | null; columns: Column[] }[] = [
      { parentRow: null, columns: makeColumns(rootKeys) },
    ]
    for (let d = 0; d < path.length; d++) {
      const childKeys = hierarchy.childRowKeysByParentRowKey.get(path[d]) ?? []
      if (childKeys.length === 0) break
      result.push({ parentRow: rowByKey.get(path[d]) ?? null, columns: makeColumns(childKeys) })
    }
    return result
  }, [hierarchy, path, population, rowByKey, subtreeAggByKey])

  // Click a parent → open its children in the panel below (or collapse if already open). Leaf → table.
  const handlePick = (depth: number, column: Column) => {
    if (column.hasChildren) {
      setPath((current) =>
        current[depth] === column.row.rowKey
          ? current.slice(0, depth)
          : [...current.slice(0, depth), column.row.rowKey],
      )
    } else {
      onSelectConcept(column.row.rowKey)
    }
  }

  return (
    <Stack spacing={2}>
      <Grid container spacing={2} sx={{ p: 1, pt: 2, placeContent: "space-between" }}>
        {sharedControls}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size={"small"}>
            <InputLabel id="duckdb-overview-scale-label">Color Scale</InputLabel>
            <Select
              labelId="duckdb-overview-scale-label"
              value={scaleMode}
              label="Color Scale"
              onChange={(event) => setScaleMode(event.target.value as HeatmapScaleMode)}
            >
              <MenuItem value="perColumn">Per analysis</MenuItem>
              <MenuItem value="global">Global</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            size={"small"}
            label={
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                <Search sx={{ fontSize: 16 }} />
                Concept search
              </Box>
            }
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Filter the concept population by concept/code/id"
          />
        </Grid>
        <Grid columns={2} size={{ xs: 12, md: 6 }}>
          {scaleMode === "global" && (
            <ColorRangeSlider
              value={breakpoints}
              onChange={setBreakpoints}
              max={globalMax}
              colors={OVERVIEW_BUCKET_COLORS}
              resetBreakpoints={resetBreakpoints}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 1 }}>
          <InfoModal />
        </Grid>
      </Grid>

      <Stack spacing={1.5} sx={{ px: 1 }}>
        {chartLoading && <Alert severity="info">Loading chart concepts from DuckDB...</Alert>}

        <Breadcrumbs aria-label="hierarchy path">
          <Link
            component="button"
            type="button"
            underline="hover"
            color={path.length === 0 ? "text.primary" : "primary"}
            onClick={() => setPath([])}
          >
            All roots
          </Link>
          {path.map((rowKey, index) => {
            const isLast = index === path.length - 1
            const label = conceptLabel(
              rowByKey.get(rowKey) ?? ({ conceptId: 0, conceptName: rowKey } as ConceptSummaryRow),
            )
            return isLast ? (
              <Typography key={rowKey} color="text.primary">
                {label}
              </Typography>
            ) : (
              <Link
                key={rowKey}
                component="button"
                type="button"
                underline="hover"
                color="primary"
                onClick={() => setPath((current) => current.slice(0, index + 1))}
              >
                {label}
              </Link>
            )
          })}
        </Breadcrumbs>
      </Stack>

      <Stack spacing={1.5} sx={{ px: 1 }}>
        {levels.map((level, depth) => (
          <OverviewLevel
            key={depth === 0 ? "roots" : path[depth - 1]}
            title={
              depth === 0
                ? "Roots"
                : `Children of ${conceptLabel(level.parentRow ?? ({ conceptId: 0 } as ConceptSummaryRow))}`
            }
            columns={level.columns}
            activeRowKey={path[depth] ?? null}
            scaleMode={scaleMode}
            perColumnMax={perColumnMax}
            bucketBreakpoints={breakpoints}
            bucketColors={OVERVIEW_BUCKET_COLORS}
            onPick={(column) => handlePick(depth, column)}
          />
        ))}
      </Stack>
    </Stack>
  )
}
