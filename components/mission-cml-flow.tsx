'use client'

import { ArrowRight, Check, CircleX, ShieldAlert, Target, TriangleAlert } from 'lucide-react'
import type { DifficultyId, MissionCheck, MissionEstimate, MissionProfile, MissionConfiguration, SpacecraftSize } from './mission-data'
import { DIFFICULTIES, formatMoney } from './mission-data'
import { WhyButton } from './mission-choice-help'
import type { ChoiceImpact } from './mission-choice-help'
import { DataNote, NasaTag, PageHeading, PrimaryButton } from './mission-ui'

function riskLabel(score: number) {
  if (score < 20) return 'Low'
  if (score < 50) return 'Moderate'
  return 'High'
}

export function FeasibilityScreen({ mission, size, difficulty, estimate, checks, showSkipWarning, onBack, onContinue, onSkip, onCancelSkip, onSkipAnyway }: {
  mission: MissionProfile
  size: SpacecraftSize
  difficulty: DifficultyId
  estimate: MissionEstimate
  checks: MissionCheck[]
  showSkipWarning: boolean
  onBack: () => void
  onContinue: () => void
  onSkip: () => void
  onCancelSkip: () => void
  onSkipAnyway: () => void
}) {
  const passed = checks.filter((check) => check.passed).length
  const failed = checks.length - passed
  const difficultyName = DIFFICULTIES.find((option) => option.id === difficulty)?.name ?? 'Normal'

  return <main className="flow-screen cml-screen feasibility-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Back to initial design</button>
    <PageHeading eyebrow="CML 2 — INITIAL FEASIBILITY" title="Will the pieces work together?" description="The first design is assembled. Check the main constraints before exploring alternatives." icon={<Target aria-hidden="true" />} />
    <section className={`feasibility-summary ${failed ? 'feasibility-review' : 'feasibility-ready'}`} aria-live="polite">
      <span className="feasibility-mark">{failed ? <TriangleAlert aria-hidden="true" /> : <Check aria-hidden="true" />}</span>
      <div><span className="eyebrow">INITIAL FEASIBILITY · {mission.shortName.toUpperCase()}</span><h2>{failed ? `${failed} item${failed === 1 ? '' : 's'} need attention` : 'The first design is feasible'}</h2><p>{failed ? 'This is an early check, not a final verdict. Compare two alternatives to see which trade-offs improve the mission.' : 'Your first-pass design meets the current checks. Explore alternatives before settling on a point design.'}</p></div>
      <div className="feasibility-score"><strong>{passed}<small> / {checks.length}</small></strong><span>CHECKS PASSED</span></div>
    </section>
    <div className="feasibility-metrics" aria-label="Feasibility summary metrics">
      <article><span>MISSION COST</span><strong>{formatMoney(estimate.totalCostM)}</strong><small>{formatMoney(estimate.budgetLimitM)} cap · {difficultyName}</small></article>
      <article><span>SCIENCE DATA</span><strong>{Math.round(estimate.scienceDataGb)} GB</strong><small>{estimate.dataTargetGb} GB minimum goal</small></article>
      <article className={`risk-summary risk-${riskLabel(estimate.riskScore).toLowerCase()}`}><span><ShieldAlert aria-hidden="true" /> DESIGN RISK</span><strong>{riskLabel(estimate.riskScore)}</strong><small>{estimate.riskScore} / 100 modeled risk</small></article>
    </div>
    {estimate.messyDesignIssues.length > 0 && <section className="messy-design-note" role="status"><TriangleAlert aria-hidden="true" /><span><b>Messy design penalty: −{estimate.messyDesignPenalty} science points.</b><small>{estimate.messyDesignIssues.join(' ')}</small></span></section>}
    <section className="feasibility-checks"><div className="feasibility-checks-heading"><div><span className="eyebrow">FIRST-PASS ENGINEERING CHECK</span><h2>Constraint results</h2></div><NasaTag /></div>
      <div className="feasibility-check-list">{checks.map((check) => <article className={check.passed ? 'feasibility-check-pass' : 'feasibility-check-fail'} key={check.id}>
        <span>{check.passed ? <Check aria-hidden="true" /> : <CircleX aria-hidden="true" />}</span><div><b>{check.title}</b><small>{check.detail}</small></div><strong>{check.passed ? 'PASS' : 'REVIEW'}</strong>
      </article>)}</div>
    </section>
    {showSkipWarning && <section className="trade-space-warning" role="alert"><TriangleAlert aria-hidden="true" /><div><b>NASA teams explore the trade space before choosing a design.</b><span>Compare two alternatives to see how science, cost, and risk move together.</span></div><div className="trade-warning-actions"><button className="text-action" onClick={onCancelSkip}>Compare alternatives</button><button className="text-action text-action-muted" onClick={onSkipAnyway}>Skip comparison</button></div></section>}
    <div className="cml-actions"><button className="skip-comparison-button" onClick={onSkip}>Skip comparison</button><PrimaryButton onClick={onContinue}>Build two alternatives</PrimaryButton></div>
    <DataNote />
  </main>
}

export function TradeSpaceScreen({ mission, size, alternativeA, alternativeB, estimateA, estimateB, onBack, onChoose }: {
  mission: MissionProfile
  size: SpacecraftSize
  alternativeA: MissionConfiguration
  alternativeB: MissionConfiguration
  estimateA: MissionEstimate
  estimateB: MissionEstimate
  onBack: () => void
  onChoose: (design: 'A' | 'B') => void
}) {
  return <main className="flow-screen cml-screen trade-space-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Back to Alternative B</button>
    <PageHeading eyebrow="CML 3 — TRADE SPACE" title="Compare before you commit." description={`Two alternatives for the ${mission.name.toLowerCase()} on a ${size.name}. Compare science, cost, and risk side by side.`} icon={<Target aria-hidden="true" />} />
    <div className="trade-space-intro"><span><b>TRADE-SPACE REVIEW</b><small>Each design changes the balance. There is no single best answer.</small></span><NasaTag /></div>
    <div className="trade-space-grid" aria-label="Side-by-side alternative design comparison">
      <AlternativeCard id="A" estimate={estimateA} onChoose={() => onChoose('A')} />
      <AlternativeCard id="B" estimate={estimateB} onChoose={() => onChoose('B')} />
    </div>
    <p className="trade-space-footnote">Choose an alternative to carry forward as the CML 4 Point Design. The selected design will be checked again before the simulated launch.</p>
    <DataNote />
  </main>
}

function AlternativeCard({ id, estimate, onChoose }: { id: 'A' | 'B'; estimate: MissionEstimate; onChoose: () => void }) {
  const risk = riskLabel(estimate.riskScore)
  const impact: ChoiceImpact = {
    mass: `${Math.round(estimate.spacecraftMassKg)} kg spacecraft mass against the selected class limit.`,
    power: `${Math.round(estimate.powerAvailableW)} W available for ${Math.round(estimate.powerDemandW)} W of demand.`,
    cost: `${formatMoney(estimate.totalCostM)} total mission estimate.`,
    data: `${Math.round(estimate.scienceDataGb)} GB modeled data against a ${estimate.dataTargetGb} GB goal.`,
    lifetime: `${estimate.lifetimeYears} modeled years from orbit, battery, and solar choices.`,
  }

  return <article className={`alternative-card alternative-${id.toLowerCase()}`}>
    <div className="alternative-card-heading"><span className="alternative-letter">{id}</span><span><small>TRADE-SPACE OPTION</small><h2>Alternative {id}</h2></span><span className={`risk-pill risk-pill-${risk.toLowerCase()}`}>{risk} risk</span></div>
    <div className="alternative-score-grid">
      <div className="alternative-score science-score"><span>SCIENCE</span><strong>{estimate.sciencePoints}<small> pts</small></strong><small>{Math.round(estimate.scienceDataGb)} GB returned</small></div>
      <div className="alternative-score cost-score"><span>MISSION COST</span><strong>{formatMoney(estimate.totalCostM)}</strong><small>Budget cap: {formatMoney(estimate.budgetLimitM)}</small></div>
      <div className={`alternative-score risk-score risk-${risk.toLowerCase()}`}><span>DESIGN RISK</span><strong>{risk}</strong><small>{estimate.riskScore} / 100</small></div>
    </div>
    <div className="alternative-detail-list"><span><b>Mass</b>{Math.round(estimate.spacecraftMassKg)} kg</span><span><b>Power</b>{Math.round(estimate.powerAvailableW)} / {Math.round(estimate.powerDemandW)} W</span><span><b>Lifetime</b>{estimate.lifetimeYears} years</span></div>
    {estimate.messyDesignPenalty > 0 && <div className="alternative-penalty"><TriangleAlert aria-hidden="true" /><span>Messy design: −{estimate.messyDesignPenalty} science points</span></div>}
    <div className="alternative-card-actions"><WhyButton impact={impact} /><button className="point-design-button" onClick={onChoose}>Choose as Point Design <ArrowRight aria-hidden="true" /></button></div>
  </article>
}
