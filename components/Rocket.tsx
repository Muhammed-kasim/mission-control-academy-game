import type { Ref } from 'react'

type Props = { id?: 'rideshare'|'electron'|'falcon9'|'sls'; body?: string; stripe?: string; flame?: boolean; height?: number }
type LaunchParts = { showBoosters?: boolean; noseRef?: Ref<SVGPathElement>; stageRef?: Ref<SVGRectElement>; finsRef?: Ref<SVGPathElement> }
export function Rocket({ id='falcon9', body='#e8eef5', stripe='#ff6b4a', flame=true, height=240, showBoosters=true, noseRef, stageRef, finsRef }: Props & LaunchParts) {
  const w = { rideshare:22, electron:26, falcon9:38, sls:54 }[id], x = 50 - w/2, e = x + w
  return (
    <svg viewBox="0 0 100 260" width={height*0.4} height={height}
      style={{ display:'block', overflow:'visible', minWidth:40, minHeight:100 }} role="img" aria-label={`${id} rocket`}>
      {flame && <polygon points={`${x+4},200 50,250 ${e-4},200`} fill="#ffb347" />}
      {id==='sls' && showBoosters && <><rect x={x-13} y={70} width="11" height="130" rx="4" fill="#fff"/><rect x={e+2} y={70} width="11" height="130" rx="4" fill="#fff"/></>}
      <path ref={finsRef} d={`M${x-14},200 ${x},170 ${x},200Z M${e+14},200 ${e},170 ${e},200Z`} fill={stripe} />
      <path ref={noseRef} d={`M${x},70 Q50,0 ${e},70Z`} fill={stripe} />
      <rect x={x} y={70} width={w} height={75} fill={body} />
      <rect ref={stageRef} x={x} y={145} width={w} height={55} fill={body} />
      <rect x={x} y={110} width={w} height="9" fill={stripe} />
      <circle cx="50" cy="90" r={Math.min(9, w/3)} fill="#0b1b33" stroke="#9fb4d0" strokeWidth="2" />
    </svg>
  )
}
