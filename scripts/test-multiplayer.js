/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { io } = require('socket.io-client')

function startServer(databasePath) {
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '0', ROOM_DATABASE_PATH: databasePath },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return new Promise((resolve, reject) => {
    let output = ''
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      server.kill('SIGTERM')
      reject(new Error(`Multiplayer server did not start: ${output}`))
    }, 10000)

    server.stdout.on('data', (chunk) => {
      output += chunk.toString()
      const match = output.match(/listening on http:\/\/0\.0\.0\.0:(\d+)/)
      if (match && !settled) {
        settled = true
        clearTimeout(timeout)
        resolve({ process: server, port: Number(match[1]) })
      }
    })
    server.stderr.on('data', (chunk) => { output += chunk.toString() })
    server.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })
    server.on('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(new Error(`Multiplayer server exited (${code}): ${output}`))
    })
  })
}

function stopServer(child) {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null) {
      resolve()
      return
    }
    const timeout = setTimeout(() => reject(new Error('Multiplayer server did not shut down')), 5000)
    child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
    child.kill('SIGTERM')
  })
}

function connect(port, name) {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
    })
    socket.once('connect', () => resolve({ socket, name }))
    socket.once('connect_error', reject)
  })
}

function waitForEvent(socket, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}`)), timeoutMs)
    socket.once(eventName, (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

async function main() {
  const databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-room-test-'))
  const databasePath = path.join(databaseDirectory, 'rooms.sqlite')
  let server
  const sockets = []

  try {
    server = await startServer(databasePath)
    const players = await Promise.all(['Alice', 'Bob', 'Cara', 'Dev'].map(async (name) => {
      const player = await connect(server.port, name)
      sockets.push(player.socket)
      return player
    }))

    const createdEvent = waitForEvent(players[0].socket, 'room:created')
    const createdStateEvent = waitForEvent(players[0].socket, 'room:state')
    players[0].socket.emit('room:create', { name: players[0].name })
    const created = await createdEvent
    await createdStateEvent
    const roomCode = created.roomCode

    for (const [index, player] of players.slice(1).entries()) {
      const joinedEvent = waitForEvent(player.socket, 'room:joined')
      const stateEvents = players.slice(0, index + 2).map((roomPlayer) => waitForEvent(roomPlayer.socket, 'room:state'))
      player.socket.emit('room:join', { roomCode, name: player.name })
      await joinedEvent
      await Promise.all(stateEvents)
    }

    async function updateDesign(player, field, value) {
      const stateEvents = players.map((roomPlayer) => waitForEvent(roomPlayer.socket, 'room:state'))
      player.socket.emit('intent', { field, value })
      return Promise.all(stateEvents)
    }

    await updateDesign(players[0], 'rocketId', 'sls')
    await updateDesign(players[1], 'solarId', 'deployable')
    await updateDesign(players[2], 'stations', 4)
    const synchronizedSnapshots = await updateDesign(players[3], 'instrumentIds', ['camera', 'radar'])
    const firstSnapshot = synchronizedSnapshots[0]
    assert.ok(firstSnapshot.design.rocketId === 'sls' && firstSnapshot.design.solarId === 'deployable')
    assert.ok(synchronizedSnapshots.every((snapshot) => snapshot.version === firstSnapshot.version))

    await stopServer(server.process)
    server = await startServer(databasePath)
    const returningPlayer = await connect(server.port, 'Alice')
    sockets.push(returningPlayer.socket)
    const rejoinedEvent = waitForEvent(returningPlayer.socket, 'room:joined')
    const restoredStateEvent = waitForEvent(returningPlayer.socket, 'room:state')
    returningPlayer.socket.emit('room:reconnect', { roomCode, playerId: created.playerId })
    await rejoinedEvent
    const restoredState = await restoredStateEvent
    assert.equal(restoredState.design.rocketId, 'sls')
    assert.equal(restoredState.design.solarId, 'deployable')
    assert.equal(restoredState.design.stations, 4)
    assert.deepEqual(restoredState.design.instrumentIds, ['camera', 'radar'])

    console.log('PASS: multiplayer state syncs and survives server restart')
  } finally {
    for (const socket of sockets) socket.disconnect()
    if (server) await stopServer(server.process)
    fs.rmSync(databaseDirectory, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('FAIL:', error)
  process.exitCode = 1
})
