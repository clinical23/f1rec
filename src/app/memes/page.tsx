'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type MemeRow = {
  id: string
  title?: string | null
  name?: string | null
  caption?: string | null
  description?: string | null
  content?: string | null
  format?: string | null
  image_url?: string | null
  url?: string | null
  source_url?: string | null
  category?: string | null
  tags?: string[] | null
  created_at?: string | null
  is_featured?: boolean | null
}

const FALLBACK_MEMES: MemeRow[] = [
  {
    id: 'fallback-1',
    title: 'F1 Starter Pack',
    content: 'Race Engineer Radio\nTyre Deg Thread\nLap 1 Overreaction\nMid-Race Strategy Panic\nStewarding Debate\nUndercut Calculator',
    format: 'starter-pack',
    category: 'starter-pack',
    is_featured: true,
  },
  {
    id: 'fallback-2',
    title: 'Sim Rig Tier List',
    content: 'S: Load Cell Brakes, Triple Monitors\nA: Direct Drive Wheel, Button Box\nB: Bass Shakers, Sim Gloves\nC: RGB Strip Lights\nD: Cable Management',
    format: 'tier-list',
    category: 'sim-racing',
  },
  {
    id: 'fallback-3',
    title: 'Race Weekend Mood',
    content: 'Surface: FP1 optimism\nShallow: Qualifying panic\nMid: Pit wall confusion\nDeep: Tyre offset cope\nAbyss: "Plan B?"',
    format: 'iceberg',
    category: 'f1-humour',
  },
  {
    id: 'fallback-4',
    title: 'F1 vs Sim Racing Arguments',
    content: 'F1 Pundits: "Track limits matter"\nSim Racers: "Netcode said no"\n---\nF1 Pundits: "Tyre saving wins races"\nSim Racers: "Cold tyres in T1"',
    format: 'comparison',
    category: 'comparison',
  },
  {
    id: 'fallback-5',
    title: 'F1 Fan Alignment Chart',
    content: 'Lawful Good: Data Nerd\nNeutral Good: Team Loyalist\nChaotic Good: Rain Fan\nLawful Neutral: Rulebook Reader\nTrue Neutral: Race Highlights Only\nChaotic Neutral: Radio Clips Collector\nLawful Evil: Spreadsheet Prophet\nNeutral Evil: Comment Section Warrior\nChaotic Evil: Safety Car Manifestor',
    format: 'alignment-chart',
    category: 'alignment-chart',
  },
]

function normalizeCategory(value: string | null | undefined) {
  if (!value) return 'general'
  return value.toLowerCase().replace(/_/g, '-')
}

function splitItems(text: string) {
  return text
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function parseTierMap(text: string) {
  const map: Record<'S' | 'A' | 'B' | 'C' | 'D', string[]> = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
  }
  for (const line of splitItems(text)) {
    const match = line.match(/^([SABCD])\s*:\s*(.+)$/i)
    if (match) {
      const tier = match[1].toUpperCase() as keyof typeof map
      map[tier] = match[2].split(',').map((v) => v.trim()).filter(Boolean)
    }
  }
  if (Object.values(map).every((arr) => arr.length === 0)) {
    const raw = splitItems(text)
    map.S = raw.slice(0, 2)
    map.A = raw.slice(2, 4)
    map.B = raw.slice(4, 6)
    map.C = raw.slice(6, 8)
    map.D = raw.slice(8, 10)
  }
  return map
}

function watermark() {
  return (
    <span style={{ position: 'absolute', right: '0.6rem', bottom: '0.45rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
      F1Rec
    </span>
  )
}

function MemeVisual({ meme }: { meme: MemeRow }) {
  const title = meme.title || meme.name || 'Untitled meme'
  const body = meme.content || meme.caption || meme.description || ''
  const format = (meme.format || 'text').toLowerCase()

  if (format === 'tier-list') {
    const tiers = parseTierMap(body)
    const rows: Array<{ tier: 'S' | 'A' | 'B' | 'C' | 'D'; bg: string }> = [
      { tier: 'S', bg: 'rgba(245,200,66,0.28)' },
      { tier: 'A', bg: 'rgba(232,0,45,0.22)' },
      { tier: 'B', bg: 'rgba(255,138,0,0.2)' },
      { tier: 'C', bg: 'rgba(255,218,87,0.16)' },
      { tier: 'D', bg: 'rgba(130,130,140,0.16)' },
    ]
    return (
      <div style={{ aspectRatio: '4 / 5', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', position: 'relative', padding: '0.7rem' }}>
        <div style={{ marginBottom: '0.45rem', fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.95rem', textTransform: 'uppercase', fontWeight: 800 }}>{title}</div>
        {rows.map((row) => (
          <div key={row.tier} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', alignItems: 'stretch', marginBottom: '0.25rem' }}>
            <div style={{ background: row.bg, border: '1px solid rgba(255,255,255,0.16)', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.tier}</div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: 'none', padding: '0.35rem 0.45rem', fontSize: '0.73rem', lineHeight: 1.35, color: 'var(--text)' }}>
              {tiers[row.tier].join(' | ') || '---'}
            </div>
          </div>
        ))}
        {watermark()}
      </div>
    )
  }

  if (format === 'iceberg') {
    const lines = splitItems(body)
    const shades = ['#86d5ff', '#4f8ec0', '#2d5a84', '#1f3550', '#132133', '#090f1b']
    return (
      <div style={{ aspectRatio: '4 / 5', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
        {shades.map((shade, idx) => (
          <div key={shade} style={{ height: `${100 / shades.length}%`, background: shade, borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0.35rem 0.6rem', fontSize: '0.72rem', color: idx <= 1 ? '#0b1520' : '#dbe7f3', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
            {lines[idx] || '...'}
          </div>
        ))}
        <div style={{ position: 'absolute', top: '0.5rem', left: '0.6rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.82rem', color: '#ffffff' }}>{title}</div>
        {watermark()}
      </div>
    )
  }

  if (format === 'starter-pack') {
    const items = splitItems(body).slice(0, 6)
    return (
      <div style={{ aspectRatio: '4 / 5', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem', position: 'relative' }}>
        <div style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.95rem', textTransform: 'uppercase', fontWeight: 800 }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem' }}>
          {Array.from({ length: Math.max(4, items.length) }).map((_, idx) => (
            <div key={idx} style={{ minHeight: '62px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.4rem', fontSize: '0.72rem', lineHeight: 1.35, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              {items[idx] || '...'}
            </div>
          ))}
        </div>
        {watermark()}
      </div>
    )
  }

  if (format === 'comparison') {
    const lines = splitItems(body)
    const labelled = lines
      .map((line) => {
        const parts = line.split(':')
        if (parts.length < 2) return null
        const header = parts[0].trim()
        const value = parts.slice(1).join(':').trim()
        if (!header || !value) return null
        return { header, value }
      })
      .filter((entry): entry is { header: string; value: string } => entry != null)

    const hasLabelledRows = labelled.length >= 2
    const fallbackMid = Math.ceil(lines.length / 2)
    const fallbackLeft = lines.slice(0, fallbackMid).filter((line) => line.trim().length > 0)
    const fallbackRight = lines.slice(fallbackMid).filter((line) => line.trim().length > 0)

    const leftHeader = hasLabelledRows ? labelled[0].header.toUpperCase() : 'SIDE A'
    const rightHeader = hasLabelledRows ? labelled[1].header.toUpperCase() : 'SIDE B'
    const left = hasLabelledRows
      ? labelled.slice(0, Math.ceil(labelled.length / 2)).map((entry) => entry.value)
      : fallbackLeft
    const right = hasLabelledRows ? labelled.slice(Math.ceil(labelled.length / 2)).map((entry) => entry.value) : fallbackRight

    return (
      <div style={{ aspectRatio: '4 / 5', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.5rem 0.7rem', borderBottom: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontSize: '0.9rem', lineHeight: 1.1, fontWeight: 800, textAlign: 'center' }}>
            {title}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, position: 'relative' }}>
          <div style={{ background: 'rgba(232,0,45,0.22)', padding: '0.55rem', borderRight: '1px solid rgba(255,255,255,0.14)' }}>
            <div style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontSize: '0.74rem', letterSpacing: '0.06em', marginBottom: '0.3rem', fontWeight: 800, textAlign: 'center' }}>
              {leftHeader}
            </div>
            <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.72rem', lineHeight: 1.35 }}>
              {left.map((l, idx) => (
                <li key={`left-${idx}-${l}`}>{l}</li>
              ))}
            </ul>
          </div>
          <div style={{ background: 'rgba(59,130,246,0.2)', padding: '0.55rem' }}>
            <div style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontSize: '0.74rem', letterSpacing: '0.06em', marginBottom: '0.3rem', fontWeight: 800, textAlign: 'center' }}>
              {rightHeader}
            </div>
            <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.72rem', lineHeight: 1.35 }}>
              {right.map((l, idx) => (
                <li key={`right-${idx}-${l}`}>{l}</li>
              ))}
            </ul>
          </div>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '34px', height: '34px', borderRadius: '999px', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 900, fontSize: '0.72rem', border: '2px solid rgba(255,255,255,0.3)' }}>
            VS
          </div>
        </div>
        {watermark()}
      </div>
    )
  }

  if (format === 'alignment-chart') {
    const items = splitItems(body)
    const colors = [
      '#1f4f3a', '#23556f', '#4f3d1f',
      '#244b5a', '#383547', '#5a2432',
      '#2e2e34', '#3d2b4f', '#4f2323',
    ]
    return (
      <div style={{ aspectRatio: '4 / 5', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem', position: 'relative' }}>
        <div style={{ marginBottom: '0.45rem', fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.95rem', textTransform: 'uppercase', fontWeight: 800 }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.28rem' }}>
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} style={{ minHeight: '62px', background: colors[idx], borderRadius: '4px', padding: '0.35rem', fontSize: '0.65rem', lineHeight: 1.25, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {items[idx] || '...'}
            </div>
          ))}
        </div>
        {watermark()}
      </div>
    )
  }

  if (format === 'bingo') {
    const items = splitItems(body)
    const cols = 4
    const rows = 4
    const total = cols * rows
    const center = Math.floor(total / 2)
    return (
      <div style={{ aspectRatio: '4 / 5', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem', position: 'relative' }}>
        <div style={{ marginBottom: '0.45rem', fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.95rem', textTransform: 'uppercase', fontWeight: 800 }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.25rem' }}>
          {Array.from({ length: total }).map((_, idx) => (
            <div key={idx} style={{ minHeight: '58px', borderRadius: '4px', padding: '0.28rem', fontSize: '0.62rem', lineHeight: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: idx % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', color: idx === center ? 'var(--accent)' : 'var(--text)', fontWeight: idx === center ? 800 : 600 }}>
              {idx === center ? 'FREE SPACE' : (items[idx] || '...')}
            </div>
          ))}
        </div>
        {watermark()}
      </div>
    )
  }

  return (
    <div style={{ aspectRatio: '4 / 5', background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: '4px solid var(--accent)', borderRadius: '8px', padding: '0.85rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.4rem' }}>{title}</div>
      <p style={{ margin: 0, color: 'var(--text)', fontSize: '1rem', lineHeight: 1.35, fontWeight: 600, flex: 1 }}>{body || 'No content yet.'}</p>
      <div style={{ color: 'var(--muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-barlow-condensed)' }}>F1Rec Meme Studio</div>
      {watermark()}
    </div>
  )
}

export default function MemesPage() {
  const [memes, setMemes] = useState<MemeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    document.title = 'F1 Memes, Tier Lists & Sim Racing Humour | F1Rec'

    async function fetchMemes() {
      try {
        const { data, error } = await supabase
          .from('memes')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          setMemes(data as MemeRow[])
        } else {
          if (error) {
            console.error('[memes] failed to load memes', error)
          }
          setMemes(FALLBACK_MEMES)
        }
      } catch (error) {
        console.error('[memes] unexpected fetch error', error)
        setMemes(FALLBACK_MEMES)
      } finally {
        setLoading(false)
      }
    }

    fetchMemes()
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const meme of memes) set.add(normalizeCategory(meme.category))
    return ['all', ...Array.from(set).filter(Boolean)]
  }, [memes])

  const visible = useMemo(() => {
    if (filter === 'all') return memes
    return memes.filter((m) => normalizeCategory(m.category) === filter)
  }, [memes, filter])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.08) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>
          F1Rec Culture
        </p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
          Memes &<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Humour</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '620px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          Curated F1 and sim racing memes, tier lists, starter packs, and relatable content for race-weekend chaos.
        </p>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.6rem 1.5rem 2.8rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '0.45rem 0.8rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-barlow-condensed)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
                border: '1px solid',
                borderColor: filter === cat ? 'var(--accent)' : 'var(--border)',
                background: filter === cat ? 'rgba(232,0,45,0.15)' : 'transparent',
                color: filter === cat ? 'var(--accent)' : 'var(--muted)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading memes...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
            {visible.map((meme) => {
              const title = meme.title || meme.name || 'Untitled meme'
              const category = normalizeCategory(meme.category)
              const href = meme.url || meme.source_url || null
              return (
                <article key={meme.id} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
                  <MemeVisual meme={meme} />
                  <div style={{ padding: '0.65rem 0.25rem 0.2rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.62rem', background: 'rgba(232,0,45,0.12)', color: 'var(--accent)', padding: '0.18rem 0.45rem', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                        {category}
                      </span>
                      {meme.is_featured ? <span style={{ fontSize: '0.62rem', background: 'rgba(245,200,66,0.12)', color: 'var(--gold)', padding: '0.18rem 0.45rem', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Featured</span> : null}
                    </div>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.1 }}>{title}</h2>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--accent)', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: '0.74rem' }}>
                        Open / Share →
                      </a>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
