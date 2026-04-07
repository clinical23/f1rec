import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const API_BASE = 'https://api.jolpi.ca/ergast/f1'
const START_SEASON = 1950
const END_SEASON = 2025
const API_DELAY_MS = 2000
const RATE_LIMIT_RETRY_DELAY_MS = 10000

type ResultItem = {
  number?: string
  position?: string
  positionText?: string
  points?: string
  grid?: string
  laps?: string
  status?: string
  Time?: {
    millis?: string
    time?: string
  }
  Driver: {
    driverId: string
    code?: string
    givenName?: string
    familyName?: string
  }
  Constructor?: {
    constructorId?: string
    name?: string
  }
}

type RaceItem = {
  season: string
  round: string
  raceName?: string
  Results?: ResultItem[]
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
  let response = await fetch(`${API_BASE}${path}`)
  if (response.status === 429) {
    console.warn(`Rate limited on ${path}. Waiting ${RATE_LIMIT_RETRY_DELAY_MS / 1000}s before retry...`)
    await sleep(RATE_LIMIT_RETRY_DELAY_MS)
    response = await fetch(`${API_BASE}${path}`)
  }

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
    console.log(`Fetching results for ${year}...`)
    const data = await fetchJson(`/${year}/results/?limit=1000`)
    const races = data.MRData?.RaceTable?.Races ?? []

    if (races.length === 0) {
      console.log(`No results returned for ${year}`)
      continue
    }

    const rows: Array<Record<string, string | number | null>> = []
    for (const race of races) {
      const seasonYear = Number.parseInt(race.season, 10)
      const round = Number.parseInt(race.round, 10)
      const raceSlug = `${race.season}-${race.round}`
      const results = race.Results ?? []

      for (const result of results) {
        const driverId = result.Driver.driverId
        const constructorId = result.Constructor?.constructorId ?? null
        const position = Number.parseInt(result.position ?? '', 10)
        const grid = Number.parseInt(result.grid ?? '', 10)
        const points = Number.parseFloat(result.points ?? '')
        const laps = Number.parseInt(result.laps ?? '', 10)
        const driverName = `${result.Driver.givenName ?? ''} ${result.Driver.familyName ?? ''}`.trim()

        const positionKey = Number.isFinite(position)
          ? String(position)
          : [result.positionText, result.grid, result.status].filter(Boolean).join('-').replace(/\s+/g, '_') || 'np'

        rows.push({
          slug: `${raceSlug}-${driverId}-${positionKey}`,
          race_slug: raceSlug,
          season_year: Number.isFinite(seasonYear) ? seasonYear : year,
          round: Number.isFinite(round) ? round : 0,
          race_name: race.raceName ?? null,
          driver_slug: driverId,
          driver_code: result.Driver.code ?? null,
          driver_name: driverName || driverId,
          constructor_slug: constructorId,
          constructor_name: result.Constructor?.name ?? null,
          number: result.number ? Number.parseInt(result.number, 10) : null,
          grid: Number.isFinite(grid) ? grid : null,
          position: Number.isFinite(position) ? position : null,
          position_text: result.positionText ?? null,
          points: Number.isFinite(points) ? points : null,
          laps: Number.isFinite(laps) ? laps : null,
          status: result.status ?? null,
          time_millis: result.Time?.millis ? Number.parseInt(result.Time.millis, 10) : null,
          time_text: result.Time?.time ?? null,
        })
      }
    }

    if (rows.length === 0) {
      console.log(`No result rows to upsert for ${year}`)
      continue
    }

    const bySlug = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      const key = row.slug as string
      if (!bySlug.has(key)) {
        bySlug.set(key, row)
      }
    }
    const dedupedRows = Array.from(bySlug.values())
    if (dedupedRows.length < rows.length) {
      console.warn(`Deduplicated ${rows.length - dedupedRows.length} duplicate slug(s) in batch for ${year}`)
    }

    const { error } = await supabase.from('results').upsert(dedupedRows, { onConflict: 'slug' })
    if (error) {
      console.error(`Failed results upsert for ${year}: ${error.message}`)
    } else {
      console.log(`Upserted ${dedupedRows.length} results for ${year}`)
    }
  }

  console.log('Results seeding complete.')
}

void run()
