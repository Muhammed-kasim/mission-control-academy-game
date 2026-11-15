
'use client'

import { useState } from 'react'
import { ArrowUpRight, BookOpen, Check, Clock3, Compass, Crosshair, Globe2, Moon, Orbit, RadioTower, Satellite, Sparkles, Target } from 'lucide-react'
import type { DifficultyId, MissionProfile, SpacecraftSize } from './mission-data'
import { DIFFICULTIES, getBudgetLimit, MISSIONS, SPACECRAFT_SIZES } from './mission-data'
import { ChoiceWithWhy, WhyButton } from './mission-choice-help'
import { DataNote, NasaTag, PageHeading, PrimaryButton } from './mission-ui'
import type { PlayMode } from './team-mode'

export function WelcomeScreen({ onPlay, onSources, difficulty, onDifficultyChange, playMode, playerCount, onPlayModeChange, onPlayerCountChange, sandboxEnabled, onSandboxChange, highContrast, onHighContrastChange, threeDEnabled, onThreeDChange }: { onPlay: () => void; onSources: () => void; difficulty: DifficultyId; onDifficultyChange: (difficulty: DifficultyId) => void; playMode: PlayMode; playerCount: number; onPlayModeChange: (mode: PlayMode) => void; onPlayerCountChange: (count: number) => void; sandboxEnabled: boolean; onSandboxChange: (enabled: boolean) => void; highContrast: boolean; onHighContrastChange: (enabled: boolean) => void; threeDEnabled: boolean; onThreeDChange: (enabled: boolean) => void }) {
  const [showTutorial, setShowTutorial] = useState(false)
  return <main className="welcome-screen" id="top">
    <div className="welcome-copy">
      <div className="challenge-label"><span className="challenge-orbit"><Globe2 aria-hidden="true" /></span><span>SPACE ADVENTURE<span className="challenge-subline">A GAME FOR CURIOUS EXPLORERS</span></span></div>
      <div className="welcome-title-wrap"><p className="eyebrow">MEET NOVA, YOUR ROBOT GUIDE <span className="eyebrow-rule" /></p><h1>Build a rocket.<br /><em>Help a planet.</em></h1></div>
      <p className="welcome-description">Pick a planet, build a ship, and bring home its discoveries.</p>
      <div className="welcome-actions"><button className="play-button" onClick={onPlay}><span className="play-icon"><Sparkles aria-hidden="true" /></span>Start an adventure<ArrowUpRight aria-hidden="true" /></button><button className="tutorial-toggle" type="button" aria-expanded={showTutorial} onClick={() => setShowTutorial((current) => !current)}><Clock3 aria-hidden="true" />{showTutorial ? 'Hide how to play' : 'How to play'}</button><button className="tutorial-toggle sources-toggle" type="button" onClick={onSources}><BookOpen aria-hidden="true" />Real NASA stories</button><a className="tutorial-toggle sources-toggle" href="/mptest" style={{ textDecoration: 'none' }}><BookOpen aria-hidden="true" />Create room</a><a className="tutorial-toggle sources-toggle" href="/nasa-gallery" style={{ textDecoration: 'none' }}><Globe2 aria-hidden="true" />NASA research</a></div>
      <section className="play-mode-setup" aria-label="Choose solo or team mode">
        <div className="play-mode-heading"><span><b>Pick your crew</b><small>Play alone or share one screen with friends.</small></span><span className="eyebrow">CREW</span></div>
        <div className="play-mode-options" role="group" aria-label="Play mode">
          <button type="button" className={playMode === 'solo' ? 'play-mode-selected' : ''} onClick={() => onPlayModeChange('solo')} aria-pressed={playMode === 'solo'}><strong>Play alone</strong><small>One player, all jobs</small></button>
          <button type="button" className={playMode === 'team' ? 'play-mode-selected' : ''} onClick={() => onPlayModeChange('team')} aria-pressed={playMode === 'team'}><strong>Play together</strong><small>Up to four players</small></button>
        </div>
        {playMode === 'team' && <div className="player-count-options" role="group" aria-label="Number of team players">
          <span>HOW MANY?</span>{[1, 2, 3, 4].map((count) => <button type="button" key={count} className={count === playerCount ? 'player-count-selected' : ''} onClick={() => onPlayerCountChange(count)} aria-pressed={count === playerCount}>{count}</button>)}
        </div>}
      </section>
      <section className="welcome-difficulty" aria-labelledby="difficulty-title">
        <div className="difficulty-heading"><span><b id="difficulty-title">Pick a challenge</b><small>This changes how much game money you get.</small></span><span className="difficulty-setting-label">MONEY</span></div>
        <div className="difficulty-options" role="radiogroup" aria-label="Mission budget difficulty">
          {DIFFICULTIES.map((option) => <div className="difficulty-choice-wrap" key={option.id}>
            <button type="button" className={`difficulty-choice ${difficulty === option.id ? 'difficulty-selected' : ''}`} role="radio" aria-checked={difficulty === option.id} onClick={() => onDifficultyChange(option.id)}>
              <strong>{option.name}</strong><span>{option.budgetLabel}</span>
            </button>
            <WhyButton impact={{ mass: 'No change.', power: 'No change.', cost: option.description, data: 'Science goals stay the same.', lifetime: 'No change.' }} />
          </div>)}
        </div>
      </section>
      <section className="game-accessibility-settings" aria-label="Game settings">
        <label><input type="checkbox" checked={sandboxEnabled} onChange={(event) => onSandboxChange(event.currentTarget.checked)} /><span><b>Free build (sandbox)</b><small>Build anything. No game limits.</small></span></label>
        <label><input type="checkbox" checked={highContrast} onChange={(event) => onHighContrastChange(event.currentTarget.checked)} /><span><b>High contrast</b><small>Increase panel and control contrast.</small></span></label>
        <label><input type="checkbox" checked={threeDEnabled} onChange={(event) => onThreeDChange(event.currentTarget.checked)} /><span><b>3D view</b><small>Optional. The game starts in 2D.</small></span></label>
      </section>
      {showTutorial && <section className="tutorial-panel" aria-label="One-minute tutorial">
        <div className="tutorial-panel-heading"><span className="eyebrow">HOW TO PLAY</span><b>Seven fun steps!</b></div>
        <ol>
          <li><b>Pick a planet</b><span>Choose where to explore.</span></li>
          <li><b>Pick a ship size</b><span>Small or big—it is your choice.</span></li>
          <li><b>Build your ship</b><span>Add science tools and power.</span></li>
          <li><b>Pick a rocket</b><span>Make sure it can reach your planet.</span></li>
          <li><b>Pick message stations</b><span>Choose how many help send science home.</span></li>
          <li><b>Fly and help</b><span>Control the launch and care for your ship.</span></li>
          <li><b>Get your stars</b><span>See what your mission discovered.</span></li>
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
      <span className="art-coordinate art-coordinate-one">🌍 EARTH<br />🌙 MOON<br />🔴 MARS</span><span className="art-coordinate art-coordinate-two">PICK YOUR SPACE ADVENTURE</span>
      <span className="art-star art-star-one" /><span className="art-star art-star-two" /><span className="art-star art-star-three" /><span className="art-star art-star-four" />
      <div className="orbit-readout"><span className="readout-live"><i /> READY, EXPLORER!</span><strong>Let’s go!</strong><span>THE STARS ARE WAITING</span></div>
      <div className="art-caption">Your robot<br />is ready!</div>
    </div>
  </main>
}

const MISSION_ICONS = { moon: Moon, mars: Crosshair, earth: Globe2 }

export function MissionSelectionScreen({ selectedId, onSelect, onBack }: { selectedId: string; onSelect: (mission: MissionProfile) => void; onBack: () => void }) {
  return <section className="flow-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Back to academy</button>
    <PageHeading eyebrow="STEP 1 · PICK A PLANET" title="Where should we go?" description="Choose a planet for our space adventure." icon={<Compass aria-hidden="true" />} />
    <div className="mission-choice-grid">
      {MISSIONS.map((mission, index) => {
        const Icon = MISSION_ICONS[mission.id]
        const active = mission.id === selectedId
        const kidMissionName = mission.id === 'moon' ? 'Moon explorer' : mission.id === 'mars' ? 'Mars weather watcher' : 'Earth helper'
        const kidScienceGoal = mission.id === 'moon'
          ? 'Map the Moon and find safe places to land.'
          : mission.id === 'mars'
            ? 'Watch Mars dust, clouds, and weather.'
            : 'Track Earth’s land and changing climate.'
        return <ChoiceWithWhy className="mission-choice-wrap" key={mission.id} impact={{ mass: 'No spacecraft part changes yet.', power: 'No direct power change.', cost: 'Sets the money available for this planet.', data: `${mission.minDataGb} GB is the science goal. ${mission.description} NASA example: ${mission.reference}.`, lifetime: `${mission.missionYears} years is the planned mission life.` }}>
          <button className={`mission-choice mission-${mission.accent} ${active ? 'choice-selected' : ''}`} onClick={() => onSelect(mission)} aria-pressed={active}>
            <span className="mission-card-top"><span className="mission-index">MISSION 0{index + 1}</span><span className="mission-choice-icon"><Icon aria-hidden="true" /></span></span>
            <span className="mission-title">{kidMissionName}</span><span className="mission-subtitle">{mission.subtitle}</span>
            <span className="mission-description">{kidScienceGoal}</span>
            <span className="mission-focus"><Target aria-hidden="true" />Pick this space trip!</span>
            <span className="mission-select-line">{active ? <><Check aria-hidden="true" /> LET'S GO!</> : <>PICK THIS PLANET <ArrowUpRight aria-hidden="true" /></>}</span>
          </button>
        </ChoiceWithWhy>
      })}
    </div>
    <div className="bottom-hint"><span className="hint-rule" /> PICK THE PLACE THAT MAKES YOU CURIOUS <span className="hint-rule" /></div>
  </section>
}

export function SizeSelectionScreen({ selectedId, onSelect, onBack }: { selectedId: string; onSelect: (size: SpacecraftSize) => void; onBack: () => void }) {
  return <section className="flow-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Change destination</button>
    <PageHeading eyebrow="STEP 2 · PICK A SHIP SIZE" title="Big ship or little ship?" description="Small ships are nimble. Big ships can carry more science tools." icon={<Satellite aria-hidden="true" />} />
    <div className="size-section-label"><span>TINY SHIPS</span><i /><small>Small enough to share a rocket</small></div>
    <div className="size-choice-grid size-cubesat-grid">
      {SPACECRAFT_SIZES.filter((size) => size.family === 'cubesat').map((size, index) => <SizeCard key={size.id} size={size} index={index} selectedId={selectedId} onSelect={onSelect} />)}
    </div>
    <div className="size-choice-grid size-large-grid">
      {SPACECRAFT_SIZES.filter((size) => size.family !== 'cubesat').map((size, index) => <SizeCard key={size.id} size={size} index={index + 3} selectedId={selectedId} onSelect={onSelect} />)}
    </div>
    <div className="size-footnote"><span>Choose the size that feels right. Nova will help with the rest.</span></div>
  </section>
}

function SizeCard({ size, index, selectedId, onSelect }: { size: SpacecraftSize; index: number; selectedId: string; onSelect: (size: SpacecraftSize) => void }) {
  const selected = selectedId === size.id
  const kidSizeName = size.id === '1u' ? 'Tiny CubeSat' : size.id === '3u' ? 'Small CubeSat' : size.id === '6u' ? 'Roomy CubeSat' : size.id === 'small' ? 'Small satellite' : 'Big observatory'
  const kidSizeDescription = size.id === '1u' ? 'A tiny, simple ship' : size.id === '3u' ? 'A little room for science' : size.id === '6u' ? 'More room for science' : size.id === 'small' ? 'A flexible space ship' : 'A very big ship'
  return <ChoiceWithWhy className="size-choice-wrap" impact={{ mass: `The bus starts at ${size.busMassKg} kg, with ${size.massLimitKg.toLocaleString()} kg maximum.`, power: `The spacecraft bus provides ${size.busPowerW} W before solar and battery upgrades.`, cost: `Bus: $${size.busCostM}M; operations: $${size.operationsCostM}M.`, data: `A larger platform carries more equipment, but does not create science data by itself. ${size.detail}`, lifetime: 'The platform size does not directly change mission life.' }}>
    <button className={`size-choice size-${size.family} ${selected ? 'choice-selected' : ''}`} onClick={() => onSelect(size)} aria-pressed={selected}>
      <span className="size-card-header"><span className="size-card-num">{index < 3 ? 'TINY SHIP' : 'BIG SHIP'}</span><span className="size-icon"><Satellite aria-hidden="true" /></span></span>
      <strong>{kidSizeName}</strong><span className="size-dimension">{kidSizeDescription}</span>
      <span className="size-mass"><b>{size.family === 'cubesat' ? 'Easy to carry' : 'Room for more tools'}</b><small>SHIP SIZE</small></span>
      <span className="size-card-foot"><span>{size.family === 'cubesat' ? 'Small and nimble' : 'Carry more parts'}</span>{selected ? <Check aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}</span>
    </button>
  </ChoiceWithWhy>
}

export function RequirementsScreen({ mission, size, difficulty, onContinue, onBack }: { mission: MissionProfile; size: SpacecraftSize; difficulty: DifficultyId; onContinue: () => void; onBack: () => void }) {
  const budget = getBudgetLimit(mission, size, difficulty)
  const difficultyName = DIFFICULTIES.find((option) => option.id === difficulty)?.name ?? 'Normal'
  return <section className="flow-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Change spacecraft class</button>
    <PageHeading eyebrow="GET READY" title="Your space adventure!" description="Here is what our ship needs to do." icon={<Target aria-hidden="true" />} />
    <div className="requirements-context"><span className="context-star">✳</span><span><small>MISSION BRIEFING</small><strong>{mission.name}</strong></span><span className="context-divider" /><span><small>SPACECRAFT</small><strong>{size.name}</strong></span><span className="context-divider" /><span><small>DIFFICULTY</small><strong>{difficultyName}</strong></span><span className="context-orbit"><Orbit aria-hidden="true" /> {mission.targetOrbit === 'polar' ? 'Polar / Sun-synchronous' : mission.targetOrbit === 'lunar' ? 'Lunar orbit' : 'Mars science orbit'}</span></div>
    <div className="requirements-grid">
      <article className="requirement-card req-data"><span className="req-label"><span>OUR SCIENCE GOAL</span><NasaTag /></span><span className="req-icon"><RadioTower aria-hidden="true" /></span><strong className="req-value">{mission.minDataGb}<small> GB</small></strong><h2>Discover something new</h2><p>Bring home enough science to answer our big question.</p><span className="req-target"><span>WHAT WE'LL LEARN</span><b>{mission.science}</b></span></article>
      <article className="requirement-card req-mass"><span className="req-label"><span>OUR SHIP SIZE</span><NasaTag /></span><span className="req-icon"><Satellite aria-hidden="true" /></span><strong className="req-value">{size.massLimitKg < 100 ? size.massLimitKg : size.massLimitKg.toLocaleString()}<small> kg</small></strong><h2>How much can we carry?</h2><p>All the parts and tools must fit on this ship.</p><span className="req-target"><span>OUR SHIP</span><b>{size.name}</b></span></article>
      <article className="requirement-card req-budget"><span className="req-label"><span>OUR GAME MONEY</span><NasaTag /></span><span className="req-icon"><Sparkles aria-hidden="true" /></span><strong className="req-value">${budget.toLocaleString()}<small> M</small></strong><h2>Money for our adventure</h2><p>Choose parts without spending all our coins.</p><span className="req-target"><span>MISSION LENGTH</span><b>{mission.missionYears} years</b></span></article>
    </div>
    <div className="requirements-footer"><span className="requirements-note"><Check aria-hidden="true" /> Nova will help us build a ship.</span><PrimaryButton onClick={onContinue}>Build our ship</PrimaryButton></div>
    <DataNote />
  </section>
}
