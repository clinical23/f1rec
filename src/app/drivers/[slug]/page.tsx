import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'
import EmailCapture from '@/components/EmailCapture'

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
  teams: { name: string; slug: string } | { name: string; slug: string }[] | null
  seasons: {
    id: string
    year: number
    slug: string
    champion_driver_id: string | null
  } | null
}

type PostRow = {
  title: string | null
  slug: string | null
  category: string | null
  published_at: string | null
  body: string | null
  related_driver_slug?: string | null
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

  const [seasonStatsRes, postsRes, countriesRes, profileRes, videosRes, raceResultsRes] = await Promise.all([
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
        teams(name, slug),
        seasons(id, year, slug, champion_driver_id)
      `
      )
      .eq('driver_id', driverId)
      .order('seasons(year)', { ascending: false }),
    supabase
      .from('posts')
      .select('title, slug, category, published_at, body, related_driver_slug')
      .eq('is_published', true),
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
      .select('id, season_year, race_name, race_slug, grid_position, position, status, points, constructor_name')
      .eq('driver_slug', slug)
      .eq('is_sprint', false)
      .order('season_year', { ascending: false })
      .order('round', { ascending: false }),
  ])

  const seasonRows = ((seasonStatsRes.data ?? []) as SeasonStatRow[]).sort((a, b) => {
    const ya = unwrapRelation(a.seasons)?.year ?? 0
    const yb = unwrapRelation(b.seasons)?.year ?? 0
    return yb - ya
  })

  const posts = (postsRes.data ?? []) as PostRow[]
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
      .select('season_year, round, race_name, race_slug')
      .eq('driver_slug', slug)
      .eq('is_sprint', false)
      .order('season_year', { ascending: true })
      .order('round', { ascending: true })
      .limit(1),
    supabase
      .from('results')
      .select('season_year, round, race_name, race_slug')
      .eq('driver_slug', slug)
      .eq('position', 1)
      .eq('is_sprint', false)
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

  const relatedPosts = posts.filter((p) => {
    if (!p.slug) return false
    if (p.related_driver_slug === slug) return true
    const fullLower = name.toLowerCase()
    const parts = name.split(/\s+/).filter(Boolean)
    const lastName = (parts[parts.length - 1] ?? '').toLowerCase()
    const t = (p.title ?? '').toLowerCase()
    const b = (p.body ?? '').toLowerCase()
    if (lastName.length >= 3 && (t.includes(lastName) || b.includes(lastName))) return true
    return t.includes(fullLower) || b.includes(fullLower)
  })

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
    relatedPosts: relatedPosts.slice(0, 8),
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
      title: 'Driver Not Found | F1Rec',
      description: 'The requested Formula 1 driver could not be found on F1Rec.',
    }
  }
  const { name, aggregates } = data
  const desc = `Complete Formula 1 career statistics for ${name}. ${aggregates.totalWins} wins, ${aggregates.totalPodiums} podiums, ${Math.round(aggregates.totalPoints).toLocaleString()} points across ${aggregates.totalRaces} races.`
  return {
    title: `${name} — Career Stats, Results & Records | F1Rec`,
    description: desc,
    openGraph: {
      title: `${name} — F1 Career Stats | F1Rec`,
      description: desc,
      type: 'profile',
      url: `https://f1rec.com/drivers/${slug}`,
      siteName: 'F1Rec',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — F1 Career Stats | F1Rec`,
      description: desc,
    },
  }
}

function StatCard({
  label,
  value,
  accent,
  gold,
}: {
  label: string
  value: string | number
  accent?: boolean
  gold?: boolean
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-4 text-center">
      <div
        className={`font-mono text-2xl font-bold leading-tight md:text-[1.65rem] ${
          gold ? 'text-[var(--gold)]' : accent ? 'text-[var(--accent)]' : 'text-[var(--text)]'
        }`}
      >
        {value}
      </div>
      <div className="mt-1 font-display text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </div>
    </div>
  )
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-[var(--border)] py-3 sm:grid-cols-2 sm:gap-4">
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className="font-mono text-sm text-[var(--text)] sm:text-right">{value}</dd>
    </div>
  )
}

export default async function DriverProfilePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const data = await loadDriverProfileData(slug)
  if (!data) notFound()

  const {
    driver,
    name,
    seasonRows,
    aggregates,
    teammates,
    firstRace,
    firstWin,
    titleCount,
    showChampionBadge,
    nationality,
    flag,
    currentTeamLink,
    minYear,
    careerEndLabel,
    relatedPosts,
    titleSeasonRows,
    profile,
    videos,
    raceResults,
  } = data

  const resolvedSearchParams = (await searchParams) ?? {}
  const activeTab = resolvedSearchParams.tab === 'seasons' ? 'seasons' : 'results'
  const seasonsCount = minYear != null && Number(careerEndLabel) ? Number(careerEndLabel) - minYear + 1 : seasonRows.length

  const affiliationName =
    (driver.current_team as string | null)?.trim() || currentTeamLink?.name || null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: 'Formula 1 Driver',
    url: `https://f1rec.com/drivers/${slug}`,
    ...(nationality ? { nationality } : {}),
    ...(affiliationName
      ? {
          affiliation: {
            '@type': 'SportsTeam',
            name: affiliationName,
            ...(currentTeamLink?.slug ? { url: `https://f1rec.com/teams/${currentTeamLink.slug}` } : {}),
          },
        }
      : {}),
    description: `${name} Formula 1 career statistics, season results, and records on F1Rec.`,
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <JsonLd data={jsonLd} id={`driver-jsonld-${slug}`} />
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: '10px' }}>
          <Link href="/drivers" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '14px' }}>
            ← All Drivers
          </Link>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', padding: '32px', minHeight: '240px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {driver.number != null && Number(driver.number) > 0 ? (
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '64px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>#{driver.number}</div>
                ) : null}
                {driver.code ? (
                  <div style={{ width: '32px', height: '32px', borderRadius: '999px', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700 }}>
                    {String(driver.code)}
                  </div>
                ) : null}
              </div>
              <h1 style={{ margin: '8px 0 6px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '56px', fontWeight: 800, lineHeight: 1, color: '#fff', textTransform: 'uppercase' }}>
                <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{String(driver.first_name ?? '').toUpperCase()} </span>
                {String(driver.last_name ?? name).toUpperCase()}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--muted)', fontSize: '14px' }}>
                {flag ? <span>{flag}</span> : null}
                {nationality ? <span>{nationality}</span> : null}
                {minYear != null ? <span>· {minYear}-{careerEndLabel} · {seasonsCount} seasons</span> : null}
              </div>
              {showChampionBadge ? (
                <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '999px', padding: '6px 12px', border: '1px solid color-mix(in srgb, var(--gold) 40%, transparent)', background: 'color-mix(in srgb, var(--gold) 14%, transparent)', color: 'var(--gold)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  <span>👑</span>
                  {titleCount}x World Champion
                </div>
              ) : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Wins', value: aggregates.totalWins, gold: aggregates.totalWins > 0 },
                { label: 'Poles', value: aggregates.totalPoles, gold: false },
                { label: 'Podiums', value: aggregates.totalPodiums, gold: false },
                { label: 'Titles', value: titleCount, gold: titleCount > 0 },
                { label: 'Points', value: Math.round(aggregates.totalPoints).toLocaleString(), gold: false },
                { label: 'Starts', value: aggregates.totalRaces, gold: false },
              ].map((stat) => (
                <div key={stat.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{stat.label}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '32px', fontWeight: 800, color: stat.gold ? 'var(--gold)' : '#fff', lineHeight: 1, marginTop: '6px' }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
              {[
                { id: 'results', label: 'Race Results', href: `/drivers/${slug}?tab=results` },
                { id: 'seasons', label: 'Season by Season', href: `/drivers/${slug}?tab=seasons` },
              ].map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  style={{
                    padding: '12px 20px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '14px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: activeTab === tab.id ? '#fff' : 'var(--muted)',
                    borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: '-1px',
                    textDecoration: 'none',
                  }}
                >
                  {tab.label}
                </Link>
              ))}
            </div>

            {activeTab === 'results' ? (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Race Results</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
                    <thead>
                      <tr>
                        {['Season', 'Race', 'Grid', 'Finish', 'Status', 'Points', 'Team'].map((h) => (
                          <th key={h} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: h === 'Race' || h === 'Team' ? 'left' : 'right', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {raceResults.slice(0, 100).map((row) => {
                        const pos = Number(row.position ?? 0)
                        const status = (row.status ?? '').toUpperCase()
                        const finishColor = pos === 1 ? 'var(--gold)' : pos === 2 ? '#c0c8d8' : pos === 3 ? '#cd7f32' : 'var(--muted)'
                        const statusColor = status.includes('DNF') ? '#ef4444' : status === 'WIN' || pos === 1 ? 'var(--green)' : 'var(--muted)'
                        return (
                          <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{row.season_year ?? '—'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              {row.race_slug ? <Link href={`/races/${row.race_slug}`} style={{ textDecoration: 'none', color: '#fff' }}>{row.race_name ?? 'Grand Prix'}</Link> : <span>{row.race_name ?? 'Grand Prix'}</span>}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{row.grid_position ?? '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}><span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', color: finishColor, fontFamily: 'JetBrains Mono, monospace' }}>{row.position ?? '—'}</span></td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}><span style={{ padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', color: statusColor, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{status || 'FIN'}</span></td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(num(row.points)).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{row.constructor_name ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {activeTab === 'seasons' ? (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Season by Season</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead>
                      <tr>
                        {['Season', 'Team', 'Position', 'Points', 'Wins', 'Poles', 'Podiums'].map((h) => (
                          <th key={h} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: h === 'Team' ? 'left' : 'right', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {seasonRows.map((row) => {
                        const season = unwrapRelation(row.seasons)
                        const team = unwrapRelation(row.teams)
                        const isTitle = season?.champion_driver_id === driver.id
                        return (
                          <tr key={row.id} style={{ borderBottom: '1px solid var(--border)', borderLeft: isTitle ? '3px solid var(--gold)' : '3px solid transparent' }}>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{season?.year ?? '—'}</td>
                            <td style={{ padding: '12px 16px' }}>{team?.slug ? <Link href={`/teams/${team.slug}`} style={{ textDecoration: 'none', color: '#fff' }}>{team.name}</Link> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{row.championship_position ?? '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: isTitle ? 'var(--gold)' : '#fff' }}>{Math.round(num(row.points)).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{num(row.wins)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{num(row.poles)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{num(row.podiums)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          <aside style={{ display: 'grid', gap: '12px' }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Fast Facts</div>
              <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted)', display: 'grid', gap: '8px' }}>
                <div>Nationality: <span style={{ color: '#fff' }}>{nationality ?? '—'}</span></div>
                <div>Date of birth: <span style={{ color: '#fff' }}>{(driver.date_of_birth as string | null) ?? '—'}</span></div>
                <div>First race: <span style={{ color: '#fff' }}>{firstRace?.race_name ?? '—'}</span></div>
                <div>Last race: <span style={{ color: '#fff' }}>{raceResults[0]?.race_name ?? '—'}</span></div>
                <div>Car number: <span style={{ color: '#fff' }}>{driver.number ?? '—'}</span></div>
              </div>
            </div>
            <Link href={`/compare?d1=${encodeURIComponent(slug)}`} style={{ textDecoration: 'none', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', color: '#fff' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>Compare</div>
              <div style={{ marginTop: '6px' }}>Open head-to-head with {name}</div>
            </Link>
            <EmailCapture source="driver-page" hideIntro />
          </aside>
        </div>
      </section>
    </main>
  )
}
