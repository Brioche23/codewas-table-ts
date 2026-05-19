import * as THREE from "three"
import { Canvas, useThree } from "@react-three/fiber"
import { Line } from "@react-three/drei"

import { extent, scaleLinear, type ScaleLinear } from "d3"
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"

import { Box } from "@mui/material"

type SlopeChartData = {
  id: string
  start: number
  end: number
}

type SlopeChartProps = {
  data: SlopeChartData[]
}
type AllLinesProps = {
  data: SlopeChartData[]
  yScale: ScaleLinear<number, number, never>
  x1: number
  x2: number
}
type HoveredLineProps = {
  data: SlopeChartData[]
  index: number | null
  yScale: ScaleLinear<number, number, never>
  x1: number
  x2: number
}

const CANVAS_SIZE = {
  width: 400,
  height: 200,
}

const ZOOM = 50
const worldWidth = CANVAS_SIZE.width / ZOOM
const worldHeight = CANVAS_SIZE.height / ZOOM

export function SlopeChart({ data }: SlopeChartProps) {
  console.log(data)

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const allValues = data.map((d) => [d.start, d.end]).flat()
  const ext = extent(allValues) as [number, number]
  if (ext[0] === undefined) return null

  const sortedData = useMemo(() => [...data].sort((a, b) => +a.start - +b.start), [data])

  console.log(ext)
  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain(ext)
        .range([-worldHeight / 2, worldHeight / 2]),
    [worldHeight, ext],
  )

  const [x1, x2] = [-worldWidth / 2 + 0.1, worldWidth / 2 - 0.1]

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const rect = e.currentTarget?.getBoundingClientRect()
      const xRatio = (e.clientX - rect.left) / rect.width // 0→1 left to right
      const yRatio = (e.clientY - rect.top) / rect.height

      const worldY = (1 - yRatio) * worldHeight - worldHeight / 2

      let closestIndex = 0
      let closestDist = Infinity

      data.forEach((d, i) => {
        // Interpolate the line's Y at the mouse's X position
        const lineYAtMouseX = d.start + xRatio * (d.end - d.start)

        const dist = Math.abs(yScale(lineYAtMouseX) - worldY)
        if (dist < closestDist) {
          closestDist = dist
          closestIndex = i
        }
      })

      setHoveredIndex(closestIndex)
    },
    [data, yScale, worldHeight],
  )

  return (
    <Box
      id="canvas-container"
      sx={{ width: CANVAS_SIZE.width, height: CANVAS_SIZE.height, position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <Canvas
        orthographic
        camera={{ zoom: ZOOM, position: [0, 0, 100] }}
        // frameloop="demand" // only renders when invalidated
        style={{ position: "absolute", inset: 0 }}
        onCreated={({ gl }) => {
          // Ensures context is properly re-initialized on HMR
          gl.setPixelRatio(window.devicePixelRatio)
        }}
      >
        <AllLines data={sortedData} yScale={yScale} x1={x1} x2={x2} />
      </Canvas>
      <Canvas
        orthographic
        camera={{ zoom: ZOOM, position: [0, 0, 100] }}
        // frameloop="demand" // only renders when invalidated
        style={{ position: "absolute", inset: 0 }}
        onCreated={({ gl }) => {
          // Ensures context is properly re-initialized on HMR
          gl.setPixelRatio(window.devicePixelRatio)
        }}
      >
        <HoveredLine data={sortedData} index={hoveredIndex} yScale={yScale} x1={x1} x2={x2} />
      </Canvas>
      {hoveredIndex && <p>id: {data[hoveredIndex].id}</p>}
    </Box>
  )
}

function AllLines({ data, yScale, x1, x2 }: AllLinesProps) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(data.length * 6) // 2 points * xyz = 6 floats per line

    data.forEach((d, i) => {
      const offset = i * 6

      // Point A
      positions[offset + 0] = x1
      positions[offset + 1] = yScale(d.start)
      positions[offset + 2] = 0
      // Point B
      positions[offset + 3] = x2
      positions[offset + 4] = yScale(d.end)
      positions[offset + 5] = 0
    })

    const colors = new Float32Array(data.length * 6) // RGB per vertex

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    return geo
  }, [data, x1, x2, yScale])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={"grey"} opacity={0.5} transparent />
    </lineSegments>
  )
}

function HoveredLine({ data, index, yScale, x1, x2 }: HoveredLineProps) {
  const { invalidate } = useThree()

  useEffect(() => {
    invalidate()
  }, [index]) // tell R3F to re-render on index change

  if (index === null || !data[index]) return null

  const y1 = yScale(data[index].start)
  const y2 = yScale(data[index].end)

  return (
    <group position={[0, 0, 0]}>
      <Line
        points={[
          [x1, y1, 0],
          [x2, y2, 0],
        ]}
        color="red"
        lineWidth={2}
      />
      <mesh position={[x1, y1, 0]}>
        <circleGeometry args={[0.05, 10]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh position={[x2, y2, 0]}>
        <circleGeometry args={[0.05, 10]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </group>
  )
}
