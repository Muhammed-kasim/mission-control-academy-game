'use client'

import { ArrowDown, Globe2, MapPinned, Rocket } from 'lucide-react'
import type { MissionId } from './mission-data'

type FlightPhase = 'ready' | 'countdown' | 'boost' | 'turn' | 'separation' | 'orbit'

const DESTINATIONS: Record<MissionId, { label: string; orbit: string; x: number; y: number; accent: string }> = {
  earth: { label: 'EARTH ORBIT', orbit: 'SUN-SYNCHRONOUS', x: 698, y: 116, accent: '#74dfc9' },
  moon: { label: 'LUNAR ORBIT', orbit: 'MOON TRANSFER', x: 698, y: 116, accent: '#d6e0e7' },
  mars: { label: 'MARS ORBIT', orbit: 'INTERPLANETARY', x: 698, y: 116, accent: '#f0a281' },
}

const PHASE_LABELS: Record<FlightPhase, string> = {
  ready: 'PAD CHECKS',
  countdown: 'COUNTDOWN',
  boost: 'POWERED ASCENT',
  turn: 'GRAVITY TURN',
  separation: 'STAGE SEPARATION',
  orbit: 'ORBIT INSERTION',
}

export function MissionLaunchMap({ missionId, phase, progress, altitudeKm, heading }: {
  missionId: MissionId
  phase: FlightPhase
  progress: number
  altitudeKm: number
  heading: number
}) {
  const destination = DESTINATIONS[missionId]
  const x = 90 + progress * 560
  const y = 342 - progress * 220 + Math.sin(progress * Math.PI) * -42
  const routeEnd = `M 90 342 C 250 332, 305 104, 498 132 S 625 147, ${destination.x} ${destination.y}`
  const routeProgress = `M 90 342 C 250 332, 305 104, 498 132 S ${Math.min(x, 625)} ${Math.min(y, 145)}, ${x} ${y}`

  return <section className="launch-trajectory-map launch-control-map" aria-labelledby="launch-map-title">
    <div className="launch-map-heading">
      <span id="launch-map-title"><MapPinned aria-hidden="true" /> FLIGHT PATH</span>
      <strong>{destination.orbit}</strong>
    </div>
    <div className="launch-map-display">
      <svg viewBox="0 0 800 420" role="img" aria-label={`Trajectory map from Kennedy Space Center to ${destination.label.toLowerCase()}`}>
        <defs>
          <linearGradient id="flight-route" x1="0" x2="1">
            <stop offset="0%" stopColor="#72dfc9" stopOpacity=".18" />
            <stop offset="100%" stopColor={destination.accent} stopOpacity=".85" />
          </linearGradient>
          <radialGradient id="map-glow"><stop stopColor="#73ddca" stopOpacity=".18" /><stop offset="1" stopColor="#73ddca" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="88" cy="342" rx="170" ry="112" fill="url(#map-glow)" />
        <g className="launch-map-grid">
          <path d="M0 92H800M0 182H800M0 272H800M155 0V420M320 0V420M485 0V420M650 0V420" />
          <path d="M0 382L800 38M0 292L800 128M0 202L800 218M0 112L800 308" opacity=".45" />
        </g>
        <path d={routeEnd} fill="none" stroke="rgba(151,178,189,.32)" strokeDasharray="8 9" strokeWidth="3" />
        {progress > 0 && <path d={routeProgress} fill="none" stroke="url(#flight-route)" strokeWidth="5" strokeLinecap="round" />}
        <circle className="launch-map-home" cx="90" cy="342" r="10" />
        <circle className="launch-map-destination" cx={destination.x} cy={destination.y} r="12" />
        <circle cx={destination.x} cy={destination.y} r="36" fill="none" stroke={destination.accent} strokeOpacity=".25" strokeWidth="2" />
        <text x="32" y="384" className="launch-map-label">KSC · EARTH</text>
        <text x="562" y="78" className="launch-map-label">{destination.label}</text>
        <text x="554" y="98" className="launch-map-label launch-map-sub-label">TARGET · {destination.orbit}</text>
      </svg>
      <span className="launch-map-rocket" style={{ left: `${11 + progress * 70}%`, top: `${81 - progress * 54}%`, transform: `rotate(${heading}deg)` }}><Rocket aria-hidden="true" /></span>
      <span className="launch-map-home-label"><Globe2 aria-hidden="true" /> KENNEDY SPACE CENTER</span>
      <span className="launch-map-destination-label">{destination.label}</span>
    </div>
    <div className="launch-map-status"><span>{PHASE_LABELS[phase]}</span><span><ArrowDown aria-hidden="true" /> {Math.max(0, altitudeKm).toLocaleString()} KM ALTITUDE</span></div>
  </section>
}
