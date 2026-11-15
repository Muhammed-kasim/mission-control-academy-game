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
    'Lunar Reconnaissance Orbiter craters',
    'Moon exosphere',
    'Moon south pole ice',
  ],
  mars: [
    'Mars atmosphere',
    'Mars dust storm',
    'MAVEN Mars atmosphere',
  ],
  earth: [
    'Earth atmosphere from space',
    'Terra clouds',
    'Landsat Earth',
  ],
} as const

const FALLBACK_IMAGES: Record<keyof typeof FALLBACK_QUERY_MAP, NasaGalleryCard[]> = {
  moon: [
    {
      title: 'Moon south pole ice',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA00405/collection.json',
      credit: 'NASA / LRO',
      caption: 'The Moon has almost no air, but it keeps clues about ice in the shadows.',
      mission: 'Lunar Reconnaissance Orbiter',
      link: 'https://www.nasa.gov/mission_pages/LRO/main/index.html',
    },
  ],
  mars: [
    {
      title: 'Mars atmosphere',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA18033/collection.json',
      credit: 'NASA / MAVEN',
      caption: 'Mars is dusty and thin, with most of its air made of carbon dioxide.',
      mission: 'MAVEN',
      link: 'https://mars.nasa.gov/maven/',
    },
  ],
  earth: [
    {
      title: 'Earth atmosphere from space',
      imageUrl: 'https://images-assets.nasa.gov/image/iss064e082154/collection.json',
      credit: 'NASA / ISS',
      caption: 'Earth’s atmosphere makes weather, clouds and climate patterns possible.',
      mission: 'Terra',
      link: 'https://terra.nasa.gov/',
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
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const payload = await response.json() as { collection?: { items?: Array<{ data?: Array<{ title?: string }>; links?: Array<{ href?: string }> }> } }
    const item = payload.collection?.items?.[0]
    const title = item?.data?.[0]?.title
    const imageUrl = item?.links?.find((link) => typeof link.href === 'string')?.href
    if (!title || !imageUrl) return null
    return {
      title,
      imageUrl,
      credit: 'NASA',
      caption: title,
      mission: 'NASA mission',
      link: `https://images.nasa.gov/details/${encodeURIComponent(title)}`,
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
