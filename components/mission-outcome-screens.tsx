'use client'

import { CircleCheck, CircleX, Orbit, Rocket, Satellite, Sparkles, Target, TriangleAlert } from 'lucide-react'
import type { DifficultyId, GameStep, MissionCheck, MissionConfiguration, MissionEstimate, MissionProfile, RocketAppearance, SpacecraftSize } from './mission-data'
import { getOrbit, getRocket } from './mission-data'
import type { LaunchResult, MissionOperationsResult, SimulatedMissionEvent } from './mission-simulation'
import type { MissionProgression } from './mission-progression'
import { MissionReport } from './mission-report'
import { MissionLaunchGame } from './mission-launch-game'
import { MissionOperationsGame } from './mission-operations-game'
import { MissionDataLab } from './mission-data-lab'
import { MissionLaunchFailure } from './mission-launch-failure'
import { DataNote, NasaTag, PageHeading, PrimaryButton, WarningBanner } from './mission-ui'
import { MissionNasaGallery } from './mission-nasa-gallery'
import type { SharedControls } from './mission-launch-game'

export function MissionOutcomeScreen({ step, mission, size, difficulty, configuration, estimate, checks, pointDesign, alternativeA, alternativeB, events, runId, exploredTradeSpace, teamMode, coordinationEarned, launchResult, operationsResult, rocketAppearance, progression, onProgressionChange, sandboxEnabled, threeDEnabled, smoothMode, onSmoothModeChange, launchChance, learningBonus, flightReady, backLabel, onBackToDesign, onLaunch, onLaunchComplete, onOperationsComplete, onDataLabComplete, onRetrySameDesign, onFailureContinue, onReviseLaunch, onTryAgain, onRestart, onLaunchGuide, onOperationsGuide, sharedControls, sharedControlsBy, playerId, onControlsChange }: {
  step: GameStep
  mission: MissionProfile
  size: SpacecraftSize
  difficulty: DifficultyId
  configuration: MissionConfiguration
  estimate: MissionEstimate
  checks: MissionCheck[]
  pointDesign: string
  alternativeA: MissionConfiguration | null
  alternativeB: MissionConfiguration | null
  events: SimulatedMissionEvent[]
  runId: string
  exploredTradeSpace: boolean
  teamMode: boolean
  coordinationEarned: boolean
  launchResult?: LaunchResult
  operationsResult?: MissionOperationsResult
  rocketAppearance: RocketAppearance
  progression: MissionProgression
  onProgressionChange: (progression: MissionProgression) => void
  sandboxEnabled: boolean
  threeDEnabled: boolean
  smoothMode: boolean
  onSmoothModeChange: (enabled: boolean) => void
  launchChance: number
  learningBonus: number
  flightReady: boolean
  backLabel: string
  onBackToDesign: () => void
  onLaunch: () => void
  onLaunchComplete: (result: LaunchResult) => void
  onOperationsComplete: (events: SimulatedMissionEvent[], result: MissionOperationsResult) => void
  onDataLabComplete: (result: MissionOperationsResult) => void
  onRetrySameDesign: () => void
  onFailureContinue: () => void
  onReviseLaunch: () => void
  onTryAgain: () => void
  onRestart: () => void
  onLaunchGuide: (message: string) => void
  onOperationsGuide: (message: string) => void
  sharedControls?: SharedControls
  sharedControlsBy?: string | null
  playerId?: string | null
  onControlsChange?: (controls: SharedControls) => void
}) {
  if (step === 'launch') return <MissionLaunchGame mission={mission} size={size} configuration={configuration} estimate={estimate} appearance={rocketAppearance} sandboxEnabled={sandboxEnabled} smoothMode={smoothMode} launchChance={launchChance} learningBonus={learningBonus} sharedControls={sharedControls} sharedControlsBy={sharedControlsBy} playerId={playerId} onControlsChange={onControlsChange} onComplete={onLaunchComplete} onRevise={onReviseLaunch} onNovaMessage={onLaunchGuide} />
  if (step === 'operations') return <><MissionNasaGallery missionId={mission.id} /><MissionOperationsGame mission={mission} size={size} configuration={configuration} estimate={estimate} events={events} threeDEnabled={threeDEnabled && !smoothMode} onComplete={onOperationsComplete} onNovaMessage={onOperationsGuide} /></>
  if (step === 'data-lab' && operationsResult) return <MissionDataLab mission={mission} configuration={configuration} estimate={estimate} events={events} result={operationsResult} onComplete={onDataLabComplete} />
  if (step === 'launch-failure' && launchResult) return <MissionLaunchFailure configuration={configuration} estimate={estimate} result={launchResult} learningBonus={learningBonus} onRetry={onRetrySameDesign} onContinue={onFailureContinue} />
  if (step === 'report') return <MissionReport mission={mission} size={size} difficulty={difficulty} configuration={configuration} estimate={estimate} checks={checks} pointDesign={pointDesign} alternativeA={alternativeA} alternativeB={alternativeB} events={events} runId={runId} exploredTradeSpace={exploredTradeSpace} teamMode={teamMode} coordinationEarned={coordinationEarned} launchResult={launchResult} operationsResult={operationsResult} progression={progression} onProgressionChange={onProgressionChange} onTryAgain={onTryAgain} onRestart={onRestart} />

  const passed = checks.filter((check) => check.passed).length
  const allPassed = passed === checks.length
  const designFailure = checks.find((check) => ['mass', 'payload', 'orbit-access', 'mission-orbit'].includes(check.id) && !check.passed)
  const shownLaunchChance = designFailure ? 0 : launchChance
  return <main className="flow-screen outcome-screen">
    <button className="back-link" onClick={onBackToDesign}><span>←</span> {backLabel}</button>
    <PageHeading eyebrow="CML 4 — POINT DESIGN" title="Build & verify your point design." description="Your selected design is the mission baseline. Check every requirement before the simulated launch." icon={<Target aria-hidden="true" />} />
    {sandboxEnabled ? <div className="sandbox-banner" role="status">SANDBOX ACTIVE · mission constraints are waived for this flight.</div> : <WarningBanner checks={checks} />}
    <section className={`launch-chance-card ${designFailure ? 'launch-chance-blocked' : ''}`}>
      <div><span className="eyebrow">LAUNCH CHANCE</span><strong>{shownLaunchChance}%</strong><small>{designFailure ? `Fix this first: ${designFailure.detail}` : `${getRocket(configuration.rocketId).name} is ready for its flight.`}</small></div>
      <div className="launch-chance-meter" role="meter" aria-label="Launch success chance" aria-valuenow={shownLaunchChance} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${shownLaunchChance}%` }} /></div>
      <p>{designFailure ? 'Nova: This ship is too heavy or cannot reach its space home. Fix the design first.' : `Nova: ${getRocket(configuration.rocketId).name} has a ${shownLaunchChance}% chance. A close-to-full rocket is trickier.`}</p>
      <label className="smooth-mode-setting"><input type="checkbox" checked={smoothMode} onChange={(event) => onSmoothModeChange(event.currentTarget.checked)} /><span><b>Smooth mode</b><small>Less animation for older devices.</small></span></label>
    </section>
    <section className="verification-summary"><div className={`verification-score ${allPassed ? 'score-ready' : 'score-review'}`}><span className="score-ring"><strong>{passed}<small>/{checks.length}</small></strong></span><span><small>REQUIREMENTS PASSED</small><b>{allPassed ? 'Ready for launch' : 'Review your mission'}</b></span></div><div className="verification-meta"><span><Sparkles aria-hidden="true" />{pointDesign}</span><span><Satellite aria-hidden="true" />{mission.name}</span><span><Orbit aria-hidden="true" />{getOrbit(configuration.orbitId).name}</span><span><Rocket aria-hidden="true" />{getRocket(configuration.rocketId).name}</span></div></section>
    <section className="checklist-section"><div className="checklist-heading"><div><span className="eyebrow">MISSION READINESS CHECKLIST</span><h2>{checks.length} checks across four mission segments</h2></div><NasaTag /></div>
      <div className="checklist-list">{checks.map((check, index) => <article key={check.id} className={`checklist-row ${check.passed ? 'check-pass' : 'check-fail'}`}>
        <span className="check-index">{String(index + 1).padStart(2, '0')}</span><span className="check-status-icon">{check.passed ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}</span><span className="check-copy"><b>{check.title}</b><small>{check.detail}</small></span><span className="check-segment">{check.segment}</span><span className={`status-label ${check.passed ? 'status-pass' : 'status-fail'}`}>{check.passed ? 'PASS' : 'FAIL'}</span>
      </article>)}</div>
    </section>
    <div className="verify-action-row"><span className="verify-advice"><TriangleAlert aria-hidden="true" />{flightReady ? 'Ready! Flight sounds and space events are set.' : 'Getting our rocket ready…'}</span><div className="design-action-buttons"><PrimaryButton variant="quiet" icon="left" onClick={onBackToDesign}>Revise design</PrimaryButton><PrimaryButton disabled={!flightReady} onClick={onLaunch}>{allPassed ? 'Start launch' : 'Launch anyway'}</PrimaryButton></div></div>
    <DataNote />
  </main>
}
