'use client'

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// --- Types ---

interface DriverRow {
  id: string; slug: string; full_name: string; nationality: string | null
  career_wins: number; career_podiums: number; career_poles: number
  career_points: number; career_starts: number; championships: number
  is_active: boolean; current_team: string | null
}

interface ConstructorRow {
  id: string; slug: string; name: string; championships: number
  race_wins: number; podiums: number; poles: number; total_points: number
  seasons_active: number; first_season: number | null; last_season: number | null
  primary_color: string | null
}

interface RecordCard {
  title: string; holder: string; slug: string; value: string; context: string; linkBase: string
}

type DriverSortKey = 'full_name' | 'championships' | 'career_wins' | 'career_podiums' | 'career_poles' | 'career_points' | 'career_starts'
type ConstructorSortKey = 'name' | 'championships' | 'race_wins' | 'podiums' | 'poles' | 'total_points' | 'seasons_active'
type SortDir = 'asc' | 'desc'

const DRIVER_LABELS: Record<DriverSortKey, string> = {
  full_name: 'Driver', championships: 'Titles', career_wins: 'Wins',
  career_podiums: 'Podiums', career_poles: 'Poles', career_points: 'Points', career_starts: 'Starts',
}
const CONSTRUCTOR_LABELS: Record<ConstructorSortKey, string> = {
  name: 'Team', championships: 'Titles', race_wins: 'Wins',
  podiums: 'Podiums', poles: 'Poles', total_points: 'Points', seasons_active: 'Seasons',
}

// --- Shared styles ---

const thStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.75rem 0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase',
  letterSpacing: '0.08em', fontSize: '0.7rem', color: active ? 'var(--accent)' : 'var(--muted)',
  fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid var(--border)', userSelect: 'none', whiteSpace: 'nowrap',
})

// --- Sortable table header ---

function SortTh<K extends string>({ label, sortKey, currentKey, dir, onClick, align }: {
  label: string; sortKey: K; currentKey: K; dir: SortDir; onClick: (k: K) => void; align?: 'left' | 'right'
}) {
  const active = sortKey === currentKey
  return (
    <th onClick={() => onClick(sortKey)} style={{ ...thStyle(active), textAlign: align ?? 'right' }}>
      {label}{active && <span style={{ marginLeft: '0.3rem', fontSize: '0.6rem' }}>{dir === 'desc' ? '▼' : '▲'}</span>}
    </th>
  )
}

// --- Drivers Tab ---

function DriversTab() {
  const [data, setData] = useState<DriverRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<DriverSortKey>('career_wins')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visibleCount, setVisibleCount] = useState(50)

  useEffect(() => {
    supabase.from('v_driver_leaderboard').select('*').order('career_wins', { ascending: false })
      .then(({ data }) => { if (data) setData(data); setLoading(false) })
  }, [])

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortKey === 'full_name') {
        const cmp = a.full_name.localeCompare(b.full_name)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const av = (a[sortKey] as number) ?? 0
      const bv = (b[sortKey] as number) ?? 0
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [data, sortKey, sortDir])

  function toggle(key: DriverSortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir(key === 'full_name' ? 'asc' : 'desc') }
    setVisibleCount(50)
  }

  if (loading) return <Spinner label="Loading drivers..." />

  const visible = sorted.slice(0, visibleCount)

  return (
    <>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              <th style={{ ...thStyle(false), textAlign: 'left', width: '40px', cursor: 'default' }}>#</th>
              {(Object.keys(DRIVER_LABELS) as DriverSortKey[]).map(k => (
                <SortTh key={k} label={DRIVER_LABELS[k]} sortKey={k} currentKey={sortKey} dir={sortDir} onClick={toggle} align={k === 'full_name' ? 'left' : 'right'} />
              ))}
              <th style={{ ...thStyle(false), textAlign: 'left', cursor: 'default' }}>Nationality</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d, i) => (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.6rem 1rem', color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--font-jetbrains, monospace)' }}>{i + 1}</td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {d.is_active && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green, #00d4a0)', flexShrink: 0 }} title="Active driver" />}
                    <Link href={`/drivers/${d.slug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}>
                      {d.full_name}
                    </Link>
                  </div>
                </td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                  {d.championships > 0 ? <span style={{ color: 'var(--gold, #f5c842)', fontWeight: 700, fontFamily: 'var(--font-barlow-condensed)' }}>{d.championships}×🏆</span> : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}
                </td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', fontWeight: d.career_wins > 0 ? 600 : 400, color: d.career_wins > 0 ? 'var(--text)' : 'var(--muted)' }}>{d.career_wins}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: d.career_podiums > 0 ? 'var(--text)' : 'var(--muted)' }}>{d.career_podiums}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: d.career_poles > 0 ? 'var(--text)' : 'var(--muted)' }}>{d.career_poles}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{Number(d.career_points).toLocaleString()}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{d.career_starts}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--muted)', fontSize: '0.8rem' }}>{d.nationality || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visibleCount < sorted.length && <LoadMore remaining={sorted.length - visibleCount} onClick={() => setVisibleCount(c => c + 50)} />}
    </>
  )
}

// --- Constructors Tab ---

function ConstructorsTab() {
  const [data, setData] = useState<ConstructorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<ConstructorSortKey>('race_wins')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visibleCount, setVisibleCount] = useState(50)

  useEffect(() => {
    supabase.from('v_constructor_leaderboard').select('*').order('race_wins', { ascending: false })
      .then(({ data }) => { if (data) setData(data); setLoading(false) })
  }, [])

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = a.name.localeCompare(b.name)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const av = (a[sortKey] as number) ?? 0
      const bv = (b[sortKey] as number) ?? 0
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [data, sortKey, sortDir])

  function toggle(key: ConstructorSortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc') }
    setVisibleCount(50)
  }

  if (loading) return <Spinner label="Loading constructors..." />

  const visible = sorted.slice(0, visibleCount)

  return (
    <>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              <th style={{ ...thStyle(false), textAlign: 'left', width: '40px', cursor: 'default' }}>#</th>
              {(Object.keys(CONSTRUCTOR_LABELS) as ConstructorSortKey[]).map(k => (
                <SortTh key={k} label={CONSTRUCTOR_LABELS[k]} sortKey={k} currentKey={sortKey} dir={sortDir} onClick={toggle} align={k === 'name' ? 'left' : 'right'} />
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.6rem 1rem', color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--font-jetbrains, monospace)' }}>{i + 1}</td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t.primary_color && <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: t.primary_color, flexShrink: 0 }} />}
                    <Link href={`/teams/${t.slug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}>
                      {t.name}
                    </Link>
                  </div>
                </td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                  {t.championships > 0 ? <span style={{ color: 'var(--gold, #f5c842)', fontWeight: 700, fontFamily: 'var(--font-barlow-condensed)' }}>{t.championships}×🏆</span> : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}
                </td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', fontWeight: t.race_wins > 0 ? 600 : 400, color: t.race_wins > 0 ? 'var(--text)' : 'var(--muted)' }}>{t.race_wins}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: t.podiums > 0 ? 'var(--text)' : 'var(--muted)' }}>{t.podiums}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: t.poles > 0 ? 'var(--text)' : 'var(--muted)' }}>{t.poles}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{Number(t.total_points).toLocaleString()}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{t.seasons_active}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visibleCount < sorted.length && <LoadMore remaining={sorted.length - visibleCount} onClick={() => setVisibleCount(c => c + 50)} />}
    </>
  )
}

// --- Records Tab ---

function RecordsTab() {
  const [records, setRecords] = useState<RecordCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecords() {
      const [
        seasonWinsRes,
        mostWinsRes,
        mostChampsRes,
        mostPointsRes,
        mostPodiumsRes,
        mostPolesRes,
        mostStartsRes,
        mostConstructorWinsRes,
      ] = await Promise.all([
        supabase.from('driver_season_stats').select('wins, season_id, driver_id, seasons!inner(year), drivers!inner(full_name, slug)')
          .order('wins', { ascending: false }).limit(1),
        supabase.from('drivers').select('full_name, slug, career_wins').order('career_wins', { ascending: false }).limit(1),
        supabase.from('drivers').select('full_name, slug, championships').order('championships', { ascending: false }).limit(1),
        supabase.from('drivers').select('full_name, slug, career_points').order('career_points', { ascending: false }).limit(1),
        supabase.from('drivers').select('full_name, slug, career_podiums').order('career_podiums', { ascending: false }).limit(1),
        supabase.from('drivers').select('full_name, slug, career_poles').order('career_poles', { ascending: false }).limit(1),
        supabase.from('drivers').select('full_name, slug, career_starts').order('career_starts', { ascending: false }).limit(1),
        supabase.from('v_constructor_leaderboard').select('name, slug, race_wins').order('race_wins', { ascending: false }).limit(1),
      ])

      const cards: RecordCard[] = []

      const sw = seasonWinsRes.data?.[0] as any
      if (sw) cards.push({ title: 'Most Wins in a Season', holder: sw.drivers.full_name, slug: sw.drivers.slug, value: String(sw.wins), context: `${sw.seasons.year} Season`, linkBase: '/drivers' })

      const mw = mostWinsRes.data?.[0]
      if (mw) cards.push({ title: 'Most Career Wins', holder: mw.full_name, slug: mw.slug, value: String(mw.career_wins), context: 'All-time record', linkBase: '/drivers' })

      const mc = mostChampsRes.data?.[0]
      if (mc) cards.push({ title: 'Most Championships', holder: mc.full_name, slug: mc.slug, value: String(mc.championships), context: 'World titles', linkBase: '/drivers' })

      const mp = mostPointsRes.data?.[0]
      if (mp) cards.push({ title: 'Most Career Points', holder: mp.full_name, slug: mp.slug, value: Number(mp.career_points).toLocaleString(), context: 'All-time record', linkBase: '/drivers' })

      const mpod = mostPodiumsRes.data?.[0]
      if (mpod) cards.push({ title: 'Most Podiums', holder: mpod.full_name, slug: mpod.slug, value: String(mpod.career_podiums), context: 'All-time record', linkBase: '/drivers' })

      const mpol = mostPolesRes.data?.[0]
      if (mpol) cards.push({ title: 'Most Pole Positions', holder: mpol.full_name, slug: mpol.slug, value: String(mpol.career_poles), context: 'All-time record', linkBase: '/drivers' })

      const ms = mostStartsRes.data?.[0]
      if (ms) cards.push({ title: 'Most Race Starts', holder: ms.full_name, slug: ms.slug, value: String(ms.career_starts), context: 'All-time record', linkBase: '/drivers' })

      const mcw = mostConstructorWinsRes.data?.[0]
      if (mcw) cards.push({ title: 'Most Constructor Wins', holder: mcw.name, slug: mcw.slug, value: String(mcw.race_wins), context: 'All-time record', linkBase: '/teams' })

      setRecords(cards)
      setLoading(false)
    }
    fetchRecords()
  }, [])

  if (loading) return <Spinner label="Loading records..." />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
      {records.map(r => (
        <div key={r.title} style={{ padding: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '0.75rem' }}>{r.title}</div>
          <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--gold, #f5c842)', lineHeight: 1, marginBottom: '0.5rem' }}>{r.value}</div>
          <Link href={`${r.linkBase}/${r.slug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}>
            {r.holder}
          </Link>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{r.context}</div>
        </div>
      ))}
    </div>
  )
}

// --- Shared components ---

function Spinner({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function LoadMore({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
      <button onClick={onClick}
        style={{ padding: '0.7rem 2rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600 }}>
        Load More ({remaining} remaining)
      </button>
    </div>
  )
}

// --- Main content (uses useSearchParams) ---

const TABS = [
  { key: 'drivers', label: 'Drivers' },
  { key: 'constructors', label: 'Constructors' },
  { key: 'records', label: 'Records' },
] as const

type TabKey = typeof TABS[number]['key']

function LeaderboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: TabKey = (rawTab === 'constructors' || rawTab === 'records') ? rawTab : 'drivers'

  useEffect(() => {
    document.title = 'F1 Leaderboards — All-Time Records & Rankings | F1Rec'
  }, [])

  const setTab = useCallback((tab: TabKey) => {
    router.replace(`/leaderboards${tab === 'drivers' ? '' : `?tab=${tab}`}`, { scroll: false })
  }, [router])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>F1 Database</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
          All-Time<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Records</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          The greatest achievements in Formula 1 history.
        </p>
      </section>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '0.55rem 1.2rem', fontSize: '0.8rem', fontFamily: 'var(--font-barlow-condensed)',
                textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                border: '1px solid', cursor: 'pointer', borderRadius: '4px',
                borderColor: activeTab === t.key ? 'var(--accent)' : 'var(--border)',
                background: activeTab === t.key ? 'rgba(232,0,45,0.15)' : 'transparent',
                color: activeTab === t.key ? 'var(--accent)' : 'var(--muted)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'drivers' && <DriversTab />}
        {activeTab === 'constructors' && <ConstructorsTab />}
        {activeTab === 'records' && <RecordsTab />}
      </section>
    </main>
  )
}

// --- Page export with Suspense ---

export default function LeaderboardsPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--muted)' }}>Loading leaderboards...</p></main>}>
      <LeaderboardContent />
    </Suspense>
  )
}
