'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CircleAlert, Gauge, Navigation, Pause, Play, Rocket, Satellite, Zap } from 'lucide-react'
import type { MissionId, MissionProfile, MissionConfiguration, MissionEstimate, RocketAppearance, SpacecraftSize } from './mission-data'
import { getMission, getRocket } from './mission-data'
import type { LaunchPhaseResult, LaunchResult } from './mission-simulation'
import { useGameAudio } from './game-audio'
import { MissionLaunchMap } from './mission-launch-map'

export type FlightPhase = 'ready' | 'countdown' | 'boost' | 'turn' | 'separation' | 'orbit'
type ControlKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
type PhaseScore = { safeSamples: number; samples: number; turnError: number; turnSamples: number }
export type SharedControls = { heading: number; throttle: number; autopilot: boolean }

const SEGMENT_SECONDS = { boost: 6, turn: 6, separation: 5 }
const CONTROL_KEYS: ControlKey[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

function phaseGrade(points: number, combo: number, phase: LaunchPhaseResult['phase']): LaunchPhaseResult {
  const grade = points >= 78 ? 'Perfect' : points >= 52 ? 'Good' : 'Miss'
  return { phase, grade, combo: grade === 'Perfect' ? combo + 1 : 0, points: Math.round(points) }
}

function segmentName(phase: FlightPhase) {
  if (phase === 'boost') return 'THRUST PROFILE'
  if (phase === 'turn') return 'GRAVITY TURN'
  if (phase === 'separation') return 'STAGE SEPARATION'
  return 'FLIGHT CONTROL'
}

export function MissionLaunchGame({ mission, size, configuration, estimate, appearance, sandboxEnabled, smoothMode, launchChance, learningBonus, sharedControls, sharedControlsBy, playerId, onControlsChange, onComplete, onRevise, onNovaMessage }: {
  mission: MissionProfile
  size: SpacecraftSize
  configuration: MissionConfiguration
  estimate: MissionEstimate
  appearance: RocketAppearance
  sandboxEnabled: boolean
  smoothMode: boolean
  launchChance: number
  learningBonus: number
  sharedControls?: SharedControls
  sharedControlsBy?: string | null
  playerId?: string | null
  onControlsChange?: (controls: SharedControls) => void
  onComplete: (result: LaunchResult) => void
  onRevise: () => void
  onNovaMessage: (message: string) => void
}) {
  const { play, prepare } = useGameAudio()
  const [phase, setPhase] = useState<FlightPhase>('ready')
  const [countdown, setCountdown] = useState(5)
  const [elapsed, setElapsed] = useState(0)
  const [flightElapsedSeconds, setFlightElapsedSeconds] = useState(0)
  const [altitudeKm, setAltitudeKm] = useState(0)
  const [speedKmh, setSpeedKmh] = useState(0)
  const [heading, setHeading] = useState(0)
  const [throttle, setThrottle] = useState(76)
  const [autopilot, setAutopilot] = useState(true)
  const [phaseResults, setPhaseResults] = useState<LaunchPhaseResult[]>([])
  const [completedResult, setCompletedResult] = useState<LaunchResult | null>(null)
  const [notice, setNotice] = useState('')
  const phaseStartedAt = useRef(0)
  const flightElapsed = useRef(0)
  const keysHeld = useRef(new Set<ControlKey>())
  const phaseScore = useRef<PhaseScore>({ safeSamples: 0, samples: 0, turnError: 0, turnSamples: 0 })
  const resultsRef = useRef<LaunchPhaseResult[]>([])
  const comboRef = useRef(0)
  const stageSeparatedRef = useRef(false)
  const controlsRef = useRef<SharedControls>({ heading: 0, throttle: 76, autopilot: true })
  const finalResultRef = useRef<LaunchResult | null>(null)
  const rocket = useMemo(() => getRocket(configuration.rocketId), [configuration.rocketId])
  const payloadRatio = estimate.payloadMassKg / Math.max(1, rocket.payloadKg)
  const progress = phase === 'ready' ? 0 : phase === 'countdown' ? 0 : phase === 'boost' ? Math.min(.31, elapsed / SEGMENT_SECONDS.boost * .31) : phase === 'turn' ? .31 + Math.min(.31, elapsed / SEGMENT_SECONDS.turn * .31) : phase === 'separation' ? .62 + Math.min(.24, elapsed / SEGMENT_SECONDS.separation * .24) : 1
  const totalFlightSeconds = phase === 'countdown' || phase === 'ready' ? 0 : flightElapsedSeconds
  const remoteControls = sharedControls && playerId && sharedControlsBy && sharedControlsBy !== playerId && phase !== 'ready' && phase !== 'countdown' && phase !== 'orbit' ? sharedControls : null
  const shownHeading = remoteControls?.heading ?? heading
  const shownThrottle = remoteControls?.throttle ?? throttle
  const shownAutopilot = remoteControls?.autopilot ?? autopilot
  const stageLabel = phase === 'ready' ? 'PRE-FLIGHT BRIEFING' : phase === 'countdown' ? 'LAUNCH SEQUENCE' : phase === 'orbit' ? 'ORBIT ACHIEVED' : segmentName(phase)

  const sendControls = useCallback((next: SharedControls) => onControlsChange?.(next), [onControlsChange])
  const appendPhaseResult = useCallback((result: LaunchPhaseResult) => {
    comboRef.current = result.combo
    const updated = [...resultsRef.current, result]
    resultsRef.current = updated
    setPhaseResults(updated)
    return updated
  }, [])

  useEffect(() => {
    if (!sharedControls || !playerId || !sharedControlsBy || sharedControlsBy === playerId || phase === 'ready' || phase === 'countdown' || phase === 'orbit') return
    controlsRef.current = sharedControls
  }, [phase, playerId, sharedControls, sharedControlsBy])

  useEffect(() => {
    if (phase !== 'countdown') return
    const startedAt = performance.now()
    const timer = window.setInterval(() => {
      const seconds = (performance.now() - startedAt) / 1000
      const remaining = Math.max(0, 5 - Math.floor(seconds))
      setCountdown(remaining)
      if (seconds >= 5) {
        window.clearInterval(timer)
        flightElapsed.current = 0
        setFlightElapsedSeconds(0)
        phaseScore.current = { safeSamples: 0, samples: 0, turnError: 0, turnSamples: 0 }
        resultsRef.current = []
        comboRef.current = 0
        setPhaseResults([])
        setElapsed(0)
        setPhase('boost')
        play('engine')
        onNovaMessage('Keep the thrust near 86%, then steer right for the gravity turn. Arrow keys control the flight.')
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [onNovaMessage, phase, play])

  useEffect(() => {
    if (phase !== 'boost' && phase !== 'turn' && phase !== 'separation') return
    phaseStartedAt.current = performance.now()
    phaseScore.current = { safeSamples: 0, samples: 0, turnError: 0, turnSamples: 0 }
    const timer = window.setInterval(() => {
      const now = performance.now()
      const seconds = (now - phaseStartedAt.current) / 1000
      const delta = .1
      flightElapsed.current += delta
      setFlightElapsedSeconds(flightElapsed.current)
      setElapsed(Math.min(seconds, SEGMENT_SECONDS[phase]))
      const held = keysHeld.current
      const currentControls = controlsRef.current
      let nextThrottle = currentControls.throttle
      let nextHeading = currentControls.heading

      if (currentControls.autopilot) {
        nextThrottle = phase === 'boost' ? 86 : phase === 'turn' ? 78 : 42
        nextHeading = phase === 'turn' || phase === 'separation' ? 10 : 0
        if (phase === 'separation' && seconds >= 1.4) stageSeparatedRef.current = true
      } else {
        if (held.has('ArrowUp')) nextThrottle += 2.4
        if (held.has('ArrowDown')) nextThrottle -= 2.4
        if (held.has('ArrowLeft')) nextHeading -= 1.35
        if (held.has('ArrowRight')) nextHeading += 1.35
      }

      nextThrottle = Math.max(0, Math.min(100, nextThrottle))
      nextHeading = Math.max(-35, Math.min(35, nextHeading))
      controlsRef.current = { heading: nextHeading, throttle: nextThrottle, autopilot: currentControls.autopilot }
      setThrottle(nextThrottle)
      setHeading(nextHeading)
      setSpeedKmh(Math.round(520 + flightElapsed.current * 810 + nextThrottle * 9))
      setAltitudeKm(Math.round(flightElapsed.current * flightElapsed.current * 13.2))
      sendControls(controlsRef.current)

      if (phase === 'boost') {
        phaseScore.current.samples += 1
        if (Math.abs(nextThrottle - 86) <= 10) phaseScore.current.safeSamples += 1
      }
      if (phase === 'turn') {
        phaseScore.current.turnSamples += 1
        phaseScore.current.turnError += Math.abs(nextHeading - 10)
      }

      if (phase === 'boost' && seconds >= SEGMENT_SECONDS.boost) {
        const ratio = phaseScore.current.samples ? phaseScore.current.safeSamples / phaseScore.current.samples : 0
        appendPhaseResult(phaseGrade(ratio * 100, comboRef.current, 'throttle'))
        setPhase('turn')
        onNovaMessage('Gravity turn: ease the rocket onto a 10° heading. Use ← and → to steer.')
      } else if (phase === 'turn' && seconds >= SEGMENT_SECONDS.turn) {
        const averageError = phaseScore.current.turnSamples ? phaseScore.current.turnError / phaseScore.current.turnSamples : 45
        appendPhaseResult(phaseGrade(Math.max(0, 100 - averageError * 5), comboRef.current, 'gravity-turn'))
        setPhase('separation')
        stageSeparatedRef.current = false
        play('radio')
        onNovaMessage('Stage separation window is open. Press ↓ when the fairing and booster markers align.')
      } else if (phase === 'separation' && seconds >= SEGMENT_SECONDS.separation) {
        const separationResult = phaseGrade(stageSeparatedRef.current ? 100 : 22, comboRef.current, 'separation')
        const results = appendPhaseResult(separationResult)
        const score = Math.round(results.reduce((total, result) => total + result.points, 0) / Math.max(1, results.length))
        const roll = Math.floor(Math.random() * 100) + 1
        const designLimit = !sandboxEnabled && payloadRatio > 1
        const success = !designLimit && score >= 60 && roll <= launchChance
        const failedPhase = results.find((result) => result.grade === 'Miss')
        const orbitAccuracy = results.find((result) => result.phase === 'gravity-turn')?.points ?? 0
        const failureType: LaunchResult['failureType'] = designLimit
          ? 'design-limit'
          : failedPhase?.phase === 'throttle' ? 'engine-shutdown'
            : failedPhase?.phase === 'gravity-turn' ? 'bad-guidance'
              : failedPhase?.phase === 'separation' ? 'fairing-issue'
                : 'engine-shutdown'
        const result: LaunchResult = {
          success,
          ...(success ? {} : { failureType, failureReason: designLimit
            ? `${rocket.name} cannot carry this ${size.name} payload to orbit.`
            : failedPhase?.phase === 'throttle' ? 'Thrust dipped outside the safe band for too long.'
              : failedPhase?.phase === 'gravity-turn' ? 'The gravity turn missed the planned orbital corridor.'
                : failedPhase?.phase === 'separation' ? 'The stage did not separate inside the safe window.'
                  : 'The vehicle did not reach orbit on this launch attempt.' }),
          chancePercent: launchChance,
          roll,
          learningBonus,
          phases: results,
          combo: results.reduce((best, item) => Math.max(best, item.combo), 0),
          score,
          orbitAccuracy: Math.max(0, Math.min(100, orbitAccuracy)),
          fuelMargin: Math.max(0, Math.min(100, Math.round(100 - nextThrottle * .55 - payloadRatio * 26))),
          lifetimeMultiplier: 1 + Math.max(0, Math.min(.5, score / 200)),
        }
        finalResultRef.current = result
        setCompletedResult(result)
        setPhase('orbit')
        play(success ? 'success' : 'alert')
        onNovaMessage(success ? 'We made it! The spacecraft is on course. Take a look at the destination.' : 'Launch complete. Review the flight notes to see what the crew can improve.')
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [appendPhaseResult, launchChance, learningBonus, onNovaMessage, payloadRatio, phase, play, rocket.name, sandboxEnabled, sendControls, size.name])

  useEffect(() => {
    if (phase !== 'orbit') return
    const timer = window.setTimeout(() => {
      if (finalResultRef.current) onComplete(finalResultRef.current)
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [onComplete, phase])

  useEffect(() => {
    if (phase === 'ready' || phase === 'countdown' || phase === 'orbit') return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!CONTROL_KEYS.includes(event.key as ControlKey)) return
      const target = event.target
      if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return
      event.preventDefault()
      keysHeld.current.add(event.key as ControlKey)
      if (phase === 'separation' && event.key === 'ArrowDown' && !event.repeat) {
        stageSeparatedRef.current = true
        play('separation')
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => keysHeld.current.delete(event.key as ControlKey)
    const clearHeldKeys = () => keysHeld.current.clear()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearHeldKeys)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearHeldKeys)
    }
  }, [phase, play])

  function adjustHeading(delta: number) {
    const nextControls = { ...controlsRef.current, heading: Math.max(-35, Math.min(35, controlsRef.current.heading + delta)) }
    controlsRef.current = nextControls
    setHeading(nextControls.heading)
    sendControls(nextControls)
  }

  function adjustThrottle(delta: number) {
    const nextControls = { ...controlsRef.current, throttle: Math.max(0, Math.min(100, controlsRef.current.throttle + delta)) }
    controlsRef.current = nextControls
    setThrottle(nextControls.throttle)
    sendControls(nextControls)
  }

  function beginCountdown() {
    void prepare()
    setCountdown(5)
    setNotice('')
    setCompletedResult(null)
    finalResultRef.current = null
    stageSeparatedRef.current = false
    setPhase('countdown')
    play('countdown')
  }

  function setAutopilotMode(enabled: boolean) {
    const nextControls = { ...controlsRef.current, autopilot: enabled }
    controlsRef.current = nextControls
    setAutopilot(enabled)
    sendControls(nextControls)
  }

  const destination = getMission(mission.id as MissionId)
  const currentPhaseTime = phase === 'boost' || phase === 'turn' || phase === 'separation' ? elapsed : 0
  const phaseDuration = phase === 'boost' ? SEGMENT_SECONDS.boost : phase === 'turn' ? SEGMENT_SECONDS.turn : phase === 'separation' ? SEGMENT_SECONDS.separation : 1
  const loadText = payloadRatio > 1 ? 'OVER VEHICLE LIMIT' : payloadRatio > .8 ? 'HEAVY PAYLOAD' : 'FLIGHT MASS NOMINAL'
  const phasePrompt = phase === 'boost' ? 'Hold thrust between 76% and 96%.' : phase === 'turn' ? 'Steer right to a 10° heading.' : phase === 'separation' ? 'Press ↓ to separate the stage.' : 'Flight computers are ready.'

  return <main className={`launch-screen launch-control-screen ${smoothMode ? 'launch-smooth-mode' : ''}`} style={{ '--launch-accent': appearance.flameColor } as CSSProperties}>
    <header className="launch-console-top launch-control-header">
      <span><i className="console-live" /> FLIGHT CONTROL <span className="launch-header-divider">/</span> {mission.shortName}</span>
      <span className="launch-game-vehicle"><Rocket aria-hidden="true" /> {rocket.name} <span className="console-square" /> {size.name}</span>
      <label className="launch-autopilot-control"><span>Auto pilot</span><input type="checkbox" checked={shownAutopilot} disabled={phase === 'ready' || phase === 'countdown' || phase === 'orbit'} onChange={(event) => setAutopilotMode(event.currentTarget.checked)} /><span className="sr-only">Enable autopilot during launch</span></label>
    </header>

    <div className="launch-control-heading">
      <div><span className="launch-control-kicker">MISSION CONTROL · LAUNCH 01</span><h1>{phase === 'orbit' ? completedResult?.success ? 'Orbit achieved.' : 'Flight concluded.' : phase === 'ready' ? 'Ready for launch?' : phase === 'countdown' ? 'Clear the launch pad.' : 'Fly the trajectory.'}</h1><p>{phase === 'ready' ? `Guide ${rocket.name} from Kennedy Space Center to ${destination.name}.` : phase === 'countdown' ? 'The crew is checking propulsion, guidance and separation systems.' : phase === 'orbit' ? completedResult?.success ? 'Your spacecraft is on course. NASA destination images are next.' : 'The flight data is ready for your crew review.' : phasePrompt}</p></div>
      {phase === 'ready' ? <button type="button" className="launch-start-button" onClick={beginCountdown}><Play aria-hidden="true" /> Start countdown</button> : phase === 'orbit' ? <span className={`launch-flight-status ${completedResult?.success ? 'launch-status-good' : 'launch-status-review'}`}><Check aria-hidden="true" /> {completedResult?.success ? 'SUCCESS' : 'REVIEW FLIGHT'}</span> : <span className="launch-flight-status"><i className="console-live" /> {stageLabel}</span>}
    </div>

    <div className="launch-control-layout">
      <section className="launch-map-stage" aria-label="Rocket trajectory and flight path">
        <MissionLaunchMap missionId={mission.id} phase={phase} progress={progress} altitudeKm={altitudeKm} heading={shownHeading} />
        <div className="launch-stage-strip" aria-label="Launch phases">
          {(['boost', 'turn', 'separation'] as const).map((segment, index) => {
            const currentIndex = phase === 'ready' || phase === 'countdown' ? -1 : phase === 'boost' ? 0 : phase === 'turn' ? 1 : phase === 'separation' ? 2 : 3
            return <div className={index < currentIndex ? 'launch-stage-done' : index === currentIndex ? 'launch-stage-current' : ''} key={segment}><span>{index < currentIndex ? <Check aria-hidden="true" /> : `0${index + 1}`}</span><small>{segment === 'boost' ? 'ASCENT' : segment === 'turn' ? 'TURN' : 'SEPARATION'}</small></div>
          })}
        </div>
        <div className="launch-flight-metrics" aria-live="polite">
          <div><span>ALTITUDE</span><strong>{altitudeKm.toLocaleString()} <small>km</small></strong></div>
          <div><span>VELOCITY</span><strong>{speedKmh.toLocaleString()} <small>km/h</small></strong></div>
          <div><span>FLIGHT TIME</span><strong>T+{String(Math.floor(totalFlightSeconds)).padStart(2, '0')}s</strong></div>
        </div>
        <p className="launch-load-readout"><Satellite aria-hidden="true" /><span>{loadText}</span><b>{Math.round(payloadRatio * 100)}% VEHICLE CAPACITY</b></p>
      </section>

      <section className="launch-control-console" aria-label="Flight controls and launch progress">
        <div className="launch-console-panel">
          <div className="launch-phase-heading"><span className="launch-phase-index">{phase === 'boost' ? '01' : phase === 'turn' ? '02' : phase === 'separation' ? '03' : '00'}</span><div><span className="launch-control-kicker">{phase === 'ready' || phase === 'countdown' || phase === 'orbit' ? 'FLIGHT SYSTEMS' : segmentName(phase)}</span><h2>{phase === 'ready' ? 'Mission profile' : phase === 'countdown' ? `T−${countdown}` : phase === 'orbit' ? completedResult?.success ? 'Orbit insertion confirmed' : 'Flight review' : phase === 'boost' ? 'Manage the thrust' : phase === 'turn' ? 'Set the heading' : 'Separate the stage'}</h2></div></div>
          {phase === 'ready' ? <p className="launch-console-copy">Launch chance <b>{launchChance}%</b>. Keep the rocket inside the dotted corridor and follow each flight cue.</p> : phase === 'countdown' ? <p className="launch-console-copy">T−{countdown} seconds · {countdown === 0 ? 'Ignition.' : 'Propulsion and flight computers are green.'}</p> : phase === 'orbit' ? <p className="launch-console-copy">{completedResult?.success ? `Flight score ${completedResult.score}/100 · orbit accuracy ${completedResult.orbitAccuracy}%.` : completedResult?.failureReason}</p> : <p className="launch-console-copy">{phasePrompt}</p>}
          <div className="launch-phase-progress" role="progressbar" aria-label="Current flight phase progress" aria-valuenow={phase === 'ready' || phase === 'countdown' || phase === 'orbit' ? 0 : Math.round(currentPhaseTime / phaseDuration * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${phase === 'ready' || phase === 'countdown' || phase === 'orbit' ? 0 : Math.min(100, currentPhaseTime / phaseDuration * 100)}%` }} /></div>
          <div className="launch-control-readouts">
            <div><span><Gauge aria-hidden="true" /> THROTTLE</span><strong>{Math.round(shownThrottle)}<small>%</small></strong><div className="launch-readout-track"><i style={{ width: `${shownThrottle}%` }} /></div></div>
            <div><span><Navigation aria-hidden="true" /> HEADING</span><strong>{shownHeading >= 0 ? '+' : ''}{Math.round(shownHeading)}<small>°</small></strong><div className="launch-readout-track"><i style={{ width: `${Math.max(0, Math.min(100, (shownHeading + 35) / 70 * 100))}%` }} /></div></div>
          </div>
          {phaseResults.length > 0 && <div className="launch-phase-scores" aria-label="Completed flight segment scores">{phaseResults.map((result) => <span key={result.phase} className={result.grade === 'Miss' ? 'phase-score-miss' : ''}><Check aria-hidden="true" /> {result.phase === 'gravity-turn' ? 'TURN' : result.phase.toUpperCase()} <b>{result.grade}</b></span>)}</div>}
          <div className="launch-key-guide"><span><kbd>↑</kbd><kbd>↓</kbd> Throttle</span><span><kbd>←</kbd><kbd>→</kbd> Steer</span>{phase === 'separation' && <span><kbd>↓</kbd> Separate stage</span>}</div>
          <div className="launch-control-dpad" aria-label="Touch flight controls">
            <button type="button" onClick={() => adjustHeading(-5) } disabled={shownAutopilot || !['boost', 'turn', 'separation'].includes(phase)} aria-label="Steer left"><ArrowLeft aria-hidden="true" /></button>
            <div><button type="button" onClick={() => adjustThrottle(8) } disabled={shownAutopilot || !['boost', 'turn'].includes(phase)} aria-label="Increase throttle"><ArrowUp aria-hidden="true" /></button><button type="button" onClick={() => {
              if (phase === 'separation') {
                stageSeparatedRef.current = true
                play('separation')
              } else adjustThrottle(-8)
            }} disabled={shownAutopilot || !['boost', 'turn', 'separation'].includes(phase)} aria-label={phase === 'separation' ? 'Separate rocket stage' : 'Decrease throttle'}><ArrowDown aria-hidden="true" /></button></div>
            <button type="button" onClick={() => adjustHeading(5) } disabled={shownAutopilot || !['boost', 'turn', 'separation'].includes(phase)} aria-label="Steer right"><ArrowRight aria-hidden="true" /></button>
          </div>
          {phase === 'ready' && <div className="launch-ready-actions"><button type="button" className="launch-revise-button" onClick={onRevise}>Revise the rocket</button><span><Zap aria-hidden="true" /> {learningBonus ? `+${learningBonus}% retry bonus` : 'Autopilot is ready'}</span></div>}
          {phase === 'orbit' && <div className="launch-phase-feedback" role="status"><strong>{completedResult?.success ? 'FLIGHT COMPLETE' : 'MISSION LOG'}</strong><span>{completedResult?.success ? 'NASA destination imagery is loading below.' : 'Your crew can review the flight and try again.'}</span></div>}
        </div>
        <div className="launch-console-footer"><span><CircleAlert aria-hidden="true" /> CONTROL SYSTEMS</span><span>{phase === 'ready' || phase === 'countdown' ? 'GUIDANCE · PROPULSION · STAGING' : autopilot ? 'AUTOPILOT ENGAGED' : 'MANUAL CONTROL'}</span></div>
      </section>
    </div>
    <p className="launch-control-note"><Pause aria-hidden="true" /> Arrow keys work anywhere on the page during flight. Switch autopilot on or off at any time.</p>
    <span className="sr-only" aria-live="polite">{notice}</span>
  </main>
}
