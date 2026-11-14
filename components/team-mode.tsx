'use client'

import { BadgeCheck, RadioTower, Satellite, Sparkles, Wrench } from 'lucide-react'

export type PlayMode = 'solo' | 'team'
export type TeamRoleId = 'designer' | 'engineer' | 'communications' | 'science'

export const TEAM_ROLES: { id: TeamRoleId; name: string; kidLabel: string; shortName: string; scope: string; kidScope: string; color: string; Icon: typeof Satellite }[] = [
  { id: 'designer', name: 'Mission Designer', kidLabel: 'Ship picker', shortName: 'Ship', scope: 'Orbit & launch', kidScope: 'Planet and rocket', color: 'mint', Icon: Satellite },
  { id: 'engineer', name: 'Spacecraft Engineer', kidLabel: 'Power fixer', shortName: 'Power', scope: 'Power & parts', kidScope: 'Power and parts', color: 'blue', Icon: Wrench },
  { id: 'communications', name: 'Communications & Ground Officer', kidLabel: 'Messages helper', shortName: 'Messages', scope: 'Antenna, stations & users', kidScope: 'Signal and stations', color: 'amber', Icon: RadioTower },
  { id: 'science', name: 'Science Lead', kidLabel: 'Science finder', shortName: 'Science', scope: 'Instruments & data', kidScope: 'Tools and discoveries', color: 'violet', Icon: Sparkles },
]

export function getRolesForPlayer(player: number, playerCount: number): TeamRoleId[] {
  const safePlayerCount = Math.max(1, Math.min(4, playerCount))
  return TEAM_ROLES.filter((_, index) => index % safePlayerCount === player - 1).map((role) => role.id)
}

export function getRoleOwner(roleId: TeamRoleId, playerCount: number) {
  const roleIndex = TEAM_ROLES.findIndex((role) => role.id === roleId)
  return (roleIndex % Math.max(1, Math.min(4, playerCount))) + 1
}

export function TeamModeBar({ mode, playerCount, activePlayer, activeRole, onPlayerChange, onRoleChange }: {
  mode: PlayMode
  playerCount: number
  activePlayer: number
  activeRole: TeamRoleId
  onPlayerChange: (player: number) => void
  onRoleChange: (role: TeamRoleId) => void
}) {
  const activeRoleInfo = TEAM_ROLES.find((role) => role.id === activeRole) ?? TEAM_ROLES[0]
  const assignedRoles = mode === 'team' && playerCount > 1 ? getRolesForPlayer(activePlayer, playerCount) : TEAM_ROLES.map((role) => role.id)

  return <section className={`team-workstation ${mode === 'team' ? 'team-workstation-active' : 'team-workstation-solo'}`} aria-label={mode === 'team' ? 'Team role controls' : 'Solo role controls'}>
    <div className="team-workstation-heading">
      <span className="team-active-badge" data-role={activeRoleInfo.color}><activeRoleInfo.Icon aria-hidden="true" /><span><b>{activeRoleInfo.kidLabel}</b><small>{activeRoleInfo.name}</small></span></span>
      <span className="team-workstation-caption">{mode === 'team' ? 'YOUR TURN · PICK THIS ROLE’S PARTS' : 'PLAY ALONE · YOU CAN PICK EVERY PART'}</span>
    </div>
    <div className="team-workstation-controls">
      {mode === 'team' && playerCount > 1 && <div className="team-player-switch" aria-label="Select active player">
        <span>CONTROL</span>
        {Array.from({ length: playerCount }, (_, index) => index + 1).map((player) => <button type="button" className={player === activePlayer ? 'team-player-active' : ''} key={player} onClick={() => onPlayerChange(player)} aria-pressed={player === activePlayer}>PLAYER {player}</button>)}
      </div>}
      <div className="team-role-switch" role="group" aria-label="Choose active mission role">
        {TEAM_ROLES.map((role) => {
          const assigned = assignedRoles.includes(role.id)
          return <button type="button" key={role.id} data-role={role.color} className={`${role.id === activeRole ? 'team-role-active' : ''} ${assigned ? '' : 'team-role-unassigned'}`} onClick={() => assigned && onRoleChange(role.id)} disabled={!assigned} aria-pressed={role.id === activeRole} title={assigned ? role.scope : `Assigned to Player ${getRoleOwner(role.id, playerCount)}`}>
            <role.Icon aria-hidden="true" /><span>{role.shortName}</span>{role.id === activeRole && <BadgeCheck aria-hidden="true" />}
          </button>
        })}
      </div>
    </div>
    {mode === 'team' && playerCount > 1 && <p className="team-role-scope">Player {activePlayer} picks: {assignedRoles.map((roleId) => TEAM_ROLES.find((role) => role.id === roleId)?.kidScope).join(' · ')}.</p>}
  </section>
}
