import * as THREE from "three"
import { Canvas, useThree } from "@react-three/fiber"
import { Line } from "@react-three/drei"

import type { BinaryCount } from "../../utils/types"
import { extent, scaleLinear, type ScaleLinear } from "d3"
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"

type SlopeChartProps = {
  data: BinaryCount[]
}
type AllLinesProps = {
  data: BinaryCount[]
  domain: [number, number]
  yScale: ScaleLinear<number, number, never>
}
type HoveredLineProps = {
  data: BinaryCount[]
  domain: [number, number]
  index: number | null
  yScale: ScaleLinear<number, number, never>
}

const CANVAS_SIZE = {
  width: 400,
  height: 250,
}

const ZOOM = 50
const worldWidth = CANVAS_SIZE.width / ZOOM
const worldHeight = CANVAS_SIZE.height / ZOOM

export function SlopeChart({ data }: SlopeChartProps) {
  console.log(data)

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const allValues = data.map((d) => [d.nCasesWithCategory, d.nControlsWithCategory]).flat()
  const ext = extent(allValues) as [number, number]
  if (ext[0] === undefined) return null

  const sortedData = useMemo(
    () => [...data].sort((a, b) => +a.nCasesWithCategory - +b.nCasesWithCategory),
    [data],
  )

  console.log(ext)
  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain(ext)
        .range([-worldHeight / 2, worldHeight / 2]),
    [worldHeight, ext],
  )

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
        const lineYAtMouseX =
          d.nCasesWithCategory + xRatio * (d.nControlsWithCategory - d.nCasesWithCategory)

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
    <div
      id="canvas-container"
      style={{ width: CANVAS_SIZE.width, height: CANVAS_SIZE.height, position: "relative" }}
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
        <AllLines data={sortedData} domain={ext} yScale={yScale} />
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
        <HoveredLine data={sortedData} domain={ext} index={hoveredIndex} yScale={yScale} />
      </Canvas>
    </div>
  )
}

function AllLines({ data, domain, yScale }: AllLinesProps) {
  const { viewport } = useThree()
  const hh = viewport.height / 2

  const geometry = useMemo(() => {
    const positions = new Float32Array(data.length * 6) // 2 points * xyz = 6 floats per line

    data.forEach((d, i) => {
      const [x1, x2] = [-viewport.width / 2, viewport.width / 2]

      const offset = i * 6

      // Point A
      positions[offset + 0] = x1
      positions[offset + 1] = yScale(d.nCasesWithCategory)
      positions[offset + 2] = 0
      // Point B
      positions[offset + 3] = x2
      positions[offset + 4] = yScale(d.nControlsWithCategory)
      positions[offset + 5] = 0
    })

    const colors = new Float32Array(data.length * 6) // RGB per vertex

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    return geo
  }, [data, domain, viewport])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={"grey"} opacity={0.5} transparent />
    </lineSegments>
  )
}

function HoveredLine({ data, domain, index, yScale }: HoveredLineProps) {
  const { viewport, invalidate } = useThree()
  const hh = viewport.height / 2

  useEffect(() => {
    invalidate()
  }, [index]) // tell R3F to re-render on index change

  if (index === null || !data[index]) return null

  const [x1, x2] = [-viewport.width / 2, viewport.width / 2]

  const y1 = yScale(data[index].nCasesWithCategory)
  const y2 = yScale(data[index].nControlsWithCategory)

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
      {/* <mesh position={[x1, y1, 0]}>
        <circleGeometry args={[0.05, 10]} />
        <meshBasicMaterial color="rgb(182, 148, 255)" />
      </mesh>
      <mesh position={[x2, y2, 0]}>
        <circleGeometry args={[0.05, 10]} />
        <meshBasicMaterial color="rgb(182, 148, 255)" />
      </mesh> */}
    </group>
  )
}
