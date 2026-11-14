'use client'

import { ArrowLeft, ExternalLink, Library } from 'lucide-react'
import { PageHeading, PrimaryButton } from './mission-ui'

const SOURCES = [
  { title: 'NASA — Design and Develop Science Missions', detail: 'Systems Engineering Webinar Series, 2025.', url: 'https://ntrs.nasa.gov/search?q=%22Design%20and%20Develop%20Science%20Missions%22' },
  { title: 'NASA Goddard Mission Design Lab', detail: 'Mission concept development and design support.', url: 'https://www.nasa.gov/goddard/' },
  { title: 'JPL — Space Mission Concept Development Using Concept Maturity Levels', detail: 'Randii Wessen et al., 2013.', url: 'https://ntrs.nasa.gov/search?q=Space%20Mission%20Concept%20Development%20Using%20Concept%20Maturity%20Levels' },
  { title: 'NASA CubeSat 101', detail: 'CubeSat Launch Initiative educational guide.', url: 'https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf' },
  { title: 'NASA Webb — Build It Yourself: Satellite', detail: 'Educational inspiration for spacecraft design.', url: 'https://science.nasa.gov/mission/webb/' },
  { title: 'NASA DONKI', detail: 'Space-weather events and solar-flare data.', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' },
  { title: 'NASA Images API', detail: 'Public NASA image search API.', url: 'https://images.nasa.gov/' },
  { title: 'GMAT', detail: 'General Mission Analysis Tool.', url: 'https://gmat.gsfc.nasa.gov/' },
  { title: 'NASA Mission Viz', detail: 'Explore solar-system missions in NASA Eyes.', url: 'https://eyes.nasa.gov/apps/solar-system/' },
]

export function MissionSources({ onBack }: { onBack: () => void }) {
  return <main className="flow-screen sources-screen">
    <button className="back-link" onClick={onBack}><ArrowLeft aria-hidden="true" /> Back to academy</button>
    <PageHeading eyebrow="SOURCES & ACKNOWLEDGMENTS" title="Built on real mission work." description="References that inspired the learning model and public NASA data used by this game." icon={<Library aria-hidden="true" />} />
    <ol className="source-list">{SOURCES.map((source) => <li key={source.title}>
      <span><strong>{source.title}</strong><small>{source.detail}</small></span>
      <a href={source.url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> Visit source</a>
    </li>)}</ol>
    <p className="sources-simplification">Numbers are simplified from real NASA and industry data.</p>
    <PrimaryButton icon="left" variant="quiet" onClick={onBack}>Return to mission control</PrimaryButton>
  </main>
}
