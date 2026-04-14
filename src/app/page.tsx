import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import EmailCapture from '@/components/EmailCapture'
import DidYouKnowWidget from '@/components/random/DidYouKnowWidget'

/** Refresh homepage data hourly via ISR. */
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'F1Rec — Every Stat. Every Race. Every Era.',
  description:
    'The definitive Formula 1 statistics platform — seasons, drivers, race results, standings, and head-to-head comparisons from 1950 to today.',
  openGraph: {
    title: 'F1Rec — Every Stat. Every Race. Every Era.',
    description:
      'The definitive Formula 1 statistics platform — seasons, drivers, race results, standings, and head-to-head comparisons from 1950 to today.',
    url: 'https://f1rec.com',
    siteName: 'F1Rec',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'F1Rec — Every Stat. Every Race. Every Era.',
    description:
      'The definitive Formula 1 statistics platform — seasons, drivers, race results, standings, and head-to-head comparisons from 1950 to today.',
  },
}

type SeasonRow = {
  id: string
  year: number
  slug: string
  champion_driver_id: string | null
  champion_team_id: string | null
}

type DriverStandingRow = {
  championship_position: number | null
  points: number | string | null
  wins: number | string | null
  podiums: number | string | null
  drivers: { full_name: string; slug: string } | { full_name: string; slug: string }[]
  teams: { name: string; slug: string } | { name: string; slug: string }[]
}

type TeamStandingRow = {
  championship_position: number | null
  points: number | string | null
  teams: { name: string; slug: string } | { name: string; slug: string }[]
}

type ResultStandingRow = {
  driver_slug: string | null
  driver_name: string | null
  constructor_slug: string | null
  constructor_name: string | null
  points: number | string | null
  position: number | string | null
  is_sprint: boolean | null
}

type RandomStatRow = {
  id: string
  stat_text: string | null
  category: string | null
  related_driver_slug: string | null
  related_team_slug: string | null
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

function toInt(v: number | string | null | undefined): number | null {
  if (v == null) return null
  const parsed = typeof v === 'number' ? v : Number.parseInt(String(v), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function deriveStandingsFromResults(rows: ResultStandingRow[]) {
  const driverMap = new Map<
    string,
    { fullName: string; slug: string; teamName: string; teamSlug: string; points: number; wins: number; podiums: number }
  >()
  const teamMap = new Map<string, { name: string; slug: string; points: number }>()

  for (const row of rows) {
    const driverSlug = (row.driver_slug ?? '').trim()
    const driverName = (row.driver_name ?? '').trim()
    const teamSlug = (row.constructor_slug ?? '').trim()
    const teamName = (row.constructor_name ?? '').trim()
    if (!driverSlug || !teamSlug) continue

    const pts = num(row.points)
    const position = toInt(row.position)
    const isRaceResult = row.is_sprint !== true

    const driver = driverMap.get(driverSlug) ?? {
      fullName: driverName || driverSlug,
      slug: driverSlug,
      teamName: teamName || teamSlug,
      teamSlug,
      points: 0,
      wins: 0,
      podiums: 0,
    }
    driver.points += pts
    if (isRaceResult && position === 1) driver.wins += 1
    if (isRaceResult && position != null && position > 0 && position <= 3) driver.podiums += 1
    if (teamName && (!driver.teamName || driver.teamName === driver.teamSlug)) {
      driver.teamName = teamName
    }
    driverMap.set(driverSlug, driver)

    const team = teamMap.get(teamSlug) ?? { name: teamName || teamSlug, slug: teamSlug, points: 0 }
    team.points += pts
    if (teamName && (!team.name || team.name === team.slug)) team.name = teamName
    teamMap.set(teamSlug, team)
  }

  const wdc2026 = [...driverMap.values()]
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums || a.fullName.localeCompare(b.fullName))
    .slice(0, 10)
    .map((row, idx) => ({
      pos: idx + 1,
      fullName: row.fullName,
      slug: row.slug,
      teamName: row.teamName,
      teamSlug: row.teamSlug,
      points: row.points,
    }))

  const wcc2026 = [...teamMap.values()]
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((row, idx) => ({
      pos: idx + 1,
      name: row.name,
      slug: row.slug,
      points: row.points,
    }))

  return { wdc2026, wcc2026 }
}

function pickRandom<T>(rows: T[]): T | null {
  if (rows.length === 0) return null
  const index = Math.floor(Math.random() * rows.length)
  return rows[index] ?? null
}

async function loadHomePageData() {
  const supabase = createServerClient()

  const empty = {
    counts: { drivers: 818, seasons: 77, results: 25872, teams: 206 },
    season2025: null as SeasonRow | null,
    season2026: null as SeasonRow | null,
    season2026Slug: null as string | null,
    champion2025: null as {
      fullName: string
      slug: string
      teamName: string | null
      teamSlug: string | null
      wins: number
      podiums: number
      points: number
    } | null,
    wdc2026: [] as Array<{
      pos: number
      fullName: string
      slug: string
      teamName: string
      teamSlug: string
      points: number
    }>,
    wcc2026: [] as Array<{ pos: number; name: string; slug: string; points: number }>,
    recentRaces2026: [] as Array<{
      name: string
      slug: string
      round: number
      dateLabel: string
      circuitName: string
      winnerName: string
      winnerSlug: string | null
    }>,
    randomStat: null as RandomStatRow | null,
    simCounts: { products: 57, reviews: 12, brands: 27 },
  }

  try {
    const [
      driversCountRes,
      seasonsCountRes,
      resultsCountRes,
      teamsCountRes,
      season2025Res,
      season2026Res,
      simProductsRes,
      simReviewsRes,
      simBrandsRes,
      randomStatsRes,
    ] = await Promise.all([
      supabase.from('drivers').select('*', { count: 'exact', head: true }),
      supabase.from('seasons').select('*', { count: 'exact', head: true }),
      supabase.from('results').select('*', { count: 'exact', head: true }),
      supabase.from('teams').select('*', { count: 'exact', head: true }),
      supabase.from('seasons').select('id, year, slug, champion_driver_id, champion_team_id').eq('year', 2025).maybeSingle(),
      supabase.from('seasons').select('id, year, slug, champion_driver_id, champion_team_id').eq('year', 2026).maybeSingle(),
      supabase.from('sim_products').select('*', { count: 'exact', head: true }),
      supabase.from('sim_reviews').select('*', { count: 'exact', head: true }),
      supabase.from('sim_brands').select('*', { count: 'exact', head: true }),
      supabase
        .from('random_stats')
        .select('id, stat_text, category, related_driver_slug, related_team_slug')
        .eq('is_active', true),
    ])

    const counts = {
      drivers: driversCountRes.count ?? empty.counts.drivers,
      seasons: seasonsCountRes.count ?? empty.counts.seasons,
      results: resultsCountRes.count ?? empty.counts.results,
      teams: teamsCountRes.count ?? empty.counts.teams,
    }

    const season2025 = (season2025Res.data as SeasonRow | null) ?? null
    const season2026 = (season2026Res.data as SeasonRow | null) ?? null
    const season2026Slug = season2026?.slug ?? null

    let champion2025 = empty.champion2025
    if (season2025?.champion_driver_id) {
      const [{ data: driverRow }, statsRes] = await Promise.all([
        supabase.from('drivers').select('full_name, slug').eq('id', season2025.champion_driver_id).maybeSingle(),
        supabase
          .from('driver_season_stats')
          .select('wins, podiums, points, teams(name, slug)')
          .eq('season_id', season2025.id)
          .eq('driver_id', season2025.champion_driver_id)
          .maybeSingle(),
      ])
      const d = driverRow as { full_name: string; slug: string } | null
      const st = statsRes.data as {
        wins?: number | string | null
        podiums?: number | string | null
        points?: number | string | null
        teams?: { name: string; slug: string } | { name: string; slug: string }[]
      } | null
      const teamRel = unwrapRelation(st?.teams ?? null)
      if (d) {
        champion2025 = {
          fullName: d.full_name,
          slug: d.slug,
          teamName: teamRel?.name ?? null,
          teamSlug: teamRel?.slug ?? null,
          wins: num(st?.wins),
          podiums: num(st?.podiums),
          points: num(st?.points),
        }
      }
    }

    let wdc2026 = empty.wdc2026
    let wcc2026 = empty.wcc2026
    if (season2026?.id) {
      const [dssRes, tssRes] = await Promise.all([
        supabase
          .from('driver_season_stats')
          .select('championship_position, points, drivers!inner(full_name, slug), teams!inner(name, slug)')
          .eq('season_id', season2026.id),
        supabase
          .from('team_season_stats')
          .select('championship_position, points, teams!inner(name, slug)')
          .eq('season_id', season2026.id),
      ])

      const dRows = (dssRes.data ?? []) as unknown as DriverStandingRow[]
      const sortedD = dRows
        .map((row) => {
          const driver = unwrapRelation(row.drivers)
          const team = unwrapRelation(row.teams)
          const pos = row.championship_position ?? 9999
          return {
            pos,
            fullName: driver?.full_name ?? 'Unknown',
            slug: driver?.slug ?? '',
            teamName: team?.name ?? '—',
            teamSlug: team?.slug ?? '',
            points: num(row.points),
          }
        })
        .filter((r) => r.slug)
        .sort((a, b) => {
          if (a.pos !== b.pos) return a.pos - b.pos
          return b.points - a.points
        })
      wdc2026 = sortedD.slice(0, 10).map((r, i) => ({ ...r, pos: r.pos <= 20 ? r.pos : i + 1 }))

      const tRows = (tssRes.data ?? []) as unknown as TeamStandingRow[]
      const sortedT = tRows
        .map((row) => {
          const team = unwrapRelation(row.teams)
          const pos = row.championship_position ?? 9999
          return {
            pos,
            name: team?.name ?? 'Unknown',
            slug: team?.slug ?? '',
            points: num(row.points),
          }
        })
        .filter((r) => r.slug)
        .sort((a, b) => {
          if (a.pos !== b.pos) return a.pos - b.pos
          return b.points - a.points
        })
      wcc2026 = sortedT.slice(0, 10).map((r, i) => ({ ...r, pos: r.pos <= 20 ? r.pos : i + 1 }))

      if (wdc2026.length === 0 || wcc2026.length === 0) {
        const { data: derivedRows } = await supabase
          .from('results')
          .select('driver_slug, driver_name, constructor_slug, constructor_name, points, position, is_sprint')
          .eq('season_year', season2026.year)

        const derived = deriveStandingsFromResults((derivedRows ?? []) as ResultStandingRow[])
        if (wdc2026.length === 0) wdc2026 = derived.wdc2026
        if (wcc2026.length === 0) wcc2026 = derived.wcc2026
      }
    }

    let recentRaces2026 = empty.recentRaces2026
    const racesRes = await supabase
      .from('races')
      .select('name, slug, round, race_date, circuit_slug')
      .eq('season_year', 2026)
      .order('round', { ascending: false })
      .limit(3)

    const raceList = (racesRes.data ?? []) as Array<{
      name: string | null
      slug: string | null
      round: number | null
      race_date: string | null
      circuit_slug: string | null
    }>

    const circuitSlugs = [...new Set(raceList.map((r) => r.circuit_slug).filter(Boolean))] as string[]
    let circuitMap = new Map<string, string>()
    if (circuitSlugs.length > 0) {
      const { data: circ } = await supabase.from('circuits').select('slug, name').in('slug', circuitSlugs)
      circuitMap = new Map((circ ?? []).map((c: { slug: string; name: string }) => [c.slug, c.name]))
    }

    const winnersRes = await supabase
      .from('results')
      .select('race_slug, driver_name, driver_slug')
      .eq('season_year', 2026)
      .eq('position', 1)
      .eq('is_sprint', false)

    const winnerByRace = new Map<string, { name: string; slug: string | null }>()
    for (const w of winnersRes.data ?? []) {
      const rs = w.race_slug as string | null
      if (!rs || winnerByRace.has(rs)) continue
      winnerByRace.set(rs, {
        name: (w.driver_name as string) ?? '—',
        slug: (w.driver_slug as string | null) ?? null,
      })
    }

    recentRaces2026 = raceList
      .filter((r) => r.slug)
      .map((r) => {
        const slug = r.slug as string
        const win = winnerByRace.get(slug)
        const dateLabel =
          r.race_date != null && r.race_date !== ''
            ? new Date(r.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'TBD'
        return {
          name: r.name ?? 'Grand Prix',
          slug,
          round: r.round ?? 0,
          dateLabel,
          circuitName: (r.circuit_slug && circuitMap.get(r.circuit_slug)) || r.circuit_slug || '—',
          winnerName: win?.name ?? '—',
          winnerSlug: win?.slug ?? null,
        }
      })

    const simCounts = {
      products: simProductsRes.count ?? empty.simCounts.products,
      reviews: simReviewsRes.count ?? empty.simCounts.reviews,
      brands: simBrandsRes.count ?? empty.simCounts.brands,
    }
    const randomStat = pickRandom((randomStatsRes.data ?? []) as RandomStatRow[])

    return {
      counts,
      season2025,
      season2026,
      season2026Slug,
      champion2025,
      wdc2026,
      wcc2026,
      recentRaces2026,
      randomStat,
      simCounts,
    }
  } catch {
    return {
      ...empty,
      champion2025: null,
    }
  }
}

export default async function HomePage() {
  const data = await loadHomePageData()
  const { counts, champion2025, wdc2026, wcc2026, recentRaces2026, simCounts, season2026Slug, randomStat } = data

  const heroSubtitle = `The definitive Formula 1 statistics platform — ${counts.seasons.toLocaleString()} seasons, ${counts.drivers.toLocaleString()} drivers, ${counts.results.toLocaleString()} results`

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_center_top,rgba(232,0,45,0.08),transparent_60%)] px-6 py-16 text-center md:py-20">
        <p className="font-display mb-4 inline-block rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          The F1 database
        </p>
        <h1
          className="font-display mx-auto max-w-4xl text-[clamp(2.25rem,6vw,4rem)] font-black leading-[0.95] tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #e8e8f0 0%, #f5c842 50%, #e8002d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Every Stat. Every Race. Every Era.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[17px] text-[var(--muted)]">{heroSubtitle}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/drivers"
            className="font-display rounded border border-transparent bg-[var(--accent)] px-7 py-3 text-sm font-bold uppercase tracking-wide text-white no-underline transition-opacity hover:opacity-90"
          >
            Explore Drivers
          </Link>
          <Link
            href="/compare"
            className="font-display rounded border border-[var(--border)] bg-transparent px-7 py-3 text-sm font-bold uppercase tracking-wide text-[var(--text)] no-underline transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Compare Head-to-Head
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <div className="grid grid-cols-2 border-y border-[var(--border)] bg-[var(--bg2)] md:grid-cols-4">
        {[
          { num: counts.drivers.toLocaleString(), label: 'Drivers' },
          { num: counts.results.toLocaleString(), label: 'Results' },
          { num: counts.seasons.toLocaleString(), label: 'Seasons' },
          { num: counts.teams.toLocaleString(), label: 'Teams' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`px-4 py-5 text-center md:px-6 ${i % 2 === 0 ? 'border-r border-[var(--border)] md:border-r' : ''} ${i < 2 ? 'border-b border-[var(--border)] md:border-b-0' : ''} md:border-r md:border-[var(--border)] md:[&:nth-child(4)]:border-r-0`}
          >
            <div className="font-mono text-3xl font-black leading-none text-[var(--text)] md:text-4xl">{stat.num}</div>
            <div className="mx-auto mt-2 h-px w-8 bg-[var(--border)]" />
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        {/* Reigning champion + 2026 live */}
        <div className="mb-12 grid gap-8 lg:grid-cols-3">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] lg:col-span-1">
            <div className="border-b border-[var(--border)] bg-[var(--bg3)] px-4 py-3">
              <h2 className="font-display text-sm font-extrabold tracking-wider text-[var(--text)]">
                Reigning champion · 2025
              </h2>
            </div>
            <div className="p-6 text-center">
              <div className="mb-3 text-4xl" aria-hidden>
                🏆
              </div>
              {champion2025 ? (
                <>
                  <Link
                    href={`/drivers/${champion2025.slug}`}
                    className="font-display text-2xl font-black uppercase text-[var(--text)] no-underline hover:text-[var(--accent)]"
                  >
                    {champion2025.fullName}
                  </Link>
                  {champion2025.teamName ? (
                    champion2025.teamSlug ? (
                      <Link
                        href={`/teams/${champion2025.teamSlug}`}
                        className="mt-2 block text-sm text-[var(--muted)] no-underline hover:text-[var(--accent)]"
                      >
                        {champion2025.teamName}
                      </Link>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--muted)]">{champion2025.teamName}</p>
                    )
                  ) : null}
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center font-mono text-sm">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Wins</dt>
                      <dd className="font-semibold text-[var(--text)]">{champion2025.wins}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Podiums</dt>
                      <dd className="font-semibold text-[var(--text)]">{champion2025.podiums}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Pts</dt>
                      <dd className="font-semibold text-[var(--gold)]">{champion2025.points.toLocaleString()} pts</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-sm text-[var(--muted)]">2025 champion data unavailable.</p>
              )}
            </div>
          </section>

          <section className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-xl font-extrabold tracking-wide text-[var(--text)]">
                2026 season <span className="text-[var(--accent)]">live</span>
              </h2>
              <Link
                href={season2026Slug ? `/seasons/${season2026Slug}` : '/seasons'}
                className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline"
              >
                Full season →
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
                <div className="border-b border-[var(--border)] px-4 py-2">
                  <h3 className="font-display text-xs font-bold tracking-wider text-[var(--muted)]">
                    WDC · Top 10
                  </h3>
                </div>
                <ol className="divide-y divide-[var(--border)] p-2">
                  {wdc2026.length > 0 ? (
                    wdc2026.map((row, idx) => {
                      const leader = idx === 0
                      return (
                        <li key={row.slug} className="flex items-center gap-2 border-l-2 border-l-[var(--accent)] px-3 py-3 text-sm">
                          <span className="w-6 shrink-0 text-center font-mono text-xs text-[var(--muted)]">{row.pos}</span>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/drivers/${row.slug}`}
                              className={`font-semibold no-underline ${leader ? 'text-[var(--accent)]' : 'text-[var(--text)] hover:text-[var(--accent)]'}`}
                            >
                              {row.fullName}
                            </Link>
                            <div className="truncate text-xs text-[var(--muted)]">
                              {row.teamSlug ? (
                                <Link href={`/teams/${row.teamSlug}`} className="text-[var(--muted)] no-underline hover:text-[var(--accent)]">
                                  {row.teamName}
                                </Link>
                              ) : (
                                row.teamName
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-xs font-semibold text-[var(--gold)]">
                            {row.points.toLocaleString()} pts
                          </span>
                        </li>
                      )
                    })
                  ) : (
                    <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">No 2026 standings yet.</li>
                  )}
                </ol>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
                <div className="border-b border-[var(--border)] px-4 py-2">
                  <h3 className="font-display text-xs font-bold tracking-wider text-[var(--muted)]">
                    WCC · Top 10
                  </h3>
                </div>
                <ol className="divide-y divide-[var(--border)] p-2">
                  {wcc2026.length > 0 ? (
                    wcc2026.map((row) => (
                      <li key={row.slug} className="flex items-center gap-2 border-l-2 border-l-[var(--accent)] px-3 py-3 text-sm">
                        <span className="w-6 shrink-0 text-center font-mono text-xs text-[var(--muted)]">{row.pos}</span>
                        <Link
                          href={`/teams/${row.slug}`}
                          className="min-w-0 flex-1 truncate font-semibold text-[var(--text)] no-underline hover:text-[var(--accent)]"
                        >
                          {row.name}
                        </Link>
                        <span className="shrink-0 font-mono text-xs font-semibold text-[var(--gold)]">
                          {row.points.toLocaleString()} pts
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">No 2026 constructor standings yet.</li>
                  )}
                </ol>
              </div>
            </div>
          </section>
        </div>

        {/* Recent races */}
        <section className="mb-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold text-[var(--text)]">
              Recent <span className="text-[var(--accent)]">races</span> · 2026
            </h2>
            <Link href="/races" className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
              All races →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentRaces2026.length > 0 ? (
              recentRaces2026.map((race) => (
                <article
                  key={race.slug}
                  className="flex flex-col rounded-lg border border-[var(--border)] border-l-4 border-l-[var(--accent)] bg-[linear-gradient(160deg,var(--bg2),rgba(26,26,36,0.6))] p-5 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
                >
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">Round {race.round}</div>
                  <h3 className="font-display text-lg font-bold leading-tight text-[var(--text)]">
                    {race.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {race.dateLabel} · {race.circuitName}
                  </p>
                  <p className="mt-3 text-sm text-[var(--text)]">
                    <span className="text-[var(--muted)]">Winner: </span>
                    {race.winnerSlug ? (
                      <Link href={`/drivers/${race.winnerSlug}`} className="font-semibold text-[var(--gold)] no-underline hover:text-[var(--accent)]">
                        {race.winnerName}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[var(--gold)]">{race.winnerName}</span>
                    )}
                  </p>
                  <Link
                    href={`/races/${race.slug}`}
                    className="mt-auto pt-4 text-xs font-bold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline"
                  >
                    View Results →
                  </Link>
                </article>
              ))
            ) : (
              <p className="col-span-full rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg2)] py-10 text-center text-sm text-[var(--muted)]">
                No 2026 races in the database yet.
              </p>
            )}
          </div>
        </section>

        <DidYouKnowWidget initialStat={randomStat} />

        {/* Quick links */}
        <section className="mb-12">
          <h2 className="mb-4 font-display text-xl font-extrabold text-[var(--text)]">
            Explore
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: '/drivers', emoji: '👤', title: 'Drivers', desc: 'Career stats for every F1 driver.', count: `${counts.drivers.toLocaleString()} drivers` },
              { href: '/teams', emoji: '🏎️', title: 'Teams', desc: 'Constructor history and records.', count: `${counts.teams.toLocaleString()} teams` },
              { href: '/seasons', emoji: '📅', title: 'Seasons', desc: 'Year-by-year championships and results.', count: `${counts.seasons.toLocaleString()} seasons` },
              { href: '/compare', emoji: '⚖️', title: 'Compare', desc: 'Head-to-head driver comparisons.', count: 'Tool' },
              { href: '/leaderboards', emoji: '📊', title: 'Leaderboards', desc: 'All-time rankings and records.', count: 'Records' },
              { href: '/sim-racing', emoji: '🎮', title: 'Sim Racing', desc: 'Hardware, reviews, and setups.', count: 'Hub' },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-5 no-underline transition-colors hover:border-[var(--accent)]"
              >
                <div className="mb-2 text-[2rem]">{card.emoji}</div>
                <h3 className="font-display text-lg font-bold text-[var(--text)] group-hover:text-[var(--accent)]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{card.desc}</p>
                <p className="mt-3 font-mono text-xs text-[var(--gold)]">{card.count}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Sim racing teaser */}
        <section className="mb-12 rounded-xl border border-[var(--border)] border-t-4 border-t-[var(--accent)] bg-[radial-gradient(circle_at_top_right,rgba(232,0,45,0.22),transparent_50%),linear-gradient(120deg,var(--bg2),rgba(17,17,24,0.65))] p-8 text-center md:p-10">
          <p className="mb-2 font-display text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            Sim Racing Section
          </p>
          <h2 className="font-display text-2xl font-black text-[var(--text)] md:text-3xl">
            Sim Racing Hub — Reviews, Setups, and Gear
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--muted)]">
            {simCounts.products.toLocaleString()} products, {simCounts.reviews.toLocaleString()} reviews, {simCounts.brands.toLocaleString()} brands — curated for serious sim racers.
          </p>
          <Link
            href="/sim-racing"
            className="mt-6 inline-block rounded border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-white no-underline hover:opacity-90"
          >
            Open Sim Racing
          </Link>
        </section>

        <div className="mb-12 max-w-3xl mx-auto">
          <EmailCapture source="homepage" />
        </div>

        {/* Ad placeholder */}
        <div className="mb-12">
          <p className="mb-1 text-center font-mono text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-70">Advertisement</p>
          <div className="flex h-[90px] items-center justify-center rounded-md border border-dashed border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-transparent font-mono text-xs text-[var(--muted)] opacity-50">
            728 × 90 — Ad space
          </div>
        </div>
      </div>
    </main>
  )
}
