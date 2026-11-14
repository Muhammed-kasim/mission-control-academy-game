'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Coins, Weight, Zap } from 'lucide-react'
import {
  getAntennaOptions,
  getBatteryOptions,
  getOrbit,
  getRocket,
  getShieldingOptions,
  getSolarOptions,
  getUserProduct,
  INSTRUMENTS,
  ORBITS,
  ROCKETS,
  USER_PRODUCTS,
  type MissionCheck,
  type MissionConfiguration,
  type MissionEstimate,
  type MissionProfile,
  type SpacecraftSize,
} from './mission-data'
import { getRoleOwner, type PlayMode, type TeamRoleId } from './team-mode'

interface FixSuggestion {
  role: TeamRoleId
  patch: Partial<MissionConfiguration>
}

const ISSUE_ORDER = ['orbit-access', 'payload', 'power', 'communication', 'mass', 'budget', 'data', 'lifetime', 'coherence', 'mission-orbit']

function chooseSuggestion(issueId: string, mission: MissionProfile, size: SpacecraftSize, configuration: MissionConfiguration, estimate: MissionEstimate): FixSuggestion | null {
  const selectedInstruments = INSTRUMENTS.filter((instrument) => configuration.instrumentIds.includes(instrument.id))
  const heaviestInstrument = [...selectedInstruments].sort((a, b) => b.massKg - a.massKg)[0]
  const mostCostlyInstrument = [...selectedInstruments].sort((a, b) => b.costM - a.costM)[0]
  const currentRocket = getRocket(configuration.rocketId)

  if (issueId === 'orbit-access' || issueId === 'payload') {
    const rocket = ROCKETS
      .filter((item) => item.orbitIds.includes(configuration.orbitId as never) && item.payloadKg >= estimate.payloadMassKg)
      .sort((a, b) => a.costM - b.costM)[0]
    if (rocket && rocket.id !== configuration.rocketId) return { role: 'designer', patch: { rocketId: rocket.id } }
    if (issueId === 'orbit-access') {
      const capable = ROCKETS.find((item) => item.orbitIds.includes(configuration.orbitId as never))
      if (capable) return { role: 'designer', patch: { rocketId: capable.id } }
    }
    if (heaviestInstrument) return { role: 'science', patch: { instrumentIds: configuration.instrumentIds.filter((id) => id !== heaviestInstrument.id) } }
    return null
  }

  if (issueId === 'power') {
    const solar = getSolarOptions(size).find((option) => option.id === configuration.solarId) ?? getSolarOptions(size)[0]
    const strongerSolar = getSolarOptions(size)
      .filter((option) => option.watts! > solar.watts!)
      .sort((a, b) => a.watts! - b.watts!)[0]
    if (strongerSolar) return { role: 'engineer', patch: { solarId: strongerSolar.id } }
    if (heaviestInstrument) return { role: 'science', patch: { instrumentIds: configuration.instrumentIds.filter((id) => id !== heaviestInstrument.id) } }
  }

  if (issueId === 'communication') {
    const antenna = getAntennaOptions(size).find((option) => option.id === configuration.antennaId) ?? getAntennaOptions(size)[0]
    const strongerAntenna = [...getAntennaOptions(size)].sort((a, b) => b.gbPerDay! - a.gbPerDay!)[0]
    if (strongerAntenna.id !== antenna.id || configuration.stations < 3) {
      return { role: 'communications', patch: { antennaId: strongerAntenna.id, stations: 3 } }
    }
  }

  if (issueId === 'mass') {
    if (heaviestInstrument) return { role: 'science', patch: { instrumentIds: configuration.instrumentIds.filter((id) => id !== heaviestInstrument.id) } }
    if (configuration.shieldingId !== 'none') return { role: 'engineer', patch: { shieldingId: 'none' } }
    const currentSolar = getSolarOptions(size).find((option) => option.id === configuration.solarId) ?? getSolarOptions(size)[0]
    const currentBattery = getBatteryOptions(size).find((option) => option.id === configuration.batteryId) ?? getBatteryOptions(size)[0]
    const currentAntenna = getAntennaOptions(size).find((option) => option.id === configuration.antennaId) ?? getAntennaOptions(size)[0]
    const lighterPart = [
      ...getSolarOptions(size).filter((option) => option.massKg < currentSolar.massKg).map((option) => ({ massKg: option.massKg, patch: { solarId: option.id } })),
      ...getBatteryOptions(size).filter((option) => option.massKg < currentBattery.massKg).map((option) => ({ massKg: option.massKg, patch: { batteryId: option.id } })),
      ...getAntennaOptions(size).filter((option) => option.massKg < currentAntenna.massKg).map((option) => ({ massKg: option.massKg, patch: { antennaId: option.id } })),
    ].sort((a, b) => a.massKg - b.massKg)[0]
    if (lighterPart) return { role: 'engineer', patch: lighterPart.patch }
  }

  if (issueId === 'budget') {
    const savings: { amount: number; role: TeamRoleId; patch: Partial<MissionConfiguration> }[] = []
    if (mostCostlyInstrument) savings.push({ amount: mostCostlyInstrument.costM, role: 'science', patch: { instrumentIds: configuration.instrumentIds.filter((id) => id !== mostCostlyInstrument.id) } })
    for (const option of getSolarOptions(size)) if (option.costM < (getSolarOptions(size).find((item) => item.id === configuration.solarId)?.costM ?? 0)) savings.push({ amount: (getSolarOptions(size).find((item) => item.id === configuration.solarId)?.costM ?? 0) - option.costM, role: 'engineer', patch: { solarId: option.id } })
    for (const option of getBatteryOptions(size)) if (option.costM < (getBatteryOptions(size).find((item) => item.id === configuration.batteryId)?.costM ?? 0)) savings.push({ amount: (getBatteryOptions(size).find((item) => item.id === configuration.batteryId)?.costM ?? 0) - option.costM, role: 'engineer', patch: { batteryId: option.id } })
    for (const option of getAntennaOptions(size)) if (option.costM < (getAntennaOptions(size).find((item) => item.id === configuration.antennaId)?.costM ?? 0)) savings.push({ amount: (getAntennaOptions(size).find((item) => item.id === configuration.antennaId)?.costM ?? 0) - option.costM, role: 'communications', patch: { antennaId: option.id } })
    if (configuration.stations > 1) savings.push({ amount: 2, role: 'communications', patch: { stations: configuration.stations - 1 } })
    const userProduct = getUserProduct(configuration.userId)
    for (const option of USER_PRODUCTS) if (option.costM < userProduct.costM) savings.push({ amount: userProduct.costM - option.costM, role: 'communications', patch: { userId: option.id } })
    const cheaperRocket = ROCKETS.filter((item) => item.id !== currentRocket.id && item.costM < currentRocket.costM && item.payloadKg >= estimate.payloadMassKg && item.orbitIds.includes(configuration.orbitId as never)).sort((a, b) => a.costM - b.costM)[0]
    if (cheaperRocket) savings.push({ amount: currentRocket.costM - cheaperRocket.costM, role: 'designer', patch: { rocketId: cheaperRocket.id } })
    const bestSaving = savings.sort((a, b) => b.amount - a.amount)[0]
    if (bestSaving) return { role: bestSaving.role, patch: bestSaving.patch }
  }

  if (issueId === 'data') {
    const addedInstrument = INSTRUMENTS.filter((instrument) => !configuration.instrumentIds.includes(instrument.id))
      .sort((a, b) => b.dataGb - a.dataGb)[0]
    if (addedInstrument && configuration.instrumentIds.length < 4) {
      return { role: 'science', patch: { instrumentIds: [...configuration.instrumentIds, addedInstrument.id] } }
    }
  }

  if (issueId === 'lifetime') {
    const battery = getBatteryOptions(size).find((option) => option.id === configuration.batteryId) ?? getBatteryOptions(size)[0]
    const longerBattery = [...getBatteryOptions(size)].sort((a, b) => (b.lifetimeBonus ?? 0) - (a.lifetimeBonus ?? 0))[0]
    if ((longerBattery.lifetimeBonus ?? 0) > (battery.lifetimeBonus ?? 0)) return { role: 'engineer', patch: { batteryId: longerBattery.id } }
    const solar = getSolarOptions(size).find((option) => option.id === configuration.solarId) ?? getSolarOptions(size)[0]
    const longerSolar = [...getSolarOptions(size)].sort((a, b) => (b.lifetimeBonus ?? 0) - (a.lifetimeBonus ?? 0))[0]
    if ((longerSolar.lifetimeBonus ?? 0) > (solar.lifetimeBonus ?? 0)) return { role: 'engineer', patch: { solarId: longerSolar.id } }
  }

  if (issueId === 'coherence') {
    if (configuration.stations < 3) return { role: 'communications', patch: { stations: 3 } }
    if (heaviestInstrument) return { role: 'science', patch: { instrumentIds: configuration.instrumentIds.filter((id) => id !== heaviestInstrument.id) } }
  }

  if (issueId === 'mission-orbit') {
    const targetOrbit = ORBITS.find((orbit) => orbit.id === mission.targetOrbit)
    if (targetOrbit && targetOrbit.id !== configuration.orbitId && currentRocket.orbitIds.includes(targetOrbit.id as never)) {
      return { role: 'designer', patch: { orbitId: targetOrbit.id } }
    }
    const capable = ROCKETS.find((rocket) => rocket.orbitIds.includes(mission.targetOrbit as never) && rocket.payloadKg >= estimate.payloadMassKg)
    if (capable && capable.id !== currentRocket.id) return { role: 'designer', patch: { rocketId: capable.id } }
  }

  return null
}

function issueMessage(issueId: string, mission: MissionProfile, size: SpacecraftSize, configuration: MissionConfiguration, estimate: MissionEstimate) {
  switch (issueId) {
    case 'orbit-access':
      return `${getRocket(configuration.rocketId).name} cannot reach ${getOrbit(configuration.orbitId).name}. Try a rocket with a longer reach.`
    case 'payload':
      return `This rocket can lift ${getRocket(configuration.rocketId).payloadKg.toLocaleString()} kg, but your ship weighs ${Math.round(estimate.payloadMassKg).toLocaleString()} kg. Remove a tool or pick a bigger rocket.`
    case 'power':
      return `Your ship needs ${Math.round(estimate.powerDemandW)} W but makes ${Math.round(estimate.powerAvailableW)} W. Try bigger power panels.`
    case 'communication':
      return `Your ship sends ${Math.round(estimate.communicationCapacityGbPerDay)} GB each day but needs ${Math.round(estimate.requiredDataGbPerDay)} GB. Try a bigger antenna or more stations.`
    case 'mass':
      return `Your ship weighs ${Math.round(estimate.spacecraftMassKg)} kg, but its limit is ${size.massLimitKg.toLocaleString()} kg. Remove a tool or lighter part.`
    case 'budget': {
      const coinsLeft = estimate.budgetLimitM - estimate.totalCostM
      return coinsLeft < 0
        ? `We need $${Math.abs(Math.round(coinsLeft)).toLocaleString()}M more than our coins allow. Swap a costly part.`
        : "You're almost out of money! Swap a costly part."
    }
    case 'data':
      return `We need ${estimate.dataTargetGb} GB of science, but our ship brings ${Math.round(estimate.scienceDataGb)} GB. Add a science tool.`
    case 'lifetime':
      return `Our ship lasts ${estimate.lifetimeYears.toFixed(1)} years, but this trip needs ${mission.missionYears}. Try a longer-life battery.`
    case 'coherence':
      return 'Some parts need more help working together. Add another message station.'
    case 'mission-orbit':
      return `Our path does not match ${mission.name}. Choose the path made for this trip.`
    default:
      return "Something needs a small fix. Try changing one ship part."
  }
}

export function MissionDesignAdvisor({ mission, size, configuration, estimate, checks, sandboxEnabled, playMode, playerCount, activePlayer, activeRole, onPlayerChange, onRoleChange, onChange }: {
  mission: MissionProfile
  size: SpacecraftSize
  configuration: MissionConfiguration
  estimate: MissionEstimate
  checks: MissionCheck[]
  sandboxEnabled: boolean
  playMode: PlayMode
  playerCount: number
  activePlayer: number
  activeRole: TeamRoleId
  onPlayerChange: (player: number) => void
  onRoleChange: (role: TeamRoleId) => void
  onChange: (patch: Partial<MissionConfiguration>) => void
}) {
  const [message, setMessage] = useState('')
  const failedChecks = checks.filter((check) => !check.passed)
  const remaining = estimate.budgetLimitM - estimate.totalCostM
  const budgetIsClose = remaining <= estimate.budgetLimitM * 0.1
  const issue = ISSUE_ORDER
    .map((id) => {
      const failedCheck = failedChecks.find((check) => check.id === id)
      if (failedCheck) return failedCheck
      const budgetCheck = id === 'budget' && budgetIsClose ? checks.find((check) => check.id === 'budget') : undefined
      return budgetCheck ? { ...budgetCheck, passed: false } : undefined
    })
    .find((check) => check !== undefined)
  const suggestion = useMemo(
    () => issue ? chooseSuggestion(issue.id, mission, size, configuration, estimate) : null,
    [issue?.id, mission, size, configuration, estimate],
  )

  const owner = suggestion ? getRoleOwner(suggestion.role, playerCount) : undefined
  const canEdit = playMode === 'solo' || playerCount === 1 || (owner === activePlayer && activeRole === suggestion?.role)
  const AdvisorIcon = issue?.id === 'mass' || issue?.id === 'payload' ? Weight : issue?.id === 'power' ? Zap : AlertTriangle

  useEffect(() => {
    setMessage('')
  }, [configuration, issue?.id])

  if (sandboxEnabled) return null

  return <section className="design-advisor" aria-label="Money and ship advice">
    <div className={`coin-meter ${remaining <= estimate.budgetLimitM * 0.1 ? 'coin-meter-low' : ''}`}>
      <Coins aria-hidden="true" />
      <span><b>${Math.max(0, Math.round(remaining)).toLocaleString()}M</b><small>COINS LEFT</small></span>
    </div>
    {issue && <div className="design-advisor-message" role="status" aria-live="polite">
      <span className="advisor-icon"><AdvisorIcon aria-hidden="true" /></span>
      <span className="advisor-copy"><b>Nova noticed something</b><span>{message || issueMessage(issue.id, mission, size, configuration, estimate)}</span>
        {suggestion && playMode === 'team' && playerCount > 1 && <small>{canEdit ? `Player ${activePlayer} can fix this as ${suggestion.role}.` : `Player ${owner} controls this as ${suggestion.role}.`}</small>}
      </span>
      {suggestion && <button type="button" className="advisor-fix-button" onClick={() => {
        if (!canEdit && owner !== undefined) {
          onPlayerChange(owner)
          onRoleChange(suggestion.role)
          setMessage(`Player ${owner}, tap again to make this fix.`)
          return
        }
        onChange(suggestion.patch)
        setMessage('Nice fix! Let’s check the ship again.')
      }}>Fix it for me</button>}
      {!suggestion && <span className="advisor-no-fix">Try a different ship part.</span>}
    </div>}
    {!issue && <div className="design-advisor-ready"><Zap aria-hidden="true" /><span><b>Ship looks good!</b><small>Keep building or check your ship.</small></span></div>}
  </section>
}
