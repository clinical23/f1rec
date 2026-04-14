import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'

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

  const [champDriverRes, champTeamRes, raceWinnersRes, driverStandingsRes, constructorStandingsRes] = await Promise.all([
    season.champion_driver_id
      ? supabase.from('drivers').select('full_name, slug').eq('id', season.champion_driver_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    season.champion_team_id
      ? supabase.from('teams').select('name, slug').eq('id', season.champion_team_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('results')
      .select('season_year, round, race_name, race_slug, driver_name, driver_slug, constructor_name, constructor_slug')
      .eq('season_year', season.year)
      .eq('position', 1)
      .eq('is_sprint', false)
      .order('round', { ascending: true }),
    supabase
      .from('driver_season_stats')
      .select('id, championship_position, points, wins, podiums, drivers!inner(full_name, slug), teams!inner(name, slug)')
      .eq('season_id', season.id),
    supabase
      .from('team_season_stats')
      .select('id, championship_position, points, wins, podiums, teams!inner(name, slug, primary_color)')
      .eq('season_id', season.id),
  ])

  const championDriver = champDriverRes.data
  const championTeam = champTeamRes.data

  const seenRounds = new Set<number>()
  const raceWinners = (raceWinnersRes.data ?? []).filter((row) => {
    if (seenRounds.has(row.round)) return false
    seenRounds.add(row.round)
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
      <section style={{ borderBottom: '1px solid var(--border)', padding: '3rem 1.5rem 2.2rem', background: 'linear-gradient(180deg, rgba(232,0,45,0.08) 0%, transparent 100%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Link href="/seasons" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.8rem' }}>← All Seasons</Link>
          </div>
          <p style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: '0.72rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>
            Formula 1 World Championship
          </p>
          <h1 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 'clamp(4rem, 15vw, 8rem)', lineHeight: 0.9, fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
            {season.year}
          </h1>
          <p style={{ color: 'var(--muted)', margin: '0.6rem 0 1.2rem', fontSize: '0.92rem' }}>
            {season.rounds ?? raceWinners.length} rounds
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.68rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>
                Driver Champion
              </div>
              {championDriver ? (
                championDriver.slug ? (
                  <Link href={`/drivers/${championDriver.slug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 800, textTransform: 'uppercase', fontSize: '1.45rem' }}>
                    {championDriver.full_name ?? '—'}
                  </Link>
                ) : (
                  <span style={{ color: 'var(--text)', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 800, textTransform: 'uppercase', fontSize: '1.45rem' }}>{championDriver.full_name ?? '—'}</span>
                )
              ) : (
                <div style={{ color: 'var(--muted)' }}>TBD</div>
              )}
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.68rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>
                Constructor Champion
              </div>
              {championTeam ? (
                championTeam.slug ? (
                  <Link href={`/teams/${championTeam.slug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 800, textTransform: 'uppercase', fontSize: '1.45rem' }}>
                    {championTeam.name ?? '—'}
                  </Link>
                ) : (
                  <span style={{ color: 'var(--text)', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 800, textTransform: 'uppercase', fontSize: '1.45rem' }}>{championTeam.name ?? '—'}</span>
                )
              ) : (
                <div style={{ color: 'var(--muted)' }}>TBD</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '0.1em', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem' }}>
          Race Winners
        </h2>
        {raceWinners.length > 0 ? (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Round', 'Race', 'Winner', 'Team'].map((h) => (
                    <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: h === 'Round' ? 'right' : 'left', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600, fontSize: '0.68rem' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {raceWinners.map((row) => (
                  <tr key={`${row.season_year}-${row.round}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>
                      R{row.round}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text)' }}>
                      {row.race_name ?? row.race_slug ?? '—'}
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
      </section>
    </main>
  )
}
