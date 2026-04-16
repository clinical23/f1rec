'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DriverBasic {
  id: string
  slug: string
  full_name: string
  code: string | null
  nationality: string | null
  championships: number
  career_wins: number
  career_podiums: number
  career_poles: number
  career_points: number
  career_starts: number
  first_season: number | null
  last_season: number | null
}

export default function CompareClient({
  drivers,
  initialD1,
  initialD2,
}: {
  drivers: DriverBasic[]
  initialD1: string
  initialD2: string
}) {
  const router = useRouter()
  const [d1Query, setD1Query] = useState('')
  const [d2Query, setD2Query] = useState('')
  const [d1Slug, setD1Slug] = useState('')
  const [d2Slug, setD2Slug] = useState('')
  const [toast, setToast] = useState('')
  const [openList, setOpenList] = useState<'d1' | 'd2' | null>(null)

  useEffect(() => {
    const isValid = (slug: string) => drivers.some((d) => d.slug === slug)
    if (initialD1 && isValid(initialD1)) setD1Slug(initialD1)
    if (initialD2 && isValid(initialD2)) setD2Slug(initialD2)
  }, [drivers, initialD1, initialD2])

  useEffect(() => {
    const params = new URLSearchParams()
    if (d1Slug) params.set('d1', d1Slug)
    if (d2Slug) params.set('d2', d2Slug)
    router.replace(`/compare${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }, [d1Slug, d2Slug, router])

  const d1 = useMemo(() => drivers.find((d) => d.slug === d1Slug), [drivers, d1Slug])
  const d2 = useMemo(() => drivers.find((d) => d.slug === d2Slug), [drivers, d2Slug])
  const d1Results = useMemo(() => {
    const q = d1Query.trim().toLowerCase()
    return q ? drivers.filter((d) => d.full_name.toLowerCase().includes(q) || (d.code ?? '').toLowerCase().includes(q)).slice(0, 8) : drivers.slice(0, 8)
  }, [d1Query, drivers])
  const d2Results = useMemo(() => {
    const q = d2Query.trim().toLowerCase()
    return q ? drivers.filter((d) => d.full_name.toLowerCase().includes(q) || (d.code ?? '').toLowerCase().includes(q)).slice(0, 8) : drivers.slice(0, 8)
  }, [d2Query, drivers])

  const metrics = d1 && d2
    ? [
        { label: 'Career wins', a: d1.career_wins, b: d2.career_wins, fmt: (v: number) => v.toLocaleString() },
        { label: 'Career podiums', a: d1.career_podiums, b: d2.career_podiums, fmt: (v: number) => v.toLocaleString() },
        { label: 'Career poles', a: d1.career_poles, b: d2.career_poles, fmt: (v: number) => v.toLocaleString() },
        { label: 'Career points', a: d1.career_points, b: d2.career_points, fmt: (v: number) => Number(v).toLocaleString() },
        { label: 'Championships', a: d1.championships, b: d2.championships, fmt: (v: number) => v.toLocaleString() },
        { label: 'Career starts', a: d1.career_starts, b: d2.career_starts, fmt: (v: number) => v.toLocaleString() },
        { label: 'Win rate %', a: d1.career_starts ? (d1.career_wins / d1.career_starts) * 100 : 0, b: d2.career_starts ? (d2.career_wins / d2.career_starts) * 100 : 0, fmt: (v: number) => `${v.toFixed(1)}%` },
        { label: 'Podium rate %', a: d1.career_starts ? (d1.career_podiums / d1.career_starts) * 100 : 0, b: d2.career_starts ? (d2.career_podiums / d2.career_starts) * 100 : 0, fmt: (v: number) => `${v.toFixed(1)}%` },
        { label: 'Seasons active', a: d1.first_season && d1.last_season ? d1.last_season - d1.first_season + 1 : 0, b: d2.first_season && d2.last_season ? d2.last_season - d2.first_season + 1 : 0, fmt: (v: number) => v.toLocaleString() },
      ]
    : []

  const selectDriver = (side: 'd1' | 'd2', slug: string, name: string) => {
    if (side === 'd1') {
      setD1Slug(slug)
      setD1Query(name)
    } else {
      setD2Slug(slug)
      setD2Query(name)
    }
    setOpenList(null)
  }

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setToast('Comparison URL copied')
    setTimeout(() => setToast(''), 1600)
  }

  const pickerCard = (title: string, side: 'd1' | 'd2', query: string, setQuery: (s: string) => void, results: DriverBasic[], selected?: DriverBasic) => (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>{title}</div>
      <div style={{ padding: '16px' }}>
        <input
          value={query}
          onFocus={() => setOpenList(side)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpenList(side)
          }}
          placeholder="Search drivers..."
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px 16px', color: 'var(--text)', fontFamily: 'Barlow, sans-serif', fontSize: '15px', width: '100%', outlineColor: 'var(--accent)' }}
        />
        {openList === side ? (
          <div style={{ marginTop: '8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg3)', maxHeight: '230px', overflowY: 'auto' }}>
            {results.map((driver) => (
              <button
                key={`${side}-${driver.id}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectDriver(side, driver.slug, driver.full_name)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
              >
                {driver.full_name}
              </button>
            ))}
          </div>
        ) : null}
        {selected ? (
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '999px', background: 'linear-gradient(135deg, var(--accent), #aa0020)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700 }}>{(selected.code ?? selected.full_name.slice(0, 3)).toUpperCase()}</div>
              <div>
                <Link href={`/drivers/${selected.slug}`} style={{ textDecoration: 'none', color: '#fff', fontWeight: 700 }}>{selected.full_name}</Link>
                <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{selected.nationality ?? 'Unknown'}</div>
              </div>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
              Wins {selected.career_wins} · Podiums {selected.career_podiums} · Titles {selected.championships}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '44px', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', margin: 0 }}>Compare Drivers</h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', marginTop: '6px' }}>Head-to-head career statistics for any two drivers across every era</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {pickerCard('Driver 1', 'd1', d1Query, setD1Query, d1Results, d1)}
          {pickerCard('Driver 2', 'd2', d2Query, setD2Query, d2Results, d2)}
        </div>

        {d1 && d2 ? (
          <>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Head-to-Head</div>
              <div style={{ padding: '8px 0' }}>
                {metrics.map((metric) => {
                  const aWin = metric.a > metric.b
                  const bWin = metric.b > metric.a
                  return (
                    <div key={metric.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: aWin ? 'var(--gold)' : 'var(--muted)' }}>{metric.fmt(metric.a)}</div>
                      <div style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{metric.label}</div>
                      <div style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', color: bWin ? 'var(--gold)' : 'var(--muted)' }}>{metric.fmt(metric.b)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <button type="button" onClick={share} style={{ border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Share this comparison
              </button>
              {toast ? <span style={{ marginLeft: '10px', color: 'var(--green)', fontSize: '13px' }}>{toast}</span> : null}
            </div>
          </>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '16px', color: 'var(--muted)' }}>Select two drivers above to compare their careers.</div>
            <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'Hamilton vs Verstappen', href: '/compare?d1=hamilton&d2=max_verstappen' },
                { label: 'Senna vs Prost', href: '/compare?d1=senna&d2=prost' },
                { label: 'Schumacher vs Hamilton', href: '/compare?d1=michael_schumacher&d2=hamilton' },
                { label: 'Hamilton vs Schumacher', href: '/compare?d1=hamilton&d2=michael_schumacher' },
              ].map((p) => (
                <Link key={p.label} href={p.href} style={{ textDecoration: 'none', border: '1px solid var(--border)', background: 'var(--bg3)', color: '#fff', padding: '8px 12px', borderRadius: '999px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
