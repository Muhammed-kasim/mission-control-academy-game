import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { v } from 'convex/values'
import { configurationValidator, difficultyValidator, gameStepValidator, missionIdValidator, playerRoleValidator, rocketAppearanceValidator, sharedGameValidator, sizeIdValidator } from './validators'

const ROOM_TTL_MS = 24 * 60 * 60 * 1000
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PLAYER_ROLES = ['captain', 'pilot', 'science', 'communications'] as const
const roomCodeValidator = v.string()
const playerTokenValidator = v.string()

async function hashPlayerToken(token: string) {
  if (token.length < 32 || token.length > 100) throw new Error('Invalid player session.')
  const bytes = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function makeRoomCode() {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('')
}

function normalizeName(name: string) {
  const normalized = name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24)
  if (!normalized) throw new Error('Enter a name for your crew badge.')
  return normalized
}

function validateSharedGame(game: {
  configuration: { stations: number; instrumentIds: string[] }
  rocketAppearance: { bodyColor: string; stripeColor: string; flameColor: string }
}) {
  const { stations, instrumentIds } = game.configuration
  if (!Number.isInteger(stations) || stations < 1 || stations > 4) throw new Error('Ground stations must be between one and four.')
  if (instrumentIds.length > 5) throw new Error('A mission can carry at most five instruments.')
  for (const color of [game.rocketAppearance.bodyColor, game.rocketAppearance.stripeColor, game.rocketAppearance.flameColor]) {
    if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('Rocket colors must use six-digit hex values.')
  }
}

async function findMembership(ctx: QueryCtx | MutationCtx, roomCode: string, playerToken: string) {
  const normalizedCode = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  if (normalizedCode.length !== 6) return null
  const room = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', normalizedCode)).unique()
  if (!room || Date.now() - room.updatedAt > ROOM_TTL_MS) return null
  const tokenHash = await hashPlayerToken(playerToken)
  const player = await ctx.db.query('players').withIndex('by_room_and_token', (q) => q.eq('roomId', room._id).eq('tokenHash', tokenHash)).unique()
  if (!player) return null
  return { room, player }
}

async function removeExpiredRooms(ctx: MutationCtx, now: number) {
  const expiredRooms = await ctx.db.query('rooms').withIndex('by_updated_at', (q) => q.lt('updatedAt', now - ROOM_TTL_MS)).take(40)
  for (const room of expiredRooms) {
    const players = await ctx.db.query('players').withIndex('by_room', (q) => q.eq('roomId', room._id)).collect()
    for (const player of players) await ctx.db.delete(player._id)
    await ctx.db.delete(room._id)
  }
}

export const createRoom = mutation({
  args: {
    name: v.string(),
    playerToken: playerTokenValidator,
    game: sharedGameValidator,
  },
  returns: v.object({ roomCode: v.string(), playerId: v.id('players') }),
  handler: async (ctx, args) => {
    const now = Date.now()
    const name = normalizeName(args.name)
    validateSharedGame(args.game)
    const tokenHash = await hashPlayerToken(args.playerToken)
    await removeExpiredRooms(ctx, now)

    let roomCode = ''
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = makeRoomCode()
      const existing = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', candidate)).unique()
      if (!existing) {
        roomCode = candidate
        break
      }
    }
    if (!roomCode) throw new Error('Could not reserve a crew code. Try creating the room again.')

    const roomId = await ctx.db.insert('rooms', {
      code: roomCode,
      createdAt: now,
      updatedAt: now,
      revision: 1,
      ...args.game,
      launchHeading: 0,
      launchThrottle: 76,
      launchAutopilot: true,
    })
    const playerId = await ctx.db.insert('players', {
      roomId,
      name,
      tokenHash,
      role: 'captain',
      createdAt: now,
    })
    await ctx.db.patch(roomId, { hostPlayerId: playerId, updatedBy: playerId, launchUpdatedBy: playerId })
    return { roomCode, playerId }
  },
})

export const joinRoom = mutation({
  args: {
    roomCode: roomCodeValidator,
    name: v.string(),
    playerToken: playerTokenValidator,
  },
  returns: v.object({ roomCode: v.string(), playerId: v.id('players') }),
  handler: async (ctx, args) => {
    const roomCode = args.roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    if (roomCode.length !== 6) throw new Error('Crew codes have six letters or numbers.')
    const name = normalizeName(args.name)
    const room = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', roomCode)).unique()
    if (!room || Date.now() - room.updatedAt > ROOM_TTL_MS) throw new Error('That crew room has expired or does not exist.')
    const existingPlayers = await ctx.db.query('players').withIndex('by_room', (q) => q.eq('roomId', room._id)).collect()
    if (existingPlayers.length >= PLAYER_ROLES.length) throw new Error('This crew is full. A room can have up to four people.')
    const tokenHash = await hashPlayerToken(args.playerToken)
    if (existingPlayers.some((player) => player.tokenHash === tokenHash)) throw new Error('This player session is already in the room.')
    const playerId = await ctx.db.insert('players', {
      roomId: room._id,
      name,
      tokenHash,
      role: PLAYER_ROLES[existingPlayers.length],
      createdAt: Date.now(),
    })
    await ctx.db.patch(room._id, { updatedAt: Date.now(), revision: room.revision + 1 })
    return { roomCode, playerId }
  },
})

export const getRoom = query({
  args: { roomCode: roomCodeValidator, playerToken: playerTokenValidator },
  returns: v.union(v.object({
    _id: v.id('rooms'),
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
    hostPlayerId: v.union(v.id('players'), v.null()),
    updatedBy: v.union(v.id('players'), v.null()),
    currentPlayerId: v.id('players'),
    isHost: v.boolean(),
    launchHeading: v.number(),
    launchThrottle: v.number(),
    launchAutopilot: v.boolean(),
    launchUpdatedBy: v.union(v.id('players'), v.null()),
    players: v.array(v.object({ _id: v.id('players'), name: v.string(), role: playerRoleValidator })),
  }), v.null()),
  handler: async (ctx, args) => {
    const membership = await findMembership(ctx, args.roomCode, args.playerToken)
    if (!membership) return null
    const players = await ctx.db.query('players').withIndex('by_room', (q) => q.eq('roomId', membership.room._id)).collect()
    return {
      _id: membership.room._id,
      code: membership.room.code,
      createdAt: membership.room.createdAt,
      updatedAt: membership.room.updatedAt,
      revision: membership.room.revision,
      missionId: membership.room.missionId,
      sizeId: membership.room.sizeId,
      difficulty: membership.room.difficulty,
      step: membership.room.step,
      configuration: membership.room.configuration,
      rocketAppearance: membership.room.rocketAppearance,
      alternativeA: membership.room.alternativeA,
      alternativeB: membership.room.alternativeB,
      hostPlayerId: membership.room.hostPlayerId ?? null,
      updatedBy: membership.room.updatedBy ?? null,
      currentPlayerId: membership.player._id,
      isHost: membership.room.hostPlayerId === membership.player._id,
      launchHeading: membership.room.launchHeading,
      launchThrottle: membership.room.launchThrottle,
      launchAutopilot: membership.room.launchAutopilot,
      launchUpdatedBy: membership.room.launchUpdatedBy ?? null,
      players: players.map((player) => ({ _id: player._id, name: player.name, role: player.role })),
    }
  },
})

export const updateGame = mutation({
  args: {
    roomCode: roomCodeValidator,
    playerToken: playerTokenValidator,
    game: sharedGameValidator,
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const membership = await findMembership(ctx, args.roomCode, args.playerToken)
    if (!membership) throw new Error('Your crew session has expired. Rejoin the room to continue.')
    validateSharedGame(args.game)
    const revision = membership.room.revision + 1
    await ctx.db.patch(membership.room._id, { ...args.game, revision, updatedAt: Date.now(), updatedBy: membership.player._id })
    return revision
  },
})

export const updateLaunch = mutation({
  args: {
    roomCode: roomCodeValidator,
    playerToken: playerTokenValidator,
    heading: v.number(),
    throttle: v.number(),
    autopilot: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await findMembership(ctx, args.roomCode, args.playerToken)
    if (!membership) throw new Error('Your crew session has expired. Rejoin the room to continue.')
    if (!Number.isFinite(args.heading) || args.heading < -45 || args.heading > 45) throw new Error('Flight heading is outside the control range.')
    if (!Number.isFinite(args.throttle) || args.throttle < 0 || args.throttle > 100) throw new Error('Throttle must be between zero and one hundred.')
    await ctx.db.patch(membership.room._id, {
      launchHeading: args.heading,
      launchThrottle: args.throttle,
      launchAutopilot: args.autopilot,
      launchUpdatedBy: membership.player._id,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const leaveRoom = mutation({
  args: { roomCode: roomCodeValidator, playerToken: playerTokenValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await findMembership(ctx, args.roomCode, args.playerToken)
    if (!membership) return null
    await ctx.db.delete(membership.player._id)
    const remainingPlayers = await ctx.db.query('players').withIndex('by_room', (q) => q.eq('roomId', membership.room._id)).collect()
    if (remainingPlayers.length === 0) {
      await ctx.db.delete(membership.room._id)
      return null
    }
    const wasHost = membership.room.hostPlayerId === membership.player._id
    if (wasHost) {
      const nextHost = remainingPlayers[0]
      await ctx.db.patch(nextHost._id, { role: 'captain' })
      await ctx.db.patch(membership.room._id, { hostPlayerId: nextHost._id, updatedBy: nextHost._id, revision: membership.room.revision + 1, updatedAt: Date.now() })
    } else {
      await ctx.db.patch(membership.room._id, { revision: membership.room.revision + 1, updatedAt: Date.now() })
    }
    return null
  },
})

export type SharedGameDocument = Doc<'rooms'>
