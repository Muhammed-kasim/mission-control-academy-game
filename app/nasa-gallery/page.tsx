'use client'

import { useEffect, useState } from 'react'
import { fetchNasaResearchGallery, type NasaGalleryCard } from '@/lib/nasaImages'

const worlds = {
  moon: 'Moon',
  mars: 'Mars',
  earth: 'Earth',
} as const

export default function NasaGalleryPage() {
  const [world, setWorld] = useState<keyof typeof worlds>('mars')
  const [cards, setCards] = useState<NasaGalleryCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    void fetchNasaResearchGallery(world).then((items) => {
      if (!active) return
      setCards(items)
      setLoading(false)
    }).catch(() => {
      if (!active) return
      setCards([])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [world])

  return <main style={{ padding: 24, background: '#06111d', color: '#f3f7ff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      {Object.entries(worlds).map(([key, label]) => <button key={key} type="button" onClick={() => setWorld(key as keyof typeof worlds)} style={{ background: world === key ? '#74d0ff' : '#14283b', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 16px', cursor: 'pointer' }}>{label}</button>)}
    </div>
    <h1 style={{ marginTop: 0 }}>NASA research images</h1>
    {loading ? <p>Loading NASA images…</p> : null}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {cards.map((card) => <article key={`${card.title}-${card.imageUrl}`} style={{ background: '#112234', border: '1px solid #24445f', borderRadius: 16, overflow: 'hidden' }}>
        <img src={card.imageUrl} alt={card.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block', background: '#0b1a2a' }} />
        <div style={{ padding: 16 }}>
          <strong>{card.title}</strong>
          <p style={{ color: '#d2e4ff', fontSize: 14 }}>{card.caption}</p>
          <small style={{ display: 'block', opacity: 0.8, marginBottom: 8 }}>{card.mission} · {card.credit}</small>
          <a href={card.link} target="_blank" rel="noreferrer" style={{ color: '#7cd7ff' }}>View NASA source</a>
        </div>
      </article>)}
    </div>
    {!loading && cards.length === 0 && <p>No NASA images loaded. The API may be unavailable offline.</p>}
  </main>
}
