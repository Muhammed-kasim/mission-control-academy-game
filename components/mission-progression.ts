import type { MissionId, RocketAppearance } from './mission-data'

const PROGRESSION_KEY = 'mission-control-academy-progression-v1'

export type RocketPaintId = 'arctic' | 'solar'

export interface MissionProgression {
  highestScoreRatio: number
  rank: 'Cadet' | 'Mission Engineer' | 'Flight Director' | 'Mission Commander'
  missionStars: Partial<Record<MissionId, number>>
  unlockedPaints: RocketPaintId[]
  unlockedMissionPatches: RocketAppearance['missionPatch'][]
}

export const DEFAULT_MISSION_PROGRESSION: MissionProgression = {
  highestScoreRatio: 0,
  rank: 'Cadet',
  missionStars: {},
  unlockedPaints: [],
  unlockedMissionPatches: ['earth'],
}

function isProgression(value: unknown): value is MissionProgression {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<MissionProgression>
  return typeof record.highestScoreRatio === 'number'
    && Number.isFinite(record.highestScoreRatio)
    && ['Cadet', 'Mission Engineer', 'Flight Director', 'Mission Commander'].includes(record.rank ?? '')
    && typeof record.missionStars === 'object' && record.missionStars !== null
    && Array.isArray(record.unlockedPaints) && record.unlockedPaints.every((paint) => paint === 'arctic' || paint === 'solar')
    && Array.isArray(record.unlockedMissionPatches) && record.unlockedMissionPatches.every((patch) => ['earth', 'moon', 'mars', 'comet', 'jupiter'].includes(patch))
}

export function readMissionProgression(): MissionProgression {
  try {
    const raw = window.localStorage.getItem(PROGRESSION_KEY)
    if (!raw) return DEFAULT_MISSION_PROGRESSION
    const parsed: unknown = JSON.parse(raw)
    return isProgression(parsed) ? parsed : DEFAULT_MISSION_PROGRESSION
  } catch {
    return DEFAULT_MISSION_PROGRESSION
  }
}

function rankForRatio(ratio: number): MissionProgression['rank'] {
  if (ratio >= 0.82) return 'Mission Commander'
  if (ratio >= 0.64) return 'Flight Director'
  if (ratio >= 0.4) return 'Mission Engineer'
  return 'Cadet'
}

export function starsForScore(score: number, maximum: number) {
  const ratio = score / Math.max(1, maximum)
  return ratio >= 0.82 ? 3 : ratio >= 0.6 ? 2 : 1
}

export function recordMissionProgress(missionId: MissionId, score: number, maximum: number): MissionProgression {
  const previous = readMissionProgression()
  const currentRatio = score / Math.max(1, maximum)
  const bestRatio = Math.max(previous.highestScoreRatio, currentRatio)
  const unlockedPaints: RocketPaintId[] = [...previous.unlockedPaints]
  if (bestRatio >= 0.6 && !unlockedPaints.includes('arctic')) unlockedPaints.push('arctic')
  if (bestRatio >= 0.82 && !unlockedPaints.includes('solar')) unlockedPaints.push('solar')

  const unlockedMissionPatches: RocketAppearance['missionPatch'][] = [...previous.unlockedMissionPatches]
  if (bestRatio >= 0.45 && !unlockedMissionPatches.includes('moon')) unlockedMissionPatches.push('moon')
  if (bestRatio >= 0.65 && !unlockedMissionPatches.includes('mars')) unlockedMissionPatches.push('mars')
  if (bestRatio >= 0.8 && !unlockedMissionPatches.includes('comet')) unlockedMissionPatches.push('comet')
  if (bestRatio >= 0.92 && !unlockedMissionPatches.includes('jupiter')) unlockedMissionPatches.push('jupiter')

  const progression: MissionProgression = {
    highestScoreRatio: bestRatio,
    rank: rankForRatio(bestRatio),
    missionStars: {
      ...previous.missionStars,
      [missionId]: Math.max(previous.missionStars[missionId] ?? 0, starsForScore(score, maximum)),
    },
    unlockedPaints,
    unlockedMissionPatches,
  }
  try {
    window.localStorage.setItem(PROGRESSION_KEY, JSON.stringify(progression))
  } catch (error) {
    console.warn('Could not save mission progression locally.', error)
  }
  return progression
}
