import type { MissionCheck, MissionConfiguration, MissionEstimate, SpacecraftSize } from './mission-data'

export type MissionEventId = 'solar-flare' | 'antenna-glitch' | 'micrometeoroid' | 'data-overload'

export interface SimulatedMissionEvent {
  id: MissionEventId
  title: string
  severity: number
  damage: number
  survived: boolean
  mitigation: string
  detail: string
  dataLossFraction: number
}

export interface MissionScoreItem {
  id: string
  label: string
  earned: number
  available: number
  detail: string
}

export interface MissionScore {
  items: MissionScoreItem[]
  total: number
}

const EVENT_ORDER: MissionEventId[] = ['solar-flare', 'antenna-glitch', 'micrometeoroid', 'data-overload']
const EVENT_TITLES: Record<MissionEventId, string> = {
  'solar-flare': 'Solar flare',
  'antenna-glitch': 'Antenna glitch',
  micrometeoroid: 'Micro-meteoroid',
  'data-overload': 'Data overload',
}

function shuffledEvents() {
  const events = [...EVENT_ORDER]
  for (let index = events.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[events[index], events[swapIndex]] = [events[swapIndex], events[index]]
  }
  return events
}

function mitigationFor(id: MissionEventId, configuration: MissionConfiguration) {
  if (id === 'solar-flare') {
    const protection = configuration.batteryId === 'deep-space' ? 2 : configuration.batteryId === 'extended' ? 1 : 0
    return {
      protection,
      detail: protection ? `${configuration.batteryId === 'deep-space' ? 'Deep-space' : 'Extended'} battery absorbed part of the power spike.` : 'The standard battery had little reserve for the power spike.',
    }
  }

  if (id === 'antenna-glitch') {
    const protection = Number(configuration.stations >= 2) + Number(configuration.antennaId === 'high-gain')
    const mitigators = [configuration.stations >= 2 ? 'A second ground station' : '', configuration.antennaId === 'high-gain' ? 'the high-gain antenna' : ''].filter(Boolean)
    return {
      protection,
      detail: mitigators.length ? `${mitigators.join(' and ')} kept a backup data path available.` : 'The downlink had no redundant station or high-gain backup.',
    }
  }

  if (id === 'micrometeoroid') {
    const protection = configuration.shieldingId === 'reinforced' ? 2 : configuration.shieldingId === 'light' ? 1 : 0
    return {
      protection,
      detail: protection ? `${configuration.shieldingId === 'reinforced' ? 'Reinforced shielding' : 'The shielding blanket'} absorbed part of the impact.` : 'No extra shielding was selected, so the spacecraft body took the impact.',
    }
  }

  const protection = Number(configuration.antennaId === 'high-gain') + Number(configuration.stations >= 2)
  const mitigators = [configuration.antennaId === 'high-gain' ? 'the high-gain antenna' : '', configuration.stations >= 2 ? 'more than one station' : ''].filter(Boolean)
  const payloadLoad = configuration.instrumentIds.length >= 4 ? 1 : 0
  return {
    protection,
    severityBonus: payloadLoad,
    detail: `${mitigators.length ? `${mitigators.join(' and ')} helped clear the queue` : 'The downlink had little spare capacity'}${payloadLoad ? '; a full instrument suite added extra data pressure' : ''}.`,
  }
}

export function simulateMissionEvents(configuration: MissionConfiguration): SimulatedMissionEvent[] {
  return shuffledEvents().map((id) => {
    const mitigation = mitigationFor(id, configuration)
    const baseSeverity = 1 + Math.floor(Math.random() * 3)
    const severity = Math.min(4, baseSeverity + ('severityBonus' in mitigation ? mitigation.severityBonus ?? 0 : 0))
    const damage = Math.max(0, severity - mitigation.protection)
    const survived = damage <= 1
    const dataLossFraction = damage === 0 ? 0 : damage === 1 ? 0.05 : damage === 2 ? 0.15 : 0.3

    return {
      id,
      title: EVENT_TITLES[id],
      severity,
      damage,
      survived,
      mitigation: mitigation.detail,
      detail: survived
        ? damage === 0 ? 'Systems stayed within safe limits.' : 'A small disruption was contained; science operations continued.'
        : 'The disruption exceeded recovery capacity and reduced science return.',
      dataLossFraction,
    }
  })
}

export function calculateMissionScore(estimate: MissionEstimate, size: SpacecraftSize, checks: MissionCheck[], events: SimulatedMissionEvent[], exploredTradeSpace: boolean): MissionScore {
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  const sciencePoints = Math.round(clamp(estimate.sciencePoints / 25) * 40)
  const requirements = Math.round((checks.length ? checks.filter((check) => check.passed).length / checks.length : 0) * 20)
  const budgetUse = estimate.budgetLimitM > 0 ? estimate.totalCostM / estimate.budgetLimitM : 1
  const massUse = estimate.spacecraftMassKg / Math.max(1, size.massLimitKg)
  const budgetEfficiency = Math.round(clamp(1 - budgetUse / 2) * 10)
  const massEfficiency = Math.round(clamp(1 - massUse / 2) * 10)
  const resourceEfficiency = budgetEfficiency + massEfficiency
  const eventSurvival = Math.round((events.length ? events.filter((event) => event.survived).length / events.length : 0) * 10)
  const tradeSpace = exploredTradeSpace ? 10 : 0
  const items: MissionScoreItem[] = [
    { id: 'science', label: 'Science value', earned: sciencePoints, available: 40, detail: `${estimate.sciencePoints} modeled science points, scaled against 25 points for full credit.` },
    { id: 'requirements', label: 'Requirements met', earned: requirements, available: 20, detail: `${checks.filter((check) => check.passed).length} of ${checks.length} final checks passed.` },
    { id: 'resources', label: 'Efficient resource use', earned: resourceEfficiency, available: 20, detail: `Budget use: ${Math.round(budgetUse * 100)}%; mass use: ${Math.round(massUse * 100)}% of the spacecraft limit.` },
    { id: 'events', label: 'Surviving events', earned: eventSurvival, available: 10, detail: `${events.filter((event) => event.survived).length} of ${events.length} random events contained.` },
    { id: 'trade-space', label: 'Trade-space exploration', earned: tradeSpace, available: 10, detail: exploredTradeSpace ? 'Two alternatives were compared before selecting the point design.' : 'No alternatives were compared before launch.' },
  ]

  return { items, total: items.reduce((total, item) => total + item.earned, 0) }
}

export function calculateRecoveredScienceData(estimate: MissionEstimate, events: SimulatedMissionEvent[]) {
  const remainingFraction = events.reduce((remaining, event) => remaining * (1 - event.dataLossFraction), 1)
  return estimate.scienceDataGb * remainingFraction
}

