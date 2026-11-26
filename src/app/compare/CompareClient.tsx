'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import PageHead from '@/components/page/PageHead'

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

const MATCHUPS = [
  { a: 'max_verstappen', b: 'hamilton' },
  { a: 'senna', b: 'prost' },
  { a: 'michael_schumacher', b: 'hamilton' },
  { a: 'antonelli', b: 'russell' },
  { a: 'leclerc', b: 'norris' },
  { a: 'clark', b: 'fangio' },
]

const pct = (n: number, d: number) => (d ? (n / d) * 100 : 0)

export default function CompareClient({ drivers, initialD1, initialD2 }: { drivers: DriverBasic[]; initialD1: string; initialD2: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const bySlug = useMemo(() => new Map(drivers.map((d) => [d.slug, d])), [drivers])
  const byName = useMemo(() => new Map(drivers.map((d) => [d.full_name.toLowerCase(), d])), [drivers])
  const [aSlug, setA] = useState(bySlug.has(initialD1) ? initialD1 : '')
  const [bSlug, setB] = useState(bySlug.has(initialD2) ? initialD2 : '')
  const [aText, setAText] = useState(bySlug.get(initialD1)?.full_name ?? '')
  const [bText, setBText] = useState(bySlug.get(initialD2)?.full_name ?? '')
  const [copied, setCopied] = useState(false)

  const a = bySlug.get(aSlug)
  const b = bySlug.get(bSlug)

  const update = (na: string, nb: string) => {
    const p = new URLSearchParams()
    if (na) p.set('d1', na)
    if (nb) p.set('d2', nb)
    router.replace(`${pathname}${p.size ? `?${p}` : ''}`, { scroll: false })
  }
  const pick = (side: 'a' | 'b', text: string) => {
    const hit = byName.get(text.trim().toLowerCase())
    if (side === 'a') { setAText(text); if (hit) { setA(hit.slug); update(hit.slug, bSlug) } }
    else { setBText(text); if (hit) { setB(hit.slug); update(aSlug, hit.slug) } }
  }
  const choose = (x: string, y: string) => {
    setA(x); setB(y)
    setAText(bySlug.get(x)?.full_name ?? ''); setBText(bySlug.get(y)?.full_name ?? '')
    update(x, y)
  }

  const rows = a && b ? [
    { label: 'World titles', a: a.championships, b: b.championships },
    { label: 'Race wins', a: a.career_wins, b: b.career_wins },
    { label: 'Podiums', a: a.career_podiums, b: b.career_podiums },
    { label: 'Pole positions', a: a.career_poles, b: b.career_poles },
    { label: 'Race starts', a: a.career_starts, b: b.career_starts },
    { label: 'Points', a: Math.round(a.career_points), b: Math.round(b.career_points), note: 'Points systems changed over the years' },
    { label: 'Win rate', a: pct(a.career_wins, a.career_starts), b: pct(b.career_wins, b.career_starts), pct: true },
    { label: 'Podium rate', a: pct(a.career_podiums, a.career_starts), b: pct(b.career_podiums, b.career_starts), pct: true },
    { label: 'Pole rate', a: pct(a.career_poles, a.career_starts), b: pct(b.career_poles, b.career_starts), pct: true },
  ] : []
  const fmt = (v: number, isPct?: boolean) => (isPct ? `${v.toFixed(1)}%` : v.toLocaleString('en-GB'))
  const span = (d: DriverBasic) => (d.first_season ? `${d.first_season}–${d.last_season && d.last_season >= new Date().getFullYear() ? 'now' : d.last_season ?? ''}` : '')

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ }
  }

  return (
    <main className="pg">
      <PageHead
        crumbs={[{ label: 'Sunday Grid', href: '/' }, { label: 'Compare' }]}
        title="Compare"
        lede="Put any two drivers from 1950 to now side by side: titles, wins, poles and how often they won when they started."
      />
      <div className="pg-body">
        <datalist id="drivers-list">
          {drivers.map((d) => <option key={d.id} value={d.full_name} />)}
        </datalist>
        <div className="pg-tools">
          <input className="pg-input" list="drivers-list" aria-label="First driver" placeholder="First driver" value={aText} onChange={(e) => pick('a', e.target.value)} />
          <span className="pb-h2h" style={{ margin: 0, display: 'block' }}><span className="vs">vs</span></span>
          <input className="pg-input" list="drivers-list" aria-label="Second driver" placeholder="Second driver" value={bText} onChange={(e) => pick('b', e.target.value)} />
        </div>

        {a && b ? (
          <div className="pg-panel">
            <div className="pb-h2h" style={{ marginTop: 0 }}>
              <Link href={`/drivers/${a.slug}`} className="dp" style={{ textDecoration: 'none' }}><b>{a.full_name.split(' ').at(-1)}</b><small>{[a.nationality, span(a)].filter(Boolean).join(' · ')}</small></Link>
              <div className="vs">vs</div>
              <Link href={`/drivers/${b.slug}`} className="dp r" style={{ textDecoration: 'none' }}><b>{b.full_name.split(' ').at(-1)}</b><small>{[b.nationality, span(b)].filter(Boolean).join(' · ')}</small></Link>
            </div>
            <table className="pb-cmp">
              <caption className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{a.full_name} compared with {b.full_name}</caption>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td className={r.a > r.b ? 'lead' : undefined}>{fmt(r.a, r.pct)}</td>
                    <td className="m">{r.label}</td>
                    <td className={r.b > r.a ? 'lead' : undefined}>{fmt(r.b, r.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="pg-note">Rates are per race started. Points systems have changed many times since 1950, so older totals look smaller.</p>
            <p style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn-plate" onClick={share}>Copy link to this comparison</button>
              <button type="button" className="btn-ghost" onClick={() => choose(bSlug, aSlug)}>Swap sides</button>
              <span role="status" style={{ color: 'var(--muted)', fontSize: 14 }}>{copied ? 'Link copied' : ''}</span>
            </p>
          </div>
        ) : (
          <section className="pg-panel" aria-labelledby="pick-h">
            <h2 className="pg-h2" id="pick-h" style={{ fontSize: 28, marginBottom: 12 }}>Start with a classic</h2>
            <div className="pg-chips">
              {MATCHUPS.filter((m) => bySlug.has(m.a) && bySlug.has(m.b)).map((m) => (
                <button key={`${m.a}-${m.b}`} type="button" className="pg-chip" onClick={() => choose(m.a, m.b)}>
                  {bySlug.get(m.a)!.full_name.split(' ').at(-1)} vs {bySlug.get(m.b)!.full_name.split(' ').at(-1)}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
