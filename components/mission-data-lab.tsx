'use client'

import { useMemo, useState } from 'react'
import { BatteryCharging, Camera, CircleHelp, Compass, Orbit, Sparkles, Target, Waves, Zap } from 'lucide-react'
import type { MissionConfiguration, MissionEstimate, MissionProfile } from './mission-data'
import { INSTRUMENTS } from './mission-data'
import type { MissionOperationsResult, SimulatedMissionEvent } from './mission-simulation'
import { NasaTag, PageHeading, PrimaryButton } from './mission-ui'

const DISCOVERIES: Record<string, { title: string; copy: string; icon: typeof Camera }> = {
  camera: { title: 'New crater photos', copy: 'The camera found new shapes on the surface.', icon: Camera },
  spectrometer: { title: 'Minerals found', copy: 'Light clues showed what some rocks are made of.', icon: Sparkles },
  thermal: { title: 'Hot and cold spots', copy: 'The heat sensor mapped warm and chilly places.', icon: BatteryCharging },
  radar: { title: 'Hidden ice clues', copy: 'Radar found places that might hide ice below.', icon: Waves },
  magnetometer: { title: 'A magnetic bubble', copy: 'The tool measured an invisible magnetic field.', icon: Compass },
}

function getQuiz(instrumentIds: string[]) {
  const instrument = INSTRUMENTS.find((item) => instrumentIds.includes(item.id))
  const discovery = instrument ? DISCOVERIES[instrument.id] : undefined
  if (!instrument || !discovery) return {
    question: 'What helped the team learn about the planet?',
    answer: 'Science tools collected clues.',
    options: ['Science tools collected clues.', 'The rocket took photos.', 'The ground stations made rocks.'],
  }
  const distractor = Object.values(DISCOVERIES).find((item) => item.title !== discovery.title)!
  return {
    question: `What did the ${instrument.shortName} help us discover?`,
    answer: discovery.title,
    options: [discovery.title, distractor.title, 'How fast the rocket flew'],
  }
}

export function MissionDataLab({ mission, configuration, estimate, events, result, onComplete }: {
  mission: MissionProfile
  configuration: MissionConfiguration
  estimate: MissionEstimate
  events: SimulatedMissionEvent[]
  result: MissionOperationsResult
  onComplete: (result: MissionOperationsResult) => void
}) {
  const [answer, setAnswer] = useState('')
  const quiz = useMemo(() => getQuiz(configuration.instrumentIds), [configuration.instrumentIds])
  const discoveries = configuration.instrumentIds.map((id) => DISCOVERIES[id]).filter((item): item is NonNullable<typeof item> => Boolean(item)).slice(0, 3)
  const dailyValues = result.dailyScienceData.length
    ? result.dailyScienceData.map((value, index) => Math.max(0, value * (1 - (events[index]?.dataLossFraction ?? 0))))
    : [result.scienceDataGb]
  const maxDaily = Math.max(1, ...dailyValues)
  const dataPercent = Math.min(100, result.downloadedDataGb / Math.max(1, estimate.dataTargetGb) * 100)
  const moneyPercent = Math.min(100, estimate.totalCostM / Math.max(1, estimate.budgetLimitM) * 100)
  const pickedCorrect = answer === quiz.answer

  return <main className="flow-screen data-lab-screen">
    <PageHeading eyebrow="MISSION OPERATIONS · DATA LAB" title="What did our ship find?" description={`${mission.shortName} science is ready for our team.`} icon={<Orbit aria-hidden="true" />} />
    <section className="data-lab-panel" aria-labelledby="daily-chart-title">
      <h2 id="daily-chart-title">Science data collected each day</h2>
      <svg className="data-lab-chart" viewBox="0 0 600 220" role="img" aria-label="Bar chart showing science data collected during each mission day">
        <path d="M48 20V180H580" fill="none" stroke="#8495cf" strokeWidth="3" />
        {dailyValues.map((value, index) => {
          const x = 70 + index * (480 / Math.max(1, dailyValues.length))
          const height = value / maxDaily * 130
          const event = events[index]
          return <g key={index}>
            <rect x={x} y={180 - height} width="52" height={height} rx="10" fill={event?.dataLossFraction ? '#ffad6e' : '#78f3b4'} />
            <text x={x + 26} y="204" textAnchor="middle" fill="#e1e7ff" fontSize="16">Day {index + 1}</text>
            {event && <g transform={`translate(${x + 26} ${Math.max(18, 170 - height)})`}>
              <circle r="13" fill="#ffd05f" stroke="#fff" strokeWidth="2" />
              <text y="6" textAnchor="middle" fontSize="16">{event.id === 'solar-flare' ? '☀' : event.id === 'antenna-glitch' ? '!' : event.id === 'micrometeoroid' ? '✦' : '↘'}</text>
            </g>}
          </g>
        })}
      </svg>
      <p className="data-lab-chart-note">Orange bars mark a space surprise. Those days sent less data.</p>
    </section>
    <section className="data-lab-panel">
      <h2>Our discoveries</h2>
      <div className="data-discovery-grid">{discoveries.map(({ title, copy, icon: Icon }) => <article className="data-discovery-card" key={title}>
        <Icon aria-hidden="true" /><span><b>{title}</b><small>{copy}</small><NasaTag /></span>
      </article>)}</div>
      {!discoveries.length && <p>Our ship listened and watched, but had no science tools selected.</p>}
    </section>
    <section className="data-lab-panel">
      <h2>Compare with your goal</h2>
      <LabMeter label="Science sent home" value={`${result.downloadedDataGb.toFixed(1)} / ${estimate.dataTargetGb} GB`} progress={dataPercent} />
      <LabMeter label="Money used" value={`$${estimate.totalCostM.toLocaleString()}M / $${estimate.budgetLimitM.toLocaleString()}M`} progress={moneyPercent} />
    </section>
    <section className="data-lab-panel nova-data-thoughts">
      <h2>Nova says</h2>
      <p>Our {mission.shortName} ship gathered {result.scienceDataGb.toFixed(1)} GB of clues.</p>
      <p>We sent {result.downloadedDataGb.toFixed(1)} GB home to share.</p>
      <p>{result.batteryPercent > 25 ? 'Our battery kept the science tools working.' : 'Next time, we can save more power in the dark.'}</p>
      <p><b>Try next time:</b> {result.downloadedDataGb < estimate.dataTargetGb ? 'Add a message station or a stronger antenna.' : 'Try a different science tool to find new clues.'}</p>
    </section>
    <section className="data-lab-panel data-lab-quiz">
      <span className="eyebrow"><CircleHelp aria-hidden="true" /> MISSION CONTROL QUESTION</span>
      <h2>{quiz.question}</h2>
      <div className="data-quiz-options">{quiz.options.map((option) => <button type="button" className={answer === option ? 'data-quiz-selected' : ''} key={option} onClick={() => setAnswer(option)} aria-pressed={answer === option}>{option}</button>)}</div>
      {answer && <p role="status">{pickedCorrect ? 'That’s right! You earned 5 analysis points.' : 'Good try! Our science teams learn from every answer.'}</p>}
      <PrimaryButton disabled={!answer} onClick={() => onComplete({ ...result, analysisPoints: pickedCorrect ? 5 : 0, quizCorrect: pickedCorrect })}>Continue to my mission report</PrimaryButton>
    </section>
  </main>
}

function LabMeter({ label, value, progress }: { label: string; value: string; progress: number }) {
  return <div className="data-lab-meter"><span><b>{label}</b><strong>{value}</strong></span><i><b style={{ width: `${progress}%` }} /></i></div>
}
