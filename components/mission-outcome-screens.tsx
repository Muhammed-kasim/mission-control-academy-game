'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, CircleCheck, CircleX, Orbit, Rocket, Satellite, Sparkles, Target, TriangleAlert } from 'lucide-react'
import type { DifficultyId, GameStep, MissionCheck, MissionConfiguration, MissionEstimate, MissionProfile, SpacecraftSize } from './mission-data'
import { getOrbit, getRocket } from './mission-data'
import type { SimulatedMissionEvent } from './mission-simulation'
import { MissionReport } from './mission-report'
import { DataNote, NasaTag, PageHeading, PrimaryButton, WarningBanner } from './mission-ui'

export function MissionOutcomeScreen({ step, mission, size, difficulty, configuration, estimate, checks, pointDesign, alternativeA, alternativeB, events, runId, exploredTradeSpace, backLabel, onBackToDesign, onLaunch, onReport, onTryAgain, onRestart }: {
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
  backLabel: string
  onBackToDesign: () => void
  onLaunch: () => void
  onReport: () => void
  onTryAgain: () => void
  onRestart: () => void
}) {
  if (step === 'launch') return <LaunchSequence mission={mission} checks={checks} events={events} onReport={onReport} />
  if (step === 'report') return <MissionReport mission={mission} size={size} difficulty={difficulty} configuration={configuration} estimate={estimate} checks={checks} pointDesign={pointDesign} alternativeA={alternativeA} alternativeB={alternativeB} events={events} runId={runId} exploredTradeSpace={exploredTradeSpace} onTryAgain={onTryAgain} onRestart={onRestart} />

  const passed = checks.filter((check) => check.passed).length
  const allPassed = passed === checks.length
  return <main className="flow-screen outcome-screen">
    <button className="back-link" onClick={onBackToDesign}><span>←</span> {backLabel}</button>
    <PageHeading eyebrow="CML 4 — POINT DESIGN" title="Build & verify your point design." description="Your selected design is the mission baseline. Check every requirement before the simulated launch." icon={<Target aria-hidden="true" />} />
    <WarningBanner checks={checks} />
    <section className="verification-summary"><div className={`verification-score ${allPassed ? 'score-ready' : 'score-review'}`}><span className="score-ring"><strong>{passed}<small>/{checks.length}</small></strong></span><span><small>REQUIREMENTS PASSED</small><b>{allPassed ? 'Ready for launch' : 'Review your mission'}</b></span></div><div className="verification-meta"><span><Sparkles aria-hidden="true" />{pointDesign}</span><span><Satellite aria-hidden="true" />{mission.name}</span><span><Orbit aria-hidden="true" />{getOrbit(configuration.orbitId).name}</span><span><Rocket aria-hidden="true" />{getRocket(configuration.rocketId).name}</span></div></section>
    <section className="checklist-section"><div className="checklist-heading"><div><span className="eyebrow">MISSION READINESS CHECKLIST</span><h2>{checks.length} checks across four mission segments</h2></div><NasaTag /></div>
      <div className="checklist-list">{checks.map((check, index) => <article key={check.id} className={`checklist-row ${check.passed ? 'check-pass' : 'check-fail'}`}>
        <span className="check-index">{String(index + 1).padStart(2, '0')}</span><span className="check-status-icon">{check.passed ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}</span><span className="check-copy"><b>{check.title}</b><small>{check.detail}</small></span><span className="check-segment">{check.segment}</span><span className={`status-label ${check.passed ? 'status-pass' : 'status-fail'}`}>{check.passed ? 'PASS' : 'FAIL'}</span>
      </article>)}</div>
    </section>
    <div className="verify-action-row"><span className="verify-advice"><TriangleAlert aria-hidden="true" />{allPassed ? 'The flight plan is green. Ready to simulate launch.' : 'Launching with failures will be a simulation only; failed checks remain in the final report.'}</span><div className="design-action-buttons"><PrimaryButton variant="quiet" icon="left" onClick={onBackToDesign}>Revise design</PrimaryButton><PrimaryButton onClick={onLaunch}>{allPassed ? 'Proceed to launch' : 'Launch anyway'}</PrimaryButton></div></div>
    <DataNote />
  </main>
}

function LaunchSequence({ mission, checks, events, onReport }: { mission: MissionProfile; checks: MissionCheck[]; events: SimulatedMissionEvent[]; onReport: () => void }) {
  const [countdown, setCountdown] = useState(5)
  const [visibleEventCount, setVisibleEventCount] = useState(0)
  useEffect(() => {
    const countdownTimer = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000)
    const eventTimer = window.setInterval(() => setVisibleEventCount((current) => Math.min(events.length, current + 1)), 1300)
    const complete = window.setTimeout(onReport, 7800)
    return () => { window.clearInterval(countdownTimer); window.clearInterval(eventTimer); window.clearTimeout(complete) }
  }, [events.length, onReport])
  const allPassed = checks.every((check) => check.passed)
  const activeEvent = visibleEventCount ? events[Math.min(visibleEventCount - 1, events.length - 1)] : undefined
  return <main className="launch-screen">
    <div className="launch-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
    <div className="launch-console-top"><span><i className="console-live" /> FLIGHT CONTROL / LIVE SIMULATION</span><span>MISSION 01 — {mission.shortName.toUpperCase()}</span></div>
    <div className="launch-main">
      <div className="launch-countdown"><span>PRE-LAUNCH SEQUENCE</span><strong>{countdown === 0 ? 'LIFTOFF' : `T − 00:0${countdown}`}</strong><small>{allPassed ? 'ALL FLIGHT SYSTEMS GO' : `${checks.filter((check) => !check.passed).length} CHECKS CARRIED INTO FLIGHT`}</small></div>
      <div className="launch-scene" aria-label="Animated spacecraft lifting off">
        <span className="launch-horizon" /><span className="launch-light launch-light-a" /><span className="launch-light launch-light-b" /><span className="launch-light launch-light-c" />
        <span className="launch-smoke smoke-a" /><span className="launch-smoke smoke-b" /><span className="launch-flame"><i /><i /><i /></span>
        <span className="launch-rocket"><span className="launch-rocket-tip" /><span className="launch-rocket-body"><Satellite aria-hidden="true" /></span><span className="launch-rocket-fin launch-fin-left" /><span className="launch-rocket-fin launch-fin-right" /></span>
      </div>
      <div className="launch-status"><span className="status-line" /><strong>{activeEvent ? `${activeEvent.title} ${activeEvent.survived ? 'contained' : 'degraded operations'}` : 'Flight path initiated'}</strong><span>Simulating mission insertion into {mission.name === 'Mars Weather Satellite' ? 'Mars' : mission.name === 'Moon Orbiter' ? 'lunar' : 'polar'} orbit.</span></div>
      <ol className="launch-event-feed" aria-label="Random events during launch and operations" aria-live="polite">{events.map((event, index) => {
        const revealed = index < visibleEventCount
        return <li className={`launch-event-row ${revealed ? event.survived ? 'launch-event-contained' : 'launch-event-impact' : 'launch-event-pending'}`} key={`${event.id}-${index}`}>
          <span className="launch-event-state">{revealed ? event.survived ? 'CONTAINED' : 'IMPACT' : 'STANDBY'}</span>
          <span><strong>{revealed ? event.title : `Operations event ${String(index + 1).padStart(2, '0')}`}</strong><small>{revealed ? `Level ${event.severity} · ${event.mitigation}` : 'Awaiting random event window'}</small></span>
        </li>
      })}</ol>
      <button className="launch-skip" onClick={onReport}>Skip to mission report <ArrowRight aria-hidden="true" /></button>
    </div>
    <div className="launch-console-bottom"><span><span className="console-square" /> PROPULSION NOMINAL</span><span><span className="console-square" /> TELEMETRY LINK ACTIVE</span><span><span className="console-square" /> SIMULATION ONLY</span></div>
  </main>
}
