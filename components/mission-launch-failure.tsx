'use client'

import { getRocket, type MissionConfiguration, type MissionEstimate } from './mission-data'
import type { LaunchResult } from './mission-simulation'
import { PageHeading, PrimaryButton } from './mission-ui'

export function MissionLaunchFailure({ configuration, estimate, result, learningBonus, onRetry, onContinue }: {
  configuration: MissionConfiguration
  estimate: MissionEstimate
  result: LaunchResult
  learningBonus: number
  onRetry: () => void
  onContinue: () => void
}) {
  const rocket = getRocket(configuration.rocketId)
  const designFailure = result.failureType === 'design-limit'
  const fix = result.failureType === 'engine-shutdown'
    ? 'Engine checks and a little more fuel can help next time.'
    : result.failureType === 'bad-guidance'
      ? 'A careful gravity turn can guide the ship onto its path.'
      : result.failureType === 'fairing-issue'
        ? 'A fairing check protects the ship during its bumpy ride.'
        : 'Pick a rocket that can lift the ship and reach its destination.'

  return <main className="flow-screen launch-learning-screen">
    <PageHeading eyebrow="FLIGHT SCHOOL · LEARN AND TRY AGAIN" title="Every launch teaches us!" description={result.failureReason ?? 'Our rocket did not reach orbit this time.'} />
    <section className="launch-learning-card">
      <h2>{designFailure ? 'Let’s fix the flight plan.' : 'Real engineers learn from test flights.'}</h2>
      <svg viewBox="0 0 520 180" role="img" aria-label="Chart showing the payload and the rocket lift limit">
        <path d="M50 145H490M50 35V145" fill="none" stroke="#8595ce" strokeWidth="4" />
        <rect x="120" y={145 - Math.min(100, estimate.payloadMassKg / Math.max(1, rocket.payloadKg) * 100)} width="85" height={Math.min(100, estimate.payloadMassKg / Math.max(1, rocket.payloadKg) * 100)} rx="12" fill={estimate.payloadMassKg > rocket.payloadKg ? '#ff8b89' : '#78f3b4'} />
        <rect x="315" y="45" width="85" height="100" rx="12" fill="#70c9ff" />
        <text x="162" y="168" textAnchor="middle" fill="#fff" fontSize="16">SHIP</text>
        <text x="357" y="168" textAnchor="middle" fill="#fff" fontSize="16">ROCKET LIMIT</text>
      </svg>
      <p><b>What we learned:</b> {fix}</p>
      {learningBonus > 0 && <p className="learning-bonus-note">Learning bonus: retry chance is up by {learningBonus} points.</p>}
      <div className="launch-learning-actions">
        <PrimaryButton onClick={onRetry}>Try the same design again</PrimaryButton>
        <button type="button" className="learning-continue-button" onClick={onContinue}>Continue to mission notes</button>
      </div>
    </section>
  </main>
}
