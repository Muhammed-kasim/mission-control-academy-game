import { v } from 'convex/values'

export const missionIdValidator = v.union(v.literal('moon'), v.literal('mars'), v.literal('earth'))
export const sizeIdValidator = v.union(v.literal('1u'), v.literal('3u'), v.literal('6u'), v.literal('small'), v.literal('large'))
export const difficultyValidator = v.union(v.literal('easy'), v.literal('normal'), v.literal('hard'))
export const gameStepValidator = v.union(
  v.literal('welcome'),
  v.literal('sources'),
  v.literal('mission'),
  v.literal('size'),
  v.literal('requirements'),
  v.literal('design'),
  v.literal('negotiation'),
  v.literal('feasibility'),
  v.literal('alternative-a'),
  v.literal('alternative-b'),
  v.literal('trade-space'),
  v.literal('verify'),
  v.literal('launch'),
  v.literal('operations'),
  v.literal('data-lab'),
  v.literal('launch-failure'),
  v.literal('report'),
)

export const configurationValidator = v.object({
  solarId: v.union(v.literal('compact'), v.literal('deployable'), v.literal('high-yield')),
  batteryId: v.union(v.literal('standard'), v.literal('extended'), v.literal('deep-space')),
  shieldingId: v.union(v.literal('none'), v.literal('light'), v.literal('reinforced')),
  antennaId: v.union(v.literal('low-gain'), v.literal('medium-gain'), v.literal('high-gain')),
  instrumentIds: v.array(v.union(v.literal('camera'), v.literal('spectrometer'), v.literal('radar'), v.literal('thermal'), v.literal('magnetometer'))),
  rocketId: v.union(v.literal('rideshare'), v.literal('electron'), v.literal('falcon9'), v.literal('sls')),
  orbitId: v.union(v.literal('leo'), v.literal('polar'), v.literal('geo'), v.literal('lunar'), v.literal('mars')),
  stations: v.number(),
  userId: v.union(v.literal('research'), v.literal('alerts'), v.literal('open-data')),
})

export const rocketAppearanceValidator = v.object({
  bodyColor: v.string(),
  stripeColor: v.string(),
  noseShape: v.union(v.literal('point'), v.literal('rounded'), v.literal('flat')),
  finStyle: v.union(v.literal('classic'), v.literal('swept'), v.literal('compact')),
  flameColor: v.string(),
  missionPatch: v.union(v.literal('earth'), v.literal('moon'), v.literal('mars'), v.literal('comet'), v.literal('jupiter')),
})

export const sharedGameValidator = v.object({
  missionId: missionIdValidator,
  sizeId: sizeIdValidator,
  difficulty: difficultyValidator,
  step: gameStepValidator,
  configuration: configurationValidator,
  rocketAppearance: rocketAppearanceValidator,
  alternativeA: v.union(configurationValidator, v.null()),
  alternativeB: v.union(configurationValidator, v.null()),
})

export const playerRoleValidator = v.union(v.literal('captain'), v.literal('pilot'), v.literal('science'), v.literal('communications'))
