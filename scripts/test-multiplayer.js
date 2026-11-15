const { spawn } = require('node:child_process')
const { io } = require('socket.io-client')

async function connect(name) {
  return new Promise((resolve, reject) => {
    const socket = io('http://127.0.0.1:4000', {
      transports: ['websocket'],
    })

    socket.on('connect', () => resolve({ socket, name }))
    socket.on('connect_error', (error) => reject(error))
  })
}

async function waitForEvent(socket, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}`)), timeoutMs)
    socket.once(eventName, (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

async function main() {
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  })

  await new Promise((resolve) => setTimeout(resolve, 800))

  try {
    const first = await connect('Alice')
    const second = await connect('Bob')
    const third = await connect('Cara')
    const fourth = await connect('Dev')

    first.socket.emit('room:create', { name: first.name })
    const created = await waitForEvent(first.socket, 'room:created')
    const roomCode = created.roomCode

    second.socket.emit('room:join', { roomCode, name: second.name })
    third.socket.emit('room:join', { roomCode, name: third.name })
    fourth.socket.emit('room:join', { roomCode, name: fourth.name })

    await Promise.all([
      waitForEvent(second.socket, 'room:joined'),
      waitForEvent(third.socket, 'room:joined'),
      waitForEvent(fourth.socket, 'room:joined'),
    ])

    first.socket.emit('intent', { field: 'rocketId', value: 'sls' })
    second.socket.emit('intent', { field: 'solarId', value: 'deployable' })
    third.socket.emit('intent', { field: 'stations', value: 4 })

    const roomSnapshots = await Promise.all([
      waitForEvent(first.socket, 'room:state'),
      waitForEvent(second.socket, 'room:state'),
      waitForEvent(third.socket, 'room:state'),
      waitForEvent(fourth.socket, 'room:state'),
    ])

    const designState = roomSnapshots[0].design
    const sameDesign = roomSnapshots.every((snapshot) => JSON.stringify(snapshot.design) === JSON.stringify(designState))
    console.log(sameDesign ? 'PASS: multiplayer room state stays in sync' : 'FAIL: room state diverged')

    first.socket.disconnect()
    second.socket.disconnect()
    third.socket.disconnect()
    fourth.socket.disconnect()
    server.kill('SIGTERM')
  } catch (error) {
    console.error('FAIL:', error)
    server.kill('SIGTERM')
    process.exitCode = 1
  }
}

main()
