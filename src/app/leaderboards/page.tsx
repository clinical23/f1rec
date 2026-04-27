import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getDriverEra } from '@/lib/drivers/era'

type Tab = 'drivers' | 'constructors' | 'records'

type DriverRow = {
  id: string
  slug: string
  full_name: string
  nationality?: string | null
  career_wins: number
  career_podiums: number
  career_poles: number
  career_points: number
  championships: number
  first_season?: number | null
  last_season?: number | null
}

type ConstructorRow = {
  id: string
  slug: string
  name: string
  races_entered?: number
  race_wins: number
  podiums: number
  poles: number
  championships: number
  total_points: number
}

type RecordItem = {
  label: string
  holder: string
  value: string
  href: string
  isGold?: boolean
}

const cardStyle = {
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  overflow: 'hidden',
  marginBottom: '16px',
} as const

const cardHeaderStyle = {
  padding: '10px 16px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg3)',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#fff',
} as const

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const requestedTab = resolvedSearchParams.tab
  const activeTab: Tab = requestedTab === 'constructors' || requestedTab === 'records' ? requestedTab : 'drivers'

  const supabase = createServerClient()
  const [driversRes, constructorsRes, winRes, champRes, polesRes, podiumsRes, racesRes, youngestChampRes, oldestChampRes] = await Promise.all([
    supabase
      .from('drivers')
      .select(
        'id, slug, full_name, nationality, career_wins, career_podiums, career_poles, career_points, championships, first_season, last_season'
      )
      .order('career_wins', { ascending: false }),
    supabase.from('v_constructor_leaderboard').select('*').order('race_wins', { ascending: false }),
    supabase.from('drivers').select('full_name, slug, career_wins').order('career_wins', { ascending: false }).limit(1),
    supabase.from('drivers').select('full_name, slug, championships').order('championships', { ascending: false }).limit(1),
    supabase.from('drivers').select('full_name, slug, career_poles').order('career_poles', { ascending: false }).limit(1),
    supabase.from('drivers').select('full_name, slug, career_podiums').order('career_podiums', { ascending: false }).limit(1),
    supabase.from('drivers').select('full_name, slug, career_starts').order('career_starts', { ascending: false }).limit(1),
    supabase.from('drivers').select('full_name, slug, age_at_first_championship').not('age_at_first_championship', 'is', null).order('age_at_first_championship', { ascending: true }).limit(1),
    supabase.from('drivers').select('full_name, slug, age_at_first_championship').not('age_at_first_championship', 'is', null).order('age_at_first_championship', { ascending: false }).limit(1),
  ])

  const drivers = ((driversRes.data ?? []) as DriverRow[]).slice(0, 100)
  const constructors = ((constructorsRes.data ?? []) as ConstructorRow[]).slice(0, 100)

  const records: RecordItem[] = [
    champRes.data?.[0]
      ? { label: 'Most Championships', holder: champRes.data[0].full_name, value: String(champRes.data[0].championships), href: `/drivers/${champRes.data[0].slug}`, isGold: true }
      : null,
    winRes.data?.[0]
      ? { label: 'Most Wins', holder: winRes.data[0].full_name, value: String(winRes.data[0].career_wins), href: `/drivers/${winRes.data[0].slug}` }
      : null,
    polesRes.data?.[0]
      ? { label: 'Most Poles', holder: polesRes.data[0].full_name, value: String(polesRes.data[0].career_poles), href: `/drivers/${polesRes.data[0].slug}` }
      : null,
    podiumsRes.data?.[0]
      ? { label: 'Most Podiums', holder: podiumsRes.data[0].full_name, value: String(podiumsRes.data[0].career_podiums), href: `/drivers/${podiumsRes.data[0].slug}` }
      : null,
    racesRes.data?.[0]
      ? { label: 'Most Races', holder: racesRes.data[0].full_name, value: String(racesRes.data[0].career_starts), href: `/drivers/${racesRes.data[0].slug}` }
      : null,
    youngestChampRes.data?.[0]
      ? { label: 'Youngest Champion', holder: youngestChampRes.data[0].full_name, value: `${youngestChampRes.data[0].age_at_first_championship}`, href: `/drivers/${youngestChampRes.data[0].slug}` }
      : null,
    oldestChampRes.data?.[0]
      ? { label: 'Oldest Champion', holder: oldestChampRes.data[0].full_name, value: `${oldestChampRes.data[0].age_at_first_championship}`, href: `/drivers/${oldestChampRes.data[0].slug}` }
      : null,
  ].filter((entry): entry is RecordItem => entry !== null)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '44px',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#fff',
              margin: 0,
            }}
          >
            Leaderboards
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', marginTop: '6px' }}>All-time rankings across every era of Formula 1</p>
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          {(['drivers', 'constructors', 'records'] as Tab[]).map((tab) => (
            <Link
              key={tab}
              href={`/leaderboards?tab=${tab}`}
              style={{
                padding: '12px 20px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: activeTab === tab ? '#fff' : 'var(--muted)',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
                textDecoration: 'none',
              }}
            >
              {tab}
            </Link>
          ))}
        </div>

        {activeTab === 'drivers' ? (
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>All-Time Drivers</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
                <thead>
                  <tr>
                    {['#', 'Driver', 'Nationality', 'Wins', 'Podiums', 'Poles', 'Points', 'Titles', 'Era'].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '12px 16px',
                          textAlign: col === 'Driver' || col === 'Nationality' || col === 'Era' ? 'left' : 'right',
                          color: 'var(--muted)',
                          borderBottom: '1px solid var(--border)',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver, idx) => (
                    <tr key={driver.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: idx === 0 ? 'var(--gold)' : 'var(--muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/drivers/${driver.slug}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                          {driver.full_name}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{driver.nationality ?? 'Unknown'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{driver.career_wins}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{driver.career_podiums}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{driver.career_poles}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{Number(driver.career_points).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: driver.championships > 0 ? 'var(--gold)' : 'var(--text)' }}>
                        {driver.championships}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>
                        {getDriverEra(driver.first_season, driver.last_season) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeTab === 'constructors' ? (
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>All-Time Constructors</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1050px' }}>
                <thead>
                  <tr>
                    {['#', 'Team', 'Races', 'Wins', 'Podiums', 'Poles', 'Titles', 'Points'].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '12px 16px',
                          textAlign: col === 'Team' ? 'left' : 'right',
                          color: 'var(--muted)',
                          borderBottom: '1px solid var(--border)',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {constructors.map((team, idx) => (
                    <tr key={team.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: idx === 0 ? 'var(--gold)' : 'var(--muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/teams/${team.slug}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                          {team.name}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{team.races_entered ?? 0}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{team.race_wins}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{team.podiums}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{team.poles}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: team.championships > 0 ? 'var(--gold)' : 'var(--text)' }}>
                        {team.championships}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{Number(team.total_points).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeTab === 'records' ? (
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>Records</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                padding: '16px',
              }}
            >
              {records.map((record) => (
                <div
                  key={record.label}
                  style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      color: 'var(--muted)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    {record.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '32px',
                      fontWeight: 800,
                      color: record.isGold ? 'var(--gold)' : '#fff',
                      lineHeight: 1,
                      marginBottom: '8px',
                    }}
                  >
                    {record.value}
                  </div>
                  <Link href={record.href} style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                    {record.holder}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
