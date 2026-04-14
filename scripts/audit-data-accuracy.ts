import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SCRIPTS_DIR = resolve(process.cwd(), 'scripts')

type DriverRow = {
  id: string
  slug: string | null
  full_name: string | null
  career_wins: number | string | null
  career_podiums: number | string | null
  career_poles: number | string | null
  career_starts: number | string | null
  career_points: number | string | null
}

type ResultRow = {
  race_id: string | null
  race_slug: string | null
  season_year: number | null
  driver_slug: string | null
  constructor_slug: string | null
  position: number | string | null
  grid: number | string | null
  points: number | string | null
  is_sprint: boolean | null
}

type DriverSeasonStatsRow = {
  id: string
  driver_id: string | null
  season_id: string | null
  wins: number | string | null
  podiums: number | string | null
  points: number | string | null
  championship_position: number | string | null
}

type SeasonRow = {
  id: string
  year: number | null
  champion_driver_id: string | null
  champion_team_id: string | null
}

type TeamRow = Record<string, unknown> & {
  slug: string | null
  name: string | null
}

type RaceRow = {
  id: string | null
  slug: string | null
  winner_driver_id: string | null
}

type AuditSummary = {
  driverCareerWins: { checked: number; mismatches: number }
  driverCareerPodiums: { checked: number; mismatches: number }
  driverCareerPoles: { checked: number; mismatches: number }
  driverCareerStarts: { checked: number; mismatches: number }
  driverCareerPoints: { checked: number; mismatches: number }
  seasonChampions: { checked: number; mismatches: number }
  teamCachedStats: { checked: number; mismatches: number }
  driverSeasonStats: { checked: number; mismatches: number }
  raceWinners: { checked: number; mismatches: number }
  teammatesSanity: { checked: number; mismatches: number }
}

function toNum(value: number | string | null | undefined): number {
  if (value == null) return 0
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : 0
}

function toInt(value: number | string | null | undefined): number {
  if (value == null) return 0
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function raceKey(row: Pick<ResultRow, 'race_id' | 'race_slug'>): string | null {
  if (row.race_id) return `id:${row.race_id}`
  if (row.race_slug) return `slug:${row.race_slug}`
  return null
}

function sanitizeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log('Loading source data from Supabase...')
  const [driversRes, resultsRes, seasonsRes, dssRes, teamsRes, racesRes] = await Promise.all([
    supabase.from('drivers').select('id, slug, full_name, career_wins, career_podiums, career_poles, career_starts, career_points'),
    supabase.from('results').select('race_id, race_slug, season_year, driver_slug, constructor_slug, position, grid, points, is_sprint'),
    supabase.from('seasons').select('id, year, champion_driver_id, champion_team_id'),
    supabase.from('driver_season_stats').select('id, driver_id, season_id, wins, podiums, points, championship_position'),
    supabase.from('teams').select('*'),
    supabase.from('races').select('id, slug, winner_driver_id'),
  ])

  const errors = [driversRes.error, resultsRes.error, seasonsRes.error, dssRes.error, teamsRes.error, racesRes.error].filter(Boolean)
  if (errors.length > 0) {
    throw new Error(`Supabase query error(s): ${errors.map((e) => e?.message).join(' | ')}`)
  }

  const drivers = (driversRes.data ?? []) as DriverRow[]
  const results = (resultsRes.data ?? []) as ResultRow[]
  const seasons = (seasonsRes.data ?? []) as SeasonRow[]
  const dssRows = (dssRes.data ?? []) as DriverSeasonStatsRow[]
  const teams = (teamsRes.data ?? []) as TeamRow[]
  const races = (racesRes.data ?? []) as RaceRow[]

  const driverBySlug = new Map<string, DriverRow>()
  const slugByDriverId = new Map<string, string>()
  for (const driver of drivers) {
    if (!driver.slug) continue
    driverBySlug.set(driver.slug, driver)
    slugByDriverId.set(driver.id, driver.slug)
  }

  const byDriver = new Map<
    string,
    { wins: number; podiums: number; poles: number; points: number; raceKeys: Set<string> }
  >()
  const driverSeasonAgg = new Map<string, { wins: number; podiums: number; points: number }>()
  const constructorAgg = new Map<string, { wins: number; podiums: number; poles: number; points: number; seasons: Set<number> }>()
  const raceWinnerByKey = new Map<string, string>()
  const teammatesByDriver = new Map<string, Set<string>>()
  const raceTeamToDrivers = new Map<string, Set<string>>()

  for (const row of results) {
    const driverSlug = row.driver_slug?.trim()
    const constructorSlug = row.constructor_slug?.trim()
    const key = raceKey(row)
    const seasonYear = toInt(row.season_year)
    if (!driverSlug || !constructorSlug || !key) continue

    const position = toInt(row.position)
    const grid = toInt(row.grid)
    const points = toNum(row.points)

    const driverAgg = byDriver.get(driverSlug) ?? { wins: 0, podiums: 0, poles: 0, points: 0, raceKeys: new Set<string>() }
    if (position === 1) driverAgg.wins += 1
    if (position >= 1 && position <= 3) driverAgg.podiums += 1
    if (grid === 1) driverAgg.poles += 1
    driverAgg.points += points
    driverAgg.raceKeys.add(key)
    byDriver.set(driverSlug, driverAgg)

    const dsKey = `${driverSlug}:${seasonYear}`
    const dsAgg = driverSeasonAgg.get(dsKey) ?? { wins: 0, podiums: 0, points: 0 }
    if (position === 1) dsAgg.wins += 1
    if (position >= 1 && position <= 3) dsAgg.podiums += 1
    dsAgg.points += points
    driverSeasonAgg.set(dsKey, dsAgg)

    const teamAgg = constructorAgg.get(constructorSlug) ?? {
      wins: 0,
      podiums: 0,
      poles: 0,
      points: 0,
      seasons: new Set<number>(),
    }
    if (position === 1) teamAgg.wins += 1
    if (position >= 1 && position <= 3) teamAgg.podiums += 1
    if (grid === 1) teamAgg.poles += 1
    teamAgg.points += points
    if (seasonYear > 0) teamAgg.seasons.add(seasonYear)
    constructorAgg.set(constructorSlug, teamAgg)

    if (position === 1 && row.is_sprint !== true && !raceWinnerByKey.has(key)) {
      raceWinnerByKey.set(key, driverSlug)
    }

    const rtKey = `${key}:${constructorSlug}`
    const set = raceTeamToDrivers.get(rtKey) ?? new Set<string>()
    set.add(driverSlug)
    raceTeamToDrivers.set(rtKey, set)
  }

  for (const driverSet of raceTeamToDrivers.values()) {
    const list = [...driverSet]
    for (const slug of list) {
      const mapSet = teammatesByDriver.get(slug) ?? new Set<string>()
      for (const teammate of list) {
        if (teammate !== slug) mapSet.add(teammate)
      }
      teammatesByDriver.set(slug, mapSet)
    }
  }

  const details = {
    driverCareerWins: [] as Array<{ driver_slug: string; expected: number; actual: number }>,
    driverCareerPodiums: [] as Array<{ driver_slug: string; expected: number; actual: number }>,
    driverCareerPoles: [] as Array<{ driver_slug: string; expected: number; actual: number }>,
    driverCareerStarts: [] as Array<{ driver_slug: string; expected: number; actual: number }>,
    driverCareerPoints: [] as Array<{ driver_slug: string; expected: number; actual: number }>,
    seasonChampions: [] as Array<{ season_id: string; year: number; expected_driver_id: string | null; actual_driver_id: string | null }>,
    teamCachedStats: [] as Array<{ team_slug: string; field: string; expected: number; actual: number }>,
    driverSeasonStats: [] as Array<{ row_id: string; driver_id: string | null; season_id: string | null; field: string; expected: number; actual: number }>,
    raceWinners: [] as Array<{ race_id: string | null; race_slug: string | null; expected_driver_id: string | null; actual_driver_id: string | null }>,
    teammatesSanity: [] as Array<{ driver_slug: string; missing_in_rpc: string[]; extra_in_rpc: string[] }>,
  }

  let winsChecked = 0
  let podiumsChecked = 0
  let polesChecked = 0
  let startsChecked = 0
  let pointsChecked = 0

  for (const driver of drivers) {
    const slug = driver.slug?.trim()
    if (!slug) continue
    const agg = byDriver.get(slug) ?? { wins: 0, podiums: 0, poles: 0, points: 0, raceKeys: new Set<string>() }

    winsChecked += 1
    if (toInt(driver.career_wins) !== agg.wins) {
      details.driverCareerWins.push({ driver_slug: slug, expected: agg.wins, actual: toInt(driver.career_wins) })
    }

    podiumsChecked += 1
    if (toInt(driver.career_podiums) !== agg.podiums) {
      details.driverCareerPodiums.push({ driver_slug: slug, expected: agg.podiums, actual: toInt(driver.career_podiums) })
    }

    polesChecked += 1
    if (toInt(driver.career_poles) !== agg.poles) {
      details.driverCareerPoles.push({ driver_slug: slug, expected: agg.poles, actual: toInt(driver.career_poles) })
    }

    startsChecked += 1
    if (toInt(driver.career_starts) !== agg.raceKeys.size) {
      details.driverCareerStarts.push({ driver_slug: slug, expected: agg.raceKeys.size, actual: toInt(driver.career_starts) })
    }

    pointsChecked += 1
    const expectedPoints = Number(agg.points.toFixed(3))
    const actualPoints = Number(toNum(driver.career_points).toFixed(3))
    if (Math.abs(actualPoints - expectedPoints) > 0.001) {
      details.driverCareerPoints.push({ driver_slug: slug, expected: expectedPoints, actual: actualPoints })
    }
  }

  const seasonYearById = new Map<string, number>()
  for (const season of seasons) {
    if (season.id && season.year != null) seasonYearById.set(season.id, Number(season.year))
  }

  const maxBySeason = new Map<string, { driver_id: string | null; points: number }>()
  for (const row of dssRows) {
    if (!row.season_id) continue
    const points = toNum(row.points)
    const current = maxBySeason.get(row.season_id)
    if (!current || points > current.points) {
      maxBySeason.set(row.season_id, { driver_id: row.driver_id, points })
    }
  }

  for (const season of seasons) {
    if (!season.id || !season.champion_driver_id) continue
    const expected = maxBySeason.get(season.id)?.driver_id ?? null
    if (expected !== season.champion_driver_id) {
      details.seasonChampions.push({
        season_id: season.id,
        year: toInt(season.year),
        expected_driver_id: expected,
        actual_driver_id: season.champion_driver_id,
      })
    }
  }

  for (const row of dssRows) {
    if (!row.season_id || !row.driver_id) continue
    const driverSlug = slugByDriverId.get(row.driver_id)
    const year = seasonYearById.get(row.season_id)
    if (!driverSlug || !year) continue
    const agg = driverSeasonAgg.get(`${driverSlug}:${year}`) ?? { wins: 0, podiums: 0, points: 0 }

    if (toInt(row.wins) !== agg.wins) {
      details.driverSeasonStats.push({
        row_id: row.id,
        driver_id: row.driver_id,
        season_id: row.season_id,
        field: 'wins',
        expected: agg.wins,
        actual: toInt(row.wins),
      })
    }
    if (toInt(row.podiums) !== agg.podiums) {
      details.driverSeasonStats.push({
        row_id: row.id,
        driver_id: row.driver_id,
        season_id: row.season_id,
        field: 'podiums',
        expected: agg.podiums,
        actual: toInt(row.podiums),
      })
    }
    const expectedPoints = Number(agg.points.toFixed(3))
    const actualPoints = Number(toNum(row.points).toFixed(3))
    if (Math.abs(actualPoints - expectedPoints) > 0.001) {
      details.driverSeasonStats.push({
        row_id: row.id,
        driver_id: row.driver_id,
        season_id: row.season_id,
        field: 'points',
        expected: expectedPoints,
        actual: actualPoints,
      })
    }
  }

  for (const race of races) {
    const key = race.id ? `id:${race.id}` : race.slug ? `slug:${race.slug}` : null
    if (!key || !race.winner_driver_id) continue
    const winnerSlug = raceWinnerByKey.get(key)
    const expectedWinnerId = winnerSlug ? driverBySlug.get(winnerSlug)?.id ?? null : null
    if (expectedWinnerId !== race.winner_driver_id) {
      details.raceWinners.push({
        race_id: race.id ?? null,
        race_slug: race.slug ?? null,
        expected_driver_id: expectedWinnerId,
        actual_driver_id: race.winner_driver_id,
      })
    }
  }

  const teamFields = ['race_wins', 'podiums', 'poles', 'total_points', 'seasons_active', 'championships']
  const teamFieldPresence = new Set<string>()
  for (const team of teams) {
    for (const field of teamFields) {
      if (Object.prototype.hasOwnProperty.call(team, field)) teamFieldPresence.add(field)
    }
  }

  const teamChampionshipsBySlug = new Map<string, number>()
  for (const season of seasons) {
    const championId = season.champion_team_id
    if (!championId) continue
    const team = teams.find((entry) => String(entry.id ?? '') === championId)
    const slug = team?.slug?.trim()
    if (!slug) continue
    teamChampionshipsBySlug.set(slug, (teamChampionshipsBySlug.get(slug) ?? 0) + 1)
  }

  for (const team of teams) {
    const slug = team.slug?.trim()
    if (!slug) continue
    const agg = constructorAgg.get(slug) ?? { wins: 0, podiums: 0, poles: 0, points: 0, seasons: new Set<number>() }
    for (const field of teamFieldPresence) {
      const actual = toNum(team[field] as number | string | null | undefined)
      let expected = 0
      if (field === 'race_wins') expected = agg.wins
      if (field === 'podiums') expected = agg.podiums
      if (field === 'poles') expected = agg.poles
      if (field === 'total_points') expected = Number(agg.points.toFixed(3))
      if (field === 'seasons_active') expected = agg.seasons.size
      if (field === 'championships') expected = teamChampionshipsBySlug.get(slug) ?? 0

      const mismatch =
        field === 'total_points' ? Math.abs(actual - expected) > 0.001 : Number(actual) !== Number(expected)
      if (mismatch) {
        details.teamCachedStats.push({ team_slug: slug, field, expected, actual })
      }
    }
  }

  const candidateDrivers = drivers
    .map((driver) => driver.slug?.trim())
    .filter((slug): slug is string => Boolean(slug))
    .sort((a, b) => a.localeCompare(b))
  const sampledDriverSlugs = candidateDrivers.slice(0, 10)
  for (const driverSlug of sampledDriverSlugs) {
    const rpcRes = await supabase.rpc('get_teammates', { p_driver_slug: driverSlug })
    if (rpcRes.error) {
      details.teammatesSanity.push({
        driver_slug: driverSlug,
        missing_in_rpc: [...(teammatesByDriver.get(driverSlug) ?? new Set<string>())],
        extra_in_rpc: [`RPC error: ${rpcRes.error.message}`],
      })
      continue
    }

    const expected = teammatesByDriver.get(driverSlug) ?? new Set<string>()
    const actual = new Set<string>(
      ((rpcRes.data ?? []) as Array<{ teammate_slug?: string | null }>)
        .map((row) => row.teammate_slug?.trim() ?? '')
        .filter(Boolean)
    )

    const missingInRpc = [...expected].filter((slug) => !actual.has(slug))
    const extraInRpc = [...actual].filter((slug) => !expected.has(slug))
    if (missingInRpc.length > 0 || extraInRpc.length > 0) {
      details.teammatesSanity.push({ driver_slug: driverSlug, missing_in_rpc: missingInRpc, extra_in_rpc: extraInRpc })
    }
  }

  const summary: AuditSummary = {
    driverCareerWins: { checked: winsChecked, mismatches: details.driverCareerWins.length },
    driverCareerPodiums: { checked: podiumsChecked, mismatches: details.driverCareerPodiums.length },
    driverCareerPoles: { checked: polesChecked, mismatches: details.driverCareerPoles.length },
    driverCareerStarts: { checked: startsChecked, mismatches: details.driverCareerStarts.length },
    driverCareerPoints: { checked: pointsChecked, mismatches: details.driverCareerPoints.length },
    seasonChampions: {
      checked: seasons.filter((s) => Boolean(s.champion_driver_id)).length,
      mismatches: details.seasonChampions.length,
    },
    teamCachedStats: {
      checked: teams.length * Math.max(teamFieldPresence.size, 1),
      mismatches: details.teamCachedStats.length,
    },
    driverSeasonStats: { checked: dssRows.length, mismatches: details.driverSeasonStats.length },
    raceWinners: {
      checked: races.filter((race) => Boolean(race.winner_driver_id)).length,
      mismatches: details.raceWinners.length,
    },
    teammatesSanity: {
      checked: sampledDriverSlugs.length,
      mismatches: details.teammatesSanity.length,
    },
  }

  const totalIssues =
    summary.driverCareerWins.mismatches +
    summary.driverCareerPodiums.mismatches +
    summary.driverCareerPoles.mismatches +
    summary.driverCareerStarts.mismatches +
    summary.driverCareerPoints.mismatches +
    summary.seasonChampions.mismatches +
    summary.teamCachedStats.mismatches +
    summary.driverSeasonStats.mismatches +
    summary.raceWinners.mismatches +
    summary.teammatesSanity.mismatches

  const date = new Date().toISOString()
  console.log('============================================')
  console.log(`F1REC DATA ACCURACY AUDIT — ${date}`)
  console.log('============================================')
  console.log(`Driver career_wins: ${summary.driverCareerWins.checked} checked, ${summary.driverCareerWins.mismatches} mismatches`)
  console.log(`Driver career_podiums: ${summary.driverCareerPodiums.checked} checked, ${summary.driverCareerPodiums.mismatches} mismatches`)
  console.log(`Driver career_poles: ${summary.driverCareerPoles.checked} checked, ${summary.driverCareerPoles.mismatches} mismatches`)
  console.log(`Driver career_starts: ${summary.driverCareerStarts.checked} checked, ${summary.driverCareerStarts.mismatches} mismatches`)
  console.log(`Driver career_points: ${summary.driverCareerPoints.checked} checked, ${summary.driverCareerPoints.mismatches} mismatches`)
  console.log(`Season champions: ${summary.seasonChampions.checked} checked, ${summary.seasonChampions.mismatches} mismatches`)
  console.log(`driver_season_stats: ${summary.driverSeasonStats.checked} checked, ${summary.driverSeasonStats.mismatches} mismatches`)
  console.log(`Race winners: ${summary.raceWinners.checked} checked, ${summary.raceWinners.mismatches} mismatches`)
  console.log(`Team cached stats: ${summary.teamCachedStats.checked} checked, ${summary.teamCachedStats.mismatches} mismatches`)
  console.log(`Teammates sanity: ${summary.teammatesSanity.checked} checked, ${summary.teammatesSanity.mismatches} mismatches`)
  console.log('============================================')
  console.log(totalIssues === 0 ? 'RESULT: ✅ ALL CLEAN' : `RESULT: ❌ ${totalIssues} ISSUES FOUND`)
  console.log('============================================')

  mkdirSync(SCRIPTS_DIR, { recursive: true })
  const outputPath = resolve(SCRIPTS_DIR, `data-accuracy-results-${sanitizeTimestamp(new Date())}.json`)
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: date,
        summary,
        details,
      },
      null,
      2
    ),
    'utf8'
  )
  console.log(`Detailed results written to ${outputPath}`)

  process.exit(totalIssues === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error('Data accuracy audit failed:', error)
  process.exit(1)
})
