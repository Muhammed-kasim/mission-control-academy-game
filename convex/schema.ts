import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { configurationValidator, difficultyValidator, gameStepValidator, missionIdValidator, playerRoleValidator, rocketAppearanceValidator, sizeIdValidator } from './validators'

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    revision: v.number(),
    missionId: missionIdValidator,
    sizeId: sizeIdValidator,
    difficulty: difficultyValidator,
    step: gameStepValidator,
    configuration: configurationValidator,
    rocketAppearance: rocketAppearanceValidator,
    alternativeA: v.union(configurationValidator, v.null()),
    alternativeB: v.union(configurationValidator, v.null()),
    hostPlayerId: v.optional(v.id('players')),
    updatedBy: v.optional(v.id('players')),
    launchHeading: v.number(),
    launchThrottle: v.number(),
    launchAutopilot: v.boolean(),
    launchUpdatedBy: v.optional(v.id('players')),
  })
    .index('by_code', ['code'])
    .index('by_updated_at', ['updatedAt']),
  players: defineTable({
    roomId: v.id('rooms'),
    name: v.string(),
    tokenHash: v.string(),
    role: playerRoleValidator,
    createdAt: v.number(),
  })
    .index('by_room', ['roomId'])
    .index('by_room_and_token', ['roomId', 'tokenHash']),
})
