'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

type GameSound = 'countdown' | 'engine' | 'alert' | 'success' | 'radio'
interface GameAudioContextValue {
  play: (sound: GameSound) => void
  prepare: () => Promise<void>
}

const GameAudioContext = createContext<GameAudioContextValue | null>(null)

const SOUND_NOTES: Record<GameSound, { frequency: number; duration: number; waveform: OscillatorType }[]> = {
  countdown: [{ frequency: 820, duration: 0.14, waveform: 'square' }],
  engine: [{ frequency: 54, duration: 1.8, waveform: 'sawtooth' }],
  alert: [{ frequency: 660, duration: 0.12, waveform: 'square' }, { frequency: 470, duration: 0.16, waveform: 'square' }],
  success: [{ frequency: 523, duration: 0.12, waveform: 'sine' }, { frequency: 659, duration: 0.12, waveform: 'sine' }, { frequency: 784, duration: 0.22, waveform: 'sine' }],
  radio: [{ frequency: 1120, duration: 0.045, waveform: 'square' }, { frequency: 1480, duration: 0.04, waveform: 'sine' }],
}

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(true)
  const [preferenceLoaded, setPreferenceLoaded] = useState(false)
  const audioContext = useRef<AudioContext | null>(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted

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

  const play = useCallback((sound: GameSound) => {
    if (mutedRef.current || typeof window === 'undefined') return
    try {
      const AudioContextConstructor = window.AudioContext
      if (!AudioContextConstructor) return
      audioContext.current ??= new AudioContextConstructor()
      const context = audioContext.current
      const start = () => {
        let offset = context.currentTime
        SOUND_NOTES[sound].forEach(({ frequency, duration, waveform }) => {
          const oscillator = context.createOscillator()
          const gain = context.createGain()
          oscillator.type = waveform
          oscillator.frequency.setValueAtTime(frequency, offset)
          gain.gain.setValueAtTime(sound === 'engine' ? 0.025 : 0.045, offset)
          gain.gain.exponentialRampToValueAtTime(0.001, offset + duration)
          oscillator.connect(gain)
          gain.connect(context.destination)
          oscillator.start(offset)
          oscillator.stop(offset + duration)
          offset += duration + 0.035
        })
      }
      if (context.state === 'suspended') void context.resume().then(start).catch((error: unknown) => {
        console.warn('Could not resume the game audio context.', error)
      })
      else start()
    } catch (error) {
      console.warn('Could not play the requested game sound.', error)
    }
  }, [])
  const prepare = useCallback(async () => {
    if (typeof window === 'undefined' || !window.AudioContext) return
    try {
      audioContext.current ??= new window.AudioContext()
      if (audioContext.current.state === 'suspended') await audioContext.current.resume()
    } catch (error) {
      console.warn('Could not prepare game audio before launch.', error)
    }
  }, [])

  return <GameAudioContext.Provider value={{ play, prepare }}>
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
