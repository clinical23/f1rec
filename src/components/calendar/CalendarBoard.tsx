import Link from 'next/link'

type RaceCard = {
  id: string
  slug: string
  round: number
  raceTime?: string | null
  name: string
  raceDate: string | null
  dateLabel: string
  circuitName: string
  flagEmoji: string
  winnerName: string | null
  winnerSlug: string | null
  winnerTeam?: string | null
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

const TYPE_LABEL: Record<string, string> = {
  'free-to-air': 'Free to air',
  'pay-tv': 'Pay TV',
  streaming: 'Streaming',
  'highlights-only': 'Highlights only',
}

function ukStart(date: string | null, time?: string | null) {
  if (!date || !time) return null
  const d = new Date(`${date}T${time.endsWith('Z') ? time : `${time}Z`}`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
}

export default function CalendarBoard({ races, broadcasts, nextId }: { races: RaceCard[]; broadcasts: BroadcastRow[]; nextId: string | null }) {
  const byCountry = new Map<string, BroadcastRow[]>()
  for (const b of broadcasts) {
    const c = (b.country ?? 'Other').trim()
    byCountry.set(c, [...(byCountry.get(c) ?? []), b])
  }
  // Most readers are in the UK, so it comes first and starts open.
  const countries = [...byCountry.entries()].sort((a, b) => {
    const uk = (r: BroadcastRow[]) => (['GB', 'UK'].includes((r[0]?.country_code ?? '').toUpperCase()) ? 0 : 1)
    return uk(a[1]) - uk(b[1]) || a[0].localeCompare(b[0])
  })

  return (
    <>
      <div className="pg-scroll">
        <table className="pg-table">
          <thead>
            <tr>
              <th className="n">Round</th>
              <th>Race</th>
              <th className="hide-sm">Circuit</th>
              <th>Date</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            {races.map((r, i) => {
              const isNext = r.id === nextId
              const start = ukStart(r.raceDate, r.raceTime)
              return (
                <tr key={r.id} className={isNext ? 'p1' : undefined}>
                  <td className="pos n">{i + 1}</td>
                  <td>
                    <span aria-hidden="true" style={{ marginRight: 8 }}>{r.flagEmoji}</span>
                    <Link href={`/races/${r.slug}`}>{r.name}</Link>
                    {isNext && <span className="sub" style={{ color: 'var(--accent)', fontWeight: 700 }}>Next race</span>}
                  </td>
                  <td className="hide-sm muted">{r.circuitName}</td>
                  <td>
                    {r.dateLabel.replace(/ \d{4}$/, '')}
                    {!r.winnerName && start && <span className="sub">{start} UK</span>}
                  </td>
                  <td>
                    {r.winnerName ? (
                      <>
                        {r.winnerSlug ? <Link href={`/drivers/${r.winnerSlug}`}>{r.winnerName}</Link> : r.winnerName}
                        {r.winnerTeam && <span className="sub">{r.winnerTeam}</span>}
                      </>
                    ) : (
                      <span className="muted">{isNext ? 'This weekend' : 'Not raced yet'}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {countries.length > 0 && (
        <section className="pg-sec" aria-labelledby="watch-h">
          <div className="pb-ph"><h2 className="pg-h2" id="watch-h">Where to watch</h2></div>
          {countries.map(([country, rows], i) => (
            <details key={country} className="pg-fold" open={i === 0}>
              <summary><b style={{ fontSize: 24 }}>{country}</b><span>{rows.length} {rows.length === 1 ? 'channel' : 'channels'}</span></summary>
              <div className="pg-list" style={{ padding: '0 16px 8px' }}>
                {rows.map((row) => (
                  <div key={row.id}>
                    <div>
                      {row.url ? <a href={row.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', fontWeight: 700 }}>{row.channel_name ?? 'Channel'}</a> : <b>{row.channel_name ?? 'Channel'}</b>}
                      {row.notes && <span style={{ display: 'block', textAlign: 'left' }}>{row.notes}</span>}
                    </div>
                    <span>{TYPE_LABEL[(row.channel_type ?? '').toLowerCase()] ?? row.channel_type ?? ''}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
          <p className="pg-note">Broadcasters change between seasons. Check the channel&apos;s own listings before the race.</p>
        </section>
      )}
    </>
  )
}
