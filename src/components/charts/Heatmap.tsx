import { Canvas, useThree } from "@react-three/fiber"

import { useEffect, useRef, useState, type RefObject } from "react"

import { COLUMNS } from "../../utils/constants"
import type { ColumnsOption, ConceptRow } from "../../utils/types"
import { scaleSequential, type ScaleSequential } from "d3-scale"
import { interpolateRdYlBu } from "d3-scale-chromatic"
import { OrthographicCamera } from "three"

type HeatmapProps = {
  data: ConceptRow[]
  metricKey: string
  tableContainerRef: RefObject<HTMLDivElement | null>
}
type HeatmapCellsProps = {
  data: ConceptRow[]
  columns: ColumnsOption[]
  metricKey: string
  width: number
  height: number
  colorScale: ScaleSequential<string, never>
}

type CameraProps = {
  width: number
  height: number
}

const PADDING = 1

function HeatmapCells({ data, columns, metricKey, width, height, colorScale }: HeatmapCellsProps) {
  const rows = data.length
  const cols = columns.length

  const cellW = width / cols
  const cellH = height / rows

  // R3F uses a coordinate system centered at (0,0)
  // so we offset by half the total size to start from top-left
  const offsetX = -width / 2 + cellW / 2
  const offsetY = height / 2 - cellH / 2

  return (
    <>
      {data.map((row, rowIdx) =>
        columns.map((col, colIdx) => {
          const raw = row[col.key]?.[0]?.[0]?.[metricKey]
          const p = raw ?? 0 // default to 1 (cold/blue) if missing
          const color = colorScale(p)

          const x = offsetX + colIdx * cellW
          const y = offsetY - rowIdx * cellH

          return (
            <mesh key={`${rowIdx}-${colIdx}`} position={[x, y, 0]}>
              <planeGeometry args={[cellW - PADDING, cellH - PADDING]} />
              <meshBasicMaterial color={color} />
            </mesh>
          )
        }),
      )}
    </>
  )
}

function OrthoCamera({ width, height }: CameraProps) {
  const camera = useThree((state) => state.camera) as OrthographicCamera

  useEffect(() => {
    // Set orthographic camera to match canvas pixel dimensions exactly
    // so 1 unit = 1 pixel
    camera.left = -width / 2
    camera.right = width / 2
    camera.top = height / 2
    camera.bottom = -height / 2
    camera.near = -100
    camera.far = 100
    camera.position.set(0, 0, 10)
    camera.updateProjectionMatrix()
  }, [camera, width, height])

  return null
}

export function Heatmap({ data, metricKey = "pValue", tableContainerRef }: HeatmapProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const wrapperRef = useRef(null)

  // Replace pValueToColor with a d3 scale
  const colorScale = scaleSequential()
    .domain([1, 0]) // p-value range
    .interpolator(interpolateRdYlBu) // Red=low(significant) → Blue=high

  // Match height to the MRT table container
  useEffect(() => {
    const tableEl = tableContainerRef?.current
    const wrapperEl = wrapperRef?.current
    if (!tableEl || !wrapperEl) return

    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({
        width: wrapperEl.getBoundingClientRect().width,
        height: entry.contentRect.height,
      })
    })

    observer.observe(tableEl)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapperRef} style={{ width: "100%", height: canvasSize.height || 400 }}>
      {canvasSize.width > 0 && canvasSize.height > 0 && (
        <Canvas
          orthographic
          camera={{ zoom: 1, position: [0, 0, 10] }}
          style={{ width: "100%", height: "100%" }}
          gl={{ antialias: true }}
        >
          <OrthoCamera width={canvasSize.width} height={canvasSize.height} />
          <HeatmapCells
            data={data}
            columns={COLUMNS}
            metricKey={metricKey}
            width={canvasSize.width}
            height={canvasSize.height}
            colorScale={colorScale}
          />
        </Canvas>
      )}
    </div>
  )
}
