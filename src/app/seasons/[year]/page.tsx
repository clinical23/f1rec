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
  blue: '#3b82f6',
} as const

const font = {
  display: "'Barlow Condensed', sans-serif",
  body: "'Barlow', sans-serif",
  mono: "'JetBrains Mono', monospace",
}

type PageProps = {
  params: Promise<{ year: string }>
}

function posBadgeStyle(pos: number) {
  if (pos === 1) return { background: 'rgba(245, 200, 66, 0.15)', color: tokens.gold, border: `1px solid ${tokens.gold}` }
  if (pos === 2) return { background: 'rgba(192, 192, 200, 0.12)', color: tokens.silver, border: `1px solid ${tokens.silver}` }
  if (pos === 3) return { background: 'rgba(205, 127, 50, 0.12)', color: tokens.bronze, border: `1px solid ${tokens.bronze}` }
  return { background: tokens.bg4, color: tokens.muted, border: `1px solid ${tokens.border}` }
}

export default async function SeasonPage({ params }: PageProps) {
  const { year } = await params
  const seasonYear = Number.parseInt(year, 10)
  const supabase = createServerClient()

  const { data: seasonData } = await supabase.from('seasons').select('*').eq('year', seasonYear).maybeSingle()

  if (!seasonData) {
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
        Season not found
      </main>
    )
  }

  const { data: racesData } = await supabase.from('races').select('*').eq('season_year', seasonYear).order('round', { ascending: true })

  const races = racesData ?? []
  const getWinner = (race: Record<string, unknown>) => {
    const raw =
      race.winner ??
      race.winner_name ??
      race.winner_driver ??
      race.winner_full_name ??
      race.winning_driver
    return typeof raw === 'string' && raw.trim().length > 0 ? raw : 'TBD'
  }

  const winnerWins = new Map<string, number>()
  for (const race of races) {
    const winner = getWinner(race as Record<string, unknown>)
    if (winner === 'TBD') continue
    winnerWins.set(winner, (winnerWins.get(winner) ?? 0) + 1)
  }

  const winnerList = Array.from(winnerWins.entries()).sort((a, b) => b[1] - a[1])
  const championName = winnerList[0]?.[0] ?? 'TBD'
  const constructorChampion = 'TBD'
  const raceWinnersCount = winnerList.length

  const raceCalendar = races.map((race, index) => ({
    round: typeof race.round === 'number' ? race.round : index + 1,
    flag: '🏁',
    name: (race.name as string | null) ?? (race.full_name as string | null) ?? 'Grand Prix',
    date:
      typeof race.race_date === 'string'
        ? new Date(race.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'TBD',
    winner: getWinner(race as Record<string, unknown>),
  }))

  const driverStandings = winnerList.slice(0, 6).map(([driverName, wins], idx) => {
    const parts = driverName.split(' ')
    const code = parts.map((p) => p[0]).join('').toUpperCase().slice(0, 3) || 'DRV'
    return {
      pos: idx + 1,
      code,
      name: driverName,
      flag: '🏁',
      avatar: '#3671c6',
      team: 'Unknown',
      teamColor: '#3671c6',
      pts: wins * 25,
      wins,
      podiums: wins,
      poles: 0,
      gap: idx === 0 ? null : `-${(winnerList[0]?.[1] ?? wins) - wins}`,
    }
  })

  const constructorTop = [{ name: 'No constructor data', pts: 0, color: '#6b7280' }]

  const maxConstructorPts = Math.max(...constructorTop.map((c) => c.pts), 1)

  const tabs = ['Driver Standings', 'Constructor Standings', 'Race Calendar'] as const

  return (
    <main
      data-season-year={year}
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
          <Link href="/seasons" style={{ color: tokens.muted, textDecoration: 'none' }}>
            Seasons
          </Link>
          <span aria-hidden>›</span>
          <span style={{ color: tokens.text, fontWeight: 600 }}>{year} Formula 1 Season</span>
        </nav>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          <div>
            {/* Season Hero */}
            <section
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px',
                border: `1px solid ${tokens.border}`,
                marginBottom: '24px',
                background: `linear-gradient(135deg, ${tokens.bg} 0%, ${tokens.bg2} 40%, #0d1520 100%)`,
                padding: '32px 28px 28px',
              }}
            >
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  right: '-20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: font.display,
                  fontSize: 'clamp(120px, 22vw, 200px)',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#ffffff',
                  opacity: 0.04,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {year}
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    fontFamily: font.display,
                    fontSize: '80px',
                    fontWeight: 900,
                    lineHeight: 0.95,
                    letterSpacing: '-3px',
                    color: tokens.accent,
                    marginBottom: '8px',
                  }}
                >
                  {year}
                </div>
                <p
                  style={{
                    fontFamily: font.display,
                    fontSize: '20px',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                    marginBottom: '24px',
                  }}
                >
                  Formula 1 World Championship
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    alignItems: 'stretch',
                    marginBottom: '20px',
                  }}
                >
                  <div
                    style={{
                      flex: '1 1 200px',
                      minWidth: '180px',
                      padding: '16px 18px',
                      borderRadius: '10px',
                      background: 'rgba(245, 200, 66, 0.08)',
                      border: `1px solid ${tokens.gold}`,
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: tokens.gold, marginBottom: '8px' }}>
                      Drivers Champion
                    </div>
                    <div style={{ fontSize: '28px', lineHeight: 1, marginBottom: '6px' }}>👑</div>
                    <div style={{ fontFamily: font.display, fontSize: '22px', fontWeight: 800, color: tokens.text, textTransform: 'uppercase' }}>
                      {championName}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: '1 1 200px',
                      minWidth: '180px',
                      padding: '16px 18px',
                      borderRadius: '10px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: `1px solid ${tokens.blue}`,
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: tokens.blue, marginBottom: '8px' }}>
                      Constructors Champion
                    </div>
                    <div style={{ fontSize: '28px', lineHeight: 1, marginBottom: '6px' }}>🏆</div>
                    <div style={{ fontFamily: font.display, fontSize: '22px', fontWeight: 800, color: tokens.text, textTransform: 'uppercase' }}>
                      {constructorChampion}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { label: `${seasonData.rounds ?? races.length} Races` },
                    { label: `${driverStandings.length} Top Drivers` },
                    { label: `${raceWinnersCount} Winners` },
                    { label: `${year} Season` },
                    { label: `${races.length} Loaded` },
                  ].map((p) => (
                    <span
                      key={p.label}
                      style={{
                        fontFamily: font.display,
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        padding: '8px 14px',
                        borderRadius: '20px',
                        background: tokens.bg3,
                        border: `1px solid ${tokens.border}`,
                        color: tokens.muted,
                      }}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* Leaderboard ad */}
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

            {/* Driver Standings table */}
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
              Driver <span style={{ color: tokens.accent }}>Standings</span>
            </h2>
            <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' }}>
                <thead>
                  <tr>
                    {['Pos', 'Driver', 'Team', 'Pts', 'Wins', 'Podiums', 'Poles', 'Gap'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontFamily: font.display,
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: tokens.muted,
                          padding: '10px 10px',
                          background: tokens.bg2,
                          borderBottom: `1px solid ${tokens.border}`,
                          textAlign: h === 'Driver' || h === 'Team' ? 'left' : 'center',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {driverStandings.map((d) => (
                    <tr key={d.code} style={{ borderBottom: `1px solid ${tokens.border}` }}>
                      <td style={{ padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
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
                            ...posBadgeStyle(d.pos),
                          }}
                        >
                          {d.pos}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: d.avatar,
                              fontFamily: font.display,
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {d.code}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: tokens.text }}>{d.name}</div>
                            <div style={{ fontSize: '12px', color: tokens.muted }}>{d.flag}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.teamColor, flexShrink: 0 }} />
                          <span>{d.team}</span>
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontFamily: font.mono,
                          fontSize: '13px',
                          textAlign: 'center',
                          fontWeight: d.pos === 1 ? 700 : 400,
                          color: d.pos === 1 ? tokens.gold : tokens.text,
                        }}
                      >
                        {d.pts}
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center' }}>{d.wins}</td>
                      <td style={{ padding: '10px 10px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center' }}>{d.podiums}</td>
                      <td style={{ padding: '10px 10px', fontFamily: font.mono, fontSize: '13px', textAlign: 'center' }}>{d.poles}</td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontFamily: font.mono,
                          fontSize: '13px',
                          textAlign: 'center',
                          fontWeight: 600,
                          color: d.gap === null ? tokens.accent : tokens.muted,
                        }}
                      >
                        {d.gap === null ? '—' : d.gap}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* In-feed ad */}
            <div
              style={{
                width: '100%',
                maxWidth: '728px',
                height: '60px',
                marginBottom: '32px',
                background: tokens.bg3,
                border: `1px dashed ${tokens.border}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.muted,
                fontSize: '11px',
                fontFamily: font.mono,
                letterSpacing: '0.5px',
              }}
            >
              728 × 60 — In-feed Ad
            </div>

            {/* Race Calendar */}
            <h2
              style={{
                fontFamily: font.display,
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#fff',
                marginBottom: '16px',
              }}
            >
              Race <span style={{ color: tokens.accent }}>Calendar</span>
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              {raceCalendar.map((r) => (
                <div
                  key={r.round}
                  style={{
                    background: tokens.bg2,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: '10px',
                    padding: '14px 14px 16px',
                  }}
                >
                  <div style={{ fontFamily: font.mono, fontSize: '11px', color: tokens.muted, marginBottom: '8px' }}>R{r.round}</div>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{r.flag}</div>
                  <div style={{ fontFamily: font.display, fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', color: tokens.text, lineHeight: 1.2, marginBottom: '6px' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: '12px', color: tokens.muted, marginBottom: '10px' }}>{r.date}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: tokens.green }}>Winner: {r.winner}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside style={{ width: '300px', position: 'sticky', top: '72px' }}>
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
                  Constructor Standings
                </div>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {constructorTop.map((c) => {
                  const pct = Math.round((c.pts / maxConstructorPts) * 100)
                  return (
                    <div key={c.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: tokens.text }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: c.color }} />
                          {c.name}
                        </span>
                        <span style={{ fontFamily: font.mono, fontSize: '12px', color: tokens.muted }}>{c.pts} pts</span>
                      </div>
                      <div style={{ height: '8px', background: tokens.bg4, borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            borderRadius: '4px',
                            background: `linear-gradient(90deg, ${c.color}, ${c.color}cc)`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

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
                  Season Stats
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                {[
                  ['Race winners', `${raceWinnersCount} drivers`],
                  ['Most wins', winnerList[0] ? `${winnerList[0][0]} ${winnerList[0][1]}` : 'N/A'],
                  ['Total races', String(seasonData.rounds ?? races.length)],
                  ['Loaded races', String(races.length)],
                  ['Season year', String(year)],
                  ['Data source', 'Supabase'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '12px',
                      padding: '10px 0',
                      borderBottom: `1px solid ${tokens.border}`,
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: tokens.muted }}>{label}</span>
                    <span style={{ fontFamily: font.mono, fontWeight: 600, color: tokens.text, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                width: '300px',
                height: '250px',
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
          </aside>
        </div>
      </div>
    </main>
  )
}
