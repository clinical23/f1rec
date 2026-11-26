import { createServerClient } from '@/lib/supabase/server'
import TeamsClient, { type Team } from './TeamsClient'

/** Rebuilt hourly. */
export const revalidate = 3600

type StatRow = { team_id: string; season_id: string; wins: number | null; podiums: number | null; poles: number | null; points: number | null; championship_position: number | null }

export default async function TeamsPage() {
  const supabase = createServerClient()
  const [teamsRes, seasonsRes, ...statPages] = await Promise.all([
    supabase.from('teams').select('id, slug, name, base, founded_year, championships, primary_color').limit(1000),
    supabase.from('seasons').select('id, year'),
    ...[0, 1000, 2000].map((from) =>
      supabase.from('team_season_stats').select('team_id, season_id, wins, podiums, poles, points, championship_position').range(from, from + 999)
    ),
  ])
  const yearOf = new Map((seasonsRes.data ?? []).map((s) => [s.id as string, s.year as number]))
  const stats = statPages.flatMap((p) => (p.data ?? []) as StatRow[])
  const latestYear = Math.max(0, ...stats.map((s) => yearOf.get(s.season_id) ?? 0))

  const agg = new Map<string, { wins: number; podiums: number; poles: number; seasons: number; first: number; last: number; pos: number | null; pts: number | null }>()
  for (const s of stats) {
    const y = yearOf.get(s.season_id) ?? 0
    const a = agg.get(s.team_id) ?? { wins: 0, podiums: 0, poles: 0, seasons: 0, first: 9999, last: 0, pos: null, pts: null }
    a.wins += s.wins ?? 0
    a.podiums += s.podiums ?? 0
    a.poles += s.poles ?? 0
    a.seasons += 1
    a.first = Math.min(a.first, y)
    a.last = Math.max(a.last, y)
    if (y === latestYear) { a.pos = s.championship_position; a.pts = s.points }
    agg.set(s.team_id, a)
  }

  const teams: Team[] = (teamsRes.data ?? []).map((t) => {
    const a = agg.get(t.id as string)
    return {
      id: t.id as string,
      slug: t.slug as string,
      name: t.name as string,
      base: (t.base as string | null) ?? null,
      championships: Number(t.championships ?? 0),
      color: (t.primary_color as string | null) ?? null,
      wins: a?.wins ?? 0,
      podiums: a?.podiums ?? 0,
      poles: a?.poles ?? 0,
      seasons: a?.seasons ?? 0,
      first: a && a.first < 9999 ? a.first : (t.founded_year as number | null) ?? null,
      last: a?.last || null,
      current: a?.last === latestYear,
      position: a?.last === latestYear ? a.pos : null,
      points: a?.last === latestYear ? a.pts : null,
    }
  })

  return <TeamsClient initialTeams={teams} season={latestYear || new Date().getFullYear()} />
}
