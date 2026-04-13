import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'
import EmailCapture from '@/components/EmailCapture'

type PageProps = {
  params: Promise<{ slug: string }>
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

  const [seasonStatsRes, postsRes, countriesRes] = await Promise.all([
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

  const [teammatesRes, firstRaceRes, firstWinRes, currentTeamRes] = await Promise.all([
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
  for (const row of (teammatesRes.data ?? []) as Array<{
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

export default async function DriverProfilePage({ params }: PageProps) {
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
  } = data

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

  const categoryStyles: Record<string, string> = {
    'race-review': 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]',
    'driver-analysis': 'bg-[color-mix(in_srgb,var(--green)_18%,transparent)] text-[var(--green)]',
    'season-preview': 'bg-[color-mix(in_srgb,var(--blue)_18%,transparent)] text-[var(--blue)]',
    history: 'bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[var(--gold)]',
    tech: 'bg-[color-mix(in_srgb,#ce93d8_18%,transparent)] text-[#ce93d8]',
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <JsonLd data={jsonLd} id={`driver-jsonld-${slug}`} />

      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[color-mix(in_srgb,var(--accent)_10%,transparent)] to-transparent px-6 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 text-sm">
            <Link href="/drivers" className="text-[var(--muted)] no-underline hover:text-[var(--accent)]">
              ← All Drivers
            </Link>
          </div>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
              {driver.number != null && Number(driver.number) > 0 ? (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border)] bg-[var(--bg2)] font-display text-3xl font-extrabold text-[var(--accent)]">
                  #{driver.number}
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                {driver.code ? (
                  <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                    {String(driver.code)}
                  </p>
                ) : null}
                <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-[var(--text)]">
                  {name}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--muted)]">
                  {nationality ? (
                    <span className="inline-flex items-center gap-2">
                      {flag ? <span aria-hidden>{flag}</span> : null}
                      {nationality}
                    </span>
                  ) : null}
                  {minYear != null ? (
                    <span className="font-mono text-xs text-[var(--text)]">
                      {minYear} – {careerEndLabel}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-sm">
                  <span className="text-[var(--muted)]">Team: </span>
                  {driver.is_active === false ? (
                    <span className="text-[var(--text)]">Retired</span>
                  ) : currentTeamLink?.slug ? (
                    <Link
                      href={`/teams/${currentTeamLink.slug}`}
                      className="font-semibold text-[var(--text)] no-underline hover:text-[var(--accent)]"
                    >
                      {currentTeamLink.name}
                    </Link>
                  ) : affiliationName ? (
                    <span className="text-[var(--text)]">{affiliationName}</span>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </div>
                {showChampionBadge ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--gold)_35%,transparent)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                    <span aria-hidden>★</span>
                    {titleCount > 0 ? `${titleCount}× World Champion` : 'World Champion'}
                  </div>
                ) : null}
              </div>
            </div>
            <Link
              href={`/compare?d1=${encodeURIComponent(slug)}`}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-[var(--text)] no-underline transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Compare →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        {/* Career stat cards */}
        <section className="mb-12">
          <h2 className="mb-4 font-display text-lg font-extrabold uppercase tracking-wide text-[var(--text)]">
            Career <span className="text-[var(--accent)]">totals</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3">
            <StatCard label="Races" value={aggregates.totalRaces.toLocaleString()} />
            <StatCard label="Wins" value={aggregates.totalWins.toLocaleString()} accent={aggregates.totalWins > 0} />
            <StatCard label="Podiums" value={aggregates.totalPodiums.toLocaleString()} />
            <StatCard label="Poles" value={aggregates.totalPoles.toLocaleString()} />
            <StatCard label="Points" value={Math.round(aggregates.totalPoints).toLocaleString()} />
            <StatCard label="Championships" value={titleCount} gold={titleCount > 0} />
            <StatCard label="Fastest laps" value={aggregates.totalFastestLaps.toLocaleString()} />
            <StatCard label="DNFs" value={aggregates.totalDnfs.toLocaleString()} />
            <StatCard
              label="Best championship"
              value={
                aggregates.bestChampOrdinal
                  ? `${aggregates.bestChampOrdinal}${aggregates.bestChampYear ? ` (${aggregates.bestChampYear})` : ''}`
                  : '—'
              }
              gold={aggregates.bestChampPos === 1}
            />
          </div>
        </section>

        {/* World championships */}
        {titleSeasonRows.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-extrabold uppercase tracking-wide text-[var(--text)]">
              World <span className="text-[var(--gold)]">Championships</span>
            </h2>
            <ul className="space-y-2">
              {titleSeasonRows.map((row) => {
                const se = unwrapRelation(row.seasons)
                const tm = unwrapRelation(row.teams)
                const y = se?.year ?? '—'
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-baseline gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-3"
                  >
                    <span className="text-lg" aria-hidden>
                      🏆
                    </span>
                    <span className="font-mono font-bold text-[var(--gold)]">{y}</span>
                    <span className="text-[var(--muted)]">·</span>
                    <span className="text-[var(--text)]">{tm?.name ?? '—'}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {/* Career records */}
        <section className="mb-12">
          <h2 className="mb-4 font-display text-lg font-extrabold uppercase tracking-wide text-[var(--text)]">
            Career <span className="text-[var(--accent)]">records</span>
          </h2>
          <dl className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 md:px-6">
            <RecordRow
              label="Best championship finish"
              value={
                aggregates.bestChampOrdinal && aggregates.bestChampYear
                  ? `${aggregates.bestChampOrdinal} · ${aggregates.bestChampYear}`
                  : aggregates.bestChampOrdinal ?? '—'
              }
            />
            <RecordRow
              label="Most wins in a season"
              value={
                aggregates.maxWinsSeason && aggregates.maxWinsSeason.wins > 0
                  ? `${aggregates.maxWinsSeason.wins} · ${aggregates.maxWinsSeason.year}`
                  : '—'
              }
            />
            <RecordRow
              label="Most points in a season"
              value={
                aggregates.maxPointsSeason && aggregates.maxPointsSeason.points > 0
                  ? `${Math.round(aggregates.maxPointsSeason.points).toLocaleString()} · ${aggregates.maxPointsSeason.year}`
                  : '—'
              }
            />
            <RecordRow
              label="Most podiums in a season"
              value={
                aggregates.maxPodiumsSeason && aggregates.maxPodiumsSeason.podiums > 0
                  ? `${aggregates.maxPodiumsSeason.podiums} · ${aggregates.maxPodiumsSeason.year}`
                  : '—'
              }
            />
            <RecordRow
              label="First race"
              value={
                firstRace
                  ? `${firstRace.season_year} · ${firstRace.race_name ?? firstRace.race_slug ?? 'Grand Prix'}`
                  : '—'
              }
            />
            <RecordRow
              label="First win"
              value={
                firstWin
                  ? `${firstWin.season_year} · ${firstWin.race_name ?? firstWin.race_slug ?? 'Grand Prix'}`
                  : '—'
              }
            />
          </dl>
        </section>

        {/* Season table */}
        <section className="mb-12">
          <h2 className="mb-4 font-display text-lg font-extrabold uppercase tracking-wide text-[var(--text)]">
            Season by <span className="text-[var(--accent)]">season</span>
            <span className="ml-2 font-body text-xs font-normal normal-case tracking-normal text-[var(--muted)]">
              {seasonRows.length} season{seasonRows.length !== 1 ? 's' : ''}
            </span>
          </h2>
          {seasonRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--bg2)]">
                    {['Season', 'Team', 'Pos', 'Pts', 'Wins', 'Pods', 'Poles', 'FL', 'Races', 'DNFs'].map((h) => (
                      <th
                        key={h}
                        className={`border-b border-[var(--border)] px-3 py-3 font-display text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)] ${
                          h === 'FL' || h === 'DNFs' ? 'hidden md:table-cell' : ''
                        } ${h === 'Team' ? 'text-left' : 'text-right'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seasonRows.map((row, i) => {
                    const se = unwrapRelation(row.seasons)
                    const tm = unwrapRelation(row.teams)
                    const year = se?.year ?? '—'
                    const seasonSlug = se?.slug ?? String(year)
                    const cp = row.championship_position
                    const posLabel =
                      cp != null && Number.isFinite(Number(cp)) && Number(cp) > 0 ? ordinal(Number(cp)) : '—'
                    const isFirst = cp === 1
                    const races = num(row.races_entered ?? row.starts)
                    return (
                      <tr
                        key={row.id}
                        className={i % 2 === 1 ? 'bg-[color-mix(in_srgb,var(--bg3)_55%,transparent)]' : ''}
                      >
                        <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-display font-bold">
                          <Link href={`/seasons/${seasonSlug}`} className="text-[var(--text)] no-underline hover:text-[var(--accent)]">
                            {year}
                          </Link>
                        </td>
                        <td className="border-b border-[var(--border)] px-3 py-2.5 text-left">
                          {tm?.slug ? (
                            <Link href={`/teams/${tm.slug}`} className="text-[var(--text)] no-underline hover:text-[var(--accent)]">
                              {tm.name ?? '—'}
                            </Link>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td
                          className={`border-b border-[var(--border)] px-3 py-2.5 text-right font-mono ${
                            isFirst ? 'font-bold text-[var(--gold)]' : 'text-[var(--text)]'
                          }`}
                        >
                          {posLabel}
                        </td>
                        <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[var(--text)]">
                          {Math.round(num(row.points)).toLocaleString()}
                        </td>
                        <td
                          className={`border-b border-[var(--border)] px-3 py-2.5 text-right font-mono ${
                            num(row.wins) > 0 ? 'font-semibold text-[var(--accent)]' : 'text-[var(--muted)]'
                          }`}
                        >
                          {num(row.wins)}
                        </td>
                        <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[var(--muted)]">
                          {num(row.podiums)}
                        </td>
                        <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[var(--muted)]">
                          {num(row.poles)}
                        </td>
                        <td className="hidden border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[var(--muted)] md:table-cell">
                          {num(row.fastest_laps)}
                        </td>
                        <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[var(--muted)]">
                          {races}
                        </td>
                        <td className="hidden border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[var(--muted)] md:table-cell">
                          {num(row.dnfs)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[var(--muted)]">No season-by-season data available.</p>
          )}
        </section>

        {/* Teammates */}
        {teammates.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-3 font-display text-lg font-extrabold uppercase tracking-wide text-[var(--text)]">
              Teammates
            </h2>
            <p className="mb-3 text-sm text-[var(--muted)]">Drivers who shared a constructor in the same season.</p>
            <p className="flex flex-wrap gap-x-1 gap-y-2 text-sm leading-relaxed text-[var(--text)]">
              {teammates.map((t, idx) => (
                <span key={t.slug}>
                  {idx > 0 ? <span className="text-[var(--muted)]"> · </span> : null}
                  <Link href={`/drivers/${t.slug}`} className="text-[var(--accent)] no-underline hover:underline">
                    {t.full_name}
                  </Link>
                </span>
              ))}
            </p>
          </section>
        ) : null}

        {/* Compare CTA */}
        <section className="mb-12">
          <Link
            href={`/compare?d1=${encodeURIComponent(slug)}`}
            className="flex flex-col gap-2 rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--accent)] bg-[var(--bg2)] px-6 py-6 no-underline transition-opacity hover:opacity-95 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-display text-lg font-extrabold uppercase text-[var(--text)]">
                <span aria-hidden className="mr-2">
                  ⚔️
                </span>
                Compare {name} head-to-head
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">Stack stats against any other driver on F1Rec.</p>
            </div>
            <span className="font-display text-sm font-bold uppercase tracking-wide text-[var(--accent)]">Open compare →</span>
          </Link>
        </section>

        {/* Related posts */}
        {relatedPosts.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-extrabold uppercase tracking-wide text-[var(--text)]">
              Articles about <span className="text-[var(--accent)]">{name}</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedPosts.map((p) => (
                <Link
                  key={p.slug!}
                  href={`/blog/${p.slug}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 no-underline transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
                >
                  {p.category ? (
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-wider ${
                        categoryStyles[p.category] ?? 'bg-[var(--bg3)] text-[var(--muted)]'
                      }`}
                    >
                      {p.category.replace(/-/g, ' ')}
                    </span>
                  ) : null}
                  <h3 className="mt-2 font-display text-base font-bold text-[var(--text)]">{p.title ?? 'Article'}</h3>
                  <p className="mt-2 font-mono text-xs text-[var(--muted)]">
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : ''}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="max-w-3xl">
          <EmailCapture source="driver-page" />
        </section>
      </div>
    </main>
  )
}
