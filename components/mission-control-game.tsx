'use client'

import { useMemo, useState } from 'react'
import { MissionDesign } from './mission-design'
import { buildChecks, calculateMission, getDefaultConfiguration, getMission, getSize, type GameStep, type MissionConfiguration, type MissionId, type SizeId } from './mission-data'
import { MissionOutcomeScreen } from './mission-outcome-screens'
import { MissionSelectionScreen, RequirementsScreen, SizeSelectionScreen, WelcomeScreen } from './mission-selection-screens'
import { GameHeader, TelemetryStrip, WarningBanner } from './mission-ui'

export function MissionControlGame() {
  const [step, setStep] = useState<GameStep>('welcome')
  const [missionId, setMissionId] = useState<MissionId>('earth')
  const [sizeId, setSizeId] = useState<SizeId>('small')
  const [configuration, setConfiguration] = useState<MissionConfiguration>(() => getDefaultConfiguration(getMission('earth'), getSize('small')))
  const mission = getMission(missionId)
  const size = getSize(sizeId)
  const estimate = useMemo(() => calculateMission(mission, size, configuration), [mission, size, configuration])
  const checks = useMemo(() => buildChecks(mission, size, configuration, estimate), [mission, size, configuration, estimate])
  const hasMissionDesign = step !== 'welcome' && step !== 'mission' && step !== 'size'

  function chooseMission(nextMission: typeof mission) {
    setMissionId(nextMission.id)
    setStep('size')
  }

  function chooseSize(nextSize: typeof size) {
    setSizeId(nextSize.id)
    setConfiguration(getDefaultConfiguration(mission, nextSize))
    setStep('requirements')
  }

  function returnHome() {
    setStep('welcome')
  }

  function updateConfiguration(next: Partial<MissionConfiguration>) {
    setConfiguration((current) => ({ ...current, ...next }))
  }

  return <div className="academy-shell" id="top">
    <GameHeader step={step} mission={step === 'welcome' ? undefined : mission} size={step === 'welcome' || step === 'mission' ? undefined : size} onHome={returnHome} />
    {hasMissionDesign && <div className="telemetry-wrap"><TelemetryStrip estimate={estimate} size={size} mission={mission} />
      {step === 'design' && <WarningBanner checks={checks} />}
    </div>}
    {step === 'welcome' && <WelcomeScreen onPlay={() => setStep('mission')} />}
    {step === 'mission' && <MissionSelectionScreen selectedId={missionId} onSelect={chooseMission} onBack={returnHome} />}
    {step === 'size' && <SizeSelectionScreen selectedId={sizeId} onSelect={chooseSize} onBack={() => setStep('mission')} />}
    {step === 'requirements' && <RequirementsScreen mission={mission} size={size} onContinue={() => setStep('design')} onBack={() => setStep('size')} />}
    {step === 'design' && <MissionDesign mission={mission} size={size} configuration={configuration} estimate={estimate} checks={checks} onChange={updateConfiguration} onBack={() => setStep('requirements')} onVerify={() => setStep('verify')} />}
    {(step === 'verify' || step === 'launch' || step === 'report') && <MissionOutcomeScreen step={step} mission={mission} size={size} configuration={configuration} estimate={estimate} checks={checks} onBackToDesign={() => setStep('design')} onLaunch={() => setStep('launch')} onReport={() => setStep('report')} onRestart={() => { setStep('mission'); setConfiguration(getDefaultConfiguration(mission, size)) }} />}
    {hasMissionDesign && <footer className="app-footer"><span>MISSION CONTROL ACADEMY <i /> EDUCATIONAL SIMULATION</span><span>Values simplified from real data · Actual missions use detailed engineering models</span></footer>}
  </div>
}
