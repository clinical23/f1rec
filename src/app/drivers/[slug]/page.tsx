import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

const tokens = {
  bg: '#0a0a0f',
  bg2: '#111118',
  bg3: '#1a1a24',
  bg4: '#22222f',
  border: '#2a2a3a',
  text: '#e8e8f0',
  muted: '#888899',
  accent: '#e8002d',
  gold: '#f5c842',
  silver: '#c0c0c8',
  bronze: '#cd7f32',
  green: '#00d4a0',
} as const

const font = {
  display: "'Barlow Condensed', sans-serif",
  body: "'Barlow', sans-serif",
  mono: "'JetBrains Mono', monospace",
}

type PageProps = {
  params: Promise<{ slug: string }>
}

type ResultRow = Record<string, unknown>

function numPosition(row: ResultRow): number | null {
  const p = row.position
  if (typeof p === 'number' && Number.isFinite(p)) return p
  if (typeof p === 'string' && p.trim() !== '') {
    const n = Number.parseInt(p, 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function numPoints(row: ResultRow): number {
  const p = row.points
  if (typeof p === 'number' && Number.isFinite(p)) return p
  if (typeof p === 'string' && p.trim() !== '') {
    const n = Number.parseFloat(p)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function modeString(values: string[]): string | null {
  const counts = new Map<string, number>()
  for (const v of values) {
    if (!v) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  let best: string | null = null
  let bestN = 0
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v
      bestN = n
    }
  }
  return best
}

function deriveStatus(row: ResultRow, finish: number | null): 'WIN' | 'FIN' | 'DNF' {
  if (finish === 1) return 'WIN'
  const s = String(row.status ?? '').toLowerCase()
  if (
    s.includes('dnf') ||
    s.includes('dns') ||
    s.includes('dsq') ||
    s.includes('disqualified') ||
    s.includes('not classified')
  ) {
    return 'DNF'
  }
  if (finish === null && (s.includes('lap') || s.includes('finished') || s === '')) {
    return 'FIN'
  }
  if (finish === null) return 'DNF'
  return 'FIN'
}

async function fetchAllDriverResults(supabase: ReturnType<typeof createServerClient>, driverSlug: string) {
  const pageSize = 1000
  const all: ResultRow[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('driver_slug', driverSlug)
      .order('season_year', { ascending: true })
      .order('round', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(`Failed to load results: ${error.message}`)
    }

    const chunk = data ?? []
    all.push(...chunk)
    if (chunk.length < pageSize) break
    from += pageSize
  }
  return all
}

export default async function DriverPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServerClient()
  const { data: driverData } = await supabase.from('drivers').select('*').eq('slug', slug).maybeSingle()

  if (!driverData) {
    return (
      <main
        style={{
          fontFamily: font.body,
          background: tokens.bg,
          color: tokens.text,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Driver not found
      </main>
    )
  }

  const fullName = `${driverData.first_name} ${driverData.last_name}`
  const displayDob = driverData.date_of_birth ? new Date(driverData.date_of_birth).toLocaleDateString('en-GB') : 'N/A'

  let resultRows: ResultRow[] = []
  try {
    resultRows = await fetchAllDriverResults(supabase, slug)
  } catch {
    resultRows = []
  }

  const totalRaces = resultRows.length
  const totalWins = resultRows.filter((r) => numPosition(r) === 1).length
  const totalPodiums = resultRows.filter((r) => {
    const pos = numPosition(r)
    return pos !== null && pos >= 1 && pos <= 3
  }).length
  const totalPoints = resultRows.reduce((sum, r) => sum + numPoints(r), 0)
  const pointsFormatted = Number.isInteger(totalPoints) ? String(totalPoints) : totalPoints.toFixed(1)

  const driver = {
    firstName: String(driverData.first_name ?? '').toUpperCase(),
    lastName: String(driverData.last_name ?? '').toUpperCase(),
    code: driverData.code ?? 'N/A',
    number: driverData.number ?? 0,
    nationality: driverData.nationality ?? 'N/A',
    teamColor: '#27f4d2',
    titles: driverData.championships ?? 0,
    bio: `${fullName} is a Formula 1 driver from ${driverData.nationality ?? 'unknown nationality'}.`,
  }

  const careerStats = [
    { label: 'Wins', value: String(totalWins) },
    { label: 'Poles', value: String(driverData.career_poles ?? 0) },
    { label: 'Podiums', value: String(totalPodiums) },
    { label: 'Titles', value: String(driverData.championships ?? 0) },
    { label: 'Points', value: pointsFormatted },
    { label: 'Starts', value: String(totalRaces) },
  ] as const

  const tabs = ['Race Results', 'Season by Season', 'Head-to-Head', 'Lap Records'] as const

  const raceRows = [...resultRows]
    .sort((a, b) => {
      const ya = typeof a.season_year === 'number' ? a.season_year : Number.parseInt(String(a.season_year), 10)
      const yb = typeof b.season_year === 'number' ? b.season_year : Number.parseInt(String(b.season_year), 10)
      if (yb !== ya) return yb - ya
      const ra = typeof a.round === 'number' ? a.round : Number.parseInt(String(a.round), 10)
      const rb = typeof b.round === 'number' ? b.round : Number.parseInt(String(b.round), 10)
      return rb - ra
    })
    .map((row, idx) => {
      const finish = numPosition(row)
      const status = deriveStatus(row, finish)
      const gridVal = row.grid
      const grid =
        typeof gridVal === 'number' && Number.isFinite(gridVal)
          ? gridVal
          : typeof gridVal === 'string'
            ? Number.parseInt(gridVal, 10)
            : null
      const season =
        typeof row.season_year === 'number' ? String(row.season_year) : String(row.season_year ?? '')
      const race = String(row.race_name ?? row.race_slug ?? 'Grand Prix')
      const team = String(row.constructor_name ?? row.constructor_slug ?? '—')
      const pts = numPoints(row)
      const ptsStr = Number.isInteger(pts) ? String(pts) : pts.toFixed(1)
      return {
        key: typeof row.slug === 'string' && row.slug.length > 0 ? row.slug : `race-${season}-${String(row.round)}-${idx}`,
        season,
        race,
        flag: '🏁',
        grid: Number.isFinite(grid) ? grid : '—',
        finish,
        status,
        points: ptsStr,
        team,
      }
    })

  const bySeason = new Map<number, ResultRow[]>()
  for (const row of resultRows) {
    const y = typeof row.season_year === 'number' ? row.season_year : Number.parseInt(String(row.season_year), 10)
    if (!Number.isFinite(y)) continue
    if (!bySeason.has(y)) bySeason.set(y, [])
    bySeason.get(y)!.push(row)
  }

  const seasonRows = [...bySeason.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([yearNum, rows]) => {
      const pts = rows.reduce((sum, r) => sum + numPoints(r), 0)
      const wins = rows.filter((r) => numPosition(r) === 1).length
      const podiums = rows.filter((r) => {
        const pos = numPosition(r)
        return pos !== null && pos >= 1 && pos <= 3
      }).length
      const team =
        modeString(rows.map((r) => String(r.constructor_name ?? '')).filter(Boolean)) ??
        modeString(rows.map((r) => String(r.constructor_slug ?? '')).filter(Boolean)) ??
        '—'
      const ptsStr = Number.isInteger(pts) ? String(pts) : pts.toFixed(1)
      return {
        season: String(yearNum),
        team,
        pos: '—' as const,
        pts: ptsStr,
        wins,
        poles: 0,
        podiums,
        champion: false,
      }
    })

  const bestSeasonPts = seasonRows.length > 0 ? Math.max(...seasonRows.map((s) => Number.parseFloat(s.pts) || 0)) : 0
  const seasonRowsWithHighlight = seasonRows.map((row) => ({
    ...row,
    champion: bestSeasonPts > 0 && Number.parseFloat(row.pts) === bestSeasonPts,
  }))

  const winsByEvent = new Map<string, number>()
  for (const row of resultRows) {
    if (numPosition(row) !== 1) continue
    const name = String(row.race_name ?? 'Unknown')
    winsByEvent.set(name, (winsByEvent.get(name) ?? 0) + 1)
  }
  const topCircuits = [...winsByEvent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const maxCircuitWins = topCircuits.length > 0 ? Math.max(...topCircuits.map(([, w]) => w), 1) : 1
  const circuitWins =
    topCircuits.length > 0
      ? topCircuits.map(([name, wins]) => ({ name, wins, max: maxCircuitWins }))
      : [{ name: 'No wins yet', wins: 0, max: 1 }]

  const seasonOptions = [...new Set(resultRows.map((r) => String(r.season_year ?? '')).filter(Boolean))].sort(
    (a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)
  )
  const teamOptions = [
    ...new Set(
      resultRows
        .map((r) => String(r.constructor_name ?? r.constructor_slug ?? ''))
        .filter((t) => t.length > 0)
    ),
  ].sort()

  function finishBadgeStyle(pos: number | null) {
    if (pos === null) {
      return { background: tokens.bg4, color: tokens.muted, border: `1px solid ${tokens.border}` }
    }
    if (pos === 1) return { background: 'rgba(245, 200, 66, 0.15)', color: tokens.gold, border: `1px solid ${tokens.gold}` }
    if (pos === 2) return { background: 'rgba(192, 192, 200, 0.12)', color: tokens.silver, border: `1px solid ${tokens.silver}` }
    if (pos === 3) return { background: 'rgba(205, 127, 50, 0.12)', color: tokens.bronze, border: `1px solid ${tokens.bronze}` }
    return { background: tokens.bg4, color: tokens.muted, border: `1px solid ${tokens.border}` }
  }

  function statusBadge(status: 'WIN' | 'FIN' | 'DNF') {
    if (status === 'WIN') return { background: 'rgba(0, 212, 160, 0.15)', color: tokens.green, border: `1px solid ${tokens.green}` }
    if (status === 'FIN') return { background: tokens.bg4, color: tokens.muted, border: `1px solid ${tokens.border}` }
    return { background: 'rgba(232, 0, 45, 0.12)', color: tokens.accent, border: `1px solid ${tokens.accent}` }
  }

  return (
    <main
      data-driver-slug={slug}
      style={{
        fontFamily: font.body,
        background: tokens.bg,
        color: tokens.text,
        minHeight: '100vh',
      }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: '56px',
          background: tokens.bg2,
          borderBottom: `1px solid ${tokens.border}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: font.display, fontSize: '26px', fontWeight: 900, color: '#fff' }}>
            F1<span style={{ color: tokens.accent }}>Rec</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['Drivers', 'Teams', 'Races', 'Seasons', 'Compare', 'Leaderboards'].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              style={{
                color: tokens.muted,
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                padding: '6px 12px',
                borderRadius: '4px',
              }}
            >
              {item}
            </Link>
          ))}
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 24px 48px' }}>
        {/* Breadcrumb */}
        <nav
          style={{
            fontSize: '13px',
            color: tokens.muted,
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
          aria-label="Breadcrumb"
        >
          <Link href="/" style={{ color: tokens.muted, textDecoration: 'none' }}>
            Home
          </Link>
          <span aria-hidden>›</span>
          <Link href="/drivers" style={{ color: tokens.muted, textDecoration: 'none' }}>
            Drivers
          </Link>
          <span aria-hidden>›</span>
          <span style={{ color: tokens.text, fontWeight: 600 }}>{fullName}</span>
        </nav>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 300px',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* MAIN */}
          <div>
            {/* Driver Hero */}
            <section
              style={{
                background: `linear-gradient(135deg, ${tokens.bg} 0%, ${tokens.bg2} 45%, ${tokens.bg3} 100%)`,
                border: `1px solid ${tokens.border}`,
                borderRadius: '12px',
                padding: '28px 28px 32px',
                marginBottom: '24px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '28px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '12px',
                      background: '#0077c8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: font.display,
                      fontSize: '22px',
                      fontWeight: 900,
                      color: '#fff',
                      letterSpacing: '1px',
                      flexShrink: 0,
                    }}
                  >
                    {driver.code}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span
                        style={{
                          fontFamily: font.mono,
                          fontSize: '13px',
                          fontWeight: 600,
                          background: tokens.bg4,
                          border: `1px solid ${tokens.border}`,
                          color: tokens.text,
                          padding: '4px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        #{driver.number}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          background: tokens.bg3,
                          border: `1px solid ${tokens.border}`,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {driver.nationality}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          background: tokens.bg3,
                          border: `1px solid ${tokens.border}`,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: driver.teamColor }} />
                        DOB {displayDob}
                      </span>
                      <span
                        style={{
                          fontFamily: font.display,
                          fontSize: '12px',
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          background: `linear-gradient(90deg, ${tokens.gold}33, ${tokens.gold}18)`,
                          border: `1px solid ${tokens.gold}`,
                          color: tokens.gold,
                          padding: '4px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        World Champion {driver.titles}×
                      </span>
                    </div>
                    <h1
                      style={{
                        fontFamily: font.display,
                        fontSize: 'clamp(36px, 5vw, 52px)',
                        fontWeight: 900,
                        lineHeight: 0.95,
                        letterSpacing: '-1px',
                        textTransform: 'uppercase',
                        margin: 0,
                        color: '#fff',
                      }}
                    >
                      {driver.firstName}{' '}
                      <span style={{ color: tokens.accent }}>{driver.lastName}</span>
                    </h1>
                    <p
                      style={{
                        marginTop: '16px',
                        fontSize: '15px',
                        lineHeight: 1.55,
                        color: tokens.muted,
                        maxWidth: '440px',
                      }}
                    >
                      {driver.bio}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  {careerStats.map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: tokens.bg,
                        border: `1px solid ${tokens.border}`,
                        borderRadius: '8px',
                        padding: '14px 12px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: font.mono,
                          fontSize: '20px',
                          fontWeight: 600,
                          color: tokens.text,
                          lineHeight: 1.2,
                        }}
                      >
                        {s.value}
                      </div>
                      <div
                        style={{
                          fontFamily: font.display,
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: tokens.muted,
                          marginTop: '6px',
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/compare"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    background: tokens.accent,
                    color: '#fff',
                    fontFamily: font.display,
                    fontWeight: 700,
                    fontSize: '14px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                  }}
                >
                  Compare {driverData.last_name}
                </Link>
              </div>
            </section>

            {/* Ad 728×90 */}
            <div
              style={{
                width: '100%',
                maxWidth: '728px',
                height: '90px',
                marginBottom: '24px',
                background: tokens.bg3,
                border: `1px dashed ${tokens.border}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.muted,
                fontSize: '12px',
                fontFamily: font.mono,
                letterSpacing: '0.5px',
              }}
            >
              Leaderboard Ad
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0',
                borderBottom: `1px solid ${tokens.border}`,
                marginBottom: '20px',
                overflowX: 'auto',
              }}
            >
              {tabs.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  style={{
                    fontFamily: font.display,
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: i === 0 ? `3px solid ${tokens.accent}` : '3px solid transparent',
                    color: i === 0 ? tokens.text : tokens.muted,
                    cursor: i === 0 ? 'default' : 'pointer',
                    marginBottom: '-1px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '160px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: tokens.muted }}>
                  Season
                </span>
                <select
                  defaultValue="all"
                  style={{
                    fontFamily: font.body,
                    fontSize: '14px',
                    padding: '10px 12px',
                    background: tokens.bg2,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: '6px',
                    color: tokens.text,
                  }}
                >
                  <option value="all">All Seasons</option>
                  {seasonOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '160px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: tokens.muted }}>
                  Team
                </span>
                <select
                  defaultValue="all"
                  style={{
                    fontFamily: font.body,
                    fontSize: '14px',
                    padding: '10px 12px',
                    background: tokens.bg2,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: '6px',
                    color: tokens.text,
                  }}
                >
                  <option value="all">All Teams</option>
                  {teamOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Race Results */}
            <h2
              style={{
                fontFamily: font.display,
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#fff',
                marginBottom: '12px',
              }}
            >
              Race <span style={{ color: tokens.accent }}>Results</span>
            </h2>
            <div style={{ overflowX: 'auto', marginBottom: '36px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '640px' }}>
                <thead>
                  <tr>
                    {['Season', 'Race', 'Grid', 'Finish', 'Status', 'Points', 'Team'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontFamily: font.display,
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: tokens.muted,
                          padding: '10px 12px',
                          background: tokens.bg2,
                          borderBottom: `1px solid ${tokens.border}`,
                          textAlign: h === 'Race' || h === 'Team' ? 'left' : 'center',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {raceRows.map((row) => (
                    <tr key={row.key} style={{ borderBottom: `1px solid ${tokens.border}` }}>
                      <td style={{ padding: '10px 12px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center' }}>{row.season}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ marginRight: '8px' }}>{row.flag}</span>
                        <span style={{ fontWeight: 600, color: tokens.text }}>{row.race}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center' }}>{row.grid}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '32px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontFamily: font.mono,
                            fontSize: '13px',
                            fontWeight: 600,
                            ...finishBadgeStyle(row.finish),
                          }}
                        >
                          {row.finish === null ? '—' : row.finish}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontFamily: font.mono,
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            ...statusBadge(row.status),
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center' }}>{row.points}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: tokens.text }}>{row.team}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Season Breakdown */}
            <h2
              style={{
                fontFamily: font.display,
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#fff',
                marginBottom: '12px',
              }}
            >
              Season <span style={{ color: tokens.accent }}>Breakdown</span>
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr>
                    {['Season', 'Team', 'Pos', 'Pts', 'Wins', 'Poles', 'Podiums'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontFamily: font.display,
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: tokens.muted,
                          padding: '10px 12px',
                          background: tokens.bg2,
                          borderBottom: `1px solid ${tokens.border}`,
                          textAlign: h === 'Team' ? 'left' : 'center',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seasonRowsWithHighlight.map((row) => {
                    const highlight = row.champion
                    return (
                      <tr
                        key={row.season}
                        style={{
                          borderBottom: `1px solid ${tokens.border}`,
                          background: highlight ? 'rgba(245, 200, 66, 0.08)' : undefined,
                        }}
                      >
                        <td
                          style={{
                            padding: '10px 12px',
                            fontFamily: font.mono,
                            fontSize: '13px',
                            textAlign: 'center',
                            fontWeight: highlight ? 700 : 400,
                            color: highlight ? tokens.gold : tokens.text,
                          }}
                        >
                          {row.season}
                          {highlight ? ' 🏆' : ''}
                        </td>
                        <td style={{ padding: '10px 12px', color: tokens.text }}>{row.team}</td>
                        <td style={{ padding: '10px 12px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center', color: highlight ? tokens.gold : tokens.text }}>
                          {row.pos}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center', color: highlight ? tokens.gold : tokens.text }}>
                          {row.pts}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center' }}>{row.wins}</td>
                        <td style={{ padding: '10px 12px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center' }}>{row.poles}</td>
                        <td style={{ padding: '10px 12px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center' }}>{row.podiums}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside style={{ width: '300px', position: 'sticky', top: '72px' }}>
            {/* Fast Facts */}
            <div
              style={{
                background: tokens.bg2,
                border: `1px solid ${tokens.border}`,
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${tokens.border}`, background: tokens.bg3 }}>
                <div style={{ fontFamily: font.display, fontSize: '13px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#fff' }}>
                  Fast Facts
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                {[
                  ['First name', driverData.first_name ?? 'N/A'],
                  ['Last name', driverData.last_name ?? 'N/A'],
                  ['Nationality', driverData.nationality ?? 'N/A'],
                  ['Date of birth', displayDob],
                  ['Code', driverData.code ?? 'N/A'],
                  ['Car number', `#${driverData.number ?? 0}`],
                  ['Career wins', String(totalWins)],
                  ['Career poles', String(driverData.career_poles ?? 0)],
                  ['Career podiums', String(totalPodiums)],
                  ['Career points', pointsFormatted],
                  ['Career starts', String(totalRaces)],
                  ['Championships', String(driverData.championships ?? 0)],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '8px 0',
                      borderBottom: `1px solid ${tokens.border}`,
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: tokens.muted }}>{k}</span>
                    <span style={{ fontWeight: 600, color: tokens.text, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Win rate by circuit */}
            <div
              style={{
                background: tokens.bg2,
                border: `1px solid ${tokens.border}`,
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${tokens.border}`, background: tokens.bg3 }}>
                <div style={{ fontFamily: font.display, fontSize: '13px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#fff' }}>
                  Win Rate by Circuit
                </div>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {circuitWins.map((c) => {
                  const pct = Math.round((c.wins / c.max) * 100)
                  return (
                    <div key={c.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                        <span style={{ fontWeight: 600, color: tokens.text }}>{c.name}</span>
                        <span style={{ fontFamily: font.mono, fontSize: '12px', color: tokens.muted }}>{c.wins} wins</span>
                      </div>
                      <div style={{ height: '8px', background: tokens.bg4, borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            borderRadius: '4px',
                            background: `linear-gradient(90deg, ${tokens.accent}, #ff4d6d)`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 300×250 ad */}
            <div
              style={{
                width: '300px',
                height: '250px',
                marginBottom: '16px',
                background: tokens.bg3,
                border: `1px dashed ${tokens.border}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.muted,
                fontSize: '12px',
                fontFamily: font.mono,
              }}
            >
              300 × 250
            </div>

            {/* Affiliate */}
            <div
              style={{
                background: tokens.bg2,
                border: `1px solid ${tokens.border}`,
                borderRadius: '8px',
                padding: '20px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: font.display, fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', color: '#fff', marginBottom: '8px' }}>
                Watch F1 Live
              </div>
              <p style={{ fontSize: '13px', color: tokens.muted, marginBottom: '16px', lineHeight: 1.45 }}>
                Stream every session live and on demand with F1 TV.
              </p>
              <a
                href="https://www.formula1.com/en/f1-tv.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: tokens.accent,
                  color: '#fff',
                  fontFamily: font.display,
                  fontWeight: 700,
                  fontSize: '13px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                F1 TV
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
