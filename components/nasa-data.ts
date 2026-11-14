export interface NasaSolarFlare {
  classType: string
  beginTime: string
  sourceLocation: string
  sample: boolean
}

export interface NasaFlareResult {
  flare: NasaSolarFlare
  source: 'NASA DONKI' | 'cached NASA DONKI' | 'sample'
}

export interface NasaMissionImage {
  title: string
  imageUrl: string
}

const FLARE_CACHE_KEY = 'mission-control-academy-donki-flare-v1'
const SAMPLE_FLARE: NasaSolarFlare = {
  classType: 'M2.1',
  beginTime: '2024-05-10T00:00Z',
  sourceLocation: 'Active Region 13664',
  sample: true,
}

interface DonkiFlareRecord {
  classType?: unknown
  beginTime?: unknown
  sourceLocation?: unknown
}

interface DonkiCache {
  savedAt: number
  flare: NasaSolarFlare
}

function isSolarFlare(value: unknown): value is NasaSolarFlare {
  if (typeof value !== 'object' || value === null) return false
  const flare = value as Record<string, unknown>
  return typeof flare.classType === 'string'
    && typeof flare.beginTime === 'string'
    && typeof flare.sourceLocation === 'string'
    && typeof flare.sample === 'boolean'
}

function readCachedFlare(): NasaSolarFlare | null {
  try {
    const raw = window.localStorage.getItem(FLARE_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const cache = parsed as Partial<DonkiCache>
    return typeof cache.savedAt === 'number'
      && isSolarFlare(cache.flare)
      ? cache.flare
      : null
  } catch {
    return null
  }
}

function chooseStrongestFlare(records: unknown[]): NasaSolarFlare | null {
  const valid = records.filter((record): record is DonkiFlareRecord & { classType: string; beginTime: string } =>
    typeof record === 'object'
    && record !== null
    && 'classType' in record
    && typeof record.classType === 'string'
    && flareStrength(record.classType) > 0
    && 'beginTime' in record
    && typeof record.beginTime === 'string')
  valid.sort((left, right) => flareStrength(right.classType) - flareStrength(left.classType))
  const record = valid[0]
  return record ? {
    classType: record.classType,
    beginTime: record.beginTime,
    sourceLocation: typeof record.sourceLocation === 'string' ? record.sourceLocation : 'Unknown source region',
    sample: false,
  } : null
}

function flareStrength(classType: string) {
  const match = /^([BCMX])(\d+(?:\.\d+)?)$/i.exec(classType.trim())
  if (!match) return 0
  const classIndex = { B: 1, C: 2, M: 3, X: 4 }[match[1].toUpperCase() as 'B' | 'C' | 'M' | 'X']
  return classIndex * 10 + Number(match[2])
}

export async function fetchRecentSolarFlare(): Promise<NasaFlareResult> {
  const cached = readCachedFlare()
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setUTCDate(startDate.getUTCDate() - 90)
  const date = (value: Date) => value.toISOString().slice(0, 10)
  const apiKey = process.env.NEXT_PUBLIC_NASA_API_KEY || 'DEMO_KEY'
  const url = new URL('https://api.nasa.gov/DONKI/FLR')
  url.searchParams.set('startDate', date(startDate))
  url.searchParams.set('endDate', date(endDate))
  url.searchParams.set('api_key', apiKey)

  try {
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`NASA DONKI returned HTTP ${response.status}`)
    const records: unknown = await response.json()
    if (!Array.isArray(records)) throw new Error('NASA DONKI returned an unexpected response.')
    const flare = chooseStrongestFlare(records)
    if (!flare) throw new Error('NASA DONKI returned no solar flares for the requested period.')
    try {
      window.localStorage.setItem(FLARE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), flare } satisfies DonkiCache))
    } catch (error) {
      console.warn('Could not cache NASA DONKI flare data locally.', error)
    }
    return { flare, source: 'NASA DONKI' }
  } catch (error) {
    console.warn('NASA DONKI flare lookup failed; using cached or sample data.', error)
    if (cached) return { flare: cached, source: 'cached NASA DONKI' }
    return { flare: SAMPLE_FLARE, source: 'sample' }
  }
}

interface NasaImageItem {
  data?: Array<{ title?: unknown }>
  links?: Array<{ rel?: unknown; href?: unknown }>
}

export async function fetchNasaMissionImage(searchTerm: string): Promise<NasaMissionImage | null> {
  const url = new URL('https://images-api.nasa.gov/search')
  url.searchParams.set('q', searchTerm)
  url.searchParams.set('media_type', 'image')
  url.searchParams.set('page_size', '1')
  try {
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`NASA Images API returned HTTP ${response.status}`)
    const payload: unknown = await response.json()
    if (typeof payload !== 'object' || payload === null || !('collection' in payload)) {
      throw new Error('NASA Images API returned an unexpected response.')
    }
    const collection = payload.collection
    if (typeof collection !== 'object' || collection === null || !('items' in collection) || !Array.isArray(collection.items)) {
      throw new Error('NASA Images API response did not contain image results.')
    }
    const item = collection.items[0] as NasaImageItem | undefined
    const title = item?.data?.[0]?.title
    const imageUrl = item?.links?.find((link) => link.rel === 'preview' && typeof link.href === 'string')?.href
    return typeof title === 'string' && typeof imageUrl === 'string' ? { title, imageUrl } : null
  } catch (error) {
    console.warn(`NASA Images API lookup failed for ${searchTerm}.`, error)
    return null
  }
}
