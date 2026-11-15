# Mission Control Academy

**Space Mission Design Game** – Design a NASA-inspired spacecraft, balance science, cost and risk, launch it, and operate the mission.

Built for curious explorers (kids + adults). Uses real mission concepts, NASA imagery, and simplified but educational physics.

## Features
- Solo or Team (multiplayer rooms) mode
- Full mission design flow (planet → size → instruments → launch vehicle → ground network)
- Interactive launch sequence with Max-Q, pitch-over, stage separation radar, fairing, and orbit insertion
- 3D scenes + audio
- NASA research gallery unlocked by the instruments you choose
- PWA-ready

## Quick Start
```bash
pnpm install
pnpm dev
```
Open http://localhost:3000

For multiplayer on the same Wi-Fi, open the LAN address shown in the terminal (or http://<your-LAN-IP>:3000).

## Tech
- Next.js 16 + React 19 + TypeScript
- React Three Fiber / Three.js
- Socket.io (rooms)
- Tailwind + custom space UI

## Recent updates
- Exact launch timeline constants (`lib/launchSpec.ts`)
- Fixed NASA image loading (real image URLs + remotePatterns)
- Improved fallbacks so the gallery never shows empty boxes

## For NASA / educators
This game teaches Concept Maturity Levels, trade studies, risk vs science return, and the basic phases of a real launch. All numbers are simplified for learning and clearly labeled.

## License
Private for now – contact the author for educational use.
