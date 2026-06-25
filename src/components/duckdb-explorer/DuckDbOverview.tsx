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
  FormControl,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { HEATMAP_BLOCKS, OVERVIEW_MIN_COL_PX, OVERVIEW_MIN_LABEL_PX } from "./constants"
import {
  computeHeatmapDerived,
  getHeatmapColor,
  getHeatmapHeaderLines,
  matchesHeatmapSearch,
} from "./heatmapUtils"
import { buildHierarchyIndex } from "./hierarchyUtils"
import type { ChartBlockKey, ConceptSummaryRow, HeatmapScaleMode } from "./types"
import { formatNumber } from "./utils"

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
  globalMax,
  onPick,
}: {
  title: string
  columns: Column[]
  activeRowKey: string | null
  scaleMode: HeatmapScaleMode
  perColumnMax: Record<ChartBlockKey, number>
  globalMax: number
  onPick: (column: Column) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(MIN_CANVAS_WIDTH)
  const [hovered, setHovered] = useState<{ column: number; block: number } | null>(null)

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const update = () => setCanvasWidth(Math.max(MIN_CANVAS_WIDTH, Math.floor(element.clientWidth)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const gridWidth = canvasWidth - LABEL_WIDTH
  const maxColumns = Math.max(1, Math.floor(gridWidth / OVERVIEW_MIN_COL_PX))
  const shown = columns.length > maxColumns ? columns.slice(0, maxColumns) : columns
  const hiddenCount = columns.length - shown.length
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
    const cellWidth = columnWidth > 4 ? columnWidth - 1 : columnWidth
    const activeIndex = activeRowKey ? shown.findIndex((c) => c.row.rowKey === activeRowKey) : -1

    // Cells + analysis row labels.
    for (let b = 0; b < HEATMAP_BLOCKS.length; b++) {
      const block = HEATMAP_BLOCKS[b]
      const y = HEADER_WIDTH + b * ROW_HEIGHT
      const scaleMax = scaleMode === "perColumn" ? perColumnMax[block] : globalMax

      for (let i = 0; i < shown.length; i++) {
        context.fillStyle = getHeatmapColor(shown[i].agg.maxLogp[b], scaleMax)
        context.fillRect(LABEL_WIDTH + i * columnWidth, y, cellWidth, ROW_HEIGHT - 1)
      }

      context.fillStyle = "#f3f3f3"
      context.fillRect(0, y, LABEL_WIDTH - 1, ROW_HEIGHT - 1)
      context.fillStyle = "#222"
      context.textAlign = "left"
      const lines = getHeatmapHeaderLines(block)
      lines.forEach((line, lineIndex) => {
        const lineY = lines.length === 1 ? y + ROW_HEIGHT / 2 : y + 9 + lineIndex * 13
        context.fillText(line, 10, lineY)
      })
    }

    // Header strip: gutter caption + rotated concept labels (all when wide enough, else only hovered).
    context.fillStyle = "#f3f3f3"
    context.fillRect(0, 0, LABEL_WIDTH - 1, HEADER_WIDTH)
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
        Math.max(cellWidth - 1, 2),
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
        HEATMAP_BLOCKS.length * ROW_HEIGHT - 1,
      )
      drawColumnLabel(hovered.column, "#0d47a1", labelMaxX - labelMinX, true)
    }
  }, [activeRowKey, canvasWidth, columnWidth, globalMax, hovered, perColumnMax, scaleMode, shown])

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
        </Typography>
      </Stack>
      <Box ref={containerRef} sx={{ width: "100%", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", cursor: "pointer" }}
          onMouseMove={(event) => setHovered(resolveCell(event))}
          onMouseLeave={() => setHovered(null)}
          onClick={(event) => {
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

  // One entry per visible panel: the roots, then one panel per drilled parent in `path`. Each panel's
  // columns are the level's nodes sorted by subtree evidence (strongest first); OverviewLevel caps them.
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
        .sort((a, b) => b.agg.bestScore - a.agg.bestScore)

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
      <Grid container spacing={2} sx={{ p: 1 }}>
        {sharedControls}
        <Grid size={{ xs: 12, md: 3 }}>
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
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            size={"small"}
            label="Concept search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Filter the concept population by concept/code/id"
          />
        </Grid>
      </Grid>

      <Stack spacing={1.5} sx={{ px: 1 }}>
        {chartLoading && <Alert severity="info">Loading chart concepts from DuckDB...</Alert>}
        <Typography variant="body2" color="text.secondary" component="div">
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
            leaf → opens the concept dialog
          </Box>
          . The currently expanded column is outlined in green.
        </Typography>

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
            globalMax={globalMax}
            onPick={(column) => handlePick(depth, column)}
          />
        ))}
      </Stack>
    </Stack>
  )
}
