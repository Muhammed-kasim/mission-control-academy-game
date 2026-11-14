'use client'

import { ArrowLeft, ArrowRight, Check, CircleHelp, Orbit, Rocket, Satellite, TriangleAlert } from 'lucide-react'
import type { GameStep, MissionCheck, MissionEstimate, MissionProfile, SpacecraftSize } from './mission-data'
import { formatMass, formatMoney, formatYears } from './mission-data'

export function NasaTag({ children = 'NASA Data' }: { children?: string }) {
  return <span className="nasa-tag"><span className="nasa-tag-dot" />{children}</span>
}

const JOURNEY_STAGES = ['Planet', 'Ship size', 'Build ship', 'Fly', 'Stars']

function getCmlStageIndex(step: GameStep) {
  if (step === 'mission') return 0
  if (step === 'size') return 1
  if (['requirements', 'design', 'negotiation', 'feasibility', 'alternative-a', 'alternative-b', 'trade-space'].includes(step)) return 2
  if (['verify', 'launch', 'operations'].includes(step)) return 3
  return 4
}

export function GameHeader({ step, mission, size, onHome }: { step: GameStep; mission?: MissionProfile; size?: SpacecraftSize; onHome: () => void }) {
  const stepIndex = getCmlStageIndex(step)
  return (
    <header className="app-header">
      <a className="brand-lockup" href="#top" onClick={(event) => { event.preventDefault(); onHome() }} aria-label="Mission Control Academy home">
        <span className="brand-mark"><Orbit aria-hidden="true" /></span>
        <span className="brand-words"><strong>SPACE ADVENTURE</strong><span>WITH NOVA</span></span>
      </a>
      <div className="header-center">
        <span className="header-kicker">YOUR SPACE CREW</span>
        <span className="header-game-name">A planet-saving game</span>
      </div>
      <div className="header-context">
        {mission ? <><span className="context-icon"><Satellite aria-hidden="true" /></span><span className="context-text"><strong>{mission.shortName}</strong><small>{size?.name ?? 'Mission design'}</small></span></> : <span className="header-freeplay"><span /> NO LOGIN · FREEPLAY</span>}
      </div>
      {step !== 'welcome' && step !== 'sources' && <div className="stepper" aria-label="Adventure steps">
        {JOURNEY_STAGES.map((label, index) => {
          const status = index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'upcoming'
          return <div className={`stepper-step stepper-${status}`} key={label} aria-current={status === 'current' ? 'step' : undefined}>
            <span className="stepper-dot">{status === 'done' ? <Check aria-hidden="true" /> : String(index + 1)}</span>
            <span className="stepper-label"><strong>{label}</strong></span>
          </div>
        })}
      </div>}
    </header>
  )
}

interface StatItem { id: string; label: string; value: string; caption: string; progress: number; status: 'good' | 'watch' | 'bad'; detail: string }

function statusForRatio(ratio: number): StatItem['status'] {
  if (ratio < 0.75 || ratio > 1.25) return 'bad'
  if (ratio < 0.98 || ratio > 1.02) return 'watch'
  return 'good'
}

export function TelemetryStrip({ estimate, size, mission }: { estimate: MissionEstimate; size: SpacecraftSize; mission: MissionProfile }) {
  const metrics: StatItem[] = [
    { id: 'budget', label: 'Budget', value: `${formatMoney(estimate.totalCostM)} / ${formatMoney(estimate.budgetLimitM)}`, caption: 'Mission estimate', progress: estimate.totalCostM / estimate.budgetLimitM, status: statusForRatio(estimate.totalCostM / estimate.budgetLimitM), detail: 'Includes vehicle, hardware, stations, and operations.' },
    { id: 'mass', label: 'Mass', value: `${formatMass(estimate.spacecraftMassKg)} / ${formatMass(size.massLimitKg)}`, caption: 'Spacecraft total', progress: estimate.spacecraftMassKg / size.massLimitKg, status: statusForRatio(estimate.spacecraftMassKg / size.massLimitKg), detail: 'Spacecraft payload mass compared with its class limit.' },
    { id: 'power', label: 'Power', value: `${Math.round(estimate.powerAvailableW)} / ${Math.round(estimate.powerDemandW)} W`, caption: 'Available / needed', progress: estimate.powerAvailableW / estimate.powerDemandW, status: estimate.powerAvailableW >= estimate.powerDemandW ? 'good' : 'bad', detail: 'Solar generation plus battery reserve versus spacecraft load.' },
    { id: 'data', label: 'Data', value: `${Math.round(estimate.scienceDataGb)} / ${estimate.dataTargetGb} GB`, caption: 'Delivered / target', progress: estimate.scienceDataGb / estimate.dataTargetGb, status: estimate.scienceDataGb >= estimate.dataTargetGb ? 'good' : 'bad', detail: 'Estimated science data returned after ground coverage.' },
    { id: 'communication', label: 'Communication', value: `${Math.round(estimate.communicationCapacityGbPerDay)} / ${Math.round(estimate.requiredDataGbPerDay)} GB/day`, caption: 'Capacity / needed', progress: estimate.communicationCapacityGbPerDay / estimate.requiredDataGbPerDay, status: estimate.communicationCapacityGbPerDay >= estimate.requiredDataGbPerDay ? 'good' : 'bad', detail: 'Antenna and ground network throughput.' },
    { id: 'lifetime', label: 'Lifetime', value: `${formatYears(estimate.lifetimeYears)} / ${formatYears(mission.missionYears)}`, caption: 'Orbit / target', progress: estimate.lifetimeYears / mission.missionYears, status: estimate.lifetimeYears >= mission.missionYears ? 'good' : 'bad', detail: 'Modeled orbit lifetime plus battery-life bonus.' },
  ]

  return <section className="telemetry" aria-label="Live mission telemetry">
    <div className="telemetry-heading">    <span>SHIP CHECK</span><span className="telemetry-live"><i /> CHANGES AS YOU BUILD</span></div>
    <div className="telemetry-grid">
      {metrics.map((metric) => <div className={`metric-card metric-${metric.status}`} key={metric.id} title={metric.detail}>
        <div className="metric-topline"><span>{metric.label}</span><span className="metric-pip" /></div>
        <strong className="metric-value">{metric.value}</strong>
        <div className="metric-track" role="meter" aria-label={metric.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(metric.progress * 100))}>
          <span style={{ width: `${Math.max(3, Math.min(100, metric.progress * 100))}%` }} />
        </div>
        <span className="metric-caption">{metric.caption}</span>
      </div>)}
    </div>
  </section>
}

export function WarningBanner({ checks }: { checks: MissionCheck[] }) {
  const failed = checks.filter((check) => !check.passed)
  if (!failed.length) return <div className="all-systems-banner"><span className="systems-check"><Check aria-hidden="true" /></span><span><strong>All systems within limits</strong><small>Your current configuration meets every mission check.</small></span></div>
  const primary = failed[0]
  return <div className="warning-banner" role="status" aria-live="polite">
    <span className="warning-icon"><TriangleAlert aria-hidden="true" /></span>
    <span className="warning-copy"><strong>{primary.title} — attention required</strong><small>{primary.detail}{failed.length > 1 ? `  + ${failed.length - 1} more ${failed.length === 2 ? 'check' : 'checks'} need review.` : ''}</small></span>
    <span className="warning-count">{failed.length} {failed.length === 1 ? 'ISSUE' : 'ISSUES'}</span>
  </div>
}

export function PageHeading({ eyebrow, title, description, icon }: { eyebrow: string; title: string; description: string; icon?: React.ReactNode }) {
  return <div className="page-heading">
    {icon && <span className="page-heading-icon">{icon}</span>}
    <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
  </div>
}

export function PrimaryButton({ children, onClick, disabled, variant = 'primary', icon = 'right', type = 'button' }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: 'primary' | 'quiet'; icon?: 'right' | 'left' | 'none'; type?: 'button' | 'submit' }) {
  return <button className={`primary-button ${variant === 'quiet' ? 'button-quiet' : ''}`} onClick={onClick} disabled={disabled} type={type}>
    {icon === 'left' && <ArrowLeft aria-hidden="true" />}{children}{icon === 'right' && <ArrowRight aria-hidden="true" />}
  </button>
}

export function DataNote() {
  return <p className="data-note"><CircleHelp aria-hidden="true" /> Our game uses simple numbers. Real space missions can be different.</p>
}

export function SegmentPill({ label, active = false, icon }: { label: string; active?: boolean; icon: 'launch' | 'space' | 'ground' | 'user' }) {
  const Icon = icon === 'launch' ? Rocket : icon === 'space' ? Satellite : icon === 'ground' ? Orbit : CircleHelp
  return <span className={`segment-pill ${active ? 'segment-active' : ''}`}><Icon aria-hidden="true" />{label}</span>
}
