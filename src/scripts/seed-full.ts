import { createClient } from '@supabase/supabase-js'

const API_BASE = 'https://api.jolpi.ca/ergast/f1'
const START_SEASON = 1950
const END_SEASON = 2025
const API_DELAY_MS = 1000

type SeasonItem = { season: string; url?: string }
type DriverItem = {
  driverId: string
  permanentNumber?: string
  code?: string
  url?: string
  givenName: string
  familyName: string
  dateOfBirth?: string
  nationality?: string
}
type CircuitItem = {
  circuitId: string
  url?: string
  circuitName: string
  Location?: {
    lat?: string
    long?: string
    locality?: string
    country?: string
  }
}

type MRData = {
  SeasonTable?: { Seasons?: SeasonItem[] }
  DriverTable?: { Drivers?: DriverItem[] }
  CircuitTable?: { Circuits?: CircuitItem[] }
  RaceTable?: { Races?: Array<unknown> }
}

type ApiResponse = { MRData?: MRData }

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchJson(path: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${path}`)
  }
  await sleep(API_DELAY_MS)
  return (await response.json()) as ApiResponse
}

async function getSeasonRounds(year: number): Promise<number> {
  const data = await fetchJson(`/${year}/races/?limit=100`)
  return data.MRData?.RaceTable?.Races?.length ?? 0
}

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log('1/3 Fetching seasons...')
  const seasonsResponse = await fetchJson('/seasons/?limit=100')
  const allSeasons = seasonsResponse.MRData?.SeasonTable?.Seasons ?? []
  const seasons = allSeasons
    .map((s) => Number.parseInt(s.season, 10))
    .filter((year) => Number.isFinite(year) && year >= START_SEASON && year <= END_SEASON)
    .sort((a, b) => a - b)

  console.log(`Found ${seasons.length} seasons in range ${START_SEASON}-${END_SEASON}.`)
  for (const year of seasons) {
    const rounds = await getSeasonRounds(year)
    const seasonRow = {
      year,
      slug: String(year),
      rounds,
    }

    const { error } = await supabase.from('seasons').upsert(seasonRow, { onConflict: 'slug' })
    if (error) {
      console.error(`Failed to upsert season ${year}: ${error.message}`)
    } else {
      console.log(`Seeded season ${year} (${rounds} rounds)`)
    }
  }

  console.log('2/3 Fetching drivers...')
  const driversResponse = await fetchJson('/drivers/?limit=1000')
  const drivers = driversResponse.MRData?.DriverTable?.Drivers ?? []
  const driverRows = drivers.map((driver) => ({
    slug: driver.driverId,
    driver_id: driver.driverId,
    ergast_driver_id: driver.driverId,
    first_name: driver.givenName,
    last_name: driver.familyName,
    nationality: driver.nationality ?? null,
    date_of_birth: driver.dateOfBirth ?? null,
    code: driver.code ?? null,
    number: driver.permanentNumber ? Number.parseInt(driver.permanentNumber, 10) : null,
  }))

  if (driverRows.length > 0) {
    const { error } = await supabase.from('drivers').upsert(driverRows, { onConflict: 'slug' })
    if (error) {
      console.error(`Failed to upsert drivers: ${error.message}`)
    } else {
      console.log(`Seeded ${driverRows.length} drivers`)
    }
  }

  console.log('3/3 Fetching circuits...')
  const circuitsResponse = await fetchJson('/circuits/?limit=100')
  const circuits = circuitsResponse.MRData?.CircuitTable?.Circuits ?? []
  const circuitRows = circuits.map((circuit) => ({
    slug: circuit.circuitId || slugify(circuit.circuitName),
    circuit_id: circuit.circuitId,
    name: circuit.circuitName,
    locality: circuit.Location?.locality ?? null,
    country: circuit.Location?.country ?? null,
    lat: circuit.Location?.lat ? Number.parseFloat(circuit.Location.lat) : null,
    lng: circuit.Location?.long ? Number.parseFloat(circuit.Location.long) : null,
  }))

  if (circuitRows.length > 0) {
    const { error } = await supabase.from('circuits').upsert(circuitRows, { onConflict: 'slug' })
    if (error) {
      console.error(`Failed to upsert circuits: ${error.message}`)
    } else {
      console.log(`Seeded ${circuitRows.length} circuits`)
    }
  }

  console.log('Full historical seed complete.')
}

void run()
