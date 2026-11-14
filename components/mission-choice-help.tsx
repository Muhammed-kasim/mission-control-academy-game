'use client'

import { useId, useState, type ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'

export interface ChoiceImpact {
  mass: string
  power: string
  cost: string
  data: string
  lifetime: string
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
      <span><b>Mass</b>{impact.mass}</span>
      <span><b>Power</b>{impact.power}</span>
      <span><b>Cost</b>{impact.cost}</span>
      <span><b>Data</b>{impact.data}</span>
      <span><b>Lifetime</b>{impact.lifetime}</span>
    </span>}
  </span>
}

export function ChoiceWithWhy({ children, impact, lockedReason, className = '' }: { children: ReactNode; impact: ChoiceImpact; lockedReason?: string; className?: string }) {
  return <div className={`choice-with-why ${className}`}>
    {children}
    <WhyButton impact={impact} lockedReason={lockedReason} />
  </div>
}
