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
} as const

const font = {
  display: "'Barlow Condensed', sans-serif",
  body: "'Barlow', sans-serif",
  mono: "'JetBrains Mono', monospace",
}

type PageProps = {
  params: Promise<{ slug: string }>
}

function posBadgeStyle(pos: number | null) {
  if (pos === 1) return { background: 'rgba(245, 200, 66, 0.15)', color: tokens.gold, border: `1px solid ${tokens.gold}` }
  if (pos === 2) return { background: 'rgba(192, 192, 200, 0.12)', color: tokens.silver, border: `1px solid ${tokens.silver}` }
  if (pos === 3) return { background: 'rgba(205, 127, 50, 0.12)', color: tokens.bronze, border: `1px solid ${tokens.bronze}` }
  return { background: tokens.bg4, color: tokens.muted, border: `1px solid ${tokens.border}` }
}

export default async function RacePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServerClient()

  const { data: race } = await supabase.from('races').select('*').eq('slug', slug).maybeSingle()
  if (!race) {
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
        Race not found
      </main>
    )
  }

  const { data: circuit } = await supabase
    .from('circuits')
    .select('*')
    .eq('slug', (race.circuit_slug as string | null) ?? '')
    .maybeSingle()

  const { data: resultsData } = await supabase.from('results').select('*').eq('race_slug', slug)
  const resultsByDriver = new Map<string, (typeof resultsData extends Array<infer T> ? T : never)>()
  for (const row of resultsData ?? []) {
    const driverSlug =
      typeof row.driver_slug === 'string' && row.driver_slug.length > 0
        ? row.driver_slug
        : `unknown-${row.slug ?? Math.random()}`
    const existing = resultsByDriver.get(driverSlug)
    if (!existing) {
      resultsByDriver.set(driverSlug, row)
      continue
    }

    const existingPos = typeof existing.position === 'number' ? existing.position : 9999
    const currentPos = typeof row.position === 'number' ? row.position : 9999
    if (currentPos < existingPos) {
      resultsByDriver.set(driverSlug, row)
    }
  }

  const results = Array.from(resultsByDriver.values()).sort((a, b) => {
    const pa = typeof a.position === 'number' ? a.position : 9999
    const pb = typeof b.position === 'number' ? b.position : 9999
    return pa - pb
  })

  const raceName = (race.name as string | null) ?? (race.full_name as string | null) ?? 'Grand Prix'
  const seasonYear = (race.season_year as number | null) ?? null
  const round = (race.round as number | null) ?? null
  const raceDate =
    typeof race.race_date === 'string'
      ? new Date(race.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'TBD'
  const circuitName = (circuit?.name as string | null) ?? ((race.circuit_slug as string | null) ?? 'Unknown circuit')

  return (
    <main
      data-race-slug={slug}
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
          <Link href="/races" style={{ color: tokens.muted, textDecoration: 'none' }}>
            Races
          </Link>
          <span aria-hidden>›</span>
          <span style={{ color: tokens.text, fontWeight: 600 }}>{raceName}</span>
        </nav>

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
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                fontFamily: font.display,
                fontSize: 'clamp(34px, 6vw, 64px)',
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: '-1px',
                color: '#fff',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              {raceName}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[`Date: ${raceDate}`, `Circuit: ${circuitName}`, `Round: ${round ?? 'N/A'}`, `Season: ${seasonYear ?? 'N/A'}`].map((label) => (
                <span
                  key={label}
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
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' }}>
            <thead>
              <tr>
                {['Pos', 'Driver', 'Team', 'Grid', 'Points', 'Status', 'Time'].map((h) => (
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
              {results.map((row) => {
                const pos = typeof row.position === 'number' ? row.position : null
                return (
                  <tr key={(row.slug as string) ?? `${row.driver_slug}-${row.position_text}`} style={{ borderBottom: `1px solid ${tokens.border}` }}>
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
                          ...posBadgeStyle(pos),
                        }}
                      >
                        {pos ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ fontWeight: 600, color: tokens.text }}>
                        {(row.driver_name as string | null) ?? (row.driver_slug as string | null) ?? 'Unknown'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 10px', color: tokens.text }}>
                      {(row.constructor_name as string | null) ?? (row.constructor_slug as string | null) ?? '—'}
                    </td>
                    <td style={{ padding: '10px 10px', fontFamily: font.mono, textAlign: 'center' }}>
                      {typeof row.grid === 'number' ? row.grid : '—'}
                    </td>
                    <td style={{ padding: '10px 10px', fontFamily: font.mono, textAlign: 'center' }}>
                      {typeof row.points === 'number' ? row.points : '—'}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', color: tokens.muted }}>
                      {(row.status as string | null) ?? '—'}
                    </td>
                    <td style={{ padding: '10px 10px', fontFamily: font.mono, textAlign: 'center', color: tokens.muted }}>
                      {(row.time_text as string | null) ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
