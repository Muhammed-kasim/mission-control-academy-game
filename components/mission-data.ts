export type MissionId = 'moon' | 'mars' | 'earth'
export type SizeId = '1u' | '3u' | '6u' | 'small' | 'large'
export type GameStep = 'welcome' | 'mission' | 'size' | 'requirements' | 'design' | 'feasibility' | 'alternative-a' | 'alternative-b' | 'trade-space' | 'verify' | 'launch' | 'report'
export type DesignTab = 'space' | 'launch' | 'ground'
export type SizeFamily = 'cubesat' | 'small' | 'large'
export type DifficultyId = 'easy' | 'normal' | 'hard'

export interface MissionProfile {
  id: MissionId
  name: string
  shortName: string
  subtitle: string
  description: string
  reference: string
  science: string
  targetOrbit: string
  minDataGb: number
  missionYears: number
  budgetCaps: Record<SizeFamily, number>
  accent: string
}

export interface SpacecraftSize {
  id: SizeId
  name: string
  detail: string
  family: SizeFamily
  massLimitKg: number
  busMassKg: number
  busPowerW: number
  busCostM: number
  operationsCostM: number
  recommendedFor: string
}

export interface EquipmentOption {
  id: string
  name: string
  description: string
  massKg: number
  powerW: number
  costM: number
  watts?: number
  wattHours?: number
  gbPerDay?: number
  lifetimeBonus?: number
  protection?: number
  nasaReference: string
}

export interface Instrument {
  id: string
  name: string
  shortName: string
  description: string
  massKg: number
  powerW: number
  costM: number
  dataGb: number
  dataLabel: string
  sciencePoints: number
  nasaReference: string
}

export interface MissionConfiguration {
  solarId: string
  batteryId: string
  shieldingId: string
  antennaId: string
  instrumentIds: string[]
  rocketId: string
  orbitId: string
  stations: number
  userId: string
}

export interface MissionEstimate {
  spacecraftMassKg: number
  payloadMassKg: number
  powerAvailableW: number
  powerDemandW: number
  scienceDataGb: number
  requiredDataGbPerDay: number
  communicationCapacityGbPerDay: number
  lifetimeYears: number
  sciencePoints: number
  hardwareCostM: number
  totalCostM: number
  budgetLimitM: number
  dataTargetGb: number
  messyDesignIssues: string[]
  messyDesignPenalty: number
  riskScore: number
}

export interface MissionCheck {
  id: string
  title: string
  detail: string
  passed: boolean
  segment: string
}

export const DIFFICULTIES: { id: DifficultyId; name: string; budgetMultiplier: number; budgetLabel: string; description: string }[] = [
  { id: 'easy', name: 'Easy', budgetMultiplier: 1.3, budgetLabel: '+30% budget', description: 'A wider budget cushion while you learn the trade-offs.' },
  { id: 'normal', name: 'Normal', budgetMultiplier: 1, budgetLabel: 'Standard budget', description: 'The baseline mission budget.' },
  { id: 'hard', name: 'Hard', budgetMultiplier: 0.8, budgetLabel: '−20% budget', description: 'A lean budget that rewards careful choices.' },
]

export const MISSIONS: MissionProfile[] = [
  {
    id: 'moon',
    name: 'Moon Orbiter',
    shortName: 'Lunar survey',
    subtitle: 'Chart the next frontier',
    description: 'Map lunar terrain and scout safe landing regions for the next generation of explorers.',
    reference: 'Inspired by Lunar Reconnaissance Orbiter (LRO)',
    science: 'Surface mapping · landing-site scouting',
    targetOrbit: 'lunar',
    minDataGb: 70,
    missionYears: 3,
    budgetCaps: { cubesat: 40, small: 280, large: 4200 },
    accent: 'moon',
  },
  {
    id: 'mars',
    name: 'Mars Weather Satellite',
    shortName: 'Mars climate',
    subtitle: 'Read the red planet',
    description: 'Track dust, clouds, and the thin Martian atmosphere from a dedicated science orbit.',
    reference: 'Inspired by MAVEN and Mars Reconnaissance Orbiter',
    science: 'Atmosphere monitoring · dust & cloud mapping',
    targetOrbit: 'mars',
    minDataGb: 90,
    missionYears: 4,
    budgetCaps: { cubesat: 2600, small: 3000, large: 5200 },
    accent: 'mars',
  },
  {
    id: 'earth',
    name: 'Earth Climate Watcher',
    shortName: 'Earth systems',
    subtitle: 'See our changing home',
    description: 'Observe land, temperature, and long-term climate patterns across the whole Earth.',
    reference: 'Inspired by Terra and Landsat',
    science: 'Land cover · temperature · climate trends',
    targetOrbit: 'polar',
    minDataGb: 100,
    missionYears: 5,
    budgetCaps: { cubesat: 32, small: 240, large: 4000 },
    accent: 'earth',
  },
]

export const SPACECRAFT_SIZES: SpacecraftSize[] = [
  { id: '1u', name: 'CubeSat 1U', detail: '10 × 10 × 10 cm', family: 'cubesat', massLimitKg: 1.33, busMassKg: 0.55, busPowerW: 4, busCostM: 1.4, operationsCostM: 6, recommendedFor: 'A focused technology demo' },
  { id: '3u', name: 'CubeSat 3U', detail: '10 × 10 × 30 cm', family: 'cubesat', massLimitKg: 4, busMassKg: 1.6, busPowerW: 5, busCostM: 2.8, operationsCostM: 7, recommendedFor: 'A compact science payload' },
  { id: '6u', name: 'CubeSat 6U', detail: '10 × 20 × 30 cm', family: 'cubesat', massLimitKg: 12, busMassKg: 5.2, busPowerW: 7, busCostM: 4.8, operationsCostM: 9, recommendedFor: 'More room for instruments' },
  { id: 'small', name: 'Small Satellite', detail: 'Up to 500 kg', family: 'small', massLimitKg: 500, busMassKg: 120, busPowerW: 32, busCostM: 20, operationsCostM: 75, recommendedFor: 'A versatile science mission' },
  { id: 'large', name: 'Large Observatory', detail: 'Up to 5,000 kg', family: 'large', massLimitKg: 5000, busMassKg: 1800, busPowerW: 180, busCostM: 180, operationsCostM: 330, recommendedFor: 'A flagship mission' },
]

export const INSTRUMENTS: Instrument[] = [
  { id: 'camera', name: 'High-resolution camera', shortName: 'Camera', description: 'Captures detailed images of terrain and cloud systems.', massKg: 5, powerW: 10, costM: 8, dataGb: 75, dataLabel: 'High data', sciencePoints: 7, nasaReference: 'LRO · Landsat' },
  { id: 'spectrometer', name: 'Imaging spectrometer', shortName: 'Spectrometer', description: 'Identifies minerals and atmospheric composition by light.', massKg: 8, powerW: 15, costM: 15, dataGb: 48, dataLabel: 'Medium data', sciencePoints: 8, nasaReference: 'MAVEN · Terra' },
  { id: 'radar', name: 'Radar sounder', shortName: 'Radar', description: 'Looks below the surface and through clouds.', massKg: 20, powerW: 40, costM: 35, dataGb: 110, dataLabel: 'High data', sciencePoints: 9, nasaReference: 'LRO · MRO' },
  { id: 'thermal', name: 'Thermal sensor', shortName: 'Thermal sensor', description: 'Measures surface temperature and thermal change.', massKg: 6, powerW: 8, costM: 10, dataGb: 24, dataLabel: 'Low data', sciencePoints: 6, nasaReference: 'Terra · Landsat' },
  { id: 'magnetometer', name: 'Magnetometer', shortName: 'Magnetometer', description: 'Measures magnetic fields around the spacecraft.', massKg: 2, powerW: 3, costM: 4, dataGb: 10, dataLabel: 'Very low data', sciencePoints: 5, nasaReference: 'MAVEN' },
]

const SOLAR_OPTIONS: Record<SizeFamily, EquipmentOption[]> = {
  cubesat: [
    { id: 'compact', name: 'Body-mounted cells', description: 'Simple, dependable power for a lean payload.', massKg: 0.25, powerW: 20, costM: 0.8, watts: 20, lifetimeBonus: 0, nasaReference: 'CubeSat solar arrays' },
    { id: 'deployable', name: 'Deployable panels', description: 'Unfolds extra collection area after launch.', massKg: 0.8, powerW: 45, costM: 2, watts: 45, lifetimeBonus: 0.5, nasaReference: 'Small spacecraft power' },
    { id: 'high-yield', name: 'High-efficiency wings', description: 'More power, with a noticeable mass trade-off.', massKg: 1.8, powerW: 90, costM: 4, watts: 90, lifetimeBonus: 1, nasaReference: 'NASA smallsat power' },
  ],
  small: [
    { id: 'compact', name: 'Body-mounted cells', description: 'Simple, dependable power for a lean payload.', massKg: 2, powerW: 60, costM: 2, watts: 60, lifetimeBonus: 0, nasaReference: 'Small spacecraft power' },
    { id: 'deployable', name: 'Deployable panels', description: 'Unfolds extra collection area after launch.', massKg: 4, powerW: 160, costM: 6, watts: 160, lifetimeBonus: 0.5, nasaReference: 'NASA spacecraft solar arrays' },
    { id: 'high-yield', name: 'High-efficiency wings', description: 'More power for a demanding science suite.', massKg: 15, powerW: 420, costM: 16, watts: 420, lifetimeBonus: 1, nasaReference: 'NASA spacecraft power' },
  ],
  large: [
    { id: 'compact', name: 'Body-mounted cells', description: 'A compact array for low-demand observatories.', massKg: 25, powerW: 450, costM: 12, watts: 450, lifetimeBonus: 0, nasaReference: 'NASA spacecraft solar arrays' },
    { id: 'deployable', name: 'Deployable panels', description: 'Large wings for long-duration operations.', massKg: 80, powerW: 1200, costM: 35, watts: 1200, lifetimeBonus: 0.5, nasaReference: 'NASA spacecraft solar arrays' },
    { id: 'high-yield', name: 'High-efficiency wings', description: 'Flagship-scale power for a full instrument suite.', massKg: 220, powerW: 3600, costM: 100, watts: 3600, lifetimeBonus: 1, nasaReference: 'NASA spacecraft power' },
  ],
}

const BATTERY_OPTIONS: Record<SizeFamily, EquipmentOption[]> = {
  cubesat: [
    { id: 'standard', name: 'Standard battery', description: 'A light reserve for routine eclipse periods.', massKg: 0.15, powerW: 0, costM: 0.3, wattHours: 10, nasaReference: 'Small spacecraft batteries' },
    { id: 'extended', name: 'Extended battery', description: 'Extra stored energy for longer shadows.', massKg: 0.3, powerW: 0, costM: 0.6, wattHours: 25, lifetimeBonus: 0.5, nasaReference: 'NASA smallsat power' },
    { id: 'deep-space', name: 'Deep-space battery', description: 'A larger reserve for demanding operations.', massKg: 0.7, powerW: 0, costM: 1.5, wattHours: 70, lifetimeBonus: 1, nasaReference: 'NASA spacecraft power' },
  ],
  small: [
    { id: 'standard', name: 'Standard battery', description: 'A light reserve for routine eclipse periods.', massKg: 0.8, powerW: 0, costM: 1, wattHours: 50, nasaReference: 'NASA spacecraft batteries' },
    { id: 'extended', name: 'Extended battery', description: 'Extra stored energy for longer shadows.', massKg: 1.8, powerW: 0, costM: 3, wattHours: 180, lifetimeBonus: 0.5, nasaReference: 'NASA spacecraft power' },
    { id: 'deep-space', name: 'Deep-space battery', description: 'A larger reserve for demanding operations.', massKg: 3.8, powerW: 0, costM: 10, wattHours: 500, lifetimeBonus: 1, nasaReference: 'NASA deep-space power' },
  ],
  large: [
    { id: 'standard', name: 'Standard battery', description: 'A light reserve for routine eclipse periods.', massKg: 18, powerW: 0, costM: 8, wattHours: 900, nasaReference: 'NASA spacecraft batteries' },
    { id: 'extended', name: 'Extended battery', description: 'Extra stored energy for longer shadows.', massKg: 55, powerW: 0, costM: 25, wattHours: 3200, lifetimeBonus: 0.5, nasaReference: 'NASA spacecraft power' },
    { id: 'deep-space', name: 'Deep-space battery', description: 'A larger reserve for demanding operations.', massKg: 130, powerW: 0, costM: 75, wattHours: 9000, lifetimeBonus: 1, nasaReference: 'NASA deep-space power' },
  ],
}

const ANTENNA_OPTIONS: Record<SizeFamily, EquipmentOption[]> = {
  cubesat: [
    { id: 'low-gain', name: 'Low-gain antenna', description: 'Simple link for nearby ground stations.', massKg: 0.1, powerW: 1, costM: 0.4, gbPerDay: 5, nasaReference: 'NASA CubeSat communications' },
    { id: 'medium-gain', name: 'Medium-gain antenna', description: 'Balanced range and data return.', massKg: 0.25, powerW: 2, costM: 1.3, gbPerDay: 18, nasaReference: 'NASA smallsat communications' },
    { id: 'high-gain', name: 'High-gain antenna', description: 'A stronger link with more hardware mass.', massKg: 0.6, powerW: 4, costM: 2.8, gbPerDay: 35, nasaReference: 'NASA deep-space communications' },
  ],
  small: [
    { id: 'low-gain', name: 'Low-gain antenna', description: 'Simple link for nearby ground stations.', massKg: 0.8, powerW: 2, costM: 1, gbPerDay: 18, nasaReference: 'NASA spacecraft communications' },
    { id: 'medium-gain', name: 'Medium-gain antenna', description: 'Balanced range and data return.', massKg: 3, powerW: 6, costM: 5, gbPerDay: 75, nasaReference: 'NASA spacecraft communications' },
    { id: 'high-gain', name: 'High-gain antenna', description: 'A stronger link for high-volume science.', massKg: 9, powerW: 16, costM: 16, gbPerDay: 180, nasaReference: 'NASA deep-space communications' },
  ],
  large: [
    { id: 'low-gain', name: 'Low-gain antenna', description: 'Simple link for nearby ground stations.', massKg: 6, powerW: 8, costM: 6, gbPerDay: 50, nasaReference: 'NASA spacecraft communications' },
    { id: 'medium-gain', name: 'Medium-gain antenna', description: 'Balanced range and data return.', massKg: 20, powerW: 25, costM: 20, gbPerDay: 240, nasaReference: 'NASA spacecraft communications' },
    { id: 'high-gain', name: 'High-gain antenna', description: 'A stronger link for high-volume science.', massKg: 55, powerW: 65, costM: 60, gbPerDay: 600, nasaReference: 'NASA deep-space communications' },
  ],
}

const SHIELDING_OPTIONS: Record<SizeFamily, EquipmentOption[]> = {
  cubesat: [
    { id: 'none', name: 'No extra shield', description: 'Keep the CubeSat light and simple.', massKg: 0, powerW: 0, costM: 0, protection: 0, nasaReference: 'CubeSat structure' },
    { id: 'light', name: 'Shielding blanket', description: 'A light layer for small debris impacts.', massKg: 0.2, powerW: 0, costM: 0.5, protection: 1, nasaReference: 'NASA spacecraft protection' },
    { id: 'reinforced', name: 'Reinforced shield', description: 'A stronger bumper adds mass but more protection.', massKg: 0.45, powerW: 0, costM: 1.2, protection: 2, nasaReference: 'Whipple shield concept' },
  ],
  small: [
    { id: 'none', name: 'No extra shield', description: 'Keep the spacecraft light and simple.', massKg: 0, powerW: 0, costM: 0, protection: 0, nasaReference: 'Spacecraft structure' },
    { id: 'light', name: 'Shielding blanket', description: 'A light layer for small debris impacts.', massKg: 6, powerW: 0, costM: 6, protection: 1, nasaReference: 'NASA spacecraft protection' },
    { id: 'reinforced', name: 'Reinforced shield', description: 'A stronger bumper adds mass but more protection.', massKg: 18, powerW: 0, costM: 20, protection: 2, nasaReference: 'Whipple shield concept' },
  ],
  large: [
    { id: 'none', name: 'No extra shield', description: 'Keep the observatory light and simple.', massKg: 0, powerW: 0, costM: 0, protection: 0, nasaReference: 'Spacecraft structure' },
    { id: 'light', name: 'Shielding blanket', description: 'A light layer for small debris impacts.', massKg: 75, powerW: 0, costM: 35, protection: 1, nasaReference: 'NASA spacecraft protection' },
    { id: 'reinforced', name: 'Reinforced shield', description: 'A stronger bumper adds mass but more protection.', massKg: 200, powerW: 0, costM: 85, protection: 2, nasaReference: 'Whipple shield concept' },
  ],
}

export const ROCKETS = [
  { id: 'rideshare', name: 'Rideshare', maker: 'CubeSats only', payloadKg: 12, costM: 1.2, orbitIds: ['leo', 'polar'], description: 'A low-cost launch slot for CubeSat missions.', nasaReference: 'NASA CubeSat Launch Initiative' },
  { id: 'electron', name: 'Electron', maker: 'Small launch vehicle', payloadKg: 300, costM: 7, orbitIds: ['leo', 'polar'], description: 'A dedicated ride to low Earth or polar orbit.', nasaReference: 'NASA launch service data' },
  { id: 'falcon9', name: 'Falcon 9', maker: 'Medium / heavy lift', payloadKg: 22000, costM: 70, orbitIds: ['leo', 'polar', 'geo', 'lunar'], description: 'Flexible launch options up to lunar destinations.', nasaReference: 'NASA launch service data' },
  { id: 'sls', name: 'SLS', maker: 'Heavy lift', payloadKg: 95000, costM: 2000, orbitIds: ['leo', 'polar', 'geo', 'lunar', 'mars'], description: 'Flagship lift capacity for every game destination.', nasaReference: 'NASA launch service data' },
] as const

export const ORBITS = [
  { id: 'leo', name: 'Low Earth orbit', altitude: 'About 400–2,000 km', detail: 'Quick data return, shorter mission life.', lifetimeYears: 2, dataFactor: 1, nasaReference: 'NASA Earth orbit data' },
  { id: 'polar', name: 'Polar / Sun-synchronous', altitude: 'About 700 km', detail: 'Sweeps across the whole Earth.', lifetimeYears: 5, dataFactor: 1.1, nasaReference: 'NASA Earth-observing missions' },
  { id: 'geo', name: 'Geostationary', altitude: 'About 35,786 km', detail: 'Stays above one region of Earth.', lifetimeYears: 12, dataFactor: 0.85, nasaReference: 'NASA Earth orbit data' },
  { id: 'lunar', name: 'Lunar orbit', altitude: 'Around the Moon', detail: 'Maps the lunar surface from above.', lifetimeYears: 4, dataFactor: 0.95, nasaReference: 'LRO mission data' },
  { id: 'mars', name: 'Mars science orbit', altitude: 'Around Mars', detail: 'Monitors the Martian atmosphere and climate.', lifetimeYears: 6, dataFactor: 0.9, nasaReference: 'MAVEN · MRO mission data' },
] as const

export const USER_PRODUCTS = [
  { id: 'research', name: 'Science archive', audience: 'Research teams', description: 'Calibrated data for scientists and mission partners.', costM: 2, scienceBonus: 2 },
  { id: 'alerts', name: 'Rapid response feed', audience: 'Mission operators', description: 'Fast-look products for time-sensitive decisions.', costM: 3, scienceBonus: 1 },
  { id: 'open-data', name: 'Open data portal', audience: 'Everyone', description: 'A public-facing archive for educators and explorers.', costM: 4, scienceBonus: 1 },
] as const

export function getMission(id: MissionId) {
  return MISSIONS.find((mission) => mission.id === id) ?? MISSIONS[0]
}

export function getSize(id: SizeId) {
  return SPACECRAFT_SIZES.find((size) => size.id === id) ?? SPACECRAFT_SIZES[3]
}

export function getOrbit(id: string) {
  return ORBITS.find((orbit) => orbit.id === id) ?? ORBITS[0]
}

export function getRocket(id: string) {
  return ROCKETS.find((rocket) => rocket.id === id) ?? ROCKETS[1]
}

export function getSolarOptions(size: SpacecraftSize) {
  return SOLAR_OPTIONS[size.family]
}

export function getBatteryOptions(size: SpacecraftSize) {
  return BATTERY_OPTIONS[size.family]
}

export function getAntennaOptions(size: SpacecraftSize) {
  return ANTENNA_OPTIONS[size.family]
}

export function getShieldingOptions(size: SpacecraftSize) {
  return SHIELDING_OPTIONS[size.family]
}

export function getUserProduct(id: string) {
  return USER_PRODUCTS.find((product) => product.id === id) ?? USER_PRODUCTS[0]
}

export function getDefaultConfiguration(mission: MissionProfile, size: SpacecraftSize): MissionConfiguration {
  let instrumentIds: string[]
  if (size.family === 'cubesat') {
    instrumentIds = size.id === '6u' ? ['magnetometer'] : []
  } else if (mission.id === 'moon') {
    instrumentIds = ['camera', 'spectrometer']
  } else if (mission.id === 'mars') {
    instrumentIds = ['camera', 'spectrometer', 'magnetometer']
  } else {
    instrumentIds = ['camera', 'thermal']
  }

  return {
    solarId: 'deployable',
    batteryId: 'extended',
    shieldingId: 'none',
    antennaId: 'medium-gain',
    instrumentIds,
    rocketId: size.family === 'cubesat' ? 'rideshare' : mission.id === 'mars' ? 'sls' : mission.id === 'moon' ? 'falcon9' : 'electron',
    orbitId: mission.targetOrbit,
    stations: 1,
    userId: 'research',
  }
}

export function getBudgetLimit(mission: MissionProfile, size: SpacecraftSize, difficulty: DifficultyId = 'normal') {
  const setting = DIFFICULTIES.find((item) => item.id === difficulty) ?? DIFFICULTIES[1]
  return mission.budgetCaps[size.family] * setting.budgetMultiplier
}

export function calculateMission(mission: MissionProfile, size: SpacecraftSize, config: MissionConfiguration, difficulty: DifficultyId = 'normal'): MissionEstimate {
  const solar = getSolarOptions(size).find((item) => item.id === config.solarId) ?? getSolarOptions(size)[0]
  const battery = getBatteryOptions(size).find((item) => item.id === config.batteryId) ?? getBatteryOptions(size)[0]
  const antenna = getAntennaOptions(size).find((item) => item.id === config.antennaId) ?? getAntennaOptions(size)[0]
  const shielding = getShieldingOptions(size).find((item) => item.id === config.shieldingId) ?? getShieldingOptions(size)[0]
  const orbit = getOrbit(config.orbitId)
  const rocket = getRocket(config.rocketId)
  const selectedInstruments = INSTRUMENTS.filter((instrument) => config.instrumentIds.includes(instrument.id))
  const userProduct = getUserProduct(config.userId)
  const instrumentMass = selectedInstruments.reduce((total, item) => total + item.massKg, 0)
  const instrumentPower = selectedInstruments.reduce((total, item) => total + item.powerW, 0)
  const instrumentCost = selectedInstruments.reduce((total, item) => total + item.costM, 0)
  const spacecraftMassKg = size.busMassKg + solar.massKg + battery.massKg + shielding.massKg + antenna.massKg + instrumentMass
  const powerAvailableW = solar.watts! + battery.wattHours! / 24
  const powerDemandW = size.busPowerW + instrumentPower + antenna.powerW
  const stations = Math.max(1, Math.min(3, config.stations))
  const scienceDataGb = selectedInstruments.reduce((total, item) => total + item.dataGb, 0) * orbit.dataFactor * (0.85 + stations * 0.08)
  const communicationCapacityGbPerDay = antenna.gbPerDay! * (0.7 + stations * 0.25)
  const requiredDataGbPerDay = Math.max(8, scienceDataGb / 4)
  const lifetimeYears = orbit.lifetimeYears + (battery.lifetimeBonus ?? 0) + (solar.lifetimeBonus ?? 0)
  const hardwareCostM = size.busCostM + solar.costM + battery.costM + shielding.costM + antenna.costM + instrumentCost
  const totalCostM = hardwareCostM + rocket.costM + stations * 2 + size.operationsCostM + userProduct.costM
  const budgetLimitM = getBudgetLimit(mission, size, difficulty)
  const messyDesignIssues: string[] = []

  if (powerAvailableW < powerDemandW) messyDesignIssues.push('The power system cannot comfortably support the selected payload.')
  if (communicationCapacityGbPerDay < requiredDataGbPerDay) messyDesignIssues.push('The antenna and ground network cannot return all expected science data.')
  if (selectedInstruments.length >= 3 && stations === 1) messyDesignIssues.push('Several instruments are sharing just one ground-station window.')
  if (selectedInstruments.some((instrument) => instrument.id === 'radar') && antenna.id === 'low-gain') messyDesignIssues.push('The high-data radar is paired with a low-capacity antenna.')
  const messyDesignPenalty = messyDesignIssues.length * 2
  const massRisk = spacecraftMassKg > size.massLimitKg || spacecraftMassKg > rocket.payloadKg
  const orbitReachable = rocket.orbitIds.includes(orbit.id as never)
  const riskScore = Math.min(100,
    (massRisk ? 16 : 0) +
    (totalCostM > budgetLimitM ? 14 : 0) +
    (powerAvailableW < powerDemandW ? 20 : 0) +
    (communicationCapacityGbPerDay < requiredDataGbPerDay ? 14 : 0) +
    (lifetimeYears < mission.missionYears ? 12 : 0) +
    (!orbitReachable ? 12 : 0) +
    (orbit.id !== mission.targetOrbit ? 8 : 0) +
    messyDesignPenalty * 4,
  )

  return {
    spacecraftMassKg,
    payloadMassKg: spacecraftMassKg,
    powerAvailableW,
    powerDemandW,
    scienceDataGb,
    requiredDataGbPerDay,
    communicationCapacityGbPerDay,
    lifetimeYears,
    sciencePoints: Math.max(0, selectedInstruments.reduce((total, item) => total + item.sciencePoints, 0) + userProduct.scienceBonus - messyDesignPenalty),
    hardwareCostM,
    totalCostM,
    budgetLimitM,
    dataTargetGb: mission.minDataGb,
    messyDesignIssues,
    messyDesignPenalty,
    riskScore,
  }
}

export function buildChecks(mission: MissionProfile, size: SpacecraftSize, config: MissionConfiguration, estimate: MissionEstimate): MissionCheck[] {
  const rocket = getRocket(config.rocketId)
  const selectedOrbit = getOrbit(config.orbitId)
  const supportsOrbit = rocket.orbitIds.includes(selectedOrbit.id as never)
  const sizeCompatible = rocket.id !== 'rideshare' || size.family === 'cubesat'
  const checks: MissionCheck[] = [
    {
      id: 'data', title: 'Minimum science data', segment: 'Space → User',
      passed: estimate.scienceDataGb >= estimate.dataTargetGb,
      detail: estimate.scienceDataGb >= estimate.dataTargetGb
        ? `${Math.round(estimate.scienceDataGb)} GB ready for the ${estimate.dataTargetGb} GB target.`
        : `${Math.round(estimate.scienceDataGb)} GB ready; the mission needs at least ${estimate.dataTargetGb} GB. Add an instrument or improve coverage.`,
    },
    {
      id: 'mass', title: 'Maximum spacecraft mass', segment: 'Space',
      passed: estimate.spacecraftMassKg <= size.massLimitKg,
      detail: estimate.spacecraftMassKg <= size.massLimitKg
        ? `${formatMass(estimate.spacecraftMassKg)} of ${formatMass(size.massLimitKg)} allowed.`
        : `${formatMass(estimate.spacecraftMassKg)} exceeds the ${formatMass(size.massLimitKg)} limit. Remove or downsize hardware.`,
    },
    {
      id: 'budget', title: 'Maximum mission budget', segment: 'Launch → User',
      passed: estimate.totalCostM <= estimate.budgetLimitM,
      detail: estimate.totalCostM <= estimate.budgetLimitM
        ? `${formatMoney(estimate.totalCostM)} of ${formatMoney(estimate.budgetLimitM)} available.`
        : `${formatMoney(estimate.totalCostM)} exceeds the ${formatMoney(estimate.budgetLimitM)} cap. Choose lower-cost hardware or launch services.`,
    },
    {
      id: 'power', title: 'Power balance', segment: 'Space',
      passed: estimate.powerAvailableW >= estimate.powerDemandW,
      detail: estimate.powerAvailableW >= estimate.powerDemandW
        ? `${Math.round(estimate.powerAvailableW)} W available for ${Math.round(estimate.powerDemandW)} W of demand.`
        : `${Math.round(estimate.powerAvailableW)} W available for ${Math.round(estimate.powerDemandW)} W of demand. Upgrade the array or reduce payload power.`,
    },
    {
      id: 'coherence', title: 'Parts work well together', segment: 'Space → Ground',
      passed: estimate.messyDesignIssues.length === 0,
      detail: estimate.messyDesignIssues.length === 0
        ? 'The payload, power, antenna, and ground support are a coherent combination.'
        : `${estimate.messyDesignIssues.join(' ')} Messy-design penalty: −${estimate.messyDesignPenalty} science points.`,
    },
    {
      id: 'communication', title: 'Communication link', segment: 'Ground → User',
      passed: estimate.communicationCapacityGbPerDay >= estimate.requiredDataGbPerDay,
      detail: estimate.communicationCapacityGbPerDay >= estimate.requiredDataGbPerDay
        ? `${Math.round(estimate.communicationCapacityGbPerDay)} GB/day capacity for ${Math.round(estimate.requiredDataGbPerDay)} GB/day needed.`
        : `${Math.round(estimate.communicationCapacityGbPerDay)} GB/day capacity for ${Math.round(estimate.requiredDataGbPerDay)} GB/day needed. Upgrade the antenna or add a station.`,
    },
    {
      id: 'lifetime', title: 'Mission lifetime', segment: 'Space',
      passed: estimate.lifetimeYears >= mission.missionYears,
      detail: estimate.lifetimeYears >= mission.missionYears
        ? `${formatYears(estimate.lifetimeYears)} available for a ${mission.missionYears}-year mission.`
        : `${formatYears(estimate.lifetimeYears)} available; the mission needs ${formatYears(mission.missionYears)}. Choose a longer-life orbit or battery.`,
    },
    {
      id: 'payload', title: 'Launch vehicle capacity', segment: 'Launch',
      passed: sizeCompatible && estimate.payloadMassKg <= rocket.payloadKg,
      detail: !sizeCompatible
        ? 'Rideshare is reserved for CubeSat missions. Choose a dedicated launch vehicle.'
        : estimate.payloadMassKg <= rocket.payloadKg
          ? `${formatMass(estimate.payloadMassKg)} spacecraft on a ${formatMass(rocket.payloadKg)} capacity launcher.`
          : `${formatMass(estimate.payloadMassKg)} spacecraft exceeds this launcher’s ${formatMass(rocket.payloadKg)} payload limit.`,
    },
    {
      id: 'orbit-access', title: 'Rocket can reach selected orbit', segment: 'Launch',
      passed: supportsOrbit,
      detail: supportsOrbit
        ? `${rocket.name} can reach ${selectedOrbit.name}.`
        : `${rocket.name} cannot reach ${selectedOrbit.name}. Select a compatible rocket.`,
    },
    {
      id: 'mission-orbit', title: 'Mission destination orbit', segment: 'Launch → Space',
      passed: selectedOrbit.id === mission.targetOrbit,
      detail: selectedOrbit.id === mission.targetOrbit
        ? `${selectedOrbit.name} matches the ${mission.name} science target.`
        : `${selectedOrbit.name} does not match this mission’s target. Recommended: ${getOrbit(mission.targetOrbit).name}.`,
    },
  ]
  return checks
}

export function formatMass(value: number) {
  return `${value < 10 ? value.toFixed(2) : Math.round(value).toLocaleString()} kg`
}

export function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
}

export function formatYears(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${value === 1 ? 'year' : 'years'}`
}

export function getInstrument(id: string) {
  return INSTRUMENTS.find((instrument) => instrument.id === id)
}
