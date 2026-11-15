'use client'

import { useEffect, useRef, type RefObject } from 'react'
import type { MissionId } from './mission-data'

export type LaunchEnginePhase = 'ready' | 'risk-roll' | 'throttle' | 'turn' | 'separation' | 'result' | 'failure'
export type LaunchQuality = 'auto' | 'high' | 'low'
type EngineElement<T extends HTMLElement | SVGElement> = RefObject<T | null>

export interface LaunchEngineElements {
  scene: EngineElement<HTMLDivElement>
  rocket: EngineElement<HTMLDivElement>
  rocketNose: EngineElement<SVGPathElement>
  rocketStageBody: EngineElement<SVGRectElement>
  rocketFins: EngineElement<SVGPolygonElement>
  flame: EngineElement<HTMLDivElement>
  flameCore: EngineElement<HTMLDivElement>
  pad: EngineElement<HTMLDivElement>
  tower: EngineElement<HTMLDivElement>
  ground: EngineElement<HTMLDivElement>
  clouds: EngineElement<HTMLDivElement>
  highClouds: EngineElement<HTMLDivElement>
  skyDarkness: EngineElement<HTMLDivElement>
  maxQBanner: EngineElement<HTMLDivElement>
  stage: EngineElement<HTMLDivElement>
  leftBooster: EngineElement<HTMLDivElement>
  rightBooster: EngineElement<HTMLDivElement>
  leftFairing: EngineElement<HTMLDivElement>
  rightFairing: EngineElement<HTMLDivElement>
  spacecraft: EngineElement<HTMLDivElement>
  leftSolar: EngineElement<HTMLDivElement>
  rightSolar: EngineElement<HTMLDivElement>
  antenna: EngineElement<HTMLDivElement>
  planet: EngineElement<HTMLDivElement>
  orbitBanner: EngineElement<HTMLDivElement>
  flash: EngineElement<HTMLDivElement>
  canvas: EngineElement<HTMLCanvasElement>
  countdown: EngineElement<HTMLElement>
  altitude: EngineElement<HTMLElement>
  speed: EngineElement<HTMLElement>
  flightTime: EngineElement<HTMLElement>
  timer: EngineElement<HTMLElement>
  separationTimer: EngineElement<HTMLElement>
  throttleNeedle: EngineElement<HTMLElement>
  throttleTarget: EngineElement<HTMLElement>
  throttleValue: EngineElement<HTMLElement>
  targetThrottleValue: EngineElement<HTMLElement>
  throttleGauge: EngineElement<HTMLDivElement>
  headingValue: EngineElement<HTMLElement>
  headingTargetValue: EngineElement<HTMLElement>
  separationPointer: EngineElement<HTMLElement>
  fpsOverlay: EngineElement<HTMLPreElement>
  qualityReadout: EngineElement<HTMLElement>
}

export interface LaunchEngineOptions {
  phase: LaunchEnginePhase
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
  elements: LaunchEngineElements
  controls: {
    holding: RefObject<boolean>
    steer: RefObject<number>
    throttle: RefObject<number>
    heading: RefObject<number>
    targetStageAngle: number
    separationAngle: RefObject<number>
    safeSamples: RefObject<{ safe: number; total: number; stress: number }>
    turnSamples: RefObject<{ error: number; total: number }>
  }
  onCountdownComplete: () => void
  onCountdownTick: (seconds: number) => void
  onEngineLevel: (level: number) => void
  onPhaseTimeout: (phase: Exclude<LaunchEnginePhase, 'ready' | 'risk-roll' | 'result' | 'failure'>) => void
  onMaxQ: () => void
}

interface Particle {
  kind: 'star' | 'smoke' | 'steam' | 'spark' | 'confetti' | 'debris' | 'shockwave' | 'orbit-pulse'
  x: number
  y: number
  vx: number
  vy: number
  life: number
  lifetime: number
  size: number
  hue: number
}

interface ParticlePool {
  items: Particle[]
  capacity: number
  starCount: number
  activeLimit: number
  nextIndex: number
  width: number
  height: number
  pixelRatio: number
}

const COUNTDOWN_SECONDS = 10
const FRAME_MONITOR_MS = 1000
const READOUT_INTERVAL_MS = 250

function getParticleCount(quality: LaunchQuality, smoothMode: boolean, viewportWidth: number) {
  if (quality === 'low' || smoothMode || viewportWidth <= 760) return 30
  return 60
}

export function useLaunchEngine({
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
}: LaunchEngineOptions) {
  const enginePoolRef = useRef<ParticlePool | null>(null)
  const elementsRef = useRef(elements)
  const controlsRef = useRef(controls)
  const phaseRef = useRef(phase)
  const phaseDoneRef = useRef(phaseDone)
  const callbacksRef = useRef({ onCountdownComplete, onCountdownTick, onEngineLevel, onPhaseTimeout, onMaxQ })
  const totalElapsedRef = useRef(0)
  const launchStartedRef = useRef(false)
  const slowWindowRef = useRef({ startedAt: 0, elapsed: 0, frames: 0, stage: 0 })
  const renderQualityRef = useRef({ smoke: true, shake: true })

  useEffect(() => {
    phaseRef.current = phase
    phaseDoneRef.current = phaseDone
  }, [phase, phaseDone])

  useEffect(() => {
    callbacksRef.current = { onCountdownComplete, onCountdownTick, onEngineLevel, onPhaseTimeout, onMaxQ }
  }, [onCountdownComplete, onCountdownTick, onEngineLevel, onMaxQ, onPhaseTimeout])

  useEffect(() => {
    if (phase !== 'ready') return
    const elements = elementsRef.current
    for (const elementRef of [
      elements.scene, elements.rocket, elements.rocketNose, elements.rocketStageBody, elements.rocketFins,
      elements.flame, elements.flameCore, elements.pad, elements.tower,
      elements.ground, elements.clouds, elements.highClouds, elements.skyDarkness, elements.maxQBanner,
      elements.stage, elements.leftBooster, elements.rightBooster, elements.leftFairing, elements.rightFairing,
      elements.spacecraft, elements.leftSolar, elements.rightSolar, elements.antenna, elements.planet,
      elements.orbitBanner, elements.flash, elements.throttleNeedle, elements.throttleTarget,
      elements.separationPointer,
    ]) {
      if (!elementRef.current) continue
      elementRef.current.style.transform = ''
      elementRef.current.style.opacity = ''
    }
    if (elements.countdown.current) elements.countdown.current.textContent = `T−${COUNTDOWN_SECONDS}`
    if (elements.altitude.current) elements.altitude.current.textContent = '0 km'
    if (elements.speed.current) elements.speed.current.textContent = '0 km/h'
    if (elements.flightTime.current) elements.flightTime.current.textContent = 'T+00s'
    if (elements.timer.current) elements.timer.current.textContent = String(COUNTDOWN_SECONDS)
  }, [phase])

  useEffect(() => {
    const elements = elementsRef.current
    const controls = controlsRef.current
    const throttleRef = controls.throttle
    const headingRef = controls.heading
    const activePhase = phaseRef.current
    const maxQSettle = activePhase === 'throttle' && phaseDoneRef.current
    const terminalSequence = activePhase === 'failure' || activePhase === 'result' || maxQSettle
      || (activePhase === 'separation' && phaseDoneRef.current)
    const playablePhase = activePhase === 'risk-roll'
      || ((activePhase === 'throttle' || activePhase === 'turn' || activePhase === 'separation') && !phaseDoneRef.current)
    if (!terminalSequence && !playablePhase) return

    const canvasElement = elements.canvas.current
    if (!canvasElement) return
    const canvas: HTMLCanvasElement = canvasElement
    const context = canvas.getContext('2d', { alpha: true })

    const poolCount = getParticleCount(quality, smoothMode, window.innerWidth)
    const resetPool = activePhase === 'risk-roll' || !enginePoolRef.current
    if (resetPool) {
      const starCount = Math.min(20, Math.floor(poolCount * 0.35))
      const items: Particle[] = []
      for (let index = 0; index < poolCount; index += 1) {
        const isStar = index < starCount
        items.push({
          kind: isStar ? 'star' : 'smoke',
          x: Math.random() * Math.max(1, window.innerWidth),
          y: isStar ? Math.random() * Math.max(1, window.innerHeight) : -1000,
          vx: 0,
          vy: 0,
          life: isStar ? 1 : 0,
          lifetime: isStar ? 1 : 0,
          size: isStar ? Math.random() * 1.5 + 0.5 : 1,
          hue: isStar ? 180 + Math.random() * 80 : 35,
        })
      }
      enginePoolRef.current = {
        items,
        capacity: poolCount,
        starCount,
        activeLimit: poolCount,
        nextIndex: starCount,
        width: 0,
        height: 0,
        pixelRatio: 1,
      }
      totalElapsedRef.current = 0
      launchStartedRef.current = false
      slowWindowRef.current = { startedAt: 0, elapsed: 0, frames: 0, stage: 0 }
      renderQualityRef.current = { smoke: !smoothMode, shake: !smoothMode }
    }

    const particlePool = enginePoolRef.current
    if (!particlePool) return
    const pool: ParticlePool = particlePool
    if (resetPool) pool.activeLimit = Math.min(pool.capacity, poolCount)
    else pool.activeLimit = Math.min(pool.activeLimit, poolCount)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const allowShake = !smoothMode && !prefersReducedMotion
    const allowHaptics = !smoothMode && !prefersReducedMotion && 'vibrate' in navigator
    const starItems = pool.items.slice(0, pool.starCount)
    const effectItems = pool.items.slice(pool.starCount)
    const timer = elements.timer.current
    const countdown = elements.countdown.current
    const fpsOverlay = elements.fpsOverlay.current
    const qualityReadout = elements.qualityReadout.current
    const runPhase = phaseRef.current
    const phaseWasDone = phaseDoneRef.current
    const phaseDuration = runPhase === 'risk-roll' ? COUNTDOWN_SECONDS
      : runPhase === 'separation' && phaseWasDone ? 2.8
        : runPhase === 'throttle' && phaseWasDone ? 0.8
          : runPhase === 'result' ? 3.2 : 1.8
    const phaseStart = performance.now()
    let phaseElapsed = 0
    let previousFrame = 0
    let lastTimerUpdateAt = 0
    let lastHudUpdateAt = 0
    let lastSkyUpdateAt = 0
    let lastCountdownValue = COUNTDOWN_SECONDS + 1
    let lastParticleAt = 0
    const nextMaxQAt = runPhase === 'throttle' ? 2.5 : Number.POSITIVE_INFINITY
    let maxQSent = false
    let callbackSent = false
    let lastFpsUpdateAt = 0
    let ignitionAt = Number.POSITIVE_INFINITY
    let flashUntil = 0
    let postSeparationElapsed = 0
    let orbitPulseSent = false
    let raf = 0
    let isVisible = !document.hidden
    let monitorStartedAt = 0
    let monitorElapsed = 0
    let monitorFrames = 0
    let displayStartedAt = 0
    let displayFrames = 0

    if (runPhase === 'risk-roll') {
      ignitionAt = COUNTDOWN_SECONDS - 6
      if (countdown) countdown.textContent = `T−${COUNTDOWN_SECONDS}`
      if (timer) timer.textContent = String(COUNTDOWN_SECONDS)
    }
    if (runPhase === 'throttle' && !phaseWasDone) controls.safeSamples.current = { safe: 0, total: 0, stress: 0 }
    if (runPhase === 'turn' && !phaseWasDone) controls.turnSamples.current = { error: 0, total: 0 }
    if (runPhase === 'throttle' && elements.maxQBanner.current) elements.maxQBanner.current.style.opacity = '0'
    if (runPhase === 'failure') {
      flashUntil = phaseStart + 180
      const centerX = pool.width / 2 || window.innerWidth / 2
      const centerY = pool.height / 2 || window.innerHeight / 2
      for (let index = 0; index < 14; index += 1) {
        const angle = Math.PI * 2 * index / 14
        emitParticle(pool, 'debris', centerX, centerY, Math.cos(angle) * 90, Math.sin(angle) * 90, 1.1, 3 + Math.random() * 3, 10)
      }
      emitParticle(pool, 'shockwave', centerX, centerY, 0, 0, 1, 8, 0)
    }
    if (runPhase === 'result') {
      for (let index = 0; index < Math.min(24, pool.activeLimit - pool.starCount); index += 1) {
        emitParticle(pool, 'confetti', Math.random() * window.innerWidth, -10 - Math.random() * window.innerHeight * 0.4, -15 + Math.random() * 30, 60 + Math.random() * 90, 3, 3 + Math.random() * 3, index * 17)
      }
    }

    function resizeCanvas() {
      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.floor(bounds.width))
      const height = Math.max(1, Math.floor(bounds.height))
      const pixelRatio = Math.min(1.5, window.devicePixelRatio || 1)
      if (width === pool.width && height === pool.height && pixelRatio === pool.pixelRatio) return
      pool.width = width
      pool.height = height
      pool.pixelRatio = pixelRatio
      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      for (const star of starItems) {
        star.x = Math.random() * width
        star.y = Math.random() * height
      }
    }

    function drawParticles(delta: number, now: number) {
      resizeCanvas()
      const width = pool.width
      const height = pool.height
      context?.clearRect(0, 0, width, height)
      for (const star of starItems) {
        if (context) {
          context.globalAlpha = 0.35 + (Math.sin(now / 900 + star.x) + 1) * 0.2
          context.fillStyle = `hsl(${star.hue} 70% 85%)`
          context.fillRect(star.x, star.y, star.size, star.size)
        }
        if (phaseRef.current !== 'risk-roll' && phaseRef.current !== 'ready') {
          star.y += delta * (18 + Math.min(80, totalElapsedRef.current * 1.2))
          if (star.y > height) star.y = -4
        }
      }
      if (!context) return
      context.globalAlpha = 1
      const activeEnd = Math.min(pool.activeLimit, effectItems.length + pool.starCount)
      for (let index = pool.starCount; index < activeEnd; index += 1) {
        const particle = pool.items[index]
        if (particle.life <= 0) continue
        particle.life -= delta
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.vy += particle.kind === 'smoke' ? -4 * delta : 24 * delta
        const alpha = Math.max(0, particle.life / particle.lifetime)
        if (particle.kind === 'shockwave' || particle.kind === 'orbit-pulse') {
          const progress = 1 - alpha
          context.strokeStyle = particle.kind === 'orbit-pulse'
            ? `rgba(120, 243, 180, ${alpha})`
            : `rgba(255, 234, 178, ${alpha})`
          context.lineWidth = 3
          context.beginPath()
          const radius = particle.kind === 'orbit-pulse' ? progress * particle.size : progress * Math.max(width, height) * 0.48
          context.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
          context.stroke()
        } else if (particle.kind === 'spark' || particle.kind === 'debris') {
          context.strokeStyle = particle.kind === 'spark'
            ? `hsla(${particle.hue}, 100%, 70%, ${alpha})`
            : `hsla(${particle.hue}, 80%, 75%, ${alpha})`
          context.lineWidth = particle.kind === 'spark' ? 2 : 3
          context.beginPath()
          context.moveTo(particle.x, particle.y)
          context.lineTo(particle.x - particle.vx * 0.035, particle.y - particle.vy * 0.035)
          context.stroke()
        } else {
          context.globalAlpha = alpha
          context.fillStyle = particle.kind === 'confetti'
            ? `hsl(${particle.hue}, 82%, 64%)`
            : particle.kind === 'steam' ? 'rgba(217, 235, 238, .8)' : 'rgba(120, 139, 151, .7)'
          context.beginPath()
          context.arc(particle.x, particle.y, particle.size * (particle.kind === 'smoke' ? 1 + (1 - alpha) : 1), 0, Math.PI * 2)
          context.fill()
          context.globalAlpha = 1
        }
      }
      context.globalAlpha = 1
    }

    function updateScene(delta: number, now: number) {
      const activePhase = phaseRef.current
      const riskElapsed = activePhase === 'risk-roll' ? phaseElapsed : 0
      const ascentElapsed = activePhase === 'throttle' ? phaseElapsed
        : activePhase === 'turn' ? 5 + phaseElapsed
          : activePhase === 'separation' || activePhase === 'result' ? 11 + phaseElapsed
            : 0
      const rise = activePhase === 'risk-roll' ? 0 : Math.min(230, 12 * ascentElapsed + ascentElapsed * ascentElapsed * 3)
      const skyProgress = Math.min(1, ascentElapsed / 15)
      const heading = controls.heading.current
      const rocketX = heading * 0.8
      const rocketY = activePhase === 'risk-roll' ? 0 : -Math.min(18, ascentElapsed * 1.1)
      const ignitionProgress = activePhase === 'risk-roll' ? Math.max(0, Math.min(1, (riskElapsed - ignitionAt) / 0.8))
        : activePhase === 'throttle' || activePhase === 'turn' || activePhase === 'separation' ? 1 : 0
      const thrust = activePhase === 'throttle' ? controls.throttle.current / 100
        : activePhase === 'separation' && phaseDoneRef.current ? 0.58 : 0.78
      const launchIgnition = ignitionProgress * thrust
      const maxQProgress = activePhase === 'throttle' && !phaseDoneRef.current ? Math.max(0, Math.min(1, (phaseElapsed - nextMaxQAt) / 0.2))
        : activePhase === 'turn' && !phaseDoneRef.current ? Math.max(0, Math.min(1, 1 - phaseElapsed / 2))
          : 0
      const shakeScale = allowShake && renderQualityRef.current.shake
        ? (activePhase === 'risk-roll' && riskElapsed >= ignitionAt || activePhase === 'throttle' && maxQProgress > 0 ? 1 : 0) * (0.7 + Math.min(1, payloadRatio)) * 2.2
        : 0
      const shakeX = shakeScale ? (Math.random() - 0.5) * shakeScale : 0
      const shakeY = shakeScale ? (Math.random() - 0.5) * shakeScale : 0

      if (elements.scene.current) elements.scene.current.style.transform = `translate3d(${shakeX}px, ${shakeY}px, 0)`
      if (elements.rocket.current) {
        elements.rocket.current.style.transform = `translate3d(${rocketX}px, ${rocketY}px, 0)`
        elements.rocket.current.style.opacity = activePhase === 'result' ? String(Math.max(0, 1 - phaseElapsed / 1.1)) : '1'
      }
      if (rocketId === 'sls' && activePhase !== 'result' && !(activePhase === 'separation' && phaseDoneRef.current)) {
        if (elements.leftBooster.current) elements.leftBooster.current.style.opacity = '1'
        if (elements.rightBooster.current) elements.rightBooster.current.style.opacity = '1'
      }
      if (elements.flame.current) {
        elements.flame.current.style.transform = `scaleY(${0.42 + launchIgnition * (0.45 + Math.sin(now / 62) * 0.14)})`
        elements.flame.current.style.opacity = String(launchIgnition)
      }
      if (elements.flameCore.current) {
        elements.flameCore.current.style.transform = `scaleY(${0.35 + launchIgnition * (0.65 + Math.sin(now / 41) * 0.2)})`
        elements.flameCore.current.style.opacity = String(launchIgnition * 0.92)
      }
      const padOffset = activePhase === 'risk-roll' ? 0 : Math.min(500, rise * 2.2)
      if (elements.pad.current) {
        elements.pad.current.style.transform = `translate3d(0, ${padOffset}px, 0)`
        elements.pad.current.style.opacity = String(Math.max(0, 1 - padOffset / 450))
      }
      if (elements.tower.current) {
        elements.tower.current.style.transform = `translate3d(-${padOffset * 0.18}px, ${padOffset * 2}px, 0)`
        elements.tower.current.style.opacity = String(Math.max(0, 1 - padOffset / 420))
      }
      if (elements.ground.current) elements.ground.current.style.transform = `translate3d(0, ${padOffset * 1.5}px, 0)`
      if (elements.clouds.current) elements.clouds.current.style.transform = `translate3d(0, ${ascentElapsed * 23}px, 0)`
      if (elements.highClouds.current) elements.highClouds.current.style.transform = `translate3d(0, ${ascentElapsed * 11}px, 0)`
      if (elements.scene.current && now - lastSkyUpdateAt >= READOUT_INTERVAL_MS) {
        lastSkyUpdateAt = now
        if (elements.skyDarkness.current) elements.skyDarkness.current.style.opacity = String(skyProgress)
        const altitudeKm = Math.max(0, Math.round(ascentElapsed * ascentElapsed * 0.65))
        const speedKmh = Math.max(0, Math.round(ascentElapsed * 920 + (activePhase === 'turn' ? 1100 : 0)))
        if (elements.altitude.current) elements.altitude.current.textContent = `${altitudeKm.toLocaleString()} km`
        if (elements.speed.current) elements.speed.current.textContent = `${speedKmh.toLocaleString()} km/h`
        if (elements.flightTime.current) elements.flightTime.current.textContent = `T+${Math.floor(totalElapsedRef.current).toString().padStart(2, '0')}s`
      }
      if (elements.maxQBanner.current) {
        const bannerAlpha = activePhase === 'throttle' ? maxQProgress > 0 ? Math.max(0, 1 - Math.max(0, phaseElapsed - nextMaxQAt - 0.2) / 1.8) : 0 : 0
        elements.maxQBanner.current.style.opacity = String(bannerAlpha)
        elements.maxQBanner.current.style.transform = `translate3d(-50%, ${bannerAlpha ? 0 : -8}px, 0)`
      }
      if (elements.flash.current) elements.flash.current.style.opacity = String(Math.max(0, Math.min(1, (flashUntil - now) / 180)))

      if (activePhase === 'separation' && phaseDoneRef.current) {
        postSeparationElapsed += delta
        if (!orbitPulseSent && postSeparationElapsed >= 2.1) {
          orbitPulseSent = true
          emitParticle(pool, 'orbit-pulse', widthOf(pool) * 0.5, heightOf(pool) * 0.42, 0, 0, 1.1, 96, 145)
        }
        const boosterProgress = Math.max(0, Math.min(1, postSeparationElapsed / 0.5))
        const stageStart = rocketId === 'sls' ? 0.55 : 0
        const fairingStart = rocketId === 'sls' ? 1.25 : 0.65
        const revealStart = rocketId === 'sls' ? 1.85 : 1.1
        const deployStart = rocketId === 'sls' ? 2.3 : 1.7
        const stageProgress = Math.max(0, Math.min(1, (postSeparationElapsed - stageStart) / 0.75))
        const fairingProgress = Math.max(0, Math.min(1, (postSeparationElapsed - fairingStart) / 0.8))
        const revealProgress = Math.max(0, Math.min(1, (postSeparationElapsed - revealStart) / 0.8))
        const deployProgress = Math.max(0, Math.min(1, (postSeparationElapsed - deployStart) / 0.5))
        if (elements.stage.current) {
          elements.stage.current.style.transform = `translate3d(-${stageProgress * 38}px, ${stageProgress * 120}px, 0) rotate(${stageProgress * -40}deg)`
          elements.stage.current.style.opacity = String(1 - stageProgress)
        }
        if (elements.rocketStageBody.current) elements.rocketStageBody.current.style.opacity = String(1 - stageProgress)
        if (elements.rocketFins.current) elements.rocketFins.current.style.opacity = String(1 - stageProgress)
        if (elements.rocketNose.current) elements.rocketNose.current.style.opacity = String(1 - fairingProgress)
        if (elements.leftBooster.current) {
          elements.leftBooster.current.style.transform = `translate3d(-${boosterProgress * 80}px, ${boosterProgress * 90}px, 0) rotate(${boosterProgress * -30}deg)`
          elements.leftBooster.current.style.opacity = String(1 - boosterProgress)
        }
        if (elements.rightBooster.current) {
          elements.rightBooster.current.style.transform = `translate3d(${boosterProgress * 80}px, ${boosterProgress * 90}px, 0) rotate(${boosterProgress * 30}deg)`
          elements.rightBooster.current.style.opacity = String(1 - boosterProgress)
        }
        if (elements.leftFairing.current) {
          elements.leftFairing.current.style.transform = `translate3d(-${fairingProgress * 95}px, ${fairingProgress * 26}px, 0) rotate(${fairingProgress * -28}deg)`
          elements.leftFairing.current.style.opacity = String(1 - fairingProgress)
        }
        if (elements.rightFairing.current) {
          elements.rightFairing.current.style.transform = `translate3d(${fairingProgress * 95}px, ${fairingProgress * 26}px, 0) rotate(${fairingProgress * 28}deg)`
          elements.rightFairing.current.style.opacity = String(1 - fairingProgress)
        }
        if (elements.spacecraft.current) {
          elements.spacecraft.current.style.transform = `translate3d(0, ${revealProgress * -12}px, 0) scale(${0.82 + revealProgress * 0.18})`
          elements.spacecraft.current.style.opacity = String(revealProgress)
        }
        if (elements.leftSolar.current) elements.leftSolar.current.style.transform = `scaleX(${deployProgress})`
        if (elements.rightSolar.current) elements.rightSolar.current.style.transform = `scaleX(${deployProgress})`
        if (elements.antenna.current) elements.antenna.current.style.transform = `scale(${0.3 + deployProgress * 0.7})`
        if (elements.planet.current) {
          elements.planet.current.style.transform = `translate3d(0, ${Math.max(0, 110 - postSeparationElapsed * 110)}px, 0)`
          elements.planet.current.style.opacity = String(Math.max(0, Math.min(1, (postSeparationElapsed - 1.4) / 0.9)))
        }
        if (elements.orbitBanner.current) {
          const bannerOpacity = Math.max(0, Math.min(1, (postSeparationElapsed - 2.1) / 0.35))
          elements.orbitBanner.current.style.opacity = String(bannerOpacity)
          elements.orbitBanner.current.style.transform = `translate3d(-50%, ${bannerOpacity ? 0 : -10}px, 0)`
        }
      } else if (activePhase === 'result') {
        const orbitProgress = Math.max(0, Math.min(1, phaseElapsed / 1.5))
        if (elements.spacecraft.current) {
          elements.spacecraft.current.style.transform = `translate3d(0, ${-12 - orbitProgress * 55}px, 0) scale(${1 - orbitProgress * 0.28})`
          elements.spacecraft.current.style.opacity = '1'
        }
        if (elements.planet.current) {
          elements.planet.current.style.transform = `translate3d(0, ${Math.max(0, 100 - phaseElapsed * 65)}px, 0)`
          elements.planet.current.style.opacity = String(Math.min(1, phaseElapsed / 1.1))
        }
        if (elements.orbitBanner.current) {
          elements.orbitBanner.current.style.opacity = String(Math.min(1, phaseElapsed / 0.4))
          elements.orbitBanner.current.style.transform = `translate3d(-50%, 0, 0)`
        }
      }

      if (activePhase === 'risk-roll' && launchIgnition > 0 && renderQualityRef.current.smoke && now - lastParticleAt >= 100) {
        lastParticleAt = now
        emitParticle(pool, 'steam', widthOf(pool) * 0.5, heightOf(pool) * 0.74, (Math.random() - 0.5) * 12, -14 - Math.random() * 9, 1.1, 3 + Math.random() * 2, 0)
      }
      if ((activePhase === 'throttle' || activePhase === 'turn') && launchIgnition > 0 && renderQualityRef.current.smoke && now - lastParticleAt >= 75) {
        lastParticleAt = now
        emitParticle(pool, 'smoke', widthOf(pool) * 0.5, heightOf(pool) * 0.59 + rise * 0.25, (Math.random() - 0.5) * 20, -8 - Math.random() * 14, 1.4, 3 + Math.random() * 3, 0)
      }
      if (activePhase === 'throttle' && maxQProgress > 0 && !maxQSent) {
        maxQSent = true
        callbacksRef.current.onMaxQ()
        if (allowHaptics) navigator.vibrate?.(35)
      }
      if (activePhase === 'throttle' && maxQProgress > 0 && Math.abs(controls.throttle.current - 58) > safeHalfWidth * 1.8 && now - lastParticleAt >= 90) {
        lastParticleAt = now
        emitParticle(pool, 'spark', widthOf(pool) * 0.5 + rocketX, heightOf(pool) * 0.45 + rocketY, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, 0.5, 2, 8)
      }
      if (activePhase === 'throttle' && phaseDoneRef.current && now - lastParticleAt >= 90) {
        const samples = controls.safeSamples.current
        const safeRatio = samples.total ? samples.safe / samples.total : 0
        const stressRatio = samples.stress / Math.max(1, samples.total)
        if (safeRatio < 0.48 || stressRatio >= 0.12) {
          lastParticleAt = now
          emitParticle(pool, 'spark', widthOf(pool) * 0.5 + rocketX, heightOf(pool) * 0.45 + rocketY, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, 0.5, 2, 8)
        }
      }
    }

    function frame(now: number) {
      if (!isVisible || document.hidden) {
        previousFrame = 0
        return
      }
      raf = window.requestAnimationFrame(frame)
      if (!previousFrame) previousFrame = now
      const delta = Math.min(0.05, Math.max(0, (now - previousFrame) / 1000))
      previousFrame = now
      phaseElapsed += delta
      const activePhase = phaseRef.current
      if (launchStartedRef.current) totalElapsedRef.current += delta
      const elapsedMilliseconds = phaseElapsed * 1000
      if (activePhase === 'risk-roll') {
        const secondsRemaining = Math.max(0, Math.ceil(COUNTDOWN_SECONDS - phaseElapsed))
        if (secondsRemaining !== lastCountdownValue) {
          lastCountdownValue = secondsRemaining
          callbacksRef.current.onCountdownTick(secondsRemaining)
          if (countdown) countdown.textContent = secondsRemaining === 0 ? 'LIFTOFF!' : `T−${secondsRemaining}`
        }
        if (secondsRemaining === 0) {
          launchStartedRef.current = true
          if (!prefersReducedMotion) flashUntil = now + 180
        }
        if (secondsRemaining === 6 && allowHaptics) navigator.vibrate?.(22)
        if (phaseElapsed >= COUNTDOWN_SECONDS && !callbackSent) {
          callbackSent = true
          callbacksRef.current.onCountdownComplete()
        }
      } else if (((activePhase === 'throttle' || activePhase === 'turn') && !phaseWasDone) || (activePhase === 'separation' && !phaseWasDone)) {
        const remaining = Math.max(0, Math.ceil(phaseSeconds - phaseElapsed))
        const readoutUpdate = now - lastHudUpdateAt >= READOUT_INTERVAL_MS
        if (readoutUpdate) lastHudUpdateAt = now
        if (now - lastTimerUpdateAt >= READOUT_INTERVAL_MS) {
          lastTimerUpdateAt = now
          if (timer) timer.textContent = String(remaining)
          if (elements.separationTimer.current) elements.separationTimer.current.textContent = String(remaining)
        }
        if (activePhase === 'throttle') {
          const target = 57 + Math.sin(phaseElapsed * 1.25) * 8 + Math.sin(phaseElapsed * 2.1) * 2
          const nextThrottle = autoPilot
            ? target
            : Math.max(0, Math.min(100, throttleRef.current + (controls.holding.current ? 2.1 * response : -0.45) * delta * 30))
          throttleRef.current = nextThrottle
          if (elements.throttleNeedle.current) elements.throttleNeedle.current.style.transform = `translateX(calc(${nextThrottle}% - 50%))`
          if (elements.throttleTarget.current) elements.throttleTarget.current.style.transform = `translateX(calc(${target}% - 50%))`
          if (readoutUpdate) {
            if (elements.throttleGauge.current) elements.throttleGauge.current.setAttribute('aria-valuenow', String(Math.round(nextThrottle)))
            if (elements.throttleValue.current) elements.throttleValue.current.textContent = `${Math.round(nextThrottle)}%`
            if (elements.targetThrottleValue.current) elements.targetThrottleValue.current.textContent = String(Math.round(target))
              callbacksRef.current.onEngineLevel(nextThrottle / 100)
          }
          controls.safeSamples.current.total += 1
          const error = Math.abs(nextThrottle - target)
          if (error <= safeHalfWidth) controls.safeSamples.current.safe += 1
          if (nextThrottle > target + safeHalfWidth * 1.8) controls.safeSamples.current.stress += 1
        } else if (activePhase === 'turn') {
          const target = 12 + Math.sin(phaseElapsed * 0.72) * 13 + Math.sin(phaseElapsed * 1.42) * 3
          const nextHeading = autoPilot
            ? target
            : Math.max(-45, Math.min(45, headingRef.current + controls.steer.current * response * 3.2 * delta * 30))
          headingRef.current = nextHeading
          if (readoutUpdate) {
            if (elements.headingValue.current) elements.headingValue.current.textContent = String(Math.round(nextHeading))
            if (elements.headingTargetValue.current) elements.headingTargetValue.current.textContent = String(Math.round(target))
          }
          controls.turnSamples.current.total += 1
          controls.turnSamples.current.error += Math.abs(nextHeading - target)
        } else {
          controls.separationAngle.current = (phaseElapsed * 168) % 360
          if (elements.separationPointer.current) {
            elements.separationPointer.current.style.setProperty('--separation-angle', `${controls.separationAngle.current}deg`)
          }
        }
        if (phaseElapsed >= phaseSeconds && !callbackSent) {
          callbackSent = true
          callbacksRef.current.onPhaseTimeout(activePhase)
        }
      } else if (activePhase === 'separation' && phaseWasDone && phaseElapsed >= phaseDuration) {
        cancelAnimationFrame(raf)
        drawParticles(delta, now)
        return
      } else if (activePhase === 'throttle' && phaseWasDone && phaseElapsed >= phaseDuration) {
        cancelAnimationFrame(raf)
        drawParticles(delta, now)
        return
      } else if ((activePhase === 'result' || activePhase === 'failure') && elapsedMilliseconds >= phaseDuration * 1000) {
        cancelAnimationFrame(raf)
        drawParticles(delta, now)
        return
      }

      updateScene(delta, now)
      drawParticles(delta, now)
      if (!monitorStartedAt) monitorStartedAt = now
      if (!displayStartedAt) displayStartedAt = now
      monitorElapsed += delta * 1000
      monitorFrames += 1
      displayFrames += 1
      if (now - lastFpsUpdateAt >= READOUT_INTERVAL_MS) {
        lastFpsUpdateAt = now
        if (fpsOverlay && fpsOverlay.style.display !== 'none' && process.env.NODE_ENV !== 'production') {
          const elapsed = Math.max(0.001, (now - displayStartedAt) / 1000)
          fpsOverlay.textContent = `FPS ${Math.round(displayFrames / elapsed)} · ${(elapsed * 1000 / displayFrames).toFixed(1)} ms`
        }
      }
      if (now - monitorStartedAt >= FRAME_MONITOR_MS) {
        const averageFrameMs = monitorElapsed / Math.max(1, monitorFrames)
        monitorStartedAt = now
        monitorElapsed = 0
        monitorFrames = 0
        displayStartedAt = now
        displayFrames = 0
        if (averageFrameMs > 24) {
            const slow = slowWindowRef.current
            if (!slow.startedAt) slow.startedAt = now
            slow.elapsed += FRAME_MONITOR_MS
            slow.frames += 1
            if (slow.elapsed >= FRAME_MONITOR_MS && slow.stage === 0) {
              pool.activeLimit = Math.max(pool.starCount + 4, Math.floor(pool.activeLimit / 2))
              slow.stage = 1
            } else if (slow.elapsed >= FRAME_MONITOR_MS * 2 && slow.stage === 1) {
              renderQualityRef.current.smoke = false
              slow.stage = 2
            } else if (slow.elapsed >= FRAME_MONITOR_MS * 3 && slow.stage === 2) {
              renderQualityRef.current.shake = false
              slow.stage = 3
            }
            if (qualityReadout) qualityReadout.textContent = slow.stage >= 3 ? 'QUALITY LOW' : `QUALITY ${quality.toUpperCase()} · AUTO-REDUCED`
        } else {
          slowWindowRef.current.startedAt = 0
          slowWindowRef.current.elapsed = 0
          slowWindowRef.current.frames = 0
        }
      }
    }

    function onVisibilityChange() {
      isVisible = !document.hidden
      previousFrame = 0
      if (isVisible) raf = window.requestAnimationFrame(frame)
      else window.cancelAnimationFrame(raf)
    }

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(canvas)
    document.addEventListener('visibilitychange', onVisibilityChange)
    resizeCanvas()
    raf = window.requestAnimationFrame(frame)
    if (runPhase === 'risk-roll' && allowHaptics) navigator.vibrate?.(15)

    return () => {
      window.cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      resizeObserver.disconnect()
      context?.clearRect(0, 0, pool.width, pool.height)
    }
  }, [phase, phaseDone, phaseSeconds, payloadRatio, response, safeHalfWidth, quality, smoothMode, autoPilot, rocketId, missionId])

  return { totalElapsedRef }
}

function emitParticle(
  pool: ParticlePool,
  kind: Particle['kind'],
  x: number,
  y: number,
  vx: number,
  vy: number,
  lifetime: number,
  size: number,
  hue: number,
) {
  const start = pool.nextIndex
  const limit = Math.max(pool.starCount + 1, pool.activeLimit)
  const index = pool.starCount + ((start - pool.starCount + limit - pool.starCount) % (limit - pool.starCount))
  const particle = pool.items[index]
  particle.kind = kind
  particle.x = x
  particle.y = y
  particle.vx = vx
  particle.vy = vy
  particle.life = lifetime
  particle.lifetime = lifetime
  particle.size = size
  particle.hue = hue || 25 + Math.random() * 35
  pool.nextIndex = index + 1 >= limit ? pool.starCount : index + 1
}

function widthOf(pool: ParticlePool) {
  return pool.width || window.innerWidth
}

function heightOf(pool: ParticlePool) {
  return pool.height || window.innerHeight
}
