'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Setup {
  id: string; slug: string; game: string; car_name: string; track_name: string
  setup_data: Record<string, unknown>; description: string | null
  author: string | null; download_count: number
}

const GAMES = [
  { label: 'All', value: 'all' },
  { label: 'ACC', value: 'acc' },
  { label: 'iRacing', value: 'iracing' },
  { label: 'AC Evo', value: 'ace' },
]

const gameColors: Record<string, { bg: string; text: string }> = {
  acc: { bg: 'rgba(59,130,246,0.12)', text: 'var(--blue, #3b82f6)' },
  iracing: { bg: 'rgba(232,0,45,0.12)', text: 'var(--accent, #e8002d)' },
  ace: { bg: 'rgba(0,212,160,0.12)', text: 'var(--green, #00d4a0)' },
}

const gameLabels: Record<string, string> = {
  acc: 'ACC', iracing: 'iRacing', ace: 'AC Evo',
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, s => s.toUpperCase())
    .trim()
}

function formatValue(val: unknown, depth: number = 0): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') return val
  if (typeof val === 'object' && !Array.isArray(val)) {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${formatKey(k)}: ${formatValue(v, depth + 1)}`)
      .join(depth === 0 ? '\n' : ', ')
  }
  return String(val)
}

function SetupCard({ setup }: { setup: Setup }) {
  const [expanded, setExpanded] = useState(false)
  const gc = gameColors[setup.game] ?? { bg: 'var(--bg3)', text: 'var(--muted)' }

  const entries = Object.entries(setup.setup_data).map(([key, val]) => {
    const isNested = typeof val === 'object' && val !== null && !Array.isArray(val)
    return { key, val, isNested }
  })

  return (
    <div style={{ padding: '1.25rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', gap: '0.5rem' }}>
        <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', fontSize: '0.6rem', fontFamily: 'var(--font-barlow-condensed)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: gc.bg, color: gc.text, borderRadius: '3px' }}>
          {gameLabels[setup.game] || setup.game}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-jetbrains, monospace)' }}>
          {setup.download_count.toLocaleString()} downloads
        </span>
      </div>

      <h3 style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.15, marginBottom: '0.2rem' }}>{setup.car_name}</h3>
      <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>{setup.track_name}</div>

      {setup.description && (
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1rem' }}>{setup.description}</p>
      )}

      <button onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '0.55rem', background: expanded ? 'rgba(232,0,45,0.08)' : 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: expanded ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem', fontWeight: 600 }}>
        {expanded ? 'Hide Setup' : 'View Setup'}
      </button>

      {expanded && (
        <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
          {entries.map(({ key, val, isNested }) => (
            <div key={key} style={{ marginBottom: isNested ? '0.75rem' : '0' }}>
              {isNested ? (
                <>
                  <div style={{ fontFamily: 'var(--font-barlow-condensed)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: '0.35rem' }}>
                    {formatKey(key)}
                  </div>
                  {Object.entries(val as Record<string, unknown>).map(([sk, sv]) => (
                    <div key={sk} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--muted)' }}>{formatKey(sk)}</span>
                      <span style={{ fontFamily: 'var(--font-jetbrains, monospace)', fontWeight: 600, color: 'var(--text)' }}>{String(sv)}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--muted)' }}>{formatKey(key)}</span>
                  <span style={{ fontFamily: 'var(--font-jetbrains, monospace)', fontWeight: 600, color: 'var(--text)' }}>{String(val)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SetupsPage() {
  const [setups, setSetups] = useState<Setup[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    document.title = 'Sim Racing Car Setups — Free Community Downloads | F1Rec'
  }, [])

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await supabase
          .from('sim_setups')
          .select('*')
          .order('download_count', { ascending: false })

        if (error) {
          console.error('[sim-setups] failed to load setups', error)
        }

        if (data) setSetups(data)
      } catch (error) {
        console.error('[sim-setups] unexpected fetch error', error)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return setups
    return setups.filter(s => s.game === filter)
  }, [setups, filter])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>Sim Racing</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
          Car<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Setups</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          Free community-tested setups for ACC, iRacing, and Assetto Corsa Evo.
        </p>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {GAMES.map(g => (
            <button key={g.value} onClick={() => setFilter(g.value)}
              style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: '1px solid', borderColor: filter === g.value ? 'var(--accent)' : 'var(--border)', background: filter === g.value ? 'rgba(232,0,45,0.15)' : 'transparent', color: filter === g.value ? 'var(--accent)' : 'var(--muted)', borderRadius: '4px', cursor: 'pointer' }}>
              {g.label}
            </button>
          ))}
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {filtered.length} setup{filtered.length !== 1 ? 's' : ''} available
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading setups...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {filtered.map(s => <SetupCard key={s.id} setup={s} />)}
          </div>
        )}
      </section>
    </main>
  )
}
