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
