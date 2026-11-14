'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent, type RefObject } from 'react'
import dynamic from 'next/dynamic'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CircleAlert, Flame, Gauge, Orbit, Rocket, ShieldAlert, Sparkles, Target } from 'lucide-react'
import type { MissionConfiguration, MissionEstimate, MissionProfile, RocketAppearance, SpacecraftSize } from './mission-data'
import { getOrbit, getRocket } from './mission-data'
import type { LaunchPhaseName, LaunchPhaseResult, LaunchResult } from './mission-simulation'
import { PrimaryButton } from './mission-ui'
import { useGameAudio } from './game-audio'
import { CrewRadio, type RadioSpeaker } from './game-companions'
import { MissionRocketSprite } from './mission-rocket-sprite'
import { MissionCanvasErrorBoundary } from './mission-canvas-error-boundary'

const MissionLaunchScene = dynamic(() => import('./mission-launch-scene').then((module) => module.MissionLaunchScene), { ssr: false, loading: () => null })

type LaunchPhase = 'ready' | 'risk-roll' | 'throttle' | 'turn' | 'separation' | 'result' | 'failure'
type Grade = LaunchPhaseResult['grade']

const PHASE_LABELS: Record<LaunchPhaseName, string> = {
  throttle: 'THROTTLE · MAX-Q',
  'gravity-turn': 'GRAVITY TURN',
  separation: 'STAGE SEPARATION',
}
const PHASE_SECONDS: Record<'throttle' | 'turn' | 'separation', number> = {
  throttle: 9,
  turn: 9,
  separation: 7,
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

export const MissionLaunchGame = memo(function MissionLaunchGame({ mission, size, configuration, estimate, appearance, sandboxEnabled, threeDEnabled, launchChance: suppliedLaunchChance, learningBonus, onComplete, onRevise, onNovaMessage }: {
  mission: MissionProfile
  size: SpacecraftSize
  configuration: MissionConfiguration
  estimate: MissionEstimate
  appearance: RocketAppearance
  sandboxEnabled: boolean
  threeDEnabled: boolean
  launchChance: number
  learningBonus: number
  onComplete: (result: LaunchResult) => void
  onRevise: () => void
  onNovaMessage: (message: string) => void
}) {
  const { play, prepare } = useGameAudio()
  const rocket = getRocket(configuration.rocketId)
  const orbit = getOrbit(configuration.orbitId)
  const blockReason = useMemo(() => sandboxEnabled ? '' : getFlightBlockReason(mission, configuration, estimate, size), [mission, configuration, estimate, size, sandboxEnabled])
  const payloadRatio = sandboxEnabled ? 0 : estimate.payloadMassKg / Math.max(1, rocket.payloadKg)
  const response = clamp(1 - payloadRatio * 0.55, 0.42, 1)
  const safeHalfWidth = clamp(18 - payloadRatio * 9, 7, 18)
  const [phase, setPhase] = useState<LaunchPhase>(blockReason ? 'failure' : 'ready')
  const [phaseDone, setPhaseDone] = useState(Boolean(blockReason))
  const [lastResult, setLastResult] = useState<LaunchPhaseResult | null>(null)
  const [rollNumber, setRollNumber] = useState<number | null>(null)
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
  const targetThrottleRef = useRef(58)
  const targetHeadingRef = useRef(13)
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
  const holdControlRef = useRef<HTMLButtonElement>(null)
  const spriteMotionRef = useRef<HTMLDivElement>(null)
  const riskTimerRef = useRef<number | null>(null)
  const phaseResultsRef = useRef<LaunchPhaseResult[]>([])
  const safeSamplesRef = useRef({ safe: 0, total: 0, stress: 0 })
  const turnSamplesRef = useRef({ error: 0, total: 0 })
  const comboRef = useRef(0)
  const phaseRef = useRef(phase)
  const doneRef = useRef(phaseDone)
  const launchMotionRef = useRef({ heading: 0 })
  const rocketElapsedRef = useRef(0)

  const targetStageAngle = 214
  const safeZoneLow = Math.max(0, 58 - safeHalfWidth)
  const actualLaunchChance = sandboxEnabled ? 99 : suppliedLaunchChance

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

  useEffect(() => {
    if (phaseDone || (phase !== 'throttle' && phase !== 'turn' && phase !== 'separation')) return
    const duration = PHASE_SECONDS[phase]
    let elapsed = 0
    let previousFrame = 0
    let lastUiSecond = -1
    let lastGaugeTextAt = 0
    let frameCount = 0
    let fpsWindowStart = performance.now()
    let frameInterval = 1000 / 60
    let lastWork = 0
    let raf = 0
    safeSamplesRef.current = { safe: 0, total: 0, stress: 0 }
    turnSamplesRef.current = { error: 0, total: 0 }
    if (timerTextRef.current) timerTextRef.current.textContent = String(duration)
    if (separationTimerRef.current) separationTimerRef.current.textContent = String(duration)
    const updateFrame = (now: number) => {
      if (document.hidden) {
        previousFrame = 0
        return
      }
      raf = window.requestAnimationFrame(updateFrame)
      if (!previousFrame) previousFrame = now
      const delta = Math.min(0.05, Math.max(0, (now - previousFrame) / 1000))
      previousFrame = now
      frameCount += 1
      if (now - fpsWindowStart >= 1000) {
        frameInterval = (frameCount / ((now - fpsWindowStart) / 1000)) < 24 ? 1000 / 30 : 1000 / 60
        fpsWindowStart = now
        frameCount = 0
      }
      if (now - lastWork < frameInterval) return
      lastWork = now
      elapsed += delta
      const remaining = Math.max(0, Math.ceil(duration - elapsed))
      if (remaining !== lastUiSecond) {
        lastUiSecond = remaining
        if (timerTextRef.current) timerTextRef.current.textContent = String(remaining)
        if (separationTimerRef.current) separationTimerRef.current.textContent = String(remaining)
      }
      const updateGaugeText = now - lastGaugeTextAt >= 100
      if (updateGaugeText) lastGaugeTextAt = now
      rocketElapsedRef.current += delta
      if (spriteMotionRef.current) {
        const heading = launchMotionRef.current.heading
        spriteMotionRef.current.style.transform = `translate3d(${heading * 1.3}px, -${Math.min(180, rocketElapsedRef.current * 18)}px, 0) rotate(${-heading * 0.55}deg)`
        spriteMotionRef.current.style.opacity = String(Math.max(0.35, 1 - rocketElapsedRef.current / 90))
      }
      if (phase === 'throttle') {
        const target = 57 + Math.sin(elapsed * 1.25) * 8 + Math.sin(elapsed * 2.1) * 2
        targetThrottleRef.current = target
        const nextThrottle = clamp(throttleRef.current + (holdingRef.current ? 2.1 * response : -0.45) * Math.max(0.5, delta * 30), 0, 100)
        throttleRef.current = nextThrottle
        if (throttleNeedleRef.current) throttleNeedleRef.current.style.transform = `translateX(calc(${nextThrottle}% - 50%))`
        if (throttleTargetRef.current) throttleTargetRef.current.style.transform = `translateX(calc(${target}% - 50%))`
        if (updateGaugeText) {
          throttleGaugeRef.current?.setAttribute('aria-valuenow', String(Math.round(nextThrottle)))
          if (throttleValueRef.current) throttleValueRef.current.textContent = `${Math.round(nextThrottle)}%`
          if (targetThrottleValueRef.current) targetThrottleValueRef.current.textContent = `${Math.round(target)}`
        }
        safeSamplesRef.current.total += 1
        const error = Math.abs(nextThrottle - target)
        if (error <= safeHalfWidth) safeSamplesRef.current.safe += 1
        if (nextThrottle > target + safeHalfWidth * 1.8) safeSamplesRef.current.stress += 1
      } else if (phase === 'turn') {
        const target = 12 + Math.sin(elapsed * 0.72) * 13 + Math.sin(elapsed * 1.42) * 3
        targetHeadingRef.current = target
        const nextHeading = clamp(headingRef.current + steerRef.current * response * 3.2 * Math.max(0.5, delta * 30), -45, 45)
        headingRef.current = nextHeading
        if (updateGaugeText) {
          if (headingValueRef.current) headingValueRef.current.textContent = String(Math.round(nextHeading))
          if (headingTargetValueRef.current) headingTargetValueRef.current.textContent = String(Math.round(target))
        }
        if (spriteMotionRef.current) spriteMotionRef.current.style.transform = `translate3d(${nextHeading * 1.3}px, -${elapsed * 5}px, 0) rotate(${-nextHeading * 0.55}deg)`
        turnSamplesRef.current.total += 1
        turnSamplesRef.current.error += Math.abs(nextHeading - target)
      } else {
        separationAngleRef.current = (elapsed * 168) % 360
        if (separationPointerRef.current) separationPointerRef.current.style.transform = `rotate(${separationAngleRef.current}deg)`
      }

      if (elapsed >= duration) {
        window.cancelAnimationFrame(raf)
        if (phase === 'throttle') finishThrottle()
        else if (phase === 'turn') finishTurn()
        else {
          registerPhaseResult('separation', 'Miss')
        }
      }
    }
    const resume = () => {
      previousFrame = 0
      if (!document.hidden) raf = window.requestAnimationFrame(updateFrame)
    }
    document.addEventListener('visibilitychange', resume)
    raf = window.requestAnimationFrame(updateFrame)
    return () => {
      window.cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [finishThrottle, finishTurn, phase, phaseDone, registerPhaseResult, response, safeHalfWidth])

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
    launchMotionRef.current.heading = value
    if (headingValueRef.current) headingValueRef.current.textContent = String(Math.round(value))
  }, [])

  const attemptSeparation = useCallback(() => {
    if (phaseRef.current !== 'separation' || doneRef.current) return
    const distance = angleDistance(separationAngleRef.current, targetStageAngle)
    registerPhaseResult('separation', distance <= 17 ? 'Perfect' : distance <= 48 ? 'Good' : 'Miss')
  }, [registerPhaseResult])

  const startLaunch = useCallback(async () => {
    if (blockReason) {
      updatePhase('failure')
      return
    }
    await prepare()
    rocketElapsedRef.current = 0
    setRollNumber(null)
    updatePhase('risk-roll')
    riskTimerRef.current = window.setTimeout(() => {
      const roll = Math.ceil(Math.random() * 100)
      setRollNumber(roll)
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
    }, 1100)
  }, [actualLaunchChance, blockReason, learningBonus, prepare, updatePhase])

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
      launchMotionRef.current.heading = 0
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

  function submitFailure() {
    if (outcome) onComplete(outcome)
  }

  const gradeTone = lastResult?.grade.toLowerCase() ?? ''
  const visiblePhase = phase === 'failure' || phase === 'result' || phase === 'separation' || phase === 'turn' ? phase : 'throttle'
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
            : { speaker: 'Mission Control', message: 'T-minus 3! Keep THRUST in the green!' }
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
    if (phase === 'throttle') play('engine')
    else if (phase === 'risk-roll') play('countdown')
    else if (phase === 'turn' || phase === 'separation') play('countdown')
    else if (phase === 'failure') play('alert')
    else if (phase === 'result' && outcome?.success) play('success')
  }, [outcome?.success, phase, play])

  useEffect(() => {
    if (lastResult) play(lastResult.grade === 'Perfect' ? 'success' : 'alert')
  }, [lastResult, play])

  return <main className={`playable-launch ${phase === 'failure' ? 'playable-launch-failure' : ''}`}>
    {phase === 'result' && outcome?.success && <ConfettiBurst />}
    <LaunchRocketVisual phase={phase} visiblePhase={visiblePhase} rocketId={rocket.id} appearance={appearance} threeDEnabled={threeDEnabled} controlsRef={launchMotionRef} spriteMotionRef={spriteMotionRef} />
    <header className="launch-game-top">
      <span className="launch-game-brand"><Rocket aria-hidden="true" /> FLIGHT CONTROL / {mission.shortName.toUpperCase()}</span>
      <span className="launch-game-vehicle">{rocket.name} <i /> {orbit.name}</span>
    </header>
    <CrewRadio speaker={radioMessage.speaker} message={radioMessage.message} />
    {phase === 'failure' ? <section className="launch-failure-card" role="alert">
      <span className="launch-alert-icon"><ShieldAlert aria-hidden="true" /></span>
      <small>LAUNCH RESULT · ROLL {outcome?.roll ?? '—'}</small>
      <h1>{outcome?.failureType === 'design-limit' ? 'This rocket cannot carry our ship.' : 'Our rocket did not reach orbit.'}</h1>
      <p>{outcome?.failureReason ?? blockReason}</p>
      <div className="launch-failure-actions"><PrimaryButton variant="quiet" onClick={onRevise}>Fix our ship</PrimaryButton><PrimaryButton onClick={submitFailure}>Learn from this launch</PrimaryButton></div>
    </section> : phase === 'result' ? <section className="launch-result-card" role="status">
      <span className="launch-result-stamp"><Check aria-hidden="true" /> ORBIT INSERTION COMPLETE</span>
      <h1>Flight performance</h1>
      <div className="launch-result-grid"><div><Target aria-hidden="true" /><strong>{outcome?.orbitAccuracy}%</strong><small>ORBIT ACCURACY</small></div><div><Flame aria-hidden="true" /><strong>{outcome?.fuelMargin}%</strong><small>FUEL MARGIN</small></div><div><Sparkles aria-hidden="true" /><strong>{outcome?.score}/100</strong><small>FLIGHT SKILL</small></div></div>
      <p>{outcome?.phases.map((result) => `${PHASE_LABELS[result.phase]}: ${result.grade}`).join(' · ')}{` · ${combo}× combo`}</p>
      <PrimaryButton onClick={() => outcome && onComplete(outcome)}>Continue to mission debrief</PrimaryButton>
    </section> : phase === 'ready' || phase === 'risk-roll' ? <section className={`launch-ready-card ${phase === 'risk-roll' ? 'launch-risk-rolling' : ''}`}>
      <span className="eyebrow">READY FOR FLIGHT</span><h1>{phase === 'risk-roll' ? 'Launch chance roll!' : 'Ready!'}</h1>
      <div className="launch-dice" aria-live="polite">{phase === 'risk-roll' ? '🎲' : `${actualLaunchChance}%`}</div>
      <p>{phase === 'risk-roll' ? rollNumber === null ? 'The dice are rolling…' : `Roll ${rollNumber} ${rollNumber <= actualLaunchChance ? '— we made it!' : '— launch trouble!'}` : `Nova: ${rocket.name} is ready. This rocket has a ${actualLaunchChance}% chance.`}</p>
      {learningBonus > 0 && <small className="learning-bonus-note">Learning bonus +{learningBonus}%</small>}
      {phase === 'ready' && <PrimaryButton onClick={startLaunch}>Begin countdown</PrimaryButton>}
    </section> : <LaunchFlightHUD
      phase={phase}
      phaseDone={phaseDone}
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

const LaunchRocketVisual = memo(function LaunchRocketVisual({ phase, visiblePhase, rocketId, appearance, threeDEnabled, controlsRef, spriteMotionRef }: {
  phase: LaunchPhase
  visiblePhase: Extract<LaunchPhase, 'throttle' | 'turn' | 'separation' | 'result' | 'failure'>
  rocketId: string
  appearance: RocketAppearance
  threeDEnabled: boolean
  controlsRef: RefObject<{ heading: number }>
  spriteMotionRef: RefObject<HTMLDivElement | null>
}) {
  return <>
    <div className={`launch-scene-fallback ${phase === 'failure' ? 'launch-scene-exploded' : ''}`} aria-hidden="true">
      <div className="launch-sprite-motion" ref={spriteMotionRef}>
        <MissionRocketSprite rocketId={rocketId} appearance={appearance} exploded={phase === 'failure'} shadow={false} />
      </div>
    </div>
    {threeDEnabled && phase !== 'ready' && phase !== 'risk-roll' && <MissionCanvasErrorBoundary resetKey={`${rocketId}:${JSON.stringify(appearance)}`} fallback={null}>
      <MissionLaunchScene
        phase={visiblePhase}
        appearance={appearance}
        rocketId={rocketId}
        exploded={phase === 'failure'}
        enabled
        controlsRef={controlsRef}
      />
    </MissionCanvasErrorBoundary>}
  </>
})

const LaunchFlightHUD = memo(function LaunchFlightHUD({
  phase,
  phaseDone,
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
  onHoldStart,
  onRelease,
  onSteerStart,
  onHeadingInput,
  onSeparate,
  onNextPhase,
}: {
  phase: LiveLaunchPhase
  phaseDone: boolean
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
        {phaseDone && <div className={`launch-phase-feedback feedback-${gradeTone}`} role="status"><strong>{lastResult?.grade ?? 'Miss'}</strong><span>{lastResult?.grade === 'Perfect' ? 'Max-Q stayed in the safe corridor.' : lastResult?.grade === 'Good' ? 'Stable ascent; small thrust corrections remain.' : 'Throttle drift caused speed loss or structural stress.'}</span><button type="button" onClick={onNextPhase}>Gravity turn <ArrowRight aria-hidden="true" /></button></div>}
      </div>}
      {phase === 'turn' && <div className="launch-turn-panel">
        <div className="launch-turn-heading"><span><Orbit aria-hidden="true" /> TARGET ORBIT ARC</span><strong><span ref={headingTargetValueRef}>13</span>°</strong></div>
        <div className="launch-turn-readout"><span>YOUR FLIGHT PATH</span><b><span ref={headingValueRef}>0</span>°</b><span>STEER TO THE GLOWING ARC</span></div>
        <input className="launch-heading-slider" type="range" min="-45" max="45" defaultValue="0" aria-label="Steer rocket heading" onInput={onHeadingInput} />
        <div className="launch-steer-controls"><button type="button" aria-label="Steer left" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onSteerStart(-1) }} onPointerUp={onRelease} onPointerCancel={onRelease}><ArrowLeft aria-hidden="true" /></button><span>ARROW KEYS · DRAG SLIDER · HOLD TO STEER</span><button type="button" aria-label="Steer right" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onSteerStart(1) }} onPointerUp={onRelease} onPointerCancel={onRelease}><ArrowRight aria-hidden="true" /></button></div>
        <p className="launch-turn-hint"><ArrowDown aria-hidden="true" /> Keep the flight-path marker near the moving target. A heavy payload responds more slowly.</p>
        {phaseDone && <div className={`launch-phase-feedback feedback-${gradeTone}`} role="status"><strong>{lastResult?.grade ?? 'Miss'}</strong><span>{lastResult?.grade === 'Perfect' ? 'Trajectory is locked on the target orbit.' : lastResult?.grade === 'Good' ? 'The orbit is reachable with a small insertion correction.' : 'The turn drifted away from the target arc.'}</span><button type="button" onClick={onNextPhase}>Stage separation <ArrowRight aria-hidden="true" /></button></div>}
      </div>}
      {phase === 'separation' && <div className="launch-separation-panel">
        <div className="launch-separation-ring" style={{ '--target-angle': `${targetStageAngle}deg` } as CSSProperties}><i className="launch-ring-target" /><i className="launch-ring-pointer" ref={separationPointerRef} /><span><b>T−<span ref={separationTimerRef}>{PHASE_SECONDS.separation}</span></b><small>SEPARATE AT THE MARK</small></span></div>
        <p>Tap when the moving indicator reaches the glowing target. Release the spent stage cleanly.</p>
        <button type="button" className="launch-separate-control" onClick={onSeparate} disabled={phaseDone}>SEPARATE STAGE <Rocket aria-hidden="true" /></button>
        {phaseDone && <div className={`launch-phase-feedback feedback-${gradeTone}`} role="status"><strong>{lastResult?.grade ?? 'Miss'}</strong><span>{lastResult?.grade === 'Perfect' ? 'Clean separation; fuel and orbit insertion are on target.' : lastResult?.grade === 'Good' ? 'Stage released with a small fuel penalty.' : 'Late or early separation reduced insertion margin.'}</span><button type="button" onClick={onNextPhase}>Flight debrief <ArrowRight aria-hidden="true" /></button></div>}
      </div>}
    </section>
    <section className="launch-instrument-panel" aria-live="polite">
      <span className="launch-instrument-title"><CircleAlert aria-hidden="true" /> FLIGHT DIRECTOR CALLOUT</span>
      <strong>{phase === 'throttle' ? 'Stay in the green through Max-Q.' : phase === 'turn' ? `Follow the arc toward ${orbitName}.` : 'Watch the ring, then tap to separate.'}</strong>
      <small>{phase === 'throttle' ? 'High thrust adds structural stress; low thrust loses speed.' : phase === 'turn' ? 'Arrow keys, the slider, or the on-screen controls all work.' : 'Perfect timing preserves fuel for orbit insertion.'}</small>
    </section>
    {lastResult && <div className={`launch-score-pop launch-score-${gradeTone}`} key={`${lastResult.phase}-${lastResult.grade}`} aria-live="polite"><strong>{lastResult.grade.toUpperCase()}</strong><span>+{lastResult.points} FLIGHT PTS</span></div>}
  </div>
})

function ConfettiBurst() {
  return <div className="confetti-burst" aria-hidden="true">
    {Array.from({ length: 28 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 7) * 0.08}s`, backgroundColor: `hsl(${(index * 43) % 360} 75% 65%)` }} />)}
  </div>
}
