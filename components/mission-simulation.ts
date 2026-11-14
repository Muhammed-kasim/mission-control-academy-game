import type { MissionCheck, MissionConfiguration, MissionEstimate, SpacecraftSize } from './mission-data'
import type { NasaSolarFlare } from './nasa-data'

export type MissionEventId = 'solar-flare' | 'antenna-glitch' | 'micrometeoroid' | 'data-overload'
export type OperationsResponse = 'brace' | 'safe-mode' | 'reroute-power' | 'missed'

export interface SimulatedMissionEvent {
  id: MissionEventId
  title: string
  severity: number
  damage: number
  survived: boolean
  mitigation: string
  detail: string
  dataLossFraction: number
  response?: OperationsResponse
  flare?: NasaSolarFlare
}

export interface MissionOperationsResult {
  daysCompleted: number
  scienceDataGb: number
  downloadedDataGb: number
  batteryPercent: number
  dailyScienceData: number[]
  analysisPoints: number
  quizCorrect: boolean
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

export interface LaunchPhaseResult {
  phase: 'throttle' | 'gravity-turn' | 'separation'
  grade: 'Perfect' | 'Good' | 'Miss'
  combo: number
  points: number
}

export type LaunchPhaseName = LaunchPhaseResult['phase']

export function calculateLaunchChance(rocketId: string, payloadMassKg: number, payloadLimitKg: number, learningBonus = 0) {
  const baseChance = rocketId === 'falcon9' ? 95 : rocketId === 'sls' ? 94 : rocketId === 'electron' ? 90 : 88
  const loadRatio = Math.max(0, Math.min(1, payloadMassKg / Math.max(1, payloadLimitKg)))
  const loadPenalty = Math.max(0, loadRatio - 0.65) * 16
  return Math.max(70, Math.min(99, Math.round(baseChance - loadPenalty + learningBonus)))
}

export interface LaunchResult {
  success: boolean
  failureReason?: string
  failureType?: 'engine-shutdown' | 'bad-guidance' | 'fairing-issue' | 'design-limit'
  chancePercent?: number
  roll?: number
  learningBonus?: number
  phases: LaunchPhaseResult[]
  combo: number
  score: number
  orbitAccuracy: number
  fuelMargin: number
  lifetimeMultiplier: number
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

function flareSeverity(flare: NasaSolarFlare | undefined) {
  if (!flare) return 1 + Math.floor(Math.random() * 3)
  const match = /^([BCMX])(\d+(?:\.\d+)?)$/i.exec(flare.classType.trim())
  if (!match) return 1 + Math.floor(Math.random() * 3)
  const classIndex = { B: 1, C: 2, M: 3, X: 4 }[match[1].toUpperCase() as 'B' | 'C' | 'M' | 'X']
  return classIndex + Number(match[2]) / 10
}

function dataLossForDamage(damage: number, flare?: NasaSolarFlare) {
  if (flare) return Math.min(0.5, Math.max(0, damage) * 0.08)
  return damage === 0 ? 0 : damage === 1 ? 0.05 : damage === 2 ? 0.15 : 0.3
}

export function simulateMissionEvents(configuration: MissionConfiguration, flare?: NasaSolarFlare): SimulatedMissionEvent[] {
  return shuffledEvents().map((id) => {
    const mitigation = mitigationFor(id, configuration)
    const baseSeverity = id === 'solar-flare' ? flareSeverity(flare) : 1 + Math.floor(Math.random() * 3)
    const severity = Math.min(flare ? 5 : 4, baseSeverity + ('severityBonus' in mitigation ? mitigation.severityBonus ?? 0 : 0))
    const damage = Math.max(0, severity - mitigation.protection)
    const survived = damage <= 1
    const dataLossFraction = dataLossForDamage(damage, id === 'solar-flare' ? flare : undefined)

    return {
      id,
      title: id === 'solar-flare' && flare ? `${flare.sample ? 'Sample' : 'Real'} ${flare.classType} solar flare` : EVENT_TITLES[id],
      severity,
      damage,
      survived,
      mitigation: mitigation.detail,
      detail: survived
        ? damage === 0 ? 'Systems stayed within safe limits.' : 'A small disruption was contained; science operations continued.'
        : 'The disruption exceeded recovery capacity and reduced science return.',
      dataLossFraction,
      ...(id === 'solar-flare' && flare ? { flare } : {}),
    }
  })
}

export function resolveOperationsEvent(event: SimulatedMissionEvent, response: OperationsResponse): SimulatedMissionEvent {
  const protection = response === 'brace'
    ? event.id === 'micrometeoroid' ? 2 : 0
    : response === 'safe-mode'
      ? event.id === 'solar-flare' || event.id === 'data-overload' ? 2 : 1
      : response === 'reroute-power'
        ? event.id === 'solar-flare' || event.id === 'antenna-glitch' ? 2 : 1
        : 0
  const damage = Math.max(0, event.damage - protection)
  const dataLossFraction = dataLossForDamage(damage, event.flare)
  const responseLabel = response === 'brace' ? 'Crew braced the spacecraft' : response === 'safe-mode' ? 'Systems entered safe mode' : response === 'reroute-power' ? 'Power was rerouted' : 'The 3-second decision window expired'
  return {
    ...event,
    damage,
    survived: damage <= 1,
    response,
    mitigation: `${event.mitigation} ${responseLabel}; ${protection ? `reduced damage by ${protection} level${protection === 1 ? '' : 's'}.` : 'no additional protection applied.'}`,
    detail: damage === 0
      ? `${responseLabel}; all systems stayed within safe limits.`
      : damage === 1
        ? `${responseLabel}; a small disruption was contained.`
        : 'The disruption exceeded recovery capacity and reduced science return.',
    dataLossFraction,
  }
}

export function calculateMissionScore(estimate: MissionEstimate, size: SpacecraftSize, checks: MissionCheck[], events: SimulatedMissionEvent[], exploredTradeSpace: boolean, teamMode = false, coordinationEarned = false, launchResult?: LaunchResult, operationsResult?: MissionOperationsResult): MissionScore {
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  const eventDataRemaining = events.reduce((remaining, event) => remaining * (1 - event.dataLossFraction), 1)
  const returnedDataFraction = operationsResult
    ? clamp(Math.min(operationsResult.downloadedDataGb, estimate.scienceDataGb * eventDataRemaining) / Math.max(1, estimate.dataTargetGb))
    : launchResult?.success === false ? 0 : 1
  const sciencePoints = Math.round(clamp(estimate.sciencePoints / 25) * 40 * returnedDataFraction)
  const requirements = Math.round((checks.length ? checks.filter((check) => check.passed).length / checks.length : 0) * 20)
  const budgetUse = estimate.budgetLimitM > 0 ? estimate.totalCostM / estimate.budgetLimitM : 1
  const massUse = estimate.spacecraftMassKg / Math.max(1, size.massLimitKg)
  const budgetEfficiency = Math.round(clamp(1 - budgetUse / 2) * 10)
  const massEfficiency = Math.round(clamp(1 - massUse / 2) * 10)
  const resourceEfficiency = teamMode ? Math.round((budgetEfficiency + massEfficiency) * 0.75) : budgetEfficiency + massEfficiency
  const eventSurvival = Math.round((events.length ? events.filter((event) => event.survived).length / events.length : 0) * 10)
  const tradeSpace = exploredTradeSpace ? 10 : 0
  const items: MissionScoreItem[] = [
    { id: 'science', label: 'Science value', earned: sciencePoints, available: 40, detail: operationsResult ? `${estimate.sciencePoints} modeled science points; ${Math.round(operationsResult.downloadedDataGb)} GB was downloaded against the ${estimate.dataTargetGb} GB target.` : `${estimate.sciencePoints} modeled science points, scaled against 25 points for full credit.` },
    { id: 'requirements', label: 'Requirements met', earned: requirements, available: 20, detail: `${checks.filter((check) => check.passed).length} of ${checks.length} final checks passed.` },
    { id: 'resources', label: 'Efficient resource use', earned: resourceEfficiency, available: teamMode ? 15 : 20, detail: `Budget use: ${Math.round(budgetUse * 100)}%; mass use: ${Math.round(massUse * 100)}% of the spacecraft limit.` },
    { id: 'events', label: 'Surviving events', earned: eventSurvival, available: 10, detail: `${events.filter((event) => event.survived).length} of ${events.length} random events contained.` },
    { id: 'trade-space', label: 'Trade-space exploration', earned: tradeSpace, available: 10, detail: exploredTradeSpace ? 'Two alternatives were compared before selecting the point design.' : 'No alternatives were compared before launch.' },
  ]
  if (teamMode) items.push({
    id: 'coordination',
    label: 'Team coordination',
    earned: coordinationEarned ? 5 : 0,
    available: 5,
    detail: coordinationEarned ? 'Mission roles completed a consensus sign-off before feasibility review.' : 'Complete the role sign-off to earn the coordination bonus.',
  })
  if (launchResult) items.push({
    id: 'flight-skill',
    label: 'Launch skill bonus',
    earned: launchResult.success ? Math.round(clamp(launchResult.score / 100) * 10) : 0,
    available: 10,
    detail: launchResult.success
      ? `Flight controls earned ${launchResult.score}/100; ${launchResult.orbitAccuracy}% orbit accuracy and ${launchResult.fuelMargin}% fuel margin.`
      : `Launch failed: ${launchResult.failureReason ?? 'the vehicle did not reach orbit.'}`,
  })
  if (operationsResult) items.push({
    id: 'data-analysis',
    label: 'Data lab discovery',
    earned: operationsResult.analysisPoints,
    available: 5,
    detail: operationsResult.quizCorrect ? 'Correctly matched a discovery to the mission data.' : 'Answer the Data Lab question to earn analysis points.',
  })

  return { items, total: items.reduce((total, item) => total + item.earned, 0) }
}

export function calculateRecoveredScienceData(estimate: MissionEstimate, events: SimulatedMissionEvent[]) {
  const remainingFraction = events.reduce((remaining, event) => remaining * (1 - event.dataLossFraction), 1)
  return estimate.scienceDataGb * remainingFraction
}

