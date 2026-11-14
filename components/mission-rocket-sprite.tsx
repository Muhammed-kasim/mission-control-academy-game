import type { RocketAppearance } from './mission-data'
import { memo } from 'react'

const PATCH_COLORS: Record<RocketAppearance['missionPatch'], string> = {
  earth: '#4d9b91',
  moon: '#b7bdc8',
  mars: '#d77f63',
  comet: '#90a9e8',
  jupiter: '#d4a75d',
}

export const MissionRocketSprite = memo(function MissionRocketSprite({ rocketId, appearance, flame = true, exploded = false, shadow = true }: {
  rocketId: string
  appearance: RocketAppearance
  flame?: boolean
  exploded?: boolean
  shadow?: boolean
}) {
  const isSls = rocketId === 'sls'
  const rocketShape = rocketId === 'rideshare'
    ? { left: 69, right: 111, top: 78, body: 'M69 91 Q69 82 79 78 L101 78 Q111 82 111 91 L111 247 Q111 262 98 269 L82 269 Q69 262 69 247 Z' }
    : rocketId === 'electron'
      ? { left: 78, right: 102, top: 68, body: 'M78 81 Q78 72 84 68 L96 68 Q102 72 102 81 L102 254 Q102 267 96 272 L84 272 Q78 267 78 254 Z' }
      : isSls
        ? { left: 65, right: 115, top: 62, body: 'M65 77 Q65 68 78 62 L102 62 Q115 68 115 77 L115 251 Q115 267 100 274 L80 274 Q65 267 65 251 Z' }
        : { left: 67, right: 113, top: 64, body: 'M67 79 Q67 69 78 64 L102 64 Q113 69 113 79 L113 255 Q113 270 100 275 L80 275 Q67 270 67 255 Z' }
  const bodyWidth = rocketShape.right - rocketShape.left
  const nose = appearance.noseShape === 'rounded'
    ? <ellipse cx="90" cy={rocketShape.top + 2} rx={bodyWidth / 2} ry="24" fill={appearance.bodyColor} stroke="#fff" strokeWidth="4" />
    : appearance.noseShape === 'flat'
      ? <path d={`M${rocketShape.left} ${rocketShape.top + 5} V${rocketShape.top - 13} H${rocketShape.right} V${rocketShape.top + 5} Z`} fill={appearance.bodyColor} stroke="#fff" strokeWidth="4" />
      : <path d={`M${rocketShape.left} ${rocketShape.top + 7} L90 17 L${rocketShape.right} ${rocketShape.top + 7} Z`} fill={appearance.bodyColor} stroke="#fff" strokeWidth="4" />
  const finReach = appearance.finStyle === 'swept' ? 34 : appearance.finStyle === 'compact' ? 18 : 26
  const finPath = `M${rocketShape.left + 2} 236 L${rocketShape.left - finReach} 280 L${rocketShape.left + 8} 266 M${rocketShape.right - 2} 236 L${rocketShape.right + finReach} 280 L${rocketShape.right - 8} 266`

  return <svg className={`mission-rocket-sprite ${exploded ? 'mission-rocket-sprite-exploded' : ''} ${shadow ? '' : 'mission-rocket-sprite-no-shadow'}`} viewBox="0 0 180 330" role="img" aria-label={`${rocketId} rocket`}>
    <ellipse cx="90" cy="303" rx="58" ry="10" fill="rgba(12, 21, 61, .35)" />
    {isSls && <>
      <rect x="41" y="104" width="18" height="160" rx="9" fill="#e9edf0" stroke="#fff" strokeWidth="3" />
      <rect x="121" y="104" width="18" height="160" rx="9" fill="#e9edf0" stroke="#fff" strokeWidth="3" />
      <rect x="41" y="210" width="18" height="8" fill={appearance.stripeColor} />
      <rect x="121" y="210" width="18" height="8" fill={appearance.stripeColor} />
    </>}
    {nose}
    <path d={rocketShape.body} fill={appearance.bodyColor} stroke="#fff" strokeWidth="4" />
    <path d={finPath} fill={appearance.stripeColor} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
    <rect x={rocketShape.left + 3} y="133" width={bodyWidth - 6} height="13" rx="4" fill={appearance.stripeColor} />
    {rocketId === 'falcon9' && <rect x="69" y="220" width="42" height="9" rx="2" fill="#3c4656" stroke="#fff" strokeWidth="2" />}
    {rocketId === 'electron' && <rect x="81" y="180" width="18" height="6" rx="2" fill="#303744" />}
    <circle cx="102" cy="176" r="8" fill={PATCH_COLORS[appearance.missionPatch]} stroke="#fff" strokeWidth="3" />
    <rect x={rocketShape.left + bodyWidth * 0.22} y="270" width={bodyWidth * 0.56} height="15" rx="4" fill="#465461" />
    {flame && <g className={exploded ? 'mission-rocket-flame mission-rocket-flame-exploded' : 'mission-rocket-flame'}>
      <path d={exploded ? 'M73 287 L88 305 L78 302 L90 326 L102 302 L94 305 L107 287 Z' : 'M76 285 Q90 300 83 309 L90 304 Q98 315 91 325 Q112 313 103 285 Z'} fill={exploded ? '#ff7b72' : appearance.flameColor} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
    </g>}
  </svg>
}, (previous, next) => previous.rocketId === next.rocketId
  && previous.appearance === next.appearance
  && previous.flame === next.flame
  && previous.exploded === next.exploded
  && previous.shadow === next.shadow)
