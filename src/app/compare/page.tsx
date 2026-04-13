'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useSound } from '@/components/SoundProvider'
import JsonLd from '@/components/JsonLd'

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
            <div style={{ width: `${pct1}%`, height: '100%', background: winner === 'left' && !isDNF ? 'var(--accent)' : 'rgba(232,0,45,0.25)', borderRadius: '4px 0 0 4px', transition: 'width 0.5s ease', minWidth: val1 > 0 ? '4px' : '0' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ width: `${pct2}%`, height: '100%', background: winner === 'right' && !isDNF ? 'var(--blue, #3b82f6)' : 'rgba(59,130,246,0.25)', borderRadius: '0 4px 4px 0', transition: 'width 0.5s ease', minWidth: val2 > 0 ? '4px' : '0' }} />
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
      <div onClick={() => setOpen(!open)} style={{ padding: '0.8rem 1rem', background: 'var(--bg2)', border: `2px solid ${value ? color : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: selected ? 700 : 400, textTransform: 'uppercase', color: selected ? 'var(--text)' : 'var(--muted)' }}>{selected ? selected.full_name : 'Select a driver...'}</span>
        <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>▼</span>
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
                  {d.career_wins}W {d.championships > 0 ? `🏆×${d.championships}` : ''}
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
  const { playSound } = useSound()

  useEffect(() => {
    document.title = 'Compare F1 Drivers Head-to-Head | F1Rec'
  }, [])

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
    router.replace(`/compare${params.toString() ? '?' + params.toString() : ''}`, { scroll: false })
  }, [router])

  const handleD1 = (slug: string) => { setD1Slug(slug); updateUrl(slug, d2Slug) }
  const handleD2 = (slug: string) => { setD2Slug(slug); updateUrl(d1Slug, slug) }
  const d1 = drivers.find(d => d.slug === d1Slug)
  const d2 = drivers.find(d => d.slug === d2Slug)
  const bothSelected = d1 && d2
  const driver1Name = d1?.full_name || ''
  const driver2Name = d2?.full_name || ''

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
      {bothSelected ? (
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${driver1Name} vs ${driver2Name} — F1 Head-to-Head Comparison`,
          description: `Compare ${driver1Name} and ${driver2Name} Formula 1 career statistics head-to-head on F1Rec.`,
          url: `https://f1rec.com/compare?d1=${d1Slug}&d2=${d2Slug}`,
        }} />
      ) : null}
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>Head to Head</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
          Compare <span style={{ color: 'var(--accent)' }}>Drivers</span>
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: '450px', margin: '1rem auto 0', fontSize: '0.9rem' }}>Pick two drivers. See who comes out on top.</p>
        <button
          type="button"
          onClick={() => {
            playSound('compare')
            const section = document.getElementById('compare-selectors')
            section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          style={{ marginTop: '1rem', padding: '0.55rem 1.1rem', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.09em', fontSize: '0.72rem', fontWeight: 700 }}
        >
          Compare Now
        </button>
      </section>

      <section id="compare-selectors" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
                <button key={p.label} onClick={() => { playSound('compare'); setD1Slug(p.d1); setD2Slug(p.d2); updateUrl(p.d1, p.d2) }}
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
                <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1rem', color: 'var(--muted)', fontWeight: 600 }}>–</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--blue)', fontWeight: 600, marginBottom: '0.25rem' }}>{d2.code || d2.full_name.split(' ').pop()?.slice(0, 3).toUpperCase()}</div>
                  <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '2.5rem', fontWeight: 800, color: d2Score >= d1Score ? 'var(--blue)' : 'var(--text)' }}>{d2Score}</div>
                </div>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0.5rem 0 0', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Categories Won (excl. DNFs)</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0 calc(70px + 0.75rem)' }}>
              <Link href={`/drivers/${d1.slug}`} style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none', letterSpacing: '0.05em' }}>{d1.full_name}</Link>
              <Link href={`/drivers/${d2.slug}`} style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.85rem', color: 'var(--blue)', textDecoration: 'none', letterSpacing: '0.05em' }}>{d2.full_name}</Link>
            </div>

            {STATS.map(stat => <StatBar key={stat.key} label={stat.label} val1={Number(d1[stat.key]) || 0} val2={Number(d2[stat.key]) || 0} format={stat.format} />)}
            <StatBar label="Win Rate %" val1={d1.career_starts > 0 ? parseFloat(((d1.career_wins / d1.career_starts) * 100).toFixed(1)) : 0} val2={d2.career_starts > 0 ? parseFloat(((d2.career_wins / d2.career_starts) * 100).toFixed(1)) : 0} format={v => `${v.toFixed(1)}%`} />
            <StatBar label="Podium Rate %" val1={d1.career_starts > 0 ? parseFloat(((d1.career_podiums / d1.career_starts) * 100).toFixed(1)) : 0} val2={d2.career_starts > 0 ? parseFloat(((d2.career_podiums / d2.career_starts) * 100).toFixed(1)) : 0} format={v => `${v.toFixed(1)}%`} />

            <div style={{ textAlign: 'center', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/compare?d1=${d1.slug}&d2=${d2.slug}`); alert('Link copied!') }}
                onMouseDown={() => playSound('click')}
                style={{ padding: '0.6rem 1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', fontWeight: 600 }}>
                Share This Comparison →
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
