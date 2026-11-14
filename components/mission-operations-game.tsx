'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, ArrowDownToLine, BatteryCharging, Check, Clock3, Moon, RadioTower, Shield, Sun, Zap } from 'lucide-react'
import type { MissionConfiguration, MissionEstimate, MissionProfile, SpacecraftSize } from './mission-data'
import { getAntennaOptions, getBatteryOptions, getInstrument, getSolarOptions } from './mission-data'
import type { MissionOperationsResult, OperationsResponse, SimulatedMissionEvent } from './mission-simulation'
import { resolveOperationsEvent } from './mission-simulation'
import { PrimaryButton } from './mission-ui'
import { useGameAudio } from './game-audio'
import { CrewRadio, type RadioSpeaker } from './game-companions'
import { MissionCanvasErrorBoundary } from './mission-canvas-error-boundary'

const MissionOperationsScene = dynamic(() => import('./mission-operations-scene').then((module) => module.MissionOperationsScene), {
  ssr: false,
  loading: () => <div className="operations-scene-background" aria-hidden="true" />,
})

const MAX_OPERATIONS_DAYS = 4
const SUNLIGHT_SECONDS = 2
const ECLIPSE_SECONDS = 2
const STATION_WINDOW_SECONDS = 1.4

type OperationsPhase = 'idle' | 'sunlight' | 'eclipse' | 'downlink'

const RESPONSE_LABELS: Record<OperationsResponse, string> = {
  brace: 'BRACE',
  'safe-mode': 'SAFE MODE',
  'reroute-power': 'REROUTE POWER',
  missed: 'NO RESPONSE',
}

export function MissionOperationsGame({ mission, size, configuration, estimate, events, threeDEnabled, onComplete, onNovaMessage }: {
  mission: MissionProfile
  size: SpacecraftSize
  configuration: MissionConfiguration
  estimate: MissionEstimate
  events: SimulatedMissionEvent[]
  threeDEnabled: boolean
  onComplete: (events: SimulatedMissionEvent[], result: MissionOperationsResult) => void
  onNovaMessage: (message: string) => void
}) {
  const { play } = useGameAudio()
  const solar = getSolarOptions(size).find((option) => option.id === configuration.solarId) ?? getSolarOptions(size)[0]
  const battery = getBatteryOptions(size).find((option) => option.id === configuration.batteryId) ?? getBatteryOptions(size)[0]
  const antenna = getAntennaOptions(size).find((option) => option.id === configuration.antennaId) ?? getAntennaOptions(size)[0]
  const designScienceData = configuration.instrumentIds.reduce((total, id) => total + (getInstrument(id)?.dataGb ?? 0), 0)
  const cycleDuration = SUNLIGHT_SECONDS + ECLIPSE_SECONDS + configuration.stations * STATION_WINDOW_SECONDS
  const capacityFactor = Math.max(0.7, Math.min(1.7, Math.sqrt(battery.wattHours! / (size.family === 'cubesat' ? 10 : size.family === 'large' ? 900 : 50))))

  const [day, setDay] = useState(1)
  const [phase, setPhase] = useState<OperationsPhase>('idle')
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0)
  const [windowNumber, setWindowNumber] = useState(0)
  const [windowDownloadGb, setWindowDownloadGb] = useState(0)
  const [batteryPercent, setBatteryPercent] = useState(100)
  const [scienceDataGb, setScienceDataGb] = useState(0)
  const [dailyScienceData, setDailyScienceData] = useState<number[]>([])
  const [downloadedDataGb, setDownloadedDataGb] = useState(0)
  const [activeInstrumentIds, setActiveInstrumentIds] = useState(() => new Set(configuration.instrumentIds))
  const [eventResults, setEventResults] = useState(events)
  const [eventIndex, setEventIndex] = useState(0)
  const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null)
  const [eventSecondsLeft, setEventSecondsLeft] = useState(3)
  const [isDayRunning, setIsDayRunning] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [safeMode, setSafeMode] = useState(false)
  const [reroutePower, setReroutePower] = useState(false)
  const [missionComplete, setMissionComplete] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const batteryRef = useRef(100)
  const scienceRef = useRef(0)
  const downloadedRef = useRef(0)
  const activeInstrumentIdsRef = useRef(activeInstrumentIds)
  const isDownloadingRef = useRef(false)
  const safeModeRef = useRef(false)
  const reroutePowerRef = useRef(false)
  const activeEventIndexRef = useRef(activeEventIndex)
  const dayScienceStartRef = useRef(0)

  const activeInstruments = useMemo(() => configuration.instrumentIds
    .map(getInstrument)
    .filter((instrument): instrument is NonNullable<typeof instrument> => instrument !== undefined && activeInstrumentIds.has(instrument.id)), [activeInstrumentIds, configuration.instrumentIds])
  const activeInstrumentPower = activeInstruments.reduce((total, instrument) => total + instrument.powerW, 0)
  const activePowerDemand = size.busPowerW + antenna.powerW + activeInstrumentPower
  const powerBalance = solar.watts! - activePowerDemand
  const producedSciencePoints = Math.round(estimate.sciencePoints * Math.min(1, scienceDataGb / Math.max(1, estimate.dataTargetGb)))
  const currentEvent = activeEventIndex === null ? null : eventResults[activeEventIndex] ?? null
  const downlinkAvailable = phase === 'downlink' && isDayRunning

  useEffect(() => {
    if (!currentEvent) return
    play('alert')
    if ('vibrate' in navigator) navigator.vibrate(90)
  }, [activeEventIndex, currentEvent, play])

  batteryRef.current = batteryPercent
  scienceRef.current = scienceDataGb
  downloadedRef.current = downloadedDataGb
  activeInstrumentIdsRef.current = activeInstrumentIds
  isDownloadingRef.current = isDownloading
  safeModeRef.current = safeMode
  reroutePowerRef.current = reroutePower
  activeEventIndexRef.current = activeEventIndex

  const startDayCycle = useCallback(() => {
    dayScienceStartRef.current = scienceRef.current
    setWindowNumber(0)
    setWindowDownloadGb(0)
    setPhaseSecondsLeft(cycleDuration)
    setPhase('sunlight')
    setIsDayRunning(true)
    setStatusMessage(`Day ${day} underway. Solar charging, eclipse, then ${configuration.stations} station pass${configuration.stations === 1 ? '' : 'es'}.`)
  }, [configuration.stations, cycleDuration, day])

  const resolveEvent = useCallback((response: OperationsResponse, targetIndex: number | null) => {
    if (targetIndex === null) return
    const event = eventResults[targetIndex]
    if (!event) return
    setEventResults((current) => current.map((item, index) => index === targetIndex ? resolveOperationsEvent(item, response) : item))
    if (response === 'safe-mode') setSafeMode(true)
    if (response === 'reroute-power') setReroutePower(true)
    setActiveEventIndex(null)
    setEventIndex(targetIndex + 1)
    setStatusMessage(`${RESPONSE_LABELS[response]} · ${event.title}: ${response === 'missed' ? 'decision window expired.' : 'crew response applied.'}`)
    startDayCycle()
  }, [eventResults, startDayCycle])

  useEffect(() => {
    if (activeEventIndex === null) return
    const started = Date.now()
    const timer = window.setInterval(() => {
      const left = Math.max(0, 3 - (Date.now() - started) / 1000)
      setEventSecondsLeft(Math.ceil(left))
      if (left <= 0) {
        window.clearInterval(timer)
        resolveEvent('missed', activeEventIndex)
      }
    }, 60)
    return () => window.clearInterval(timer)
  }, [activeEventIndex, resolveEvent])

  useEffect(() => {
    if (!isDayRunning) return
    const started = Date.now()
    let previousElapsed = 0
    const timer = window.setInterval(() => {
      const elapsed = Math.min(cycleDuration, (Date.now() - started) / 1000)
      const delta = Math.min(0.2, Math.max(0, elapsed - previousElapsed))
      previousElapsed = elapsed
      const sunlightEnds = SUNLIGHT_SECONDS
      const eclipseEnds = sunlightEnds + ECLIPSE_SECONDS
      const phaseAtTime: OperationsPhase = elapsed < sunlightEnds ? 'sunlight' : elapsed < eclipseEnds ? 'eclipse' : elapsed < cycleDuration ? 'downlink' : 'idle'
      setPhase(phaseAtTime)
      setPhaseSecondsLeft(Math.max(0, Math.ceil(cycleDuration - elapsed)))

      const demand = (size.busPowerW + antenna.powerW + (safeModeRef.current ? 0 : activeInstruments.reduce((total, instrument) => total + instrument.powerW, 0))) * (safeModeRef.current ? 0.72 : reroutePowerRef.current ? 0.76 : 1)
      const solarWatts = solar.watts!
      if (phaseAtTime === 'sunlight') {
        const charge = ((solarWatts - demand) / Math.max(1, solarWatts)) * 8 * delta / capacityFactor
        batteryRef.current = Math.max(0, Math.min(100, batteryRef.current + charge))
        setBatteryPercent(batteryRef.current)
      } else if (phaseAtTime === 'eclipse') {
        const drain = (demand / Math.max(1, solarWatts)) * 5 * delta / capacityFactor
        batteryRef.current = Math.max(0, batteryRef.current - drain)
        setBatteryPercent(batteryRef.current)
      }

      const powerAvailable = phaseAtTime === 'sunlight' ? solarWatts >= demand : batteryRef.current > 0
      const selectedData = configuration.instrumentIds.reduce((total, id) => total + (getInstrument(id)?.dataGb ?? 0), 0)
      const runningData = safeModeRef.current || !powerAvailable ? 0 : activeInstrumentIdsRef.current.size
        ? estimate.scienceDataGb / MAX_OPERATIONS_DAYS * (selectedData ? [...activeInstrumentIdsRef.current].reduce((total, id) => total + (getInstrument(id)?.dataGb ?? 0), 0) / selectedData : 0) * delta / cycleDuration
        : 0
      scienceRef.current = Math.min(estimate.scienceDataGb, scienceRef.current + runningData)
      setScienceDataGb(scienceRef.current)

      if (phaseAtTime === 'downlink') {
        const window = Math.min(configuration.stations, Math.floor((elapsed - eclipseEnds) / STATION_WINDOW_SECONDS) + 1)
        if (window !== windowNumber) {
          setWindowNumber(window)
          setWindowDownloadGb(0)
        }
        if (isDownloadingRef.current && scienceRef.current > downloadedRef.current) {
          const received = Math.min(antenna.gbPerDay! / 24 * 8 * delta, scienceRef.current - downloadedRef.current)
          downloadedRef.current += received
          setDownloadedDataGb(downloadedRef.current)
          setWindowDownloadGb((current) => current + received)
        }
      } else if (windowNumber !== 0) {
        setWindowNumber(0)
      }

      if (elapsed >= cycleDuration) {
        window.clearInterval(timer)
        isDownloadingRef.current = false
        setIsDownloading(false)
        setIsDayRunning(false)
        setPhase('idle')
        setPhaseSecondsLeft(0)
        setSafeMode(false)
        setReroutePower(false)
        setStatusMessage(`Day ${day} complete · ${Math.round(scienceRef.current)} GB generated · ${Math.round(downloadedRef.current)} GB downlinked.`)
        setDailyScienceData((current) => [...current, Math.max(0, scienceRef.current - dayScienceStartRef.current)])
        if (day >= MAX_OPERATIONS_DAYS) setMissionComplete(true)
        else setDay(day + 1)
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [activeInstruments, antenna.gbPerDay, capacityFactor, configuration.instrumentIds, configuration.stations, cycleDuration, day, estimate.scienceDataGb, isDayRunning, reroutePower, safeMode, size.busPowerW, solar.watts])

  function beginDay() {
    if (isDayRunning || activeEventIndex !== null || missionComplete) return
    if (eventIndex < eventResults.length) {
      setEventSecondsLeft(3)
      setActiveEventIndex(eventIndex)
      return
    }
    startDayCycle()
  }

  function toggleInstrument(id: string) {
    if (isDayRunning || safeMode) return
    setActiveInstrumentIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setDownloadHold(value: boolean) {
    setIsDownloading(value)
    isDownloadingRef.current = value
  }

  function finishOperations() {
    onComplete(eventResults, {
      daysCompleted: Math.min(day, MAX_OPERATIONS_DAYS),
      scienceDataGb: scienceDataGb,
      downloadedDataGb,
      batteryPercent: Math.round(batteryPercent),
      dailyScienceData,
      analysisPoints: 0,
      quizCorrect: false,
    })
  }

  const energyClass = batteryPercent < 25 ? 'operations-meter-low' : batteryPercent < 50 ? 'operations-meter-watch' : ''
  const scienceProgress = Math.min(100, scienceDataGb / Math.max(1, estimate.dataTargetGb) * 100)
  const downlinkProgress = Math.min(100, downloadedDataGb / Math.max(1, estimate.dataTargetGb) * 100)
  const phaseLabel = phase === 'sunlight' ? 'SUNLIGHT' : phase === 'eclipse' ? 'EARTH SHADOW' : phase === 'downlink' ? 'SEND DATA' : 'READY'
  const missionDay = missionComplete ? 120 : Math.min(120, (day - 1) * (120 / MAX_OPERATIONS_DAYS) + (isDayRunning ? Math.max(1, 30 - Math.ceil(phaseSecondsLeft / cycleDuration * 30)) : 1))
  const eventRadio: Record<string, string> = {
    'solar-flare': 'Uh-oh! A solar flare! Choose how to help!',
    'antenna-glitch': 'Our messages are stuck! Pick a way to help!',
    micrometeoroid: 'Space rocks hit us! Choose how to protect our ship!',
    'data-overload': 'Too many messages! Pick what we should do!',
  }
  const radioMessage: { speaker: RadioSpeaker; message: string } = currentEvent
    ? { speaker: 'Mission Control', message: eventRadio[currentEvent.id] ?? 'A space surprise! Choose how to help!' }
    : missionComplete
      ? { speaker: 'Robot Pilot', message: 'Great job! Our science made it home!' }
      : phase === 'sunlight'
        ? { speaker: 'Mission Control', message: 'The Sun is charging our ship!' }
        : phase === 'eclipse'
          ? { speaker: 'Robot Pilot', message: "Earth's shadow is dark. Save our battery!" }
          : phase === 'downlink'
            ? { speaker: 'Mission Control', message: 'A station is below. Hold DOWNLOAD!' }
            : scienceProgress >= 100
              ? { speaker: 'Nova', message: 'Amazing science! Keep sending it home!' }
              : { speaker: 'Nova', message: 'Switch off tools you do not need, then start a day.' }
  const guideMessage = currentEvent
    ? 'Tap BRACE, SAFE MODE, or REROUTE POWER to help.'
    : missionComplete
      ? 'Great job! Tap to see your stars and sticker.'
      : phase === 'sunlight'
        ? 'The Sun is filling our battery. Watch it glow!'
        : phase === 'eclipse'
          ? "Earth's shadow is here. Turn off tools to save power!"
          : phase === 'downlink'
            ? 'Hold DOWNLOAD while the station passes below.'
            : scienceProgress >= 100
              ? 'You made enough science! Send it home now.'
              : 'Switch off tools you do not need, then start a day.'

  useEffect(() => {
    onNovaMessage(guideMessage)
  }, [guideMessage, onNovaMessage])

  return <main className="operations-game">
    {threeDEnabled ? <MissionCanvasErrorBoundary fallback={<div className="operations-scene-background operations-scene-fallback" aria-hidden="true"><i /><b /></div>}><MissionOperationsScene /></MissionCanvasErrorBoundary> : <div className="operations-scene-background operations-scene-fallback" aria-hidden="true"><i /><b /></div>}
    <header className="operations-topbar"><span><RadioTower aria-hidden="true" /> SPACE ADVENTURE · {mission.shortName.toUpperCase()}</span><span>DAY {missionDay} OF 120 <i /> {phaseLabel}</span></header>
    <CrewRadio speaker={radioMessage.speaker} message={radioMessage.message} />
    <div className="operations-grid">
      <section className="operations-console">
        <div className="operations-console-heading"><span><small>POWER AND TOOLS</small><h1>Keep our ship going!</h1></span><span className="operations-day-chip">DAY {missionDay} OF 120</span></div>
        <div className={`operations-battery ${energyClass}`} role="meter" aria-label="Battery charge" aria-valuenow={Math.round(batteryPercent)} aria-valuemin={0} aria-valuemax={100}>
          <div className="operations-meter-label"><span><BatteryCharging aria-hidden="true" /> POWER <small>(BATTERY)</small></span><strong>{Math.round(batteryPercent)}%</strong></div>
          <div className="operations-meter-track"><i style={{ width: `${batteryPercent}%` }} /></div>
          <small>{phase === 'eclipse' ? "Earth's shadow is here. Our battery is helping." : 'The Sun fills the battery when our tools are quiet.'}</small>
        </div>
        <div className="operations-power-summary"><span><b>POWER LEFT</b><strong className={powerBalance >= 0 ? 'operations-power-good' : 'operations-power-low'}>{powerBalance >= 0 ? '+' : ''}{Math.round(powerBalance)} W</strong></span><span><b>TOOLS ON</b><strong>{activeInstruments.length} / {configuration.instrumentIds.length}</strong></span><span><b>SCIENCE POINTS</b><strong>{producedSciencePoints} / {estimate.sciencePoints}</strong></span></div>
        <div className="operations-section-heading"><span><Zap aria-hidden="true" /> SCIENCE TOOLS</span><small>Tap a tool to turn it on or off.</small></div>
        <div className="operations-instrument-list">{configuration.instrumentIds.map((id) => {
          const instrument = getInstrument(id)
          if (!instrument) return null
          const isOn = activeInstrumentIds.has(id)
          return <button key={id} type="button" className={`operations-instrument ${isOn ? 'operations-instrument-on' : ''}`} aria-pressed={isOn} disabled={isDayRunning || safeMode} onClick={() => toggleInstrument(id)}>
            <span className="operations-switch" aria-hidden="true"><i /></span><span><b>{instrument.shortName}</b><small>{isOn ? 'On · making science' : 'Off · saving power'}</small></span><strong>{isOn ? 'ON' : 'OFF'}</strong>
          </button>
        })}</div>
        <div className={`operations-science-meter ${scienceProgress >= 100 ? 'operations-science-complete' : ''}`}>
          <div><span><TargetIcon /> SCIENCE GOAL</span><strong>{Math.round(scienceDataGb)} / {estimate.dataTargetGb} GB</strong></div>
          <div className="operations-meter-track"><i style={{ width: `${scienceProgress}%` }} /></div>
          <small>{scienceDataGb.toFixed(1)} GB collected · {Math.round(downlinkProgress)}% sent home.</small>
        </div>
        {safeMode && <p className="operations-safe-mode-note"><Shield aria-hidden="true" /> SAFE MODE ACTIVE · payload science paused this day; bus load reduced.</p>}
        {reroutePower && <p className="operations-reroute-note"><Zap aria-hidden="true" /> POWER REROUTED · reduced load through this day’s eclipse.</p>}
      </section>

      <section className="operations-ground-console">
        <div className="operations-ground-heading"><span><RadioTower aria-hidden="true" /><small>MESSAGES HOME</small></span><strong>{configuration.stations} STATION{configuration.stations === 1 ? '' : 'S'}</strong></div>
        <div className={`operations-orbit-display operations-phase-${phase}`}>
          <span className="operations-orbit-earth" /><span className="operations-orbit-path" /><span className="operations-orbit-satellite"><i /></span>
          <span className="operations-day-phase-label">{phase === 'sunlight' ? <><Sun aria-hidden="true" /> Sunlight</> : phase === 'eclipse' ? <><Moon aria-hidden="true" /> Earth's shadow</> : phase === 'downlink' ? <><RadioTower aria-hidden="true" /> Send messages</> : <><Clock3 aria-hidden="true" /> Ready for a space day</>}</span>
        </div>
        <div className="operations-pass-list">{Array.from({ length: configuration.stations }, (_, index) => <span className={downlinkAvailable && windowNumber === index + 1 ? 'operations-pass-active' : index < windowNumber ? 'operations-pass-done' : ''} key={index}><i /> PASS {String(index + 1).padStart(2, '0')}</span>)}</div>
        <div className="operations-downlink-meter"><span><ArrowDownToLine aria-hidden="true" /> MESSAGES SENT HOME</span><strong>{downloadedDataGb.toFixed(1)} GB</strong></div>
        <div className="operations-meter-track"><i style={{ width: `${downlinkProgress}%` }} /></div>
        {downlinkAvailable
          ? <button type="button" className={`operations-download-control ${isDownloading ? 'operations-download-active' : ''}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDownloadHold(true) }} onPointerUp={() => setDownloadHold(false)} onPointerCancel={() => setDownloadHold(false)} onKeyDown={(event) => { if (event.code === 'Space') { event.preventDefault(); setDownloadHold(true) } }} onKeyUp={(event) => { if (event.code === 'Space') setDownloadHold(false) }}>
            <ArrowDownToLine aria-hidden="true" /> {isDownloading ? 'SENDING · KEEP HOLDING' : 'HOLD TO SEND SCIENCE'}<small>Hold while the station passes below</small>
          </button>
          : <p className="operations-window-hint">{isDayRunning ? `The station will pass below in ${Math.max(0, Math.ceil(SUNLIGHT_SECONDS + ECLIPSE_SECONDS - (cycleDuration - phaseSecondsLeft)))} seconds.` : `${configuration.stations} message window${configuration.stations === 1 ? '' : 's'} each day.`}</p>}
        <p className="operations-status" role="status">{statusMessage}</p>
        {missionComplete
          ? <PrimaryButton onClick={finishOperations}>See my stars!</PrimaryButton>
          : <button type="button" className="operations-advance-button" disabled={isDayRunning || activeEventIndex !== null} onClick={beginDay}>{isDayRunning ? `${phaseSecondsLeft} seconds · ${phaseLabel}` : eventIndex < eventResults.length ? `Start day ${missionDay} · surprise!` : `Start space day ${missionDay}`}</button>}
      </section>
    </div>

    {currentEvent && <div className="operations-event-overlay" role="alertdialog" aria-modal="true" aria-labelledby="operations-event-title">
      <section className="operations-event-card">
        <div className="operations-event-timer"><span><AlertTriangle aria-hidden="true" /> RAPID RESPONSE · {eventSecondsLeft}s</span><i><b style={{ width: `${eventSecondsLeft / 3 * 100}%` }} /></i></div>
        <h2 id="operations-event-title">{currentEvent.id === 'solar-flare' ? 'Sun flare!' : currentEvent.id === 'antenna-glitch' ? 'Messages are stuck!' : currentEvent.id === 'micrometeoroid' ? 'Space rock bump!' : 'Too many messages!'}</h2>
        <p>{currentEvent.id === 'solar-flare' ? 'A burst from the Sun is heading our way.' : currentEvent.id === 'antenna-glitch' ? 'Our antenna needs a little help.' : currentEvent.id === 'micrometeoroid' ? 'A tiny space rock bumped our ship.' : 'Our ship has more science than it can send.'} Choose one way to help!</p>
        <details className="operations-event-why">
          <summary>Why?</summary>
          <p>{currentEvent.flare
            ? `${currentEvent.flare.sample ? 'Sample flare' : 'Real solar flare'}: ${currentEvent.flare.classType} · ${currentEvent.flare.beginTime.slice(0, 10)} · ${currentEvent.flare.sourceLocation}.`
            : currentEvent.mitigation} Severity {currentEvent.severity}.</p>
          {currentEvent.flare && <small>NASA Data · {currentEvent.flare.sample ? 'Built-in sample' : 'NASA DONKI'}</small>}
        </details>
        <div className="operations-event-choices">
          <button type="button" onClick={() => resolveEvent('brace', activeEventIndex)}><Shield aria-hidden="true" /><b>HUG THE SHIP</b><small>BRACE · helps with bumps</small></button>
          <button type="button" onClick={() => resolveEvent('safe-mode', activeEventIndex)}><Moon aria-hidden="true" /><b>SAVE BATTERY</b><small>SAFE MODE · pause science</small></button>
          <button type="button" onClick={() => resolveEvent('reroute-power', activeEventIndex)}><Zap aria-hidden="true" /><b>SHARE POWER</b><small>REROUTE POWER · help ship tools</small></button>
        </div>
      </section>
    </div>}
  </main>
}

function TargetIcon() {
  return <Check aria-hidden="true" />
}
