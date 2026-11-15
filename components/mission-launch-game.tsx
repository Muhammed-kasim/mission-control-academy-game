'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent, type RefObject } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CircleAlert, Flame, Gauge, Globe2, Orbit, Rocket as RocketIcon, ShieldAlert, Sparkles, Target } from 'lucide-react'
import type { MissionConfiguration, MissionEstimate, MissionId, MissionProfile, RocketAppearance, SpacecraftSize } from './mission-data'
import { getOrbit, getRocket } from './mission-data'
import type { LaunchPhaseName, LaunchPhaseResult, LaunchResult } from './mission-simulation'
import { PrimaryButton } from './mission-ui'
import { useGameAudio } from './game-audio'
import { CrewRadio, type RadioSpeaker } from './game-companions'
import { Rocket } from './Rocket'
import { useLaunchEngine, type LaunchEngineElements, type LaunchQuality, type LaunchEngineOptions } from './use-launch-engine'

type LaunchPhase = 'ready' | 'risk-roll' | 'throttle' | 'turn' | 'separation' | 'result' | 'failure'
type Grade = LaunchPhaseResult['grade']

const PHASE_LABELS: Record<LaunchPhaseName, string> = {
  throttle: 'THROTTLE · MAX-Q',
  'gravity-turn': 'GRAVITY TURN',
  separation: 'STAGE SEPARATION',
}
const PHASE_SECONDS: Record<'throttle' | 'turn' | 'separation', number> = {
  throttle: 5,
  turn: 6,
  separation: 4,
}
const GRADE_POINTS: Record<Grade, number> = { Perfect: 100, Good: 68, Miss: 18 }

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function angleDistance(a: number, b: number) {
  return Math.abs(((a - b + 540) % 360) - 180)
}

function getFlightBlockReason(mission: MissionProfile, configuration: MissionConfiguration, estimate: MissionEstimate, size: SpacecraftSize) {
  const rocket = getRocket(configuration.rocketId)
  const orbit = getOrbit(configuration.orbitId)
  const reasons: string[] = []
  if (rocket.id === 'rideshare' && size.family !== 'cubesat') reasons.push('Rideshare is restricted to CubeSat payloads; this spacecraft is a larger satellite.')
  if (estimate.payloadMassKg > rocket.payloadKg) reasons.push(`The ${Math.round(estimate.payloadMassKg)} kg spacecraft exceeds the ${rocket.name} payload limit of ${rocket.payloadKg.toLocaleString()} kg.`)
  if (estimate.spacecraftMassKg > size.massLimitKg) reasons.push(`The ${Math.round(estimate.spacecraftMassKg)} kg spacecraft exceeds its ${size.massLimitKg.toLocaleString()} kg size limit.`)
  if (!rocket.orbitIds.some((orbitId) => orbitId === orbit.id)) reasons.push(`${rocket.name} cannot reach ${orbit.name}; select a vehicle rated for this destination.`)
  if (orbit.id !== mission.targetOrbit) reasons.push(`${orbit.name} does not reach this mission's target orbit; choose ${getOrbit(mission.targetOrbit).name}.`)
  return reasons.length ? reasons.join(' ') : ''
}

export const MissionLaunchGame = memo(function MissionLaunchGame({ mission, size, configuration, estimate, appearance, sandboxEnabled, smoothMode, launchChance: suppliedLaunchChance, learningBonus, onComplete, onRevise, onNovaMessage }: {
  mission: MissionProfile
  size: SpacecraftSize
  configuration: MissionConfiguration
  estimate: MissionEstimate
  appearance: RocketAppearance
  sandboxEnabled: boolean
  smoothMode: boolean
  launchChance: number
  learningBonus: number
  onComplete: (result: LaunchResult) => void
  onRevise: () => void
  onNovaMessage: (message: string) => void
}) {
  const { play, prepare, engine } = useGameAudio()
  const rocket = getRocket(configuration.rocketId)
  const orbit = getOrbit(configuration.orbitId)
  const blockReason = useMemo(() => sandboxEnabled ? '' : getFlightBlockReason(mission, configuration, estimate, size), [mission, configuration, estimate, size, sandboxEnabled])
  const payloadRatio = sandboxEnabled ? 0 : estimate.payloadMassKg / Math.max(1, rocket.payloadKg)
  const response = clamp(1 - payloadRatio * 0.55, 0.42, 1)
  const safeHalfWidth = clamp(18 - payloadRatio * 9, 7, 18)
  const [phase, setPhase] = useState<LaunchPhase>(blockReason ? 'failure' : 'ready')
  const [phaseDone, setPhaseDone] = useState(Boolean(blockReason))
  const [lastResult, setLastResult] = useState<LaunchPhaseResult | null>(null)
  const [combo, setCombo] = useState(0)
  const [outcome, setOutcome] = useState<LaunchResult | null>(blockReason ? {
    success: false,
    failureReason: blockReason,
    failureType: 'design-limit',
    chancePercent: 0,
    phases: [],
    combo: 0,
    score: 0,
    orbitAccuracy: 0,
    fuelMargin: 0,
    lifetimeMultiplier: 0.5,
  } : null)
  const holdingRef = useRef(false)
  const steerRef = useRef(0)
  const throttleRef = useRef(42)
  const headingRef = useRef(0)
  const separationAngleRef = useRef(0)
  const throttleNeedleRef = useRef<HTMLElement>(null)
  const throttleTargetRef = useRef<HTMLElement>(null)
  const throttleValueRef = useRef<HTMLElement>(null)
  const targetThrottleValueRef = useRef<HTMLElement>(null)
  const throttleGaugeRef = useRef<HTMLDivElement>(null)
  const headingValueRef = useRef<HTMLElement>(null)
  const headingTargetValueRef = useRef<HTMLElement>(null)
  const separationPointerRef = useRef<HTMLElement>(null)
  const timerTextRef = useRef<HTMLElement>(null)
  const separationTimerRef = useRef<HTMLElement>(null)
  const radioMessageRef = useRef<HTMLSpanElement>(null)
  const rollOutcomeRef = useRef<HTMLParagraphElement>(null)
  const holdControlRef = useRef<HTMLButtonElement>(null)
  const riskTimerRef = useRef<number | null>(null)
  const phaseResultsRef = useRef<LaunchPhaseResult[]>([])
  const safeSamplesRef = useRef({ safe: 0, total: 0, stress: 0 })
  const turnSamplesRef = useRef({ error: 0, total: 0 })
  const comboRef = useRef(0)
  const phaseRef = useRef(phase)
  const doneRef = useRef(phaseDone)
  const [quality, setQuality] = useState<LaunchQuality>('auto')
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false)
  const [qualityLoaded, setQualityLoaded] = useState(false)
  const [showFps, setShowFps] = useState(false)
  const [soundsReady, setSoundsReady] = useState(false)

  const targetStageAngle = 214
  const safeZoneLow = Math.max(0, 58 - safeHalfWidth)
  const actualLaunchChance = sandboxEnabled ? 99 : suppliedLaunchChance

  useEffect(() => {
    try {
      const savedQuality = window.localStorage.getItem('mission-control-launch-quality-v1')
      if (savedQuality === 'auto' || savedQuality === 'high' || savedQuality === 'low') setQuality(savedQuality)
    } catch (error) {
      console.warn('Could not load the saved launch quality.', error)
    }
    setQualityLoaded(true)
  }, [])

  useEffect(() => {
    if (!qualityLoaded) return
    try {
      window.localStorage.setItem('mission-control-launch-quality-v1', quality)
    } catch (error) {
      console.warn('Could not save the launch quality.', error)
    }
  }, [quality, qualityLoaded])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    let active = true
    void prepare().then(() => {
      if (active) setSoundsReady(true)
    })
    return () => { active = false }
  }, [prepare])

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'f' || event.repeat) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      setShowFps((visible) => !visible)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const updatePhase = useCallback((nextPhase: LaunchPhase) => {
    phaseRef.current = nextPhase
    setPhase(nextPhase)
  }, [])

  const registerPhaseResult = useCallback((name: LaunchPhaseName, grade: Grade) => {
    if (doneRef.current) return
    doneRef.current = true
    setPhaseDone(true)
    const nextCombo = grade === 'Miss' ? 0 : comboRef.current + 1
    const result = { phase: name, grade, combo: nextCombo, points: GRADE_POINTS[grade] + Math.min(10, nextCombo * 2) }
    const nextResults = [...phaseResultsRef.current, result]
    comboRef.current = nextCombo
    phaseResultsRef.current = nextResults
    setLastResult(result)
    setCombo(nextCombo)
  }, [])

  const finishThrottle = useCallback(() => {
    const sample = safeSamplesRef.current
    const safeRatio = sample.total ? sample.safe / sample.total : 0
    const grade: Grade = safeRatio >= 0.72 && sample.stress / Math.max(1, sample.total) < 0.12 ? 'Perfect' : safeRatio >= 0.48 ? 'Good' : 'Miss'
    registerPhaseResult('throttle', grade)
  }, [registerPhaseResult])

  const finishTurn = useCallback(() => {
    const sample = turnSamplesRef.current
    const averageError = sample.total ? sample.error / sample.total : 45
    registerPhaseResult('gravity-turn', averageError <= 7.5 ? 'Perfect' : averageError <= 18 ? 'Good' : 'Miss')
  }, [registerPhaseResult])

  const resolveLaunchRoll = useCallback(() => {
    const roll = Math.ceil(Math.random() * 100)
    if (rollOutcomeRef.current) {
      rollOutcomeRef.current.textContent = `Roll ${roll} ${roll <= actualLaunchChance ? '— we made it!' : '— launch trouble!'}`
    }
    riskTimerRef.current = window.setTimeout(() => {
      if (phaseRef.current !== 'risk-roll') return
      if (roll > actualLaunchChance) {
        const failures = [
          ['engine-shutdown', 'An engine stopped early. Real teams study engine tests and fuel flow.'],
          ['bad-guidance', 'The rocket missed its path. Real teams practice guidance and steering.'],
          ['fairing-issue', 'The payload cover had trouble. Real teams test covers before flight.'],
        ] as const
        const [failureType, failureReason] = failures[Math.floor(Math.random() * failures.length)]
        setOutcome({ success: false, failureType, failureReason, chancePercent: actualLaunchChance, roll, learningBonus, phases: [], combo: 0, score: 0, orbitAccuracy: 0, fuelMargin: 0, lifetimeMultiplier: 0.5 })
        updatePhase('failure')
      } else {
        setOutcome(null)
        updatePhase('throttle')
      }
    }, 850)
  }, [actualLaunchChance, learningBonus, updatePhase])

  const onCountdownTick = useCallback((seconds: number) => {
    if (seconds > 0) play('countdown')
    if (seconds === 4) engine(true, 0.35)
    if (seconds === 0 || seconds % 2 === 0) play('radio')
    if (radioMessageRef.current) radioMessageRef.current.textContent = seconds === 0 ? 'LIFTOFF! Go, rocket, go!' : `T-minus ${seconds}. Go for launch!`
  }, [engine, play])

  const onEngineLevel = useCallback((level: number) => {
    engine(true, 0.22 + level * 0.78)
  }, [engine])

  const onPhaseTimeout = useCallback((activePhase: 'throttle' | 'turn' | 'separation') => {
    if (activePhase === 'throttle') finishThrottle()
    else if (activePhase === 'turn') finishTurn()
    else registerPhaseResult('separation', 'Miss')
  }, [finishThrottle, finishTurn, registerPhaseResult])

  const onMaxQ = useCallback(() => {
    if (radioMessageRef.current) radioMessageRef.current.textContent = 'MAX-Q! Hold steady through the bumpy air.'
    play('radio')
    play('alert')
  }, [play])

  const engineControls = useMemo(() => ({
    holding: holdingRef,
    steer: steerRef,
    throttle: throttleRef,
    heading: headingRef,
    targetStageAngle,
    separationAngle: separationAngleRef,
    safeSamples: safeSamplesRef,
    turnSamples: turnSamplesRef,
  }), [])

  useEffect(() => {
    if (phaseDone || (phase !== 'throttle' && phase !== 'turn' && phase !== 'separation')) return
    const duration = PHASE_SECONDS[phase]
    if (phase === 'throttle') safeSamplesRef.current = { safe: 0, total: 0, stress: 0 }
    if (phase === 'turn') turnSamplesRef.current = { error: 0, total: 0 }
    if (timerTextRef.current) timerTextRef.current.textContent = String(duration)
    if (separationTimerRef.current) separationTimerRef.current.textContent = String(duration)
  }, [phase, phaseDone])

  useEffect(() => () => {
    if (riskTimerRef.current !== null) window.clearTimeout(riskTimerRef.current)
  }, [])

  const releaseControls = useCallback(() => {
    holdingRef.current = false
    steerRef.current = 0
    holdControlRef.current?.classList.remove('launch-hold-active')
  }, [])

  const startHolding = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    holdingRef.current = true
    event.currentTarget.classList.add('launch-hold-active')
  }, [])

  const startSteering = useCallback((direction: number) => {
    steerRef.current = direction
  }, [])

  const updateHeading = useCallback((event: React.FormEvent<HTMLInputElement>) => {
    const value = Number(event.currentTarget.value)
    headingRef.current = value
    if (headingValueRef.current) headingValueRef.current.textContent = String(Math.round(value))
  }, [])

  const attemptSeparation = useCallback(() => {
    if (phaseRef.current !== 'separation' || doneRef.current) return
    const distance = angleDistance(separationAngleRef.current, targetStageAngle)
    if (!smoothMode && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'vibrate' in navigator) navigator.vibrate?.(35)
    play('separation')
    registerPhaseResult('separation', distance <= 17 ? 'Perfect' : distance <= 48 ? 'Good' : 'Miss')
  }, [play, registerPhaseResult, smoothMode])

  useEffect(() => {
    if (!autoPilotEnabled || phase !== 'separation' || phaseDone) return
    const targetTimeMs = targetStageAngle / 168 * 1000
    const timer = window.setTimeout(attemptSeparation, targetTimeMs)
    return () => window.clearTimeout(timer)
  }, [attemptSeparation, autoPilotEnabled, phase, phaseDone, targetStageAngle])

  const startLaunch = useCallback(async () => {
    if (blockReason) {
      updatePhase('failure')
      return
    }
    await prepare()
    updatePhase('risk-roll')
  }, [blockReason, prepare, updatePhase])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code === 'Space' && phaseRef.current === 'throttle' && !doneRef.current) {
        event.preventDefault()
        holdingRef.current = true
        holdControlRef.current?.classList.add('launch-hold-active')
      }
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        if (phaseRef.current === 'turn' && !doneRef.current) {
          event.preventDefault()
          steerRef.current = event.code === 'ArrowLeft' ? -1 : 1
        }
      }
      if ((event.code === 'Space' || event.code === 'Enter') && phaseRef.current === 'separation' && !doneRef.current) {
        event.preventDefault()
        attemptSeparation()
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === 'Space' || event.code === 'ArrowLeft' || event.code === 'ArrowRight') releaseControls()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', releaseControls)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', releaseControls)
    }
  }, [attemptSeparation, releaseControls])

  const nextPhase = useCallback(() => {
    setLastResult(null)
    doneRef.current = false
    setPhaseDone(false)
    if (phase === 'throttle') {
      updatePhase('turn')
      headingRef.current = 0
      if (headingValueRef.current) headingValueRef.current.textContent = '0'
    } else if (phase === 'turn') {
      updatePhase('separation')
      separationAngleRef.current = 0
    } else if (phase === 'separation') {
      const results = phaseResultsRef.current
      const meanPoints = results.length ? results.reduce((sum, item) => sum + item.points, 0) / results.length : 0
      const turnGrade = results.find((result) => result.phase === 'gravity-turn')?.grade ?? 'Miss'
      const separationGrade = results.find((result) => result.phase === 'separation')?.grade ?? 'Miss'
      const gradeValue = (grade: Grade) => grade === 'Perfect' ? 100 : grade === 'Good' ? 78 : 48
      const orbitAccuracy = Math.round(gradeValue(turnGrade) * 0.76 + gradeValue(separationGrade) * 0.24)
      const throttleGrade = results.find((result) => result.phase === 'throttle')?.grade ?? 'Miss'
      const fuelMargin = clamp(Math.round(100 - payloadRatio * 34 + (throttleGrade === 'Perfect' ? 9 : throttleGrade === 'Miss' ? -17 : 0) + (separationGrade === 'Perfect' ? 6 : separationGrade === 'Miss' ? -11 : 0)), 4, 100)
      const score = Math.round(clamp(meanPoints, 0, 100))
      const lifetimeMultiplier = clamp((0.55 + orbitAccuracy / 220) * (0.82 + fuelMargin / 560), 0.5, 1.25)
      setOutcome({ success: true, phases: results, combo, score, orbitAccuracy, fuelMargin, lifetimeMultiplier })
      updatePhase('result')
    }
  }, [combo, payloadRatio, phase, updatePhase])

  useEffect(() => {
    if (!autoPilotEnabled || !phaseDone || (phase !== 'throttle' && phase !== 'turn' && phase !== 'separation')) return
    const timer = window.setTimeout(nextPhase, 700)
    return () => window.clearTimeout(timer)
  }, [autoPilotEnabled, nextPhase, phase, phaseDone])

  const skipToResults = useCallback(() => {
    if (phaseRef.current !== 'throttle' && phaseRef.current !== 'turn' && phaseRef.current !== 'separation') return
    const results = [...phaseResultsRef.current]
    const phases: LaunchPhaseName[] = ['throttle', 'gravity-turn', 'separation']
    for (const name of phases) {
      if (results.some((result) => result.phase === name)) continue
      results.push({ phase: name, grade: 'Miss', combo: 0, points: GRADE_POINTS.Miss })
    }
    phaseResultsRef.current = results
    comboRef.current = 0
    setCombo(0)
    const gradeValue = (grade: Grade) => grade === 'Perfect' ? 100 : grade === 'Good' ? 78 : 48
    const turnGrade = results.find((result) => result.phase === 'gravity-turn')?.grade ?? 'Miss'
    const separationGrade = results.find((result) => result.phase === 'separation')?.grade ?? 'Miss'
    const throttleGrade = results.find((result) => result.phase === 'throttle')?.grade ?? 'Miss'
    const orbitAccuracy = Math.round(gradeValue(turnGrade) * 0.76 + gradeValue(separationGrade) * 0.24)
    const fuelMargin = clamp(Math.round(100 - payloadRatio * 34 + (throttleGrade === 'Perfect' ? 9 : throttleGrade === 'Miss' ? -17 : 0) + (separationGrade === 'Perfect' ? 6 : separationGrade === 'Miss' ? -11 : 0)), 4, 100)
    const meanPoints = results.reduce((sum, item) => sum + item.points, 0) / results.length
    const score = Math.round(clamp(meanPoints, 0, 100))
    const lifetimeMultiplier = clamp((0.55 + orbitAccuracy / 220) * (0.82 + fuelMargin / 560), 0.5, 1.25)
    doneRef.current = false
    setPhaseDone(false)
    setOutcome({ success: true, phases: results, combo: 0, score, orbitAccuracy, fuelMargin, lifetimeMultiplier })
    updatePhase('result')
  }, [payloadRatio, updatePhase])

  const replay = useCallback(() => {
    if (riskTimerRef.current !== null) window.clearTimeout(riskTimerRef.current)
    riskTimerRef.current = null
    phaseResultsRef.current = []
    safeSamplesRef.current = { safe: 0, total: 0, stress: 0 }
    turnSamplesRef.current = { error: 0, total: 0 }
    comboRef.current = 0
    doneRef.current = false
    setPhaseDone(false)
    setLastResult(null)
    setOutcome(null)
    setCombo(0)
    throttleRef.current = 42
    headingRef.current = 0
    separationAngleRef.current = 0
    updatePhase('ready')
  }, [updatePhase])

  function submitFailure() {
    if (outcome) onComplete(outcome)
  }

  const gradeTone = lastResult?.grade.toLowerCase() ?? ''
  const radioMessage: { speaker: RadioSpeaker; message: string } = phase === 'failure'
    ? { speaker: 'Mission Control', message: outcome?.failureReason ?? blockReason ?? 'That rocket launch did not work. Let’s learn and try again!' }
    : phase === 'result'
      ? { speaker: 'Robot Pilot', message: outcome?.success ? 'Great job! We made it to orbit!' : 'We can try again with a bigger rocket!' }
      : phase === 'ready'
        ? { speaker: 'Nova', message: `Our ${rocket.name} has a ${actualLaunchChance}% launch chance. Ready?` }
        : phase === 'risk-roll'
              ? { speaker: 'Mission Control', message: 'Rolling the launch chance. Go, rocket, go!' }
          : phase === 'throttle'
        ? phaseDone
          ? { speaker: 'Mission Control', message: lastResult?.grade === 'Perfect' ? 'Perfect! The rocket stayed safe and strong!' : 'Good flying! Keep going with your mission!' }
              : payloadRatio > 0.75
            ? { speaker: 'Robot Pilot', message: 'We’re carrying a lot. Hold on tight!' }
            : { speaker: 'Mission Control', message: 'Keep THRUST in the green as we climb!' }
        : phase === 'turn'
          ? phaseDone
            ? { speaker: 'Robot Pilot', message: lastResult?.grade === 'Perfect' ? 'Perfect turn! We’re on the right path!' : 'Nice steering! Our ship is still on its way!' }
            : { speaker: 'Nova', message: 'Follow the glowing path with left and right!' }
          : phaseDone
            ? { speaker: 'Mission Control', message: lastResult?.grade === 'Perfect' ? 'Perfect timing! The stage is away!' : 'Stage away! Let’s finish our flight!' }
            : { speaker: 'Mission Control', message: 'Tap when the glowing ring reaches the mark!' }
  const guideMessage = phase === 'failure'
    ? radioMessage.message
    : phase === 'ready'
      ? 'Tap once to start the launch chance roll.'
      : phase === 'risk-roll'
        ? 'Our launch dice are rolling. Fingers crossed!'
    : phase === 'throttle'
      ? phaseDone ? 'Nice flying! Now steer toward the glowing path.' : 'Hold THRUST to keep the meter green!'
      : phase === 'turn'
        ? phaseDone ? 'Great turn! Now tap when the ring shines.' : 'Steer left or right to follow the glowing path.'
        : phase === 'separation'
          ? phaseDone ? 'You did it! Check your flight stars.' : 'Tap once when the ring reaches the glowing mark.'
          : outcome?.success ? 'Great job! Your rocket reached its space home.' : 'Let’s choose a bigger rocket and try again.'

  useEffect(() => {
    onNovaMessage(guideMessage)
  }, [guideMessage, onNovaMessage])

  useEffect(() => {
    if (phase === 'throttle') engine(true, 0.72)
    else if (phase === 'turn' || phase === 'separation') engine(true, 0.62)
    else engine(false)
    if (phase === 'failure') play('alert')
    if (phase === 'result' && outcome?.success) play('success')
    return () => engine(false)
  }, [engine, outcome?.success, phase, play])

  useEffect(() => {
    if (lastResult) play(lastResult.grade === 'Perfect' ? 'success' : 'alert')
  }, [lastResult, play])

  const phaseSeconds = phase === 'throttle' ? PHASE_SECONDS.throttle
    : phase === 'turn' ? PHASE_SECONDS.turn : PHASE_SECONDS.separation

  return <main className={`playable-launch ${phase === 'failure' ? 'playable-launch-failure' : ''}`}>
    <LaunchScene2D
      phase={phase}
      phaseDone={phaseDone}
      phaseSeconds={phaseSeconds}
      payloadRatio={payloadRatio}
      response={response}
      safeHalfWidth={safeHalfWidth}
      quality={quality}
      smoothMode={smoothMode}
      autoPilot={autoPilotEnabled}
      rocketId={rocket.id}
      missionId={mission.id}
      instrumentIds={configuration.instrumentIds}
      appearance={appearance}
      controls={engineControls}
      showFps={showFps}
      onCountdownComplete={resolveLaunchRoll}
      onCountdownTick={onCountdownTick}
      onEngineLevel={onEngineLevel}
      onPhaseTimeout={onPhaseTimeout}
      onMaxQ={onMaxQ}
    />
    <header className="launch-game-top">
      <span className="launch-game-brand"><RocketIcon aria-hidden="true" /> FLIGHT CONTROL / {mission.shortName.toUpperCase()}</span>
      <span className="launch-game-vehicle">{rocket.name} <i /> {orbit.name}</span>
      <label className="launch-autopilot-control"><span>AUTO PILOT</span><input type="checkbox" role="switch" aria-label="Autopilot; automatically fly and advance all launch phases" checked={autoPilotEnabled} disabled={phase !== 'ready'} onChange={(event) => setAutoPilotEnabled(event.currentTarget.checked)} /></label>
      <label className="launch-quality-control"><span>QUALITY</span><select disabled={phase !== 'ready'} value={quality} onChange={(event) => {
        const selected = event.currentTarget.value
        if (selected === 'auto' || selected === 'high' || selected === 'low') setQuality(selected)
      }} aria-label="Launch quality"><option value="auto">Auto</option><option value="high">High</option><option value="low">Low</option></select></label>
    </header>
    <CrewRadio speaker={radioMessage.speaker} message={radioMessage.message} messageRef={radioMessageRef} />
    {phase === 'failure' ? <section className="launch-failure-card" role="alert">
      <span className="launch-alert-icon"><ShieldAlert aria-hidden="true" /></span>
      <small>LAUNCH RESULT · ROLL {outcome?.roll ?? '—'}</small>
      <h1>{outcome?.failureType === 'design-limit' ? 'This rocket cannot carry our ship.' : 'Our rocket did not reach orbit.'}</h1>
      <p>{outcome?.failureReason ?? blockReason}</p>
      <div className="launch-failure-actions"><PrimaryButton variant="quiet" onClick={replay}>Replay</PrimaryButton><PrimaryButton variant="quiet" onClick={onRevise}>Fix our ship</PrimaryButton><PrimaryButton onClick={submitFailure}>Learn from this launch</PrimaryButton></div>
    </section> : phase === 'result' ? <section className="launch-result-card" role="status">
      <span className="launch-result-stamp"><Check aria-hidden="true" /> ORBIT INSERTION COMPLETE</span>
      <h1>Flight performance</h1>
      <div className="launch-result-grid"><div><Target aria-hidden="true" /><strong>{outcome?.orbitAccuracy}%</strong><small>ORBIT ACCURACY</small></div><div><Flame aria-hidden="true" /><strong>{outcome?.fuelMargin}%</strong><small>FUEL MARGIN</small></div><div><Sparkles aria-hidden="true" /><strong>{outcome?.score}/100</strong><small>FLIGHT SKILL</small></div></div>
      <p>{outcome?.phases.map((result) => `${PHASE_LABELS[result.phase]}: ${result.grade}`).join(' · ')}{` · ${combo}× combo`}</p>
      <div className="launch-result-actions"><PrimaryButton variant="quiet" onClick={replay}>Replay</PrimaryButton><PrimaryButton onClick={() => outcome && onComplete(outcome)}>Continue to mission debrief</PrimaryButton></div>
    </section> : phase === 'ready' || phase === 'risk-roll' ? <section className={`launch-ready-card ${phase === 'risk-roll' ? 'launch-risk-rolling' : ''}`}>
      <span className="eyebrow">READY FOR FLIGHT</span><h1>{phase === 'risk-roll' ? 'Launch chance roll!' : 'Ready!'}</h1>
      <div className="launch-dice" aria-live="polite">{phase === 'risk-roll' ? '🎲' : `${actualLaunchChance}%`}</div>
      <p ref={rollOutcomeRef}>{phase === 'risk-roll' ? 'The dice are rolling…' : `Nova: ${rocket.name} is ready. This rocket has a ${actualLaunchChance}% chance.`}</p>
      {phase === 'ready' && <p className="launch-controls-guide">{autoPilotEnabled
        ? 'Autopilot handles thrust, steering, stage separation, and phase changes.'
        : 'Manual controls: hold THRUST or Space, steer with ← / → or the slider, then separate at the glowing marker.'}</p>}
      {learningBonus > 0 && <small className="learning-bonus-note">Learning bonus +{learningBonus}%</small>}
      {phase === 'ready' && <PrimaryButton disabled={!soundsReady} onClick={startLaunch}>{soundsReady ? 'Begin countdown' : 'Getting sounds ready…'}</PrimaryButton>}
    </section> : <LaunchFlightHUD
      phase={phase}
      phaseDone={phaseDone}
      autoPilotEnabled={autoPilotEnabled}
      combo={combo}
      payloadRatio={payloadRatio}
      response={response}
      safeZoneLow={safeZoneLow}
      safeHalfWidth={safeHalfWidth}
      orbitName={orbit.name}
      targetStageAngle={targetStageAngle}
      lastResult={lastResult}
      gradeTone={gradeTone}
      timerTextRef={timerTextRef}
      separationTimerRef={separationTimerRef}
      holdControlRef={holdControlRef}
      throttleNeedleRef={throttleNeedleRef}
      throttleTargetRef={throttleTargetRef}
      throttleValueRef={throttleValueRef}
      targetThrottleValueRef={targetThrottleValueRef}
      throttleGaugeRef={throttleGaugeRef}
      headingValueRef={headingValueRef}
      headingTargetValueRef={headingTargetValueRef}
      separationPointerRef={separationPointerRef}
      onSkipToResults={skipToResults}
      onHoldStart={startHolding}
      onRelease={releaseControls}
      onSteerStart={startSteering}
      onHeadingInput={updateHeading}
      onSeparate={attemptSeparation}
      onNextPhase={nextPhase}
    />}
  </main>
})
type LiveLaunchPhase = 'throttle' | 'turn' | 'separation'

const LaunchScene2D = memo(function LaunchScene2D({
  phase, phaseDone, phaseSeconds, payloadRatio, response, safeHalfWidth, quality, smoothMode, autoPilot, rocketId, missionId, instrumentIds,
  appearance, controls, showFps, onCountdownComplete, onCountdownTick, onEngineLevel, onPhaseTimeout, onMaxQ,
}: {
  phase: LaunchPhase
  phaseDone: boolean
  phaseSeconds: number
  payloadRatio: number
  response: number
  safeHalfWidth: number
  quality: LaunchQuality
  smoothMode: boolean
  autoPilot: boolean
  rocketId: string
  missionId: MissionId
  instrumentIds: string[]
  appearance: RocketAppearance
  controls: LaunchEngineOptions['controls']
  showFps: boolean
  onCountdownComplete: () => void
  onCountdownTick: (seconds: number) => void
  onEngineLevel: (level: number) => void
  onPhaseTimeout: LaunchEngineOptions['onPhaseTimeout']
  onMaxQ: () => void
}) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const rocketRef = useRef<HTMLDivElement>(null)
  const rocketNoseRef = useRef<SVGPathElement>(null)
  const rocketStageBodyRef = useRef<SVGRectElement>(null)
  const rocketFinsRef = useRef<SVGPolygonElement>(null)
  const flameRef = useRef<HTMLDivElement>(null)
  const flameCoreRef = useRef<HTMLDivElement>(null)
  const padRef = useRef<HTMLDivElement>(null)
  const towerRef = useRef<HTMLDivElement>(null)
  const groundRef = useRef<HTMLDivElement>(null)
  const cloudsRef = useRef<HTMLDivElement>(null)
  const highCloudsRef = useRef<HTMLDivElement>(null)
  const skyDarknessRef = useRef<HTMLDivElement>(null)
  const maxQBannerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const leftBoosterRef = useRef<HTMLDivElement>(null)
  const rightBoosterRef = useRef<HTMLDivElement>(null)
  const leftFairingRef = useRef<HTMLDivElement>(null)
  const rightFairingRef = useRef<HTMLDivElement>(null)
  const spacecraftRef = useRef<HTMLDivElement>(null)
  const leftSolarRef = useRef<HTMLDivElement>(null)
  const rightSolarRef = useRef<HTMLDivElement>(null)
  const antennaRef = useRef<HTMLDivElement>(null)
  const planetRef = useRef<HTMLDivElement>(null)
  const orbitBannerRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const countdownRef = useRef<HTMLElement>(null)
  const altitudeRef = useRef<HTMLElement>(null)
  const speedRef = useRef<HTMLElement>(null)
  const flightTimeRef = useRef<HTMLElement>(null)
  const timerRef = useRef<HTMLElement>(null)
  const separationTimerRef = useRef<HTMLElement>(null)
  const throttleNeedleRef = useRef<HTMLElement>(null)
  const throttleTargetRef = useRef<HTMLElement>(null)
  const throttleValueRef = useRef<HTMLElement>(null)
  const targetThrottleValueRef = useRef<HTMLElement>(null)
  const throttleGaugeRef = useRef<HTMLDivElement>(null)
  const headingValueRef = useRef<HTMLElement>(null)
  const headingTargetValueRef = useRef<HTMLElement>(null)
  const separationPointerRef = useRef<HTMLElement>(null)
  const fpsOverlayRef = useRef<HTMLPreElement>(null)
  const qualityReadoutRef = useRef<HTMLElement>(null)
  const elements = useMemo<LaunchEngineElements>(() => ({
    scene: sceneRef, rocket: rocketRef, rocketNose: rocketNoseRef, rocketStageBody: rocketStageBodyRef,
    rocketFins: rocketFinsRef, flame: flameRef, flameCore: flameCoreRef, pad: padRef, tower: towerRef,
    ground: groundRef, clouds: cloudsRef, highClouds: highCloudsRef, skyDarkness: skyDarknessRef,
    maxQBanner: maxQBannerRef, stage: stageRef, leftBooster: leftBoosterRef, rightBooster: rightBoosterRef,
    leftFairing: leftFairingRef, rightFairing: rightFairingRef, spacecraft: spacecraftRef, leftSolar: leftSolarRef,
    rightSolar: rightSolarRef, antenna: antennaRef, planet: planetRef, orbitBanner: orbitBannerRef, flash: flashRef,
    canvas: canvasRef, countdown: countdownRef, altitude: altitudeRef, speed: speedRef, flightTime: flightTimeRef,
    timer: timerRef, separationTimer: separationTimerRef, throttleNeedle: throttleNeedleRef,
    throttleTarget: throttleTargetRef, throttleValue: throttleValueRef, targetThrottleValue: targetThrottleValueRef,
    throttleGauge: throttleGaugeRef, headingValue: headingValueRef, headingTargetValue: headingTargetValueRef,
    separationPointer: separationPointerRef, fpsOverlay: fpsOverlayRef, qualityReadout: qualityReadoutRef,
  }), [])

  useLaunchEngine({
    phase,
    phaseDone,
    phaseSeconds,
    payloadRatio,
    response,
    safeHalfWidth,
    quality,
    smoothMode,
    autoPilot,
    rocketId,
    missionId,
    elements,
    controls,
    onCountdownComplete,
    onCountdownTick,
    onEngineLevel,
    onPhaseTimeout,
    onMaxQ,
  })

  return <div ref={sceneRef} className={`launch-world launch-world-${missionId}`} aria-hidden="true">
    <div className="launch-sky" />
    <div ref={skyDarknessRef} className="launch-sky-darkness" />
    <div ref={highCloudsRef} className="launch-high-clouds" />
    <div ref={cloudsRef} className="launch-clouds" />
    <div ref={groundRef} className="launch-ground-layer" />
    <div ref={padRef} className="launch-pad"><i /><b /><span /></div>
    <div ref={towerRef} className="launch-tower"><i /><i /><i /><b /></div>
    <div className="launch-countdown-display">T−<span ref={countdownRef}>10</span></div>
    <div className="launch-flight-data"><span><small>ALTITUDE</small><b ref={altitudeRef}>0 km</b></span><span><small>SPEED</small><b ref={speedRef}>0 km/h</b></span><span><small>TIME</small><b ref={flightTimeRef}>T+00s</b></span></div>
    <div ref={rocketRef} className="launch-rocket-wrapper" style={{ width: 96, height: 240 }}>
      <Rocket id={getRocket(rocketId).id} body={appearance.bodyColor} stripe={appearance.stripeColor} flame={false} height={240} showBoosters={false} noseRef={rocketNoseRef} stageRef={rocketStageBodyRef} finsRef={rocketFinsRef} />
      <div ref={flameRef} className="launch-rocket-flame"><i /><i /></div>
      <div ref={flameCoreRef} className="launch-rocket-flame-core" />
    </div>
    <div ref={leftBoosterRef} className={`launch-detached-booster ${rocketId === 'sls' ? '' : 'launch-decorative-hidden'}`} />
    <div ref={rightBoosterRef} className={`launch-detached-booster launch-detached-booster-right ${rocketId === 'sls' ? '' : 'launch-decorative-hidden'}`} />
    <div ref={stageRef} className="launch-detached-stage" />
    <div ref={leftFairingRef} className="launch-fairing launch-fairing-left" />
    <div ref={rightFairingRef} className="launch-fairing launch-fairing-right" />
    <div ref={spacecraftRef} className="launch-spacecraft">
      <span ref={leftSolarRef} className="launch-solar-panel launch-solar-left" />
      <span ref={rightSolarRef} className="launch-solar-panel launch-solar-right" />
      <b />
      {instrumentIds.map((instrumentId, index) => <span className="launch-spacecraft-sensor" style={{ left: `${15 + index * 5}px` }} key={instrumentId} />)}
      <i ref={antennaRef} />
    </div>
    <div ref={planetRef} className="launch-orbit-planet" />
    <canvas ref={canvasRef} className="launch-particle-canvas" />
    <div ref={maxQBannerRef} className="launch-maxq-banner">MAX-Q! <small>HOLD STEADY</small></div>
    <div ref={orbitBannerRef} className="launch-orbit-banner">ORBIT ACHIEVED</div>
    <div ref={flashRef} className="launch-screen-flash" />
    <pre ref={fpsOverlayRef} className="launch-fps-overlay" style={{ display: showFps ? 'block' : 'none' }}>FPS --</pre>
    <span ref={qualityReadoutRef} className="launch-quality-readout" />
  </div>
})

const LaunchFlightHUD = memo(function LaunchFlightHUD({
  phase,
  phaseDone,
  autoPilotEnabled,
  combo,
  payloadRatio,
  response,
  safeZoneLow,
  safeHalfWidth,
  orbitName,
  targetStageAngle,
  lastResult,
  gradeTone,
  timerTextRef,
  separationTimerRef,
  holdControlRef,
  throttleNeedleRef,
  throttleTargetRef,
  throttleValueRef,
  targetThrottleValueRef,
  throttleGaugeRef,
  headingValueRef,
  headingTargetValueRef,
  separationPointerRef,
  onSkipToResults,
  onHoldStart,
  onRelease,
  onSteerStart,
  onHeadingInput,
  onSeparate,
  onNextPhase,
}: {
  phase: LiveLaunchPhase
  phaseDone: boolean
  autoPilotEnabled: boolean
  combo: number
  payloadRatio: number
  response: number
  safeZoneLow: number
  safeHalfWidth: number
  orbitName: string
  targetStageAngle: number
  lastResult: LaunchPhaseResult | null
  gradeTone: string
  timerTextRef: RefObject<HTMLElement | null>
  separationTimerRef: RefObject<HTMLElement | null>
  holdControlRef: RefObject<HTMLButtonElement | null>
  throttleNeedleRef: RefObject<HTMLElement | null>
  throttleTargetRef: RefObject<HTMLElement | null>
  throttleValueRef: RefObject<HTMLElement | null>
  targetThrottleValueRef: RefObject<HTMLElement | null>
  throttleGaugeRef: RefObject<HTMLDivElement | null>
  headingValueRef: RefObject<HTMLElement | null>
  headingTargetValueRef: RefObject<HTMLElement | null>
  separationPointerRef: RefObject<HTMLElement | null>
  onSkipToResults: () => void
  onHoldStart: (event: PointerEvent<HTMLButtonElement>) => void
  onRelease: () => void
  onSteerStart: (direction: number) => void
  onHeadingInput: (event: FormEvent<HTMLInputElement>) => void
  onSeparate: () => void
  onNextPhase: () => void
}) {
  return <div className="launch-game-hud">
    <section className="launch-phase-card">
      <div className="launch-phase-heading"><span><small>FLIGHT PHASE {phase === 'throttle' ? '01' : phase === 'turn' ? '02' : '03'} / 03</small><h1>{phase === 'throttle' ? 'Hold the thrust window.' : phase === 'turn' ? 'Ride the gravity turn.' : 'Separate on the mark.'}</h1></span><span className="launch-phase-timer"><span ref={timerTextRef}>{PHASE_SECONDS[phase]}</span><small>SEC</small></span></div>
      <div className="launch-phase-rail" aria-label="Launch phase progress"><i className={phase !== 'throttle' ? 'launch-rail-done' : 'launch-rail-active'} /><i className={phase === 'turn' ? 'launch-rail-active' : phase === 'separation' ? 'launch-rail-done' : ''} /><i className={phase === 'separation' ? 'launch-rail-active' : ''} /></div>
      <div className="launch-live-stats"><span><b>COMBO</b><strong>{combo}×</strong></span><span><b>PAYLOAD LOAD</b><strong>{Math.round(payloadRatio * 100)}%</strong></span><span><b>CONTROL RESPONSE</b><strong>{Math.round(response * 100)}%</strong></span></div>
      <section className="launch-trajectory-map" aria-label={`Rocket map to ${orbitName}`}>
        <div className="launch-map-heading"><span><Globe2 aria-hidden="true" /> ROCKET MAP</span><strong>{orbitName}</strong></div>
        <div className="launch-map-display">
          <svg viewBox="0 0 360 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="launch-map-grid" d="M0 25H360M0 50H360M0 75H360M60 0V100M120 0V100M180 0V100M240 0V100M300 0V100" />
            <path className="launch-map-route" d="M28 72 C86 18 174 14 330 39" />
            <circle className="launch-map-home" cx="28" cy="72" r="6" />
            <circle className="launch-map-destination" cx="330" cy="39" r="5" />
          </svg>
          <span className="launch-map-home-label">EARTH</span>
          <span className="launch-map-destination-label">ORBIT</span>
          <RocketIcon className="launch-map-rocket" aria-hidden="true" />
        </div>
        <div className="launch-map-status"><span>LIVE TRAJECTORY</span><span>{phase === 'separation' ? 'STAGE SEPARATION' : phase === 'turn' ? 'GRAVITY TURN' : 'ASCENT'}</span></div>
      </section>
      {phase === 'throttle' && <div className="launch-throttle-panel">
        <div className="launch-gauge-label"><span><Gauge aria-hidden="true" /> THROTTLE / MAX-Q</span><strong><span ref={throttleValueRef}>42%</span></strong></div>
        <div className="launch-throttle-gauge" ref={throttleGaugeRef} role="meter" aria-label="Rocket throttle" aria-valuenow={42} aria-valuemin={0} aria-valuemax={100}>
          <div className="launch-safe-zone" style={{ left: `${safeZoneLow}%`, width: `${safeHalfWidth * 2}%` }} />
          <span className="launch-marker-positioner launch-target-positioner" ref={throttleTargetRef}><i className="launch-target-tick" /></span>
          <span className="launch-marker-positioner launch-needle-positioner" ref={throttleNeedleRef}><i className="launch-throttle-needle" /></span>
        </div>
        <div className="launch-gauge-scale"><span>LOW · LOSE SPEED</span><span>GREEN · SAFE</span><span>HIGH · STRESS</span></div>
        <div className="launch-target-copy">TARGET <span ref={targetThrottleValueRef}>58</span>% <i /> SAFE WINDOW ±{Math.round(safeHalfWidth)}%</div>
        <button ref={holdControlRef} type="button" className="launch-hold-control" onPointerDown={onHoldStart} onPointerUp={onRelease} onPointerCancel={onRelease} onContextMenu={(event) => event.preventDefault()}>
          <ArrowUp aria-hidden="true" /> HOLD TO BUILD THRUST <small>RELEASE TO EASE · SPACE BAR ALSO WORKS</small>
        </button>
        {phaseDone && <div className={`launch-phase-feedback feedback-${gradeTone}`} role="status"><strong>{lastResult?.grade ?? 'Miss'}</strong><span>{lastResult?.grade === 'Perfect' ? 'Max-Q stayed in the safe corridor.' : lastResult?.grade === 'Good' ? 'Stable ascent; small thrust corrections remain.' : 'Throttle drift caused speed loss or structural stress.'}</span>{autoPilotEnabled ? <small>Autopilot advancing…</small> : <button type="button" onClick={onNextPhase}>Gravity turn <ArrowRight aria-hidden="true" /></button>}</div>}
      </div>}
      {phase === 'turn' && <div className="launch-turn-panel">
        <div className="launch-turn-heading"><span><Orbit aria-hidden="true" /> TARGET ORBIT ARC</span><strong><span ref={headingTargetValueRef}>13</span>°</strong></div>
        <div className="launch-turn-readout"><span>YOUR FLIGHT PATH</span><b><span ref={headingValueRef}>0</span>°</b><span>STEER TO THE GLOWING ARC</span></div>
        <input className="launch-heading-slider" type="range" min="-45" max="45" defaultValue="0" aria-label="Steer rocket heading" onInput={onHeadingInput} />
        <div className="launch-steer-controls"><button type="button" aria-label="Steer left" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onSteerStart(-1) }} onPointerUp={onRelease} onPointerCancel={onRelease}><ArrowLeft aria-hidden="true" /></button><span>ARROW KEYS · DRAG SLIDER · HOLD TO STEER</span><button type="button" aria-label="Steer right" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onSteerStart(1) }} onPointerUp={onRelease} onPointerCancel={onRelease}><ArrowRight aria-hidden="true" /></button></div>
        <p className="launch-turn-hint"><ArrowDown aria-hidden="true" /> Keep the flight-path marker near the moving target. A heavy payload responds more slowly.</p>
        {phaseDone && <div className={`launch-phase-feedback feedback-${gradeTone}`} role="status"><strong>{lastResult?.grade ?? 'Miss'}</strong><span>{lastResult?.grade === 'Perfect' ? 'Trajectory is locked on the target orbit.' : lastResult?.grade === 'Good' ? 'The orbit is reachable with a small insertion correction.' : 'The turn drifted away from the target arc.'}</span>{autoPilotEnabled ? <small>Autopilot advancing…</small> : <button type="button" onClick={onNextPhase}>Stage separation <ArrowRight aria-hidden="true" /></button>}</div>}
      </div>}
      {phase === 'separation' && <div className="launch-separation-panel">
        <div className="launch-separation-ring" style={{ '--target-angle': `${targetStageAngle}deg` } as CSSProperties}><i className="launch-ring-target" /><i className="launch-ring-pointer" ref={separationPointerRef} /><span><b>T−<span ref={separationTimerRef}>{PHASE_SECONDS.separation}</span></b><small>SEPARATE AT THE MARK</small></span></div>
        <p>Tap when the moving indicator reaches the glowing target. Release the spent stage cleanly.</p>
        <button type="button" className="launch-separate-control" onClick={onSeparate} disabled={phaseDone}>SEPARATE STAGE <RocketIcon aria-hidden="true" /></button>
        {phaseDone && <div className={`launch-phase-feedback feedback-${gradeTone}`} role="status"><strong>{lastResult?.grade ?? 'Miss'}</strong><span>{lastResult?.grade === 'Perfect' ? 'Clean separation; fuel and orbit insertion are on target.' : lastResult?.grade === 'Good' ? 'Stage released with a small fuel penalty.' : 'Late or early separation reduced insertion margin.'}</span>{autoPilotEnabled ? <small>Autopilot advancing…</small> : <button type="button" onClick={onNextPhase}>Flight debrief <ArrowRight aria-hidden="true" /></button>}</div>}
      </div>}
      <button className="launch-skip-button" type="button" onClick={onSkipToResults}>Skip to results</button>
    </section>
    <section className="launch-instrument-panel" aria-live="polite">
      <span className="launch-instrument-title"><CircleAlert aria-hidden="true" /> FLIGHT DIRECTOR CALLOUT</span>
      <strong>{phase === 'throttle' ? 'Stay in the green through Max-Q.' : phase === 'turn' ? `Follow the arc toward ${orbitName}.` : 'Watch the ring, then tap to separate.'}</strong>
      <small>{phase === 'throttle' ? 'High thrust adds structural stress; low thrust loses speed.' : phase === 'turn' ? 'Arrow keys, the slider, or the on-screen controls all work.' : 'Perfect timing preserves fuel for orbit insertion.'}</small>
    </section>
    {lastResult && <div className={`launch-score-pop launch-score-${gradeTone}`} key={`${lastResult.phase}-${lastResult.grade}`} aria-live="polite"><strong>{lastResult.grade.toUpperCase()}</strong><span>+{lastResult.points} FLIGHT PTS</span></div>}
  </div>
})
