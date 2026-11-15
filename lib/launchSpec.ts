/**
 * Exact, deterministic launch timeline constants.
 * All times in seconds relative to T+0 (liftoff).
 * Tune values here only.
 */

export const COUNTDOWN_SECONDS = 10
export const IGNITION_AT = -3 // T-3
export const LIFTOFF_AT = 0

// Vertical climb
export const VERTICAL_END = 10

// MAX-Q
export const MAXQ_START = 10
export const MAXQ_END = 16
export const MAXQ_DURATION = 6
export const THRUST_RATE = 25 // percent per second
export const MAXQ_GREEN = {
  easy: [45, 85] as const,
  normal: [55, 75] as const,
  hard: [60, 70] as const,
}
export const MAXQ_STRESS_THRESHOLD = 90
export const MAXQ_STRESS_SECONDS = 2

// Pitch-over
export const PITCH_START = 18
export const PITCH_END = 42
export const PITCH_DURATION = 24
export const PITCH_START_DEG = 90
export const PITCH_END_DEG = 20
export const PITCH_MAX_RATE = 10 // deg/s
export const PITCH_DRIFT = 1.5 // deg/s if no input
export const PITCH_GUSTS = [
  { at: 24, delta: 4, warningBefore: 2 },
  { at: 34, delta: 4, warningBefore: 2 },
] as const
export const PITCH_BAND = {
  easy: 8,
  normal: 5,
  hard: 3,
  perfect: 2,
} as const
export const PITCH_FAIL_ERROR = 12

// Separation radar
export const SEP_START = 43
export const SEP_PERFECT = 45.0
export const SEP_GOOD = 0.5 // ±0.5s
export const SEP_PERFECT_WINDOW = 0.2 // ±0.2s
export const SEP_AUTO = 46.0
export const SEP_FLAME_AT = 47

// Fairing
export const FAIRING_AT = 52

// Space transition
export const SPACE_START = 58
export const SPACE_END = 62
export const SPACE_ALT_KM = 100

// Orbit insertion
export const ORBIT_AT = 75

// Weights for orbit accuracy
export const ACCURACY_WEIGHTS = { maxq: 0.25, pitch: 0.5, separation: 0.25 }

// Keyframe table for altitude (km) and speed (km/h) – linear interpolate
export const KEYFRAMES = [
  { t: 0, alt: 0, speed: 0 },
  { t: 10, alt: 3, speed: 450 },
  { t: 16, alt: 11, speed: 1800 },
  { t: 42, alt: 60, speed: 8500 },
  { t: 45, alt: 70, speed: 9800 },
  { t: 58, alt: 100, speed: 14000 },
  { t: 75, alt: 400, speed: 27600 }, // LEO default; override for other orbits
] as const

export function targetPitch(t: number): number {
  if (t <= PITCH_START) return PITCH_START_DEG
  if (t >= PITCH_END) return PITCH_END_DEG
  const progress = (t - PITCH_START) / PITCH_DURATION
  return PITCH_START_DEG - 70 * progress
}

export function interpolateKeyframe(t: number): { alt: number; speed: number } {
  if (t <= KEYFRAMES[0].t) return { alt: KEYFRAMES[0].alt, speed: KEYFRAMES[0].speed }
  for (let i = 1; i < KEYFRAMES.length; i++) {
    if (t <= KEYFRAMES[i].t) {
      const a = KEYFRAMES[i - 1]
      const b = KEYFRAMES[i]
      const p = (t - a.t) / (b.t - a.t)
      return {
        alt: a.alt + (b.alt - a.alt) * p,
        speed: a.speed + (b.speed - a.speed) * p,
      }
    }
  }
  const last = KEYFRAMES[KEYFRAMES.length - 1]
  return { alt: last.alt, speed: last.speed }
}

export function gradeMaxQ(pctInZone: number): 'Perfect' | 'Good' | 'Miss' {
  if (pctInZone >= 80) return 'Perfect'
  if (pctInZone >= 50) return 'Good'
  return 'Miss'
}

export function gradePitch(pctInBand: number): 'Perfect' | 'Good' | 'Miss' {
  if (pctInBand >= 90) return 'Perfect'
  if (pctInBand >= 70) return 'Good'
  return 'Miss'
}

export function gradeSeparation(errorSeconds: number): 'Perfect' | 'Good' | 'Miss' {
  const abs = Math.abs(errorSeconds)
  if (abs <= SEP_PERFECT_WINDOW) return 'Perfect'
  if (abs <= SEP_GOOD) return 'Good'
  return 'Miss'
}
