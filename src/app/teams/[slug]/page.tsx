import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{ slug: string }>
}

type TeamRow = {
  id: string
  slug: string
  name: string
  full_name: string | null
  base: string | null
  founded_year: number | null
  championships: number
  primary_color: string | null
}

function statCard(label: string, value: string | number, accent = false) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: accent ? 'var(--gold)' : 'var(--text)' }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
        {label}
      </div>
    </div>
  )
}

async function getTeam(slug: string) {
  const supabase = createServerClient()
  return supabase
    .from('teams')
    .select('id, slug, name, full_name, base, founded_year, championships, primary_color')
    .eq('slug', slug)
    .maybeSingle<TeamRow>()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { data: team } = await getTeam(slug)

  if (!team) {
    return {
      title: 'Team Not Found | F1Rec',
      description: 'The requested Formula 1 team could not be found.',
    }
  }

  return {
    title: `${team.name} F1 Team Stats, Drivers & History | F1Rec`,
    description: `Explore ${team.name}'s Formula 1 history, race wins, podiums, points, notable drivers, and season-by-season performance.`,
  }
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServerClient()

  const { data: team } = await getTeam(slug)
  if (!team) notFound()

  const [{ data: results }, { data: driverStats }, { data: seasonStats }] = await Promise.all([
    supabase
      .from('results')
      .select('season_year, position, grid, points, is_sprint')
      .eq('constructor_slug', team.slug),
    supabase
      .from('driver_season_stats')
      .select('driver_id, points, wins, podiums, starts, drivers!inner(full_name, slug)')
      .eq('team_id', team.id),
    supabase
      .from('team_season_stats')
      .select('id, championship_position, points, wins, podiums, poles, seasons!inner(year, slug)')
      .eq('team_id', team.id)
      .order('seasons(year)', { ascending: false }),
  ])

  const raceRows = (results ?? []).filter((row) => row.is_sprint !== true)
  const totalWins = raceRows.filter((row) => Number(row.position) === 1).length
  const totalPodiums = raceRows.filter((row) => {
    const pos = Number(row.position)
    return Number.isFinite(pos) && pos <= 3
  }).length
  const totalPoles = raceRows.filter((row) => Number(row.grid) === 1).length
  const totalPoints = raceRows.reduce((sum, row) => sum + (Number(row.points) || 0), 0)
  const seasons = Array.from(new Set(raceRows.map((row) => Number(row.season_year)).filter(Number.isFinite))).sort((a, b) => a - b)
  const seasonsActive = seasons.length
  const firstSeason = seasons[0] ?? null
  const lastSeason = seasons[seasons.length - 1] ?? null

  const notableDrivers = new Map<string, { slug: string; full_name: string; wins: number; podiums: number; points: number; starts: number }>()
  for (const row of driverStats ?? []) {
    const driver = Array.isArray(row.drivers) ? row.drivers[0] : row.drivers
    if (!driver) continue

    const existing = notableDrivers.get(row.driver_id)
    if (!existing) {
      notableDrivers.set(row.driver_id, {
        slug: driver.slug,
        full_name: driver.full_name,
        wins: Number(row.wins) || 0,
        podiums: Number(row.podiums) || 0,
        points: Number(row.points) || 0,
        starts: Number(row.starts) || 0,
      })
      continue
    }

    existing.wins += Number(row.wins) || 0
    existing.podiums += Number(row.podiums) || 0
    existing.points += Number(row.points) || 0
    existing.starts += Number(row.starts) || 0
  }

  const driverList = Array.from(notableDrivers.values())
    .sort((a, b) => (b.wins - a.wins) || (b.podiums - a.podiums) || (b.points - a.points))
    .slice(0, 16)

  const accent = team.primary_color || 'var(--accent)'

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '3rem 1.5rem 2.5rem', borderBottom: '1px solid var(--border)', background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 20%, transparent) 0%, transparent 100%)` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem', fontSize: '0.8rem' }}>
            <Link href="/teams" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← All Teams</Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.7rem', color: accent, margin: 0 }}>
                Constructor Profile
              </p>
              <h1 style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontWeight: 800, fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', margin: '0.25rem 0 0.4rem' }}>
                {team.name}
              </h1>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--muted)', fontSize: '0.88rem' }}>
                {team.founded_year && <span>Founded {team.founded_year}</span>}
                {team.base && <span>Base: {team.base}</span>}
              </div>
              {team.championships > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.9rem', border: '1px solid color-mix(in srgb, var(--gold) 35%, transparent)', background: 'color-mix(in srgb, var(--gold) 12%, transparent)', borderRadius: '6px', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold)' }}>
                  🏆 {team.championships} Championships
                </div>
              )}
            </div>
            <Link
              href={`/leaderboards?tab=constructors`}
              style={{ alignSelf: 'flex-start', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', textDecoration: 'none', padding: '0.6rem 1rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem', fontWeight: 700 }}
            >
              View on Leaderboards →
            </Link>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          {statCard('Championships', team.championships, team.championships > 0)}
          {statCard('Race Wins', totalWins)}
          {statCard('Podiums', totalPodiums)}
          {statCard('Poles', totalPoles)}
          {statCard('Total Points', Number(totalPoints).toLocaleString())}
          {statCard('Seasons Active', seasonsActive)}
        </div>

        <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem' }}>
          Notable Drivers
        </h2>
        {driverList.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.65rem', marginBottom: '2rem' }}>
            {driverList.map((driver) => (
              <Link key={driver.slug} href={`/drivers/${driver.slug}`} style={{ textDecoration: 'none', color: 'inherit', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg2)', padding: '0.9rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{driver.full_name}</div>
                <div style={{ marginTop: '0.35rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  {driver.wins} wins · {driver.podiums} podiums · {Math.round(driver.points)} pts
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>No driver season data available for this team yet.</p>
        )}

        <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem' }}>
          Season History
        </h2>
        {seasonStats && seasonStats.length > 0 ? (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Year', 'Position', 'Points', 'Wins', 'Podiums'].map((h) => (
                    <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: h === 'Year' ? 'left' : 'right', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 600, fontSize: '0.68rem' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seasonStats.map((row) => {
                  const season = Array.isArray(row.seasons) ? row.seasons[0] : row.seasons
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, color: 'var(--text)' }}>
                        {season?.year ?? '—'}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: Number(row.championship_position) === 1 ? 'var(--gold)' : 'var(--muted)' }}>
                        {row.championship_position ? `P${row.championship_position}` : '—'}
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
        ) : (
          <p style={{ color: 'var(--muted)' }}>No team season standings data available.</p>
        )}

        <div style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
          {firstSeason && lastSeason ? `Active from ${firstSeason} to ${lastSeason}` : 'Season range unavailable'}
        </div>
      </section>
    </main>
  )
}
