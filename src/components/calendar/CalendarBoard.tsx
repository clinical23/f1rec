'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'

type RaceCard = {
  id: string
  slug: string
  round: number
  name: string
  raceDate: string | null
  dateLabel: string
  circuitName: string
  flagEmoji: string
  winnerName: string | null
  winnerSlug: string | null
}

type BroadcastRow = {
  id: string
  country: string | null
  country_code: string | null
  channel_name: string | null
  channel_type: string | null
  url: string | null
  notes: string | null
}

function channelTypeBadge(channelType: string | null): string {
  const key = (channelType ?? '').toLowerCase()
  if (key === 'free-to-air') return 'bg-green-500/20 text-green-300'
  if (key === 'pay-tv') return 'bg-blue-500/20 text-blue-300'
  if (key === 'streaming') return 'bg-purple-500/20 text-purple-300'
  if (key === 'highlights-only') return 'bg-[var(--bg3)] text-[var(--muted)]'
  return 'bg-[var(--bg3)] text-[var(--muted)]'
}

function daysUntil(dateIso: string): number {
  const now = new Date()
  const target = new Date(dateIso)
  const ms = target.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function CalendarBoard({
  races,
  broadcasts,
}: {
  races: RaceCard[]
  broadcasts: BroadcastRow[]
}) {
  const today = new Date()
  const [openCountries, setOpenCountries] = useState<Record<string, boolean>>({})
  const [preferredCountry, setPreferredCountry] = useState<string>('US')

  useEffect(() => {
    const locale = typeof navigator !== 'undefined' ? navigator.language : ''
    const maybe = locale.split('-')[1]?.toUpperCase()
    if (maybe) setPreferredCountry(maybe)
  }, [])

  const nextRaceId = useMemo(() => {
    const upcoming = races
      .filter((race) => race.raceDate && new Date(race.raceDate) >= today)
      .sort((a, b) => new Date(a.raceDate!).getTime() - new Date(b.raceDate!).getTime())
    return upcoming[0]?.id ?? null
  }, [races, today])

  const groupedBroadcasts = useMemo(() => {
    const map = new Map<string, BroadcastRow[]>()
    for (const row of broadcasts) {
      const country = (row.country ?? 'Other').trim()
      const arr = map.get(country) ?? []
      arr.push(row)
      map.set(country, arr)
    }
    const ordered = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    return ordered.sort((a, b) => {
      const aCode = a[1][0]?.country_code?.toUpperCase() ?? ''
      const bCode = b[1][0]?.country_code?.toUpperCase() ?? ''
      if (aCode === preferredCountry) return -1
      if (bCode === preferredCountry) return 1
      return 0
    })
  }, [broadcasts, preferredCountry])

  return (
    <>
      <section style={{ marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {races.map((race) => {
            const isPast = race.raceDate ? new Date(race.raceDate) < today : false
            const until = race.raceDate ? daysUntil(race.raceDate) : null
            const isNext = nextRaceId === race.id
            return (
              <article
                key={race.id}
                style={{
                  background: 'var(--bg2)',
                  border: isNext ? '1px solid var(--gold)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  opacity: isPast ? 1 : 0.92,
                  transition: 'border-color 150ms, transform 150ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ padding: '2px 10px', borderRadius: '999px', background: 'var(--accent)', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', fontWeight: 700 }}>R{race.round}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{race.dateLabel}</span>
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{race.flagEmoji}</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{race.name.split(' ').slice(-1)[0]}</span>
                  </div>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '8px 0 4px 0' }}>{race.name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>{race.circuitName}</p>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }} />
                  {isPast ? (
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Winner</div>
                      <div style={{ marginTop: '3px' }}>
                        {race.winnerSlug ? (
                          <Link href={`/drivers/${race.winnerSlug}`} style={{ textDecoration: 'none', color: '#fff', fontSize: '14px' }}>
                            {race.winnerName ?? 'Unknown'}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Pending</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', background: 'color-mix(in srgb, var(--green) 20%, transparent)', color: 'var(--green)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Upcoming</span>
                      <div style={{ marginTop: '6px', color: 'var(--muted)', fontSize: '13px' }}>{until != null && until >= 0 ? `in ${until} days` : 'TBC'}</div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-t border-[#2a2a3a] pt-12">
        <h2 className="mb-8 font-display text-xl font-extrabold tracking-wide text-[var(--text)]">
          Where to <span className="text-[var(--accent)]">Watch</span>
        </h2>
        <div className="space-y-6">
          {groupedBroadcasts.map(([country, rows]) => {
            const isOpen = openCountries[country] ?? false
            return (
              <div key={country} className="rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
                <button
                  type="button"
                  onClick={() => setOpenCountries((prev) => ({ ...prev, [country]: !isOpen }))}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text)]">
                    {country}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{isOpen ? 'Hide' : 'Show'}</span>
                </button>
                {isOpen ? (
                  <div className="space-y-4 border-t border-[var(--border)] px-4 py-4">
                    {rows.map((row) => (
                      <div key={row.id} className="rounded border border-[var(--border)] bg-[var(--bg3)] px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text)]">{row.channel_name ?? 'Unnamed channel'}</span>
                          <span className={`rounded px-2 py-1 font-display text-[0.6rem] font-bold uppercase tracking-wider ${channelTypeBadge(row.channel_type)}`}>
                            {row.channel_type ?? 'channel'}
                          </span>
                        </div>
                        {row.notes ? <p className="mt-1 text-xs text-[var(--muted)]">{row.notes}</p> : null}
                        {row.url ? (
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold uppercase tracking-wide text-[var(--accent)] no-underline hover:underline">
                            Open broadcaster →
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
