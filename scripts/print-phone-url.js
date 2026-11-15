const os = require('node:os')
const qrcode = require('qrcode-terminal')

function getLanIp() {
  const interfaces = os.networkInterfaces()
  const candidates = []
  for (const details of Object.values(interfaces)) {
    for (const entry of details || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        candidates.push(entry.address)
      }
    }
  }
  return candidates[0] || '127.0.0.1'
}

const ip = getLanIp()
const url = `http://${ip}:3000`
console.log('Open this on your phone:')
console.log(url)
qrcode.generate(url, { small: true }, (line) => console.log(line))
