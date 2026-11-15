'use client'

import { useMemo, useState } from 'react'
import { useRoom } from '@/lib/useRoom'

export default function MultiplayerTestPage() {
  const { roomCode, players, design, online, error, createRoom, joinRoom, send } = useRoom()
  const [name, setName] = useState('Player 1')
  const [joinCode, setJoinCode] = useState('')

  const fields = useMemo(() => [
    { key: 'missionId', label: 'Mission', value: design.missionId },
    { key: 'rocketId', label: 'Rocket', value: design.rocketId },
    { key: 'orbitId', label: 'Orbit', value: design.orbitId },
    { key: 'solarId', label: 'Solar', value: design.solarId },
    { key: 'batteryId', label: 'Battery', value: design.batteryId },
    { key: 'antennaId', label: 'Antenna', value: design.antennaId },
    { key: 'stations', label: 'Stations', value: design.stations },
  ], [design])

  return <main style={{ padding: 24, background: '#08131f', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
    <h1>Mission Control Multiplayer</h1>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
      <button type="button" onClick={() => createRoom(name || 'Player')}>Create room</button>
      <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Room code" maxLength={4} style={{ textTransform: 'uppercase' }} />
      <button type="button" onClick={() => joinRoom(joinCode, name || 'Player')}>Join room</button>
    </div>

    <div style={{ marginBottom: 16 }}>
      <strong>Status:</strong> {online ? 'Connected' : 'Offline'}
      {roomCode ? <span> · Room: {roomCode}</span> : null}
    </div>

    {error && <p style={{ color: '#ffb4b4' }}>{error}</p>}

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {fields.map((field) => <div key={field.key} style={{ border: '1px solid #284056', borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>{field.label}</div>
        <input value={String(field.value)} onChange={(event) => send(field.key, field.key === 'stations' ? Number(event.target.value) : event.target.value)} style={{ width: '100%' }} />
      </div>)}
    </div>

    <div style={{ marginTop: 24 }}>
      <h2>Players</h2>
      <ul>
        {players.map((player) => <li key={player.id}>{player.name} — {player.role}</li>)}
      </ul>
    </div>
  </main>
}
