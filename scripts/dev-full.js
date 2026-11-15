/* eslint-disable @typescript-eslint/no-require-imports */

const path = require('node:path')
const { spawn } = require('node:child_process')

const root = path.join(__dirname, '..')
const processes = [
  spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', '3000'], {
    cwd: root,
    stdio: 'inherit',
  }),
  spawn(process.execPath, [path.join(root, 'server/index.js')], {
    cwd: root,
    stdio: 'inherit',
  }),
]

let shuttingDown = false
function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  process.exitCode = exitCode
  for (const child of processes) {
    if (child.exitCode === null) child.kill('SIGTERM')
  }
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error('Could not start a development service.', error)
    shutdown(1)
  })
  child.on('exit', (code) => {
    if (!shuttingDown) shutdown(code ?? 1)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
