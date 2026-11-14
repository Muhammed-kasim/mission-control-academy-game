'use client'

import { useState } from 'react'
import { ArrowUpRight, Check, Clock3, Compass, Crosshair, Globe2, Moon, Orbit, RadioTower, Satellite, Sparkles, Target } from 'lucide-react'
import type { DifficultyId, MissionProfile, SpacecraftSize } from './mission-data'
import { DIFFICULTIES, getBudgetLimit, MISSIONS, SPACECRAFT_SIZES } from './mission-data'
import { WhyButton } from './mission-choice-help'
import { DataNote, NasaTag, PageHeading, PrimaryButton } from './mission-ui'

export function WelcomeScreen({ onPlay, difficulty, onDifficultyChange }: { onPlay: () => void; difficulty: DifficultyId; onDifficultyChange: (difficulty: DifficultyId) => void }) {
  const [showTutorial, setShowTutorial] = useState(false)
  return <main className="welcome-screen" id="top">
    <div className="welcome-copy">
      <div className="challenge-label"><span className="challenge-orbit"><Globe2 aria-hidden="true" /></span><span>NASA SPACE APPS CHALLENGE<span className="challenge-subline">SPACE MISSION DESIGN GAME</span></span></div>
      <div className="welcome-title-wrap"><p className="eyebrow">MISSION CONTROL ACADEMY <span className="eyebrow-rule" /></p><h1>Design a mission.<br /><em>Change a world.</em></h1></div>
      <p className="welcome-description">From the first launch decision to the science data reaching Earth — build a complete space mission, one smart choice at a time.</p>
      <div className="welcome-actions"><button className="play-button" onClick={onPlay}><span className="play-icon"><Sparkles aria-hidden="true" /></span>Start your mission<ArrowUpRight aria-hidden="true" /></button><button className="tutorial-toggle" type="button" aria-expanded={showTutorial} onClick={() => setShowTutorial((current) => !current)}><Clock3 aria-hidden="true" />{showTutorial ? 'Close tutorial' : '1-minute tutorial'}</button><span className="play-meta">No account needed <i /> Beginner friendly</span></div>
      <section className="welcome-difficulty" aria-labelledby="difficulty-title">
        <div className="difficulty-heading"><span><b id="difficulty-title">Set your challenge</b><small>Difficulty changes budget room, not mission physics.</small></span><span className="difficulty-setting-label">BUDGET SETTING</span></div>
        <div className="difficulty-options" role="radiogroup" aria-label="Mission budget difficulty">
          {DIFFICULTIES.map((option) => <div className="difficulty-choice-wrap" key={option.id}>
            <button type="button" className={`difficulty-choice ${difficulty === option.id ? 'difficulty-selected' : ''}`} role="radio" aria-checked={difficulty === option.id} onClick={() => onDifficultyChange(option.id)}>
              <strong>{option.name}</strong><span>{option.budgetLabel}</span>
            </button>
            <WhyButton impact={{ mass: 'No change.', power: 'No change.', cost: option.description, data: 'Science goals stay the same.', lifetime: 'No change.' }} />
          </div>)}
        </div>
      </section>
      {showTutorial && <section className="tutorial-panel" aria-label="One-minute tutorial">
        <div className="tutorial-panel-heading"><span className="eyebrow">YOUR ONE-MINUTE FLIGHT PLAN</span><b>Four stages. One mission.</b></div>
        <ol>
          <li><b>CML 1 · Cocktail Napkin</b><span>Pick a science goal and spacecraft size.</span></li>
          <li><b>CML 2 · Initial Feasibility</b><span>Add the main parts and check if they work.</span></li>
          <li><b>CML 3 · Trade Space</b><span>Build two alternatives and compare science, cost, and risk.</span></li>
          <li><b>CML 4 · Point Design</b><span>Choose one design, verify it, then launch.</span></li>
        </ol>
      </section>}
      <div className="segment-overview" aria-label="Four mission segments">
        <span><b>01</b> Launch</span><i /><span><b>02</b> Space</span><i /><span><b>03</b> Ground</span><i /><span><b>04</b> User</span>
      </div>
    </div>
    <div className="welcome-art" aria-hidden="true">
      <div className="art-ambient art-ambient-one" /><div className="art-ambient art-ambient-two" />
      <div className="orbit-path orbit-path-one" /><div className="orbit-path orbit-path-two" />
      <div className="art-earth"><span className="earth-glow" /><span className="earth-surface" /><span className="earth-cloud earth-cloud-one" /><span className="earth-cloud earth-cloud-two" /></div>
      <div className="art-satellite"><span className="satellite-wing satellite-wing-left" /><span className="satellite-core"><Satellite /></span><span className="satellite-wing satellite-wing-right" /><span className="satellite-antenna" /></div>
      <span className="art-coordinate art-coordinate-one">34° 42′ N<br />127° 29′ E</span><span className="art-coordinate art-coordinate-two">MISSION 01 / ORBITAL INSERTION</span>
      <span className="art-star art-star-one" /><span className="art-star art-star-two" /><span className="art-star art-star-three" /><span className="art-star art-star-four" />
      <div className="orbit-readout"><span className="readout-live"><i /> SYSTEM NOMINAL</span><strong>400 <small>km</small></strong><span>LOW EARTH ORBIT</span></div>
      <div className="art-caption">A new mission<br />is taking shape.</div>
    </div>
    <section className="welcome-foot">
      <div><span className="foot-index">01 / CHOOSE</span><strong>Pick a real-world inspired mission</strong><small>Moon, Mars, or Earth science</small></div>
      <div><span className="foot-index">02 / DESIGN</span><strong>Balance the mission segments</strong><small>Launch · Space · Ground · User</small></div>
      <div><span className="foot-index">03 / DISCOVER</span><strong>Build, verify, and launch</strong><small>See how your choices add up</small></div>
      <DataNote />
    </section>
  </main>
}

const MISSION_ICONS = { moon: Moon, mars: Crosshair, earth: Globe2 }

export function MissionSelectionScreen({ selectedId, onSelect, onBack }: { selectedId: string; onSelect: (mission: MissionProfile) => void; onBack: () => void }) {
  return <section className="flow-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Back to academy</button>
    <PageHeading eyebrow="CML 1 — COCKTAIL NAPKIN · MISSION GOAL" title="What will you explore?" description="Choose a mission inspired by a real NASA science program." icon={<Compass aria-hidden="true" />} />
    <div className="mission-choice-grid">
      {MISSIONS.map((mission, index) => {
        const Icon = MISSION_ICONS[mission.id]
        const active = mission.id === selectedId
        return <div className="mission-choice-wrap" key={mission.id}>
          <button className={`mission-choice mission-${mission.accent} ${active ? 'choice-selected' : ''}`} onClick={() => onSelect(mission)} aria-pressed={active}>
            <span className="mission-card-top"><span className="mission-index">MISSION 0{index + 1}</span><span className="mission-choice-icon"><Icon aria-hidden="true" /></span></span>
            <span className="mission-title">{mission.name}</span><span className="mission-subtitle">{mission.subtitle}</span>
            <span className="mission-description">{mission.description}</span>
            <span className="mission-focus"><Target aria-hidden="true" />{mission.science}</span>
            <span className="mission-source"><NasaTag /> <span>{mission.reference}</span></span>
            <span className="mission-select-line">{active ? <><Check aria-hidden="true" /> SELECTED — CONTINUE</> : <>SELECT MISSION <ArrowUpRight aria-hidden="true" /></>}</span>
          </button>
          <WhyButton impact={{ mass: 'No spacecraft part changes yet.', power: 'No direct power change.', cost: `Sets the mission budget cap for this destination.`, data: `${mission.minDataGb} GB of science data is the minimum goal.`, lifetime: `${mission.missionYears} years is the planned mission life.` }} />
        </div>
      })}
    </div>
    <div className="bottom-hint"><span className="hint-rule" /> YOUR MISSION WILL DEFINE ITS SCIENCE TARGETS <span className="hint-rule" /></div>
  </section>
}

export function SizeSelectionScreen({ selectedId, onSelect, onBack }: { selectedId: string; onSelect: (size: SpacecraftSize) => void; onBack: () => void }) {
  return <section className="flow-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Change destination</button>
    <PageHeading eyebrow="CML 1 — COCKTAIL NAPKIN · SPACECRAFT SIZE" title="How big is your mission?" description="Start with the right platform. Every spacecraft comes with a different mass and power envelope." icon={<Satellite aria-hidden="true" />} />
    <div className="size-section-label"><span>CUBESAT</span><i /><small>Small enough to share a ride</small></div>
    <div className="size-choice-grid size-cubesat-grid">
      {SPACECRAFT_SIZES.filter((size) => size.family === 'cubesat').map((size, index) => <SizeCard key={size.id} size={size} index={index} selectedId={selectedId} onSelect={onSelect} />)}
    </div>
    <div className="size-choice-grid size-large-grid">
      {SPACECRAFT_SIZES.filter((size) => size.family !== 'cubesat').map((size, index) => <SizeCard key={size.id} size={size} index={index + 3} selectedId={selectedId} onSelect={onSelect} />)}
    </div>
    <div className="size-footnote"><NasaTag /> <span>CubeSat mass limits use the game-scale values requested: 1U ≈ 1.33 kg · 3U ≈ 4 kg · 6U ≈ 12 kg.</span></div>
  </section>
}

function SizeCard({ size, index, selectedId, onSelect }: { size: SpacecraftSize; index: number; selectedId: string; onSelect: (size: SpacecraftSize) => void }) {
  const selected = selectedId === size.id
  return <div className="size-choice-wrap">
    <button className={`size-choice size-${size.family} ${selected ? 'choice-selected' : ''}`} onClick={() => onSelect(size)} aria-pressed={selected}>
      <span className="size-card-header"><span className="size-card-num">PLATFORM / 0{index + 1}</span><span className="size-icon"><Satellite aria-hidden="true" /></span></span>
      <strong>{size.name}</strong><span className="size-dimension">{size.detail}</span>
      <span className="size-mass"><b>{size.massLimitKg < 100 ? `${size.massLimitKg} kg` : `${size.massLimitKg.toLocaleString()} kg`}</b><small>MAX SPACECRAFT MASS</small></span>
      <span className="size-card-foot"><span>{size.recommendedFor}</span>{selected ? <Check aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}</span>
      <NasaTag />
    </button>
    <WhyButton impact={{ mass: `The bus starts at ${size.busMassKg} kg, with ${size.massLimitKg.toLocaleString()} kg maximum.`, power: `The spacecraft bus provides ${size.busPowerW} W before solar and battery upgrades.`, cost: `Bus: $${size.busCostM}M; operations: $${size.operationsCostM}M.`, data: 'A larger platform carries more equipment, but does not create science data by itself.', lifetime: 'The platform size does not directly change mission life.' }} />
  </div>
}

export function RequirementsScreen({ mission, size, difficulty, onContinue, onBack }: { mission: MissionProfile; size: SpacecraftSize; difficulty: DifficultyId; onContinue: () => void; onBack: () => void }) {
  const budget = getBudgetLimit(mission, size, difficulty)
  const difficultyName = DIFFICULTIES.find((option) => option.id === difficulty)?.name ?? 'Normal'
  return <section className="flow-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Change spacecraft class</button>
    <PageHeading eyebrow="CML 1 — COCKTAIL NAPKIN · MISSION BRIEFING" title="Your mission targets." description="Your goal, spacecraft size, and budget set the boundaries for the first design." icon={<Target aria-hidden="true" />} />
    <div className="requirements-context"><span className="context-star">✳</span><span><small>MISSION BRIEFING</small><strong>{mission.name}</strong></span><span className="context-divider" /><span><small>SPACECRAFT</small><strong>{size.name}</strong></span><span className="context-divider" /><span><small>DIFFICULTY</small><strong>{difficultyName}</strong></span><span className="context-orbit"><Orbit aria-hidden="true" /> {mission.targetOrbit === 'polar' ? 'Polar / Sun-synchronous' : mission.targetOrbit === 'lunar' ? 'Lunar orbit' : 'Mars science orbit'}</span></div>
    <div className="requirements-grid">
      <article className="requirement-card req-data"><span className="req-label"><span>REQUIREMENT 01</span><NasaTag /></span><span className="req-icon"><RadioTower aria-hidden="true" /></span><strong className="req-value">{mission.minDataGb}<small> GB</small></strong><h2>Minimum science data</h2><p>Return enough usable data to answer the mission&apos;s science question.</p><span className="req-target"><span>MISSION GOAL</span><b>{mission.science}</b></span></article>
      <article className="requirement-card req-mass"><span className="req-label"><span>REQUIREMENT 02</span><NasaTag /></span><span className="req-icon"><Satellite aria-hidden="true" /></span><strong className="req-value">{size.massLimitKg < 100 ? size.massLimitKg : size.massLimitKg.toLocaleString()}<small> kg</small></strong><h2>Maximum spacecraft mass</h2><p>Everything in the spacecraft bus and science payload counts toward this limit.</p><span className="req-target"><span>PLATFORM LIMIT</span><b>{size.name}</b></span></article>
      <article className="requirement-card req-budget"><span className="req-label"><span>REQUIREMENT 03</span><NasaTag /></span><span className="req-icon"><Sparkles aria-hidden="true" /></span><strong className="req-value">${budget.toLocaleString()}<small> M</small></strong><h2>Maximum mission budget</h2><p>Cover launch, hardware, ground stations, user data products, and operations.</p><span className="req-target"><span>MISSION LIFETIME</span><b>{mission.missionYears} years</b></span></article>
    </div>
    <div className="requirements-footer"><span className="requirements-note"><Check aria-hidden="true" /> Your live telemetry will update as you design.</span><PrimaryButton onClick={onContinue}>Begin initial design</PrimaryButton></div>
    <DataNote />
  </section>
}
