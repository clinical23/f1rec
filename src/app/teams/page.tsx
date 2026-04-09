'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Team {
  id: string
  slug: string
  name: string
  short_name: string | null
  full_name: string | null
  base: string | null
  team_principal: string | null
  founded_year: number | null
  championships: number
  primary_color: string | null
}

type SortKey = 'name' | 'championships' | 'founded_year' | 'base'
type SortDir = 'asc' | 'desc'

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  championships: 'Titles',
  founded_year: 'Founded',
  base: 'Base',
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [champOnly, setChampOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('championships')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visibleCount, setVisibleCount] = useState(60)

  useEffect(() => {
    document.title = 'All F1 Teams — Constructor Championships & History | F1Rec'
  }, [])

  useEffect(() => {
    async function fetchTeams() {
      const { data, error } = await supabase
        .from('teams')
        .select('id, slug, name, short_name, full_name, base, team_principal, founded_year, championships, primary_color')
        .order('championships', { ascending: false })
      if (!error && data) setTeams(data)
      setLoading(false)
    }
    fetchTeams()
  }, [])

  const filtered = useMemo(() => {
    let result = teams
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.full_name && t.full_name.toLowerCase().includes(q)) ||
        (t.base && t.base.toLowerCase().includes(q))
      )
    }
    if (champOnly) result = result.filter(t => t.championships > 0)
    result = [...result].sort((a, b) => {
      if (sortKey === 'name') {
        const aVal = a.name.toLowerCase()
        const bVal = b.name.toLowerCase()
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (sortKey === 'base') {
        const aVal = (a.base || '').toLowerCase()
        const bVal = (b.base || '').toLowerCase()
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const aVal = (a[sortKey] as number) ?? 0
      const bVal = (b[sortKey] as number) ?? 0
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return result
  }, [teams, search, champOnly, sortKey, sortDir])

  const visible = filtered.slice(0, visibleCount)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir(key === 'name' || key === 'base' ? 'asc' : 'desc') }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ padding: '4rem 1.5rem 2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(232,0,45,0.06) 0%, transparent 100%)' }}>
        <p style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', color: 'var(--accent, #e8002d)', marginBottom: '0.5rem' }}>F1 Database</p>
        <h1 style={{ fontFamily: 'var(--font-barlow-condensed, "Barlow Condensed", sans-serif)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>
          Every Team.<br /><span style={{ color: 'var(--accent, #e8002d)' }}>Every Era.</span>
        </h1>
        <p style={{ color: 'var(--muted, #889)', maxWidth: '500px', margin: '1rem auto 0', fontSize: '0.95rem' }}>
          {teams.length > 0 ? `${teams.length} constructors` : '...'} from 1950 to today. Search, filter, and explore every team.
        </p>
      </section>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '200px' }}>
            <input type="text" placeholder="Search teams..." value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(60) }}
              style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', background: 'var(--bg2, #111118)', border: '1px solid var(--border, #2a2a3a)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
            />
            <svg style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <button onClick={() => { setChampOnly(c => !c); setVisibleCount(60) }}
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, border: '1px solid', borderColor: champOnly ? 'var(--gold, #f5c842)' : 'var(--border)', background: champOnly ? 'rgba(245,200,66,0.12)' : 'transparent', color: champOnly ? 'var(--gold, #f5c842)' : 'var(--muted)', borderRadius: '4px', cursor: 'pointer' }}>
            🏆 Champions
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: 0 }}>
            {filtered.length} team{filtered.length !== 1 ? 's' : ''}{search && ` matching "${search}"`}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading teams...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '40px' }}>#</th>
                  {(['name', 'championships', 'founded_year', 'base'] as SortKey[]).map(key => (
                    <th key={key} onClick={() => toggleSort(key)}
                      style={{ padding: '0.75rem 0.75rem', textAlign: key === 'name' || key === 'base' ? 'left' : 'right', fontFamily: 'var(--font-barlow-condensed)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', color: sortKey === key ? 'var(--accent)' : 'var(--muted)', fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid var(--border)', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      {SORT_LABELS[key]}{sortKey === key && <span style={{ marginLeft: '0.3rem', fontSize: '0.6rem' }}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                    </th>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {t.primary_color && (
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: t.primary_color, flexShrink: 0 }} />
                        )}
                        <div>
                          <Link href={`/teams/${t.slug}`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}>
                            {t.name}
                          </Link>
                          {t.team_principal && <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', marginTop: '1px' }}>{t.team_principal}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      {t.championships > 0 ? <span style={{ color: 'var(--gold, #f5c842)', fontWeight: 700, fontFamily: 'var(--font-barlow-condensed)' }}>{t.championships}×🏆</span> : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-jetbrains, monospace)', color: 'var(--muted)' }}>{t.founded_year || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--muted)', fontSize: '0.82rem' }}>{t.base || '—'}</td>
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
