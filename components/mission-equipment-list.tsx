'use client'

import { BatteryCharging, CircuitBoard, Satellite, Sun, Waves } from 'lucide-react'
import type { MissionConfiguration, MissionEstimate, SpacecraftSize } from './mission-data'
import { formatMass, formatMoney, getAntennaOptions, getBatteryOptions, getSolarOptions, INSTRUMENTS } from './mission-data'

interface EquipmentRow {
  id: string
  name: string
  kind: string
  massKg: number
  powerW: number
  costM: number
  Icon: typeof Satellite
}

export function MissionEquipmentList({ size, configuration, estimate }: { size: SpacecraftSize; configuration: MissionConfiguration; estimate: MissionEstimate }) {
  const solar = getSolarOptions(size).find((option) => option.id === configuration.solarId) ?? getSolarOptions(size)[0]
  const battery = getBatteryOptions(size).find((option) => option.id === configuration.batteryId) ?? getBatteryOptions(size)[0]
  const antenna = getAntennaOptions(size).find((option) => option.id === configuration.antennaId) ?? getAntennaOptions(size)[0]
  const instruments = INSTRUMENTS.filter((instrument) => configuration.instrumentIds.includes(instrument.id))
  const rows: EquipmentRow[] = [
    { id: 'bus', name: 'Spacecraft bus', kind: 'Platform', massKg: size.busMassKg, powerW: size.busPowerW, costM: size.busCostM, Icon: CircuitBoard },
    { id: 'solar', name: solar.name, kind: 'Power', massKg: solar.massKg, powerW: solar.powerW, costM: solar.costM, Icon: Sun },
    { id: 'battery', name: battery.name, kind: 'Energy', massKg: battery.massKg, powerW: 0, costM: battery.costM, Icon: BatteryCharging },
    { id: 'antenna', name: antenna.name, kind: 'Comms', massKg: antenna.massKg, powerW: antenna.powerW, costM: antenna.costM, Icon: Waves },
    ...instruments.map((instrument) => ({ id: instrument.id, name: instrument.shortName, kind: 'Science', massKg: instrument.massKg, powerW: instrument.powerW, costM: instrument.costM, Icon: Satellite })),
  ]

  return <div className="equipment-table-wrap"><table className="equipment-table"><thead><tr><th>PART</th><th>MASS</th><th>POWER</th></tr></thead><tbody>
    {rows.map(({ id, name, kind, massKg, powerW, costM, Icon }) => <tr key={id}><td><span className="equipment-row-icon"><Icon aria-hidden="true" /></span><span className="equipment-row-name"><b>{name}</b><small>{kind} · {formatMoney(costM)}</small></span></td><td>{formatMass(massKg)}</td><td>{powerW} W</td></tr>)}
  </tbody><tfoot><tr><th>TOTAL</th><th>{formatMass(estimate.spacecraftMassKg)}</th><th>{Math.round(estimate.powerDemandW)} W</th></tr></tfoot></table>
  </div>
}
