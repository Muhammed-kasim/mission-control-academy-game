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

type StoredRoomSession = { roomCode: string; playerId: string }
const ROOM_SESSION_KEY = 'mission-control-room-session-v1'

function readRoomSession(): StoredRoomSession | null {
  try {
    const stored = window.localStorage.getItem(ROOM_SESSION_KEY)
    if (!stored) return null
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null || !('roomCode' in parsed) || !('playerId' in parsed)) return null
    return typeof parsed.roomCode === 'string' && typeof parsed.playerId === 'string'
      ? { roomCode: parsed.roomCode, playerId: parsed.playerId }
      : null
  } catch (error) {
    console.warn('Could not restore the saved multiplayer room.', error)
    return null
  }
}

function storeRoomSession(session: StoredRoomSession) {
  try {
    window.localStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(session))
    return true
  } catch (error) {
    console.warn('Could not save the multiplayer room session.', error)
    return false
  }
}

function clearRoomSession() {
  try {
    window.localStorage.removeItem(ROOM_SESSION_KEY)
  } catch (error) {
    console.warn('Could not clear the saved multiplayer room.', error)
  }
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
    if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL
    const forwardedHost = window.location.hostname.replace(/-\d+\.app\.github\.dev$/i, '-4000.app.github.dev')
    return forwardedHost !== window.location.hostname
      ? `${window.location.protocol}//${forwardedHost}`
      : `${window.location.protocol}//${window.location.hostname}:4000`
  }, [])

  useEffect(() => {
    const instance = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    })

    instance.on('connect', () => {
      setSocket(instance)
      setOnline(true)
      setError('')
      const savedSession = readRoomSession()
      if (savedSession) instance.emit('room:reconnect', savedSession)
    })

    instance.on('connect_error', () => {
      setOnline(false)
      setError('Multiplayer server is unavailable. Check that the backend is running.')
    })

    instance.on('disconnect', () => {
      setOnline(false)
    })

    instance.on('room:created', ({ roomCode: nextCode, playerId: nextPlayerId }: { roomCode: string; playerId: string }) => {
      setRoomCode(nextCode)
      setPlayerId(nextPlayerId)
      if (!storeRoomSession({ roomCode: nextCode, playerId: nextPlayerId })) {
        setError('Room created, but this browser could not save the reconnect session.')
      }
    })

    instance.on('room:joined', ({ roomCode: nextCode, playerId: nextPlayerId }: { roomCode: string; playerId: string }) => {
      setRoomCode(nextCode)
      setPlayerId(nextPlayerId)
      if (!storeRoomSession({ roomCode: nextCode, playerId: nextPlayerId })) {
        setError('Room joined, but this browser could not save the reconnect session.')
      }
    })

    instance.on('room:state', (snapshot: { roomCode: string; players: RoomPlayer[]; design: RoomDesign }) => {
      setRoomCode(snapshot.roomCode)
      setPlayers(snapshot.players)
      setDesign(snapshot.design)
    })

    instance.on('room:error', (message: string) => {
      setError(message)
      if (message.startsWith('Player session not found')) {
        clearRoomSession()
        setRoomCode('')
        setPlayerId('')
        setPlayers([])
      }
    })

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
