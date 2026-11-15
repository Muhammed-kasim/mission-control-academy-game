'use client'

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { MultiplayerPresence, MultiplayerRoomPanel, useMultiplayerRoom, type SharedGameState } from './multiplayer-room'

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
  launch: 'Use the arrow keys to steer, adjust thrust, and separate stages. Autopilot is optional.',
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
  const multiplayer = useMultiplayerRoom()
  const appliedRoomRevision = useRef<number | null>(null)
  const [step, setLocalStep] = useState<GameStep>('welcome')
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
  const activePlayMode: PlayMode = multiplayer.room ? 'team' : playMode
  const activePlayerCount = multiplayer.room ? Math.max(2, multiplayer.room.players.length) : playerCount
  const updateLaunchGuide = useCallback((message: string) => {
    setGameGuide((current) => ({ ...current, launch: message }))
  }, [])
  const updateOperationsGuide = useCallback((message: string) => {
    setGameGuide((current) => ({ ...current, operations: message }))
  }, [])

  function syncRoomGame(overrides: Partial<SharedGameState> = {}) {
    void multiplayer.updateGame({
      missionId,
      sizeId,
      difficulty,
      step,
      configuration,
      rocketAppearance,
      alternativeA,
      alternativeB,
      ...overrides,
    })
  }

  function changeStep(nextStep: GameStep, overrides: Partial<SharedGameState> = {}) {
    setLocalStep(nextStep)
    syncRoomGame({ ...overrides, step: nextStep })
  }

  useEffect(() => {
    const shared = multiplayer.room
    if (!shared || shared.updatedBy === shared.currentPlayerId || appliedRoomRevision.current === shared.revision) return
    appliedRoomRevision.current = shared.revision
    startTransition(() => {
      setMissionId(shared.missionId)
      setSizeId(shared.sizeId)
      setDifficulty(shared.difficulty)
      setLocalStep(shared.step)
      setConfiguration(copyConfiguration(shared.configuration))
      setRocketAppearance(shared.rocketAppearance)
      setAlternativeA(shared.alternativeA ? copyConfiguration(shared.alternativeA) : null)
      setAlternativeB(shared.alternativeB ? copyConfiguration(shared.alternativeB) : null)
    })
  }, [multiplayer.room])

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
    setActiveRole(getRolesForPlayer(1, activePlayerCount)[0] ?? 'designer')
    changeStep('mission')
  }

  function chooseMission(nextMission: typeof mission) {
    const nextConfiguration = getDefaultConfiguration(nextMission, size)
    const nextAppearance = { ...rocketAppearance, missionPatch: nextMission.id }
    setMissionId(nextMission.id)
    setConfiguration(nextConfiguration)
    setRocketAppearance(nextAppearance)
    setLearningBonus(0)
    setLaunchResult(null)
    setOperationsResult(null)
    resetAlternatives()
    changeStep('size', { missionId: nextMission.id, configuration: nextConfiguration, rocketAppearance: nextAppearance, alternativeA: null, alternativeB: null })
  }

  function chooseSize(nextSize: typeof size) {
    const nextConfiguration = getDefaultConfiguration(mission, nextSize)
    setSizeId(nextSize.id)
    setConfiguration(nextConfiguration)
    resetAlternatives()
    changeStep('design', { sizeId: nextSize.id, configuration: nextConfiguration, alternativeA: null, alternativeB: null })
  }

  function returnHome() {
    changeStep('welcome')
  }

  function openSources() {
    setSourceReturnStep(step)
    changeStep('sources')
  }

  function updateConfiguration(next: Partial<MissionConfiguration>) {
    if (step === 'alternative-a') {
      const updated = { ...(alternativeA ?? configuration), ...next }
      setAlternativeA(updated)
      syncRoomGame({ alternativeA: updated })
    } else if (step === 'alternative-b') {
      const updated = { ...(alternativeB ?? configuration), ...next }
      setAlternativeB(updated)
      syncRoomGame({ alternativeB: updated })
    } else {
      const updated = { ...configuration, ...next }
      setConfiguration(updated)
      if (step === 'design') {
        setAlternativeA(null)
        setAlternativeB(null)
        setCoordinationEarned(false)
        syncRoomGame({ configuration: updated, alternativeA: null, alternativeB: null })
      }
    }
    setAlternativeNotice(false)
  }

  function beginAlternatives() {
    const nextAlternativeA = alternativeA ?? copyConfiguration(configuration)
    const nextAlternativeB = alternativeB ?? copyConfiguration(configuration)
    setAlternativeA(nextAlternativeA)
    setAlternativeB(nextAlternativeB)
    setShowSkipWarning(false)
    setSkippedComparison(false)
    setAlternativeNotice(false)
    changeStep('alternative-a', { alternativeA: nextAlternativeA, alternativeB: nextAlternativeB })
  }

  function saveAlternativeB() {
    if (alternativeA && alternativeB && configurationKey(alternativeA) === configurationKey(alternativeB)) {
      setAlternativeNotice(true)
      return
    }
    setAlternativeNotice(false)
    changeStep('trade-space')
  }

  function selectPointDesign(which: 'A' | 'B') {
    const selected = which === 'A' ? alternativeA : alternativeB
    if (!selected) return
    const nextConfiguration = copyConfiguration(selected)
    setConfiguration(nextConfiguration)
    setPointDesign(`Alternative ${which}`)
    setSkippedComparison(false)
    changeStep('verify', { configuration: nextConfiguration })
  }

  function skipComparison() {
    setShowSkipWarning(false)
    setSkippedComparison(true)
    setPointDesign('Initial design')
    changeStep('verify')
  }

  function beginFlight() {
    play('countdown')
    setGameGuide({ launch: '', operations: '' })
    setFlightId(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
    setLaunchResult(null)
    setOperationsResult(null)
    changeStep('launch')
  }

  function prepareAnotherFlight() {
    setLaunchResult(null)
    setOperationsResult(null)
    setLearningBonus(0)
    changeStep('verify')
  }

  function retrySameDesign() {
    setLearningBonus((current) => Math.min(20, current + 5))
    setLaunchResult(null)
    changeStep('verify')
  }

  function restartMission() {
    const nextConfiguration = getDefaultConfiguration(mission, size)
    const nextAppearance = { ...DEFAULT_ROCKET_APPEARANCE, missionPatch: mission.id }
    setConfiguration(nextConfiguration)
    setRocketAppearance(nextAppearance)
    setLearningBonus(0)
    setLaunchResult(null)
    setOperationsResult(null)
    resetAlternatives()
    changeStep('mission', { configuration: nextConfiguration, rocketAppearance: nextAppearance, alternativeA: null, alternativeB: null })
  }

  function completeOperations(events: SimulatedMissionEvent[], result: MissionOperationsResult) {
    setFlightEvents(events)
    setOperationsResult(result)
    changeStep('data-lab')
    play('success')
  }

  function completeDataLab(result: MissionOperationsResult) {
    setOperationsResult(result)
    changeStep('report')
  }

  const activePhase: DesignPhase = step === 'alternative-a' || step === 'alternative-b' ? step : 'baseline'
  function changeActivePlayer(player: number) {
    setActivePlayer(player)
    setActiveRole(getRolesForPlayer(player, activePlayerCount)[0] ?? 'designer')
  }
  function changePlayerCount(count: number) {
    setPlayerCount(count)
    setActivePlayer(1)
    setActiveRole(getRolesForPlayer(1, count)[0] ?? 'designer')
  }

  const sharedGame: SharedGameState = { missionId, sizeId, difficulty, step, configuration, rocketAppearance, alternativeA, alternativeB }
  const multiplayerPanel = <MultiplayerRoomPanel initialGame={sharedGame} />

  return <div className={`academy-shell ${highContrast ? 'high-contrast' : ''}`} id="top">
    <GameHeader step={step} mission={step === 'welcome' ? undefined : mission} size={step === 'welcome' || step === 'mission' ? undefined : size} onHome={returnHome} />
    {hasMissionDesign && <MissionDesignAdvisor mission={mission} size={size} configuration={activeConfiguration} estimate={estimate} checks={checks} sandboxEnabled={sandboxEnabled} playMode={activePlayMode} playerCount={activePlayerCount} activePlayer={activePlayer} activeRole={activeRole} onPlayerChange={changeActivePlayer} onRoleChange={setActiveRole} onChange={updateConfiguration} />}
    {hasMissionDesign && sandboxEnabled && <div className="sandbox-banner" role="status">FREE BUILD · No limits!</div>}
    <MultiplayerPresence />
    {step === 'welcome' && <WelcomeScreen onPlay={startMission} onSources={openSources} difficulty={difficulty} onDifficultyChange={(nextDifficulty) => { setDifficulty(nextDifficulty); syncRoomGame({ difficulty: nextDifficulty }) }} playMode={multiplayer.room ? 'team' : playMode} playerCount={multiplayer.room ? Math.max(2, multiplayer.room.players.length) : playerCount} onPlayModeChange={(mode) => { if (!multiplayer.room) setPlayMode(mode) }} onPlayerCountChange={(count) => { if (!multiplayer.room) changePlayerCount(count) }} sandboxEnabled={sandboxEnabled} onSandboxChange={setSandboxEnabled} highContrast={highContrast} onHighContrastChange={setHighContrast} threeDEnabled={threeDEnabled} onThreeDChange={setThreeDEnabled} multiplayerPanel={multiplayerPanel} />}
    {step === 'sources' && <MissionSources onBack={() => changeStep(sourceReturnStep)} />}
    {step === 'mission' && <MissionSelectionScreen selectedId={missionId} onSelect={chooseMission} onBack={returnHome} />}
    {step === 'size' && <SizeSelectionScreen selectedId={sizeId} onSelect={chooseSize} onBack={() => changeStep('mission')} />}
    {step === 'requirements' && <RequirementsScreen mission={mission} size={size} difficulty={difficulty} onContinue={() => changeStep('design')} onBack={() => changeStep('size')} />}
    {hasMissionDesign && <MissionDesign
      mission={mission}
      size={size}
      configuration={activeConfiguration}
      estimate={estimate}
      checks={checks}
      phase={activePhase}
      playMode={activePlayMode}
      playerCount={activePlayerCount}
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
      onRocketAppearanceChange={(patch) => { const nextAppearance = { ...rocketAppearance, ...patch }; setRocketAppearance(nextAppearance); syncRoomGame({ rocketAppearance: nextAppearance }) }}
      notice={step === 'alternative-b' && alternativeNotice ? 'Alternative B must differ from Alternative A so the trade-space comparison reveals a real design choice.' : undefined}
      onChange={updateConfiguration}
      onBack={() => changeStep(step === 'design' ? 'size' : step === 'alternative-a' ? 'feasibility' : 'alternative-a')}
      onVerify={() => changeStep(step === 'design' ? 'negotiation' : step === 'alternative-a' ? 'alternative-b' : 'trade-space')}
    />}
    {step === 'negotiation' && <MissionNegotiationScreen configuration={configuration} estimate={estimate} size={size} mode={activePlayMode} playerCount={activePlayerCount} activePlayer={activePlayer} activeRole={activeRole} onPlayerChange={changeActivePlayer} onRoleChange={setActiveRole} onApplyFix={(patch) => { const nextConfiguration = { ...configuration, ...patch }; setConfiguration(nextConfiguration); syncRoomGame({ configuration: nextConfiguration }) }} onContinue={(earned) => { setCoordinationEarned(earned); changeStep('feasibility') }} onBack={() => changeStep('design')} />}
    {step === 'feasibility' && <FeasibilityScreen mission={mission} size={size} difficulty={difficulty} estimate={estimate} checks={checks} showSkipWarning={showSkipWarning} onBack={() => { setShowSkipWarning(false); changeStep('design') }} onContinue={beginAlternatives} onSkip={() => setShowSkipWarning(true)} onCancelSkip={() => setShowSkipWarning(false)} onSkipAnyway={skipComparison} />}
    {step === 'trade-space' && alternativeA && alternativeB && <TradeSpaceScreen mission={mission} size={size} alternativeA={alternativeA} alternativeB={alternativeB} estimateA={estimateA} estimateB={estimateB} onBack={() => changeStep('alternative-b')} onChoose={selectPointDesign} />}
    {(['verify', 'launch', 'operations', 'data-lab', 'launch-failure', 'report'] as GameStep[]).includes(step) && <MissionOutcomeScreen step={step} mission={mission} size={size} difficulty={difficulty} configuration={configuration} estimate={estimate} checks={checks} pointDesign={pointDesign} alternativeA={alternativeA} alternativeB={alternativeB} events={flightEvents} runId={flightId} exploredTradeSpace={Boolean(alternativeA && alternativeB && !skippedComparison)} teamMode={activePlayMode === 'team'} coordinationEarned={coordinationEarned} launchResult={launchResult ?? undefined} operationsResult={operationsResult ?? undefined} rocketAppearance={rocketAppearance} progression={progression} onProgressionChange={setProgression} sandboxEnabled={sandboxEnabled} threeDEnabled={threeDEnabled} smoothMode={smoothMode} onSmoothModeChange={setSmoothMode} launchChance={launchChance} learningBonus={learningBonus} flightReady={flightReady} backLabel={skippedComparison ? 'Back to feasibility review' : 'Back to trade-space comparison'} onBackToDesign={() => changeStep(skippedComparison ? 'feasibility' : 'trade-space')} onLaunch={beginFlight} onLaunchComplete={(result) => { setLaunchResult(result); changeStep(result.success ? 'operations' : 'launch-failure') }} onOperationsComplete={completeOperations} onDataLabComplete={completeDataLab} onRetrySameDesign={retrySameDesign} onFailureContinue={() => changeStep('report')} onReviseLaunch={() => changeStep('design')} onTryAgain={prepareAnotherFlight} onRestart={restartMission} onLaunchGuide={updateLaunchGuide} onOperationsGuide={updateOperationsGuide} sharedControls={multiplayer.room ? { heading: multiplayer.room.launchHeading, throttle: multiplayer.room.launchThrottle, autopilot: multiplayer.room.launchAutopilot } : undefined} sharedControlsBy={multiplayer.room?.launchUpdatedBy} playerId={multiplayer.playerId} onControlsChange={multiplayer.updateLaunch} />}
    <NovaGuide message={step === 'launch' ? gameGuide.launch || NOVA_PROMPTS.launch : step === 'operations' ? gameGuide.operations || NOVA_PROMPTS.operations : NOVA_PROMPTS[step]} />
    {step !== 'welcome' && <footer className="app-footer"><span>MISSION CONTROL ACADEMY <i /> EDUCATIONAL SIMULATION</span><span>Values simplified from real data · Actual missions use detailed engineering models</span></footer>}
  </div>
}
