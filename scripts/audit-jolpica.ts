/**
 * Cross-check F1Rec Supabase data vs Jolpica (Ergast-compatible) API.
 *
 * Run:
 *   npx tsx scripts/audit-jolpica.ts --quick   # WDC + constructors only (~2–3 min)
 *   npx tsx scripts/audit-jolpica.ts           # + race winners 2024–2026 + top-20 career wins
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 * Respects ~200 req/hr: 500ms between Jolpica calls, default cap 200 requests (see JOLPICA_MAX_REQUESTS).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1'
const JOLPICA_DELAY_MS = 500
/** Jolpica ~200/hr; override with JOLPICA_MAX_REQUESTS env if you run a second batch after waiting. */
const JOLPICA_MAX_REQUESTS = Number(process.env.JOLPICA_MAX_REQUESTS) || 200

let jolpicaBudgetExceeded = false

const SLUG_TO_JOLPICA: Record<string, string> = {
  'lewis-hamilton': 'hamilton',
  'max-verstappen': 'max_verstappen',
  'michael-schumacher': 'michael_schumacher',
  'ayrton-senna': 'senna',
  'alain-prost': 'prost',
  'sebastian-vettel': 'vettel',
  'fernando-alonso': 'alonso',
  'lando-norris': 'norris',
  'charles-leclerc': 'leclerc',
  'george-russell': 'russell',
  'kimi-antonelli': 'antonelli',
  'oscar-piastri': 'piastri',
  'carlos-sainz': 'sainz',
  'valtteri-bottas': 'bottas',
  'sergio-perez': 'perez',
  'nico-rosberg': 'rosberg',
  'jenson-button': 'button',
  'kimi-raikkonen': 'raikkonen',
  'nigel-mansell': 'mansell',
  'jackie-stewart': 'stewart',
}

let jolpicaRequests = 0
let lastJolpicaAt = 0

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function jolpicaFetch(url: string): Promise<Response> {
  if (jolpicaRequests >= JOLPICA_MAX_REQUESTS) {
    jolpicaBudgetExceeded = true
    throw new Error(`Jolpica request budget exceeded (${JOLPICA_MAX_REQUESTS}); stop to stay under ~200/hour.`)
  }
  const elapsed = Date.now() - lastJolpicaAt
  if (elapsed < JOLPICA_DELAY_MS) {
    await sleep(JOLPICA_DELAY_MS - elapsed)
  }
  lastJolpicaAt = Date.now()
  jolpicaRequests += 1
  return fetch(url)
}

async function jolpicaJson<T>(url: string): Promise<T | null> {
  try {
    const res = await jolpicaFetch(url)
    if (!res.ok) {
      console.warn(`Jolpica ${res.status}: ${url}`)
      return null
    }
    return (await res.json()) as T
  } catch (e) {
    console.warn(`Jolpica fetch error: ${url} — ${e}`)
    return null
  }
}

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function namesMatch(a: string, b: string): boolean {
  const x = normName(a)
  const y = normName(b)
  if (!x || !y) return false
  if (x === y) return true
  if (x.includes(y) || y.includes(x)) return true
  const ax = new Set(x.split(' ').filter((w) => w.length > 2))
  const by = new Set(y.split(' ').filter((w) => w.length > 2))
  let overlap = 0
  for (const w of ax) if (by.has(w)) overlap++
  return overlap >= 2 || (ax.size === 1 && by.has([...ax][0]!)) || (by.size === 1 && ax.has([...by][0]!))
}

type AnyMr = {
  MRData?: {
    total?: string
    limit?: string
    offset?: string
    StandingsTable?: {
      StandingsLists?: Array<{
        DriverStandings?: Array<{ position?: string; Driver?: { givenName?: string; familyName?: string } }>
        ConstructorStandings?: Array<{ position?: string; Constructor?: { name?: string } }>
      }>
    }
    RaceTable?: {
      Races?: Array<{
        season?: string
        round?: string
        Results?: Array<{ position?: string; Driver?: { givenName?: string; familyName?: string } }>
      }>
    }
  }
}

function parseWdcChampion(data: AnyMr | null): string {
  const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
  const row = standings.find((d) => String(d.position) === '1') ?? standings[0]
  const drv = row?.Driver
  return drv ? `${drv.givenName ?? ''} ${drv.familyName ?? ''}`.trim() : ''
}

function parseConstructorChampion(data: AnyMr | null): string {
  const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
  const row = standings.find((c) => String(c.position) === '1') ?? standings[0]
  return row?.Constructor?.name?.trim() ?? ''
}

function looksLikeErgastDriverId(id: string): boolean {
  const s = id.trim()
  if (!s || s.length > 64) return false
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return false
  return /^[a-z][a-z0-9_]*$/i.test(s)
}

/** Map known slugs or explicit Ergast-style ids only (no blind slug → API id). */
function getJolpicaDriverId(row: { slug?: string | null; ergast_driver_id?: string | null; driver_id?: string | null }): string | null {
  const slug = row.slug ?? ''
  if (SLUG_TO_JOLPICA[slug]) return SLUG_TO_JOLPICA[slug]
  const e = row.ergast_driver_id?.trim()
  if (e && looksLikeErgastDriverId(e)) return e
  const d = row.driver_id?.trim()
  if (d && d !== slug && looksLikeErgastDriverId(d)) return d
  return null
}

function countWinsFromDriverResultsJson(data: AnyMr | null): number {
  const races = data?.MRData?.RaceTable?.Races ?? []
  let wins = 0
  for (const race of races) {
    const res = race.Results ?? []
    if (res.some((x) => String(x.position) === '1')) wins++
  }
  return wins
}

async function fetchJolpicaCareerWinCount(jId: string): Promise<number> {
  const pageLimit = 1000
  let offset = 0
  let totalWins = 0
  let totalRaces = Number.POSITIVE_INFINITY

  while (offset < totalRaces) {
    const url = `${JOLPICA_BASE}/drivers/${encodeURIComponent(jId)}/results.json?limit=${pageLimit}&offset=${offset}`
    const json = await jolpicaJson<AnyMr>(url)
    if (!json) break
    const t = Number(json.MRData?.total)
    if (Number.isFinite(t) && t > 0) totalRaces = t
    const races = json.MRData?.RaceTable?.Races ?? []
    totalWins += countWinsFromDriverResultsJson(json)
    offset += races.length
    if (races.length === 0 || races.length < pageLimit) break
  }

  return totalWins
}

async function runQuick(supabase: SupabaseClient) {
  const wdc: Array<{ year: number; ours: string; jolpica: string; match: boolean }> = []
  const wcc: Array<{ year: number; ours: string; jolpica: string; match: boolean }> = []

  const { data: seasons } = await supabase
    .from('seasons')
    .select('year, champion_driver_id, champion_team_id')
    .order('year', { ascending: true })

  const driverIds = new Set<string>()
  const teamIds = new Set<string>()
  for (const s of seasons ?? []) {
    if (s.champion_driver_id) driverIds.add(s.champion_driver_id as string)
    if (s.champion_team_id) teamIds.add(s.champion_team_id as string)
  }

  const [{ data: drivers }, { data: teams }] = await Promise.all([
    driverIds.size
      ? supabase.from('drivers').select('id, full_name').in('id', [...driverIds])
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    teamIds.size
      ? supabase.from('teams').select('id, name').in('id', [...teamIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const driverName = new Map((drivers ?? []).map((d) => [d.id, d.full_name as string]))
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name as string]))

  for (const s of seasons ?? []) {
    const year = Number(s.year)
    if (!Number.isFinite(year)) continue

    if (s.champion_driver_id) {
      const ours = driverName.get(s.champion_driver_id as string) ?? '—'
      const url = `${JOLPICA_BASE}/${year}/driverStandings.json`
      const json = await jolpicaJson<AnyMr>(url)
      const jName = parseWdcChampion(json)
      const match = jName ? namesMatch(ours, jName) : false
      wdc.push({ year, ours, jolpica: jName || '(no data)', match: jName ? match : false })
    }

    if (s.champion_team_id) {
      const ours = teamName.get(s.champion_team_id as string) ?? '—'
      const url = `${JOLPICA_BASE}/${year}/constructorStandings.json`
      const json = await jolpicaJson<AnyMr>(url)
      const jName = parseConstructorChampion(json)
      const match = jName ? namesMatch(ours, jName) : false
      wcc.push({ year, ours, jolpica: jName || '(no data)', match: jName ? match : false })
    }
  }

  return { wdc, wcc }
}

async function runRaceWinners(supabase: SupabaseClient, years: number[]) {
  const rows: Array<{
    season_year: number
    round: number
    race_slug: string | null
    driver_name: string | null
    match: boolean
    jolpica: string
  }> = []

  const { data: results } = await supabase
    .from('results')
    .select('season_year, round, race_slug, driver_name')
    .eq('position', 1)
    .eq('is_sprint', false)
    .in('season_year', years)

  const byKey = new Map<string, string>()
  for (const r of results ?? []) {
    const y = Number(r.season_year)
    const round = Number(r.round)
    if (!Number.isFinite(y) || !Number.isFinite(round)) continue
    const key = `${y}-${round}`
    if (!byKey.has(key) && r.driver_name) byKey.set(key, r.driver_name as string)
  }

  for (const [key, ours] of byKey) {
    const [ys, rs] = key.split('-')
    const year = Number(ys)
    const round = Number(rs)
    const url = `${JOLPICA_BASE}/${year}/${round}/results.json`
    const json = await jolpicaJson<AnyMr>(url)
    const races = json?.MRData?.RaceTable?.Races ?? []
    const race = races[0]
    const winner = race?.Results?.find((x) => x.position === '1' || x.position === 1)
    const jName = winner?.Driver ? `${winner.Driver.givenName ?? ''} ${winner.Driver.familyName ?? ''}`.trim() : ''
    rows.push({
      season_year: year,
      round,
      race_slug: null,
      driver_name: ours,
      jolpica: jName || '(no data)',
      match: jName ? namesMatch(ours, jName) : false,
    })
  }

  rows.sort((a, b) => a.season_year - b.season_year || a.round - b.round)
  return rows
}

async function runCareerWins(supabase: SupabaseClient) {
  const out: Array<{
    slug: string | null
    full_name: string
    f1recWins: number
    jolpicaWins: number | null
    skipped: boolean
    note?: string
  }> = []

  const { data: top, error } = await supabase
    .from('drivers')
    .select('full_name, slug, ergast_driver_id, driver_id, career_wins')
    .order('career_wins', { ascending: false, nullsFirst: false })
    .limit(20)

  if (error || !top?.length) {
    const { data: agg } = await supabase.from('driver_season_stats').select('driver_id, wins, drivers(full_name, slug)')

    const sums = new Map<string, { wins: number; row: Record<string, unknown> }>()
    for (const r of agg ?? []) {
      const id = r.driver_id as string
      const w = Number(r.wins) || 0
      const cur = sums.get(id)
      if (!cur) sums.set(id, { wins: w, row: r as unknown as Record<string, unknown> })
      else cur.wins += w
    }
    const sorted = [...sums.entries()].sort((a, b) => b[1].wins - a[1].wins).slice(0, 20)

    for (const [, { wins, row }] of sorted) {
      const dr = (row as { drivers?: { full_name?: string; slug?: string } | null }).drivers
      const d = Array.isArray(dr) ? dr[0] : dr
      const full_name = d?.full_name ?? '—'
      const slug = d?.slug ?? null
      const jId = getJolpicaDriverId({ slug, ergast_driver_id: null, driver_id: null })
      if (!jId) {
        out.push({ slug, full_name, f1recWins: wins, jolpicaWins: null, skipped: true, note: 'no Jolpica id mapping' })
        continue
      }
      const jWins = await fetchJolpicaCareerWinCount(jId)
      out.push({
        slug,
        full_name,
        f1recWins: wins,
        jolpicaWins: jWins,
        skipped: false,
        note: Math.abs(wins - jWins) > 1 ? 'diff > 1' : Math.abs(wins - jWins) === 1 ? 'diff 1 (recent race?)' : undefined,
      })
    }
    return out
  }

  for (const d of top) {
    const row = d as {
      full_name?: string
      slug?: string
      ergast_driver_id?: string
      driver_id?: string
      career_wins?: number | string
    }
    const f1recWins = Number(row.career_wins) || 0
    const jId = getJolpicaDriverId({
      slug: row.slug ?? null,
      ergast_driver_id: row.ergast_driver_id ?? null,
      driver_id: row.driver_id ?? null,
    })
    if (!jId) {
      out.push({
        slug: row.slug ?? null,
        full_name: row.full_name ?? '—',
        f1recWins,
        jolpicaWins: null,
        skipped: true,
        note: 'no Jolpica id mapping',
      })
      continue
    }
    const jWins = await fetchJolpicaCareerWinCount(jId)
    out.push({
      slug: row.slug ?? null,
      full_name: row.full_name ?? '—',
      f1recWins,
      jolpicaWins: jWins,
      skipped: false,
      note: Math.abs(f1recWins - jWins) > 1 ? 'diff > 1' : Math.abs(f1recWins - jWins) === 1 ? 'diff 1' : undefined,
    })
  }

  return out
}

function writeReports(payload: Record<string, unknown>, text: string) {
  const dir = resolve(process.cwd(), 'scripts')
  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    /* ok */
  }
  writeFileSync(resolve(dir, 'jolpica-audit-report.json'), JSON.stringify(payload, null, 2), 'utf8')
  writeFileSync(resolve(dir, 'jolpica-audit-report.txt'), text, 'utf8')
  console.log('Wrote scripts/jolpica-audit-report.json')
  console.log('Wrote scripts/jolpica-audit-report.txt')
}

async function main() {
  jolpicaBudgetExceeded = false
  const quick = process.argv.includes('--quick')
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log(quick ? 'Mode: --quick (WDC + constructors only)' : 'Mode: full (+ race winners + career wins)')
  const { wdc, wcc } = await runQuick(supabase)

  let raceWinners: Awaited<ReturnType<typeof runRaceWinners>> = []
  let career: Awaited<ReturnType<typeof runCareerWins>> = []

  if (!quick) {
    raceWinners = await runRaceWinners(supabase, [2024, 2025, 2026])
    career = await runCareerWins(supabase)
  }

  const wdcMatch = wdc.filter((x) => x.match).length
  const wccMatch = wcc.filter((x) => x.match).length
  const rwMatch = raceWinners.filter((x) => x.match).length

  const lines: string[] = [
    `F1REC vs JOLPICA CROSS-REFERENCE — ${new Date().toISOString()}`,
    '==========================================',
    '',
    `Jolpica HTTP requests used: ${jolpicaRequests} (limit ${JOLPICA_MAX_REQUESTS})`,
    '',
    'CHAMPIONSHIP WINNERS (seasons with champion_driver_id in DB):',
    `  ${wdcMatch} of ${wdc.length} match`,
    ...wdc
      .filter((x) => !x.match)
      .map((x) => `  ❌ ${x.year}: F1Rec "${x.ours}" vs Jolpica "${x.jolpica}"`),
    '',
    'CONSTRUCTOR CHAMPIONS:',
    `  ${wccMatch} of ${wcc.length} match`,
    ...wcc
      .filter((x) => !x.match)
      .map((x) => `  ❌ ${x.year}: F1Rec "${x.ours}" vs Jolpica "${x.jolpica}"`),
    '',
  ]

  if (!quick) {
    lines.push('RACE WINNERS (2024–2026, unique round keys from results):', `  ${rwMatch} of ${raceWinners.length} match`, '')
    for (const r of raceWinners.filter((x) => !x.match)) {
      lines.push(`  ❌ ${r.season_year} R${r.round}: F1Rec "${r.driver_name}" vs Jolpica "${r.jolpica}"`)
    }
    lines.push('', 'CAREER WINS (top 20):', '')
    for (const c of career) {
      if (c.skipped) {
        lines.push(`  ⚠️ ${c.full_name}: skipped (${c.note})`)
      } else {
        const diff = c.jolpicaWins != null ? c.f1recWins - c.jolpicaWins : 0
        const icon = c.jolpicaWins == null ? '❓' : Math.abs(diff) <= 1 ? '✅' : '❌'
        lines.push(`  ${icon} ${c.full_name}: F1Rec=${c.f1recWins}, Jolpica=${c.jolpicaWins}${c.note ? ` — ${c.note}` : ''}`)
      }
    }
    lines.push('')
  }

  const mismatches =
    wdc.filter((x) => !x.match).length +
    wcc.filter((x) => !x.match).length +
    (quick ? 0 : raceWinners.filter((x) => !x.match).length + career.filter((c) => !c.skipped && c.jolpicaWins != null && Math.abs(c.f1recWins - c.jolpicaWins!) > 1).length)

  lines.push('SUMMARY:', `  Total Jolpica requests: ${jolpicaRequests}`, `  Mismatch rows (approx): ${mismatches}`, '')
  if (jolpicaBudgetExceeded) {
    lines.push(
      'NOTE: Jolpica request budget was reached — some later checks may be incomplete. Wait ~1 hour or set JOLPICA_MAX_REQUESTS and re-run.',
      ''
    )
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    quick,
    jolpicaRequests,
    jolpicaBudgetExceeded,
    wdc,
    wcc,
    raceWinners: quick ? [] : raceWinners,
    careerWins: quick ? [] : career,
  }

  writeReports(payload, lines.join('\n'))

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
