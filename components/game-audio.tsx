'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

type GameSound = 'countdown' | 'engine' | 'alert' | 'success' | 'radio' | 'separation'
interface GameAudioContextValue {
  play: (sound: GameSound) => void
  prepare: () => Promise<void>
  engine: (enabled: boolean, level?: number) => void
}

const GameAudioContext = createContext<GameAudioContextValue | null>(null)

const SOUND_NOTES: Record<GameSound, { frequency: number; duration: number; waveform: OscillatorType }[]> = {
  countdown: [{ frequency: 820, duration: 0.14, waveform: 'square' }],
  engine: [{ frequency: 54, duration: 1.8, waveform: 'sawtooth' }],
  alert: [{ frequency: 660, duration: 0.12, waveform: 'square' }, { frequency: 470, duration: 0.16, waveform: 'square' }],
  success: [{ frequency: 523, duration: 0.12, waveform: 'sine' }, { frequency: 659, duration: 0.12, waveform: 'sine' }, { frequency: 784, duration: 0.22, waveform: 'sine' }],
  radio: [{ frequency: 1120, duration: 0.045, waveform: 'square' }, { frequency: 1480, duration: 0.04, waveform: 'sine' }],
  separation: [{ frequency: 96, duration: 0.12, waveform: 'sawtooth' }, { frequency: 58, duration: 0.2, waveform: 'sine' }],
}
const SOUND_TYPES: GameSound[] = ['countdown', 'engine', 'alert', 'success', 'radio', 'separation']

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(true)
  const [preferenceLoaded, setPreferenceLoaded] = useState(false)
  const audioContext = useRef<AudioContext | null>(null)
  const soundBuffers = useRef<Partial<Record<GameSound, AudioBuffer>>>({})
  const engineSource = useRef<AudioBufferSourceNode | null>(null)
  const engineGain = useRef<GainNode | null>(null)
  const activeSources = useRef(new Set<AudioBufferSourceNode>())
  const mutedRef = useRef(muted)

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem('mission-control-academy-muted-v1') !== 'false')
    } catch (error) {
      console.warn('Could not load the saved audio preference.', error)
    }
    setPreferenceLoaded(true)
  }, [])

  useEffect(() => {
    if (!preferenceLoaded) return
    try {
      window.localStorage.setItem('mission-control-academy-muted-v1', String(muted))
    } catch (error) {
      console.warn('Could not save the audio preference.', error)
    }
  }, [muted, preferenceLoaded])

  const prepare = useCallback(async () => {
    if (typeof window === 'undefined' || !window.AudioContext) return
    try {
      audioContext.current ??= new window.AudioContext()
      const context = audioContext.current
      for (const sound of SOUND_TYPES) {
        const notes = SOUND_NOTES[sound]
        if (soundBuffers.current[sound]) continue
        const totalDuration = notes.reduce((total, note) => total + note.duration + 0.035, 0)
        const buffer = context.createBuffer(1, Math.ceil(totalDuration * context.sampleRate), context.sampleRate)
        const samples = buffer.getChannelData(0)
        let offset = 0
        for (const note of notes) {
          const length = Math.floor(note.duration * context.sampleRate)
          for (let index = 0; index < length; index += 1) {
            const time = index / context.sampleRate
            const angle = 2 * Math.PI * note.frequency * time
            const wave = note.waveform === 'square' ? Math.sign(Math.sin(angle))
              : note.waveform === 'sawtooth' ? 2 * (time * note.frequency - Math.floor(time * note.frequency + 0.5))
                : Math.sin(angle)
            const envelope = Math.min(1, time * 90) * Math.exp(-4 * time / note.duration)
            samples[offset + index] += wave * envelope * (sound === 'engine' ? 0.13 : 0.2)
          }
          offset += length + Math.floor(0.035 * context.sampleRate)
        }
        soundBuffers.current[sound] = buffer
      }
    } catch (error) {
      console.warn('Could not prepare game audio before launch.', error)
    }
  }, [])

  const play = useCallback((sound: GameSound) => {
    if (mutedRef.current || typeof window === 'undefined') return
    const start = (context: AudioContext) => {
      const buffer = soundBuffers.current[sound]
      if (!buffer) return
      const source = context.createBufferSource()
      const gain = context.createGain()
      source.buffer = buffer
      gain.gain.setValueAtTime(sound === 'engine' ? 0.28 : sound === 'separation' ? 0.72 : 0.48, context.currentTime)
      source.connect(gain)
      gain.connect(context.destination)
      source.onended = () => {
        activeSources.current.delete(source)
        source.disconnect()
        gain.disconnect()
      }
      activeSources.current.add(source)
      source.start()
    }
    try {
      const context = audioContext.current
      if (!context) {
        void prepare().then(() => {
          const preparedContext = audioContext.current
          if (preparedContext) start(preparedContext)
        })
        return
      }
      if (context.state === 'suspended') void context.resume().then(() => start(context)).catch((error: unknown) => {
        console.warn('Could not resume the game audio context.', error)
      })
      else start(context)
    } catch (error) {
      console.warn('Could not play the requested game sound.', error)
    }
  }, [prepare])

  const engine = useCallback((enabled: boolean, level = 0.72) => {
    const context = audioContext.current
    if (!context || typeof window === 'undefined') return
    const start = () => {
      if (!enabled || mutedRef.current) {
        const source = engineSource.current
        const gain = engineGain.current
        if (gain) gain.gain.setTargetAtTime(0, context.currentTime, 0.08)
        if (source) {
          try { source.stop(context.currentTime + 0.3) } catch (error) {
            console.warn('Could not stop the launch engine sound.', error)
          }
        }
        engineSource.current = null
        engineGain.current = null
        return
      }
      if (!engineSource.current) {
        const buffer = soundBuffers.current.engine
        if (!buffer) return
        const source = context.createBufferSource()
        const gain = context.createGain()
        source.buffer = buffer
        source.loop = true
        gain.gain.setValueAtTime(0, context.currentTime)
        source.connect(gain)
        gain.connect(context.destination)
        source.onended = () => {
          activeSources.current.delete(source)
          source.disconnect()
          gain.disconnect()
        }
        activeSources.current.add(source)
        source.start()
        engineSource.current = source
        engineGain.current = gain
      }
      engineGain.current?.gain.setTargetAtTime(Math.max(0.015, Math.min(0.32, level * 0.32)), context.currentTime, 0.08)
    }
    if (context.state === 'suspended' && enabled && !mutedRef.current) {
      void context.resume().then(start).catch((error: unknown) => {
        console.warn('Could not resume the launch engine sound.', error)
      })
    } else start()
  }, [])

  useEffect(() => {
    if (muted) engine(false)
  }, [engine, muted])

  useEffect(() => {
    const handleVisibilityChange = () => {
      const context = audioContext.current
      if (!context) return
      if (document.hidden && context.state === 'running') {
        void context.suspend().catch((error: unknown) => console.warn('Could not pause game audio while hidden.', error))
      } else if (!document.hidden && !mutedRef.current && context.state === 'suspended') {
        void context.resume().catch((error: unknown) => console.warn('Could not resume game audio after visibility changed.', error))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => () => {
    for (const source of activeSources.current) {
      try {
        source.stop()
      } catch (error) {
        console.warn('Could not stop a game sound during cleanup.', error)
      }
    }
    activeSources.current.clear()
    if (audioContext.current) {
      void audioContext.current.close().catch((error: unknown) => console.warn('Could not close the game audio context.', error))
      audioContext.current = null
    }
  }, [])

  return <GameAudioContext.Provider value={{ play, prepare, engine }}>
    {children}
    <button className="game-audio-toggle" type="button" aria-label={muted ? 'Unmute game sounds' : 'Mute game sounds'} aria-pressed={!muted} onClick={() => setMuted((current) => !current)}>
      {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}<span>{muted ? 'SOUND OFF' : 'SOUND ON'}</span>
    </button>
  </GameAudioContext.Provider>
}

export function useGameAudio() {
  const context = useContext(GameAudioContext)
  if (!context) throw new Error('useGameAudio must be used within GameAudioProvider.')
  return context
}
