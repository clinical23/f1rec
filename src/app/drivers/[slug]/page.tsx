import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { resolveDriverSlug } from '@/lib/slugs'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'
import PageHead from '@/components/page/PageHead'
import type { CSSProperties } from 'react'
import { SITE_URL } from '@/lib/site'
import { finishLabel } from '@/lib/results'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ tab?: string }>
}

type DriverRow = Record<string, unknown> & {
  id: string
  slug: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  nationality?: string | null
  current_team?: string | null
  date_of_birth?: string | null
  is_champion?: boolean | null
  is_active?: boolean | null
  code?: string | null
  number?: number | null
  championships?: number | null
}

type SeasonStatRow = {
  id: string
  championship_position: number | null
  points: number | string | null
  wins: number | string | null
  podiums: number | string | null
  poles: number | string | null
  fastest_laps: number | string | null
  starts?: number | string | null
  races_entered?: number | string | null
  dnfs: number | string | null
  team_id: string | null
  season_id: string | null
  teams: { name: string; slug: string; primary_color?: string | null } | { name: string; slug: string; primary_color?: string | null }[] | null
  seasons: {
    id: string
    year: number
    slug: string
    champion_driver_id: string | null
  } | { id: string; year: number; slug: string; champion_driver_id: string | null }[] | null
}

type RpcTeammateRow = {
  teammate_name: string | null
  teammate_slug: string | null
  team_name: string | null
}

type DriverProfileRow = {
  driver_slug: string
  nickname: string | null
  fun_facts: string[] | null
  social_twitter: string | null
  social_instagram: string | null
  social_youtube: string | null
  social_twitch: string | null
  social_tiktok: string | null
  fan_community_url: string | null
  fan_community_name: string | null
  fan_base_region: string | null
  hobbies: string | null
}

type DriverVideoRow = {
  id: string
  youtube_id: string | null
  title: string | null
  category: string | null
  season_year: number | null
  driver_slug: string | null
}

type RaceResultRow = {
  id: string
  season_year: number | null
  race_name: string | null
  race_slug: string | null
  grid_position: number | null
  position: number | null
  position_text?: string | null
  status: string | null
  points: number | string | null
  constructor_name: string | null
}

function unwrapRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

function num(v: number | string | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

function ordinal(n: number): string {
  const abs = Math.floor(Math.abs(n))
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 13) return `${abs}th`
  switch (abs % 10) {
    case 1:
      return `${abs}st`
    case 2:
      return `${abs}nd`
    case 3:
      return `${abs}rd`
    default:
      return `${abs}th`
  }
}

function displayName(d: DriverRow): string {
  const fn = (d.full_name as string | undefined)?.trim()
  if (fn) return fn
  const a = (d.first_name as string | undefined)?.trim() ?? ''
  const b = (d.last_name as string | undefined)?.trim() ?? ''
  return `${a} ${b}`.trim() || 'Driver'
}

type Aggregates = {
  totalRaces: number
  totalWins: number
  totalPodiums: number
  totalPoles: number
  totalPoints: number
  totalFastestLaps: number
  totalDnfs: number
  titleCount: number
  bestChampPos: number | null
  bestChampYear: number | null
  bestChampOrdinal: string | null
  maxWinsSeason: { wins: number; year: number } | null
  maxPointsSeason: { points: number; year: number } | null
  maxPodiumsSeason: { podiums: number; year: number } | null
}

function computeAggregates(seasonRows: SeasonStatRow[], driverId: string): Aggregates {
  let totalRaces = 0
  let totalWins = 0
  let totalPodiums = 0
  let totalPoles = 0
  let totalPoints = 0
  let totalFastestLaps = 0
  let totalDnfs = 0
  let titleCount = 0
  let bestChampPos: number | null = null
  let bestChampYear: number | null = null
  let maxWinsSeason: { wins: number; year: number } | null = null
  let maxPointsSeason: { points: number; year: number } | null = null
  let maxPodiumsSeason: { podiums: number; year: number } | null = null

  for (const row of seasonRows) {
    const se = unwrapRelation(row.seasons)
    const year = se?.year ?? 0
    const races = num(row.races_entered ?? row.starts)
    totalRaces += races
    const w = num(row.wins)
    const p = num(row.podiums)
    const po = num(row.poles)
    const pts = num(row.points)
    const fl = num(row.fastest_laps)
    const dnf = num(row.dnfs)
    totalWins += w
    totalPodiums += p
    totalPoles += po
    totalPoints += pts
    totalFastestLaps += fl
    totalDnfs += dnf

    if (se?.champion_driver_id === driverId) titleCount += 1

    const cp = row.championship_position
    if (cp != null && Number.isFinite(Number(cp)) && Number(cp) > 0) {
      const cpn = Number(cp)
      if (bestChampPos == null || cpn < bestChampPos) {
        bestChampPos = cpn
        bestChampYear = year || null
      }
    }

    if (year > 0) {
      if (!maxWinsSeason || w > maxWinsSeason.wins) maxWinsSeason = { wins: w, year }
      if (!maxPointsSeason || pts > maxPointsSeason.points) maxPointsSeason = { points: pts, year }
      if (!maxPodiumsSeason || p > maxPodiumsSeason.podiums) maxPodiumsSeason = { podiums: p, year }
    }
  }

  const bestChampOrdinal = bestChampPos != null ? ordinal(bestChampPos) : null

  return {
    totalRaces,
    totalWins,
    totalPodiums,
    totalPoles,
    totalPoints,
    totalFastestLaps,
    totalDnfs,
    titleCount,
    bestChampPos,
    bestChampYear,
    bestChampOrdinal,
    maxWinsSeason,
    maxPointsSeason,
    maxPodiumsSeason,
  }
}

async function loadDriverProfileData(slug: string) {
  const supabase = createServerClient()

  const { data: driver, error: driverErr } = await supabase.from('drivers').select('*').eq('slug', slug).maybeSingle()
  if (driverErr || !driver) return null

  const d = driver as DriverRow
  const driverId = d.id

  const [seasonStatsRes, countriesRes, profileRes, videosRes, raceResultsRes] = await Promise.all([
    supabase
      .from('driver_season_stats')
      .select(
        `
        id,
        championship_position,
        points,
        wins,
        podiums,
        poles,
        fastest_laps,
        starts,
        dnfs,
        team_id,
        season_id,
        teams(name, slug, primary_color),
        seasons(id, year, slug, champion_driver_id)
      `
      )
      .eq('driver_id', driverId)
      .order('seasons(year)', { ascending: false }),
    supabase.from('countries').select('name, flag_emoji'),
    supabase.from('driver_profiles').select('*').eq('driver_slug', slug).maybeSingle(),
    supabase
      .from('driver_videos')
      .select('id, youtube_id, title, category, season_year, driver_slug')
      .eq('driver_slug', slug)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('results')
      .select('id, season_year, race_name, ...races(race_slug:slug), grid_position, position, position_text, status, points, constructor_name')
      .eq('driver_slug', slug)
      .eq('session_type', 'race')
      .not('season_year', 'is', null)
      .not('race_name', 'is', null)
      .order('season_year', { ascending: false })
      .order('round', { ascending: false }),
  ])

  const seasonRows = ((seasonStatsRes.data ?? []) as unknown as SeasonStatRow[]).sort((a, b) => {
    const ya = unwrapRelation(a.seasons)?.year ?? 0
    const yb = unwrapRelation(b.seasons)?.year ?? 0
    return yb - ya
  })

  const countryFlags = new Map<string, string>()
  if (!countriesRes.error && countriesRes.data) {
    for (const c of countriesRes.data as { name: string; flag_emoji: string | null }[]) {
      if (c.name && c.flag_emoji) countryFlags.set(String(c.name).toLowerCase(), c.flag_emoji)
    }
  }

  const years = seasonRows.map((r) => unwrapRelation(r.seasons)?.year).filter((y): y is number => typeof y === 'number')
  const maxYear = years.length ? Math.max(...years) : null
  const minYear = years.length ? Math.min(...years) : null
  const thisYear = new Date().getFullYear()
  const careerEndLabel = maxYear != null && maxYear >= thisYear ? 'Present' : maxYear != null ? String(maxYear) : '—'

  const seasonIds = [...new Set(seasonRows.map((r) => r.season_id).filter(Boolean))] as string[]

  const pairKeys = new Set<string>()
  for (const r of seasonRows) {
    if (r.season_id && r.team_id) pairKeys.add(`${r.season_id}:${r.team_id}`)
  }

  const [teammatesRpcRes, teammatesFallbackRes, firstRaceRes, firstWinRes, currentTeamRes] = await Promise.all([
    supabase.rpc('get_teammates', { p_driver_slug: slug }),
    seasonIds.length
      ? supabase
          .from('driver_season_stats')
          .select('driver_id, season_id, team_id, drivers(full_name, slug)')
          .in('season_id', seasonIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    supabase
      .from('results')
      .select('season_year, round, race_name, ...races(race_slug:slug)')
      .eq('driver_slug', slug)
      .eq('session_type', 'race')
      .order('season_year', { ascending: true })
      .order('round', { ascending: true })
      .limit(1),
    supabase
      .from('results')
      .select('season_year, round, race_name, ...races(race_slug:slug)')
      .eq('driver_slug', slug)
      .eq('position', 1)
      .eq('session_type', 'race')
      .order('season_year', { ascending: true })
      .order('round', { ascending: true })
      .limit(1),
    d.current_team
      ? supabase.from('teams').select('name, slug').ilike('name', `%${String(d.current_team).trim()}%`).limit(1)
      : Promise.resolve({ data: null as { name: string; slug: string } | null, error: null }),
  ])

  const teammateMap = new Map<string, { full_name: string; slug: string }>()
  if (!teammatesRpcRes.error && teammatesRpcRes.data) {
    for (const row of teammatesRpcRes.data as RpcTeammateRow[]) {
      const teammateSlug = row.teammate_slug?.trim()
      const teammateName = row.teammate_name?.trim()
      if (!teammateSlug || !teammateName) continue
      teammateMap.set(teammateSlug, { full_name: teammateName, slug: teammateSlug })
    }
  } else {
    if (teammatesRpcRes.error) {
      console.error('[driver-page] get_teammates RPC failed, using fallback query', teammatesRpcRes.error)
    }
    for (const row of (teammatesFallbackRes.data ?? []) as Array<{
      driver_id: string
      season_id: string
      team_id: string
      drivers: { full_name: string; slug: string } | { full_name: string; slug: string }[] | null
    }>) {
      if (row.driver_id === driverId) continue
      const key = `${row.season_id}:${row.team_id}`
      if (!pairKeys.has(key)) continue
      const dr = unwrapRelation(row.drivers)
      if (dr?.slug && dr.full_name) teammateMap.set(dr.slug, { full_name: dr.full_name, slug: dr.slug })
    }
  }
  const teammates = [...teammateMap.values()].sort((a, b) => a.full_name.localeCompare(b.full_name))

  const firstRace = (firstRaceRes.data ?? [])[0] as
    | { season_year: number; race_name: string | null; race_slug: string | null }
    | undefined
  const firstWin = (firstWinRes.data ?? [])[0] as
    | { season_year: number; race_name: string | null; race_slug: string | null }
    | undefined

  const aggregates = computeAggregates(seasonRows, driverId)

  const titleCount = aggregates.titleCount > 0 ? aggregates.titleCount : num(d.championships)
  const showChampionBadge = Boolean(d.is_champion) || titleCount > 0

  const nationality = d.nationality?.trim() || null
  let flag = nationality ? countryFlags.get(nationality.toLowerCase()) : undefined
  if (!flag && nationality) {
    for (const [k, v] of countryFlags) {
      if (nationality.toLowerCase().includes(k) || k.includes(nationality.toLowerCase())) {
        flag = v
        break
      }
    }
  }

  const latestTeam = unwrapRelation(seasonRows[0]?.teams ?? null)
  const matchedFromCurrent = ((currentTeamRes.data ?? []) as { name: string; slug: string }[])[0] ?? null
  const currentTeamLink = matchedFromCurrent ?? latestTeam

  const name = displayName(d)

  const titleSeasonRows = seasonRows.filter((r) => unwrapRelation(r.seasons)?.champion_driver_id === driverId)
  const profile = (profileRes.data as DriverProfileRow | null) ?? null
  const videos = ((videosRes.data ?? []) as DriverVideoRow[]).filter((video) => video.youtube_id && video.title)
  const raceResults = (raceResultsRes.data ?? []) as RaceResultRow[]

  return {
    driver: d,
    name,
    seasonRows,
    aggregates,
    teammates,
    firstRace,
    firstWin,
    titleCount,
    showChampionBadge,
    nationality,
    flag: flag ?? null,
    currentTeamLink,
    minYear,
    careerEndLabel,
    titleSeasonRows,
    profile,
    videos,
    raceResults,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await loadDriverProfileData(slug)
  if (!data) {
    return {
      title: 'Driver Not Found',
      description: 'The requested Formula 1 driver could not be found on Sunday Grid.',
    }
  }
  const { name, aggregates } = data
  const desc = `Complete Formula 1 career statistics for ${name}. ${aggregates.totalWins} wins, ${aggregates.totalPodiums} podiums, ${Math.round(aggregates.totalPoints).toLocaleString()} points across ${aggregates.totalRaces} races.`
  return {
    title: `${name}: F1 Career Stats, Results and Records`,
    description: desc,
    openGraph: {
      title: `${name} — F1 Career Stats | Sunday Grid`,
      description: desc,
      type: 'profile',
      url: `${SITE_URL}/drivers/${slug}`,
      siteName: 'Sunday Grid',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — F1 Career Stats | Sunday Grid`,
      description: desc,
    },
  }
}

const tcStyle = (c?: string | null) => ({ '--tc': c ? (c.startsWith('#') ? c : `#${c}`) : undefined }) as CSSProperties

export default async function DriverProfilePage({ params }: PageProps) {
  const { slug } = await params
  const data = await loadDriverProfileData(slug)
  if (!data) {
    const real = await resolveDriverSlug(slug)
    if (real && real !== slug) permanentRedirect(`/drivers/${real}`)
    notFound()
  }

  const { driver, name, seasonRows, aggregates, teammates, firstRace, firstWin, titleCount, nationality, flag, currentTeamLink, minYear, careerEndLabel, profile, raceResults } = data

  const affiliationName = currentTeamLink?.name ?? null
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: 'Formula 1 Driver',
    url: `${SITE_URL}/drivers/${slug}`,
    ...(nationality ? { nationality } : {}),
    ...(affiliationName ? { affiliation: { '@type': 'SportsTeam', name: affiliationName, ...(currentTeamLink?.slug ? { url: `${SITE_URL}/teams/${currentTeamLink.slug}` } : {}) } } : {}),
    description: `${name}'s Formula 1 career: every season and race result.`,
  }

  const starts = aggregates.totalRaces || num(driver.career_starts as number | null)
  const wins = aggregates.totalWins || num(driver.career_wins as number | null)
  const podiums = aggregates.totalPodiums || num(driver.career_podiums as number | null)
  const poles = aggregates.totalPoles || num(driver.career_poles as number | null)
  const active = Boolean(driver.is_active)
  const latest = seasonRows[0]
  const latestTeam = unwrapRelation(latest?.teams ?? null)
  const latestYear = unwrapRelation(latest?.seasons ?? null)?.year ?? null
  const years = minYear ? `${minYear}–${active ? 'now' : careerEndLabel}` : null
  const surname = name.split(' ').at(-1) ?? name
  const finishes = raceResults.filter((r) => r.position != null)
  const best = finishes.length ? Math.min(...finishes.map((r) => r.position as number)) : null
  const recent = raceResults.slice(0, 12)
  const pct = (n: number) => (starts ? `${((n / starts) * 100).toFixed(1)}%` : '—')

  const lede = (
    <>
      {flag ? <span aria-hidden="true">{flag} </span> : null}
      {[nationality, years].filter(Boolean).join(', ')}.{' '}
      {active && latestTeam ? <>Races for <Link href={`/teams/${latestTeam.slug}`}>{latestTeam.name}</Link> in {latestYear}.</> : null}
      {!active && titleCount > 0 ? <>World champion {titleCount === 1 ? 'once' : `${titleCount} times`}.</> : null}
    </>
  )

  return (
    <main className="pg">
      <JsonLd data={jsonLd} id={`driver-jsonld-${slug}`} />
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Drivers', href: '/drivers' }, { label: name }]}
        title={name}
        small={driver.number ? `#${driver.number}` : undefined}
        teamColor={active ? latestTeam?.primary_color ? (latestTeam.primary_color.startsWith('#') ? latestTeam.primary_color : `#${latestTeam.primary_color}`) : null : null}
        lede={lede}
        stats={[
          { value: titleCount, label: titleCount === 1 ? 'world title' : 'world titles', sig: titleCount > 0 },
          { value: wins, label: 'wins' },
          { value: podiums, label: 'podiums' },
          { value: poles, label: 'poles' },
        ]}
      />
      <div className="pg-body">
        <div className="pg-grid2">
          <div>
            {recent.length > 0 && (
              <section aria-labelledby="recent-h">
                <div className="pb-ph"><h2 className="pg-h2" id="recent-h">{active ? 'Latest races' : 'Last races'}</h2></div>
                <div className="pg-scroll">
                  <table className="pg-table compact">
                    <thead><tr><th>Race</th><th className="hide-sm">Team</th><th className="n hide-sm">Grid</th><th className="n">Finish</th><th className="n">Pts</th></tr></thead>
                    <tbody>
                      {recent.map((r) => (
                        <tr key={r.id} className={r.position === 1 ? 'p1' : undefined}>
                          <td>
                            {r.race_slug ? <Link href={`/races/${r.race_slug}`}>{r.race_name ?? 'Grand Prix'}</Link> : r.race_name}
                            <span className="sub">{r.season_year}</span>
                          </td>
                          <td className="hide-sm muted">{r.constructor_name ?? '—'}</td>
                          <td className="n hide-sm muted">{r.grid_position ?? '—'}</td>
                          <td className={`n${r.position === 1 ? ' top' : ''}`}>{(() => { const f = finishLabel(r.position, r.position_text); return f.classified ? f.label : <span className="muted" title={r.status ?? undefined}>{f.label}</span> })()}</td>
                          <td className="n">{num(r.points) || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="pg-sec" aria-labelledby="seasons-h">
              <div className="pb-ph"><h2 className="pg-h2" id="seasons-h">Season by season</h2></div>
              {seasonRows.length ? (
                <div className="pg-scroll">
                  <table className="pg-table">
                    <thead><tr><th>Season</th><th>Team</th><th className="n">Pos</th><th className="n">Wins</th><th className="n hide-sm">Podiums</th><th className="n hide-sm">Poles</th><th className="n">Points</th></tr></thead>
                    <tbody>
                      {seasonRows.map((r) => {
                        const se = unwrapRelation(r.seasons)
                        const t = unwrapRelation(r.teams)
                        const champ = se?.champion_driver_id === driver.id
                        return (
                          <tr key={r.id} className={champ ? 'p1' : undefined} style={tcStyle(t?.primary_color)}>
                            <td className="pos">{se ? <Link href={`/seasons/${se.slug}`}>{se.year}</Link> : '—'}</td>
                            <td><span className="tc" aria-hidden="true" />{t ? <Link href={`/teams/${t.slug}`} style={{ fontWeight: 500 }}>{t.name}</Link> : '—'}</td>
                            <td className={`n${champ ? ' top' : ''}`}>{r.championship_position ? (champ ? 'Champion' : ordinal(r.championship_position)) : '—'}</td>
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
              ) : <p className="pg-empty">No season records for {name} yet.</p>}
            </section>

            {raceResults.length > recent.length && (
              <details className="pg-fold" style={{ marginTop: 20 }}>
                <summary><b style={{ fontSize: 26 }}>Every race</b><span>{raceResults.length} starts</span></summary>
                <table className="pg-table compact">
                  <thead><tr><th>Race</th><th className="n">Grid</th><th className="n">Finish</th><th className="n">Pts</th></tr></thead>
                  <tbody>
                    {raceResults.map((r) => (
                      <tr key={r.id} className={r.position === 1 ? 'p1' : undefined}>
                        <td>{r.race_slug ? <Link href={`/races/${r.race_slug}`}>{r.season_year} {r.race_name}</Link> : `${r.season_year} ${r.race_name}`}</td>
                        <td className="n muted">{r.grid_position ?? '—'}</td>
                        <td className="n">{(() => { const f = finishLabel(r.position, r.position_text); return f.classified ? f.label : <span className="muted">{f.label}</span> })()}</td>
                        <td className="n">{num(r.points) || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>

          <aside className="pg-side" aria-label={`${name} career facts`}>
            <div className="pg-facts">
              <div><b>{starts}</b><span>races started</span></div>
              <div><b>{pct(wins)}</b><span>won</span></div>
              <div><b>{pct(podiums)}</b><span>on the podium</span></div>
              <div><b>{best ? ordinal(best) : '—'}</b><span>best finish</span></div>
              {aggregates.maxWinsSeason && aggregates.maxWinsSeason.wins > 0 ? <div><b>{aggregates.maxWinsSeason.wins}</b><span>wins in {aggregates.maxWinsSeason.year}, the best season</span></div> : null}
              {aggregates.totalFastestLaps > 0 ? <div><b>{aggregates.totalFastestLaps}</b><span>fastest laps</span></div> : null}
            </div>

            <div className="pg-panel">
              <div className="pg-list">
                {firstRace && <div><b style={{ fontWeight: 700 }}>First race</b><span>{firstRace.race_slug ? <Link href={`/races/${firstRace.race_slug}`} style={{ color: 'var(--text)' }}>{firstRace.season_year} {firstRace.race_name}</Link> : `${firstRace.season_year} ${firstRace.race_name ?? ''}`}</span></div>}
                {firstWin && <div><b style={{ fontWeight: 700 }}>First win</b><span>{firstWin.race_slug ? <Link href={`/races/${firstWin.race_slug}`} style={{ color: 'var(--text)' }}>{firstWin.season_year} {firstWin.race_name}</Link> : `${firstWin.season_year} ${firstWin.race_name ?? ''}`}</span></div>}
                {aggregates.bestChampOrdinal && titleCount === 0 && <div><b style={{ fontWeight: 700 }}>Best championship</b><span>{aggregates.bestChampOrdinal}{aggregates.bestChampYear ? ` in ${aggregates.bestChampYear}` : ''}</span></div>}
                {profile?.nickname && <div><b style={{ fontWeight: 700 }}>Known as</b><span>{profile.nickname}</span></div>}
              </div>
            </div>

            <div className="pg-panel">
              <div className="pb-ph"><h2 className="pg-h2" style={{ fontSize: 28 }}>Compare {surname}</h2></div>
              <div className="pg-list">
                {teammates.slice(0, 6).map((t) => (
                  <Link key={t.slug} href={`/compare?d1=${slug}&d2=${t.slug}`}><b style={{ fontWeight: 600 }}>{t.full_name}</b><span>teammate</span></Link>
                ))}
                <Link href={`/compare?d1=${slug}`}><b style={{ fontWeight: 600 }}>Anyone else</b><span>pick a driver</span></Link>
              </div>
            </div>

            {profile?.fun_facts && profile.fun_facts.length > 0 && (
              <div className="pg-panel">
                <div className="pb-ph"><h2 className="pg-h2" style={{ fontSize: 28 }}>Worth knowing</h2></div>
                <ul className="pb-rules">{profile.fun_facts.slice(0, 4).map((f) => <li key={f} style={{ fontSize: 15 }}>{f}</li>)}</ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
