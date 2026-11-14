'use client'

import { useState, type ReactNode } from 'react'
import { ArrowUpRight, BatteryCharging, Check, ChevronRight, CircleGauge, ClipboardList, Crosshair, Disc3, Globe2, Moon, Orbit, Paintbrush, RadioTower, Rocket, Satellite, Shield, Sun, Target, UsersRound, Waves, Zap } from 'lucide-react'
import type { DesignTab, MissionCheck, MissionConfiguration, MissionEstimate, MissionProfile, RocketAppearance, SpacecraftSize } from './mission-data'
import { getAntennaOptions, getBatteryOptions, getOrbit, getRocket, getShieldingOptions, getSolarOptions, getUserProduct, INSTRUMENTS, ORBITS, ROCKETS, USER_PRODUCTS } from './mission-data'
import { DataNote, NasaTag, PageHeading, PrimaryButton, SegmentPill } from './mission-ui'
import { MissionEquipmentList } from './mission-equipment-list'
import { ChoiceWithWhy } from './mission-choice-help'
import { MissionRocketCustomizer, MissionSpacecraft3D } from './mission-3d-view'
import type { MissionProgression } from './mission-progression'
import { TEAM_ROLES, TeamModeBar, type PlayMode, type TeamRoleId } from './team-mode'

const DESTINATIONS = [
  { label: 'Earth', orbits: ['leo', 'polar', 'geo'], Icon: Globe2 },
  { label: 'Moon', orbits: ['lunar'], Icon: Moon },
  { label: 'Mars', orbits: ['mars'], Icon: Crosshair },
]

export type DesignPhase = 'baseline' | 'alternative-a' | 'alternative-b'

export function MissionDesign({ mission, size, configuration, estimate, checks, onChange, onBack, onVerify, phase = 'baseline', notice, playMode, playerCount, activePlayer, activeRole, onPlayerChange, onRoleChange, rocketAppearance, onRocketAppearanceChange, progression, sandboxEnabled, threeDEnabled, onThreeDChange }: {
  mission: MissionProfile
  size: SpacecraftSize
  configuration: MissionConfiguration
  estimate: MissionEstimate
  checks: MissionCheck[]
  onChange: (patch: Partial<MissionConfiguration>) => void
  onBack: () => void
  onVerify: () => void
  phase?: DesignPhase
  notice?: string
  playMode: PlayMode
  playerCount: number
  activePlayer: number
  activeRole: TeamRoleId
  onPlayerChange: (player: number) => void
  onRoleChange: (role: TeamRoleId) => void
  rocketAppearance: RocketAppearance
  onRocketAppearanceChange: (patch: Partial<RocketAppearance>) => void
  progression: MissionProgression
  sandboxEnabled: boolean
  threeDEnabled: boolean
  onThreeDChange: (enabled: boolean) => void
}) {
  const [activeTab, setActiveTab] = useState<DesignTab>('space')
  const [equipmentFocused, setEquipmentFocused] = useState(false)
  const tabs: { id: DesignTab; label: string; number: string; Icon: typeof Satellite }[] = [
    { id: 'space', label: 'Build ship', number: '1', Icon: Satellite },
    { id: 'launch', label: 'Pick rocket', number: '2', Icon: Orbit },
    { id: 'ground', label: 'Stations & sharing', number: '3', Icon: RadioTower },
  ]
  const failedCount = checks.filter((check) => !check.passed).length
  const phaseLabel = phase === 'baseline' ? 'STEP 3 · BUILD YOUR SHIP' : `TRY A NEW SHIP IDEA · ${phase === 'alternative-a' ? 'A' : 'B'}`
  const phaseTitle = phase === 'baseline' ? 'Build your space ship!' : `Try a different idea for ship ${phase === 'alternative-a' ? 'A' : 'B'}.`
  const backLabel = phase === 'baseline' ? 'Back to ship size' : phase === 'alternative-a' ? 'Back to the ship check' : 'Back to ship idea A'
  const canEditRole = (role: TeamRoleId) => playMode === 'solo' || playerCount === 1 || activeRole === role
  const navigateToTab = (tab: DesignTab) => {
    setActiveTab(tab)
    window.setTimeout(() => document.getElementById(`tab-${tab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }
  const navigateToPaint = () => {
    setActiveTab('launch')
    window.setTimeout(() => document.getElementById('rocket-customizer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }
  const navigateToEquipment = () => {
    setEquipmentFocused(true)
    window.setTimeout(() => document.getElementById('equipment-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  return <main className="flow-screen design-screen">
    <button className="back-link" onClick={onBack}><span>←</span> {backLabel}</button>
    <PageHeading eyebrow={phaseLabel} title={phaseTitle} description="Pick parts that help us see, learn, and send messages home." icon={<CircleGauge aria-hidden="true" />} />
    <TeamModeBar mode={playMode} playerCount={playerCount} activePlayer={activePlayer} activeRole={activeRole} onPlayerChange={onPlayerChange} onRoleChange={onRoleChange} />
    <MissionSpacecraft3D configuration={configuration} size={size} threeDEnabled={threeDEnabled} onThreeDChange={onThreeDChange} />
    <div className="design-segment-rail" aria-label="Build your mission">
      <SegmentPill label="Ship" icon="space" active={activeTab === 'space'} /><ChevronRight aria-hidden="true" />
      <SegmentPill label="Rocket" icon="launch" active={activeTab === 'launch'} /><ChevronRight aria-hidden="true" />
      <SegmentPill label="Messages home" icon="ground" active={activeTab === 'ground'} />
    </div>
    <div className="design-tabbar" role="tablist" aria-label="Mission design segments">
      {tabs.map(({ id, label, number, Icon }) => <button role="tab" aria-selected={activeTab === id} aria-controls="design-tab-panel" id={`tab-${id}`} className={`design-tab ${activeTab === id ? 'design-tab-active' : ''}`} key={id} onClick={() => setActiveTab(id)}>
        <span className="tab-number">{number}</span><Icon aria-hidden="true" /><span>{label}</span><span className="tab-arrow"><ArrowUpRight aria-hidden="true" /></span>
      </button>)}
    </div>
    <div className="design-layout">
      <section className="design-main-panel" id="design-tab-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'space' && <SpaceSegment mission={mission} size={size} configuration={configuration} onChange={onChange} activeRole={activeRole} canEditRole={canEditRole} sandboxEnabled={sandboxEnabled} />}
        {activeTab === 'launch' && <LaunchSegment mission={mission} size={size} configuration={configuration} onChange={onChange} activeRole={activeRole} canEditRole={canEditRole} rocketAppearance={rocketAppearance} onRocketAppearanceChange={onRocketAppearanceChange} progression={progression} sandboxEnabled={sandboxEnabled} threeDEnabled={threeDEnabled} />}
        {activeTab === 'ground' && <><GroundSegment configuration={configuration} onChange={onChange} activeRole={activeRole} canEditRole={canEditRole} /><UserSegment configuration={configuration} onChange={onChange} activeRole={activeRole} canEditRole={canEditRole} /></>}
      </section>
      <details className={`design-equipment-panel ${equipmentFocused ? 'equipment-panel-focused' : ''}`} id="equipment-list" open={equipmentFocused} onToggle={(event) => setEquipmentFocused(event.currentTarget.open)}>
        <summary>Show ship details</summary>
        <div className="equipment-panel-inner">
          <div className="equipment-panel-top"><div><span className="eyebrow">SHIP PARTS</span><h2>Everything we picked</h2></div><span className="inventory-live"><i /> LIVE</span></div>
          <p className="equipment-intro">The numbers behind your choices live here.</p>
          <MissionEquipmentList size={size} configuration={configuration} estimate={estimate} />
          <div className="support-cost-box"><span className="support-cost-head"><span>MISSION MONEY</span><NasaTag /></span>
            <div><span><Rocket aria-hidden="true" />{getRocket(configuration.rocketId).name}</span><b>${getRocket(configuration.rocketId).costM.toLocaleString()}M</b></div>
            <div><span><RadioTower aria-hidden="true" />{configuration.stations} ground {configuration.stations === 1 ? 'station' : 'stations'}</span><b>${(configuration.stations * 2).toLocaleString()}M</b></div>
            <div><span><UsersRound aria-hidden="true" />{getUserProduct(configuration.userId).name}</span><b>${getUserProduct(configuration.userId).costM}M</b></div>
            <div><span>Operations &amp; mission support</span><b>${size.operationsCostM.toLocaleString()}M</b></div>
            <div className="support-total"><span>Total mission estimate</span><b>${estimate.totalCostM.toLocaleString()}M</b></div>
          </div>
        </div>
      </details>
    </div>
    {notice && <div className="design-validation-note" role="status"><CircleGauge aria-hidden="true" />Make ship idea B different from idea A.</div>}
    <div className="design-actions"><div className={`design-check-count ${failedCount ? 'check-count-alert' : ''}`}><span className="check-count-dot" />{failedCount ? 'Nova can help fix a ship problem' : 'Your ship looks ready for a check'}</div><div className="design-action-buttons"><PrimaryButton variant="quiet" icon="left" onClick={onBack}>{phase === 'baseline' ? 'Back' : phase === 'alternative-a' ? 'Ship check' : 'Idea A'}</PrimaryButton><PrimaryButton onClick={onVerify}>{phase === 'baseline' ? 'Check my ship' : phase === 'alternative-a' ? 'Save idea A' : 'Compare ship ideas'}</PrimaryButton></div></div>
    <nav className="mobile-mission-tabs" aria-label="Mission design stations">
      <button type="button" className={activeTab === 'space' ? 'mobile-mission-tab-active' : ''} onClick={() => navigateToTab('space')}><Satellite aria-hidden="true" /><span>Space</span></button>
      <button type="button" className={activeTab === 'launch' ? 'mobile-mission-tab-active' : ''} onClick={() => navigateToTab('launch')}><Orbit aria-hidden="true" /><span>Launch</span></button>
      <button type="button" className={activeTab === 'ground' ? 'mobile-mission-tab-active' : ''} onClick={() => navigateToTab('ground')}><RadioTower aria-hidden="true" /><span>Ground</span></button>
      <button type="button" onClick={navigateToPaint}><Paintbrush aria-hidden="true" /><span>Paint</span></button>
      <button type="button" aria-pressed={equipmentFocused} onClick={navigateToEquipment}><ClipboardList aria-hidden="true" /><span>Equipment</span></button>
    </nav>
    <DataNote />
  </main>
}

function SpaceSegment({ mission, size, configuration, onChange, activeRole, canEditRole, sandboxEnabled }: { mission: MissionProfile; size: SpacecraftSize; configuration: MissionConfiguration; onChange: (patch: Partial<MissionConfiguration>) => void; activeRole: TeamRoleId; canEditRole: (role: TeamRoleId) => boolean; sandboxEnabled: boolean }) {
  const solarChoices = getSolarOptions(size)
  const batteryChoices = getBatteryOptions(size)
  const antennaChoices = getAntennaOptions(size)
  const shieldingChoices = getShieldingOptions(size)
  const toggleInstrument = (id: string) => {
    const current = configuration.instrumentIds
    if (current.includes(id)) onChange({ instrumentIds: current.filter((item) => item !== id) })
    else if (sandboxEnabled || current.length < 4) onChange({ instrumentIds: [...current, id] })
  }
  return <div className="segment-content">
    <div className="segment-intro"><span className="segment-overline"><span>BUILD SHIP</span><i /> PICK YOUR PARTS</span><h2>What goes on our ship?</h2><p>Choose power, science tools, and messages home.</p></div>
    <div className="option-group">
      <div className="option-group-heading"><span className="equipment-icon solar-icon"><Sun aria-hidden="true" /></span><span><strong>Power panels</strong><small>Power (solar)</small></span><span className="group-hint">PICK ONE</span></div>
      <RoleControlledChoices role="engineer" activeRole={activeRole} canEdit={canEditRole('engineer')}><div className="equipment-choice-grid">{solarChoices.map((option) => <ChoiceWithWhy key={option.id} className="equipment-choice-wrap" impact={{ mass: `Adds ${option.massKg} kg.`, power: `Produces ${option.watts} W.`, cost: `Adds $${option.costM}M.`, data: 'Does not change the science target or data volume.', lifetime: `${option.lifetimeBonus ? `Adds ${option.lifetimeBonus} year` : 'No direct change to'} mission life.` }}><button className={`equipment-choice ${configuration.solarId === option.id ? 'equipment-selected' : ''}`} onClick={() => onChange({ solarId: option.id })} aria-pressed={configuration.solarId === option.id}>
        <span className="choice-top"><span className="choice-name">{option.name}</span>{configuration.solarId === option.id && <Check aria-hidden="true" />}</span><span className="choice-desc">{option.description}</span><span className="choice-data">Makes more sunshine power</span><span className="choice-footer"><b>Tap to choose</b></span>
      </button></ChoiceWithWhy>)}</div></RoleControlledChoices>
    </div>
    <div className="option-group option-group-separated">
      <div className="option-group-heading"><span className="equipment-icon battery-icon"><BatteryCharging aria-hidden="true" /></span><span><strong>Battery</strong><small>Power storage for dark times</small></span><span className="group-hint">PICK ONE</span></div>
      <RoleControlledChoices role="engineer" activeRole={activeRole} canEdit={canEditRole('engineer')}><div className="equipment-choice-grid">{batteryChoices.map((option) => <ChoiceWithWhy key={option.id} className="equipment-choice-wrap" impact={{ mass: `Adds ${option.massKg} kg.`, power: `Stores ${option.wattHours} Wh for dark periods; it does not generate power.`, cost: `Adds $${option.costM}M.`, data: 'Does not change science data directly.', lifetime: `${option.lifetimeBonus ? `Adds ${option.lifetimeBonus} year` : 'No direct change to'} mission life.` }}><button className={`equipment-choice ${configuration.batteryId === option.id ? 'equipment-selected' : ''}`} onClick={() => onChange({ batteryId: option.id })} aria-pressed={configuration.batteryId === option.id}>
        <span className="choice-top"><span className="choice-name">{option.name}</span>{configuration.batteryId === option.id && <Check aria-hidden="true" />}</span><span className="choice-desc">{option.description}</span><span className="choice-data">Keeps the ship going in the dark</span><span className="choice-footer"><b>Tap to choose</b></span>
      </button></ChoiceWithWhy>)}</div></RoleControlledChoices>
    </div>
    <div className="option-group option-group-separated">
      <div className="option-group-heading"><span className="equipment-icon shield-icon"><Shield aria-hidden="true" /></span><span><strong>Space-rock shield</strong><small>Shielding (debris protection)</small></span><span className="group-hint">PICK ONE</span></div>
      <RoleControlledChoices role="engineer" activeRole={activeRole} canEdit={canEditRole('engineer')}><div className="equipment-choice-grid">{shieldingChoices.map((option) => <ChoiceWithWhy key={option.id} className="equipment-choice-wrap" impact={{ mass: `Adds ${option.massKg} kg.`, power: 'Uses no operating power.', cost: `Adds $${option.costM}M.`, data: 'Does not change science data directly.', lifetime: 'No direct change to mission life.' }}><button className={`equipment-choice ${configuration.shieldingId === option.id ? 'equipment-selected' : ''}`} onClick={() => onChange({ shieldingId: option.id })} aria-pressed={configuration.shieldingId === option.id}>
        <span className="choice-top"><span className="choice-name">{option.name}</span>{configuration.shieldingId === option.id && <Check aria-hidden="true" />}</span><span className="choice-desc">{option.description}</span><span className="choice-data">Helps us bounce off space rocks</span><span className="choice-footer"><b>Tap to choose</b></span>
      </button></ChoiceWithWhy>)}</div></RoleControlledChoices>
    </div>
    <div className="option-group option-group-separated">
      <div className="option-group-heading"><span className="equipment-icon antenna-icon"><Waves aria-hidden="true" /></span><span><strong>Messages antenna</strong><small>Signal strength (communication)</small></span><span className="group-hint">PICK ONE</span></div>
      <RoleControlledChoices role="communications" activeRole={activeRole} canEdit={canEditRole('communications')}><div className="equipment-choice-grid">{antennaChoices.map((option) => <ChoiceWithWhy key={option.id} className="equipment-choice-wrap" impact={{ mass: `Adds ${option.massKg} kg.`, power: `Uses ${option.powerW} W when transmitting.`, cost: `Adds $${option.costM}M.`, data: `Can send about ${option.gbPerDay} GB per day before ground coverage is added.`, lifetime: 'No direct change to mission life.' }}><button className={`equipment-choice ${configuration.antennaId === option.id ? 'equipment-selected' : ''}`} onClick={() => onChange({ antennaId: option.id })} aria-pressed={configuration.antennaId === option.id}>
        <span className="choice-top"><span className="choice-name">{option.name}</span>{configuration.antennaId === option.id && <Check aria-hidden="true" />}</span><span className="choice-desc">{option.description}</span><span className="choice-data">Helps send discoveries home</span><span className="choice-footer"><b>Tap to choose</b></span>
      </button></ChoiceWithWhy>)}</div></RoleControlledChoices>
    </div>
    <div className="option-group option-group-separated">
      <div className="option-group-heading instrument-heading"><span className="equipment-icon instrument-icon"><Disc3 aria-hidden="true" /></span><span><strong>Science tools</strong><small>Tools (instruments) help us discover new things</small></span><span className="instrument-limit">{configuration.instrumentIds.length} {sandboxEnabled ? 'tools' : '/ 4 tools'}</span></div>
      <RoleControlledChoices role="science" activeRole={activeRole} canEdit={canEditRole('science')}><div className="instrument-choice-grid">{INSTRUMENTS.map((instrument) => {
        const selected = configuration.instrumentIds.includes(instrument.id)
        const maxed = !sandboxEnabled && !selected && configuration.instrumentIds.length >= 4
        return <ChoiceWithWhy key={instrument.id} className="instrument-choice-wrap" lockedReason={maxed ? 'This little ship has four tool spots. Take one off first.' : undefined} impact={{ mass: `Adds ${instrument.massKg} kg.`, power: `Uses ${instrument.powerW} W while collecting science.`, cost: `Adds $${instrument.costM}M.`, data: `Models ${instrument.dataGb} GB of science data and adds ${instrument.sciencePoints} science points before fit penalties.`, lifetime: 'No direct change, but the instrument adds power demand.' }}><button className={`instrument-choice ${selected ? 'instrument-selected' : ''} ${maxed ? 'instrument-disabled' : ''}`} onClick={() => toggleInstrument(instrument.id)} aria-pressed={selected} disabled={maxed}>
          <span className="instrument-top"><strong>{instrument.shortName}</strong><span className="instrument-check">{selected ? <Check aria-hidden="true" /> : <span />}</span></span>
          <span className="instrument-description">{instrument.description}</span>
          <span className="instrument-output"><span>{selected ? 'On our ship' : 'Tap to add this tool'}</span></span>
        </button></ChoiceWithWhy>
      })}</div></RoleControlledChoices>
      <div className="instrument-note"><Zap aria-hidden="true" /> Choose a tool that helps answer our planet&apos;s big question.</div>
    </div>
  </div>
}

function LaunchSegment({ mission, size, configuration, onChange, activeRole, canEditRole, rocketAppearance, onRocketAppearanceChange, progression, sandboxEnabled, threeDEnabled }: { mission: MissionProfile; size: SpacecraftSize; configuration: MissionConfiguration; onChange: (patch: Partial<MissionConfiguration>) => void; activeRole: TeamRoleId; canEditRole: (role: TeamRoleId) => boolean; rocketAppearance: RocketAppearance; onRocketAppearanceChange: (patch: Partial<RocketAppearance>) => void; progression: MissionProgression; sandboxEnabled: boolean; threeDEnabled: boolean }) {
  const currentRocket = getRocket(configuration.rocketId)
  return <div className="segment-content">
    <div className="segment-intro"><span className="segment-overline"><span>STEP 4 · PICK A ROCKET</span><i /> {mission.name.toUpperCase()}</span><h2>Which rocket will take us?</h2><p>Pick a rocket that can reach our planet and carry our ship.</p></div>
    <div id="rocket-customizer"><RoleControlledChoices role="designer" activeRole={activeRole} canEdit={canEditRole('designer')}><MissionRocketCustomizer configuration={configuration} appearance={rocketAppearance} onAppearanceChange={onRocketAppearanceChange} unlockedPaints={progression.unlockedPaints} unlockedMissionPatches={progression.unlockedMissionPatches} threeDEnabled={threeDEnabled} /></RoleControlledChoices></div>
    <div className="launch-subheading"><span>ROCKETS</span><small>Red X means this rocket cannot reach your planet.</small></div>
    <RoleControlledChoices role="designer" activeRole={activeRole} canEdit={canEditRole('designer')}><div className="rocket-choice-grid">{ROCKETS.map((rocket) => {
      const selected = configuration.rocketId === rocket.id
      const reachesTarget = (rocket.orbitIds as readonly string[]).includes(mission.targetOrbit)
      const restricted = !sandboxEnabled && (rocket.id === 'rideshare' && size.family !== 'cubesat' || !reachesTarget)
      const restrictionReason = rocket.id === 'rideshare' && size.family !== 'cubesat'
        ? 'This shared rocket is for tiny ships. Pick a bigger rocket.'
        : `${rocket.name} cannot reach ${mission.name}. Try a bigger rocket.`
      return <ChoiceWithWhy key={rocket.id} className="rocket-choice-wrap" lockedReason={restricted ? restrictionReason : undefined} impact={{ mass: 'Does not change spacecraft mass; it sets the payload limit.', power: 'No direct power change.', cost: `Launch estimate: $${rocket.costM.toLocaleString()}M.`, data: `Can reach ${rocket.orbitIds.map((orbitId) => orbitId.toUpperCase()).join(', ')}.`, lifetime: 'No direct change to mission life.' }}><button className={`rocket-choice ${selected ? 'rocket-selected' : ''} ${!reachesTarget ? 'rocket-cannot-reach' : ''}`} onClick={() => onChange({ rocketId: rocket.id })} aria-pressed={selected} disabled={restricted}>
        <span className="rocket-choice-top"><span className="rocket-symbol"><Rocket aria-hidden="true" /></span>{selected && <Check aria-hidden="true" />}</span>
        <strong>{rocket.name}</strong><span className="rocket-type">{rocket.maker}</span>
        <span className="rocket-can-go"><small>CAN GO TO</small>{DESTINATIONS.map(({ label, orbits, Icon }) => {
          const canReach = rocket.orbitIds.some((orbitId) => orbits.includes(orbitId))
          return <span className={`rocket-destination ${canReach ? 'destination-yes' : 'destination-no'}`} key={label} title={`${label}: ${canReach ? 'can reach' : 'cannot reach'}`}><Icon aria-hidden="true" />{canReach ? '✓' : '×'}</span>
        })}</span>
        <span className="rocket-reach">{restricted ? restrictionReason : `Ready to visit ${mission.name}.`}</span>
      </button></ChoiceWithWhy>
    })}</div></RoleControlledChoices>
    <p className="rocket-destination-summary"><Target aria-hidden="true" /> Our ship will explore {mission.name}. <NasaTag /></p>
    <details className="orbit-extra">
      <summary>Choose a different path around the planet</summary>
      <RoleControlledChoices role="designer" activeRole={activeRole} canEdit={canEditRole('designer')}><div className="orbit-choice-grid">{ORBITS.map((orbit) => {
      const selected = configuration.orbitId === orbit.id
      const reachable = (currentRocket.orbitIds as readonly string[]).includes(orbit.id)
      return <ChoiceWithWhy key={orbit.id} className="orbit-choice-wrap" lockedReason={!reachable ? `${currentRocket.name} cannot reach ${orbit.name}. Select a launch vehicle with the right range.` : undefined} impact={{ mass: 'No direct change to spacecraft mass.', power: 'Orbit can change the operating environment, not the selected power hardware.', cost: 'No direct change in this simplified model.', data: `Changes modeled data by an orbit factor of ${orbit.dataFactor}.`, lifetime: `Models about ${orbit.lifetimeYears} years before battery and solar bonuses.` }}><button className={`orbit-choice ${selected ? 'orbit-selected' : ''} ${!reachable ? 'orbit-unreachable' : ''}`} onClick={() => onChange({ orbitId: orbit.id })} aria-pressed={selected} disabled={!reachable}>
        <span className="orbit-choice-top"><Orbit aria-hidden="true" /><span>{selected && <Check aria-hidden="true" />}</span></span>
        <strong>{orbit.name}</strong><span className="orbit-altitude">{orbit.id === 'mars' ? 'Around Mars' : orbit.id === 'lunar' ? 'Around the Moon' : 'Around Earth'}</span><span className="orbit-description">{orbit.id === mission.targetOrbit ? 'A good path for our mission.' : 'A different path changes what we can learn.'}</span>
        {!reachable && <span className="orbit-unreachable-label">TRY A BIGGER ROCKET</span>}
        {orbit.id === mission.targetOrbit && <span className="orbit-fit-label">MISSION PATH</span>}
      </button></ChoiceWithWhy>
      })}</div></RoleControlledChoices>
    </details>
  </div>
}

function GroundSegment({ configuration, onChange, activeRole, canEditRole }: { configuration: MissionConfiguration; onChange: (patch: Partial<MissionConfiguration>) => void; activeRole: TeamRoleId; canEditRole: (role: TeamRoleId) => boolean }) {
  return <div className="segment-content">
    <div className="segment-intro"><span className="segment-overline"><span>STEP 5 · MESSAGES HOME</span><i /> GROUND STATIONS</span><h2>How will we send discoveries?</h2><p>Stations listen for our ship and send its science to Earth.</p></div>
    <div className="ground-network-visual"><div className="network-orbit network-orbit-a" /><div className="network-orbit network-orbit-b" /><span className="network-satellite"><Satellite aria-hidden="true" /></span><span className="network-earth"><span /></span><span className="network-station station-a"><RadioTower aria-hidden="true" /></span><span className="network-station station-b"><RadioTower aria-hidden="true" /></span><span className="network-station station-c"><RadioTower aria-hidden="true" /></span><span className="network-signal signal-a" /><span className="network-signal signal-b" /><span className="network-signal signal-c" /><span className="network-visual-label">MESSAGES HOME</span></div>
    <div className="ground-choice-heading"><div><span className="eyebrow">SPACE MESSAGE STATIONS</span><h3>How many should listen?</h3></div><span className="ground-note">More stations mean more chances to send science.</span></div>
    <RoleControlledChoices role="communications" activeRole={activeRole} canEdit={canEditRole('communications')}><div className="station-choice-grid">{[1, 2, 3].map((stations) => {
      const selected = configuration.stations === stations
      return <ChoiceWithWhy key={stations} className="station-choice-wrap" impact={{ mass: 'No spacecraft mass change.', power: 'No direct spacecraft power change.', cost: `Costs $${stations * 2}M in the game model.`, data: `Adds a ×${(0.7 + stations * 0.25).toFixed(2)} coverage factor to data return.`, lifetime: 'No direct change to mission life.' }}><button className={`station-choice ${selected ? 'station-selected' : ''}`} onClick={() => onChange({ stations })} aria-pressed={selected}>
        <span className="station-count">0{stations}<small>{stations === 1 ? 'STATION' : 'STATIONS'}</small></span><span className="station-map">{Array.from({ length: stations }).map((_, index) => <RadioTower key={index} aria-hidden="true" />)}</span>
        <span className="station-copy"><b>{stations === 1 ? 'One listener' : stations === 2 ? 'Two listeners' : 'Listeners everywhere'}</b><small>{stations === 1 ? 'One chance to send messages.' : stations === 2 ? 'More chances to say hello.' : 'The best chance to send everything.'}</small></span>
        <span className="station-select">{selected ? <><Check aria-hidden="true" /> PICKED</> : 'PICK THESE'}</span>
      </button></ChoiceWithWhy>
    })}</div></RoleControlledChoices>
    <div className="ground-brief"><span className="brief-icon"><Waves aria-hidden="true" /></span><p><b>Messages home</b><br />More listeners give our ship more chances to share science.</p></div>
  </div>
}

function UserSegment({ configuration, onChange, activeRole, canEditRole }: { configuration: MissionConfiguration; onChange: (patch: Partial<MissionConfiguration>) => void; activeRole: TeamRoleId; canEditRole: (role: TeamRoleId) => boolean }) {
  return <section className="user-segment-panel" aria-labelledby="user-segment-title">
    <div className="user-segment-intro"><span className="user-segment-icon"><UsersRound aria-hidden="true" /></span><div><span className="segment-overline"><span>SHARE OUR DISCOVERIES</span></span><h2 id="user-segment-title">Who should see our science?</h2><p>Choose who gets to learn from our mission.</p></div></div>
    <RoleControlledChoices role="communications" activeRole={activeRole} canEdit={canEditRole('communications')}><div className="user-product-grid">{USER_PRODUCTS.map((product) => {
      const selected = configuration.userId === product.id
      const kidName = product.id === 'research' ? 'Science teams' : product.id === 'alerts' ? 'Space helpers' : 'Everyone'
      return <ChoiceWithWhy key={product.id} className="user-product-choice-wrap" impact={{ mass: 'No spacecraft mass change.', power: 'No spacecraft power change.', cost: `Adds $${product.costM}M for the data product.`, data: `Does not change collected data; adds ${product.scienceBonus} mission score.`, lifetime: 'No direct change to mission life.' }}><button className={`user-product-choice ${selected ? 'user-product-selected' : ''}`} onClick={() => onChange({ userId: product.id })} aria-pressed={selected}>
        <span className="user-product-head"><strong>{kidName}</strong>{selected && <Check aria-hidden="true" />}</span><span>{product.id === 'research' ? 'Help scientists learn.' : product.id === 'alerts' ? 'Help space teams act fast.' : 'Let the whole world explore.'}</span><small>Share with {product.audience.toLowerCase()}</small><b className="user-product-cost">{selected ? 'Picked for our mission' : 'Tap to choose'}</b>
      </button></ChoiceWithWhy>
    })}</div></RoleControlledChoices>
  </section>
}

function RoleControlledChoices({ role, activeRole, canEdit, children }: { role: TeamRoleId; activeRole: TeamRoleId; canEdit: boolean; children: ReactNode }) {
  const roleInfo = TEAM_ROLES.find((item) => item.id === role) ?? TEAM_ROLES[0]
  return <div className={`role-controlled-choices ${canEdit ? '' : 'role-choices-locked'}`}>
    {!canEdit && <p className="role-locked-note" role="note">{roleInfo.kidLabel} gets to pick these parts. Switch roles to change them.</p>}
    <fieldset disabled={!canEdit} aria-label={`${roleInfo.name} choices`}><legend>{roleInfo.kidLabel} · {roleInfo.name}</legend>{children}</fieldset>
  </div>
}
