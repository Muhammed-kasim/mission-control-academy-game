'use client'

import { useCallback, useMemo, useState } from 'react'
import { FeasibilityScreen, TradeSpaceScreen } from './mission-cml-flow'
import { MissionDesign, type DesignPhase } from './mission-design'
import { buildChecks, calculateMission, getDefaultConfiguration, getMission, getSize, type DifficultyId, type GameStep, type MissionConfiguration, type MissionId, type SizeId } from './mission-data'
import { MissionOutcomeScreen } from './mission-outcome-screens'
import { MissionSelectionScreen, RequirementsScreen, SizeSelectionScreen, WelcomeScreen } from './mission-selection-screens'
import { GameHeader, TelemetryStrip, WarningBanner } from './mission-ui'
import { simulateMissionEvents, type SimulatedMissionEvent } from './mission-simulation'

function copyConfiguration(configuration: MissionConfiguration): MissionConfiguration {
  return { ...configuration, instrumentIds: [...configuration.instrumentIds] }
}

function configurationKey(configuration: MissionConfiguration) {
  return JSON.stringify({ ...configuration, instrumentIds: [...configuration.instrumentIds].sort() })
}

export function MissionControlGame() {
  const [step, setStep] = useState<GameStep>('welcome')
  const [missionId, setMissionId] = useState<MissionId>('earth')
  const [sizeId, setSizeId] = useState<SizeId>('small')
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal')
  const [configuration, setConfiguration] = useState<MissionConfiguration>(() => getDefaultConfiguration(getMission('earth'), getSize('small')))
  const [alternativeA, setAlternativeA] = useState<MissionConfiguration | null>(null)
  const [alternativeB, setAlternativeB] = useState<MissionConfiguration | null>(null)
  const [alternativeNotice, setAlternativeNotice] = useState(false)
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [skippedComparison, setSkippedComparison] = useState(false)
  const [pointDesign, setPointDesign] = useState('Initial design')
  const [flightEvents, setFlightEvents] = useState<SimulatedMissionEvent[]>([])
  const [flightId, setFlightId] = useState('')
  const mission = getMission(missionId)
  const size = getSize(sizeId)
  const activeConfiguration = step === 'alternative-a' ? alternativeA ?? configuration : step === 'alternative-b' ? alternativeB ?? configuration : configuration
  const estimate = useMemo(() => calculateMission(mission, size, activeConfiguration, difficulty), [mission, size, activeConfiguration, difficulty])
  const checks = useMemo(() => buildChecks(mission, size, activeConfiguration, estimate), [mission, size, activeConfiguration, estimate])
  const estimateA = useMemo(() => calculateMission(mission, size, alternativeA ?? configuration, difficulty), [mission, size, alternativeA, configuration, difficulty])
  const estimateB = useMemo(() => calculateMission(mission, size, alternativeB ?? configuration, difficulty), [mission, size, alternativeB, configuration, difficulty])
  const hasMissionDesign = ['design', 'alternative-a', 'alternative-b'].includes(step)

  function resetAlternatives() {
    setAlternativeA(null)
    setAlternativeB(null)
    setAlternativeNotice(false)
    setShowSkipWarning(false)
    setSkippedComparison(false)
    setPointDesign('Initial design')
  }

  function chooseMission(nextMission: typeof mission) {
    setMissionId(nextMission.id)
    resetAlternatives()
    setStep('size')
  }

  function chooseSize(nextSize: typeof size) {
    setSizeId(nextSize.id)
    setConfiguration(getDefaultConfiguration(mission, nextSize))
    resetAlternatives()
    setStep('requirements')
  }

  function returnHome() {
    setStep('welcome')
  }

  function updateConfiguration(next: Partial<MissionConfiguration>) {
    if (step === 'alternative-a') setAlternativeA((current) => ({ ...(current ?? configuration), ...next }))
    else if (step === 'alternative-b') setAlternativeB((current) => ({ ...(current ?? configuration), ...next }))
    else {
      setConfiguration((current) => ({ ...current, ...next }))
      if (step === 'design') {
        setAlternativeA(null)
        setAlternativeB(null)
      }
    }
    setAlternativeNotice(false)
  }

  function beginAlternatives() {
    setAlternativeA((current) => current ?? copyConfiguration(configuration))
    setAlternativeB((current) => current ?? copyConfiguration(configuration))
    setShowSkipWarning(false)
    setSkippedComparison(false)
    setAlternativeNotice(false)
    setStep('alternative-a')
  }

  function saveAlternativeB() {
    if (alternativeA && alternativeB && configurationKey(alternativeA) === configurationKey(alternativeB)) {
      setAlternativeNotice(true)
      return
    }
    setAlternativeNotice(false)
    setStep('trade-space')
  }

  function selectPointDesign(which: 'A' | 'B') {
    const selected = which === 'A' ? alternativeA : alternativeB
    if (!selected) return
    setConfiguration(copyConfiguration(selected))
    setPointDesign(`Alternative ${which}`)
    setSkippedComparison(false)
    setStep('verify')
  }

  function skipComparison() {
    setShowSkipWarning(false)
    setSkippedComparison(true)
    setPointDesign('Initial design')
    setStep('verify')
  }

  function beginFlight() {
    setFlightEvents(simulateMissionEvents(configuration))
    setFlightId(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
    setStep('launch')
  }

  const showReport = useCallback(() => setStep('report'), [])

  function restartMission() {
    setConfiguration(getDefaultConfiguration(mission, size))
    resetAlternatives()
    setStep('mission')
  }

  const activePhase: DesignPhase = step === 'alternative-a' || step === 'alternative-b' ? step : 'baseline'

  return <div className="academy-shell" id="top">
    <GameHeader step={step} mission={step === 'welcome' ? undefined : mission} size={step === 'welcome' || step === 'mission' ? undefined : size} onHome={returnHome} />
    {hasMissionDesign && <div className="telemetry-wrap"><TelemetryStrip estimate={estimate} size={size} mission={mission} />
      <WarningBanner checks={checks} />
    </div>}
    {step === 'welcome' && <WelcomeScreen onPlay={() => setStep('mission')} difficulty={difficulty} onDifficultyChange={setDifficulty} />}
    {step === 'mission' && <MissionSelectionScreen selectedId={missionId} onSelect={chooseMission} onBack={returnHome} />}
    {step === 'size' && <SizeSelectionScreen selectedId={sizeId} onSelect={chooseSize} onBack={() => setStep('mission')} />}
    {step === 'requirements' && <RequirementsScreen mission={mission} size={size} difficulty={difficulty} onContinue={() => setStep('design')} onBack={() => setStep('size')} />}
    {hasMissionDesign && <MissionDesign
      mission={mission}
      size={size}
      configuration={activeConfiguration}
      estimate={estimate}
      checks={checks}
      phase={activePhase}
      notice={step === 'alternative-b' && alternativeNotice ? 'Alternative B must differ from Alternative A so the trade-space comparison reveals a real design choice.' : undefined}
      onChange={updateConfiguration}
      onBack={() => setStep(step === 'design' ? 'requirements' : step === 'alternative-a' ? 'feasibility' : 'alternative-a')}
      onVerify={() => setStep(step === 'design' ? 'feasibility' : step === 'alternative-a' ? 'alternative-b' : 'trade-space')}
    />}
    {step === 'feasibility' && <FeasibilityScreen mission={mission} size={size} difficulty={difficulty} estimate={estimate} checks={checks} showSkipWarning={showSkipWarning} onBack={() => { setShowSkipWarning(false); setStep('design') }} onContinue={beginAlternatives} onSkip={() => setShowSkipWarning(true)} onCancelSkip={() => setShowSkipWarning(false)} onSkipAnyway={skipComparison} />}
    {step === 'trade-space' && alternativeA && alternativeB && <TradeSpaceScreen mission={mission} size={size} alternativeA={alternativeA} alternativeB={alternativeB} estimateA={estimateA} estimateB={estimateB} onBack={() => setStep('alternative-b')} onChoose={selectPointDesign} />}
    {(step === 'verify' || step === 'launch' || step === 'report') && <MissionOutcomeScreen step={step} mission={mission} size={size} difficulty={difficulty} configuration={configuration} estimate={estimate} checks={checks} pointDesign={pointDesign} alternativeA={alternativeA} alternativeB={alternativeB} events={flightEvents} runId={flightId} exploredTradeSpace={Boolean(alternativeA && alternativeB && !skippedComparison)} backLabel={skippedComparison ? 'Back to feasibility review' : 'Back to trade-space comparison'} onBackToDesign={() => setStep(skippedComparison ? 'feasibility' : 'trade-space')} onLaunch={beginFlight} onReport={showReport} onTryAgain={beginFlight} onRestart={restartMission} />}
    {step !== 'welcome' && <footer className="app-footer"><span>MISSION CONTROL ACADEMY <i /> EDUCATIONAL SIMULATION</span><span>Values simplified from real data · Actual missions use detailed engineering models</span></footer>}
  </div>
}
