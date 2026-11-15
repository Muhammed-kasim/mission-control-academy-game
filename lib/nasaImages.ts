export type NasaGalleryCard = {
  title: string
  imageUrl: string
  credit: string
  caption: string
  mission: string
  link: string
}

const FALLBACK_QUERY_MAP = {
  moon: [
    'Lunar Reconnaissance Orbiter surface',
    'Moon south pole',
    'Moon exosphere',
  ],
  mars: [
    'Mars atmosphere',
    'Mars dust storm',
    'MAVEN Mars atmosphere',
  ],
  earth: [
    'Earth atmosphere from space',
    'Terra clouds',
    'Earth limb atmosphere',
  ],
} as const

// Hard-coded working image URLs (medium size) so the gallery never shows empty boxes
const FALLBACK_IMAGES: Record<keyof typeof FALLBACK_QUERY_MAP, NasaGalleryCard[]> = {
  moon: [
    {
      title: 'Moon surface – Lunar Reconnaissance Orbiter',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA14011/PIA14011~medium.jpg',
      credit: 'NASA / LRO',
      caption: 'The Moon has almost no air, only a tiny exosphere. Shadows can hide ice.',
      mission: 'Lunar Reconnaissance Orbiter',
      link: 'https://www.nasa.gov/mission_pages/LRO/main/index.html',
    },
    {
      title: 'Moon south pole',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA14010/PIA14010~medium.jpg',
      credit: 'NASA / LRO',
      caption: 'Craters near the south pole stay cold enough for ice to survive.',
      mission: 'Lunar Reconnaissance Orbiter',
      link: 'https://www.nasa.gov/mission_pages/LRO/main/index.html',
    },
  ],
  mars: [
    {
      title: 'Mars atmosphere being stripped by solar wind',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA22076/PIA22076~medium.jpg',
      credit: 'NASA / MAVEN',
      caption: 'Mars has a thin, dusty atmosphere made mostly of carbon dioxide.',
      mission: 'MAVEN',
      link: 'https://mars.nasa.gov/maven/',
    },
    {
      title: 'Mars dust storm',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA17936/PIA17936~medium.jpg',
      credit: 'NASA / JPL',
      caption: 'Dust storms can cover the whole planet and change the weather for months.',
      mission: 'Mars missions',
      link: 'https://mars.nasa.gov/',
    },
  ],
  earth: [
    {
      title: 'Earth atmosphere from space',
      imageUrl: 'https://images-assets.nasa.gov/image/iss040e090150/iss040e090150~medium.jpg',
      credit: 'NASA / ISS',
      caption: 'Earth’s thick atmosphere makes weather, clouds and life possible.',
      mission: 'International Space Station',
      link: 'https://www.nasa.gov/mission_pages/station/main/index.html',
    },
    {
      title: 'Earth limb and atmosphere',
      imageUrl: 'https://images-assets.nasa.gov/image/iss064e082154/iss064e082154~medium.jpg',
      credit: 'NASA / ISS',
      caption: 'The blue glow is our atmosphere protecting the planet.',
      mission: 'International Space Station',
      link: 'https://www.nasa.gov/mission_pages/station/main/index.html',
    },
  ],
}

function buildFallbackCards(world: keyof typeof FALLBACK_QUERY_MAP): NasaGalleryCard[] {
  return FALLBACK_IMAGES[world]
}

async function fetchNasaApiImage(query: string): Promise<NasaGalleryCard | null> {
  const url = new URL('https://images-api.nasa.gov/search')
  url.searchParams.set('q', query)
  url.searchParams.set('media_type', 'image')
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!response.ok) return null
    const payload = (await response.json()) as {
      collection?: {
        items?: Array<{
          data?: Array<{ title?: string; nasa_id?: string }>
          links?: Array<{ href?: string; rel?: string }>
        }>
      }
    }
    const item = payload.collection?.items?.[0]
    if (!item) return null
    const title = item.data?.[0]?.title ?? query
    // Prefer medium image, then any render=image link
    const imageLink =
      item.links?.find((l) => l.href?.includes('~medium.jpg')) ||
      item.links?.find((l) => l.rel === 'preview' || l.href?.includes('.jpg'))
    const imageUrl = imageLink?.href
    if (!imageUrl || !imageUrl.endsWith('.jpg') && !imageUrl.includes('images-assets')) return null
    return {
      title,
      imageUrl,
      credit: 'NASA',
      caption: title,
      mission: 'NASA',
      link: `https://images.nasa.gov/details/${encodeURIComponent(item.data?.[0]?.nasa_id || title)}`,
    }
  } catch {
    return null
  }
}

export async function fetchNasaResearchGallery(world: 'moon' | 'mars' | 'earth') {
  const queries = FALLBACK_QUERY_MAP[world]
  const results: NasaGalleryCard[] = []

  for (const query of queries) {
    const item = await fetchNasaApiImage(query)
    if (item && !results.some((entry) => entry.imageUrl === item.imageUrl)) {
      results.push(item)
    }
    if (results.length >= 3) break
  }

  if (results.length === 0) {
    return buildFallbackCards(world)
  }

  return results.slice(0, 6)
}

const LAUNCH_GALLERY_CACHE_TTL = 24 * 60 * 60 * 1000
const LAUNCH_GALLERY_CACHE_PREFIX = 'mission-control-nasa-launch-gallery-v1'
const LAUNCH_FALLBACKS: Record<'moon' | 'mars', NasaGalleryCard[]> = {
  moon: [
    { title: 'Lunar surface viewed by the Lunar Reconnaissance Orbiter', imageUrl: '/fallback/moon/moon-01.jpg', credit: 'NASA / LRO', caption: 'Lunar terrain observed by NASA’s Lunar Reconnaissance Orbiter.', mission: 'Lunar Reconnaissance Orbiter', link: 'https://images.nasa.gov/details/PIA14011' },
    { title: 'Sinuous chain of depressions on the Moon', imageUrl: '/fallback/moon/moon-02.jpg', credit: 'NASA / LRO', caption: 'A close view of lunar surface features from the LRO Camera.', mission: 'Lunar Reconnaissance Orbiter', link: 'https://images.nasa.gov/details/PIA14010' },
    { title: 'First images from the Lunar Reconnaissance Orbiter', imageUrl: '/fallback/moon/moon-03.jpg', credit: 'NASA / LRO', caption: 'One of the first lunar views returned by LROC.', mission: 'Lunar Reconnaissance Orbiter', link: 'https://images.nasa.gov/details/PIA12884' },
  ],
  mars: [
    { title: 'Martian dust storm, November 18, 2012', imageUrl: '/fallback/mars/mars-01.jpg', credit: 'NASA / JPL-Caltech / MSSS', caption: 'A dust storm viewed from orbit around Mars.', mission: 'Mars Reconnaissance Orbiter', link: 'https://images.nasa.gov/details/PIA16450' },
    { title: 'Martian dust storm', imageUrl: '/fallback/mars/mars-02.jpg', credit: 'NASA / JPL-Caltech / MSSS', caption: 'Clouds of dust sweep over the red planet.', mission: 'Mars Reconnaissance Orbiter', link: 'https://images.nasa.gov/details/PIA15959' },
    { title: 'Dust storm covers Opportunity', imageUrl: '/fallback/mars/mars-03.jpg', credit: 'NASA / JPL-Caltech', caption: 'A global dust storm seen from orbit as it enveloped Mars.', mission: 'Mars Reconnaissance Orbiter', link: 'https://images.nasa.gov/details/PIA22329' },
  ],
}

function isLaunchGalleryCard(value: unknown): value is NasaGalleryCard {
  if (typeof value !== 'object' || value === null) return false
  const card = value as Partial<NasaGalleryCard>
  if (typeof card.title !== 'string' || typeof card.imageUrl !== 'string' || typeof card.link !== 'string') return false
  if (typeof card.caption !== 'string' || typeof card.credit !== 'string' || typeof card.mission !== 'string') return false
  if (card.imageUrl.startsWith('/fallback/')) return true
  try {
    return new URL(card.imageUrl).hostname === 'images-assets.nasa.gov' && new URL(card.link).hostname === 'images.nasa.gov'
  } catch {
    return false
  }
}

function readLaunchGalleryCache(world: 'moon' | 'mars') {
  try {
    const raw = window.localStorage.getItem(`${LAUNCH_GALLERY_CACHE_PREFIX}:${world}`)
    if (!raw) return null
    const cached: unknown = JSON.parse(raw)
    if (typeof cached !== 'object' || cached === null || !('cachedAt' in cached) || !('cards' in cached)) return null
    const entry = cached as { cachedAt: unknown; cards: unknown }
    if (typeof entry.cachedAt !== 'number' || Date.now() - entry.cachedAt >= LAUNCH_GALLERY_CACHE_TTL || !Array.isArray(entry.cards)) return null
    const cards = entry.cards.filter(isLaunchGalleryCard)
    return cards.length ? cards : null
  } catch {
    return null
  }
}

function writeLaunchGalleryCache(world: 'moon' | 'mars', cards: NasaGalleryCard[]) {
  try {
    window.localStorage.setItem(`${LAUNCH_GALLERY_CACHE_PREFIX}:${world}`, JSON.stringify({ cachedAt: Date.now(), cards }))
  } catch {
    return
  }
}

async function fetchLaunchGalleryFromNasa(world: 'moon' | 'mars') {
  const query = world === 'moon' ? 'LROC' : 'MAVEN Mars atmosphere'
  const url = new URL('https://images-api.nasa.gov/search')
  url.searchParams.set('q', query)
  url.searchParams.set('media_type', 'image')
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) })
  if (!response.ok) throw new Error(`NASA image search returned ${response.status}.`)
  const payload = await response.json() as {
    collection?: {
      items?: Array<{
        data?: Array<{ title?: string; nasa_id?: string; description?: string }>
        links?: Array<{ href?: string }>
      }>
    }
  }
  const results: NasaGalleryCard[] = []
  for (const item of payload.collection?.items ?? []) {
    const metadata = item.data?.[0]
    const title = metadata?.title?.trim() ?? ''
    const imageUrl = item.links?.[0]?.href ?? ''
    if (!title || /artist|concept|briefing|illustration|render|diagram/i.test(title)) continue
    if (world === 'moon' ? !/lroc|lunar|moon|crater|tycho|mare/i.test(title) : !/mars|martian/i.test(title)) continue
    if (!/^https:\/\/images-assets\.nasa\.gov\//i.test(imageUrl) || !/\.(jpe?g)(\?|$)/i.test(imageUrl)) continue
    const nasaId = metadata?.nasa_id
    if (!nasaId || results.some((card) => card.imageUrl === imageUrl)) continue
    results.push({
      title,
      imageUrl,
      credit: 'NASA',
      caption: metadata?.description?.trim() || title,
      mission: world === 'moon' ? 'Lunar Reconnaissance Orbiter' : 'MAVEN / NASA Mars missions',
      link: `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`,
    })
    if (results.length >= 6) break
  }
  return results
}

export async function fetchSuccessfulLaunchGallery(world: 'moon' | 'mars' | 'earth') {
  if (world === 'earth') return []
  const cached = readLaunchGalleryCache(world)
  if (cached) return cached

  let cards: NasaGalleryCard[]
  try {
    cards = await fetchLaunchGalleryFromNasa(world)
  } catch {
    cards = []
  }
  if (cards.length === 0) cards = LAUNCH_FALLBACKS[world]
  writeLaunchGalleryCache(world, cards)
  return cards
}
