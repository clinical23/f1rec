import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const API_BASE = 'https://api.jolpi.ca/ergast/f1'
const START_SEASON = 1950
const END_SEASON = 2025
const API_DELAY_MS = 1000

type CircuitItem = {
  circuitId: string
  circuitName: string
  url?: string
  Location?: {
    lat?: string
    long?: string
    locality?: string
    country?: string
  }
}

type RaceItem = {
  season: string
  round: string
  raceName: string
  date?: string
  time?: string
  url?: string
  Circuit: CircuitItem
}

type ApiResponse = {
  MRData?: {
    RaceTable?: {
      Races?: RaceItem[]
    }
  }
}

const sleep = (ms: number) => new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms))

function parseEnvFile(content: string) {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex <= 0) continue
    const key = trimmed.slice(0, equalsIndex).trim()
    let value = trimmed.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local')
  const content = readFileSync(envPath, 'utf8')
  parseEnvFile(content)
}

async function fetchJson(path: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    throw new Error(`Jolpica request failed (${response.status}) for ${path}`)
  }
  await sleep(API_DELAY_MS)
  return (await response.json()) as ApiResponse
}

async function run() {
  loadEnvLocal()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  for (let year = START_SEASON; year <= END_SEASON; year += 1) {
    console.log(`Fetching races for ${year}...`)
    const data = await fetchJson(`/${year}/races/?limit=100`)
    const races = data.MRData?.RaceTable?.Races ?? []

    if (races.length === 0) {
      console.log(`No races returned for ${year}`)
      continue
    }

    const circuitsMap = new Map<string, { slug: string; circuit_id: string; name: string; locality: string | null; country: string | null; lat: number | null; lng: number | null }>()
    const raceRows: Array<{
      slug: string
      season_year: number
      round: number
      name: string
      race_date: string | null
      race_time: string | null
      circuit_slug: string
      url: string | null
    }> = []

    for (const race of races) {
      const circuit = race.Circuit
      const circuitSlug = circuit.circuitId
      circuitsMap.set(circuitSlug, {
        slug: circuitSlug,
        circuit_id: circuit.circuitId,
        name: circuit.circuitName,
        locality: circuit.Location?.locality ?? null,
        country: circuit.Location?.country ?? null,
        lat: circuit.Location?.lat ? Number.parseFloat(circuit.Location.lat) : null,
        lng: circuit.Location?.long ? Number.parseFloat(circuit.Location.long) : null,
      })

      const round = Number.parseInt(race.round, 10)
      raceRows.push({
        slug: `${race.season}-${race.round}`,
        season_year: Number.parseInt(race.season, 10),
        round: Number.isFinite(round) ? round : 0,
        name: race.raceName,
        race_date: race.date ?? null,
        race_time: race.time ?? null,
        circuit_slug: circuitSlug,
        url: race.url ?? null,
      })
    }

    const circuits = Array.from(circuitsMap.values())
    const { error: circuitError } = await supabase.from('circuits').upsert(circuits, { onConflict: 'slug' })
    if (circuitError) {
      console.error(`Failed circuits upsert for ${year}: ${circuitError.message}`)
    } else {
      console.log(`Upserted ${circuits.length} circuits for ${year}`)
    }

    const { error: racesError } = await supabase.from('races').upsert(raceRows, { onConflict: 'slug' })
    if (racesError) {
      console.error(`Failed races upsert for ${year}: ${racesError.message}`)
    } else {
      console.log(`Upserted ${raceRows.length} races for ${year}`)
    }
  }

  console.log('Race and circuit seeding complete.')
}

void run()
