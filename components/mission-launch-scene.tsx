'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Vector3, type Group, type Mesh } from 'three'
import type { RocketAppearance } from './mission-data'
import { MissionCanvasPerformance } from './mission-canvas-performance'
import { MissionRocketSprite } from './mission-rocket-sprite'
import { MissionCanvasErrorBoundary } from './mission-canvas-error-boundary'

export const MissionLaunchScene = memo(function MissionLaunchScene({ phase, appearance, rocketId, exploded, enabled, controlsRef }: {
  phase: 'throttle' | 'turn' | 'separation' | 'result' | 'failure'
  appearance: RocketAppearance
  rocketId: string
  exploded: boolean
  enabled: boolean
  controlsRef: RefObject<{ heading: number }>
}) {
  const [webGLAvailable, setWebGLAvailable] = useState<boolean | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setReducedMotion(preference.matches)
    updateMotionPreference()
    preference.addEventListener('change', updateMotionPreference)
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      context?.getExtension('WEBGL_lose_context')?.loseContext()
      setWebGLAvailable(Boolean(context))
    } catch {
      setWebGLAvailable(false)
    }
    return () => preference.removeEventListener('change', updateMotionPreference)
  }, [])

  if (!enabled || webGLAvailable !== true) return null

  return <div className="launch-scene-3d" aria-hidden="true">
    <MissionCanvasErrorBoundary resetKey={`${rocketId}:${JSON.stringify(appearance)}`} fallback={null}>
      <Canvas dpr={[1, 1.5]} frameloop="demand" camera={{ position: [0, 2, 13], fov: 40 }} gl={{ antialias: true, alpha: false }} fallback={<MissionRocketSprite rocketId={rocketId} appearance={appearance} exploded={exploded} shadow={false} />}>
        <MissionCanvasPerformance />
        <color attach="background" args={['#070d17']} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[4, 8, 5]} intensity={3} color="#c6fff0" />
        <pointLight position={[0, 1, 3]} intensity={22} color={appearance.flameColor} distance={20} />
        <LaunchWorld phase={phase} controlsRef={controlsRef} appearance={appearance} rocketId={rocketId} exploded={exploded} reducedMotion={reducedMotion} />
      </Canvas>
    </MissionCanvasErrorBoundary>
  </div>
})

const LaunchWorld = memo(function LaunchWorld({ phase, controlsRef, appearance, rocketId, exploded, reducedMotion }: {
  phase: 'throttle' | 'turn' | 'separation' | 'result' | 'failure'
  controlsRef: RefObject<{ heading: number }>
  appearance: RocketAppearance
  rocketId: string
  exploded: boolean
  reducedMotion: boolean
}) {
  const rocket = useRef<Group>(null)
  const stage = useRef<Group>(null)
  const blast = useRef<Mesh>(null)
  const cameraTarget = useRef(new Vector3())
  const cameraPosition = useRef(new Vector3())
  const elapsedRef = useRef(0)
  const starPositions = useMemo(() => Array.from({ length: 40 }, (_, index) => {
    const seed = index * 127.1
    return [Math.sin(seed) * 23, (index % 17) * 1.5 - 9, -8 - (index % 11) * 2] as const
  }), [])
  const arc = useMemo(() => Array.from({ length: 48 }, (_, index) => {
    const t = index / 47
    return new Vector3(-3.6 + t * 7.2, 1 + t * 9 + Math.sin(t * Math.PI) * 2.2, -1.2)
  }), [])

  useFrame(({ camera }, delta) => {
    elapsedRef.current += delta
    const phaseDuration = phase === 'throttle' ? 9 : phase === 'turn' ? 9 : 7
    const phaseBase = phase === 'throttle' ? 0 : phase === 'turn' ? 0.32 : phase === 'separation' ? 0.72 : 1
    const phaseSpan = phase === 'throttle' ? 0.27 : phase === 'turn' ? 0.38 : phase === 'separation' ? 0.28 : 0
    const t = Math.max(0, Math.min(1, phaseBase + Math.min(1, elapsedRef.current / phaseDuration) * phaseSpan))
    const heading = controlsRef.current.heading
    const x = t * (heading / 45) * 3.2
    const y = t * 10
    if (rocket.current) {
      rocket.current.position.set(x, y, 0)
      rocket.current.rotation.z = -(heading * Math.PI / 180) * 0.75
      rocket.current.rotation.x = reducedMotion ? 0 : Math.sin(t * 3) * 0.025
    }
    if (stage.current) {
      stage.current.position.set(x - 0.3, y - 1.6 - Math.max(0, t - 0.6) * 6, 0.2)
      if (!reducedMotion) stage.current.rotation.z += delta * 0.5
    }
    if (blast.current) {
      blast.current.visible = exploded
      if (exploded) {
        const pulse = reducedMotion ? 1.2 : 1.2 + Math.sin(Date.now() / 90) * 0.18
        blast.current.scale.setScalar(pulse)
      }
    }
    cameraTarget.current.set(x, y + 0.3, 0)
    const shake = exploded && !reducedMotion ? 0.08 : 0
    cameraPosition.current.set(x + Math.sin(Date.now() / 27) * shake, y + 2.2 + Math.cos(Date.now() / 31) * shake, 13)
    camera.position.lerp(cameraPosition.current, Math.min(1, delta * 2.2))
    camera.lookAt(cameraTarget.current)
  })

  const bodyHeight = rocketId === 'rideshare' ? 2.5 : rocketId === 'electron' ? 3.2 : rocketId === 'sls' ? 4.2 : 3.8
  const bodyRadius = rocketId === 'sls' ? 0.58 : rocketId === 'falcon9' ? 0.48 : 0.36
  const boosterCount = rocketId === 'sls' ? [-1, 1] : []

  return <>
    <fog attach="fog" args={['#070d17', 16, 54]} />
    {starPositions.map((position, index) => <mesh position={position} key={index}><sphereGeometry args={[index % 8 === 0 ? 0.045 : 0.025, 6, 6]} /><meshBasicMaterial color={index % 6 === 0 ? '#79e3d0' : '#cfdeec'} transparent opacity={0.75} /></mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#101d2a" roughness={0.92} /></mesh>
    <gridHelper args={[100, 40, '#27505a', '#172b39']} position={[0, -0.13, 0]} />
    <Line points={arc} color="#77e0d1" transparent opacity={phase === 'turn' ? 0.9 : 0.3} lineWidth={2} />
    <mesh position={[arc[47].x, arc[47].y, arc[47].z]}><sphereGeometry args={[0.13, 12, 12]} /><meshBasicMaterial color="#bbf5d9" /></mesh>
    <group ref={rocket} position={[0, 0, 0]}>
      <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[bodyRadius * 0.9, bodyRadius, bodyHeight, 20]} /><meshStandardMaterial color={appearance.bodyColor} metalness={0.3} roughness={0.38} /></mesh>
      <mesh position={[0, -bodyHeight * 0.12, bodyRadius * 0.91]}><cylinderGeometry args={[bodyRadius * 0.95, bodyRadius * 0.95, 0.11, 20]} /><meshStandardMaterial color={appearance.stripeColor} /></mesh>
      <mesh position={[0, bodyHeight / 2 + 0.37, 0]}><coneGeometry args={[bodyRadius * 0.88, 0.74, 20]} /><meshStandardMaterial color={appearance.bodyColor} metalness={0.26} roughness={0.34} /></mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * bodyRadius * 0.73, -bodyHeight * 0.38, 0]} rotation={[0, 0, side * -0.14]}><boxGeometry args={[0.22, 0.76, 0.13]} /><meshStandardMaterial color={appearance.stripeColor} /></mesh>)}
      {boosterCount.map((side) => <group key={side} position={[side * bodyRadius * 1.45, -0.12, 0]}><mesh><cylinderGeometry args={[bodyRadius * 0.36, bodyRadius * 0.4, bodyHeight * 0.74, 14]} /><meshStandardMaterial color="#e5e9e9" metalness={0.2} roughness={0.46} /></mesh><mesh position={[0, -bodyHeight * 0.4, 0]}><coneGeometry args={[bodyRadius * 0.28, 0.8, 12]} /><meshStandardMaterial color={appearance.flameColor} emissive={appearance.flameColor} emissiveIntensity={2} transparent opacity={0.8} /></mesh></group>)}
      <mesh position={[0, -bodyHeight * 0.7, 0]}><coneGeometry args={[bodyRadius * 0.55, 1.8, 16]} /><meshStandardMaterial color={appearance.flameColor} emissive={appearance.flameColor} emissiveIntensity={2.2} transparent opacity={0.84} /></mesh>
      <pointLight position={[0, -bodyHeight * 0.68, 0]} color={appearance.flameColor} intensity={18} distance={8} />
    </group>
    {(phase === 'separation' || phase === 'result') && <group ref={stage} position={[0, -1.6, 0.2]}><mesh><cylinderGeometry args={[bodyRadius * 0.78, bodyRadius * 0.9, bodyHeight * 0.42, 16]} /><meshStandardMaterial color="#626f7b" metalness={0.5} roughness={0.5} /></mesh><mesh position={[0, -bodyHeight * 0.2, 0]}><coneGeometry args={[bodyRadius * 0.28, 0.65, 12]} /><meshStandardMaterial color="#ff9a54" emissive="#ff9a54" emissiveIntensity={1.6} transparent opacity={0.8} /></mesh></group>}
    <mesh ref={blast} position={[0, 0.5, 0]} visible={false}><sphereGeometry args={[1.8, 20, 16]} /><meshBasicMaterial color="#ff925f" transparent opacity={0.72} /></mesh>
  </>
})
