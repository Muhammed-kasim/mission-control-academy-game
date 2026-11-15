'use client'

import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { FunctionArgs } from 'convex/server'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import type { DifficultyId, GameStep, MissionConfiguration, MissionId, RocketAppearance, SizeId } from './mission-data'
import { ArrowRight, Copy, Radio, Users, X } from 'lucide-react'

export type SharedGameState = {
  missionId: MissionId
  sizeId: SizeId
  difficulty: DifficultyId
  step: GameStep
  configuration: MissionConfiguration
  rocketAppearance: RocketAppearance
  alternativeA: MissionConfiguration | null
  alternativeB: MissionConfiguration | null
}

type ConvexSharedGame = FunctionArgs<typeof api.rooms.createRoom>['game']

const solarIds = new Set(['compact', 'deployable', 'high-yield'])
const batteryIds = new Set(['standard', 'extended', 'deep-space'])
const shieldingIds = new Set(['none', 'light', 'reinforced'])
const antennaIds = new Set(['low-gain', 'medium-gain', 'high-gain'])
const instrumentIds = new Set(['camera', 'spectrometer', 'radar', 'thermal', 'magnetometer'])
const rocketIds = new Set(['rideshare', 'electron', 'falcon9', 'sls'])
const orbitIds = new Set(['leo', 'polar', 'geo', 'lunar', 'mars'])
const userIds = new Set(['research', 'alerts', 'open-data'])

function isConvexConfiguration(configuration: MissionConfiguration): configuration is ConvexSharedGame['configuration'] {
  return solarIds.has(configuration.solarId)
    && batteryIds.has(configuration.batteryId)
    && shieldingIds.has(configuration.shieldingId)
    && antennaIds.has(configuration.antennaId)
    && configuration.instrumentIds.every((id) => instrumentIds.has(id))
    && rocketIds.has(configuration.rocketId)
    && orbitIds.has(configuration.orbitId)
    && userIds.has(configuration.userId)
}

function toConvexSharedGame(game: SharedGameState): ConvexSharedGame {
  const configurations = [game.configuration, game.alternativeA, game.alternativeB]
  if (!configurations.every((configuration) => configuration === null || isConvexConfiguration(configuration))) {
    throw new Error('The mission contains an unsupported design option. Refresh the page and try again.')
  }
  return game as ConvexSharedGame
}

export type RoomView = SharedGameState & {
  _id: string
  code: string
  revision: number
  currentPlayerId: string
  isHost: boolean
  launchHeading: number
  launchThrottle: number
  launchAutopilot: boolean
  launchUpdatedBy: string | null
  players: { _id: string; name: string; role: 'captain' | 'pilot' | 'science' | 'communications' }[]
  updatedBy: string | null
}

type RoomSession = { roomCode: string; playerToken: string }
type LaunchControls = { heading: number; throttle: number; autopilot: boolean }
type MultiplayerContextValue = {
  configured: boolean
  room: RoomView | null
  playerId: string | null
  loading: boolean
  error: string
  createRoom: (name: string, game: SharedGameState) => Promise<void>
  joinRoom: (code: string, name: string) => Promise<void>
  leaveRoom: () => Promise<void>
  updateGame: (game: SharedGameState) => Promise<void>
  updateLaunch: (controls: LaunchControls) => void
}

const SESSION_KEY = 'mission-control-convex-room-v1'
const MultiplayerContext = createContext<MultiplayerContextValue | null>(null)
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null
const EMPTY_CONTEXT: MultiplayerContextValue = {
  configured: false,
  room: null,
  playerId: null,
  loading: false,
  error: '',
  createRoom: async () => { throw new Error('The Convex multiplayer connection is not available yet.') },
  joinRoom: async () => { throw new Error('The Convex multiplayer connection is not available yet.') },
  leaveRoom: async () => {},
  updateGame: async () => {},
  updateLaunch: () => {},
}

function validRoomSession(value: unknown): value is RoomSession {
  if (typeof value !== 'object' || value === null) return false
  const session = value as Partial<RoomSession>
  return typeof session.roomCode === 'string' && typeof session.playerToken === 'string'
}

function readRoomSession() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    return validRoomSession(value) ? value : null
  } catch {
    return null
  }
}

const roomSessionListeners = new Set<() => void>()
let roomSessionSnapshot: RoomSession | null = null
let roomSessionSnapshotLoaded = false

function getRoomSessionSnapshot() {
  if (!roomSessionSnapshotLoaded) {
    roomSessionSnapshot = readRoomSession()
    roomSessionSnapshotLoaded = true
  }
  return roomSessionSnapshot
}

function handleRoomSessionStorage(event: StorageEvent) {
  if (event.key !== SESSION_KEY && event.key !== null) return
  roomSessionSnapshot = readRoomSession()
  roomSessionSnapshotLoaded = true
  for (const listener of roomSessionListeners) listener()
}

function subscribeRoomSession(listener: () => void) {
  roomSessionListeners.add(listener)
  window.addEventListener('storage', handleRoomSessionStorage)
  return () => {
    roomSessionListeners.delete(listener)
    window.removeEventListener('storage', handleRoomSessionStorage)
  }
}

function writeRoomSession(session: RoomSession | null) {
  try {
    if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    roomSessionSnapshot = session
    roomSessionSnapshotLoaded = true
  }
  roomSessionSnapshot = session
  roomSessionSnapshotLoaded = true
  for (const listener of roomSessionListeners) listener()
}

function ActiveRoomProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeRoomSession, getRoomSessionSnapshot, () => null)
  const [error, setError] = useState('')
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingLaunch = useRef<LaunchControls | null>(null)
  const createMutation = useMutation(api.rooms.createRoom)
  const joinMutation = useMutation(api.rooms.joinRoom)
  const leaveMutation = useMutation(api.rooms.leaveRoom)
  const updateMutation = useMutation(api.rooms.updateGame)
  const launchMutation = useMutation(api.rooms.updateLaunch)
  const queryArgs = session ? { roomCode: session.roomCode, playerToken: session.playerToken } : 'skip'
  const queryResult = useQuery(api.rooms.getRoom, queryArgs) as RoomView | null | undefined
  const room = queryResult ?? null
  const playerId = room?.currentPlayerId ?? null
  const sessionExpired = Boolean(session && queryResult === null)

  useEffect(() => () => {
    if (launchTimer.current) clearTimeout(launchTimer.current)
  }, [])

  const persistSession = useCallback((next: RoomSession) => {
    writeRoomSession(next)
    setError('')
  }, [])

  const createRoom = useCallback(async (name: string, game: SharedGameState) => {
    const playerToken = crypto.randomUUID()
    try {
      const created = await createMutation({ name, playerToken, game: toConvexSharedGame(game) })
      persistSession({ roomCode: created.roomCode, playerToken })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not create the crew room.'
      setError(message)
      throw new Error(message)
    }
  }, [createMutation, persistSession])

  const joinRoom = useCallback(async (code: string, name: string) => {
    const playerToken = crypto.randomUUID()
    try {
      const joined = await joinMutation({ roomCode: code, name, playerToken })
      persistSession({ roomCode: joined.roomCode, playerToken })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not join that crew room.'
      setError(message)
      throw new Error(message)
    }
  }, [joinMutation, persistSession])

  const leaveRoom = useCallback(async () => {
    if (!session) return
    try {
      await leaveMutation(session)
    } finally {
      writeRoomSession(null)
      setError('')
    }
  }, [leaveMutation, session])

  const updateGame = useCallback(async (game: SharedGameState) => {
    if (!session) return
    try {
      await updateMutation({ ...session, game: toConvexSharedGame(game) })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not sync the crew mission.'
      setError(message)
    }
  }, [session, updateMutation])

  const updateLaunch = useCallback((controls: LaunchControls) => {
    if (!session) return
    pendingLaunch.current = controls
    if (launchTimer.current) return
    launchTimer.current = setTimeout(() => {
      launchTimer.current = null
      const latest = pendingLaunch.current
      if (!latest) return
      void launchMutation({ ...session, ...latest }).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not sync flight controls.')
      })
    }, 250)
  }, [launchMutation, session])

  const value = useMemo<MultiplayerContextValue>(() => ({
    configured: true,
    room,
    playerId,
    loading: Boolean(session && queryResult === undefined),
    error: error || (sessionExpired ? 'That room session expired. Create or join a crew to reconnect.' : ''),
    createRoom,
    joinRoom,
    leaveRoom,
    updateGame,
    updateLaunch,
  }), [createRoom, error, joinRoom, leaveRoom, playerId, queryResult, room, session, updateGame, updateLaunch])

  return <MultiplayerContext.Provider value={value}>{children}</MultiplayerContext.Provider>
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexClient) return <MultiplayerContext.Provider value={EMPTY_CONTEXT}>{children}</MultiplayerContext.Provider>
  return <ConvexProvider client={convexClient}><ActiveRoomProvider>{children}</ActiveRoomProvider></ConvexProvider>
}

export function useMultiplayerRoom() {
  const context = useContext(MultiplayerContext)
  if (!context) throw new Error('useMultiplayerRoom must be used inside ConvexClientProvider.')
  return context
}

export function MultiplayerRoomPanel({ initialGame }: { initialGame: SharedGameState }) {
  const { configured, room, loading, error, createRoom, joinRoom, leaveRoom } = useMultiplayerRoom()
  const [name, setName] = useState('Explorer')
  const [joinCode, setJoinCode] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      await createRoom(name, initialGame)
    } catch {
      setMessage('Room creation did not finish. Check the message below and try again.')
    } finally {
      setPending(false)
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      await joinRoom(joinCode, name)
    } catch {
      setMessage('Could not join with that code. Check it and try again.')
    } finally {
      setPending(false)
    }
  }

  async function copyCode() {
    if (!room) return
    try {
      await navigator.clipboard.writeText(room.code)
      setMessage('Crew code copied.')
    } catch {
      setMessage(`Share this crew code: ${room.code}`)
    }
  }

  if (!configured) return <section className="multiplayer-room-card" aria-labelledby="multiplayer-title">
    <div className="multiplayer-card-eyebrow"><Users aria-hidden="true" /> CREW FLIGHT</div>
    <h2 id="multiplayer-title">Multiplayer is connecting</h2>
    <p>The Convex room URL is not available in this preview yet. You can continue solo; crew rooms will appear when the connected backend is ready.</p>
  </section>

  return <section className="multiplayer-room-card" aria-labelledby="multiplayer-title">
    <div className="multiplayer-card-heading">
      <div><div className="multiplayer-card-eyebrow"><Users aria-hidden="true" /> CONVEX CREW ROOM</div><h2 id="multiplayer-title">Build the mission together</h2></div>
      <span className="multiplayer-live-badge"><Radio aria-hidden="true" /> LIVE SYNC</span>
    </div>
    <p>Share a six-character code. Your crew sees the same mission design and launch controls in real time.</p>
    {room ? <div className="multiplayer-connected-state">
      <div><span className="multiplayer-field-label">CREW CODE</span><strong className="multiplayer-room-code">{room.code}</strong></div>
      <button className="multiplayer-secondary-button" type="button" onClick={() => void copyCode()}><Copy aria-hidden="true" /> Copy invite code</button>
      <div className="multiplayer-player-list" aria-label={`${room.players.length} crew members in room`}>
        {room.players.map((player) => <span className="multiplayer-player-pill" key={player._id}><i aria-hidden="true" />{player.name}<small>{player.role}</small></span>)}
      </div>
      <button className="multiplayer-leave-button" type="button" onClick={() => void leaveRoom()}><X aria-hidden="true" /> Leave crew</button>
    </div> : <div className="multiplayer-room-actions">
      <label className="multiplayer-field"><span>Your crew name</span><input value={name} maxLength={24} autoComplete="nickname" onChange={(event) => setName(event.currentTarget.value)} /></label>
      <form onSubmit={handleCreate}><button type="submit" className="multiplayer-primary-button" disabled={pending || loading}><Users aria-hidden="true" /> Create a crew room <ArrowRight aria-hidden="true" /></button></form>
      <form onSubmit={handleJoin} className="multiplayer-join-form"><label className="multiplayer-field"><span>Have a crew code?</span><input value={joinCode} maxLength={6} autoCapitalize="characters" autoComplete="off" aria-label="Six-character crew code" placeholder="ABC123" onChange={(event) => setJoinCode(event.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} /></label><button type="submit" className="multiplayer-secondary-button" disabled={pending || loading || joinCode.length !== 6}>Join <ArrowRight aria-hidden="true" /></button></form>
    </div>}
    <p className="multiplayer-feedback" role="status" aria-live="polite">{message || error || (loading ? 'Reconnecting to your crew…' : '')}</p>
  </section>
}

export function MultiplayerPresence() {
  const { room, leaveRoom } = useMultiplayerRoom()
  if (!room) return null
  return <aside className="multiplayer-presence" aria-label="Shared crew room">
    <span className="multiplayer-presence-live"><i aria-hidden="true" /> CREW SYNC</span>
    <strong>{room.code}</strong>
    <span>{room.players.length}/4 crew aboard</span>
    <span className="multiplayer-presence-names">{room.players.map((player) => player.name).join(' · ')}</span>
    <button type="button" onClick={() => void leaveRoom()} aria-label="Leave shared crew room"><X aria-hidden="true" /></button>
  </aside>
}
