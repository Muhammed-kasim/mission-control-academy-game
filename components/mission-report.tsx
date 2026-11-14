'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BadgeCheck, BatteryCharging, CircleAlert, CircleCheck, FileText, Globe2, Rocket, Satellite, Sparkles, Trophy } from 'lucide-react'
import { calculateMission, formatMass, formatMoney, formatYears, getAntennaOptions, getBatteryOptions, getOrbit, getRocket, getShieldingOptions, getSolarOptions, getUserProduct, type DifficultyId, type MissionCheck, type MissionConfiguration, type MissionEstimate, type MissionProfile, type SpacecraftSize } from './mission-data'
import { calculateMissionScore, calculateRecoveredScienceData, type MissionScore, type MissionScoreItem, type SimulatedMissionEvent } from './mission-simulation'
import { MissionSpacecraftDiagram } from './mission-spacecraft-diagram'
import { NasaTag, PrimaryButton } from './mission-ui'

const LEADERBOARD_KEY = 'mission-control-academy-leaderboard-v1'

interface LeaderboardEntry {
  id: string
  label: string
  score: number
  timestamp: number
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return typeof entry.id === 'string' && typeof entry.label === 'string' && typeof entry.score === 'number' && typeof entry.timestamp === 'number'
}

function readLeaderboard() {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LEADERBOARD_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isLeaderboardEntry) : []
  } catch {
    return []
  }
}

function getSimilarMission(mission: MissionProfile, size: SpacecraftSize, configuration: MissionConfiguration) {
  if (mission.id === 'moon') {
    return { name: 'Lunar Reconnaissance Orbiter (LRO)', reason: 'Like your mission, LRO maps the Moon and helps identify safe landing regions.' }
  }
  if (mission.id === 'mars') {
    return configuration.instrumentIds.includes('magnetometer')
      ? { name: 'MAVEN', reason: 'MAVEN studies how the Martian atmosphere changes and escapes into space.' }
      : { name: 'Mars Reconnaissance Orbiter (MRO)', reason: 'MRO uses orbital instruments to map Mars and study its surface and atmosphere.' }
  }
  if (size.family === 'cubesat') {
    return { name: 'TEMPEST-D CubeSat', reason: 'This NASA technology-demonstration CubeSat observed storms and the water cycle in Earth’s atmosphere.' }
  }
  return configuration.instrumentIds.includes('thermal')
    ? { name: 'Terra', reason: 'Terra studies Earth’s land, atmosphere, and changing climate with multiple observing instruments.' }
    : { name: 'Landsat', reason: 'Landsat records long-term changes in Earth’s land surface for science and planning.' }
}

function getDesignSummary(configuration: MissionConfiguration, size: SpacecraftSize) {
  const solar = getSolarOptions(size).find((option) => option.id === configuration.solarId) ?? getSolarOptions(size)[0]
  const battery = getBatteryOptions(size).find((option) => option.id === configuration.batteryId) ?? getBatteryOptions(size)[0]
  const antenna = getAntennaOptions(size).find((option) => option.id === configuration.antennaId) ?? getAntennaOptions(size)[0]
  const shielding = getShieldingOptions(size).find((option) => option.id === configuration.shieldingId) ?? getShieldingOptions(size)[0]
  return [solar.name, battery.name, shielding.name, antenna.name, `${configuration.stations} ${configuration.stations === 1 ? 'ground station' : 'ground stations'}`].join(' · ')
}

function getTradeReason(estimate: MissionEstimate, isSelected: boolean, isSuggested: boolean, pointDesign: string) {
  if (isSuggested) return 'Not flown on this mission. Compare it on a future run to see how the extra protection or leaner hardware changes cost, risk, and science.'
  if (isSelected) return `Selected as the point design. It returned ${Math.round(estimate.scienceDataGb)} GB of modeled science data at ${formatMoney(estimate.totalCostM)}.`
  return `Compared during the trade study, then set aside when ${pointDesign} became the point design.`
}

function buildImprovementTips(events: SimulatedMissionEvent[], checks: MissionCheck[], exploredTradeSpace: boolean) {
  const tips: string[] = []
  const failedCheck = checks.find((check) => !check.passed)
  if (!exploredTradeSpace) tips.push('Build and compare two alternatives before choosing a point design to earn the trade-space points.')
  else if (failedCheck) tips.push(`${failedCheck.title}: ${failedCheck.detail}`)
  else tips.push('Keep one alternative lean and one resilient so you can compare the extra cost of protection against the risk reduction.')

  const failedEvent = events.find((event) => !event.survived) ?? events.find((event) => event.damage > 0)
  if (failedEvent?.id === 'solar-flare') tips.push('Upgrade to an extended or deep-space battery to give the spacecraft more reserve during a solar flare.')
  else if (failedEvent?.id === 'antenna-glitch') tips.push('Add a second ground station or a higher-capacity antenna to create a backup data path.')
  else if (failedEvent?.id === 'micrometeoroid') tips.push('Add a shielding blanket or reinforced shield to reduce debris-impact damage.')
  else if (failedEvent?.id === 'data-overload') tips.push('Increase downlink capacity with a high-gain antenna or another ground station.')
  else tips.push('Try another event draw with this same design, then adjust one component if a new weak spot appears.')

  if (tips.length < 2) tips.push('Use the resource score to decide whether added hardware is worth its cost and mass.')
  return tips.slice(0, 2)
}

export function MissionReport({ mission, size, difficulty, configuration, estimate, checks, pointDesign, alternativeA, alternativeB, events, runId, exploredTradeSpace, onTryAgain, onRestart }: {
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
  onTryAgain: () => void
  onRestart: () => void
}) {
  const score = useMemo(() => calculateMissionScore(estimate, size, checks, events, exploredTradeSpace), [estimate, size, checks, events, exploredTradeSpace])
  const recoveredDataGb = calculateRecoveredScienceData(estimate, events)
  const userProduct = getUserProduct(configuration.userId)
  const similarMission = getSimilarMission(mission, size, configuration)
  const passedChecks = checks.filter((check) => check.passed)
  const failedChecks = checks.filter((check) => !check.passed)
  const survivedEvents = events.filter((event) => event.survived)
  const failedEvents = events.filter((event) => !event.survived)
  const improvementTips = buildImprovementTips(events, checks, exploredTradeSpace)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    const existing = readLeaderboard()
    const currentFlight: LeaderboardEntry = {
      id: runId,
      label: `${mission.shortName} · ${size.name}`,
      score: score.total,
      timestamp: Date.now(),
    }
    const nextLeaderboard = [...existing.filter((entry) => entry.id !== runId), currentFlight]
      .sort((left, right) => right.score - left.score || left.timestamp - right.timestamp)
      .slice(0, 10)
    try {
      window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(nextLeaderboard))
    } catch {
      setLeaderboard([])
      return
    }
    setLeaderboard(nextLeaderboard)
  }, [mission.shortName, runId, score.total, size.name])

  const tradeOptions = useMemo(() => {
    if (alternativeA && alternativeB) {
      return [
        { label: 'Alternative A', configuration: alternativeA, selected: pointDesign === 'Alternative A', suggested: false },
        { label: 'Alternative B', configuration: alternativeB, selected: pointDesign === 'Alternative B', suggested: false },
      ]
    }
    return [
      { label: 'Lean alternative', configuration: { ...configuration, batteryId: 'standard', shieldingId: 'none', stations: 1 }, selected: false, suggested: true },
      { label: 'Resilient alternative', configuration: { ...configuration, batteryId: 'deep-space', shieldingId: 'reinforced', antennaId: 'high-gain', stations: Math.max(2, configuration.stations) }, selected: false, suggested: true },
    ]
  }, [alternativeA, alternativeB, configuration, pointDesign])

  return <main className="flow-screen report-screen mission-report-screen">
    <div className="report-kicker"><span><FileText aria-hidden="true" /> MISSION DEBRIEF / FINAL REPORT</span><span>FLIGHT {runId.slice(-6).toUpperCase()}</span></div>
    <section className={`report-hero ${score.total >= 70 ? 'report-success' : 'report-review'}`}>
      <div className="report-hero-copy"><span className="eyebrow">MISSION REPORT · {mission.shortName.toUpperCase()}</span><h1>{score.total >= 70 ? 'A flight worth learning from.' : 'Every flight teaches the next.'}</h1><p>{mission.description} The score reflects science, requirements, resource choices, event survival, and whether you explored alternatives.</p><div className="report-mission-tags"><span><Sparkles aria-hidden="true" />{pointDesign}</span><span><Satellite aria-hidden="true" />{size.name}</span><span><Globe2 aria-hidden="true" />{getOrbit(configuration.orbitId).name}</span><span><Rocket aria-hidden="true" />{getRocket(configuration.rocketId).name}</span></div></div>
      <div className="report-grade"><span>MISSION SCORE</span><strong>{score.total}</strong><small>OUT OF 100</small><span className="grade-caption">{survivedEvents.length} of {events.length} events contained</span></div>
    </section>

    <div className="report-primary-grid">
      <ReportSection index="01" title="Concept summary" eyebrow="MISSION CONCEPT">
        <p className="report-concept-copy">{mission.description}</p>
        <div className="report-fact-grid"><Fact label="Science goal" value={mission.science} /><Fact label="Spacecraft" value={size.name} /><Fact label="Point design" value={pointDesign} /><Fact label="Target orbit" value={getOrbit(configuration.orbitId).name} /></div>
      </ReportSection>
      <ReportSection index="02" title="Resources summary" eyebrow="FLIGHT HARDWARE">
        <div className="report-resource-grid">
          <Resource label="Spacecraft mass" value={formatMass(estimate.spacecraftMassKg)} detail={`Limit ${formatMass(size.massLimitKg)}`} />
          <Resource label="Power balance" value={`${Math.round(estimate.powerAvailableW)} / ${Math.round(estimate.powerDemandW)} W`} detail="Available / demand" />
          <Resource label="Mission cost" value={formatMoney(estimate.totalCostM)} detail={`Budget ${formatMoney(estimate.budgetLimitM)}`} />
          <Resource label="Science returned" value={`${Math.round(recoveredDataGb)} GB`} detail={`${Math.round(estimate.scienceDataGb)} GB before event losses`} />
          <Resource label="Mission lifetime" value={formatYears(estimate.lifetimeYears)} detail={`Goal ${formatYears(mission.missionYears)}`} />
          <Resource label="Ground network" value={`${configuration.stations} ${configuration.stations === 1 ? 'station' : 'stations'}`} detail={`${Math.round(estimate.communicationCapacityGbPerDay)} GB/day capacity`} />
        </div>
        <p className="report-hardware-line"><BatteryCharging aria-hidden="true" />{getDesignSummary(configuration, size)}</p>
      </ReportSection>
    </div>

    <section className="report-section report-trade-section">
      <SectionHeading index="03" eyebrow="DESIGN DECISIONS" title="Trade tree" detail={exploredTradeSpace ? 'Two alternatives were compared before the final choice.' : 'Comparison skipped. These two modeled directions show what to explore next.'} />
      <div className="report-trade-options">{tradeOptions.map((option, index) => {
        const alternativeEstimate = calculateMission(mission, size, option.configuration, difficulty)
        return <article className={`report-trade-card ${index === 0 ? 'report-trade-a' : 'report-trade-b'} ${option.selected ? 'report-trade-selected' : ''}`} key={option.label}>
          <div className="report-trade-heading"><span className="report-trade-letter">{index === 0 ? 'A' : 'B'}</span><span><small>{option.suggested ? 'SUGGESTED NEXT-RUN OPTION' : 'COMPARED DESIGN'}</small><h3>{option.label}</h3></span>{option.selected && <span className="selected-design"><BadgeCheck aria-hidden="true" /> POINT DESIGN</span>}</div>
          <p>{getDesignSummary(option.configuration, size)}</p>
          <div className="report-trade-metrics"><span><b>{alternativeEstimate.sciencePoints}</b> science pts</span><span><b>{formatMoney(alternativeEstimate.totalCostM)}</b> cost</span><span><b>{alternativeEstimate.riskScore}</b> risk / 100</span></div>
          <small className="report-trade-reason">{getTradeReason(alternativeEstimate, option.selected, option.suggested, pointDesign)}</small>
        </article>
      })}</div>
    </section>

    <div className="report-primary-grid">
      <section className="report-section report-event-section">
        <SectionHeading index="04" eyebrow="LAUNCH & OPERATIONS" title="Random event log" detail={`${survivedEvents.length} contained · ${failedEvents.length} degraded`} />
        <div className="report-event-list">{events.map((event, index) => <article className={`report-event-row ${event.survived ? 'event-survived' : 'event-degraded'}`} key={`${event.id}-${index}`}>
          <span className="report-event-status">{event.survived ? <CircleCheck aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}</span>
          <div><strong>{event.title}</strong><small>Severity {event.severity} · {event.detail}</small><small className="event-mitigation">{event.mitigation}</small></div>
          <span className="report-event-result">{event.survived ? 'CONTAINED' : 'DEGRADED'}</span>
        </article>)}</div>
      </section>
      <section className="report-section report-score-section">
        <SectionHeading index="05" eyebrow="100-POINT RUBRIC" title="Score breakdown" detail="Each category has a fixed maximum weight." />
        <ScoreBreakdown items={score.items} total={score.total} />
      </section>
    </div>

    <div className="report-primary-grid report-learning-grid">
      <ReportSection index="06" title="What went well" eyebrow="FLIGHT REVIEW">
        <ul className="report-bullet-list report-wins">
          <li>{passedChecks.length} of {checks.length} engineering checks passed before launch.</li>
          <li>{survivedEvents.length} of {events.length} events were contained; about {Math.round(recoveredDataGb)} GB of science data made it home.</li>
          <li>{userProduct.name} is ready to share results with {userProduct.audience.toLowerCase()}.</li>
        </ul>
      </ReportSection>
      <ReportSection index="07" title="What failed and why" eyebrow="AREAS TO IMPROVE">
        {failedChecks.length === 0 && failedEvents.length === 0
          ? <p className="report-no-failures">No requirement failed and all four event disruptions were contained. Review the score categories for opportunities to improve efficiency.</p>
          : <ul className="report-bullet-list report-failures">{failedChecks.slice(0, 2).map((check) => <li key={check.id}><b>{check.title}:</b> {check.detail}</li>)}{failedEvents.slice(0, 3).map((event, index) => <li key={`${event.id}-${index}`}><b>{event.title}:</b> {event.mitigation}</li>)}</ul>}
      </ReportSection>
    </div>

    <section className="report-section report-tips-section">
      <SectionHeading index="08" eyebrow="NEXT DESIGN ITERATION" title="Two tips to improve" detail="Try one change at a time so you can see its effect." />
      <ol className="report-tips-list">{improvementTips.map((tip, index) => <li key={tip}><span>{String(index + 1).padStart(2, '0')}</span><p>{tip}</p></li>)}</ol>
    </section>

    <div className="report-primary-grid report-visual-grid">
      <section className="report-section report-spacecraft-section">
        <SectionHeading index="09" eyebrow="POINT DESIGN DRAWING" title="Your spacecraft" detail="A simplified illustration of the selected parts; not to scale." />
        <MissionSpacecraftDiagram configuration={configuration} size={size} />
      </section>
      <section className="report-section report-real-mission-section">
        <SectionHeading index="10" eyebrow="REAL-WORLD CONNECTION" title="Similar real NASA mission" detail="A mission with a related goal or instrument approach." />
        <div className="real-mission-card"><span className="real-mission-icon"><Globe2 aria-hidden="true" /></span><div><span className="eyebrow">NASA MISSION REFERENCE</span><h3>{similarMission.name}</h3><p>{similarMission.reason}</p></div></div>
        <div className="report-source-note"><NasaTag /><span>Game values are simplified for learning and are not NASA engineering estimates.</span></div>
      </section>
    </div>

    <section className="report-section report-leaderboard-section">
      <SectionHeading index="11" eyebrow="LOCAL FLIGHT RECORDS" title="Best mission scores" detail="Saved only in this browser. No account or server upload." />
      {leaderboard.length ? <ol className="mission-leaderboard">{leaderboard.map((entry, index) => <li className={entry.id === runId ? 'leaderboard-current' : ''} key={entry.id}><span className="leaderboard-rank">{index === 0 ? <Trophy aria-label="Top score" /> : String(index + 1).padStart(2, '0')}</span><span className="leaderboard-name">{entry.label}<small>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(entry.timestamp)}</small></span><strong>{entry.score}<small> / 100</small></strong></li>)}</ol> : <p className="leaderboard-empty">Complete a flight to add its score to this browser’s board.</p>}
    </section>

    <div className="report-actions mission-report-actions"><span><NasaTag /><span>Try Again reruns the simulation with this exact design and a new set of random events.</span></span><div><PrimaryButton variant="quiet" onClick={onTryAgain}>Try Again</PrimaryButton><PrimaryButton onClick={onRestart}>Design another mission</PrimaryButton></div></div>
  </main>
}

function SectionHeading({ index, eyebrow, title, detail }: { index: string; eyebrow: string; title: string; detail: string }) {
  return <header className="report-section-heading"><span className="report-section-index">{index}</span><span><small className="eyebrow">{eyebrow}</small><h2>{title}</h2><p>{detail}</p></span></header>
}

function ReportSection({ index, title, eyebrow, children }: { index: string; title: string; eyebrow: string; children: ReactNode }) {
  return <section className="report-section"><SectionHeading index={index} eyebrow={eyebrow} title={title} detail="" />{children}</section>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="report-fact"><small>{label}</small><strong>{value}</strong></div>
}

function Resource({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="report-resource"><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>
}

function ScoreBreakdown({ items, total }: { items: MissionScoreItem[]; total: MissionScore['total'] }) {
  return <div className="report-score-breakdown"><ol>{items.map((item) => <li key={item.id}><div className="score-row-heading"><span>{item.label}</span><strong>{item.earned}<small> / {item.available}</small></strong></div><div className="score-track" aria-hidden="true"><i style={{ width: `${item.earned / item.available * 100}%` }} /></div><small>{item.detail}</small></li>)}</ol><div className="score-total-row"><span>FINAL SCORE</span><strong>{total}<small> / 100</small></strong></div></div>
}

