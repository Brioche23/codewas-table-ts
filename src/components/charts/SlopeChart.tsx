import * as THREE from "three"
import { Canvas } from "@react-three/fiber"

import { extent, scaleLinear, type ScaleLinear } from "d3"
import { useCallback, useMemo, useState, type MouseEvent } from "react"

import { Box } from "@mui/material"
import { YAxis } from "./YAxis"

type SlopeChartData = {
  id: number
  start: number
  end: number
}

type SlopeChartProps = {
  data: SlopeChartData[]
  visibleDataIds: number[]
}
type AllLinesProps = {
  data: SlopeChartData[]
  visibleDataIds: number[]

  yScale: ScaleLinear<number, number, never>
  x1: number
  x2: number
}

const CANVAS_SIZE = {
  width: 400,
  height: 250,
}

const ZOOM = 50
const worldWidth = CANVAS_SIZE.width / ZOOM
const worldHeight = CANVAS_SIZE.height / ZOOM

export function SlopeChart({ data, visibleDataIds }: SlopeChartProps) {
  console.log(data)
  console.log(visibleDataIds)

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const allValues = data.map((d) => [d.start, d.end]).flat()
  const ext = extent(allValues) as [number, number]
  if (ext[0] === undefined) return null

  const sortedData = useMemo(() => [...data].sort((a, b) => +a.start - +b.start), [data])

  const yScale = useMemo(
    () =>
      scaleLinear()
        .domain(ext)
        .range([-worldHeight / 2, worldHeight / 2 - 0.3]),
    [worldHeight, ext],
  )

  const [x1, x2] = [-worldWidth / 2 + 1, worldWidth / 2 - 1]

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
        <AllLines
          data={sortedData}
          visibleDataIds={visibleDataIds}
          yScale={yScale}
          x1={x1}
          x2={x2}
        />
        <YAxis
          yScale={yScale}
          x={x1}
          worldWidth={worldWidth}
          domain={ext}
          tickCount={10}
          label="cases"
        />
        <YAxis
          yScale={yScale}
          x={x2}
          worldWidth={worldWidth}
          domain={ext}
          tickCount={10}
          label="controls"
        />
        {/* <HoveredLine data={sortedData} index={hoveredIndex} yScale={yScale} x1={x1} x2={x2} /> */}
      </Canvas>

      {hoveredIndex && <p>id: {data[hoveredIndex].id}</p>}
    </Box>
  )
}

function AllLines({ data, visibleDataIds, yScale, x1, x2 }: AllLinesProps) {
  const { selectedGeo, unselectedGeo } = useMemo(() => {
    const selected = data.filter((d) => visibleDataIds.includes(d.id))
    const unselected = data.filter((d) => !visibleDataIds.includes(d.id))

    const buildGeo = (
      items: SlopeChartData[],
      color: string,
      index: number = 0,
    ): THREE.BufferGeometry => {
      const positions = new Float32Array(items.length * 6)
      const colors = new Float32Array(items.length * 6)
      const c = new THREE.Color(color)
      items.forEach((d, i) => {
        const o = i * 6
        positions[o] = x1
        positions[o + 1] = yScale(d.start)
        positions[o + 2] = index
        positions[o + 3] = x2
        positions[o + 4] = yScale(d.end)
        positions[o + 5] = index
        colors[o] = c.r
        colors[o + 1] = c.g
        colors[o + 2] = c.b
        colors[o + 3] = c.r
        colors[o + 4] = c.g
        colors[o + 5] = c.b
      })
      const geo = new THREE.BufferGeometry()
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
      return geo
    }

    return {
      selectedGeo: buildGeo(selected, "red", 1),
      unselectedGeo: buildGeo(unselected, "blue"),
    }
  }, [data, visibleDataIds, x1, x2, yScale])

  return (
    <>
      <lineSegments geometry={unselectedGeo}>
        <lineBasicMaterial vertexColors opacity={0.1} transparent />
      </lineSegments>
      <lineSegments geometry={selectedGeo}>
        <lineBasicMaterial vertexColors opacity={1} />
      </lineSegments>
    </>
  )
}

// function HoveredLine({ data, index, yScale, x1, x2 }: HoveredLineProps) {
//   const { invalidate } = useThree()

//   useEffect(() => {
//     invalidate()
//   }, [index]) // tell R3F to re-render on index change

//   if (index === null || !data[index]) return null

//   const y1 = yScale(data[index].start)
//   const y2 = yScale(data[index].end)

//   return (
//     <group position={[0, 0, 1]}>
//       <Line
//         points={[
//           [x1, y1, 0],
//           [x2, y2, 0],
//         ]}
//         color="red"
//         lineWidth={2}
//       />
//       <mesh position={[x1, y1, 0]}>
//         <circleGeometry args={[0.05, 10]} />
//         <meshBasicMaterial color="red" />
//       </mesh>
//       <mesh position={[x2, y2, 0]}>
//         <circleGeometry args={[0.05, 10]} />
//         <meshBasicMaterial color="red" />
//       </mesh>
//     </group>
//   )
// }
