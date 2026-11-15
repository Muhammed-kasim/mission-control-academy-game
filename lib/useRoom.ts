'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export type RoomPlayer = {
  id: string
  name: string
  role: string
  connected: boolean
}

export type RoomDesign = {
  missionId: string
  rocketId: string
  orbitId: string
  solarId: string
  batteryId: string
  antennaId: string
  shieldingId: string
  instrumentIds: string[]
  stations: number
}

export function useRoom() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [design, setDesign] = useState<RoomDesign>({
    missionId: 'earth',
    rocketId: 'falcon9',
    orbitId: 'polar',
    solarId: 'compact',
    batteryId: 'standard',
    antennaId: 'standard',
    shieldingId: 'lightweight',
    instrumentIds: ['camera'],
    stations: 2,
  })
  const [online, setOnline] = useState(false)
  const [error, setError] = useState('')

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'http://localhost:4000'
    return process.env.NEXT_PUBLIC_SERVER_URL || `http://${window.location.hostname}:4000`
  }, [])

  useEffect(() => {
    const instance = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    })

    instance.on('connect', () => {
      setOnline(true)
      setError('')
    })

    instance.on('disconnect', () => {
      setOnline(false)
    })

    instance.on('room:created', ({ roomCode: nextCode, playerId: nextPlayerId }: { roomCode: string; playerId: string }) => {
      setRoomCode(nextCode)
      setPlayerId(nextPlayerId)
    })

    instance.on('room:joined', ({ roomCode: nextCode, playerId: nextPlayerId }: { roomCode: string; playerId: string }) => {
      setRoomCode(nextCode)
      setPlayerId(nextPlayerId)
    })

    instance.on('room:state', (snapshot: { roomCode: string; players: RoomPlayer[]; design: RoomDesign }) => {
      setRoomCode(snapshot.roomCode)
      setPlayers(snapshot.players)
      setDesign(snapshot.design)
    })

    instance.on('room:error', (message: string) => {
      setError(message)
    })

    setSocket(instance)

    return () => {
      instance.disconnect()
    }
  }, [serverUrl])

  const createRoom = useCallback((name: string) => {
    if (!socket) return
    socket.emit('room:create', { name })
  }, [socket])

  const joinRoom = useCallback((roomCodeInput: string, name: string) => {
    if (!socket) return
    socket.emit('room:join', { roomCode: roomCodeInput, name })
  }, [socket])

  const send = useCallback((field: string, value: string | number | string[]) => {
    if (!socket) return
    socket.emit('intent', { field, value })
  }, [socket])

  return { roomCode, playerId, players, design, online, error, createRoom, joinRoom, send }
}
