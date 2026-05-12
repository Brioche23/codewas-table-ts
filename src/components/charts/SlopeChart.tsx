import { Canvas } from "@react-three/fiber"
export function SlopeChart() {
  return (
    <div id="canvas-container">
      <Canvas>
        <pointLight position={[10, 10, 10]} />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color={"hotpink"} />
        </mesh>
      </Canvas>
    </div>
  )
}
