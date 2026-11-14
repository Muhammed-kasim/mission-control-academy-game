'use client'

import { Bot, Radio, Rocket } from 'lucide-react'
import { memo, useEffect } from 'react'
import { useGameAudio } from './game-audio'

export type RadioSpeaker = 'Mission Control' | 'Robot Pilot' | 'Nova'

export function NovaGuide({ message }: { message: string }) {
  return <aside className="nova-guide" aria-label="Nova's hint">
    <span className="nova-character" aria-hidden="true">
      <i className="nova-antenna" />
      <Bot />
      <i className="nova-cheek nova-cheek-left" />
      <i className="nova-cheek nova-cheek-right" />
    </span>
    <span className="nova-speech">
      <b>Nova</b>
      <span>{message}</span>
    </span>
  </aside>
}

export const CrewRadio = memo(function CrewRadio({ speaker, message }: { speaker: RadioSpeaker; message: string }) {
  const { play } = useGameAudio()

  useEffect(() => {
    play('radio')
  }, [message, play])

  return <aside className="crew-radio" aria-label="Crew radio">
    <span className="crew-radio-crew" aria-hidden="true">
      <span className={speaker === 'Mission Control' ? 'crew-radio-active' : ''}><Radio />Ground</span>
      <span className={speaker === 'Robot Pilot' ? 'crew-radio-active' : ''}><Rocket />Pilot</span>
      <span className={speaker === 'Nova' ? 'crew-radio-active' : ''}><Bot />Nova</span>
    </span>
    <span className="crew-radio-bubble" key={`${speaker}-${message}`}>
      <b>{speaker}</b>
      <span>{message}</span>
    </span>
  </aside>
})
