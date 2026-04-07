import Link from 'next/link'

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

export default async function DriverPage({ params }: PageProps) {
  const { slug } = await params

  const driver = {
    firstName: 'LEWIS',
    lastName: 'HAMILTON',
    code: 'HAM',
    number: '44',
    nationality: 'British',
    flag: '🇬🇧',
    team: 'Mercedes',
    teamColor: '#27f4d2',
    titles: 7,
    bio: 'Seven-time Formula One World Champion. The most successful driver in F1 history by race wins and podiums. Known for relentless pace, wet-weather mastery, and advocacy beyond the track.',
  }

  const careerStats = [
    { label: 'Wins', value: '103' },
    { label: 'Poles', value: '104' },
    { label: 'Podiums', value: '197' },
    { label: 'Titles', value: '7' },
    { label: 'Points', value: '4801.5' },
    { label: 'Starts', value: '334' },
  ] as const

  const tabs = ['Race Results', 'Season by Season', 'Head-to-Head', 'Lap Records'] as const

  const raceRows = [
    {
      season: '2024',
      race: 'British Grand Prix',
      flag: '🇬🇧',
      grid: 5,
      finish: 1,
      status: 'WIN' as const,
      points: '25',
      team: 'Mercedes',
    },
    {
      season: '2023',
      race: 'Monaco Grand Prix',
      flag: '🇲🇨',
      grid: 2,
      finish: 2,
      status: 'FIN' as const,
      points: '18',
      team: 'Mercedes',
    },
    {
      season: '2022',
      race: 'Belgian Grand Prix',
      flag: '🇧🇪',
      grid: 4,
      finish: 3,
      status: 'FIN' as const,
      points: '15',
      team: 'Mercedes',
    },
    {
      season: '2021',
      race: 'Italian Grand Prix',
      flag: '🇮🇹',
      grid: 1,
      finish: null as number | null,
      status: 'DNF' as const,
      points: '0',
      team: 'Mercedes',
    },
    {
      season: '2020',
      race: 'Turkish Grand Prix',
      flag: '🇹🇷',
      grid: 6,
      finish: 1,
      status: 'WIN' as const,
      points: '25',
      team: 'Mercedes',
    },
  ]

  const seasonRows = [
    { season: '2020', team: 'Mercedes', pos: 1, pts: '347', wins: 11, poles: 10, podiums: 14, champion: true },
    { season: '2019', team: 'Mercedes', pos: 1, pts: '413', wins: 11, poles: 5, podiums: 17, champion: true },
    { season: '2018', team: 'Mercedes', pos: 1, pts: '408', wins: 11, poles: 11, podiums: 17, champion: true },
  ]

  const circuitWins = [
    { name: 'Silverstone', wins: 9, max: 9 },
    { name: 'Hungaroring', wins: 9, max: 9 },
    { name: 'Montreal', wins: 7, max: 9 },
  ]

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
          <span style={{ color: tokens.text, fontWeight: 600 }}>Lewis Hamilton</span>
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
                        {driver.flag} {driver.nationality}
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
                        {driver.team}
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
                  Compare Hamilton
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
                  {raceRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${tokens.border}` }}>
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
                  {seasonRows.map((row) => {
                    const highlight = row.season === '2020'
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
                  ['Nationality', `${driver.flag} ${driver.nationality}`],
                  ['Date of birth', '7 January 1985'],
                  ['Age', '41'],
                  ['First race', '2007 Australian GP'],
                  ['Height', '1.74 m'],
                  ['Car number', `#${driver.number}`],
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
