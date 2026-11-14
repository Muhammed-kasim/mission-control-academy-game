'use client'

import { useId, useState, type ReactNode } from 'react'
import { CircleHelp, Coins, Minus, ThumbsDown, ThumbsUp, Weight, Zap } from 'lucide-react'
import { NasaTag } from './mission-ui'

export interface ChoiceImpact {
  mass: string
  power: string
  cost: string
  data: string
  lifetime: string
}

type ImpactMood = 'up' | 'down' | 'same'

function getImpactMood(category: 'mass' | 'power' | 'cost', text: string): ImpactMood {
  const value = text.toLowerCase()
  if (/no (direct )?(spacecraft )?(mass|power|change)|does not change|no operating power/.test(value)) return 'same'
  if (category === 'mass') return /adds? [\d,.]+\s*kg|heavier|increases mass/.test(value) ? 'down' : 'up'
  if (category === 'cost') return /adds? \$|costs? \$|estimated launch/.test(value) ? 'down' : 'up'
  if (/produces|stores|no operating power|reduces? .*power/.test(value)) return 'up'
  if (/uses? [\d,.]+\s*w|power demand|draw|uses power/.test(value)) return 'down'
  return 'same'
}

function ChoiceSignals({ impact }: { impact: ChoiceImpact }) {
  const indicators = [
    { label: 'Money', Icon: Coins, mood: getImpactMood('cost', impact.cost) },
    { label: 'Weight', Icon: Weight, mood: getImpactMood('mass', impact.mass) },
    { label: 'Power', Icon: Zap, mood: getImpactMood('power', impact.power) },
  ]

  return <span className="choice-vibes" aria-label="Money, weight, and power effects">
    {indicators.map(({ label, Icon, mood }) => {
      const MoodIcon = mood === 'up' ? ThumbsUp : mood === 'down' ? ThumbsDown : Minus
      return <span className={`choice-vibe choice-vibe-${mood}`} title={`${label}: ${mood}`} key={label}>
        <Icon aria-hidden="true" /><MoodIcon aria-hidden="true" />
      </span>
    })}
  </span>
}

export function WhyButton({ impact, lockedReason }: { impact: ChoiceImpact; lockedReason?: string }) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  const label = lockedReason ? 'Why is this locked?' : 'Why?'

  return <span className="choice-help" onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
    <button
      type="button"
      className={`choice-help-trigger ${lockedReason ? 'choice-help-locked' : ''}`}
      aria-expanded={open}
      aria-controls={open ? tooltipId : undefined}
      aria-label={lockedReason ? `${label} ${lockedReason}` : `Why? ${impact.mass} ${impact.power} ${impact.cost} ${impact.data} ${impact.lifetime}`}
      onClick={() => setOpen((current) => !current)}
    >
      <CircleHelp aria-hidden="true" />{label}
    </button>
    {open && <span className="choice-help-popover" id={tooltipId} role="tooltip">
      {lockedReason && <strong className="choice-locked-copy">{lockedReason}</strong>}
      <span><b>Weight (mass)</b>{impact.mass}</span>
      <span><b>Power</b>{impact.power}</span>
      <span><b>Money (budget)</b>{impact.cost}</span>
      <span><b>Science (data)</b>{impact.data}</span>
      <span><b>Mission time</b>{impact.lifetime}</span>
      <NasaTag />
    </span>}
  </span>
}

export function ChoiceWithWhy({ children, impact, lockedReason, className = '' }: { children: ReactNode; impact: ChoiceImpact; lockedReason?: string; className?: string }) {
  return <div className={`choice-with-why ${className}`}>
    {children}
    <ChoiceSignals impact={impact} />
    <WhyButton impact={impact} lockedReason={lockedReason} />
  </div>
}
