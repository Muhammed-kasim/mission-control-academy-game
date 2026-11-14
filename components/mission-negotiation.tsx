'use client'

import { useMemo, useState } from 'react'
import { BadgeCheck, BatteryCharging, Check, CircleAlert, RadioTower, Satellite, Sparkles, Wrench } from 'lucide-react'
import type { MissionConfiguration, MissionEstimate, SpacecraftSize } from './mission-data'
import { getAntennaOptions, getInstrument, getSolarOptions } from './mission-data'
import { PageHeading, PrimaryButton } from './mission-ui'
import { getRoleOwner, TEAM_ROLES, TeamModeBar, type PlayMode, type TeamRoleId } from './team-mode'

interface NegotiationProposal {
  id: string
  title: string
  detail: string
  patch: Partial<MissionConfiguration>
  roles: TeamRoleId[]
  Icon: typeof Satellite
}

export function MissionNegotiationScreen({ configuration, estimate, size, mode, playerCount, activePlayer, activeRole, onPlayerChange, onRoleChange, onApplyFix, onContinue, onBack }: {
  configuration: MissionConfiguration
  estimate: MissionEstimate
  size: SpacecraftSize
  mode: PlayMode
  playerCount: number
  activePlayer: number
  activeRole: TeamRoleId
  onPlayerChange: (player: number) => void
  onRoleChange: (role: TeamRoleId) => void
  onApplyFix: (patch: Partial<MissionConfiguration>) => void
  onContinue: (coordinationEarned: boolean) => void
  onBack: () => void
}) {
  const hasPowerConflict = estimate.powerDemandW > estimate.powerAvailableW
  const proposals = useMemo(() => {
    if (!hasPowerConflict) return []
    const currentSolar = getSolarOptions(size).find((option) => option.id === configuration.solarId) ?? getSolarOptions(size)[0]
    const nextSolar = getSolarOptions(size).find((option) => option.watts! > currentSolar.watts! && estimate.powerAvailableW + option.watts! - currentSolar.watts! >= estimate.powerDemandW)
    const antennaChoices = getAntennaOptions(size)
    const currentAntennaIndex = antennaChoices.findIndex((option) => option.id === configuration.antennaId)
    const currentAntenna = antennaChoices[currentAntennaIndex] ?? antennaChoices[0]
    const lowerPowerAntenna = currentAntennaIndex > 0 ? antennaChoices[currentAntennaIndex - 1] : undefined
    const highestPowerInstrument = configuration.instrumentIds
      .map(getInstrument)
      .filter((instrument): instrument is NonNullable<typeof instrument> => Boolean(instrument))
      .sort((left, right) => right.powerW - left.powerW)[0]
    const fixes: NegotiationProposal[] = []
    if (nextSolar) fixes.push({
      id: 'upgrade-solar',
      title: `Upgrade to ${nextSolar.name}`,
      detail: `Spacecraft Engineering adds ${Math.round(nextSolar.watts! - currentSolar.watts!)} W so Science can keep its current instrument suite.`,
      patch: { solarId: nextSolar.id },
      roles: ['engineer', 'science'],
      Icon: BatteryCharging,
    })
    if (highestPowerInstrument && estimate.powerDemandW - highestPowerInstrument.powerW <= estimate.powerAvailableW) fixes.push({
      id: 'remove-instrument',
      title: `Remove ${highestPowerInstrument.shortName}`,
      detail: `Science trims its highest-draw instrument (${highestPowerInstrument.powerW} W); Engineering keeps the current power system.`,
      patch: { instrumentIds: configuration.instrumentIds.filter((id) => id !== highestPowerInstrument.id) },
      roles: ['science', 'engineer'],
      Icon: Sparkles,
    })
    if (lowerPowerAntenna && estimate.powerDemandW - currentAntenna.powerW + lowerPowerAntenna.powerW <= estimate.powerAvailableW) fixes.push({
      id: 'lower-power-antenna',
      title: `Use ${lowerPowerAntenna.name}`,
      detail: `Communications reduces transmit draw by ${Math.round((getAntennaOptions(size)[currentAntennaIndex].powerW) - lowerPowerAntenna.powerW)} W; downlink capacity will also change.`,
      patch: { antennaId: lowerPowerAntenna.id },
      roles: ['communications', 'engineer'],
      Icon: RadioTower,
    })
    if (!fixes.length) {
      const maxSolar = getSolarOptions(size).reduce((largest, option) => option.watts! > largest.watts! ? option : largest)
      const remainingInstruments = configuration.instrumentIds
        .map(getInstrument)
        .filter((instrument): instrument is NonNullable<typeof instrument> => Boolean(instrument))
        .sort((left, right) => right.powerW - left.powerW)
      let projectedDemand = estimate.powerDemandW
      while (projectedDemand > estimate.powerAvailableW + maxSolar.watts! - currentSolar.watts! && remainingInstruments.length) {
        projectedDemand -= remainingInstruments.shift()?.powerW ?? 0
      }
      if (projectedDemand <= estimate.powerAvailableW + maxSolar.watts! - currentSolar.watts!) {
        const keptInstrumentIds = configuration.instrumentIds.filter((id) => remainingInstruments.some((instrument) => instrument.id === id))
        fixes.push({
          id: 'combined-power-fix',
          title: 'Upgrade power and trim the payload',
          detail: `Engineering selects ${maxSolar.name}; Science removes the highest-draw instruments until the remaining design has enough power.`,
          patch: { solarId: maxSolar.id, instrumentIds: keptInstrumentIds },
          roles: ['engineer', 'science'],
          Icon: Wrench,
        })
      }
    }
    return fixes
  }, [configuration.antennaId, configuration.instrumentIds, configuration.solarId, estimate.powerAvailableW, estimate.powerDemandW, hasPowerConflict, size])

  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [approvedRoles, setApprovedRoles] = useState<TeamRoleId[]>([])
  const [consensusNotice, setConsensusNotice] = useState('')
  const selectedProposal = proposals.find((proposal) => proposal.id === selectedProposalId) ?? proposals[0]
  const requiredRoles = selectedProposal?.roles ?? TEAM_ROLES.map((role) => role.id)
  const allApproved = (!hasPowerConflict || Boolean(selectedProposal)) && requiredRoles.every((roleId) => approvedRoles.includes(roleId))
  const nextRequiredRole = requiredRoles.find((roleId) => !approvedRoles.includes(roleId))
  const canApproveActiveRole = requiredRoles.includes(activeRole) && (mode !== 'team' || playerCount === 1 || getRoleOwner(activeRole, playerCount) === activePlayer)
  const activeRoleName = TEAM_ROLES.find((role) => role.id === activeRole)?.name ?? 'Role'
  const nextRequiredRoleInfo = nextRequiredRole ? TEAM_ROLES.find((role) => role.id === nextRequiredRole) : undefined
  const powerDelta = Math.round(estimate.powerDemandW - estimate.powerAvailableW)

  function chooseProposal(proposalId: string) {
    setSelectedProposalId(proposalId)
    setApprovedRoles([])
    setConsensusNotice('')
  }

  function approveActiveRole() {
    if (!canApproveActiveRole) return
    setApprovedRoles((current) => current.includes(activeRole) ? current : [...current, activeRole])
    setConsensusNotice('')
  }

  function completeAgreement() {
    if (!allApproved) {
      if (hasPowerConflict && !selectedProposal) {
        setConsensusNotice('Revise the design to resolve the power conflict before collecting approvals.')
        return
      }
      if (nextRequiredRole && nextRequiredRoleInfo) {
        const owner = mode === 'team' && playerCount > 1 ? getRoleOwner(nextRequiredRole, playerCount) : undefined
        if (owner && owner !== activePlayer) onPlayerChange(owner)
        onRoleChange(nextRequiredRole)
        setConsensusNotice(`${owner ? `Player ${owner}, ` : ''}${nextRequiredRoleInfo.name} is up next. Select “Agree as ${nextRequiredRoleInfo.name}” to record the sign-off.`)
      }
      return
    }
    if (selectedProposal) onApplyFix(selectedProposal.patch)
    onContinue(mode === 'team')
  }

  return <main className="flow-screen negotiation-screen">
    <button className="back-link" onClick={onBack}><span>←</span> Back to design</button>
    <PageHeading eyebrow="CML 2 — TEAM DESIGN REVIEW" title="Resolve the trade-off together." description="Surface a conflict, choose a fix, and collect agreement from the roles affected before moving on." icon={<Sparkles aria-hidden="true" />} />
    <TeamModeBar mode={mode} playerCount={playerCount} activePlayer={activePlayer} activeRole={activeRole} onPlayerChange={(player) => { setConsensusNotice(''); onPlayerChange(player) }} onRoleChange={(role) => { setConsensusNotice(''); onRoleChange(role) }} />
    {hasPowerConflict ? <>
      <section className="negotiation-conflict" role="status">
        <span className="negotiation-conflict-icon"><CircleAlert aria-hidden="true" /></span>
        <div><span className="eyebrow">POWER BALANCE · DESIGN CONFLICT</span><h2>Science wants the instrument. Engineering is short on power.</h2><p>The selected instruments and spacecraft need {Math.round(estimate.powerDemandW)} W, but the array and battery provide {Math.round(estimate.powerAvailableW)} W — a {powerDelta} W shortfall.</p></div>
        <span className="negotiation-delta">−{powerDelta} W</span>
      </section>
      <div className="negotiation-proposal-heading"><span><small className="eyebrow">PROPOSED FIXES</small><h2>What can the team agree to?</h2></span><span>{proposals.length} available</span></div>
      {!proposals.length && <p className="negotiation-no-fix">No modeled single-step fix can resolve this power conflict. Revise the design before returning to team review.</p>}
      <div className="negotiation-proposals">{proposals.map((proposal) => {
        const selected = proposal.id === selectedProposal?.id
        return <button type="button" key={proposal.id} className={`negotiation-proposal ${selected ? 'negotiation-proposal-selected' : ''}`} onClick={() => chooseProposal(proposal.id)} aria-pressed={selected}>
          <span className="negotiation-proposal-icon"><proposal.Icon aria-hidden="true" /></span><span><strong>{proposal.title}</strong><small>{proposal.detail}</small><span className="negotiation-proposal-roles">AGREEMENT NEEDED · {proposal.roles.map((roleId) => TEAM_ROLES.find((role) => role.id === roleId)?.shortName.toUpperCase()).join(' + ')}</span></span>{selected && <Check aria-hidden="true" />}
        </button>
      })}</div>
    </> : <section className="negotiation-clear">
      <span><BadgeCheck aria-hidden="true" /></span><div><span className="eyebrow">NO ACTIVE DESIGN CONFLICTS</span><h2>Review the design and confirm team consensus.</h2><p>All four mission roles sign off before the feasibility review. A team agreement earns the coordination bonus.</p></div>
    </section>}
    <section className="negotiation-approvals" aria-label="Role approvals">
      <div className="negotiation-approval-heading"><span><span className="eyebrow">ROLE SIGN-OFF</span><h2>{allApproved ? 'All required roles agree.' : `Waiting for ${nextRequiredRoleInfo?.shortName ?? 'the next role'}.`}</h2></span><span>{approvedRoles.filter((roleId) => requiredRoles.includes(roleId)).length} / {requiredRoles.length} APPROVED</span></div>
      <div className="negotiation-approval-list">{requiredRoles.map((roleId) => {
        const role = TEAM_ROLES.find((item) => item.id === roleId) ?? TEAM_ROLES[0]
        const approved = approvedRoles.includes(roleId)
        const owner = mode === 'team' && playerCount > 1 ? getRoleOwner(roleId, playerCount) : undefined
        const isCurrent = activeRole === roleId && (owner === undefined || activePlayer === owner)
        return <div key={roleId} className={`negotiation-approval ${approved ? 'negotiation-approved' : ''}`} data-role={role.color}>
          <role.Icon aria-hidden="true" /><span><b>{role.name}</b><small>{owner ? `Player ${owner}` : role.scope}</small></span><span className="negotiation-approval-state">{approved ? 'AGREED' : isCurrent ? 'READY TO SIGN' : 'AWAITING ROLE'}</span>
        </div>
      })}</div>
      <div className="negotiation-signoff-actions">
        <p>{canApproveActiveRole ? `Sign off as ${activeRoleName}.` : `Switch to a required role to sign off${mode === 'team' && playerCount > 1 ? ` (currently Player ${getRoleOwner(requiredRoles.find((roleId) => !approvedRoles.includes(roleId)) ?? requiredRoles[0], playerCount)} owns the next role)` : ''}.`}</p>
        <PrimaryButton variant="quiet" onClick={approveActiveRole} disabled={!canApproveActiveRole || approvedRoles.includes(activeRole)}>{approvedRoles.includes(activeRole) ? 'Role approved' : `Agree as ${activeRoleName}`}</PrimaryButton>
      </div>
    </section>
    <div className="negotiation-actions"><button className="back-link" onClick={onBack}><span>←</span> Revise design choices</button><PrimaryButton onClick={completeAgreement} disabled={hasPowerConflict && !selectedProposal}>{allApproved ? selectedProposal ? 'Apply agreed fix & continue' : 'Confirm team consensus' : 'Collect role approvals'}</PrimaryButton></div>
    {consensusNotice && <p className="negotiation-consensus-notice" role="status">{consensusNotice}</p>}
    {mode === 'team' && playerCount > 1 && allApproved && <p className="negotiation-bonus-note"><BadgeCheck aria-hidden="true" /> Team agreement recorded. The mission score can earn a 5-point coordination bonus.</p>}
  </main>
}
