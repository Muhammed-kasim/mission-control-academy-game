/* eslint-disable @typescript-eslint/no-require-imports */

const { randomUUID } = require('node:crypto')
const express = require('express')
const http = require('node:http')
const { Server } = require('socket.io')
const { z } = require('zod')
const {
  createInitialDesign,
  makeRoomCode,
  normalizeDesign,
  ROOM_MAX_PLAYERS,
  canEditField,
  isAllowedField,
  FIELD_ROLE_MAP,
  ROLE_LABELS,
} = require('../shared/room-logic.js')
const { RoomStore } = require('./room-store.js')

const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/
const RECONNECT_GRACE_MS = 10 * 60 * 1000
const PLAYER_ROLES = Object.keys(ROLE_LABELS)
const playerNameSchema = z.string().trim().min(1).max(24)
const roomCodeSchema = z.string().trim().toUpperCase().regex(ROOM_CODE_PATTERN)
const createRoomSchema = z.object({ name: playerNameSchema.optional() })
const joinRoomSchema = z.object({ roomCode: roomCodeSchema, name: playerNameSchema.optional() })
const reconnectSchema = z.object({ roomCode: roomCodeSchema, playerId: z.string().uuid() })
const intentSchema = z.object({ field: z.string(), value: z.unknown() })
const roleChangeSchema = z.object({
  roles: z.array(z.enum(PLAYER_ROLES)).max(ROOM_MAX_PLAYERS).refine((roles) => new Set(roles).size === roles.length),
})
const intentValueSchemas = {
  missionId: z.enum(['earth', 'moon', 'mars']),
  rocketId: z.enum(['rideshare', 'electron', 'falcon9', 'sls']),
  orbitId: z.enum(['leo', 'polar', 'geo', 'lunar', 'mars']),
  solarId: z.enum(['compact', 'deployable', 'high-yield']),
  batteryId: z.enum(['standard', 'extended', 'deep-space']),
  antennaId: z.enum(['low-gain', 'medium-gain', 'high-gain', 'standard']),
  shieldingId: z.enum(['none', 'light', 'lightweight', 'reinforced']),
  instrumentIds: z.array(z.enum(['camera', 'spectrometer', 'radar', 'thermal', 'magnetometer'])).max(5)
    .refine((ids) => new Set(ids).size === ids.length),
  stations: z.number().int().min(1).max(8),
}

const app = express()
app.use(express.json({ limit: '16kb' }))

const database = new RoomStore()
const rooms = new Map()
for (const room of database.loadRooms()) {
  room.players = room.players.filter((player) => Date.now() - player.lastSeen <= RECONNECT_GRACE_MS)
  room.players.forEach((player) => { player.connected = false })
  room.updatedAt = Date.now()
  rooms.set(room.code, room)
  database.saveRoom(room)
}

const server = http.createServer(app)
const allowedOrigins = (process.env.CLIENT_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
  maxHttpBufferSize: 16 * 1024,
  perMessageDeflate: true,
})

function emitRoomState(room) {
  io.to(room.code).emit('room:state', {
    roomCode: room.code,
    players: room.players.map(({ id, name, role, connected }) => ({ id, name, role, connected })),
    design: normalizeDesign(room.design),
    version: room.version,
    hostPlayerId: room.hostPlayerId,
  })
}

function persistRoom(room, broadcast = true) {
  room.updatedAt = Date.now()
  database.saveRoom(room)
  if (broadcast) emitRoomState(room)
}

function makePlayer(playerId, name, role = 'designer') {
  return { id: playerId, name, role, connected: true, lastSeen: Date.now() }
}

function getRoom(roomCode) {
  return rooms.get(roomCode)
}

function emitError(socket, message) {
  socket.emit('room:error', message)
}

function pruneDisconnectedPlayers(room) {
  const cutoff = Date.now() - RECONNECT_GRACE_MS
  room.players = room.players.filter((player) => player.connected || player.lastSeen >= cutoff)
  if (!room.players.some((player) => player.id === room.hostPlayerId)) {
    room.hostPlayerId = room.players[0]?.id || ''
  }
}

function getAvailableRole(room) {
  const assignedRoles = new Set(room.players.map((player) => player.role))
  return PLAYER_ROLES.find((role) => !assignedRoles.has(role))
}

function detachSocketFromRoom(socket) {
  const previousRoomCode = socket.data.roomCode
  const previousRoom = previousRoomCode ? getRoom(previousRoomCode) : null
  if (previousRoom) {
    const previousPlayer = previousRoom.players.find((player) => player.id === socket.data.playerId)
    if (previousPlayer?.connected) {
      previousPlayer.connected = false
      previousPlayer.lastSeen = Date.now()
      previousRoom.version += 1
      persistRoom(previousRoom)
    }
    socket.leave(previousRoomCode)
  }
  delete socket.data.roomCode
  delete socket.data.playerId
}

function createRoomForSocket(socket, name) {
  detachSocketFromRoom(socket)
  let roomCode = makeRoomCode()
  while (rooms.has(roomCode)) roomCode = makeRoomCode()
  const playerId = randomUUID()
  const now = Date.now()
  const room = {
    code: roomCode,
    createdAt: now,
    updatedAt: now,
    hostPlayerId: playerId,
    players: [makePlayer(playerId, name)],
    design: createInitialDesign(),
    version: 1,
  }
  rooms.set(roomCode, room)
  socket.join(roomCode)
  socket.data.roomCode = roomCode
  socket.data.playerId = playerId
  socket.emit('room:created', { roomCode, playerId, role: 'designer' })
  persistRoom(room)
}

function joinRoomForSocket(socket, roomCode, name) {
  const room = getRoom(roomCode)
  if (!room) {
    emitError(socket, 'Room not found')
    return
  }

  pruneDisconnectedPlayers(room)
  if (room.players.length >= ROOM_MAX_PLAYERS) {
    emitError(socket, 'Room is full')
    return
  }

  const role = getAvailableRole(room)
  if (!role) {
    emitError(socket, 'No player roles are available')
    return
  }

  detachSocketFromRoom(socket)
  const playerId = randomUUID()
  room.players.push(makePlayer(playerId, name, role))
  room.version += 1
  socket.join(roomCode)
  socket.data.roomCode = roomCode
  socket.data.playerId = playerId
  socket.emit('room:joined', { roomCode, playerId, role })
  persistRoom(room)
}

function reconnectPlayer(socket, payload) {
  const result = reconnectSchema.safeParse(payload)
  if (!result.success) {
    emitError(socket, 'Invalid reconnect request')
    return
  }

  const { roomCode, playerId } = result.data
  const room = getRoom(roomCode)
  const player = room?.players.find((entry) => entry.id === playerId)
  if (!room || !player) {
    emitError(socket, 'Player session not found; join the room again to get a new seat.')
    return
  }
  if (player.connected) {
    emitError(socket, 'This player session is already connected')
    return
  }

  detachSocketFromRoom(socket)
  player.connected = true
  player.lastSeen = Date.now()
  room.version += 1
  socket.join(roomCode)
  socket.data.roomCode = roomCode
  socket.data.playerId = playerId
  socket.emit('room:joined', { roomCode, playerId, role: player.role })
  persistRoom(room)
}

function applyIntent(socket, rawIntent) {
  const parsedIntent = intentSchema.safeParse(rawIntent)
  if (!parsedIntent.success) {
    emitError(socket, 'Invalid intent payload')
    return
  }

  const { field, value } = parsedIntent.data
  const room = getRoom(socket.data.roomCode)
  if (!room) {
    emitError(socket, 'Room not found')
    return
  }

  const player = room.players.find((entry) => entry.id === socket.data.playerId && entry.connected)
  if (!player) {
    emitError(socket, 'You are not connected to this room')
    return
  }
  if (!isAllowedField(field)) {
    emitError(socket, 'That field is not supported')
    return
  }
  if (!canEditField(field, player.role)) {
    const requiredRole = FIELD_ROLE_MAP[field]
    emitError(socket, `That is the ${ROLE_LABELS[requiredRole]}'s job`)
    return
  }

  const validValue = intentValueSchemas[field].safeParse(value)
  if (!validValue.success) {
    emitError(socket, `Invalid value for ${field}`)
    return
  }

  room.design = normalizeDesign({ ...room.design, [field]: validValue.data })
  room.version += 1
  persistRoom(room)
}

function assignRoles(socket, payload) {
  const room = getRoom(socket.data.roomCode)
  if (!room) {
    emitError(socket, 'Room not found')
    return
  }
  if (socket.data.playerId !== room.hostPlayerId) {
    emitError(socket, 'Only the room host can assign roles')
    return
  }

  const parsedRoles = roleChangeSchema.safeParse(payload)
  if (!parsedRoles.success || parsedRoles.data.roles.length < room.players.length) {
    emitError(socket, 'Invalid role assignments')
    return
  }

  room.players.forEach((player, index) => {
    player.role = parsedRoles.data.roles[index]
  })
  room.version += 1
  persistRoom(room)
}

function markDisconnected(socket) {
  const roomCode = socket.data.roomCode
  const room = roomCode ? getRoom(roomCode) : null
  if (!room) return

  const player = room.players.find((entry) => entry.id === socket.data.playerId)
  if (!player) return

  player.connected = false
  player.lastSeen = Date.now()
  room.version += 1
  persistRoom(room)

  const cleanupTimer = setTimeout(() => {
    const currentRoom = getRoom(roomCode)
    if (!currentRoom) return
    pruneDisconnectedPlayers(currentRoom)
    currentRoom.version += 1
    persistRoom(currentRoom)
  }, RECONNECT_GRACE_MS)
  cleanupTimer.unref()
}

app.get('/health', (req, res) => {
  res.json({ ok: true, rooms: rooms.size, storage: 'sqlite' })
})

io.on('connection', (socket) => {
  socket.on('room:create', (payload) => {
    const result = createRoomSchema.safeParse(payload ?? {})
    if (!result.success) {
      emitError(socket, 'Enter a player name with 1 to 24 characters')
      return
    }
    createRoomForSocket(socket, result.data.name || 'Player')
  })

  socket.on('room:join', (payload) => {
    const result = joinRoomSchema.safeParse(payload)
    if (!result.success) {
      emitError(socket, 'Enter a valid four-character room code and player name')
      return
    }
    joinRoomForSocket(socket, result.data.roomCode, result.data.name || 'Player')
  })

  socket.on('room:reconnect', (payload) => reconnectPlayer(socket, payload))
  socket.on('room:setRoles', (payload) => assignRoles(socket, payload))
  socket.on('intent', (payload) => applyIntent(socket, payload))
  socket.on('disconnect', () => markDisconnected(socket))
})

const port = process.env.PORT === undefined ? 4000 : Number(process.env.PORT)
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT must be an integer between 0 and 65535')
}
server.listen(port, '0.0.0.0', () => {
  console.log(`Mission Control multiplayer server listening on http://0.0.0.0:${server.address().port}`)
})

let isShuttingDown = false
function shutdown() {
  if (isShuttingDown) return
  isShuttingDown = true
  io.close(() => database.close())
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
