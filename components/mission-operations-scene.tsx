'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { MissionCanvasPerformance } from './mission-canvas-performance'
import { MissionCanvasErrorBoundary } from './mission-canvas-error-boundary'

export function MissionOperationsScene() {
  const [webGLAvailable, setWebGLAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      context?.getExtension('WEBGL_lose_context')?.loseContext()
      setWebGLAvailable(Boolean(context))
    } catch {
      setWebGLAvailable(false)
    }
  }, [])

  if (webGLAvailable === null) return <div className="operations-scene-background" aria-hidden="true" />
  if (!webGLAvailable) return <div className="operations-scene-background operations-scene-fallback" aria-hidden="true"><i /><b /></div>
  return <div className="operations-scene-background" aria-hidden="true">
    <MissionCanvasErrorBoundary fallback={<div className="operations-scene-fallback"><i /><b /></div>}>
      <Canvas dpr={[1, 1.5]} frameloop="demand" camera={{ position: [0, 0.6, 12], fov: 44 }} fallback={<div className="operations-scene-fallback"><i /><b /></div>}>
        <MissionCanvasPerformance />
        <color attach="background" args={['#07111b']} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[5, 6, 4]} intensity={3} color="#c6fff0" />
        <pointLight position={[-6, 2, 1]} intensity={18} color="#668cff" />
        <mesh position={[0, -5.3, -2]}><sphereGeometry args={[3.5, 32, 24]} /><meshStandardMaterial color="#1e546b" emissive="#102d4d" emissiveIntensity={0.45} roughness={0.8} /></mesh>
        <mesh position={[0, -5.3, -1.92]}><sphereGeometry args={[3.53, 32, 24]} /><meshBasicMaterial color="#4fc1b6" wireframe transparent opacity={0.1} /></mesh>
        <mesh rotation={[0.32, 0.1, -0.12]}><torusGeometry args={[5.1, 0.018, 6, 120]} /><meshBasicMaterial color="#75d9cf" transparent opacity={0.46} /></mesh>
        <OperationsSatellite />
        {Array.from({ length: 42 }, (_, index) => <mesh position={[(index * 37 % 31) - 15, (index * 19 % 19) - 9, -5]} key={index}><sphereGeometry args={[index % 7 === 0 ? 0.035 : 0.018, 6, 6]} /><meshBasicMaterial color="#d8e8f4" transparent opacity={0.66} /></mesh>)}
      </Canvas>
    </MissionCanvasErrorBoundary>
  </div>
}

function OperationsSatellite() {
  const model = useRef<Group>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useFrame((_, delta) => {
    if (!reducedMotion && model.current) model.current.rotation.y += delta * 0.12
  })

  return <group ref={model} position={[3.7, 1.4, 0]} rotation={[0.22, 0.35, -0.2]}>
    <mesh><boxGeometry args={[0.7, 0.62, 0.56]} /><meshStandardMaterial color="#b6a36f" metalness={0.5} roughness={0.42} /></mesh>
    <mesh position={[0, 0, 0.3]}><boxGeometry args={[0.35, 0.26, 0.025]} /><meshStandardMaterial color="#76c5e0" metalness={0.25} roughness={0.25} /></mesh>
    {[-1, 1].map((side) => <group position={[side * 1.32, 0, 0]} key={side}>
      <mesh><boxGeometry args={[1.8, 0.08, 0.58]} /><meshStandardMaterial color="#284e70" metalness={0.3} roughness={0.38} /></mesh>
      {[0, 1, 2, 3].map((line) => <mesh position={[side * -0.67 + line * 0.4, 0.05, 0]} key={line}><boxGeometry args={[0.025, 0.012, 0.55]} /><meshBasicMaterial color="#9bd8f1" /></mesh>)}
    </group>)}
    <mesh position={[0, 0.52, -0.38]} rotation={[1.1, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 0.48, 10]} /><meshStandardMaterial color="#d6c58e" /></mesh>
    <mesh position={[0, 0.8, -0.38]} rotation={[1.1, 0, 0]}><coneGeometry args={[0.28, 0.15, 20]} /><meshStandardMaterial color="#d7cfad" metalness={0.25} /></mesh>
  </group>
}
