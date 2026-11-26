import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'
import PageHead from '@/components/page/PageHead'
import type { CSSProperties } from 'react'
import { SITE_URL } from '@/lib/site'

type PageProps = {
  params: Promise<{ slug: string }>
}

type SeasonRow = {
  id: string
  year: number
  slug: string
  rounds: number | null
  champion_driver_id: string | null
  champion_team_id: string | null
}

type RaceWinnerQueryRow = {
  season_year: number | null
  round: number | null
  position: number | null
  races: { slug: string | null; name: string | null; race_date: string | null; round: number | null } | Array<{ slug: string | null; name: string | null; race_date: string | null; round: number | null }> | null
  drivers: { slug: string | null; full_name: string | null } | Array<{ slug: string | null; full_name: string | null }> | null
  teams: { slug: string | null; name: string | null } | Array<{ slug: string | null; name: string | null }> | null
}

type RaceWinnerRow = {
  season_year: number | null
  round: number | null
  race_slug: string | null
  race_name: string | null
  race_date: string | null
  driver_slug: string | null
  driver_name: string | null
  constructor_slug: string | null
  constructor_name: string | null
}

function unwrapRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

async function getSeason(slug: string) {
  const supabase = createServerClient()
  return supabase
    .from('seasons')
    .select('id, year, slug, rounds, champion_driver_id, champion_team_id')
    .eq('slug', slug)
    .maybeSingle<SeasonRow>()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { data: season } = await getSeason(slug)

  if (!season) {
    return {
      title: 'Season Not Found',
      description: 'The requested Formula 1 season could not be found.',
    }
  }

  return {
    title: `${season.year} F1 Season: Standings and Every Race`,
    description: `The ${season.year} Formula 1 season: final drivers' and constructors' standings and the winner of every race.`,
    alternates: { canonical: `/seasons/${season.slug}` },
  }
}

export default async function SeasonDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServerClient()

  const { data: season } = await getSeason(slug)
  if (!season) notFound()

  const isCompleted = Boolean(season.champion_driver_id)
  const isOngoing = !isCompleted

  const [champDriverRes, champTeamRes, raceWinnersRes, driverStandingsRes, constructorStandingsRes, , , adjacentSeasonsRes] = await Promise.all([
    season.champion_driver_id
      ? supabase.from('drivers').select('full_name, slug').eq('id', season.champion_driver_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    season.champion_team_id
      ? supabase.from('teams').select('name, slug, primary_color').eq('id', season.champion_team_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('results')
      .select('season_year, round, position, drivers!inner(slug, full_name), teams(slug, name), races!inner(slug, name, race_date, round)')
      .eq('position', 1)
      .eq('session_type', 'race')
      .eq('season_year', season.year)
      .order('round', { ascending: true }),
    supabase
      .from('driver_season_stats')
      .select('id, championship_position, points, wins, podiums, drivers!inner(full_name, slug), teams!inner(name, slug, primary_color)')
      .eq('season_id', season.id),
    supabase
      .from('team_season_stats')
      .select('id, championship_position, points, wins, podiums, teams!inner(name, slug, primary_color)')
      .eq('season_id', season.id),
    supabase
      .from('results')
      .select('driver_slug, driver_name, position')
      .eq('season_year', season.year)
      .eq('position', 1)
      .eq('session_type', 'race'),
    supabase
      .from('results')
      .select('constructor_slug, constructor_name, position')
      .eq('season_year', season.year)
      .eq('position', 1)
      .eq('session_type', 'race'),
    supabase
      .from('seasons')
      .select('slug, year')
      .in('year', [season.year - 1, season.year + 1])
      .order('year', { ascending: true }),
  ])
  const { data: calendarRows } = await supabase.from('races').select('slug, name, race_date').eq('season_year', season.year).order('race_date', { ascending: true })

  const championDriver = champDriverRes.data
  const championTeam = champTeamRes.data

  const seenRounds = new Set<number>()
  const raceWinners = ((raceWinnersRes.data ?? []) as RaceWinnerQueryRow[])
    .map((row): RaceWinnerRow => {
      const race = unwrapRelation(row.races)
      const driver = unwrapRelation(row.drivers)
      const team = unwrapRelation(row.teams)
      return {
        season_year: row.season_year ?? season.year,
        round: race?.round ?? row.round ?? null,
        race_slug: race?.slug ?? null,
        race_name: race?.name ?? null,
        race_date: race?.race_date ?? null,
        driver_slug: driver?.slug ?? null,
        driver_name: driver?.full_name ?? null,
        constructor_slug: team?.slug ?? null,
        constructor_name: team?.name ?? null,
      }
    })
    .filter((row) => {
      const round = row.round
      if (typeof round !== 'number') return false
      if (seenRounds.has(round)) return false
      seenRounds.add(round)
      return true
    })

  const driverStandings = (driverStandingsRes.data ?? [])
    .slice()
    .sort((a, b) => {
      const aPos = a.championship_position ?? Number.MAX_SAFE_INTEGER
      const bPos = b.championship_position ?? Number.MAX_SAFE_INTEGER
      if (aPos !== bPos) return aPos - bPos
      return Number(b.points ?? 0) - Number(a.points ?? 0)
    })

  const constructorStandings = (constructorStandingsRes.data ?? [])
    .slice()
    .sort((a, b) => {
      const aPos = a.championship_position ?? Number.MAX_SAFE_INTEGER
      const bPos = b.championship_position ?? Number.MAX_SAFE_INTEGER
      if (aPos !== bPos) return aPos - bPos
      return Number(b.points ?? 0) - Number(a.points ?? 0)
    })

  const prevSeason = (adjacentSeasonsRes.data ?? []).find((s) => s.year === season.year - 1)
  const nextSeason = (adjacentSeasonsRes.data ?? []).find((s) => s.year === season.year + 1)

  const seasonPageUrl = `${SITE_URL}/seasons/${season.slug}`

  const one = <T,>(v: T | T[] | null | undefined): T | null => (v == null ? null : Array.isArray(v) ? v[0] ?? null : v)
  const tc = (c?: string | null) => ({ '--tc': c ? (c.startsWith('#') ? c : `#${c}`) : undefined }) as CSSProperties
  const winnerBySlug = new Map(raceWinners.map((w) => [w.race_slug, w]))
  const calendar = ((calendarRows ?? []) as { slug: string; name: string; race_date: string | null }[]).map((r, i) => ({ ...r, round: i + 1, winner: winnerBySlug.get(r.slug) ?? null }))
  const raced = calendar.filter((r) => r.winner).length
  const leader = driverStandings[0]
  const leaderDriver = leader ? one(leader.drivers as unknown as { full_name: string; slug: string } | { full_name: string; slug: string }[]) : null
  const second = driverStandings[1]
  const gap = leader && second ? Math.round(Number(leader.points ?? 0) - Number(second.points ?? 0)) : null
  const topTeam = constructorStandings[0]
  const topTeamRow = topTeam ? one(topTeam.teams as unknown as { name: string; slug: string } | { name: string; slug: string }[]) : null
  const champName = championDriver?.full_name ?? (isCompleted ? leaderDriver?.full_name : null) ?? null

  const lede = isCompleted && champName
    ? <>{champName} won the drivers&apos; title{championTeam?.name ? <>, {championTeam.name} the constructors&apos;</> : null}.</>
    : leaderDriver
      ? <>{leaderDriver.full_name} leads{gap != null && second ? <> by {gap} points</> : null}{calendar.length ? <> with {calendar.length - raced} of {calendar.length} races to go</> : null}.</>
      : <>The {season.year} Formula 1 world championship.</>

  return (
    <main className="pg">
      <JsonLd
        id={`season-jsonld-${season.slug}`}
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${season.year} Formula 1 Season`,
          description: `Results, standings and every race of the ${season.year} F1 season.`,
          url: seasonPageUrl,
        }}
      />
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Seasons', href: '/seasons' }, { label: String(season.year) }]}
        title={season.year}
        small={isOngoing ? 'in progress' : undefined}
        lede={lede}
        stats={[
          { value: calendar.length || season.rounds || raced, label: 'races' },
          ...(champName ? [{ value: champName.split(' ').at(-1) ?? '', label: isCompleted ? 'world champion' : 'leading', sig: true }] : leaderDriver ? [{ value: leaderDriver.full_name.split(' ').at(-1) ?? '', label: 'leading', sig: true }] : []),
          ...(championTeam?.name ? [{ value: championTeam.name, label: 'constructors’ champion' }] : topTeamRow && !isCompleted ? [{ value: topTeamRow.name, label: 'top team' }] : []),
        ]}
      />
      <div className="pg-body">
        <div className="pg-grid2">
          <div>
            <section aria-labelledby="dr-h">
              <div className="pb-ph"><h2 className="pg-h2" id="dr-h">Drivers&apos; championship</h2></div>
              {driverStandings.length ? (
                <div className="pg-scroll">
                  <table className="pg-table">
                    <thead><tr><th className="n">Pos</th><th>Driver</th><th className="hide-sm">Team</th><th className="n">Wins</th><th className="n hide-sm">Podiums</th><th className="n">Points</th></tr></thead>
                    <tbody>
                      {driverStandings.map((r, i) => {
                        const d = one(r.drivers as unknown as { full_name: string; slug: string } | { full_name: string; slug: string }[])
                        const t = one(r.teams as unknown as { name: string; slug: string; primary_color?: string | null } | { name: string; slug: string; primary_color?: string | null }[])
                        return (
                          <tr key={r.id} className={i === 0 ? 'p1' : undefined} style={tc(t?.primary_color)}>
                            <td className="pos n">{r.championship_position ?? i + 1}</td>
                            <td>{d ? <Link href={`/drivers/${d.slug}`}>{d.full_name}</Link> : '—'}<span className="sub show-sm">{t?.name}</span></td>
                            <td className="hide-sm"><span className="tc" aria-hidden="true" />{t ? <Link href={`/teams/${t.slug}`} style={{ fontWeight: 500 }}>{t.name}</Link> : '—'}</td>
                            <td className="n">{r.wins ?? 0}</td>
                            <td className="n hide-sm">{r.podiums ?? 0}</td>
                            <td className="n">{Math.round(Number(r.points ?? 0) * 10) / 10}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="pg-empty">No standings for this season yet.</p>}
            </section>

            {constructorStandings.length > 0 && (
              <section className="pg-sec" aria-labelledby="con-h">
                <div className="pb-ph"><h2 className="pg-h2" id="con-h">Constructors&apos; championship</h2></div>
                <div className="pg-scroll">
                  <table className="pg-table">
                    <thead><tr><th className="n">Pos</th><th>Team</th><th className="n">Wins</th><th className="n hide-sm">Podiums</th><th className="n">Points</th></tr></thead>
                    <tbody>
                      {constructorStandings.map((r, i) => {
                        const t = one(r.teams as unknown as { name: string; slug: string; primary_color?: string | null } | { name: string; slug: string; primary_color?: string | null }[])
                        return (
                          <tr key={r.id} className={i === 0 ? 'p1' : undefined} style={tc(t?.primary_color)}>
                            <td className="pos n">{r.championship_position ?? i + 1}</td>
                            <td><span className="tc" aria-hidden="true" />{t ? <Link href={`/teams/${t.slug}`}>{t.name}</Link> : '—'}</td>
                            <td className="n">{r.wins ?? 0}</td>
                            <td className="n hide-sm">{r.podiums ?? 0}</td>
                            <td className="n">{Math.round(Number(r.points ?? 0) * 10) / 10}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {season.year < 1958 && <p className="pg-note">There was no constructors&apos; championship before 1958.</p>}
          </div>

          <aside className="pg-side" aria-label="Races this season">
            <div className="pg-panel">
              <div className="pb-ph"><h2 className="pg-h2" style={{ fontSize: 28 }}>Every race</h2></div>
              <div className="pg-list">
                {calendar.map((r) => (
                  <Link key={r.slug} href={`/races/${r.slug}`}>
                    <b style={{ fontWeight: 700 }}>{r.round}. {r.name.replace(/ Grand Prix$/i, ' GP')}</b>
                    <span>{r.winner?.driver_name ?? (r.race_date ? new Date(r.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')}</span>
                  </Link>
                ))}
              </div>
            </div>
            <nav className="pg-panel" aria-label="Other seasons">
              <div className="pg-list">
                {prevSeason && <Link href={`/seasons/${prevSeason.slug}`}><b>{prevSeason.year}</b><span>Previous season</span></Link>}
                {nextSeason && <Link href={`/seasons/${nextSeason.slug}`}><b>{nextSeason.year}</b><span>Next season</span></Link>}
                <Link href="/seasons"><b>All seasons</b><span>1950 to now</span></Link>
              </div>
            </nav>
          </aside>
        </div>
      </div>
    </main>
  )
}
