'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { memo, useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import type { MissionConfiguration, RocketAppearance, SpacecraftSize } from './mission-data'
import { getAntennaOptions, getBatteryOptions, getInstrument, getShieldingOptions, getSolarOptions, getRocket } from './mission-data'
import { MissionCanvasPerformance } from './mission-canvas-performance'
import { MissionSpacecraftDiagram } from './mission-spacecraft-diagram'
import { MissionCanvasErrorBoundary } from './mission-canvas-error-boundary'
import { MissionRocketSprite } from './mission-rocket-sprite'

const INSTRUMENT_COLORS = ['#e6bd77', '#90b5fa', '#f28f83', '#82dfca']

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  return reducedMotion
}

export function SpacecraftCanvas({ configuration, size }: { configuration: MissionConfiguration; size: SpacecraftSize }) {
  const reducedMotion = useReducedMotion()
  return <div className="r3f-view spacecraft-r3f-view">
    <MissionCanvasErrorBoundary
      resetKey={JSON.stringify([configuration, size.id])}
      fallback={<MissionSpacecraftDiagram configuration={configuration} size={size} />}
    >
      <Canvas dpr={[1, 1.5]} frameloop="demand" camera={{ position: [4.1, 2.8, 5.2], fov: 40 }} fallback={<MissionSpacecraftDiagram configuration={configuration} size={size} />}>
        <MissionCanvasPerformance />
        <color attach="background" args={['#0b141c']} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[4, 5, 6]} intensity={3} color="#c6fff0" />
        <pointLight position={[-4, 1, -3]} intensity={22} color="#5a97ec" />
        <SpacecraftModel configuration={configuration} size={size} autoRotate={!reducedMotion} />
        <OrbitControls enablePan={false} enableDamping minDistance={3.5} maxDistance={9} />
      </Canvas>
    </MissionCanvasErrorBoundary>
    <span className="r3f-orbit-label">SCHEMATIC · NOT TO SCALE</span>
  </div>
}

export function RocketCanvas({ configuration, appearance }: { configuration: MissionConfiguration; appearance: RocketAppearance }) {
  const reducedMotion = useReducedMotion()
  return <div className="r3f-view rocket-r3f-view">
    <MissionCanvasErrorBoundary
      resetKey={JSON.stringify([configuration.rocketId, appearance])}
      fallback={<RocketPreviewFallback rocketId={configuration.rocketId} appearance={appearance} />}
    >
      <Canvas dpr={[1, 1.5]} frameloop="demand" camera={{ position: [4.5, 4, 6], fov: 36 }} fallback={<RocketPreviewFallback rocketId={configuration.rocketId} appearance={appearance} />}>
        <MissionCanvasPerformance />
        <color attach="background" args={['#0b141c']} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[4, 5, 6]} intensity={3} color="#fff4dd" />
        <pointLight position={[-3, 0, 2]} intensity={16} color={appearance.flameColor} />
        <RocketModel rocketId={configuration.rocketId} appearance={appearance} autoRotate={!reducedMotion} />
        <OrbitControls enablePan={false} enableDamping minDistance={4} maxDistance={10} />
      </Canvas>
    </MissionCanvasErrorBoundary>
    <span className="r3f-orbit-label">DRAG TO ORBIT · PINCH TO ZOOM</span>
  </div>
}

const SpacecraftModel = memo(function SpacecraftModel({ configuration, size, autoRotate }: { configuration: MissionConfiguration; size: SpacecraftSize; autoRotate: boolean }) {
  const model = useRef<Group>(null)
  useFrame((_, delta) => {
    if (autoRotate && model.current) model.current.rotation.y += delta * 0.16
  })

  const solar = getSolarOptions(size).find((option) => option.id === configuration.solarId) ?? getSolarOptions(size)[0]
  const battery = getBatteryOptions(size).find((option) => option.id === configuration.batteryId) ?? getBatteryOptions(size)[0]
  const antenna = getAntennaOptions(size).find((option) => option.id === configuration.antennaId) ?? getAntennaOptions(size)[0]
  const shield = getShieldingOptions(size).find((option) => option.id === configuration.shieldingId) ?? getShieldingOptions(size)[0]
  const instruments = configuration.instrumentIds.map(getInstrument).filter((instrument): instrument is NonNullable<typeof instrument> => Boolean(instrument))
  const panelScale = solar.id === 'high-yield' ? 1.45 : solar.id === 'deployable' ? 1.1 : 0.72
  const busScale = size.family === 'large' ? 1.25 : size.family === 'cubesat' ? 0.78 : 1

  return <group ref={model} scale={busScale} rotation={[0.1, 0.2, -0.08]}>
    <mesh castShadow receiveShadow><boxGeometry args={[1.15, 0.9, 0.85]} /><meshStandardMaterial color="#526875" metalness={0.65} roughness={0.35} /></mesh>
    <mesh position={[0, 0.08, 0.437]}><boxGeometry args={[0.67, 0.52, 0.025]} /><meshStandardMaterial color="#1a3444" metalness={0.3} roughness={0.25} /></mesh>
    <mesh position={[0, 0, 0.47]}><sphereGeometry args={[0.15, 20, 16]} /><meshStandardMaterial color="#75e0cf" emissive="#2aa795" emissiveIntensity={1.3} /></mesh>
    <mesh position={[0, -0.58, 0]}><boxGeometry args={[0.52, 0.22 + Math.min(0.35, battery.wattHours! / 900), 0.48]} /><meshStandardMaterial color="#d5aa64" metalness={0.3} roughness={0.55} /></mesh>
    {shield.id !== 'none' && <mesh><boxGeometry args={[1.28, 1.1, 1]} /><meshStandardMaterial color="#e3bd78" transparent opacity={0.13} depthWrite={false} wireframe /></mesh>}
    <group position={[0, 0, 0]}>
      <mesh position={[-0.56, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.68, 8]} /><meshStandardMaterial color="#93b3bd" metalness={0.65} /></mesh>
      <mesh position={[0.56, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.68, 8]} /><meshStandardMaterial color="#93b3bd" metalness={0.65} /></mesh>
      {[-1, 1].map((side) => <group key={side} position={[side * (0.62 + panelScale * 0.78), 0, 0]}>
        <mesh><boxGeometry args={[panelScale * 1.42, 0.08, 0.68]} /><meshStandardMaterial color="#275879" metalness={0.4} roughness={0.35} /></mesh>
        {[-0.35, 0, 0.35].map((segment) => <mesh position={[0, 0.048, segment]} key={segment}><boxGeometry args={[panelScale * 1.38, 0.012, 0.012]} /><meshStandardMaterial color="#83bad1" emissive="#1e587a" emissiveIntensity={0.3} /></mesh>)}
      </group>)}
    </group>
    <group position={[0, 0.64, -0.04]} rotation={[Math.PI / 2.2, 0, 0]}>
      <mesh><cylinderGeometry args={[antenna.id === 'high-gain' ? 0.52 : antenna.id === 'medium-gain' ? 0.37 : 0.23, antenna.id === 'high-gain' ? 0.42 : antenna.id === 'medium-gain' ? 0.3 : 0.18, 0.09, 24]} /><meshStandardMaterial color="#c7b37f" metalness={0.5} roughness={0.28} /></mesh>
      <mesh position={[0, 0.21, 0]}><cylinderGeometry args={[0.025, 0.025, 0.42, 8]} /><meshStandardMaterial color="#d8c99a" /></mesh>
    </group>
    {instruments.slice(0, 4).map((instrument, index) => {
      const position: [number, number, number] = [-0.39 + index * 0.26, -0.02, 0.5]
      return <mesh key={instrument.id} position={position} rotation={[0, index * 0.3, 0]}>
        {index % 3 === 0 ? <cylinderGeometry args={[0.08, 0.09, 0.18, 12]} /> : index % 3 === 1 ? <sphereGeometry args={[0.1, 14, 12]} /> : <boxGeometry args={[0.16, 0.17, 0.13]} />}
        <meshStandardMaterial color={INSTRUMENT_COLORS[index]} metalness={0.38} roughness={0.35} />
      </mesh>
    })}
  </group>
})

const RocketPreviewFallback = memo(function RocketPreviewFallback({ rocketId, appearance }: { rocketId: string; appearance: RocketAppearance }) {
  const rocket = getRocket(rocketId)
  return <div className="rocket-preview-fallback"><MissionRocketSprite rocketId={rocketId} appearance={appearance} /><span>{rocket.name} · 2D fallback preview</span></div>
})

const RocketModel = memo(function RocketModel({ rocketId, appearance, autoRotate }: { rocketId: string; appearance: RocketAppearance; autoRotate: boolean }) {
  const model = useRef<Group>(null)
  useFrame((_, delta) => {
    if (autoRotate && model.current) model.current.rotation.y += delta * 0.12
  })
  const vehicle = getRocket(rocketId)
  const proportions = rocketId === 'rideshare' ? { radius: 0.4, height: 2.5 } : rocketId === 'electron' ? { radius: 0.38, height: 3.2 } : rocketId === 'sls' ? { radius: 0.62, height: 4.1 } : { radius: 0.52, height: 3.7 }
  const { radius, height } = proportions
  const isSls = rocketId === 'sls'
  const isFalcon = rocketId === 'falcon9'
  const isElectron = rocketId === 'electron'
  const finScale = appearance.finStyle === 'compact' ? 0.65 : appearance.finStyle === 'swept' ? 1.22 : 1
  const finWidth = radius * 0.62 * finScale
  const noseHeight = appearance.noseShape === 'point' ? radius * 1.15 : appearance.noseShape === 'rounded' ? radius * 0.75 : radius * 0.22
  const nosePosition = height / 2 + noseHeight / 2
  const patchColors: Record<RocketAppearance['missionPatch'], string> = { earth: '#4d9b91', moon: '#b7bdc8', mars: '#d77f63', comet: '#90a9e8', jupiter: '#d4a75d' }

  return <group ref={model} rotation={[0.08, -0.35, 0.04]} position={[0, -0.05, 0]}>
    <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[radius * 0.92, radius, height, 24]} /><meshStandardMaterial color={appearance.bodyColor} metalness={0.35} roughness={0.34} /></mesh>
    <mesh position={[0, -height * 0.13, radius * 0.84]}><cylinderGeometry args={[radius * 0.98, radius * 0.98, 0.12, 24]} /><meshStandardMaterial color={appearance.stripeColor} metalness={0.2} roughness={0.45} /></mesh>
    {appearance.noseShape === 'point' && <mesh position={[0, nosePosition, 0]}><coneGeometry args={[radius * 0.92, noseHeight, 24]} /><meshStandardMaterial color={appearance.bodyColor} metalness={0.32} roughness={0.34} /></mesh>}
    {appearance.noseShape === 'rounded' && <mesh position={[0, height / 2 + noseHeight * 0.34, 0]}><sphereGeometry args={[radius * 0.91, 24, 16]} /><meshStandardMaterial color={appearance.bodyColor} metalness={0.32} roughness={0.34} /></mesh>}
    {appearance.noseShape === 'flat' && <mesh position={[0, height / 2 + noseHeight * 0.48, 0]}><cylinderGeometry args={[radius * 0.92, radius * 0.92, noseHeight, 24]} /><meshStandardMaterial color={appearance.bodyColor} metalness={0.32} roughness={0.34} /></mesh>}
    {isFalcon && <mesh position={[0, height * 0.28, 0]}><cylinderGeometry args={[radius * 1.005, radius * 0.97, 0.08, 24]} /><meshStandardMaterial color={appearance.stripeColor} /></mesh>}
    {isSls && [-1, 1].map((side) => <group key={side} position={[side * radius * 1.25, -height * 0.02, 0]}>
      <mesh><cylinderGeometry args={[radius * 0.35, radius * 0.43, height * 0.78, 16]} /><meshStandardMaterial color="#d9dde1" metalness={0.28} roughness={0.4} /></mesh>
      <mesh position={[0, height * 0.42, 0]}><coneGeometry args={[radius * 0.35, height * 0.11, 16]} /><meshStandardMaterial color={appearance.bodyColor} /></mesh>
      <mesh position={[0, -height * 0.2, 0]}><cylinderGeometry args={[radius * 0.24, radius * 0.24, 0.09, 16]} /><meshStandardMaterial color={appearance.stripeColor} /></mesh>
    </group>)}
    {(isSls || isFalcon || isElectron || rocketId === 'rideshare') && [-1, 1].map((side) => <mesh key={side} position={[side * radius * (appearance.finStyle === 'swept' ? 0.8 : 0.68), -height * 0.39, 0]} rotation={[0, 0, side * (appearance.finStyle === 'swept' ? -0.5 : -0.18)]}>
      <boxGeometry args={[finWidth, height * 0.22 * finScale, radius * 0.16]} /><meshStandardMaterial color={appearance.stripeColor} metalness={0.25} roughness={0.4} />
    </mesh>)}
    <mesh position={[0, -height * 0.53, 0]}><cylinderGeometry args={[radius * 0.52, radius * 0.72, 0.2, 16]} /><meshStandardMaterial color="#465461" metalness={0.65} /></mesh>
    {[0, 1, 2].map((index) => <mesh key={index} position={[-0.2 + index * 0.2, -height * 0.7, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[radius * (isSls ? 0.2 : 0.16), isSls ? 1.05 : 0.78, 14]} /><meshStandardMaterial color={appearance.flameColor} emissive={appearance.flameColor} emissiveIntensity={1.2} transparent opacity={0.82} />
    </mesh>)}
    <mesh position={[radius * 0.56, -height * 0.04, radius * 0.83]}><sphereGeometry args={[0.16, 16, 12]} scale={[1, 1, 0.3]} /><meshStandardMaterial color={patchColors[appearance.missionPatch]} metalness={0.16} roughness={0.5} /></mesh>
    <mesh position={[radius * 0.56, -height * 0.04, radius * 0.86]}><sphereGeometry args={[0.055, 12, 10]} /><meshStandardMaterial color="#f4e3b2" emissive="#b18d4e" emissiveIntensity={0.2} /></mesh>
    <pointLight position={[0, -height * 0.62, 0]} color={appearance.flameColor} intensity={isSls ? 18 : 10} distance={5} />
    <mesh position={[0, -height * 0.52, 0]}><cylinderGeometry args={[radius * 0.94, radius * 0.94, 0.025, 24]} /><meshStandardMaterial color={vehicle.id === 'rideshare' ? '#95a5ae' : appearance.bodyColor} /></mesh>
  </group>
})
