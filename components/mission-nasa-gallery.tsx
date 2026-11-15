'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon, Radio } from 'lucide-react'
import useSWR from 'swr'
import { fetchSuccessfulLaunchGallery, type NasaGalleryCard } from '@/lib/nasaImages'
import type { MissionId } from './mission-data'

export function MissionNasaGallery({ missionId }: { missionId: MissionId }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const { data: cards, isLoading } = useSWR<NasaGalleryCard[]>(`successful-launch-gallery:${missionId}`, () => fetchSuccessfulLaunchGallery(missionId), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  })

  if (missionId === 'earth') return null
  const selected = cards?.[activeIndex] ?? cards?.[0]
  const destination = missionId === 'moon' ? 'Moon' : 'Mars'
  const changeCard = (offset: number) => setActiveIndex((index) => {
    const count = cards?.length ?? 1
    return (index + offset + count) % count
  })

  return <section className="nasa-launch-gallery" aria-labelledby="nasa-launch-gallery-title">
    <div className="nasa-gallery-heading">
      <div><span className="nasa-gallery-kicker"><Radio aria-hidden="true" /> POST-LAUNCH · NASA IMAGE ARCHIVE</span><h2 id="nasa-launch-gallery-title">A first look at {destination}.</h2><p>Real NASA mission imagery of the world your spacecraft is exploring.</p></div>
      <span className="nasa-image-credit"><ImageIcon aria-hidden="true" /> IMAGE: NASA</span>
    </div>
    {isLoading || !cards || !selected ? <div className="nasa-gallery-loading" role="status">Contacting NASA&apos;s image archive…</div> : <>
      <div className="nasa-featured-image">
        <Image src={selected.imageUrl} alt={selected.title} width={1600} height={900} priority unoptimized />
        <div className="nasa-featured-caption"><span>{selected.title}</span><a href={selected.link} target="_blank" rel="noreferrer">NASA credit <ExternalLink aria-hidden="true" /></a></div>
      </div>
      <div className="nasa-gallery-controls">
        <span>IMAGE {String(activeIndex + 1).padStart(2, '0')} <i /> {String(cards.length).padStart(2, '0')}</span>
        <div><button type="button" onClick={() => changeCard(-1)} aria-label="Previous NASA image"><ChevronLeft aria-hidden="true" /></button><button type="button" onClick={() => changeCard(1)} aria-label="Next NASA image"><ChevronRight aria-hidden="true" /></button></div>
      </div>
      <div className="nasa-gallery-rail" role="region" tabIndex={0} aria-label={`Swipe through NASA ${destination} images`}>
        {cards.map((card, index) => <button className={`nasa-gallery-thumb ${index === activeIndex ? 'nasa-gallery-thumb-active' : ''}`} key={`${card.imageUrl}-${index}`} type="button" aria-label={`Show image ${index + 1}: ${card.title}`} aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)}>
          <Image src={card.imageUrl} alt="" width={240} height={140} unoptimized />
          <span>{card.title}</span>
        </button>)}
      </div>
    </>}
    <p className="nasa-gallery-disclaimer">NASA Image and Video Library · results are cached in this browser for 24 hours. <a href="https://images.nasa.gov/" target="_blank" rel="noreferrer">Browse the archive <ExternalLink aria-hidden="true" /></a></p>
  </section>
}
