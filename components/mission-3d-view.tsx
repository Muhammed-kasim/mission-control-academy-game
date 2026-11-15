'use client'

import dynamic from 'next/dynamic'
import { Suspense, useEffect, useSyncExternalStore } from 'react'
import { getRocket, type MissionConfiguration, type RocketAppearance, type SpacecraftSize } from './mission-data'
import type { MissionProgression, RocketPaintId } from './mission-progression'
import { MissionSpacecraftDiagram } from './mission-spacecraft-diagram'
import { Rocket } from './Rocket'
import { MissionCanvasErrorBoundary } from './mission-canvas-error-boundary'

const SpacecraftCanvas = dynamic(() => import('./mission-3d-canvas').then((module) => module.SpacecraftCanvas), { ssr: false })
const RocketCanvas = dynamic(() => import('./mission-3d-canvas').then((module) => module.RocketCanvas), { ssr: false })

const webGLListeners = new Set<() => void>()
let webGLAvailableSnapshot: boolean | null = null

function getWebGLSnapshot() {
  return webGLAvailableSnapshot
}

function subscribeToWebGLAvailability(listener: () => void) {
  webGLListeners.add(listener)
  return () => { webGLListeners.delete(listener) }
}

function useWebGLAvailable(enabled: boolean) {
  const available = useSyncExternalStore(subscribeToWebGLAvailability, getWebGLSnapshot, () => null)

  useEffect(() => {
    if (!enabled || webGLAvailableSnapshot !== null) return
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      context?.getExtension('WEBGL_lose_context')?.loseContext()
      webGLAvailableSnapshot = Boolean(context)
    } catch (error) {
      console.warn('Could not check WebGL availability.', error)
      webGLAvailableSnapshot = false
    }
    for (const listener of webGLListeners) listener()
  }, [enabled])

  return enabled ? available : null
}

export function MissionSpacecraft3D({ configuration, size, threeDEnabled, onThreeDChange }: { configuration: MissionConfiguration; size: SpacecraftSize; threeDEnabled: boolean; onThreeDChange: (enabled: boolean) => void }) {
  const webGLAvailable = useWebGLAvailable(threeDEnabled)
  return <section className="design-3d-card spacecraft-3d-card" aria-label="Interactive spacecraft preview">
    <div className="design-3d-heading"><span><span className="eyebrow">OUR SHIP</span><h2>Look at our ship!</h2></span><button type="button" className="three-d-toggle" aria-pressed={threeDEnabled} onClick={() => onThreeDChange(!threeDEnabled)}>3D view {threeDEnabled ? 'On' : 'Off'}</button></div>
    {threeDEnabled && webGLAvailable
      ? <MissionCanvasErrorBoundary resetKey={JSON.stringify([configuration, size.id])} fallback={<MissionSpacecraftDiagram configuration={configuration} size={size} />}><Suspense fallback={<MissionSpacecraftDiagram configuration={configuration} size={size} />}><SpacecraftCanvas configuration={configuration} size={size} /></Suspense></MissionCanvasErrorBoundary>
      : <MissionSpacecraftDiagram configuration={configuration} size={size} />}
  </section>
}

export function MissionRocketCustomizer({ configuration, appearance, onAppearanceChange, unlockedPaints, unlockedMissionPatches, threeDEnabled }: {
  configuration: MissionConfiguration
  appearance: RocketAppearance
  onAppearanceChange: (patch: Partial<RocketAppearance>) => void
  unlockedPaints: MissionProgression['unlockedPaints']
  unlockedMissionPatches: MissionProgression['unlockedMissionPatches']
  threeDEnabled: boolean
}) {
  const webGLAvailable = useWebGLAvailable(threeDEnabled)
  const patchOptions: { id: RocketAppearance['missionPatch']; label: string }[] = [
    { id: 'earth', label: 'Earth' },
    { id: 'moon', label: 'Moon' },
    { id: 'mars', label: 'Mars' },
    { id: 'comet', label: 'Comet' },
    { id: 'jupiter', label: 'Jupiter' },
  ]
  return <section className="rocket-customizer" aria-label="Rocket appearance customizer">
    <div className="design-3d-heading"><span><span className="eyebrow">PICK A ROCKET</span><h2>Make it yours!</h2></span><span className="view-3d-hint">{threeDEnabled && webGLAvailable ? '3D VIEW' : '2D VIEW'}</span></div>
    {threeDEnabled && webGLAvailable
      ? <MissionCanvasErrorBoundary resetKey={JSON.stringify([configuration.rocketId, appearance])} fallback={<RocketPreviewFallback rocketId={configuration.rocketId} appearance={appearance} />}><Suspense fallback={<RocketPreviewFallback rocketId={configuration.rocketId} appearance={appearance} />}><RocketCanvas configuration={configuration} appearance={appearance} /></Suspense></MissionCanvasErrorBoundary>
      : <RocketPreviewFallback rocketId={configuration.rocketId} appearance={appearance} />}
    <div className="rocket-paint-unlocks" aria-label="Score-unlocked rocket paint schemes">
      {([
        { id: 'arctic', label: 'ARCTIC', colors: { bodyColor: '#d9f3ff', stripeColor: '#7189ff', flameColor: '#b2f6ff' } },
        { id: 'solar', label: 'SOLAR GOLD', colors: { bodyColor: '#ffd36e', stripeColor: '#f27842', flameColor: '#ffe193' } },
      ] satisfies { id: RocketPaintId; label: string; colors: Partial<RocketAppearance> }[]).map((paint, index) => {
        const unlocked = unlockedPaints.includes(paint.id)
        return <button type="button" className="rocket-paint-unlock" key={paint.id} disabled={!unlocked} onClick={() => onAppearanceChange(paint.colors)}>{paint.label}<small>{unlocked ? 'UNLOCKED · APPLY' : `LOCKED · ${index === 0 ? '2' : '3'} STARS`}</small></button>
      })}
    </div>
    <div className="rocket-appearance-controls">
      <label className="rocket-color-control"><span>BODY COLOR</span><input type="color" value={appearance.bodyColor} onChange={(event) => onAppearanceChange({ bodyColor: event.currentTarget.value })} /></label>
      <label className="rocket-color-control"><span>STRIPE COLOR</span><input type="color" value={appearance.stripeColor} onChange={(event) => onAppearanceChange({ stripeColor: event.currentTarget.value })} /></label>
      <label className="rocket-select-control"><span>NOSE SHAPE</span><select value={appearance.noseShape} onChange={(event) => onAppearanceChange({ noseShape: event.currentTarget.value as RocketAppearance['noseShape'] })}><option value="point">Pointed</option><option value="rounded">Rounded</option><option value="flat">Flat</option></select></label>
      <label className="rocket-select-control"><span>FIN STYLE</span><select value={appearance.finStyle} onChange={(event) => onAppearanceChange({ finStyle: event.currentTarget.value as RocketAppearance['finStyle'] })}><option value="classic">Classic</option><option value="swept">Swept</option><option value="compact">Compact</option></select></label>
      <label className="rocket-color-control"><span>FLAME COLOR</span><input type="color" value={appearance.flameColor} onChange={(event) => onAppearanceChange({ flameColor: event.currentTarget.value })} /></label>
      <label className="rocket-select-control"><span>MISSION PATCH</span><select value={appearance.missionPatch} onChange={(event) => onAppearanceChange({ missionPatch: event.currentTarget.value as RocketAppearance['missionPatch'] })}>{patchOptions.map((option) => <option value={option.id} key={option.id} disabled={!unlockedMissionPatches.includes(option.id)}>{option.label}{unlockedMissionPatches.includes(option.id) ? '' : ' · Locked'}</option>)}</select></label>
    </div>
  </section>
}

function RocketPreviewFallback({ rocketId, appearance }: { rocketId: string; appearance: RocketAppearance }) {
  const rocket = getRocket(rocketId)
  return <div className="rocket-preview-fallback"><Rocket id={rocket.id} body={appearance.bodyColor} stripe={appearance.stripeColor} flame={false} height={190} /><span>{rocket.name} · 2D preview</span></div>
}
