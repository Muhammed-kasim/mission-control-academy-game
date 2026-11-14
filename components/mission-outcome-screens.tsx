'use client'

import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowRight, Check, CircleCheck, CircleX, Clock3, Crosshair, FileText, Flag, Globe2, Orbit, RadioTower, Rocket, Satellite, Sparkles, Target, TriangleAlert, UsersRound } from 'lucide-react'
import type { GameStep, MissionCheck, MissionConfiguration, MissionEstimate, MissionProfile, SpacecraftSize } from './mission-data'
import { formatMass, formatMoney, formatYears, getInstrument, getOrbit, getRocket, getUserProduct } from './mission-data'
import { DataNote, NasaTag, PageHeading, PrimaryButton, SegmentPill, WarningBanner } from './mission-ui'

export function MissionOutcomeScreen({ step, mission, size, configuration, estimate, checks, onBackToDesign, onLaunch, onReport, onRestart }: {
  step: GameStep
  mission: MissionProfile
  size: SpacecraftSize
  configuration: MissionConfiguration
  estimate: MissionEstimate
  checks: MissionCheck[]
  onBackToDesign: () => void
  onLaunch: () => void
  onReport: () => void
  onRestart: () => void
}) {
  if (step === 'launch') return <LaunchSequence mission={mission} checks={checks} onReport={onReport} />
  if (step === 'report') return <MissionReport mission={mission} size={size} configuration={configuration} estimate={estimate} checks={checks} onRestart={onRestart} />

  const passed = checks.filter((check) => check.passed).length
  const allPassed = passed === checks.length
  return <main className="flow-screen outcome-screen">
    <button className="back-link" onClick={onBackToDesign}><span>←</span> Return to spacecraft design</button>
    <PageHeading eyebrow="05 — SYSTEMS REVIEW" title="Build & verify." description="Every requirement has a reason. Fix what you need, or test the design as it stands." icon={<Target aria-hidden="true" />} />
    <WarningBanner checks={checks} />
    <section className="verification-summary"><div className={`verification-score ${allPassed ? 'score-ready' : 'score-review'}`}><span className="score-ring"><strong>{passed}<small>/{checks.length}</small></strong></span><span><small>REQUIREMENTS PASSED</small><b>{allPassed ? 'Ready for launch' : 'Review your mission'}</b></span></div><div className="verification-meta"><span><Satellite aria-hidden="true" />{mission.name}</span><span><Orbit aria-hidden="true" />{getOrbit(configuration.orbitId).name}</span><span><Rocket aria-hidden="true" />{getRocket(configuration.rocketId).name}</span></div></section>
    <section className="checklist-section"><div className="checklist-heading"><div><span className="eyebrow">MISSION READINESS CHECKLIST</span><h2>{checks.length} checks across four mission segments</h2></div><NasaTag /></div>
      <div className="checklist-list">{checks.map((check, index) => <article key={check.id} className={`checklist-row ${check.passed ? 'check-pass' : 'check-fail'}`}>
        <span className="check-index">{String(index + 1).padStart(2, '0')}</span><span className="check-status-icon">{check.passed ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}</span><span className="check-copy"><b>{check.title}</b><small>{check.detail}</small></span><span className="check-segment">{check.segment}</span><span className={`status-label ${check.passed ? 'status-pass' : 'status-fail'}`}>{check.passed ? 'PASS' : 'FAIL'}</span>
      </article>)}</div>
    </section>
    <div className="verify-action-row"><span className="verify-advice"><TriangleAlert aria-hidden="true" />{allPassed ? 'The flight plan is green. Ready to simulate launch.' : 'Launching with failures will be a simulation only; failed checks remain in the final report.'}</span><div className="design-action-buttons"><PrimaryButton variant="quiet" icon="left" onClick={onBackToDesign}>Revise design</PrimaryButton><PrimaryButton onClick={onLaunch}>{allPassed ? 'Proceed to launch' : 'Launch anyway'}</PrimaryButton></div></div>
    <DataNote />
  </main>
}

function LaunchSequence({ mission, checks, onReport }: { mission: MissionProfile; checks: MissionCheck[]; onReport: () => void }) {
  const [countdown, setCountdown] = useState(5)
  useEffect(() => {
    const interval = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000)
    const complete = window.setTimeout(onReport, 5200)
    return () => { window.clearInterval(interval); window.clearTimeout(complete) }
  }, [onReport])
  const allPassed = checks.every((check) => check.passed)
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
      <div className="launch-status"><span className="status-line" /><strong>Flight path initiated</strong><span>Simulating mission insertion into {mission.name === 'Mars Weather Satellite' ? 'Mars' : mission.name === 'Moon Orbiter' ? 'lunar' : 'polar'} orbit.</span></div>
      <button className="launch-skip" onClick={onReport}>Skip animation <ArrowRight aria-hidden="true" /></button>
    </div>
    <div className="launch-console-bottom"><span><span className="console-square" /> PROPULSION NOMINAL</span><span><span className="console-square" /> TELEMETRY LINK ACTIVE</span><span><span className="console-square" /> SIMULATION ONLY</span></div>
  </main>
}

function MissionReport({ mission, size, configuration, estimate, checks, onRestart }: { mission: MissionProfile; size: SpacecraftSize; configuration: MissionConfiguration; estimate: MissionEstimate; checks: MissionCheck[]; onRestart: () => void }) {
  const passed = checks.filter((check) => check.passed).length
  const allPassed = passed === checks.length
  const readiness = Math.round((passed / checks.length) * 65 + Math.min(1, estimate.sciencePoints / 25) * 35)
  const grade = readiness >= 90 ? 'A' : readiness >= 78 ? 'B' : readiness >= 64 ? 'C' : 'D'
  const userProduct = getUserProduct(configuration.userId)
  const instruments = configuration.instrumentIds.map(getInstrument).filter((item): item is NonNullable<typeof item> => Boolean(item))
  return <main className="flow-screen report-screen">
    <div className="report-kicker"><span><FileText aria-hidden="true" /> MISSION DEBRIEF / FINAL REPORT</span><span>ACADEMY SIMULATION · 01</span></div>
    <section className={`report-hero ${allPassed ? 'report-success' : 'report-review'}`}>
      <div className="report-hero-copy"><span className="eyebrow">FLIGHT REPORT · {mission.shortName.toUpperCase()}</span><h1>{allPassed ? 'Mission accomplished.' : 'Mission data received.'}</h1><p>{allPassed ? 'Your mission met every success criteria. The science is ready for the people who need it.' : 'The spacecraft completed its simulated flight. Some design requirements were missed — review them before the next mission.'}</p><div className="report-mission-tags"><span><Satellite aria-hidden="true" />{size.name}</span><span><Orbit aria-hidden="true" />{getOrbit(configuration.orbitId).name}</span><span><Rocket aria-hidden="true" />{getRocket(configuration.rocketId).name}</span></div></div>
      <div className="report-grade"><span>MISSION SCORE</span><strong>{grade}</strong><small>{readiness} / 100</small><span className="grade-caption">{passed} of {checks.length} checks passed</span></div>
    </section>
    <section className="report-metric-grid" aria-label="Mission results">
      <article><span><RadioTower aria-hidden="true" /> SCIENCE DATA</span><strong>{Math.round(estimate.scienceDataGb)}<small> GB</small></strong><p>Target: {estimate.dataTargetGb} GB</p><div className="report-meter"><i style={{ width: `${Math.min(100, estimate.scienceDataGb / estimate.dataTargetGb * 100)}%` }} /></div></article>
      <article><span><Satellite aria-hidden="true" /> SPACECRAFT MASS</span><strong>{formatMass(estimate.spacecraftMassKg)}</strong><p>Class limit: {formatMass(size.massLimitKg)}</p><div className="report-meter"><i style={{ width: `${Math.min(100, estimate.spacecraftMassKg / size.massLimitKg * 100)}%` }} /></div></article>
      <article><span><Sparkles aria-hidden="true" /> MISSION COST</span><strong>{formatMoney(estimate.totalCostM)}</strong><p>Budget limit: {formatMoney(estimate.budgetLimitM)}</p><div className="report-meter"><i style={{ width: `${Math.min(100, estimate.totalCostM / estimate.budgetLimitM * 100)}%` }} /></div></article>
      <article><span><Clock3 aria-hidden="true" /> MISSION LIFETIME</span><strong>{formatYears(estimate.lifetimeYears)}</strong><p>Target: {formatYears(mission.missionYears)}</p><div className="report-meter"><i style={{ width: `${Math.min(100, estimate.lifetimeYears / mission.missionYears * 100)}%` }} /></div></article>
    </section>
    <div className="report-detail-grid">
      <section className="report-panel"><div className="report-panel-heading"><span className="eyebrow">MISSION ARCHITECTURE</span><h2>Four segments. One mission.</h2></div><div className="report-segments">
        <div><SegmentPill label="Launch" icon="launch" /><b>{getRocket(configuration.rocketId).name}</b><small>{getOrbit(configuration.orbitId).name}</small></div>
        <div><SegmentPill label="Space" icon="space" /><b>{instruments.length ? instruments.map((item) => item.shortName).join(', ') : 'No science instruments'}</b><small>{Math.round(estimate.powerAvailableW)} W available · {formatMass(estimate.spacecraftMassKg)}</small></div>
        <div><SegmentPill label="Ground" icon="ground" /><b>{configuration.stations} ground {configuration.stations === 1 ? 'station' : 'stations'}</b><small>{Math.round(estimate.communicationCapacityGbPerDay)} GB/day link capacity</small></div>
        <div><SegmentPill label="User" icon="user" /><b>{userProduct.name}</b><small>For {userProduct.audience.toLowerCase()}</small></div>
      </div></section>
      <section className="report-panel report-check-panel"><div className="report-panel-heading"><span className="eyebrow">REQUIREMENT RESULTS</span><h2>{passed} / {checks.length} checks passed</h2></div><div className="report-checks">{checks.map((check) => <div key={check.id} className={check.passed ? 'report-check-pass' : 'report-check-fail'}><span>{check.passed ? <Check aria-hidden="true" /> : <CircleX aria-hidden="true" />}</span><span><b>{check.title}</b><small>{check.detail}</small></span><strong>{check.passed ? 'PASS' : 'FAIL'}</strong></div>)}</div></section>
    </div>
    <section className="report-next-step"><span className="report-next-icon"><UsersRound aria-hidden="true" /></span><span><small>SCIENCE DATA RECIPIENT</small><b>{userProduct.name} · {userProduct.audience}</b></span><span className="report-next-divider" /><span><small>NEXT STEP</small><b>{allPassed ? 'Share your mission with the world.' : 'Adjust the failed checks and run another flight.'}</b></span><span className="report-next-arrow"><ArrowDownRight aria-hidden="true" /></span></section>
    <div className="report-actions"><span><NasaTag /> <span>Mission numbers are simplified for the game, not NASA engineering estimates.</span></span><PrimaryButton onClick={onRestart}>Design another mission</PrimaryButton></div>
  </main>
}
