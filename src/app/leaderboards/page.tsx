import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PageHead from '@/components/page/PageHead'
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

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const requestedTab = resolvedSearchParams.tab
  const activeTab: Tab = requestedTab === 'constructors' || requestedTab === 'records' ? requestedTab : 'drivers'

  const supabase = createServerClient()
  const [driversRes, constructorsRes, winRes, champRes, polesRes, podiumsRes, racesRes] = await Promise.all([
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
  ])

  const drivers = ((driversRes.data ?? []) as DriverRow[]).slice(0, 100)
  const constructors = ((constructorsRes.data ?? []) as ConstructorRow[]).slice(0, 100)

  const records: RecordItem[] = [
    champRes.data?.[0]
      ? { label: 'Most world titles', holder: champRes.data[0].full_name, value: String(champRes.data[0].championships), href: `/drivers/${champRes.data[0].slug}`, isGold: true }
      : null,
    winRes.data?.[0]
      ? { label: 'Most race wins', holder: winRes.data[0].full_name, value: String(winRes.data[0].career_wins), href: `/drivers/${winRes.data[0].slug}` }
      : null,
    polesRes.data?.[0]
      ? { label: 'Most pole positions', holder: polesRes.data[0].full_name, value: String(polesRes.data[0].career_poles), href: `/drivers/${polesRes.data[0].slug}` }
      : null,
    podiumsRes.data?.[0]
      ? { label: 'Most podiums', holder: podiumsRes.data[0].full_name, value: String(podiumsRes.data[0].career_podiums), href: `/drivers/${podiumsRes.data[0].slug}` }
      : null,
    racesRes.data?.[0]
      ? { label: 'Most race starts', holder: racesRes.data[0].full_name, value: String(racesRes.data[0].career_starts), href: `/drivers/${racesRes.data[0].slug}` }
      : null,
  ].filter((entry): entry is RecordItem => entry !== null)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'drivers', label: 'Drivers' },
    { key: 'constructors', label: 'Constructors' },
    { key: 'records', label: 'Records' },
  ]

  return (
    <main className="pg">
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Records' }]}
        title="Records"
        lede="The all-time numbers: who has won the most, started the most and taken the most titles, drivers and constructors."
        stats={records.slice(0, 3).map((r, i) => ({ value: r.value, label: `${r.label.toLowerCase()}, ${r.holder.split(' ').at(-1)}`, sig: i === 0 }))}
      />
      <div className="pg-body">
        <nav className="pg-chips" aria-label="Records" style={{ marginBottom: 18 }}>
          {tabs.map((t) => (
            <Link key={t.key} href={t.key === 'drivers' ? '/leaderboards' : `/leaderboards?tab=${t.key}`} className="pg-chip" aria-current={activeTab === t.key ? 'page' : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>

        {activeTab === 'records' && (
          <div className="pg-facts">
            {records.map((r, i) => (
              <div key={r.label} className={i === 0 ? 'lead' : undefined}>
                <span>{r.label}</span>
                <b>{r.value}</b>
                <Link href={r.href} style={{ color: 'var(--text)', fontWeight: 700 }}>{r.holder}</Link>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="pg-scroll">
            <table className="pg-table">
              <thead>
                <tr>
                  <th className="n">#</th>
                  <th>Driver</th>
                  <th className="n">Wins</th>
                  <th className="n">Titles</th>
                  <th className="n hide-sm">Podiums</th>
                  <th className="n hide-sm">Poles</th>
                  <th className="n hide-sm">Points</th>
                  <th className="hide-sm">Era</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d, i) => (
                  <tr key={d.id} className={i === 0 ? 'p1' : undefined}>
                    <td className="pos n">{i + 1}</td>
                    <td><Link href={`/drivers/${d.slug}`}>{d.full_name}</Link>{d.nationality && <span className="sub">{d.nationality}</span>}</td>
                    <td className="n">{d.career_wins}</td>
                    <td className={`n${d.championships > 0 ? ' top' : ''}`}>{d.championships}</td>
                    <td className="n hide-sm">{d.career_podiums}</td>
                    <td className="n hide-sm">{d.career_poles}</td>
                    <td className="n hide-sm">{Math.round(Number(d.career_points)).toLocaleString('en-GB')}</td>
                    <td className="hide-sm muted">{getDriverEra(d.first_season, d.last_season) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'constructors' && (
          <div className="pg-scroll">
            <table className="pg-table">
              <thead>
                <tr>
                  <th className="n">#</th>
                  <th>Team</th>
                  <th className="n">Wins</th>
                  <th className="n">Titles</th>
                  <th className="n hide-sm">Podiums</th>
                  <th className="n hide-sm">Poles</th>
                  <th className="n hide-sm">Races</th>
                  <th className="n hide-sm">Points</th>
                </tr>
              </thead>
              <tbody>
                {constructors.map((t, i) => (
                  <tr key={t.id} className={i === 0 ? 'p1' : undefined}>
                    <td className="pos n">{i + 1}</td>
                    <td><Link href={`/teams/${t.slug}`}>{t.name}</Link></td>
                    <td className="n">{t.race_wins}</td>
                    <td className={`n${t.championships > 0 ? ' top' : ''}`}>{t.championships}</td>
                    <td className="n hide-sm">{t.podiums}</td>
                    <td className="n hide-sm">{t.poles}</td>
                    <td className="n hide-sm">{t.races_entered ?? '—'}</td>
                    <td className="n hide-sm">{Math.round(Number(t.total_points)).toLocaleString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
