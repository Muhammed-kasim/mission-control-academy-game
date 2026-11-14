'use client'

import { getAntennaOptions, getBatteryOptions, getInstrument, getShieldingOptions, getSolarOptions, type MissionConfiguration, type SpacecraftSize } from './mission-data'

export function MissionSpacecraftDiagram({ configuration, size }: { configuration: MissionConfiguration; size: SpacecraftSize }) {
  const solar = getSolarOptions(size).find((item) => item.id === configuration.solarId) ?? getSolarOptions(size)[0]
  const battery = getBatteryOptions(size).find((item) => item.id === configuration.batteryId) ?? getBatteryOptions(size)[0]
  const antenna = getAntennaOptions(size).find((item) => item.id === configuration.antennaId) ?? getAntennaOptions(size)[0]
  const shielding = getShieldingOptions(size).find((item) => item.id === configuration.shieldingId) ?? getShieldingOptions(size)[0]
  const instruments = configuration.instrumentIds.map(getInstrument).filter((instrument): instrument is NonNullable<typeof instrument> => Boolean(instrument))
  const parts = [solar.name, battery.name, antenna.name, shielding.name, ...instruments.map((instrument) => instrument.shortName)]

  return <figure className="spacecraft-figure">
    <div className="spacecraft-illustration">
      <svg viewBox="0 0 440 230" role="img" aria-labelledby="spacecraft-title spacecraft-description">
        <title id="spacecraft-title">Final spacecraft design</title>
        <desc id="spacecraft-description">A labeled diagram showing the selected solar panels, spacecraft bus, antenna, shielding, and science instruments.</desc>
        <defs>
          <linearGradient id="bus-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="#263c48" />
            <stop offset="0.5" stopColor="#526872" />
            <stop offset="1" stopColor="#253944" />
          </linearGradient>
          <linearGradient id="panel-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="#24556c" />
            <stop offset="1" stopColor="#4285a0" />
          </linearGradient>
        </defs>
        <ellipse cx="220" cy="190" rx="155" ry="16" fill="none" stroke="rgba(127, 209, 200, 0.18)" strokeDasharray="5 7" />
        <path d="M63 105h62m190 0h62" stroke="#84c2d0" strokeWidth="3" />
        <g fill="url(#panel-gradient)" stroke="#80b6c4" strokeWidth="1.5">
          <rect x="25" y="70" width="104" height="70" rx="4" />
          <rect x="311" y="70" width="104" height="70" rx="4" />
        </g>
        <g stroke="rgba(176, 220, 230, 0.58)" strokeWidth="1">
          <path d="M51 70v70m26-70v70m26-70v70M25 93h104m-104 24h104M337 70v70m26-70v70m26-70v70m-78-47h104m-104 24h104" />
        </g>
        {shielding.id !== 'none' && <rect x="160" y="61" width="120" height="110" rx="14" fill="none" stroke="#e2ba75" strokeWidth="2" strokeDasharray="4 5" />}
        <rect x="170" y="72" width="100" height="88" rx="10" fill="url(#bus-gradient)" stroke="#b4c4bd" strokeWidth="2" />
        <path d="M180 83h80v68h-80z" fill="none" stroke="rgba(190, 215, 210, 0.18)" />
        <circle cx="220" cy="114" r="18" fill="#14232d" stroke="#d4c18f" strokeWidth="2" />
        <circle cx="220" cy="114" r="7" fill="#75e0cf" />
        <path d="M220 72V43l34-20" fill="none" stroke="#d5c592" strokeWidth="3" />
        <path d="M254 23a31 31 0 0 1 0 43" fill="none" stroke="#e5d59c" strokeWidth="4" />
        <path d="M263 25a27 27 0 0 1 0 39" fill="none" stroke="rgba(229, 213, 156, 0.42)" strokeWidth="2" />
        <g fill="#e9be78" stroke="#14232d" strokeWidth="2">
          {instruments.slice(0, 4).map((instrument, index) => <circle key={instrument.id} cx={191 + index * 19} cy="160" r="5" />)}
        </g>
        <path d="M180 177h80" stroke="#75e0cf" strokeWidth="1" strokeDasharray="3 4" />
        <text x="220" y="213" textAnchor="middle" fill="#88a6a9" fontSize="9" letterSpacing="1.6">MISSION CONFIGURATION · NOT TO SCALE</text>
      </svg>
    </div>
    <figcaption>
      <span className="eyebrow">CONFIGURED HARDWARE</span>
      <ul aria-label="Selected spacecraft parts">{parts.map((part) => <li key={part}>{part}</li>)}</ul>
    </figcaption>
  </figure>
}
