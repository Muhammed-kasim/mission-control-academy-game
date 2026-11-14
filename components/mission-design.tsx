'use client'

import { useState } from 'react'
import { ArrowUpRight, BatteryCharging, Check, ChevronRight, CircleGauge, Disc3, Orbit, RadioTower, Rocket, Satellite, Sun, Target, UsersRound, Waves, Zap } from 'lucide-react'
import type { DesignTab, MissionCheck, MissionConfiguration, MissionEstimate, MissionProfile, SpacecraftSize } from './mission-data'
import { getAntennaOptions, getBatteryOptions, getOrbit, getRocket, getSolarOptions, getUserProduct, INSTRUMENTS, ORBITS, ROCKETS, USER_PRODUCTS } from './mission-data'
import { DataNote, NasaTag, PageHeading, PrimaryButton, SegmentPill } from './mission-ui'
import { MissionEquipmentList } from './mission-equipment-list'

export function MissionDesign({ mission, size, configuration, estimate, checks, onChange, onBack, onVerify }: {
  mission: MissionProfile
  size: SpacecraftSize
  configuration: MissionConfiguration
  estimate: MissionEstimate
  checks: MissionCheck[]
  onChange: (patch: Partial<MissionConfiguration>) => void
  onBack: () => void
  onVerify: () => void
}) {
  const [activeTab, setActiveTab] = useState<DesignTab>('space')
  const tabs: { id: DesignTab; label: string; number: string; Icon: typeof Satellite }[] = [
    { id: 'space', label: 'Space segment', number: '02', Icon: Satellite },
    { id: 'launch', label: 'Launch segment', number: '01', Icon: Orbit },
    { id: 'ground', label: 'Ground segment', number: '03', Icon: RadioTower },
  ]
  const failedCount = checks.filter((check) => !check.passed).length

  return <main className="flow-screen design-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Back to mission targets</button>
    <PageHeading eyebrow="04 — MISSION ARCHITECTURE" title="Build your spacecraft." description="Shape each mission segment. Your telemetry and equipment list update with every selection." icon={<CircleGauge aria-hidden="true" />} />
    <div className="design-segment-rail" aria-label="Four mission segments">
      <SegmentPill label="Launch" icon="launch" active={activeTab === 'launch'} /><ChevronRight aria-hidden="true" />
      <SegmentPill label="Space" icon="space" active={activeTab === 'space'} /><ChevronRight aria-hidden="true" />
      <SegmentPill label="Ground" icon="ground" active={activeTab === 'ground'} /><ChevronRight aria-hidden="true" />
      <SegmentPill label="User" icon="user" active />
    </div>
    <div className="design-tabbar" role="tablist" aria-label="Mission design segments">
      {tabs.map(({ id, label, number, Icon }) => <button role="tab" aria-selected={activeTab === id} aria-controls="design-tab-panel" id={`tab-${id}`} className={`design-tab ${activeTab === id ? 'design-tab-active' : ''}`} key={id} onClick={() => setActiveTab(id)}>
        <span className="tab-number">{number}</span><Icon aria-hidden="true" /><span>{label}</span><span className="tab-arrow"><ArrowUpRight aria-hidden="true" /></span>
      </button>)}
    </div>
    <div className="design-layout">
      <section className="design-main-panel" id="design-tab-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'space' && <SpaceSegment mission={mission} size={size} configuration={configuration} onChange={onChange} />}
        {activeTab === 'launch' && <LaunchSegment mission={mission} size={size} configuration={configuration} onChange={onChange} />}
        {activeTab === 'ground' && <GroundSegment configuration={configuration} onChange={onChange} />}
      </section>
      <aside className="design-equipment-panel">
        <div className="equipment-panel-top"><div><span className="eyebrow">SPACECRAFT INVENTORY</span><h2>Master Equipment List</h2></div><span className="inventory-live"><i /> LIVE</span></div>
        <p className="equipment-intro">Every installed part, with its total mass, power demand, and game-scale cost.</p>
        <MissionEquipmentList size={size} configuration={configuration} estimate={estimate} />
        <div className="support-cost-box"><span className="support-cost-head"><span>MISSION SUPPORT</span><NasaTag /></span>
          <div><span><Rocket aria-hidden="true" />{getRocket(configuration.rocketId).name}</span><b>${getRocket(configuration.rocketId).costM.toLocaleString()}M</b></div>
          <div><span><RadioTower aria-hidden="true" />{configuration.stations} ground {configuration.stations === 1 ? 'station' : 'stations'}</span><b>${(configuration.stations * 2).toLocaleString()}M</b></div>
          <div><span><UsersRound aria-hidden="true" />{getUserProduct(configuration.userId).name}</span><b>${getUserProduct(configuration.userId).costM}M</b></div>
          <div><span>Operations &amp; mission support</span><b>${size.operationsCostM.toLocaleString()}M</b></div>
          <div className="support-total"><span>Total mission estimate</span><b>${estimate.totalCostM.toLocaleString()}M</b></div>
        </div>
      </aside>
    </div>
    <UserSegment configuration={configuration} onChange={onChange} />
    <div className="design-actions"><div className={`design-check-count ${failedCount ? 'check-count-alert' : ''}`}><span className="check-count-dot" />{failedCount ? `${failedCount} checks need attention` : 'All current checks are passing'}</div><div className="design-action-buttons"><PrimaryButton variant="quiet" icon="left" onClick={onBack}>Back</PrimaryButton><PrimaryButton onClick={onVerify}>Build &amp; verify</PrimaryButton></div></div>
    <DataNote />
  </main>
}

function SpaceSegment({ mission, size, configuration, onChange }: { mission: MissionProfile; size: SpacecraftSize; configuration: MissionConfiguration; onChange: (patch: Partial<MissionConfiguration>) => void }) {
  const solarChoices = getSolarOptions(size)
  const batteryChoices = getBatteryOptions(size)
  const antennaChoices = getAntennaOptions(size)
  const toggleInstrument = (id: string) => {
    const current = configuration.instrumentIds
    if (current.includes(id)) onChange({ instrumentIds: current.filter((item) => item !== id) })
    else if (current.length < 4) onChange({ instrumentIds: [...current, id] })
  }
  return <div className="segment-content">
    <div className="segment-intro"><span className="segment-overline"><span>SEGMENT 02</span><i /> SPACECRAFT SYSTEMS</span><h2>What goes into orbit?</h2><p>Choose the power, communications, and science equipment your platform can carry.</p></div>
    <div className="option-group">
      <div className="option-group-heading"><span className="equipment-icon solar-icon"><Sun aria-hidden="true" /></span><span><strong>Solar array</strong><small>Generates power in orbit</small></span><span className="group-hint">SELECT ONE</span></div>
      <div className="equipment-choice-grid">{solarChoices.map((option) => <button key={option.id} className={`equipment-choice ${configuration.solarId === option.id ? 'equipment-selected' : ''}`} onClick={() => onChange({ solarId: option.id })} aria-pressed={configuration.solarId === option.id}>
        <span className="choice-top"><span className="choice-name">{option.name}</span>{configuration.solarId === option.id && <Check aria-hidden="true" />}</span><span className="choice-desc">{option.description}</span><span className="choice-data"><b>{option.watts} W</b> output <i>·</i> {option.massKg} kg</span><span className="choice-footer"><NasaTag /><b>${option.costM}M</b></span>
      </button>)}</div>
    </div>
    <div className="option-group option-group-separated">
      <div className="option-group-heading"><span className="equipment-icon battery-icon"><BatteryCharging aria-hidden="true" /></span><span><strong>Battery</strong><small>Stores energy for eclipse periods</small></span><span className="group-hint">SELECT ONE</span></div>
      <div className="equipment-choice-grid">{batteryChoices.map((option) => <button key={option.id} className={`equipment-choice ${configuration.batteryId === option.id ? 'equipment-selected' : ''}`} onClick={() => onChange({ batteryId: option.id })} aria-pressed={configuration.batteryId === option.id}>
        <span className="choice-top"><span className="choice-name">{option.name}</span>{configuration.batteryId === option.id && <Check aria-hidden="true" />}</span><span className="choice-desc">{option.description}</span><span className="choice-data"><b>{option.wattHours} Wh</b> capacity <i>·</i> {option.massKg} kg</span><span className="choice-footer"><NasaTag /><b>${option.costM}M</b></span>
      </button>)}</div>
    </div>
    <div className="option-group option-group-separated">
      <div className="option-group-heading"><span className="equipment-icon antenna-icon"><Waves aria-hidden="true" /></span><span><strong>Communications antenna</strong><small>Sends science data back to Earth</small></span><span className="group-hint">SELECT ONE</span></div>
      <div className="equipment-choice-grid">{antennaChoices.map((option) => <button key={option.id} className={`equipment-choice ${configuration.antennaId === option.id ? 'equipment-selected' : ''}`} onClick={() => onChange({ antennaId: option.id })} aria-pressed={configuration.antennaId === option.id}>
        <span className="choice-top"><span className="choice-name">{option.name}</span>{configuration.antennaId === option.id && <Check aria-hidden="true" />}</span><span className="choice-desc">{option.description}</span><span className="choice-data"><b>{option.gbPerDay} GB/day</b> link <i>·</i> {option.massKg} kg</span><span className="choice-footer"><NasaTag /><b>${option.costM}M</b></span>
      </button>)}</div>
    </div>
    <div className="option-group option-group-separated">
      <div className="option-group-heading instrument-heading"><span className="equipment-icon instrument-icon"><Disc3 aria-hidden="true" /></span><span><strong>Science instruments</strong><small>Pick up to four for the {mission.name.toLowerCase()}.</small></span><span className="instrument-limit">{configuration.instrumentIds.length} / 4</span></div>
      <div className="instrument-choice-grid">{INSTRUMENTS.map((instrument) => {
        const selected = configuration.instrumentIds.includes(instrument.id)
        const maxed = !selected && configuration.instrumentIds.length >= 4
        return <button key={instrument.id} className={`instrument-choice ${selected ? 'instrument-selected' : ''} ${maxed ? 'instrument-disabled' : ''}`} onClick={() => toggleInstrument(instrument.id)} aria-pressed={selected} disabled={maxed}>
          <span className="instrument-top"><strong>{instrument.shortName}</strong><span className="instrument-check">{selected ? <Check aria-hidden="true" /> : <span />}</span></span>
          <span className="instrument-description">{instrument.description}</span>
          <span className="instrument-stats"><span><b>{instrument.massKg} kg</b> mass</span><span><b>{instrument.powerW} W</b> power</span><span><b>${instrument.costM}M</b></span></span>
          <span className="instrument-output"><span>{instrument.dataLabel} · {instrument.dataGb} GB</span><span>{instrument.sciencePoints} science pts</span></span>
          <span className="instrument-footer"><NasaTag /><span>Inspired by {instrument.nasaReference}</span></span>
        </button>
      })}</div>
      <div className="instrument-note"><Zap aria-hidden="true" /> Payloads affect mass, power, cost, and delivered science data.</div>
    </div>
  </div>
}

function LaunchSegment({ mission, size, configuration, onChange }: { mission: MissionProfile; size: SpacecraftSize; configuration: MissionConfiguration; onChange: (patch: Partial<MissionConfiguration>) => void }) {
  const currentRocket = getRocket(configuration.rocketId)
  return <div className="segment-content">
    <div className="segment-intro"><span className="segment-overline"><span>SEGMENT 01</span><i /> LAUNCH &amp; ORBIT</span><h2>Choose the ride to space.</h2><p>Match launcher capacity and reach to your spacecraft and science destination.</p></div>
    <div className="launch-subheading"><span>01 / LAUNCH VEHICLE</span><small>Max payload · game-scale cost · NASA Data</small></div>
    <div className="rocket-choice-grid">{ROCKETS.map((rocket) => {
      const selected = configuration.rocketId === rocket.id
      const restricted = rocket.id === 'rideshare' && size.family !== 'cubesat'
      return <button key={rocket.id} className={`rocket-choice ${selected ? 'rocket-selected' : ''}`} onClick={() => onChange({ rocketId: rocket.id })} aria-pressed={selected}>
        <span className="rocket-choice-top"><span className="rocket-symbol"><Rocket aria-hidden="true" /></span>{selected && <Check aria-hidden="true" />}</span>
        <strong>{rocket.name}</strong><span className="rocket-type">{rocket.maker}</span><span className="rocket-capacity"><b>{rocket.payloadKg.toLocaleString()} kg</b><small>PAYLOAD CAPACITY</small></span>
        <span className="rocket-cost"><b>${rocket.costM.toLocaleString()}M</b> estimated launch</span><span className="rocket-reach">{rocket.description}</span>
        <span className="rocket-orbits">REACHES {rocket.orbitIds.map((orbitId) => orbitId.toUpperCase()).join(' · ')}</span><NasaTag />
        {restricted && <span className="rocket-nudge">CubeSat-only vehicle</span>}
      </button>
    })}</div>
    <div className="launch-subheading orbit-subheading"><span>02 / MISSION ORBIT</span><small>Destination science orbit · NASA Data</small></div>
    <div className="orbit-choice-grid">{ORBITS.map((orbit) => {
      const selected = configuration.orbitId === orbit.id
      const reachable = (currentRocket.orbitIds as readonly string[]).includes(orbit.id)
      return <button key={orbit.id} className={`orbit-choice ${selected ? 'orbit-selected' : ''} ${!reachable ? 'orbit-unreachable' : ''}`} onClick={() => onChange({ orbitId: orbit.id })} aria-pressed={selected}>
        <span className="orbit-choice-top"><Orbit aria-hidden="true" /><span>{selected && <Check aria-hidden="true" />}</span></span>
        <strong>{orbit.name}</strong><span className="orbit-altitude">{orbit.altitude}</span><span className="orbit-description">{orbit.detail}</span>
        <span className="orbit-life">MODELED LIFE <b>{orbit.lifetimeYears} yr</b></span><span className="orbit-source"><NasaTag /><small>{orbit.nasaReference}</small></span>
        {!reachable && <span className="orbit-unreachable-label">NOT IN {currentRocket.name.toUpperCase()} REACH</span>}
        {orbit.id === mission.targetOrbit && <span className="orbit-fit-label">MISSION TARGET</span>}
      </button>
    })}</div>
    <div className="orbit-reminder"><Target aria-hidden="true" /><span><b>Destination target:</b> {mission.name} is designed for {getOrbit(mission.targetOrbit).name}. The live warning will flag incompatible rocket-orbit combinations.</span></div>
  </div>
}

function GroundSegment({ configuration, onChange }: { configuration: MissionConfiguration; onChange: (patch: Partial<MissionConfiguration>) => void }) {
  return <div className="segment-content">
    <div className="segment-intro"><span className="segment-overline"><span>SEGMENT 03</span><i /> GROUND NETWORK</span><h2>Bring the science home.</h2><p>Ground stations receive spacecraft signals and help route data to the people who need it.</p></div>
    <div className="ground-network-visual"><div className="network-orbit network-orbit-a" /><div className="network-orbit network-orbit-b" /><span className="network-satellite"><Satellite aria-hidden="true" /></span><span className="network-earth"><span /></span><span className="network-station station-a"><RadioTower aria-hidden="true" /></span><span className="network-station station-b"><RadioTower aria-hidden="true" /></span><span className="network-station station-c"><RadioTower aria-hidden="true" /></span><span className="network-signal signal-a" /><span className="network-signal signal-b" /><span className="network-signal signal-c" /><span className="network-visual-label">DEEP SPACE NETWORK<br /><b>GROUND SEGMENT</b></span></div>
    <div className="ground-choice-heading"><div><span className="eyebrow">GROUND STATION NETWORK</span><h3>How many stations?</h3></div><span className="ground-note">More stations improve coverage and daily data return.</span></div>
    <div className="station-choice-grid">{[1, 2, 3].map((stations) => {
      const selected = configuration.stations === stations
      const capacity = Math.round((0.7 + stations * 0.25) * 100)
      return <button key={stations} className={`station-choice ${selected ? 'station-selected' : ''}`} onClick={() => onChange({ stations })} aria-pressed={selected}>
        <span className="station-count">0{stations}<small>{stations === 1 ? 'STATION' : 'STATIONS'}</small></span><span className="station-map">{Array.from({ length: stations }).map((_, index) => <RadioTower key={index} aria-hidden="true" />)}</span>
        <span className="station-copy"><b>{stations === 1 ? 'Single station' : stations === 2 ? 'Regional network' : 'Global network'}</b><small>{stations === 1 ? 'One downlink window per pass.' : stations === 2 ? 'More frequent contact opportunities.' : 'Best coverage across the globe.'}</small></span>
        <span className="station-stats"><span><b>×{(0.7 + stations * 0.25).toFixed(2)}</b> coverage</span><span><b>${stations * 2}M</b> cost</span></span>
        <span className="station-select">{selected ? <><Check aria-hidden="true" /> SELECTED</> : 'SELECT NETWORK'}</span><NasaTag />
      </button>
    })}</div>
    <div className="ground-brief"><span className="brief-icon"><Waves aria-hidden="true" /></span><p><b>How the ground segment helps</b><br />Stations add communication windows. Your network size affects data delivery, link capacity, and total mission cost.</p></div>
  </div>
}

function UserSegment({ configuration, onChange }: { configuration: MissionConfiguration; onChange: (patch: Partial<MissionConfiguration>) => void }) {
  return <section className="user-segment-panel" aria-labelledby="user-segment-title">
    <div className="user-segment-intro"><span className="user-segment-icon"><UsersRound aria-hidden="true" /></span><div><span className="segment-overline"><span>SEGMENT 04</span><i /> SCIENCE USERS</span><h2 id="user-segment-title">Who needs the data?</h2><p>Pick a product so the mission has a clear path from signal to insight.</p></div><NasaTag /></div>
    <div className="user-product-grid">{USER_PRODUCTS.map((product) => {
      const selected = configuration.userId === product.id
      return <button key={product.id} className={`user-product-choice ${selected ? 'user-product-selected' : ''}`} onClick={() => onChange({ userId: product.id })} aria-pressed={selected}>
        <span className="user-product-head"><strong>{product.name}</strong>{selected && <Check aria-hidden="true" />}</span><span>{product.description}</span><small>FOR {product.audience.toUpperCase()}</small><b className="user-product-cost">${product.costM}M · +{product.scienceBonus} mission score</b>
      </button>
    })}</div>
  </section>
}
