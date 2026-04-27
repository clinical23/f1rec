import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'
import SeasonSidebar from '@/components/seasons/SeasonSidebar'

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

function formatDate(value: string | null) {
  if (!value) return 'TBC'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { data: season } = await getSeason(slug)

  if (!season) {
    return {
      title: 'Season Not Found | F1Rec',
      description: 'The requested Formula 1 season could not be found.',
    }
  }

  return {
    title: `${season.year} Formula 1 Season Results & Standings | F1Rec`,
    description: `Complete ${season.year} Formula 1 season overview with race winners, driver standings, and constructor standings.`,
  }
}

export default async function SeasonDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServerClient()

  const { data: season } = await getSeason(slug)
  if (!season) notFound()

  const isCompleted = Boolean(season.champion_driver_id)
  const isOngoing = !isCompleted

  const [champDriverRes, champTeamRes, raceWinnersRes, driverStandingsRes, constructorStandingsRes, topDriversRawRes, topConstructorsRawRes, adjacentSeasonsRes] = await Promise.all([
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
      .eq('is_sprint', false)
      .eq('season_year', season.year)
      .order('round', { ascending: true }),
    supabase
      .from('driver_season_stats')
      .select('id, championship_position, points, wins, podiums, drivers!inner(full_name, slug), teams!inner(name, slug)')
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
      .eq('is_sprint', false),
    supabase
      .from('results')
      .select('constructor_slug, constructor_name, position')
      .eq('season_year', season.year)
      .eq('position', 1)
      .eq('is_sprint', false),
    supabase
      .from('seasons')
      .select('slug, year')
      .in('year', [season.year - 1, season.year + 1])
      .order('year', { ascending: true }),
  ])

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
  const completedRaceWinners = raceWinners.filter((row) => row.driver_slug || row.driver_name)

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

  const driverWinsMap = new Map<string, { slug: string; name: string; count: number }>()
  for (const row of topDriversRawRes.data ?? []) {
    if (row.position !== 1) continue
    if (!row.driver_slug || !row.driver_name) continue
    const existing = driverWinsMap.get(row.driver_slug) ?? { slug: row.driver_slug, name: row.driver_name, count: 0 }
    existing.count += 1
    driverWinsMap.set(row.driver_slug, existing)
  }
  const topDrivers = [...driverWinsMap.values()].sort((a, b) => b.count - a.count).slice(0, 3)

  const constructorWinsMap = new Map<string, { slug: string; name: string; count: number }>()
  for (const row of topConstructorsRawRes.data ?? []) {
    if (row.position !== 1) continue
    if (!row.constructor_slug || !row.constructor_name) continue
    const existing = constructorWinsMap.get(row.constructor_slug) ?? {
      slug: row.constructor_slug,
      name: row.constructor_name,
      count: 0,
    }
    existing.count += 1
    constructorWinsMap.set(row.constructor_slug, existing)
  }
  const topConstructors = [...constructorWinsMap.values()].sort((a, b) => b.count - a.count).slice(0, 3)

  const prevSeason = (adjacentSeasonsRes.data ?? []).find((s) => s.year === season.year - 1)
  const nextSeason = (adjacentSeasonsRes.data ?? []).find((s) => s.year === season.year + 1)

  const seasonPageUrl = `https://f1rec.com/seasons/${season.slug}`

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <JsonLd
        id={`season-jsonld-${season.slug}`}
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${season.year} Formula 1 Season`,
          description: `Complete results, standings, and statistics for the ${season.year} F1 season.`,
          url: seasonPageUrl,
        }}
      />
      <header className="mx-auto max-w-7xl px-4 py-12">
        <Link href="/seasons" className="mb-6 inline-flex text-sm text-[var(--muted)] no-underline hover:text-[var(--text)]">
          ← All Seasons
        </Link>
        <div className="mb-3 text-sm uppercase tracking-widest text-[var(--accent)]">Formula 1 World Championship</div>
        <h1 className="font-display text-7xl font-bold leading-[1.05] tracking-tight">{season.year}</h1>
        <div className="mt-4 text-base text-[var(--muted)]">
          {season.rounds ?? completedRaceWinners.length} rounds
          {isOngoing ? (
            <span className="ml-3 inline-flex items-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-xs uppercase tracking-widest text-[var(--accent)]">
              In Progress
            </span>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-8">
        {isCompleted ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {championDriver ? (
              <Link href={championDriver.slug ? `/drivers/${championDriver.slug}` : '#'} className="group rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-6 no-underline transition-colors hover:border-[var(--gold)]">
                <div className="text-xs uppercase tracking-widest text-[var(--gold)]">World Drivers&apos; Champion</div>
                <div className="mt-2 font-display text-3xl font-bold text-[var(--text)]">{championDriver.full_name ?? '—'}</div>
              </Link>
            ) : null}
            {championTeam ? (
              <Link href={championTeam.slug ? `/teams/${championTeam.slug}` : '#'} className="group rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-6 no-underline transition-colors hover:border-[var(--gold)]">
                <div className="text-xs uppercase tracking-widest text-[var(--gold)]">World Constructors&apos; Champion</div>
                <div
                  className="mt-2 font-display text-3xl font-bold"
                  style={{ color: (championTeam as { primary_color?: string | null }).primary_color || 'var(--text)' }}
                >
                  {championTeam.name ?? '—'}
                </div>
              </Link>
            ) : null}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {topDrivers[0] ? (
              <div className="blog-card">
                <div className="blog-card__eyebrow">Drivers&apos; Standings Leader</div>
                <Link href={`/drivers/${topDrivers[0].slug}`} className="blog-card__title no-underline hover:text-[var(--accent)]">
                  {topDrivers[0].name}
                </Link>
                <div className="blog-card__meta">{topDrivers[0].count} wins so far</div>
              </div>
            ) : null}
            {topConstructors[0] ? (
              <div className="blog-card">
                <div className="blog-card__eyebrow">Constructors&apos; Standings Leader</div>
                <Link href={`/teams/${topConstructors[0].slug}`} className="blog-card__title no-underline hover:text-[var(--accent)]">
                  {topConstructors[0].name}
                </Link>
                <div className="blog-card__meta">{topConstructors[0].count} wins so far</div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="blog-layout">
          <div className="blog-layout__main">
        <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '0.1em', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem' }}>
          Race Winners
        </h2>
        {completedRaceWinners.length > 0 ? (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Round', 'Race', 'Date', 'Winner', 'Team'].map((h) => (
                    <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: h === 'Round' ? 'right' : 'left', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600, fontSize: '0.68rem' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completedRaceWinners.map((row) => (
                  <tr key={`${row.season_year}-${row.round}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>
                      R{row.round}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text)' }}>
                      {row.race_slug ? (
                        <Link href={`/races/${row.race_slug}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                          {row.race_name ?? row.race_slug}
                        </Link>
                      ) : (
                        row.race_name ?? row.race_slug ?? '—'
                      )}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--muted)' }}>
                      {formatDate(row.race_date)}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      {row.driver_slug?.trim() ? (
                        <Link href={`/drivers/${row.driver_slug.trim()}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 700 }}>
                          {row.driver_name ?? '—'}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text)' }}>{row.driver_name ?? '—'}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--muted)' }}>
                      {row.constructor_slug?.trim() ? (
                        <Link href={`/teams/${row.constructor_slug.trim()}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                          {row.constructor_name?.trim() || row.constructor_slug.trim()}
                        </Link>
                      ) : (
                        row.constructor_name?.trim() || '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>No race winner data available for this season.</p>
        )}

        <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '0.1em', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem' }}>
          Driver Standings
        </h2>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                {['Pos', 'Driver', 'Team', 'Points', 'Wins', 'Podiums'].map((h) => (
                  <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: h === 'Driver' || h === 'Team' ? 'left' : 'right', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600, fontSize: '0.68rem' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {driverStandings.map((row, idx) => {
                const driver = Array.isArray(row.drivers) ? row.drivers[0] : row.drivers
                const team = Array.isArray(row.teams) ? row.teams[0] : row.teams
                const driverSlug = driver?.slug
                const driverLabel = driver?.full_name ?? '—'
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: Number(row.championship_position) === 1 ? 'var(--gold)' : 'var(--muted)' }}>
                      {row.championship_position ?? idx + 1}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      {driverSlug ? (
                        <Link href={`/drivers/${driverSlug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 700 }}>
                          {driverLabel}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text)', fontWeight: 700 }}>{driverLabel}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--muted)' }}>{team?.name ?? '—'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)' }}>{Number(row.points ?? 0).toLocaleString()}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)' }}>{row.wins ?? 0}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)' }}>{row.podiums ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '0.1em', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem' }}>
          Constructor Standings
        </h2>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                {['Pos', 'Team', 'Points', 'Wins', 'Podiums'].map((h) => (
                  <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: h === 'Team' ? 'left' : 'right', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600, fontSize: '0.68rem' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {constructorStandings.map((row, idx) => {
                const team = Array.isArray(row.teams) ? row.teams[0] : row.teams
                const teamSlug = team?.slug
                const teamLabel = team?.name ?? '—'
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: Number(row.championship_position) === 1 ? 'var(--gold)' : 'var(--muted)' }}>
                      {row.championship_position ?? idx + 1}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      {teamSlug ? (
                        <Link href={`/teams/${teamSlug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 700 }}>
                          {teamLabel}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text)', fontWeight: 700 }}>{teamLabel}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)' }}>{Number(row.points ?? 0).toLocaleString()}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)' }}>{row.wins ?? 0}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)' }}>{row.podiums ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
          </div>
          <aside className="blog-layout__sidebar">
            <SeasonSidebar
              season={{ year: season.year, rounds: season.rounds, isCompleted }}
              topDrivers={topDrivers}
              topConstructors={topConstructors}
              prevSeason={prevSeason ? { slug: prevSeason.slug, year: prevSeason.year } : undefined}
              nextSeason={nextSeason ? { slug: nextSeason.slug, year: nextSeason.year } : undefined}
            />
          </aside>
        </div>
      </div>
    </main>
  )
}
