// F1Rec Deploy Script — Run with: node setup.js
// Place this file in C:\Users\Aisha\Desktop\f1rec and run it

const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ ${filePath}`);
}

console.log('\n🏎️  F1Rec Deploy — Writing files...\n');

// ============================================================
// 1. src/lib/supabase.ts
// ============================================================
writeFile('src/lib/supabase.ts', `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mezipswmplrcdbinwjwy.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lemlwc3dtcGxyY2RiaW53and5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDUxNjYsImV4cCI6MjA5MTA4MTE2Nn0.GvIMSsBobPydoKiDqTMBFCEU5GdOL8RSSPKWZ1Z6vfg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
`);

// ============================================================
// 2. src/app/drivers/page.tsx
// ============================================================
writeFile('src/app/drivers/page.tsx', `'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Driver {
  id: string
  slug: string
  full_name: string
  first_name: string
  last_name: string
  code: string | null
  nationality: string | null
  career_wins: number
  career_podiums: number
  career_poles: number
  career_points: number
  career_starts: number
  career_fastest_laps: number
  championships: number
  is_active: boolean
  first_season: number | null
  last_season: number | null
}

type SortKey = 'full_name' | 'career_wins' | 'career_podiums' | 'career_poles' | 'career_points' | 'championships' | 'career_starts'
type SortDir = 'asc' | 'desc'

const STAT_LABELS: Record<SortKey, string> = {
  full_name: 'Name',
  career_wins: 'Wins',
  career_podiums: 'Podiums',
  career_poles: 'Poles',
  career_points: 'Points',
  championships: 'Titles',
  career_starts: 'Starts',
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eraFilter, setEraFilter] = useState<string>('all')
  const [champOnly, setChampOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('career_wins')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visibleCount, setVisibleCount] = useState(60)

  useEffect(() => {
    async function fetchDrivers() {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, slug, full_name, first_name, last_name, code, nationality, career_wins, career_podiums, career_poles, career_points, career_starts, career_fastest_laps, championships, is_active, first_season, last_season')
        .order('career_wins', { ascending: false })
      if (!error && data) setDrivers(data)
      setLoading(false)
    }
    fetchDrivers()
  }, [])

  const filtered = useMemo(() => {
    let result = drivers
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(d =>
        d.full_name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q)) ||
        (d.nationality && d.nationality.toLowerCase().includes(q))
      )
    }
    if (eraFilter !== 'all') {
      const [start, end] = eraFilter.split('-').map(Number)
      result = result.filter(d => {
        if (!d.first_season) return false
        const lastSeason = d.last_season || 2025
        return lastSeason >= start && d.first_season <= end
      })
    }
    if (champOnly) result = result.filter(d => d.championships > 0)
    result = [...result].sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? 0
      let bVal: string | number = b[sortKey] ?? 0
      if (sortKey === 'full_name') {
        aVal = (a.last_name || a.full_name).toLowerCase()
        bVal = (b.last_name || b.full_name).toLowerCase()
        return sortDir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
    return result
  }, [drivers, search, eraFilter, champOnly, sortKey, sortDir])

  const visible = filtered.slice(0, visibleCount)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir(key === 'full_name' ? 'asc' : 'desc') }
  }

  const eras = [
    { label: 'All Eras', value: 'all' },
    { label: '2022-Now', value: '2022-2025' },
    { label: '2014-21', value: '2014-2021' },
    { label: '2006-13', value: '2006-2013' },
    { label: '1998-05', value: '1998-2005' },
    { label: '1980-97', value: '1980-1997' },
    { label: '1950-79', value: '1950-1979' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>F1 Database</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
          Every Driver.<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Every Season.</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          {drivers.length > 0 ? \`\${drivers.length} drivers\` : '...'} from 1950 to today. Search, filter, and explore every career.
        </p>
      </section>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '200px' }}>
            <input type="text" placeholder="Search drivers..." value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(60) }}
              style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', background: 'var(--bg2, #111118)', border: '1px solid var(--border, #2a2a3a)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
            />
            <svg style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {eras.map(era => (
              <button key={era.value} onClick={() => { setEraFilter(era.value); setVisibleCount(60) }}
                style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: '1px solid', borderColor: eraFilter === era.value ? 'var(--accent)' : 'var(--border)', background: eraFilter === era.value ? 'rgba(232,0,45,0.15)' : 'transparent', color: eraFilter === era.value ? 'var(--accent)' : 'var(--muted)', borderRadius: '4px', cursor: 'pointer' }}>
                {era.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setChampOnly(c => !c); setVisibleCount(60) }}
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: '1px solid', borderColor: champOnly ? 'var(--gold, #f5c842)' : 'var(--border)', background: champOnly ? 'rgba(245,200,66,0.12)' : 'transparent', color: champOnly ? 'var(--gold, #f5c842)' : 'var(--muted)', borderRadius: '4px', cursor: 'pointer' }}>
            \\u{1F3C6} Champions
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: 0 }}>
            {filtered.length} driver{filtered.length !== 1 ? 's' : ''}{search && \` matching "\\u{0024}{search}"\`}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading drivers...
            <style>{\`@keyframes spin { to { transform: rotate(360deg) } }\`}</style>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '40px' }}>#</th>
                  {(['full_name', 'championships', 'career_wins', 'career_podiums', 'career_poles', 'career_points', 'career_starts'] as SortKey[]).map(key => (
                    <th key={key} onClick={() => toggleSort(key)}
                      style={{ padding: '0.75rem 0.75rem', textAlign: key === 'full_name' ? 'left' : 'right', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', color: sortKey === key ? 'var(--accent)' : 'var(--muted)', fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid var(--border)', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      {STAT_LABELS[key]}{sortKey === key && <span style={{ marginLeft: '0.3rem', fontSize: '0.6rem' }}>{sortDir === 'desc' ? '\\u25BC' : '\\u25B2'}</span>}
                    </th>
                  ))}
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Seasons</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--font-jetbrains, monospace)' }}>{i + 1}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <Link href={\`/drivers/\${d.slug}\`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}>
                        {d.full_name}
                      </Link>
                      {d.nationality && <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', marginTop: '1px' }}>{d.nationality}</span>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      {d.championships > 0 ? <span style={{ color: 'var(--gold, #f5c842)', fontWeight: 700, fontFamily: 'var(--font-barlow-condensed)' }}>{d.championships}\\u00D7\\u{1F3C6}</span> : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>\\u2014</span>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', fontWeight: d.career_wins > 0 ? 600 : 400, color: d.career_wins > 0 ? 'var(--text)' : 'var(--muted)' }}>{d.career_wins}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: d.career_podiums > 0 ? 'var(--text)' : 'var(--muted)' }}>{d.career_podiums}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: d.career_poles > 0 ? 'var(--text)' : 'var(--muted)' }}>{d.career_poles}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{Number(d.career_points).toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{d.career_starts}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {d.first_season && d.last_season ? \`\${d.first_season}\\u2013\${d.last_season}\` : d.first_season || '\\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {visibleCount < filtered.length && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <button onClick={() => setVisibleCount(c => c + 60)}
              style={{ padding: '0.7rem 2rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600 }}>
              Load More ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
`);

// ============================================================
// 3. src/app/drivers/[slug]/page.tsx
// ============================================================
writeFile('src/app/drivers/[slug]/page.tsx', `'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Driver {
  id: string; slug: string; full_name: string; first_name: string; last_name: string
  code: string | null; number: number | null; nationality: string | null
  date_of_birth: string | null; career_wins: number; career_podiums: number
  career_poles: number; career_points: number; career_starts: number
  career_dnfs: number; career_fastest_laps: number; championships: number
  is_active: boolean; first_season: number | null; last_season: number | null
  biography: string | null
}

interface SeasonStat {
  id: string; championship_position: number | null; points: number
  wins: number; podiums: number; poles: number; fastest_laps: number
  starts: number; dnfs: number; points_per_race: number | null
  season_year: number; team_name: string
}

function StatBox({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ background: 'var(--bg2, #111118)', border: '1px solid var(--border, #2a2a3a)', borderRadius: '8px', padding: '1.25rem 1rem', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: accent ? 'var(--gold, #f5c842)' : 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.65rem', color: 'var(--muted, #889)', marginTop: '0.4rem', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

export default function DriverProfilePage() {
  const params = useParams()
  const slug = params.slug as string
  const [driver, setDriver] = useState<Driver | null>(null)
  const [seasons, setSeasons] = useState<SeasonStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDriver() {
      const { data: driverData } = await supabase.from('drivers').select('*').eq('slug', slug).single()
      if (driverData) {
        setDriver(driverData)
        const { data: statsData } = await supabase
          .from('driver_season_stats')
          .select(\`id, championship_position, points, wins, podiums, poles, fastest_laps, starts, dnfs, points_per_race, seasons!inner(year), teams!inner(name)\`)
          .eq('driver_id', driverData.id)
          .order('seasons(year)', { ascending: false })
        if (statsData) {
          setSeasons(statsData.map((s: any) => ({ ...s, season_year: s.seasons.year, team_name: s.teams.name })))
        }
      }
      setLoading(false)
    }
    fetchDriver()
  }, [slug])

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--muted)' }}>Loading driver profile...</p>
        <style>{\`@keyframes spin { to { transform: rotate(360deg) } }\`}</style>
      </div>
    </main>
  )

  if (!driver) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '3rem', fontWeight: 800, textTransform: 'uppercase' }}>Driver Not Found</h1>
        <Link href="/drivers" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>\\u2190 Back to Drivers</Link>
      </div>
    </main>
  )

  const winRate = driver.career_starts > 0 ? ((driver.career_wins / driver.career_starts) * 100).toFixed(1) : '0'
  const podiumRate = driver.career_starts > 0 ? ((driver.career_podiums / driver.career_starts) * 100).toFixed(1) : '0'
  const uniqueTeams = [...new Set(seasons.map(s => s.team_name))]

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '3rem 1.5rem 2.5rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.08) 0%, transparent 100%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem', fontSize: '0.8rem' }}>
            <Link href="/drivers" style={{ color: 'var(--muted)', textDecoration: 'none' }}>\\u2190 All Drivers</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
            {driver.number && (
              <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'var(--bg2)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-barlow-condensed)', fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                #{driver.number}
              </div>
            )}
            <div style={{ flex: 1 }}>
              {driver.code && <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700 }}>{driver.code}</span>}
              <h1 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 800, textTransform: 'uppercase', margin: '0.2rem 0 0.5rem', lineHeight: 1.05 }}>
                {driver.first_name}{' '}<span style={{ color: 'var(--accent)' }}>{driver.last_name}</span>
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                {driver.nationality && <span>{driver.nationality}</span>}
                {driver.first_season && driver.last_season && <span>{driver.first_season}\\u2013{driver.last_season} ({driver.last_season - driver.first_season + 1} seasons)</span>}
                {uniqueTeams.length > 0 && <span>{uniqueTeams.length} team{uniqueTeams.length > 1 ? 's' : ''}</span>}
              </div>
              {driver.championships > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.25)', borderRadius: '6px', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold, #f5c842)' }}>
                  \\u{1F3C6} {driver.championships}\\u00D7 World Champion
                </div>
              )}
            </div>
            <Link href={\`/compare?d1=\${driver.slug}\`}
              style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', textDecoration: 'none', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Compare \\u2192
            </Link>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <StatBox label="Championships" value={driver.championships} accent={driver.championships > 0} />
          <StatBox label="Wins" value={driver.career_wins} />
          <StatBox label="Podiums" value={driver.career_podiums} />
          <StatBox label="Poles" value={driver.career_poles} />
          <StatBox label="Fastest Laps" value={driver.career_fastest_laps} />
          <StatBox label="Points" value={Number(driver.career_points).toLocaleString()} />
          <StatBox label="Starts" value={driver.career_starts} />
          <StatBox label="Win Rate" value={\`\${winRate}%\`} />
          <StatBox label="Podium Rate" value={\`\${podiumRate}%\`} />
          <StatBox label="DNFs" value={driver.career_dnfs} />
        </div>

        <h2 style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          Season by Season
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em' }}>{seasons.length} season{seasons.length !== 1 ? 's' : ''}</span>
        </h2>

        {seasons.length > 0 ? (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Year', 'Team', 'Pos', 'Pts', 'W', 'Pod', 'Pole', 'FL', 'Starts', 'DNF', 'Pts/Race'].map(h => (
                    <th key={h} style={{ padding: '0.7rem 0.6rem', textAlign: h === 'Team' ? 'left' : 'right', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seasons.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.9rem' }}>{s.season_year}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'left', color: 'var(--text)' }}>{s.team_name}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.championship_position === 1 ? 'var(--gold)' : 'var(--muted)' }}>{s.championship_position ? \`P\${s.championship_position}\` : '\\u2014'}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)' }}>{Number(s.points)}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', fontWeight: s.wins > 0 ? 700 : 400, color: s.wins > 0 ? 'var(--text)' : 'var(--muted)' }}>{s.wins}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.podiums > 0 ? 'var(--text)' : 'var(--muted)' }}>{s.podiums}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.poles > 0 ? 'var(--text)' : 'var(--muted)' }}>{s.poles}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.fastest_laps > 0 ? 'var(--text)' : 'var(--muted)' }}>{s.fastest_laps}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{s.starts}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.dnfs > 0 ? 'var(--accent)' : 'var(--muted)' }}>{s.dnfs}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)', fontSize: '0.78rem' }}>{s.points_per_race ? Number(s.points_per_race).toFixed(1) : '\\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No season-by-season data available.</p>}
      </section>
    </main>
  )
}
`);

// ============================================================
// 4. src/app/compare/page.tsx
// ============================================================
writeFile('src/app/compare/page.tsx', `'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface DriverBasic {
  id: string; slug: string; full_name: string; code: string | null
  championships: number; career_wins: number; career_podiums: number
  career_poles: number; career_points: number; career_starts: number
  career_dnfs: number; career_fastest_laps: number
  first_season: number | null; last_season: number | null; nationality: string | null
}

interface CompStat { key: keyof DriverBasic; label: string; format?: (v: number) => string }

const STATS: CompStat[] = [
  { key: 'championships', label: 'Championships' },
  { key: 'career_wins', label: 'Race Wins' },
  { key: 'career_podiums', label: 'Podiums' },
  { key: 'career_poles', label: 'Pole Positions' },
  { key: 'career_fastest_laps', label: 'Fastest Laps' },
  { key: 'career_points', label: 'Career Points', format: (v) => Number(v).toLocaleString() },
  { key: 'career_starts', label: 'Race Starts' },
  { key: 'career_dnfs', label: 'DNFs' },
]

function StatBar({ label, val1, val2, format }: { label: string; val1: number; val2: number; format?: (v: number) => string }) {
  const max = Math.max(val1, val2, 1)
  const pct1 = (val1 / max) * 100
  const pct2 = (val2 / max) * 100
  const winner = val1 > val2 ? 'left' : val2 > val1 ? 'right' : 'tie'
  const isDNF = label === 'DNFs'
  const displayVal = format || ((v: number) => String(v))
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '70px', textAlign: 'right', fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 800, color: winner === 'left' && !isDNF ? 'var(--accent)' : 'var(--text)' }}>{displayVal(val1)}</div>
        <div style={{ flex: 1, display: 'flex', gap: '3px', height: '28px' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: \`\${pct1}%\`, height: '100%', background: winner === 'left' && !isDNF ? 'var(--accent)' : 'rgba(232,0,45,0.25)', borderRadius: '4px 0 0 4px', transition: 'width 0.5s ease', minWidth: val1 > 0 ? '4px' : '0' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ width: \`\${pct2}%\`, height: '100%', background: winner === 'right' && !isDNF ? 'var(--blue, #3b82f6)' : 'rgba(59,130,246,0.25)', borderRadius: '0 4px 4px 0', transition: 'width 0.5s ease', minWidth: val2 > 0 ? '4px' : '0' }} />
          </div>
        </div>
        <div style={{ width: '70px', textAlign: 'left', fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 800, color: winner === 'right' && !isDNF ? 'var(--blue, #3b82f6)' : 'var(--text)' }}>{displayVal(val2)}</div>
      </div>
    </div>
  )
}

function DriverSelector({ drivers, value, onChange, color }: { drivers: DriverBasic[]; value: string; onChange: (slug: string) => void; color: string }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = search ? drivers.filter(d => d.full_name.toLowerCase().includes(search.toLowerCase())).slice(0, 15) : drivers.slice(0, 15)
  const selected = drivers.find(d => d.slug === value)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '0.8rem 1rem', background: 'var(--bg2)', border: \`2px solid \${value ? color : 'var(--border)'}\`, borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: selected ? 700 : 400, textTransform: 'uppercase', color: selected ? 'var(--text)' : 'var(--muted)' }}>{selected ? selected.full_name : 'Select a driver...'}</span>
        <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>\\u25BC</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 100, maxHeight: '300px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '0.5rem' }}>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} autoFocus
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg3, #1a1a24)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '0.85rem', outline: 'none' }} />
          </div>
          <div style={{ overflow: 'auto', maxHeight: '240px' }}>
            {filtered.map(d => (
              <div key={d.slug} onClick={() => { onChange(d.slug); setOpen(false); setSearch('') }}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: d.slug === value ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = d.slug === value ? 'rgba(255,255,255,0.05)' : 'transparent')}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.full_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-jetbrains, monospace)' }}>
                  {d.career_wins}W {d.championships > 0 ? \`\\u{1F3C6}\\u00D7\${d.championships}\` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CompareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [drivers, setDrivers] = useState<DriverBasic[]>([])
  const [d1Slug, setD1Slug] = useState(searchParams.get('d1') || '')
  const [d2Slug, setD2Slug] = useState(searchParams.get('d2') || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDrivers() {
      const { data } = await supabase.from('drivers')
        .select('id, slug, full_name, code, championships, career_wins, career_podiums, career_poles, career_points, career_starts, career_dnfs, career_fastest_laps, first_season, last_season, nationality')
        .order('career_wins', { ascending: false })
      if (data) setDrivers(data)
      setLoading(false)
    }
    fetchDrivers()
  }, [])

  const updateUrl = useCallback((slug1: string, slug2: string) => {
    const params = new URLSearchParams()
    if (slug1) params.set('d1', slug1)
    if (slug2) params.set('d2', slug2)
    router.replace(\`/compare\${params.toString() ? '?' + params.toString() : ''}\`, { scroll: false })
  }, [router])

  const handleD1 = (slug: string) => { setD1Slug(slug); updateUrl(slug, d2Slug) }
  const handleD2 = (slug: string) => { setD2Slug(slug); updateUrl(d1Slug, slug) }
  const d1 = drivers.find(d => d.slug === d1Slug)
  const d2 = drivers.find(d => d.slug === d2Slug)
  const bothSelected = d1 && d2

  let d1Score = 0, d2Score = 0
  if (bothSelected) {
    STATS.forEach(s => {
      if (s.key === 'career_dnfs') return
      const v1 = Number(d1[s.key]) || 0
      const v2 = Number(d2[s.key]) || 0
      if (v1 > v2) d1Score++
      else if (v2 > v1) d2Score++
    })
  }

  const POPULAR = [
    { d1: 'hamilton', d2: 'max_verstappen', label: 'Hamilton vs Verstappen' },
    { d1: 'hamilton', d2: 'michael_schumacher', label: 'Hamilton vs Schumacher' },
    { d1: 'senna', d2: 'prost', label: 'Senna vs Prost' },
    { d1: 'max_verstappen', d2: 'norris', label: 'Verstappen vs Norris' },
    { d1: 'vettel', d2: 'alonso', label: 'Vettel vs Alonso' },
    { d1: 'leclerc', d2: 'max_verstappen', label: 'Leclerc vs Verstappen' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>Head to Head</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
          Compare <span style={{ color: 'var(--accent)' }}>Drivers</span>
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: '450px', margin: '1rem auto 0', fontSize: '0.9rem' }}>Pick two drivers. See who comes out on top.</p>
      </section>

      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
          <DriverSelector drivers={drivers} value={d1Slug} onChange={handleD1} color="var(--accent, #e8002d)" />
          <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>vs</div>
          <DriverSelector drivers={drivers} value={d2Slug} onChange={handleD2} color="var(--blue, #3b82f6)" />
        </div>

        {!bothSelected && (
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.75rem', textAlign: 'center' }}>Popular Comparisons</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {POPULAR.map(p => (
                <button key={p.label} onClick={() => { setD1Slug(p.d1); setD2Slug(p.d2); updateUrl(p.d1, p.d2) }}
                  style={{ padding: '0.4rem 0.8rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {bothSelected && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.25rem', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.25rem' }}>{d1.code || d1.full_name.split(' ').pop()?.slice(0, 3).toUpperCase()}</div>
                  <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '2.5rem', fontWeight: 800, color: d1Score >= d2Score ? 'var(--accent)' : 'var(--text)' }}>{d1Score}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1rem', color: 'var(--muted)', fontWeight: 600 }}>\\u2013</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--blue)', fontWeight: 600, marginBottom: '0.25rem' }}>{d2.code || d2.full_name.split(' ').pop()?.slice(0, 3).toUpperCase()}</div>
                  <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '2.5rem', fontWeight: 800, color: d2Score >= d1Score ? 'var(--blue)' : 'var(--text)' }}>{d2Score}</div>
                </div>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0.5rem 0 0', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Categories Won (excl. DNFs)</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0 calc(70px + 0.75rem)' }}>
              <Link href={\`/drivers/\${d1.slug}\`} style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none', letterSpacing: '0.05em' }}>{d1.full_name}</Link>
              <Link href={\`/drivers/\${d2.slug}\`} style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.85rem', color: 'var(--blue)', textDecoration: 'none', letterSpacing: '0.05em' }}>{d2.full_name}</Link>
            </div>

            {STATS.map(stat => <StatBar key={stat.key} label={stat.label} val1={Number(d1[stat.key]) || 0} val2={Number(d2[stat.key]) || 0} format={stat.format} />)}
            <StatBar label="Win Rate %" val1={d1.career_starts > 0 ? parseFloat(((d1.career_wins / d1.career_starts) * 100).toFixed(1)) : 0} val2={d2.career_starts > 0 ? parseFloat(((d2.career_wins / d2.career_starts) * 100).toFixed(1)) : 0} format={v => \`\${v.toFixed(1)}%\`} />
            <StatBar label="Podium Rate %" val1={d1.career_starts > 0 ? parseFloat(((d1.career_podiums / d1.career_starts) * 100).toFixed(1)) : 0} val2={d2.career_starts > 0 ? parseFloat(((d2.career_podiums / d2.career_starts) * 100).toFixed(1)) : 0} format={v => \`\${v.toFixed(1)}%\`} />

            <div style={{ textAlign: 'center', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { navigator.clipboard.writeText(\`\${window.location.origin}/compare?d1=\${d1.slug}&d2=\${d2.slug}\`); alert('Link copied!') }}
                style={{ padding: '0.6rem 1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', fontWeight: 600 }}>
                Share This Comparison \\u2192
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--muted)' }}>Loading comparison...</p></main>}>
      <CompareContent />
    </Suspense>
  )
}
`);

// ============================================================
// Done!
// ============================================================
console.log('\n✅ All 4 files written successfully!');
console.log('\nNow install Supabase if needed:');
console.log('  npm install @supabase/supabase-js');
console.log('\nThen test:');
console.log('  http://localhost:3000/drivers');
console.log('  http://localhost:3000/drivers/hamilton');
console.log('  http://localhost:3000/compare?d1=hamilton&d2=max_verstappen');
console.log('');