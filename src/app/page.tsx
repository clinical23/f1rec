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
      .select('name, slug, round, race_date, circuit_slug, winner_driver_id')
      .eq('season_year', 2026)
      .not('winner_driver_id', 'is', null)
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
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* ═══ HERO ═══ */}
      <section style={{ textAlign: 'center', padding: '4rem 1.5rem 2rem', background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg2) 50%, var(--bg) 100%)' }}>
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>
          The F1 Database
        </p>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 0.95, letterSpacing: '-0.01em', color: 'var(--text)', maxWidth: '900px', margin: '0 auto' }}>
          Every Stat. Every Race. Every Era.
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '16px', marginTop: '1rem', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          {heroSubtitle}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
          <Link href="/drivers" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--accent)', color: '#fff', padding: '12px 32px', borderRadius: '3px', textDecoration: 'none', border: 'none', transition: 'opacity 0.2s' }}>
            Explore Drivers
          </Link>
          <Link href="/compare" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'transparent', color: 'var(--text)', padding: '12px 32px', borderRadius: '3px', textDecoration: 'none', border: '1px solid var(--border)', transition: 'border-color 0.2s' }}>
            Compare Head-to-Head
          </Link>
        </div>
      </section>

      {/* ═══ STAT COUNTERS — horizontal row ═══ */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        {[
          { n: counts.drivers.toLocaleString(), label: 'Drivers' },
          { n: counts.results.toLocaleString(), label: 'Results' },
          { n: counts.seasons.toLocaleString(), label: 'Seasons' },
          { n: counts.teams.toLocaleString(), label: 'Teams' },
        ].map((stat, i, arr) => (
          <div key={stat.label} style={{ flex: 1, textAlign: 'center', padding: '1.25rem 1rem', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 900, color: 'var(--text)' }}>{stat.n}</div>
            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* ── Champion + 2026 Standings side by side ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2.5rem' }}>

          {/* Champion card */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)' }}>
                Reigning Champion · 2025
              </div>
            </div>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
              {champion2025 ? (
                <>
                  <Link href={`/drivers/${champion2025.slug}`} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text)', textDecoration: 'none' }}>
                    {champion2025.fullName}
                  </Link>
                  {champion2025.teamName && (
                    <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
                      {champion2025.teamSlug ? (
                        <Link href={`/teams/${champion2025.teamSlug}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{champion2025.teamName}</Link>
                      ) : champion2025.teamName}
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    {[
                      { label: 'Wins', value: champion2025.wins },
                      { label: 'Podiums', value: champion2025.podiums },
                      { label: 'Pts', value: champion2025.points.toLocaleString(), gold: true },
                    ].map((s) => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: '16px', color: s.gold ? 'var(--gold)' : 'var(--text)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>2025 champion data unavailable.</p>
              )}
            </div>
          </div>

          {/* 2026 Standings */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)', margin: 0 }}>
                2026 Season <span style={{ color: 'var(--accent)' }}>Live</span>
              </h2>
              <Link href={season2026Slug ? `/seasons/${season2026Slug}` : '/seasons'} style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none' }}>
                Full Season →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* WDC */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>WDC · Top 10</div>
                </div>
                <div style={{ padding: '4px 0' }}>
                  {wdc2026.length > 0 ? wdc2026.map((row, idx) => (
                    <div key={row.slug} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 14px', borderBottom: idx < wdc2026.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--muted)', minWidth: '20px', textAlign: 'right' }}>{row.pos}</span>
                      <span style={{ width: '2px', height: '20px', background: idx === 0 ? 'var(--accent)' : 'var(--border)', borderRadius: '1px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/drivers/${row.slug}`} style={{ fontWeight: 600, color: idx === 0 ? 'var(--accent)' : 'var(--text)', textDecoration: 'none', fontSize: '13px' }}>
                          {row.fullName}
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.teamSlug ? <Link href={`/teams/${row.teamSlug}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{row.teamName}</Link> : row.teamName}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>
                        {row.points} pts
                      </span>
                    </div>
                  )) : (
                    <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No 2026 standings yet.</p>
                  )}
                </div>
              </div>
              {/* WCC */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>WCC · Top 10</div>
                </div>
                <div style={{ padding: '4px 0' }}>
                  {wcc2026.length > 0 ? wcc2026.map((row, idx) => (
                    <div key={row.slug} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 14px', borderBottom: idx < wcc2026.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--muted)', minWidth: '20px', textAlign: 'right' }}>{row.pos}</span>
                      <span style={{ width: '2px', height: '20px', background: idx === 0 ? 'var(--accent)' : 'var(--border)', borderRadius: '1px', flexShrink: 0 }} />
                      <Link href={`/teams/${row.slug}`} style={{ flex: 1, fontWeight: 600, color: 'var(--text)', textDecoration: 'none', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.name}
                      </Link>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>
                        {row.points} pts
                      </span>
                    </div>
                  )) : (
                    <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No 2026 constructor standings yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Races ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text)', margin: 0 }}>
              Recent <span style={{ color: 'var(--accent)' }}>Races</span> · 2026
            </h2>
            <Link href="/races" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none' }}>All Races →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {recentRaces2026.length > 0 ? recentRaces2026.map((race) => (
              <div key={race.slug} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>Round {race.round}</div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text)', margin: '4px 0' }}>{race.name}</h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>{race.dateLabel} · {race.circuitName}</p>
                <p style={{ fontSize: '12px', color: 'var(--text)', margin: '6px 0 0' }}>
                  <span style={{ color: 'var(--muted)' }}>Winner: </span>
                  {race.winnerSlug ? (
                    <Link href={`/drivers/${race.winnerSlug}`} style={{ fontWeight: 600, color: 'var(--gold)', textDecoration: 'none' }}>{race.winnerName}</Link>
                  ) : (
                    <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{race.winnerName}</span>
                  )}
                </p>
                <Link href={`/races/${race.slug}`} style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none', marginTop: 'auto', paddingTop: '10px' }}>
                  View Results →
                </Link>
              </div>
            )) : (
              <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--muted)', padding: '2rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px' }}>No 2026 races yet.</p>
            )}
          </div>
        </div>

        {/* ── Did You Know ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginBottom: '2.5rem' }}>
          <DidYouKnowWidget initialStat={randomStat} />
        </div>

        {/* ── Explore Cards ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text)', marginBottom: '1rem' }}>Explore</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { href: '/drivers', emoji: '👤', title: 'Drivers', desc: 'Career stats for every F1 driver.', count: `${counts.drivers.toLocaleString()} drivers` },
              { href: '/teams', emoji: '🏎️', title: 'Teams', desc: 'Constructor history and records.', count: `${counts.teams.toLocaleString()} teams` },
              { href: '/seasons', emoji: '📅', title: 'Seasons', desc: 'Year-by-year championships and results.', count: `${counts.seasons.toLocaleString()} seasons` },
              { href: '/compare', emoji: '⚖️', title: 'Compare', desc: 'Head-to-head driver comparisons.', count: 'Tool' },
              { href: '/leaderboards', emoji: '📊', title: 'Leaderboards', desc: 'All-time rankings and records.', count: 'Records' },
              { href: '/sim-racing', emoji: '🎮', title: 'Sim Racing', desc: 'Hardware, reviews, and setups.', count: 'Hub' },
            ].map((card) => (
              <Link key={card.href} href={card.href} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem', textDecoration: 'none', transition: 'border-color 0.2s, transform 0.15s' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{card.emoji}</div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text)', margin: '0 0 4px' }}>{card.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 0.75rem' }}>{card.desc}</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--gold)', margin: 0 }}>{card.count}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Sim Racing CTA ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--bg2) 0%, var(--bg3) 100%)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>Sim Racing Section</p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: 900, color: 'var(--text)', margin: '0 0 0.5rem' }}>
              Sim Racing Hub — Reviews, Setups, and Gear
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '1.5rem' }}>
              {simCounts.products} products, {simCounts.reviews} reviews, {simCounts.brands} brands — curated for serious sim racers.
            </p>
            <Link href="/sim-racing" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--accent)', color: '#fff', padding: '12px 32px', borderRadius: '3px', textDecoration: 'none' }}>
              Open Sim Racing
            </Link>
          </div>
        </div>

        {/* ── Email Capture ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text)', marginBottom: '0.5rem' }}>Stay In The Loop</h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '1rem' }}>Race results, driver stats, sim racing deals — no spam, unsubscribe anytime.</p>
            <EmailCapture source="homepage" />
          </div>
        </div>
      </div>
    </main>
  )
}
