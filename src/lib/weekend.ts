// Data for the race-weekend home page and the ticker. Every query is defensive: the 2026 tables still hold some
// duplicate rows (two Las Vegas races, sprint and race rows mixed), so races are deduplicated by date and results by
// (round, driver), keeping one row each.
import { createServerClient } from '@/lib/supabase/server'
import shapes from '@/data/circuit-shapes.json'

export type CircuitShape = { source: string; name: string; lengthM: number | null; opened: number | null; firstGp: number | null; d: string }

export type NextRace = {
  name: string
  round: number
  season: number
  date: string // YYYY-MM-DD
  time: string | null // HH:MM:SSZ
  startIso: string | null
  sprint: boolean
  circuitSlug: string | null
  circuitName: string | null
  locality: string | null
  country: string | null
  shape: CircuitShape | null
  roundsInSeason: number
  /** Races still to run this season, this one included. */
  racesLeft: number
}

export type Standing = {
  pos: number
  name: string
  slug: string
  code: string | null
  team: string | null
  teamSlug: string | null
  teamColour: string | null
  points: number
  wins: number
  form: number[]
}

export type PastWin = { season: number; winner: string; team: string | null; grid: number | null }

const one = <T,>(v: T | T[] | null | undefined): T | null => (v == null ? null : Array.isArray(v) ? v[0] ?? null : v)
const n = (v: unknown) => { const x = typeof v === 'number' ? v : Number.parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0 }

export function circuitShape(slug: string | null | undefined): CircuitShape | null {
  if (!slug) return null
  return (shapes as Record<string, CircuitShape>)[slug] ?? null
}

export async function getNextRace(now = new Date()): Promise<NextRace | null> {
  const sb = createServerClient()
  const today = now.toISOString().slice(0, 10)
  const { data } = await sb
    .from('races')
    .select('name, round, season_year, race_date, race_time, sprint_date, circuit_slug, circuits(name, locality, country)')
    .gte('race_date', today)
    .order('race_date', { ascending: true })
    .order('race_time', { ascending: false, nullsFirst: false })
    .limit(3)
  const row = (data ?? [])[0] as Record<string, unknown> | undefined
  if (!row) return null
  const c = one(row.circuits as { name: string; locality: string; country: string } | null)
  const season = Number(row.season_year)
  const { data: rounds } = await sb.from('races').select('race_date').eq('season_year', season)
  const dates = new Set((rounds ?? []).map((r: { race_date: string | null }) => r.race_date).filter(Boolean) as string[])
  const roundsInSeason = dates.size
  // Counted by date, not round number: the table has duplicate round numbers, so round arithmetic is off.
  const racesLeft = [...dates].filter((d) => d >= (row.race_date as string)).length
  const time = (row.race_time as string | null) ?? null
  const date = row.race_date as string
  return {
    name: row.name as string,
    round: Number(row.round),
    season,
    date,
    time,
    startIso: time ? `${date}T${time.replace(/Z$/, '')}Z` : null,
    sprint: Boolean(row.sprint_date),
    circuitSlug: (row.circuit_slug as string) ?? null,
    circuitName: c?.name ?? null,
    locality: c?.locality ?? null,
    country: c?.country ?? null,
    shape: circuitShape(row.circuit_slug as string),
    roundsInSeason,
    racesLeft,
  }
}

type ResultRow = { round: number; driver_slug: string; position: number | null; is_sprint: boolean | null; id: string }

export async function getStandings(season: number, limit = 10): Promise<Standing[]> {
  const sb = createServerClient()
  const { data: s } = await sb.from('seasons').select('id').eq('year', season).maybeSingle()
  if (!s) return []
  const { data } = await sb
    .from('driver_season_stats')
    .select('championship_position, points, wins, drivers(full_name, slug, code), teams(name, slug, primary_color)')
    .eq('season_id', s.id)
    .order('points', { ascending: false })
    .limit(limit)
  const rows = (data ?? []).map((r: Record<string, unknown>, i) => {
    const d = one(r.drivers as { full_name: string; slug: string; code: string | null })
    const t = one(r.teams as { name: string; slug: string; primary_color: string | null })
    return {
      pos: Number(r.championship_position) || i + 1,
      name: d?.full_name ?? '',
      slug: d?.slug ?? '',
      code: d?.code ?? null,
      team: t?.name ?? null,
      teamSlug: t?.slug ?? null,
      teamColour: t?.primary_color ?? null,
      points: n(r.points),
      wins: n(r.wins),
      form: [] as number[],
    }
  }).filter((r) => r.name)

  // Form: race finishing positions (not sprints) in the last five rounds with results.
  const { data: res } = await sb
    .from('results')
    .select('id, round, driver_slug, position, is_sprint')
    .eq('season_year', season)
    .in('driver_slug', rows.map((r) => r.slug))
    .order('round', { ascending: false })
    .limit(800)
  const seen = new Map<string, number>()
  const rounds = new Set<number>()
  for (const r of (res ?? []) as ResultRow[]) {
    if (r.is_sprint === true || r.position == null) continue
    const k = `${r.round}:${r.driver_slug}`
    if (seen.has(k)) continue
    seen.set(k, r.position)
    rounds.add(r.round)
  }
  const last = [...rounds].sort((a, b) => b - a).slice(0, 5).reverse()
  for (const row of rows) row.form = last.map((rd) => seen.get(`${rd}:${row.slug}`)).filter((x): x is number => x != null)
  return rows
}

export async function getWinsAtCircuit(circuitSlug: string | null): Promise<PastWin[]> {
  if (!circuitSlug) return []
  const sb = createServerClient()
  // Results join races by race_id: results.race_slug uses a different scheme ("2025-23-losail") from races.slug.
  const { data: races } = await sb.from('races').select('id').eq('circuit_slug', circuitSlug)
  const ids = (races ?? []).map((r: { id: string }) => r.id)
  if (!ids.length) return []
  const { data } = await sb
    .from('results')
    .select('season_year, driver_name, constructor_name, grid, position, is_sprint')
    .in('race_id', ids)
    .eq('position', 1)
  const bySeason = new Map<number, PastWin>()
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    if (r.is_sprint === true) continue
    const season = Number(r.season_year)
    if (!bySeason.has(season)) bySeason.set(season, { season, winner: String(r.driver_name ?? ''), team: (r.constructor_name as string) ?? null, grid: r.grid == null ? null : Number(r.grid) })
  }
  return [...bySeason.values()].sort((a, b) => b.season - a.season)
}

export async function getDriverCount(): Promise<number> {
  const { count } = await createServerClient().from('drivers').select('*', { count: 'exact', head: true })
  return count ?? 0
}

/** "Verstappen has won the last 3 races here" style streak from the newest winner backwards. */
export function winStreak(wins: PastWin[]): { name: string; count: number } | null {
  if (!wins.length) return null
  const first = wins[0].winner
  let count = 0
  for (const w of wins) { if (w.winner === first) count++; else break }
  return { name: first, count }
}

export const surname = (full: string) => full.trim().split(/\s+/).slice(-1)[0] ?? full
