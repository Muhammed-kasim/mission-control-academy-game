const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const { z } = require('zod')
const { createInitialDesign, makeRoomCode, normalizeDesign, ROOM_MAX_PLAYERS, canEditField, isAllowedField, FIELD_ROLE_MAP, ROLE_LABELS } = require('../shared/room-logic.js')

const app = express()
app.use(express.json())

const rooms = new Map()

const intentSchema = z.object({
  field: z.string(),
  value: z.any(),
})

function makePlayer(playerId, name, role = 'designer') {
  return { id: playerId, name, role, connected: true, lastSeen: Date.now() }
}

function getRoom(roomCode) {
  return rooms.get(roomCode)
}

function emitRoomState(roomCode) {
  const room = getRoom(roomCode)
  if (!room) return

  const snapshot = {
    roomCode,
    players: room.players.map((player) => ({ ...player })),
    design: normalizeDesign(room.design),
    version: room.version,
    createdAt: room.createdAt,
  }
  io.to(roomCode).emit('room:state', snapshot)
}

function createRoomForSocket(socket, name = 'Player') {
  const roomCode = makeRoomCode()
  const playerId = socket.id
  const room = {
    code: roomCode,
    createdAt: Date.now(),
    players: [makePlayer(playerId, name, 'designer')],
    design: createInitialDesign(),
    version: 1,
  }
  rooms.set(roomCode, room)
  socket.join(roomCode)
  socket.data.roomCode = roomCode
  socket.data.playerId = playerId
  socket.emit('room:created', { roomCode, playerId, role: 'designer' })
  emitRoomState(roomCode)
}

function joinRoomForSocket(socket, roomCode, name = 'Player') {
  const room = getRoom(roomCode)
  if (!room) {
    socket.emit('room:error', 'Room not found')
    return
  }

  if (room.players.length >= ROOM_MAX_PLAYERS) {
    socket.emit('room:error', 'Room is full')
    return
  }

  const playerId = socket.id
  const queuedRoles = ['designer', 'engineer', 'communications', 'science']
  const role = queuedRoles[room.players.length % queuedRoles.length] || 'designer'
  const player = makePlayer(playerId, name, role)
  room.players.push(player)
  socket.join(roomCode)
  socket.data.roomCode = roomCode
  socket.data.playerId = playerId
  socket.emit('room:joined', { roomCode, playerId, role: player.role })
  emitRoomState(roomCode)
}

function applyIntent(socket, rawIntent) {
  const result = intentSchema.safeParse(rawIntent)
  if (!result.success) {
    socket.emit('room:error', 'Invalid intent payload')
    return
  }

  const { field, value } = result.data
  const roomCode = socket.data.roomCode
  const room = getRoom(roomCode)
  if (!room) {
    socket.emit('room:error', 'Room not found')
    return
  }

  const player = room.players.find((entry) => entry.id === socket.data.playerId)
  if (!player) {
    socket.emit('room:error', 'You are not in this room')
    return
  }

  if (!isAllowedField(field)) {
    socket.emit('room:error', `That field is not supported`)
    return
  }

  if (!canEditField(field, player.role)) {
    const requiredRole = FIELD_ROLE_MAP[field]
    socket.emit('room:error', `That is the ${ROLE_LABELS[requiredRole]}'s job`)
    return
  }

  room.design = normalizeDesign({ ...room.design, [field]: value })
  room.version += 1
  emitRoomState(roomCode)
}

app.get('/health', (req, res) => {
  res.json({ ok: true, rooms: rooms.size })
})

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
  perMessageDeflate: true,
})

io.on('connection', (socket) => {
  socket.on('room:create', ({ name } = {}) => {
    createRoomForSocket(socket, name || 'Player')
  })

  socket.on('room:join', ({ roomCode, name } = {}) => {
    const normalizedCode = String(roomCode || '').toUpperCase()
    joinRoomForSocket(socket, normalizedCode, name || 'Player')
  })

  socket.on('room:setRoles', ({ roles } = {}) => {
    const roomCode = socket.data.roomCode
    const room = getRoom(roomCode)
    if (!room) return

    const assignments = Array.isArray(roles) ? roles : []
    room.players.forEach((player, index) => {
      const nextRole = assignments[index] || player.role || 'designer'
      player.role = nextRole
    })
    emitRoomState(roomCode)
  })

  socket.on('intent', (payload) => {
    applyIntent(socket, payload)
  })

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode
    const room = roomCode ? getRoom(roomCode) : null
    if (!room) return

    const player = room.players.find((entry) => entry.id === socket.data.playerId)
    if (!player) return

    player.connected = false
    player.lastSeen = Date.now()

    setTimeout(() => {
      const latestRoom = getRoom(roomCode)
      if (!latestRoom) return
      latestRoom.players = latestRoom.players.filter((entry) => entry.connected || entry.id !== socket.data.playerId)
      if (latestRoom.players.length === 0) {
        rooms.delete(roomCode)
        return
      }
      emitRoomState(roomCode)
    }, 60000)
  })
})

const PORT = Number(process.env.PORT) || 4000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mission Control multiplayer server running on http://0.0.0.0:${PORT}`)
})
