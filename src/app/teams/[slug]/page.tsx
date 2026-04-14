import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import JsonLd from '@/components/JsonLd'
import EmailCapture from '@/components/EmailCapture'

type PageProps = {
  params: Promise<{ slug: string }>
}

type TeamRow = Record<string, unknown> & {
  id: string
  slug: string
  name: string
  championships?: number | null
  primary_color?: string | null
  nationality?: string | null
  team_principal?: string | null
  is_constructor_champion?: boolean | null
  base?: string | null
  founded_year?: number | null
  full_name?: string | null
}

type TeamSeasonRow = {
  id: string
  championship_position?: number | null
  position?: number | null
  points?: number | string | null
  wins?: number | string | null
  podiums?: number | string | null
  poles?: number | string | null
  fastest_laps?: number | string | null
  races_entered?: number | string | null
  starts?: number | string | null
  dnfs?: number | string | null
  seasons: {
    id: string
    year: number
    slug: string
    champion_team_id?: string | null
  } | null
}

type DssRow = {
  driver_id: string
  wins?: number | string | null
  podiums?: number | string | null
  poles?: number | string | null
  points?: number | string | null
  starts?: number | string | null
  championship_position?: number | string | null
  drivers: { full_name: string; slug: string; is_champion?: boolean | null } | null
  seasons: { year: number } | null
}

type PostRow = {
  title: string | null
  slug: string | null
  category: string | null
  published_at: string | null
  body: string | null
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

function champPos(row: TeamSeasonRow): number | null {
  const cp = row.championship_position ?? row.position
  if (cp == null) return null
  const n = Number(cp)
  return Number.isFinite(n) && n > 0 ? n : null
}

type TeamAggregates = {
  seasonCount: number
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
  minYear: number | null
  maxYear: number | null
}

function computeTeamAggregates(rows: TeamSeasonRow[], teamId: string): TeamAggregates {
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
  const years: number[] = []

  for (const row of rows) {
    const se = unwrapRelation(row.seasons)
    const year = se?.year ?? 0
    if (year > 0) years.push(year)

    totalRaces += num(row.races_entered ?? row.starts)
    const w = num(row.wins)
    const p = num(row.podiums)
    const po = num(row.poles)
    const pts = num(row.points)
    totalWins += w
    totalPodiums += p
    totalPoles += po
    totalPoints += pts
    totalFastestLaps += num(row.fastest_laps)
    totalDnfs += num(row.dnfs)

    if (se?.champion_team_id === teamId) titleCount += 1

    const cpos = champPos(row)
    if (cpos != null) {
      if (bestChampPos == null || cpos < bestChampPos) {
        bestChampPos = cpos
        bestChampYear = year || null
      }
    }

    if (year > 0) {
      if (!maxWinsSeason || w > maxWinsSeason.wins) maxWinsSeason = { wins: w, year }
      if (!maxPointsSeason || pts > maxPointsSeason.points) maxPointsSeason = { points: pts, year }
      if (!maxPodiumsSeason || p > maxPodiumsSeason.podiums) maxPodiumsSeason = { podiums: p, year }
    }
  }

  const minYear = years.length ? Math.min(...years) : null
  const maxYear = years.length ? Math.max(...years) : null

  return {
    seasonCount: rows.length,
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
    bestChampOrdinal: bestChampPos != null ? ordinal(bestChampPos) : null,
    maxWinsSeason,
    maxPointsSeason,
    maxPodiumsSeason,
    minYear,
    maxYear,
  }
}

type DriverAgg = {
  driver_id: string
  slug: string
  full_name: string
  is_champion: boolean
  wins: number
  podiums: number
  poles: number
  points: number
  starts: number
  minYear: number
  maxYear: number
}

function yearsLabel(minY: number, maxY: number): string {
  if (minY === maxY) return String(minY)
  return `${minY}–${maxY}`
}

function aggregateDrivers(rows: DssRow[]): Map<string, DriverAgg> {
  const map = new Map<string, DriverAgg>()
  for (const row of rows) {
    const dr = unwrapRelation(row.drivers)
    const se = unwrapRelation(row.seasons)
    if (!dr?.slug || !row.driver_id) continue
    const year = se?.year ?? 0
    const existing = map.get(row.driver_id)
    if (!existing) {
      map.set(row.driver_id, {
        driver_id: row.driver_id,
        slug: dr.slug,
        full_name: dr.full_name,
        is_champion: Boolean(dr.is_champion),
        wins: num(row.wins),
        podiums: num(row.podiums),
        poles: num(row.poles),
        points: num(row.points),
        starts: num(row.starts),
        minYear: year > 0 ? year : 9999,
        maxYear: year > 0 ? year : 0,
      })
      continue
    }
    existing.wins += num(row.wins)
    existing.podiums += num(row.podiums)
    existing.poles += num(row.poles)
    existing.points += num(row.points)
    existing.starts += num(row.starts)
    existing.is_champion = existing.is_champion || Boolean(dr.is_champion)
    if (year > 0) {
      existing.minYear = Math.min(existing.minYear, year)
      existing.maxYear = Math.max(existing.maxYear, year)
    }
  }
  return map
}

type LoadedTeam = {
  team: TeamRow
  teamSeasonRows: TeamSeasonRow[]
  aggregates: TeamAggregates
  titleSeasons: { year: number; id: string }[]
  driverAggs: DriverAgg[]
  champions: DriverAgg[]
  topScorers: DriverAgg[]
  fullRoster: DriverAgg[]
  driversCurrentYear: Array<{
    slug: string
    full_name: string
    championship_position: number | null
    wins: number
    podiums: number
    points: number
  }>
  firstWin: { season_year: number; race_name: string | null; race_slug: string | null } | null
  relatedPosts: PostRow[]
  flag: string | null
  showFlColumn: boolean
}

async function loadTeamPageData(slug: string): Promise<LoadedTeam | null> {
  const supabase = createServerClient()
  const { data: team, error: teamErr } = await supabase.from('teams').select('*').eq('slug', slug).maybeSingle()
  if (teamErr || !team) return null

  const t = team as TeamRow
  const teamId = t.id
  const thisYear = new Date().getFullYear()

  const [tssRes, dssRes, postsRes, countriesRes, fwRes] = await Promise.all([
    supabase
      .from('team_season_stats')
      .select(
        'id, championship_position, position, points, wins, podiums, poles, fastest_laps, races_entered, starts, dnfs, seasons!inner(id, year, slug, champion_team_id)'
      )
      .eq('team_id', teamId)
      .order('seasons(year)', { ascending: false }),
    supabase
      .from('driver_season_stats')
      .select(
        'driver_id, season_id, wins, podiums, poles, points, starts, championship_position, drivers(full_name, slug, is_champion), seasons!inner(year)'
      )
      .eq('team_id', teamId),
    supabase.from('posts').select('title, slug, category, published_at, body').eq('is_published', true),
    supabase.from('countries').select('name, flag_emoji'),
    supabase
      .from('results')
      .select('season_year, round, race_name, race_slug')
      .eq('constructor_slug', slug)
      .eq('position', 1)
      .eq('is_sprint', false)
      .order('season_year', { ascending: true })
      .order('round', { ascending: true })
      .limit(1),
  ])

  let teamSeasonRows = (tssRes.data ?? []) as TeamSeasonRow[]
  if (tssRes.error) {
    const fallback = await supabase
      .from('team_season_stats')
      .select('id, championship_position, points, wins, podiums, seasons!inner(id, year, slug, champion_team_id)')
      .eq('team_id', teamId)
      .order('seasons(year)', { ascending: false })
    teamSeasonRows = (fallback.data ?? []) as TeamSeasonRow[]
  }

  const aggregates = computeTeamAggregates(teamSeasonRows, teamId)
  const dbTitles = aggregates.titleCount
  const colTitles = num(t.championships)
  const titleCount = Math.max(dbTitles, colTitles)

  const titleSeasons = teamSeasonRows
    .filter((row) => unwrapRelation(row.seasons)?.champion_team_id === teamId)
    .map((row) => {
      const se = unwrapRelation(row.seasons)!
      return { year: se.year, id: row.id }
    })
    .sort((a, b) => b.year - a.year)

  const dssRows = (dssRes.data ?? []) as DssRow[]
  const aggMap = aggregateDrivers(dssRows)
  const driverAggs = [...aggMap.values()].filter((d) => d.maxYear > 0)

  const champions = driverAggs.filter((d) => d.is_champion).sort((a, b) => b.wins - a.wins || b.points - a.points)

  const topScorers = driverAggs
    .filter((d) => !d.is_champion)
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .slice(0, 10)

  const fullRoster = [...driverAggs].sort((a, b) => b.maxYear - a.maxYear || a.full_name.localeCompare(b.full_name))

  const driversCurrentYear: LoadedTeam['driversCurrentYear'] = []
  for (const row of dssRows) {
    const se = unwrapRelation(row.seasons)
    const dr = unwrapRelation(row.drivers)
    if (!dr || se?.year !== thisYear) continue
    const cp = row.championship_position != null ? Number(row.championship_position) : null
    const existing = driversCurrentYear.find((x) => x.slug === dr.slug)
    if (existing) {
      existing.wins += num(row.wins)
      existing.podiums += num(row.podiums)
      existing.points += num(row.points)
      const pos = cp != null && Number.isFinite(cp) ? cp : null
      if (pos != null && (existing.championship_position == null || pos < existing.championship_position)) {
        existing.championship_position = pos
      }
      continue
    }
    driversCurrentYear.push({
      slug: dr.slug,
      full_name: dr.full_name,
      championship_position: cp != null && Number.isFinite(cp) ? cp : null,
      wins: num(row.wins),
      podiums: num(row.podiums),
      points: num(row.points),
    })
  }
  driversCurrentYear.sort((a, b) => {
    const ap = a.championship_position ?? 999
    const bp = b.championship_position ?? 999
    if (ap !== bp) return ap - bp
    return b.points - a.points
  })

  const firstWinRow = (fwRes.data ?? [])[0] as
    | { season_year: number; race_name: string | null; race_slug: string | null }
    | undefined
  const firstWin = firstWinRow
    ? {
        season_year: firstWinRow.season_year,
        race_name: firstWinRow.race_name,
        race_slug: firstWinRow.race_slug,
      }
    : null

  const posts = (postsRes.data ?? []) as PostRow[]
  const teamName = String(t.name ?? '').trim()
  const nameLower = teamName.toLowerCase()
  const tokens = teamName.split(/\s+/).filter((w) => w.length >= 3)
  const relatedPosts = posts.filter((p) => {
    if (!p.slug) return false
    const title = (p.title ?? '').toLowerCase()
    const body = (p.body ?? '').toLowerCase()
    if (title.includes(nameLower) || body.includes(nameLower)) return true
    return tokens.some((tok) => title.includes(tok.toLowerCase()) || body.includes(tok.toLowerCase()))
  })

  let flag: string | null = null
  const nat = (t.nationality as string | null)?.trim()
  if (nat && !countriesRes.error && countriesRes.data) {
    const lower = nat.toLowerCase()
    for (const c of countriesRes.data as { name: string; flag_emoji: string | null }[]) {
      if (c.name && c.flag_emoji && c.name.toLowerCase() === lower) {
        flag = c.flag_emoji
        break
      }
    }
    if (!flag) {
      for (const c of countriesRes.data as { name: string; flag_emoji: string | null }[]) {
        if (c.name && c.flag_emoji && (lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower))) {
          flag = c.flag_emoji
          break
        }
      }
    }
  }

  const showFlColumn = teamSeasonRows.some((row) => num(row.fastest_laps) > 0)

  return {
    team: t,
    teamSeasonRows,
    aggregates,
    titleSeasons,
    driverAggs,
    champions,
    topScorers,
    fullRoster,
    driversCurrentYear,
    firstWin,
    relatedPosts: relatedPosts.slice(0, 8),
    flag,
    showFlColumn,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await loadTeamPageData(slug)
  if (!data) {
    return {
      title: 'Team Not Found | F1Rec',
      description: 'The requested Formula 1 team could not be found.',
    }
  }
  const { team, aggregates, titleCount } = data
  const name = String(team.name ?? 'Team')
  const championships = titleCount ?? 0
  const descStats =
    championships > 0
      ? `${aggregates.totalWins} wins, ${aggregates.totalPodiums} podiums, ${championships} championships across ${aggregates.seasonCount} seasons.`
      : `${aggregates.totalWins} wins, ${aggregates.totalPodiums} podiums across ${aggregates.seasonCount} seasons.`
  const desc = `Complete Formula 1 constructor statistics for ${name}. ${descStats}`
  return {
    title: `${name} — Constructor Stats, History & Drivers | F1Rec`,
    description: desc,
    openGraph: {
      title: `${name} — F1 Constructor Stats | F1Rec`,
      description: desc,
      type: 'website',
      url: `https://f1rec.com/teams/${slug}`,
      siteName: 'F1Rec',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — F1 Constructor Stats | F1Rec`,
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

const categoryStyles: Record<string, string> = {
  'race-review': 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]',
  'driver-analysis': 'bg-[color-mix(in_srgb,var(--green)_18%,transparent)] text-[var(--green)]',
  'season-preview': 'bg-[color-mix(in_srgb,var(--blue)_18%,transparent)] text-[var(--blue)]',
  history: 'bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[var(--gold)]',
  tech: 'bg-[color-mix(in_srgb,#ce93d8_18%,transparent)] text-[#ce93d8]',
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { slug } = await params
  const data = await loadTeamPageData(slug)
  if (!data) notFound()

  const {
    team,
    teamSeasonRows,
    aggregates,
    titleSeasons,
    champions,
    topScorers,
    fullRoster,
    driversCurrentYear,
    firstWin,
    relatedPosts,
    flag,
    showFlColumn,
  } = data

  const name = String(team.name ?? 'Team')
  const accent = (team.primary_color as string) || 'var(--accent)'
  const thisYear = new Date().getFullYear()
  const careerEnd =
    aggregates.maxYear != null && aggregates.maxYear >= thisYear ? 'Present' : aggregates.maxYear != null ? String(aggregates.maxYear) : '—'
  const showChampBadge = Boolean(team.is_constructor_champion) || titleSeasons.length > 0 || num(team.championships) > 0
  const titleCount = Math.max(aggregates.titleCount, num(team.championships))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name,
    sport: 'Formula 1',
    url: `https://f1rec.com/teams/${slug}`,
    description:
      titleCount > 0
        ? `${name} has ${aggregates.totalWins} wins, ${aggregates.totalPodiums} podiums, and ${titleCount} constructor championships.`
        : `${name} has ${aggregates.totalWins} wins and ${aggregates.totalPodiums} podiums in Formula 1.`,
    ...(team.nationality ? { location: { '@type': 'Place', name: String(team.nationality) } } : {}),
  }

  const fmtPoints = (n: number) => Math.round(n).toLocaleString()

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <JsonLd data={jsonLd} id={`team-jsonld-${slug}`} />

      <section
        className="border-b border-[var(--border)] bg-gradient-to-b to-transparent px-6 py-10 md:py-14"
        style={{
          backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${accent} 18%, transparent) 0%, transparent 100%)`,
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 text-sm">
            <Link href="/teams" className="text-[var(--muted)] no-underline hover:text-[var(--accent)]">
              ← All Teams
            </Link>
          </div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
                Constructor
              </p>
              <h1 className="mt-1 font-display text-[clamp(2rem,5vw,3.25rem)] font-black leading-tight text-[var(--text)]">
                {name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--muted)]">
                {team.nationality ? (
                  <span className="inline-flex items-center gap-2">
                    {flag ? <span aria-hidden>{flag}</span> : null}
                    {String(team.nationality)}
                  </span>
                ) : null}
                {team.team_principal ? (
                  <span>
                    Team Principal: <span className="text-[var(--text)]">{String(team.team_principal)}</span>
                  </span>
                ) : null}
                {aggregates.minYear != null ? (
                  <span className="font-mono text-xs text-[var(--text)]">
                    {aggregates.minYear} – {careerEnd}
                  </span>
                ) : null}
                {team.base ? <span>Base: {String(team.base)}</span> : null}
                {team.founded_year ? <span>Founded {String(team.founded_year)}</span> : null}
              </div>
              {showChampBadge ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--gold)_35%,transparent)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                  <span aria-hidden>🏆</span>
                  {titleCount > 0 ? `${titleCount}× Constructor Champion` : 'Constructor Champion'}
                </div>
              ) : null}
            </div>
            <Link
              href="/leaderboards?tab=constructors"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-[var(--text)] no-underline hover:border-[var(--accent)]"
            >
              Leaderboards →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <section className="mb-12">
          <h2 className="mb-4 font-display text-lg font-extrabold tracking-wide text-[var(--text)]">
            Career <span className="text-[var(--accent)]">totals</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard label="Seasons" value={aggregates.seasonCount.toLocaleString()} />
            <StatCard label="Races" value={aggregates.totalRaces.toLocaleString()} />
            <StatCard label="Wins" value={aggregates.totalWins.toLocaleString()} accent={aggregates.totalWins > 0} />
            <StatCard label="Podiums" value={aggregates.totalPodiums.toLocaleString()} />
            <StatCard label="Poles" value={aggregates.totalPoles.toLocaleString()} />
            <StatCard label="Points" value={fmtPoints(aggregates.totalPoints)} />
            <StatCard label="Championships" value={titleCount} gold={titleCount > 0} />
            {aggregates.totalFastestLaps > 0 ? (
              <StatCard label="Fastest laps" value={aggregates.totalFastestLaps.toLocaleString()} />
            ) : null}
            {aggregates.totalDnfs > 0 ? <StatCard label="DNFs" value={aggregates.totalDnfs.toLocaleString()} /> : null}
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

        {titleSeasons.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-extrabold tracking-wide text-[var(--text)]">
              Constructor <span className="text-[var(--gold)]">Championships</span>
            </h2>
            <ul className="flex flex-wrap gap-2">
              {titleSeasons.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-2 font-mono font-bold text-[var(--gold)]"
                >
                  ★ {t.year}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mb-12">
          <h2 className="mb-4 font-display text-lg font-extrabold tracking-wide text-[var(--text)]">
            Team <span className="text-[var(--accent)]">records</span>
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
                  ? `${fmtPoints(aggregates.maxPointsSeason.points)} · ${aggregates.maxPointsSeason.year}`
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
              label="First season"
              value={aggregates.minYear != null ? String(aggregates.minYear) : '—'}
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

        <section className="mb-12">
          <h2 className="mb-4 font-display text-lg font-extrabold tracking-wide text-[var(--text)]">
            Season by <span className="text-[var(--accent)]">season</span>
            <span className="ml-2 font-body text-xs font-normal normal-case tracking-normal text-[var(--muted)]">
              {teamSeasonRows.length} season{teamSeasonRows.length !== 1 ? 's' : ''}
            </span>
          </h2>
          {teamSeasonRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--bg2)]">
                    {['Season', 'Pos', 'Pts', 'Wins', 'Pods', 'Poles', ...(showFlColumn ? ['FL'] : []), 'Races'].map((h) => (
                      <th
                        key={h}
                        className={`border-b border-[var(--border)] px-3 py-3 font-display text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)] ${
                          h === 'FL' ? 'hidden md:table-cell' : ''
                        } ${h === 'Season' ? 'text-left' : 'text-right'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamSeasonRows.map((row, i) => {
                    const se = unwrapRelation(row.seasons)
                    const year = se?.year ?? '—'
                    const seasonSlug = se?.slug ?? String(year)
                    const cpos = champPos(row)
                    const posLabel = cpos != null ? ordinal(cpos) : '—'
                    const races = num(row.races_entered ?? row.starts)
                    return (
                      <tr
                        key={row.id}
                        className={i % 2 === 1 ? 'bg-[color-mix(in_srgb,var(--bg3)_55%,transparent)]' : ''}
                      >
                        <td className="border-b border-[var(--border)] px-3 py-2.5 text-left font-display font-bold">
                          <Link
                            href={`/seasons/${seasonSlug}`}
                            className="text-[var(--text)] no-underline hover:text-[var(--accent)]"
                          >
                            {year}
                          </Link>
                        </td>
                        <td
                          className={`border-b border-[var(--border)] px-3 py-2.5 text-right font-mono ${
                            cpos === 1 ? 'font-bold text-[var(--gold)]' : 'text-[var(--text)]'
                          }`}
                        >
                          {posLabel}
                        </td>
                        <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[var(--text)]">
                          {fmtPoints(num(row.points))}
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
                        {showFlColumn ? (
                          <td className="hidden border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[var(--muted)] md:table-cell">
                            {num(row.fastest_laps)}
                          </td>
                        ) : null}
                        <td className="border-b border-[var(--border)] px-3 py-2.5 text-right font-mono text-[var(--muted)]">
                          {races}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[var(--muted)]">No constructor season data yet.</p>
          )}
        </section>

        {driversCurrentYear.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-extrabold tracking-wide text-[var(--text)]">
              {thisYear} <span className="text-[var(--accent)]">drivers</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {driversCurrentYear.map((d, idx) => {
                const cardClass =
                  'rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 no-underline transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]'
                const inner = (
                  <>
                    <p className="font-display text-lg font-bold text-[var(--text)]">{d.full_name}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs text-[var(--muted)]">
                      <div>
                        <dt className="text-[10px] uppercase">WDC pos</dt>
                        <dd className="text-[var(--gold)]">{d.championship_position != null ? ordinal(d.championship_position) : '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase">Points</dt>
                        <dd className="text-[var(--text)]">{fmtPoints(d.points)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase">Wins</dt>
                        <dd className="text-[var(--text)]">{d.wins}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase">Podiums</dt>
                        <dd className="text-[var(--text)]">{d.podiums}</dd>
                      </div>
                    </dl>
                  </>
                )
                const k = d.slug?.trim() || `driver-${idx}-${d.full_name}`
                return d.slug?.trim() ? (
                  <Link key={k} href={`/drivers/${d.slug}`} className={cardClass}>
                    {inner}
                  </Link>
                ) : (
                  <div key={k} className={cardClass.replace(' no-underline', '')}>
                    {inner}
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="mb-12">
          <h2 className="mb-4 font-display text-lg font-extrabold tracking-wide text-[var(--text)]">
            Notable <span className="text-[var(--accent)]">drivers</span>
          </h2>

          {champions.length > 0 ? (
            <div className="mb-8">
              <h3 className="mb-2 font-display text-sm font-bold tracking-wider text-[var(--gold)]">
                World champions who drove for {name}
              </h3>
              <ul className="space-y-2">
                {champions.map((d) => (
                  <li key={d.slug} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                    <Link href={`/drivers/${d.slug}`} className="font-semibold text-[var(--text)] no-underline hover:text-[var(--accent)]">
                      {d.full_name}
                    </Link>
                    <span className="font-mono text-xs text-[var(--muted)]">
                      {yearsLabel(d.minYear, d.maxYear)} · {d.wins} wins · {fmtPoints(d.points)} pts
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {topScorers.length > 0 ? (
            <div className="mb-8">
              <h3 className="mb-2 font-display text-sm font-bold tracking-wider text-[var(--muted)]">
                Top scorers (points for {name})
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {topScorers.map((d) => (
                  <div key={d.slug} className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5">
                    <Link href={`/drivers/${d.slug}`} className="font-semibold text-[var(--accent)] no-underline hover:underline">
                      {d.full_name}
                    </Link>
                    <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                      {yearsLabel(d.minYear, d.maxYear)} · {d.wins}W / {d.podiums}P · {fmtPoints(d.points)} pts
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {fullRoster.length > 0 ? (
            <details className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
              <summary className="cursor-pointer font-display text-sm font-bold uppercase tracking-wider text-[var(--text)]">
                Full driver roster ({fullRoster.length})
              </summary>
              <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
                {fullRoster.map((d) => (
                  <li
                    key={d.slug}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] border-opacity-60 py-2 text-sm last:border-0"
                  >
                    <Link href={`/drivers/${d.slug}`} className="text-[var(--text)] no-underline hover:text-[var(--accent)]">
                      {d.full_name}
                    </Link>
                    <span className="font-mono text-xs text-[var(--muted)]">
                      {yearsLabel(d.minYear, d.maxYear)} · {d.starts} races
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="text-[var(--muted)]">No driver season stats linked to this team yet.</p>
          )}
        </section>

        <section className="mb-12">
          <Link
            href="/leaderboards?tab=constructors"
            className="flex flex-col gap-2 rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--accent)] bg-[var(--bg2)] px-6 py-6 no-underline transition-opacity hover:opacity-95 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-display text-lg font-extrabold uppercase text-[var(--text)]">
                Compare {name} with rivals
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">See all-time constructor records on the leaderboards.</p>
            </div>
            <span className="font-display text-sm font-bold uppercase tracking-wide text-[var(--accent)]">Open leaderboards →</span>
          </Link>
        </section>

        {relatedPosts.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-extrabold tracking-wide text-[var(--text)]">
              Articles mentioning <span className="text-[var(--accent)]">{name}</span>
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
          <EmailCapture source="team-page" />
        </section>
      </div>
    </main>
  )
}
