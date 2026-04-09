'use client'

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
          .select(`id, championship_position, points, wins, podiums, poles, fastest_laps, starts, dnfs, points_per_race, seasons!inner(year), teams!inner(name)`)
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
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </main>
  )

  if (!driver) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '3rem', fontWeight: 800, textTransform: 'uppercase' }}>Driver Not Found</h1>
        <Link href="/drivers" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>← Back to Drivers</Link>
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
            <Link href="/drivers" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← All Drivers</Link>
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
                {driver.first_season && driver.last_season && <span>{driver.first_season}–{driver.last_season} ({driver.last_season - driver.first_season + 1} seasons)</span>}
                {uniqueTeams.length > 0 && <span>{uniqueTeams.length} team{uniqueTeams.length > 1 ? 's' : ''}</span>}
              </div>
              {driver.championships > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.25)', borderRadius: '6px', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold, #f5c842)' }}>
                  🏆 {driver.championships}× World Champion
                </div>
              )}
            </div>
            <Link href={`/compare?d1=${driver.slug}`}
              style={{ padding: '0.6rem 1.2rem', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', textDecoration: 'none', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Compare →
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
          <StatBox label="Win Rate" value={`${winRate}%`} />
          <StatBox label="Podium Rate" value={`${podiumRate}%`} />
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
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.championship_position === 1 ? 'var(--gold)' : 'var(--muted)' }}>{s.championship_position ? `P${s.championship_position}` : '—'}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)' }}>{Number(s.points)}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', fontWeight: s.wins > 0 ? 700 : 400, color: s.wins > 0 ? 'var(--text)' : 'var(--muted)' }}>{s.wins}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.podiums > 0 ? 'var(--text)' : 'var(--muted)' }}>{s.podiums}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.poles > 0 ? 'var(--text)' : 'var(--muted)' }}>{s.poles}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.fastest_laps > 0 ? 'var(--text)' : 'var(--muted)' }}>{s.fastest_laps}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{s.starts}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: s.dnfs > 0 ? 'var(--accent)' : 'var(--muted)' }}>{s.dnfs}</td>
                    <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)', fontSize: '0.78rem' }}>{s.points_per_race ? Number(s.points_per_race).toFixed(1) : '—'}</td>
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
