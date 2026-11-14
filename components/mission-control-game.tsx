'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FeasibilityScreen, TradeSpaceScreen } from './mission-cml-flow'
import { MissionDesign, type DesignPhase } from './mission-design'
import { MissionNegotiationScreen } from './mission-negotiation'
import { buildChecks, calculateMission, DEFAULT_ROCKET_APPEARANCE, getDefaultConfiguration, getMission, getRocket, getSize, type DifficultyId, type GameStep, type MissionConfiguration, type MissionId, type RocketAppearance, type SizeId } from './mission-data'
import { useGameAudio } from './game-audio'
import { MissionSources } from './mission-sources'
import { DEFAULT_MISSION_PROGRESSION, readMissionProgression, type MissionProgression } from './mission-progression'
import { MissionOutcomeScreen } from './mission-outcome-screens'
import { MissionSelectionScreen, RequirementsScreen, SizeSelectionScreen, WelcomeScreen } from './mission-selection-screens'
import { GameHeader } from './mission-ui'
import { MissionDesignAdvisor } from './mission-design-advisor'
import { fetchRecentSolarFlare } from './nasa-data'
import { calculateLaunchChance, simulateMissionEvents, type LaunchResult, type MissionOperationsResult, type SimulatedMissionEvent } from './mission-simulation'
import { getRolesForPlayer, type PlayMode, type TeamRoleId } from './team-mode'
import { NovaGuide } from './game-companions'

const NOVA_PROMPTS: Record<GameStep, string> = {
  welcome: "Hi! I'm Nova. Pick a planet for our adventure.",
  sources: 'See what real space teams do with their ideas.',
  mission: 'Pick a planet for our next space adventure.',
  size: 'Pick a spaceship size. Big or small?',
  requirements: "Let's build a ship for this adventure!",
  design: 'Tap a part to build your ship. Use Why to learn.',
  negotiation: 'Help your crew agree on one good fix.',
  feasibility: 'Check your ship, then try two fun ideas.',
  'alternative-a': 'Make a new ship idea. Try something different!',
  'alternative-b': 'Change one part to make a new ship idea.',
  'trade-space': 'Pick the ship you like best.',
  verify: 'Ready? Tap Launch when your ship is set.',
  launch: 'Hold THRUST to keep the meter green!',
  operations: 'Switch off tools, then start a space day.',
  'data-lab': 'Look at our discoveries, then answer Nova’s question.',
  'launch-failure': 'Every launch teaches us something. Try again!',
  report: 'You did it! Pick up your mission stars.',
}

function copyConfiguration(configuration: MissionConfiguration): MissionConfiguration {
  return { ...configuration, instrumentIds: [...configuration.instrumentIds] }
}

function configurationKey(configuration: MissionConfiguration) {
  return JSON.stringify({ ...configuration, instrumentIds: [...configuration.instrumentIds].sort() })
}

export function MissionControlGame() {
  const { play, prepare } = useGameAudio()
  const [step, setStep] = useState<GameStep>('welcome')
  const [sourceReturnStep, setSourceReturnStep] = useState<GameStep>('welcome')
  const [progression, setProgression] = useState<MissionProgression>(DEFAULT_MISSION_PROGRESSION)
  const [sandboxEnabled, setSandboxEnabled] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [threeDEnabled, setThreeDEnabled] = useState(false)
  const [smoothMode, setSmoothMode] = useState(true)
  const [learningBonus, setLearningBonus] = useState(0)
  const [flightReady, setFlightReady] = useState(false)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [missionId, setMissionId] = useState<MissionId>('earth')
  const [sizeId, setSizeId] = useState<SizeId>('small')
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal')
  const [playMode, setPlayMode] = useState<PlayMode>('solo')
  const [playerCount, setPlayerCount] = useState(2)
  const [activePlayer, setActivePlayer] = useState(1)
  const [activeRole, setActiveRole] = useState<TeamRoleId>('designer')
  const [coordinationEarned, setCoordinationEarned] = useState(false)
  const [rocketAppearance, setRocketAppearance] = useState<RocketAppearance>(DEFAULT_ROCKET_APPEARANCE)
  const [configuration, setConfiguration] = useState<MissionConfiguration>(() => getDefaultConfiguration(getMission('earth'), getSize('small')))
  const [alternativeA, setAlternativeA] = useState<MissionConfiguration | null>(null)
  const [alternativeB, setAlternativeB] = useState<MissionConfiguration | null>(null)
  const [alternativeNotice, setAlternativeNotice] = useState(false)
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [skippedComparison, setSkippedComparison] = useState(false)
  const [pointDesign, setPointDesign] = useState('Initial design')
  const [flightEvents, setFlightEvents] = useState<SimulatedMissionEvent[]>([])
  const [flightId, setFlightId] = useState('')
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null)
  const [operationsResult, setOperationsResult] = useState<MissionOperationsResult | null>(null)
  const [gameGuide, setGameGuide] = useState<{ launch: string; operations: string }>({ launch: '', operations: '' })
  const mission = getMission(missionId)
  const size = getSize(sizeId)
  const activeConfiguration = step === 'alternative-a' ? alternativeA ?? configuration : step === 'alternative-b' ? alternativeB ?? configuration : configuration
  const estimate = useMemo(() => calculateMission(mission, size, activeConfiguration, difficulty), [mission, size, activeConfiguration, difficulty])
  const checks = useMemo(() => {
    const currentChecks = buildChecks(mission, size, activeConfiguration, estimate)
    return sandboxEnabled
      ? currentChecks.map((check) => ({ ...check, passed: true, detail: `Sandbox mode: constraint waived. ${check.detail}` }))
      : currentChecks
  }, [mission, size, activeConfiguration, estimate, sandboxEnabled])
  const estimateA = useMemo(() => calculateMission(mission, size, alternativeA ?? configuration, difficulty), [mission, size, alternativeA, configuration, difficulty])
  const estimateB = useMemo(() => calculateMission(mission, size, alternativeB ?? configuration, difficulty), [mission, size, alternativeB, configuration, difficulty])
  const launchChance = calculateLaunchChance(getRocket(configuration.rocketId).id, estimate.payloadMassKg, getRocket(configuration.rocketId).payloadKg, learningBonus)
  const hasMissionDesign = ['design', 'alternative-a', 'alternative-b'].includes(step)
  const updateLaunchGuide = useCallback((message: string) => {
    setGameGuide((current) => ({ ...current, launch: message }))
  }, [])
  const updateOperationsGuide = useCallback((message: string) => {
    setGameGuide((current) => ({ ...current, operations: message }))
  }, [])

  useEffect(() => {
    setProgression(readMissionProgression())
  }, [])

  useEffect(() => {
    try {
      setSandboxEnabled(window.localStorage.getItem('mission-control-academy-sandbox-v1') === 'true')
      setHighContrast(window.localStorage.getItem('mission-control-academy-high-contrast-v1') === 'true')
      setThreeDEnabled(window.localStorage.getItem('mission-control-academy-3d-v1') === 'true')
      const savedSmoothMode = window.localStorage.getItem('mission-control-academy-smooth-mode-v1')
      setSmoothMode(savedSmoothMode === null ? ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 8 : savedSmoothMode === 'true')
    } catch (error) {
      console.warn('Could not load local game preferences.', error)
    }
    setPreferencesLoaded(true)
  }, [])

  useEffect(() => {
    if (!preferencesLoaded) return
    try {
      window.localStorage.setItem('mission-control-academy-sandbox-v1', String(sandboxEnabled))
      window.localStorage.setItem('mission-control-academy-high-contrast-v1', String(highContrast))
      window.localStorage.setItem('mission-control-academy-3d-v1', String(threeDEnabled))
      window.localStorage.setItem('mission-control-academy-smooth-mode-v1', String(smoothMode))
    } catch (error) {
      console.warn('Could not save local game preferences.', error)
    }
  }, [highContrast, preferencesLoaded, sandboxEnabled, threeDEnabled, smoothMode])

  useEffect(() => {
    if (step !== 'verify') return
    let active = true
    setFlightReady(false)
    void Promise.all([fetchRecentSolarFlare(), prepare()]).then(([flare]) => {
      if (!active) return
      setFlightEvents(simulateMissionEvents(configuration, flare.flare))
      setFlightReady(true)
    }).catch((error: unknown) => {
      console.warn('Could not prepare mission data before launch; using built-in events.', error)
      if (!active) return
      setFlightEvents(simulateMissionEvents(configuration))
      setFlightReady(true)
    })
    return () => { active = false }
  }, [configuration, prepare, step])

  function resetAlternatives() {
    setAlternativeA(null)
    setAlternativeB(null)
    setAlternativeNotice(false)
    setShowSkipWarning(false)
    setSkippedComparison(false)
    setPointDesign('Initial design')
    setCoordinationEarned(false)
  }

  function startMission() {
    setActivePlayer(1)
    setActiveRole(getRolesForPlayer(1, playerCount)[0] ?? 'designer')
    setStep('mission')
  }

  function chooseMission(nextMission: typeof mission) {
    setMissionId(nextMission.id)
    setRocketAppearance((current) => ({ ...current, missionPatch: nextMission.id }))
    setLearningBonus(0)
    setLaunchResult(null)
    setOperationsResult(null)
    resetAlternatives()
    setStep('size')
  }

  function chooseSize(nextSize: typeof size) {
    setSizeId(nextSize.id)
    setConfiguration(getDefaultConfiguration(mission, nextSize))
    resetAlternatives()
    setStep('design')
  }

  function returnHome() {
    setStep('welcome')
  }

  function openSources() {
    setSourceReturnStep(step)
    setStep('sources')
  }

  function updateConfiguration(next: Partial<MissionConfiguration>) {
    if (step === 'alternative-a') setAlternativeA((current) => ({ ...(current ?? configuration), ...next }))
    else if (step === 'alternative-b') setAlternativeB((current) => ({ ...(current ?? configuration), ...next }))
    else {
      setConfiguration((current) => ({ ...current, ...next }))
      if (step === 'design') {
        setAlternativeA(null)
        setAlternativeB(null)
        setCoordinationEarned(false)
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
    play('countdown')
    setGameGuide({ launch: '', operations: '' })
    setFlightId(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
    setLaunchResult(null)
    setOperationsResult(null)
    setStep('launch')
  }

  function prepareAnotherFlight() {
    setLaunchResult(null)
    setOperationsResult(null)
    setLearningBonus(0)
    setStep('verify')
  }

  function retrySameDesign() {
    setLearningBonus((current) => Math.min(20, current + 5))
    setLaunchResult(null)
    setStep('verify')
  }

  function restartMission() {
    setConfiguration(getDefaultConfiguration(mission, size))
    setRocketAppearance({ ...DEFAULT_ROCKET_APPEARANCE, missionPatch: mission.id })
    setLearningBonus(0)
    setLaunchResult(null)
    setOperationsResult(null)
    resetAlternatives()
    setStep('mission')
  }

  function completeOperations(events: SimulatedMissionEvent[], result: MissionOperationsResult) {
    setFlightEvents(events)
    setOperationsResult(result)
    setStep('data-lab')
    play('success')
  }

  function completeDataLab(result: MissionOperationsResult) {
    setOperationsResult(result)
    setStep('report')
  }

  const activePhase: DesignPhase = step === 'alternative-a' || step === 'alternative-b' ? step : 'baseline'
  function changeActivePlayer(player: number) {
    setActivePlayer(player)
    setActiveRole(getRolesForPlayer(player, playerCount)[0] ?? 'designer')
  }
  function changePlayerCount(count: number) {
    setPlayerCount(count)
    setActivePlayer(1)
    setActiveRole(getRolesForPlayer(1, count)[0] ?? 'designer')
  }

  return <div className={`academy-shell ${highContrast ? 'high-contrast' : ''}`} id="top">
    <GameHeader step={step} mission={step === 'welcome' ? undefined : mission} size={step === 'welcome' || step === 'mission' ? undefined : size} onHome={returnHome} />
    {hasMissionDesign && <MissionDesignAdvisor mission={mission} size={size} configuration={activeConfiguration} estimate={estimate} checks={checks} sandboxEnabled={sandboxEnabled} playMode={playMode} playerCount={playerCount} activePlayer={activePlayer} activeRole={activeRole} onPlayerChange={changeActivePlayer} onRoleChange={setActiveRole} onChange={updateConfiguration} />}
    {hasMissionDesign && sandboxEnabled && <div className="sandbox-banner" role="status">FREE BUILD · No limits!</div>}
    {step === 'welcome' && <WelcomeScreen onPlay={startMission} onSources={openSources} difficulty={difficulty} onDifficultyChange={setDifficulty} playMode={playMode} playerCount={playerCount} onPlayModeChange={setPlayMode} onPlayerCountChange={changePlayerCount} sandboxEnabled={sandboxEnabled} onSandboxChange={setSandboxEnabled} highContrast={highContrast} onHighContrastChange={setHighContrast} threeDEnabled={threeDEnabled} onThreeDChange={setThreeDEnabled} />}
    {step === 'sources' && <MissionSources onBack={() => setStep(sourceReturnStep)} />}
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
      playMode={playMode}
      playerCount={playerCount}
      activePlayer={activePlayer}
      activeRole={activeRole}
      rocketAppearance={rocketAppearance}
      progression={progression}
      sandboxEnabled={sandboxEnabled}
      threeDEnabled={threeDEnabled && !smoothMode}
      onThreeDChange={(enabled) => {
        setThreeDEnabled(enabled)
        if (enabled) setSmoothMode(false)
      }}
      onPlayerChange={changeActivePlayer}
      onRoleChange={setActiveRole}
      onRocketAppearanceChange={(patch) => setRocketAppearance((current) => ({ ...current, ...patch }))}
      notice={step === 'alternative-b' && alternativeNotice ? 'Alternative B must differ from Alternative A so the trade-space comparison reveals a real design choice.' : undefined}
      onChange={updateConfiguration}
      onBack={() => setStep(step === 'design' ? 'size' : step === 'alternative-a' ? 'feasibility' : 'alternative-a')}
      onVerify={() => setStep(step === 'design' ? 'negotiation' : step === 'alternative-a' ? 'alternative-b' : 'trade-space')}
    />}
    {step === 'negotiation' && <MissionNegotiationScreen configuration={configuration} estimate={estimate} size={size} mode={playMode} playerCount={playerCount} activePlayer={activePlayer} activeRole={activeRole} onPlayerChange={changeActivePlayer} onRoleChange={setActiveRole} onApplyFix={(patch) => setConfiguration((current) => ({ ...current, ...patch }))} onContinue={(earned) => { setCoordinationEarned(earned); setStep('feasibility') }} onBack={() => setStep('design')} />}
    {step === 'feasibility' && <FeasibilityScreen mission={mission} size={size} difficulty={difficulty} estimate={estimate} checks={checks} showSkipWarning={showSkipWarning} onBack={() => { setShowSkipWarning(false); setStep('design') }} onContinue={beginAlternatives} onSkip={() => setShowSkipWarning(true)} onCancelSkip={() => setShowSkipWarning(false)} onSkipAnyway={skipComparison} />}
    {step === 'trade-space' && alternativeA && alternativeB && <TradeSpaceScreen mission={mission} size={size} alternativeA={alternativeA} alternativeB={alternativeB} estimateA={estimateA} estimateB={estimateB} onBack={() => setStep('alternative-b')} onChoose={selectPointDesign} />}
    {(['verify', 'launch', 'operations', 'data-lab', 'launch-failure', 'report'] as GameStep[]).includes(step) && <MissionOutcomeScreen step={step} mission={mission} size={size} difficulty={difficulty} configuration={configuration} estimate={estimate} checks={checks} pointDesign={pointDesign} alternativeA={alternativeA} alternativeB={alternativeB} events={flightEvents} runId={flightId} exploredTradeSpace={Boolean(alternativeA && alternativeB && !skippedComparison)} teamMode={playMode === 'team'} coordinationEarned={coordinationEarned} launchResult={launchResult ?? undefined} operationsResult={operationsResult ?? undefined} rocketAppearance={rocketAppearance} progression={progression} onProgressionChange={setProgression} sandboxEnabled={sandboxEnabled} threeDEnabled={threeDEnabled} smoothMode={smoothMode} onSmoothModeChange={setSmoothMode} launchChance={launchChance} learningBonus={learningBonus} flightReady={flightReady} backLabel={skippedComparison ? 'Back to feasibility review' : 'Back to trade-space comparison'} onBackToDesign={() => setStep(skippedComparison ? 'feasibility' : 'trade-space')} onLaunch={beginFlight} onLaunchComplete={(result) => { setLaunchResult(result); setStep(result.success ? 'operations' : 'launch-failure') }} onOperationsComplete={completeOperations} onDataLabComplete={completeDataLab} onRetrySameDesign={retrySameDesign} onFailureContinue={() => setStep('report')} onReviseLaunch={() => setStep('design')} onTryAgain={prepareAnotherFlight} onRestart={restartMission} onLaunchGuide={updateLaunchGuide} onOperationsGuide={updateOperationsGuide} />}
    <NovaGuide message={step === 'launch' ? gameGuide.launch || NOVA_PROMPTS.launch : step === 'operations' ? gameGuide.operations || NOVA_PROMPTS.operations : NOVA_PROMPTS[step]} />
    {step !== 'welcome' && <footer className="app-footer"><span>MISSION CONTROL ACADEMY <i /> EDUCATIONAL SIMULATION</span><span>Values simplified from real data · Actual missions use detailed engineering models</span></footer>}
  </div>
}
