import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { resolveTeamSlug } from '@/lib/slugs'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'
import PageHead from '@/components/page/PageHead'
import { SITE_URL } from '@/lib/site'

/** Rebuilt hourly. */
export const revalidate = 3600

type PageProps = { params: Promise<{ slug: string }> }

type Season = { id: string; year: number; slug: string; champion_team_id?: string | null; champion_driver_id?: string | null }
type TeamSeason = { id: string; championship_position: number | null; points: number | string | null; wins: number | null; podiums: number | null; poles: number | null; seasons: Season | Season[] | null }
type DriverSeason = {
  driver_id: string
  wins: number | null
  podiums: number | null
  points: number | string | null
  championship_position: number | null
  drivers: { full_name: string; slug: string; nationality: string | null } | { full_name: string; slug: string; nationality: string | null }[] | null
  seasons: Season | Season[] | null
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (v == null ? null : Array.isArray(v) ? v[0] ?? null : v)
const num = (v: unknown) => { const x = typeof v === 'number' ? v : Number.parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0 }
const hex = (c?: string | null) => (c ? (c.startsWith('#') ? c : `#${c}`) : null)
const ordinal = (n: number) => { const t = n % 100; if (t >= 11 && t <= 13) return `${n}th`; return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}` }

async function load(slug: string) {
  const sb = createServerClient()
  const { data: team } = await sb.from('teams').select('id, slug, name, full_name, base, team_principal, founded_year, championships, primary_color').eq('slug', slug).maybeSingle()
  if (!team) return null
  const [tssRes, dssRes, firstWinRes] = await Promise.all([
    sb.from('team_season_stats').select('id, championship_position, points, wins, podiums, poles, seasons!inner(id, year, slug, champion_team_id)').eq('team_id', team.id),
    sb.from('driver_season_stats').select('driver_id, wins, podiums, points, championship_position, drivers(full_name, slug, nationality), seasons!inner(id, year, slug, champion_driver_id)').eq('team_id', team.id),
    sb.from('results').select('season_year, race_name, ...races!inner(race_slug:slug)').eq('team_id', team.id).eq('position', 1).eq('session_type', 'race')
      .order('season_year', { ascending: true }).order('round', { ascending: true }).limit(1),
  ])
  const seasons = ((tssRes.data ?? []) as unknown as TeamSeason[]).sort((a, b) => (one(b.seasons)?.year ?? 0) - (one(a.seasons)?.year ?? 0))
  const driverRows = (dssRes.data ?? []) as unknown as DriverSeason[]
  const firstWin = ((firstWinRes.data ?? []) as unknown as { season_year: number; race_name: string; race_slug: string }[])[0] ?? null
  return { team, seasons, driverRows, firstWin }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await load(slug)
  if (!data) return { title: 'Team not found' }
  const { team, seasons } = data
  const wins = seasons.reduce((s, r) => s + num(r.wins), 0)
  const titles = seasons.filter((r) => one(r.seasons)?.champion_team_id === team.id).length || num(team.championships)
  const desc = `${team.name} in Formula 1: ${titles ? `${titles} constructors' ${titles === 1 ? 'title' : 'titles'}, ` : ''}${wins} race wins across ${seasons.length} seasons, every season and every driver.`
  return {
    title: `${team.name}: F1 Team Stats, History and Drivers`,
    description: desc,
    alternates: { canonical: `/teams/${slug}` },
    openGraph: { title: `${team.name}: F1 team stats | Sunday Grid`, description: desc, url: `/teams/${slug}`, siteName: 'Sunday Grid', type: 'website' },
  }
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { slug } = await params
  const data = await load(slug)
  if (!data) {
    const real = await resolveTeamSlug(slug)
    if (real && real !== slug) permanentRedirect(`/teams/${real}`)
    notFound()
  }
  const { team, seasons, driverRows, firstWin } = data
  const name = String(team.name)
  const color = hex(team.primary_color as string | null)

  const wins = seasons.reduce((s, r) => s + num(r.wins), 0)
  const podiums = seasons.reduce((s, r) => s + num(r.podiums), 0)
  const poles = seasons.reduce((s, r) => s + num(r.poles), 0)
  const titleYears = seasons.filter((r) => one(r.seasons)?.champion_team_id === team.id).map((r) => one(r.seasons)!.year).sort((a, b) => a - b)
  const titles = titleYears.length || num(team.championships)
  const years = seasons.map((r) => one(r.seasons)?.year ?? 0).filter(Boolean)
  const first = years.length ? Math.min(...years) : (team.founded_year as number | null)
  const last = years.length ? Math.max(...years) : null
  const thisYear = new Date().getFullYear()
  const active = last != null && last >= thisYear
  const latest = seasons[0]
  const best = seasons.filter((r) => r.championship_position).sort((a, b) => (a.championship_position ?? 99) - (b.championship_position ?? 99) || num(b.wins) - num(a.wins))[0]

  // Drivers, totalled over their seasons with this team.
  const byDriver = new Map<string, { name: string; slug: string; nat: string | null; wins: number; podiums: number; points: number; first: number; last: number; titles: number[] }>()
  for (const r of driverRows) {
    const d = one(r.drivers)
    const se = one(r.seasons)
    if (!d || !se) continue
    const a = byDriver.get(r.driver_id) ?? { name: d.full_name, slug: d.slug, nat: d.nationality, wins: 0, podiums: 0, points: 0, first: 9999, last: 0, titles: [] }
    a.wins += num(r.wins); a.podiums += num(r.podiums); a.points += num(r.points)
    a.first = Math.min(a.first, se.year); a.last = Math.max(a.last, se.year)
    if (se.champion_driver_id === r.driver_id) a.titles.push(se.year)
    byDriver.set(r.driver_id, a)
  }
  const drivers = [...byDriver.values()].sort((a, b) => b.wins - a.wins || b.podiums - a.podiums || b.points - a.points)
  const current = latest ? driverRows.filter((r) => one(r.seasons)?.year === one(latest.seasons)?.year).map((r) => one(r.drivers)).filter(Boolean) as { full_name: string; slug: string }[] : []
  const champions = drivers.filter((d) => d.titles.length)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name,
    sport: 'Formula 1',
    url: `${SITE_URL}/teams/${slug}`,
    ...(team.base ? { location: { '@type': 'Place', name: team.base } } : {}),
  }

  const lede = (
    <>
      {[team.base, first ? `in Formula 1 ${first === last ? `in ${first}` : `from ${first}${active ? '' : ` to ${last}`}`}` : null].filter(Boolean).join(', ')}.{' '}
      {active && latest?.championship_position ? <>{ordinal(latest.championship_position)} in the {one(latest.seasons)?.year} constructors&apos; championship.</> : null}
    </>
  )

  return (
    <main className="pg">
      <JsonLd data={jsonLd} id={`team-jsonld-${slug}`} />
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Teams', href: '/teams' }, { label: name }]}
        title={name}
        teamColor={color}
        lede={lede}
        stats={[
          { value: titles, label: titles === 1 ? 'constructors’ title' : 'constructors’ titles', sig: titles > 0 },
          { value: wins, label: 'wins' },
          { value: podiums, label: 'podiums' },
          { value: poles, label: 'poles' },
        ]}
      />
      <div className="pg-body">
        <div className="pg-grid2">
          <div>
            <section aria-labelledby="seasons-h">
              <div className="pb-ph"><h2 className="pg-h2" id="seasons-h">Season by season</h2></div>
              {seasons.length ? (
                <div className="pg-scroll">
                  <table className="pg-table">
                    <thead><tr><th>Season</th><th className="n">Pos</th><th className="n">Wins</th><th className="n hide-sm">Podiums</th><th className="n hide-sm">Poles</th><th className="n">Points</th></tr></thead>
                    <tbody>
                      {seasons.map((r) => {
                        const se = one(r.seasons)
                        const champ = se?.champion_team_id === team.id
                        return (
                          <tr key={r.id} className={champ ? 'p1' : undefined}>
                            <td className="pos">{se ? <Link href={`/seasons/${se.slug}`}>{se.year}</Link> : '—'}</td>
                            <td className={`n${champ ? ' top' : ''}`}>{r.championship_position ? (champ ? 'Champions' : ordinal(r.championship_position)) : '—'}</td>
                            <td className="n">{num(r.wins)}</td>
                            <td className="n hide-sm">{num(r.podiums)}</td>
                            <td className="n hide-sm">{num(r.poles)}</td>
                            <td className="n">{Math.round(num(r.points) * 10) / 10}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="pg-empty">No season records for {name}.</p>}
            </section>

            {drivers.length > 0 && (
              <section className="pg-sec" aria-labelledby="drivers-h">
                <div className="pb-ph"><h2 className="pg-h2" id="drivers-h">Drivers</h2><span className="pg-count">{drivers.length} in total</span></div>
                <div className="pg-scroll">
                  <table className="pg-table compact">
                    <thead><tr><th>Driver</th><th className="hide-sm">Years</th><th className="n">Wins</th><th className="n hide-sm">Podiums</th><th className="n">Points</th></tr></thead>
                    <tbody>
                      {drivers.slice(0, 40).map((d) => (
                        <tr key={d.slug} className={d.titles.length ? 'p1' : undefined}>
                          <td><Link href={`/drivers/${d.slug}`}>{d.name}</Link>{d.titles.length ? <span className="sub" style={{ color: 'var(--accent)', fontWeight: 700 }}>Champion with {name} in {d.titles.join(', ')}</span> : d.nat ? <span className="sub">{d.nat}</span> : null}</td>
                          <td className="hide-sm muted">{d.first === d.last ? d.first : `${d.first}–${d.last}`}</td>
                          <td className="n">{d.wins}</td>
                          <td className="n hide-sm">{d.podiums}</td>
                          <td className="n">{Math.round(d.points)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {drivers.length > 40 && <p className="pg-note">Showing the 40 most successful of {drivers.length} drivers.</p>}
              </section>
            )}
          </div>

          <aside className="pg-side" aria-label={`${name} facts`}>
            <div className="pg-facts">
              <div><b>{seasons.length}</b><span>seasons</span></div>
              {best?.championship_position ? <div className={best.championship_position === 1 ? 'lead' : undefined}><b>{ordinal(best.championship_position)}</b><span>best finish, {one(best.seasons)?.year}</span></div> : null}
              {titleYears.length ? <div className="lead"><b>{titleYears.at(-1)}</b><span>last title</span></div> : null}
            </div>
            <div className="pg-panel">
              <div className="pg-list">
                {firstWin && <div><b style={{ fontWeight: 700 }}>First win</b><span><Link href={`/races/${firstWin.race_slug}`} style={{ color: 'var(--text)' }}>{firstWin.season_year} {firstWin.race_name}</Link></span></div>}
                {team.team_principal && <div><b style={{ fontWeight: 700 }}>Team principal</b><span>{String(team.team_principal)}</span></div>}
                {team.base && <div><b style={{ fontWeight: 700 }}>Base</b><span>{String(team.base)}</span></div>}
                {titleYears.length > 0 && <div><b style={{ fontWeight: 700 }}>Titles</b><span>{titleYears.join(', ')}</span></div>}
              </div>
            </div>
            {active && current.length > 0 && (
              <div className="pg-panel" style={{ '--tc': color ?? undefined } as CSSProperties}>
                <div className="pb-ph"><h2 className="pg-h2" style={{ fontSize: 28 }}>{one(latest!.seasons)?.year} drivers</h2></div>
                <div className="pg-list">
                  {current.map((d) => <Link key={d.slug} href={`/drivers/${d.slug}`}><b style={{ fontWeight: 600 }}>{d.full_name}</b><span>profile</span></Link>)}
                  {current.length === 2 && <Link href={`/compare?d1=${current[0].slug}&d2=${current[1].slug}`}><b style={{ fontWeight: 600 }}>Head to head</b><span>compare them</span></Link>}
                </div>
              </div>
            )}
            {champions.length > 0 && (
              <div className="pg-panel">
                <div className="pb-ph"><h2 className="pg-h2" style={{ fontSize: 28 }}>World champions</h2></div>
                <div className="pg-list">
                  {champions.map((d) => <Link key={d.slug} href={`/drivers/${d.slug}`}><b style={{ fontWeight: 600 }}>{d.name}</b><span>{d.titles.join(', ')}</span></Link>)}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
